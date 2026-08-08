"""Data loading, leakage controls, duplicate handling, and grouped splitting."""

from __future__ import annotations

import hashlib
import json
import re
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

from concrete_strength.schema import FEATURE_COLUMNS, INGREDIENT_COLUMNS, TARGET_COLUMN

UCI_ARCHIVE_SHA256 = "dad85d14de8aee4e07479daa774e6b569a313715b71a3b92c95a07cf91c2c9a7"
UCI_URL = "https://archive.ics.uci.edu/static/public/165/concrete+compressive+strength.zip"


@dataclass(frozen=True)
class PreparedData:
    frame: pd.DataFrame
    audit: dict[str, int | float]


@dataclass(frozen=True)
class DataSplit:
    train: pd.DataFrame
    calibration: pd.DataFrame
    test: pd.DataFrame


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_frame_sha256(frame: pd.DataFrame) -> str:
    """Hash canonical numeric contents independently of Excel/CSV container details."""

    columns = [*FEATURE_COLUMNS, TARGET_COLUMN]
    missing = [column for column in columns if column not in frame]
    if missing:
        raise ValueError(f"Cannot fingerprint data missing: {', '.join(missing)}")
    payload = frame.loc[:, columns].to_csv(
        index=False, float_format="%.12g", lineterminator="\n"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def fetch_uci_data(destination: Path) -> Path:
    """Download and verify the DOI-pinned UCI workbook."""

    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "concrete-compressive-strength.zip"
    urllib.request.urlretrieve(UCI_URL, archive)  # noqa: S310 - fixed HTTPS URL and checksum
    actual = sha256_file(archive)
    if actual != UCI_ARCHIVE_SHA256:
        archive.unlink(missing_ok=True)
        raise ValueError(
            f"UCI archive checksum mismatch: expected {UCI_ARCHIVE_SHA256}, got {actual}"
        )
    with zipfile.ZipFile(archive) as bundle:
        member = next(name for name in bundle.namelist() if name.lower().endswith(".xls"))
        bundle.extract(member, destination)
    return destination / member


def _normalise_header(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).strip().lower()).strip()


def _infer_columns(columns: list[object]) -> dict[object, str]:
    inferred: dict[str, object] = {}
    for original in columns:
        normalised = _normalise_header(original)
        canonical: str | None = None
        if normalised in FEATURE_COLUMNS or normalised == TARGET_COLUMN:
            canonical = normalised
        elif "compressive strength" in normalised and "ksi" not in normalised:
            canonical = TARGET_COLUMN
        elif normalised.startswith("cement"):
            canonical = "cement"
        elif "blast furnace slag" in normalised or normalised.startswith("ggbfs"):
            canonical = "blast_furnace_slag"
        elif "fly ash" in normalised or normalised.startswith("fa kg"):
            canonical = "fly_ash"
        elif normalised.startswith("water"):
            canonical = "water"
        elif normalised.startswith("superplasticizer") or normalised.startswith("sp kg"):
            canonical = "superplasticizer"
        elif normalised.startswith("coarse aggregate"):
            canonical = "coarse_aggregate"
        elif normalised.startswith("fine aggregate"):
            canonical = "fine_aggregate"
        elif normalised.startswith("age") or normalised == "time":
            canonical = "age"

        if canonical is not None and canonical not in inferred:
            inferred[canonical] = original

    missing = [column for column in [*FEATURE_COLUMNS, TARGET_COLUMN] if column not in inferred]
    if missing:
        raise ValueError(f"Could not identify required concrete columns: {', '.join(missing)}")
    return {original: canonical for canonical, original in inferred.items()}


def load_concrete_data(path: str | Path) -> pd.DataFrame:
    """Load only the eight UCI predictors and MPa target from CSV/XLS/XLSX.

    Target-derived columns such as the legacy workbook's strength-in-ksi formula are never selected.
    """

    source = Path(path)
    if source.suffix.lower() == ".csv":
        raw = pd.read_csv(source)
    elif source.suffix.lower() in {".xls", ".xlsx"}:
        raw = pd.read_excel(source, sheet_name=0)
    else:
        raise ValueError(f"Unsupported concrete data format: {source.suffix}")

    rename = _infer_columns(list(raw.columns))
    selected = raw.loc[:, list(rename)].rename(columns=rename)
    selected = selected.loc[:, [*FEATURE_COLUMNS, TARGET_COLUMN]].apply(
        pd.to_numeric, errors="coerce"
    )
    if selected.isna().any().any():
        counts = selected.isna().sum()
        bad = {column: int(count) for column, count in counts.items() if count}
        raise ValueError(f"Missing or non-numeric values in required columns: {bad}")
    if not np.isfinite(selected.to_numpy(dtype=float)).all():
        raise ValueError("Concrete data contains non-finite values.")
    return selected


def recipe_ids(frame: pd.DataFrame) -> pd.Series:
    """Build stable recipe hashes from ingredients while intentionally excluding age."""

    def digest(row: pd.Series) -> str:
        payload = "|".join(f"{float(value):.6f}" for value in row)
        return hashlib.sha1(payload.encode("ascii"), usedforsecurity=False).hexdigest()[:16]

    return frame.loc[:, INGREDIENT_COLUMNS].apply(digest, axis=1).rename("recipe_id")


def prepare_data(raw: pd.DataFrame) -> PreparedData:
    """Validate, de-duplicate, and average repeated measurements at identical inputs."""

    required = [*FEATURE_COLUMNS, TARGET_COLUMN]
    missing = [column for column in required if column not in raw]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")
    frame = raw.loc[:, required].copy()
    if (frame[FEATURE_COLUMNS] < 0).any().any():
        raise ValueError("Feature quantities must be non-negative.")
    if (frame["age"] <= 0).any() or (frame[TARGET_COLUMN] <= 0).any():
        raise ValueError("Age and compressive strength must be positive.")

    exact_duplicates = int(frame.duplicated(subset=required).sum())
    unique_records = frame.drop_duplicates(subset=required)
    grouped = unique_records.groupby(FEATURE_COLUMNS, sort=False, as_index=False, dropna=False)
    target_summary = grouped[TARGET_COLUMN].agg(["mean", "count", "std"]).reset_index()
    target_summary = target_summary.rename(
        columns={"mean": TARGET_COLUMN, "count": "replicate_count", "std": "replicate_std"}
    )
    target_summary["replicate_std"] = target_summary["replicate_std"].fillna(0.0)
    target_summary["recipe_id"] = recipe_ids(target_summary)

    conflicts = (
        unique_records.groupby(FEATURE_COLUMNS, dropna=False)[TARGET_COLUMN].nunique().gt(1).sum()
    )
    audit: dict[str, int | float] = {
        "raw_rows": int(len(frame)),
        "exact_duplicate_rows_removed": exact_duplicates,
        "unique_input_age_rows": int(len(target_summary)),
        "input_age_duplicate_rows_collapsed": int(len(unique_records) - len(target_summary)),
        "conflicting_input_age_groups": int(conflicts),
        "unique_recipes": int(target_summary["recipe_id"].nunique()),
        "target_mean_mpa": float(target_summary[TARGET_COLUMN].mean()),
        "target_min_mpa": float(target_summary[TARGET_COLUMN].min()),
        "target_max_mpa": float(target_summary[TARGET_COLUMN].max()),
    }
    return PreparedData(target_summary, audit)


def split_by_recipe(
    frame: pd.DataFrame,
    *,
    calibration_size: float = 0.15,
    test_size: float = 0.15,
    random_state: int = 42,
) -> DataSplit:
    """Create deterministic train/calibration/test partitions with disjoint recipes."""

    if calibration_size <= 0 or test_size <= 0 or calibration_size + test_size >= 1:
        raise ValueError("Calibration and test sizes must be positive and sum to less than one.")
    if "recipe_id" not in frame:
        raise ValueError("Prepared frame must include recipe_id.")

    holdout_size = calibration_size + test_size
    first = GroupShuffleSplit(n_splits=1, test_size=holdout_size, random_state=random_state)
    train_index, holdout_index = next(first.split(frame, groups=frame["recipe_id"]))
    holdout = frame.iloc[holdout_index]

    relative_test_size = test_size / holdout_size
    second = GroupShuffleSplit(
        n_splits=1, test_size=relative_test_size, random_state=random_state + 1
    )
    calibration_rel, test_rel = next(second.split(holdout, groups=holdout["recipe_id"]))

    split = DataSplit(
        train=frame.iloc[train_index].reset_index(drop=True),
        calibration=holdout.iloc[calibration_rel].reset_index(drop=True),
        test=holdout.iloc[test_rel].reset_index(drop=True),
    )
    group_sets = [set(part["recipe_id"]) for part in (split.train, split.calibration, split.test)]
    if (
        group_sets[0] & group_sets[1]
        or group_sets[0] & group_sets[2]
        or group_sets[1] & group_sets[2]
    ):
        raise AssertionError("Recipe leakage detected across data partitions.")
    return split


def save_split_manifest(split: DataSplit, path: Path) -> None:
    payload = {
        name: {
            "rows": int(len(part)),
            "recipes": int(part["recipe_id"].nunique()),
            "recipe_ids": sorted(part["recipe_id"].unique().tolist()),
        }
        for name, part in {
            "train": split.train,
            "calibration": split.calibration,
            "test": split.test,
        }.items()
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
