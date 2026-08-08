"""End-to-end training and fixed development-holdout evaluation workflow."""

from __future__ import annotations

import importlib.metadata
import importlib.resources
import json
import os
import platform
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone

from concrete_strength.data import (
    canonical_frame_sha256,
    load_concrete_data,
    prepare_data,
    save_split_manifest,
    sha256_file,
    split_by_recipe,
)
from concrete_strength.evaluation import (
    age_monotonicity_report,
    grouped_bootstrap_intervals,
    grouped_bootstrap_metric_intervals,
    grouped_conformal_radius,
    grouped_interval_metrics,
    macro_group_mae,
    regression_metrics,
)
from concrete_strength.external import load_boxcrete, load_global_scm
from concrete_strength.models import cross_validate_models, model_catalog
from concrete_strength.predictor import ConcreteStrengthPredictor, training_domain_bounds
from concrete_strength.schema import FEATURE_COLUMNS, TARGET_COLUMN


def _versions() -> dict[str, str]:
    packages = ["numpy", "pandas", "scikit-learn", "joblib", "openpyxl"]
    return {
        "python": platform.python_version(),
        **{package: importlib.metadata.version(package) for package in packages},
    }


def _data_provenance(
    raw: pd.DataFrame,
    data_path: str | Path,
    global_scm_path: str | Path | None,
    boxcrete_path: str | Path | None,
) -> dict[str, Any]:
    source_manifest = json.loads(
        importlib.resources.files("concrete_strength").joinpath("sources.json").read_text()
    )
    training_path = Path(data_path)
    canonical_hash = canonical_frame_sha256(raw)
    expected_canonical = source_manifest["uci_concrete"]["canonical_schema_sha256"]
    inputs: dict[str, dict[str, Any]] = {
        "training_data": {
            "filename": training_path.name,
            "file_sha256": sha256_file(training_path),
            "canonical_schema_sha256": canonical_hash,
            "verified_as_uci_concrete": canonical_hash == expected_canonical,
        }
    }
    for name, value in {
        "global_scm_v2": global_scm_path,
        "boxcrete": boxcrete_path,
    }.items():
        if value is not None:
            path = Path(value)
            actual_hash = sha256_file(path)
            expected_hash = source_manifest[name]["sha256"]
            inputs[name] = {
                "filename": path.name,
                "file_sha256": actual_hash,
                "expected_sha256": expected_hash,
                "verified": actual_hash == expected_hash,
            }
    return {"input_files": inputs, "source_manifest": source_manifest}


def _select_model(cv_summary: pd.DataFrame, *, n_splits: int = 5) -> tuple[str, float]:
    """Apply a one-standard-error rule with an age-monotonic physics tie-break."""

    best = cv_summary.iloc[0]
    threshold = float(best["mean_mae_mpa"] + best["std_mae_mpa"] / np.sqrt(n_splits))
    eligible = set(cv_summary.loc[cv_summary["mean_mae_mpa"] <= threshold, "model"])
    physics_guided = "age_monotonic_gradient_boosting"
    selected = physics_guided if physics_guided in eligible else str(best["model"])
    return selected, threshold


def _evaluate_external(
    predictor: ConcreteStrengthPredictor,
    frame: pd.DataFrame,
    uci_reference: pd.DataFrame,
    *,
    excluded_source_tokens: tuple[str, ...] = (),
) -> tuple[dict[str, Any], pd.DataFrame]:
    input_rows = len(frame)
    source_overlap = pd.Series(False, index=frame.index)
    for token in excluded_source_tokens:
        source_overlap |= frame["source_id"].str.contains(
            token, case=False, regex=False, na=False
        )
    source_overlap_rows = int(source_overlap.sum())
    frame = frame.loc[~source_overlap].reset_index(drop=True)

    reference_keys = {
        tuple(row)
        for row in uci_reference.loc[:, FEATURE_COLUMNS].round(6).to_numpy(dtype=float)
    }
    external_keys = [
        tuple(row) for row in frame.loc[:, FEATURE_COLUMNS].round(6).to_numpy(dtype=float)
    ]
    exact_overlap = pd.Series([key in reference_keys for key in external_keys], index=frame.index)
    exact_overlap_rows = int(exact_overlap.sum())
    frame = frame.loc[~exact_overlap].reset_index(drop=True)
    if frame.empty:
        raise ValueError("No external rows remain after source and exact-overlap exclusions.")

    prediction = predictor.predict(frame.loc[:, FEATURE_COLUMNS])
    output = pd.concat([frame.reset_index(drop=True), prediction.reset_index(drop=True)], axis=1)
    result: dict[str, Any] = {
        "input_rows": int(input_rows),
        "known_uci_source_rows_excluded": source_overlap_rows,
        "other_exact_uci_input_rows_excluded": exact_overlap_rows,
        "rows": int(len(output)),
        "sources": int(frame["source_id"].nunique()) if "source_id" in frame else None,
        "all_rows": regression_metrics(
            output[TARGET_COLUMN].to_numpy(), output["predicted_strength_mpa"].to_numpy()
        ),
        "in_training_domain_rows": int(output["in_training_domain"].sum()),
        "macro_source_mae_mpa": macro_group_mae(
            output[TARGET_COLUMN].to_numpy(),
            output["predicted_strength_mpa"].to_numpy(),
            output["source_id"].to_numpy(),
        ),
        "source_group_bootstrap_95": grouped_bootstrap_metric_intervals(
            output[TARGET_COLUMN].to_numpy(),
            output["predicted_strength_mpa"].to_numpy(),
            output["source_id"].to_numpy(),
            iterations=1_000,
            random_state=42,
        ),
    }
    in_domain = output.loc[output["in_training_domain"]]
    if len(in_domain) >= 2:
        result["in_training_domain"] = regression_metrics(
            in_domain[TARGET_COLUMN].to_numpy(),
            in_domain["predicted_strength_mpa"].to_numpy(),
        )
    return result, output


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def _model_card(report: dict[str, Any]) -> str:
    test = report["development_holdout"]
    interval = report["prediction_interval"]
    audit = report["data_audit"]
    provenance = report["data_provenance"]["input_files"]
    training_verified = provenance["training_data"]["verified_as_uci_concrete"]
    training_source = (
        "UCI Concrete Compressive Strength canonical contents verified"
        if training_verified
        else "User-supplied schema-compatible data; canonical UCI contents not verified"
    )
    cv = next(
        row for row in report["cross_validation"] if row["model"] == report["selected_model"]
    )
    external = report.get("external_evaluation", {})
    external_lines = []
    for name, values in external.items():
        metrics = values["all_rows"]
        mae_interval = values["source_group_bootstrap_95"]["mae_mpa"]
        provenance_key = "global_scm_v2" if name.startswith("global_scm") else "boxcrete"
        verified = provenance.get(provenance_key, {}).get("verified", False)
        external_lines.append(
            f"- **{name}:** {values['rows']} evaluated rows; MAE {metrics['mae_mpa']:.2f} MPa, "
            f"RMSE {metrics['rmse_mpa']:.2f} MPa, R² {metrics['r2']:.3f}. "
            f"Source-macro MAE {values['macro_source_mae_mpa']:.2f} MPa; source-bootstrap "
            f"95% MAE interval {mae_interval['lower_95']:.2f}–"
            f"{mae_interval['upper_95']:.2f} MPa. "
            f"{values['in_training_domain_rows']} rows are within every training marginal range. "
            f"Excluded {values['known_uci_source_rows_excluded']} rows from a known UCI source and "
            f"{values['other_exact_uci_input_rows_excluded']} other exact UCI-input overlaps. "
            f"Source-file checksum verified: {'yes' if verified else 'no'}."
        )
    external_text = "\n".join(external_lines) or "- No external datasets were supplied in this run."
    return f"""# Model card

## Intended use

Estimate laboratory concrete compressive strength from seven mixture quantities and curing age.
The output is a screening estimate—not a substitute for trial batches, cylinder/cube testing,
structural design checks, specifications, or professional engineering judgment.

## Selected model

`{report['selected_model']}` was selected using only five-fold recipe-grouped cross-validation on
the training partition. Its grouped-CV MAE was {cv['mean_mae_mpa']:.2f} ±
{cv['std_mae_mpa']:.2f} MPa. The one-standard-error rule preferred the age-monotonic candidate
when its mean MAE was within one estimated standard error of the lowest-MAE model. This is a
parsimony/physics heuristic, not a statistical significance test. The neural network and every
baseline used the same folds.

## Data and leakage controls

- {training_source}. DOI 10.24432/C5PK67, CC BY 4.0 when verified.
- {audit['raw_rows']} source rows became {audit['unique_input_age_rows']} unique recipe-age rows.
- {audit['exact_duplicate_rows_removed']} beyond-first exact duplicates were removed; identical
  inputs with differing measurements were averaged and their replicate statistics retained.
- All seven ingredient quantities define a recipe group; recipes never cross train, calibration,
  and fixed development-holdout boundaries.
- The legacy workbook's strength-in-ksi formula and summary cells are explicitly excluded.

## Fixed development-holdout performance

- MAE: **{test['mae_mpa']:.2f} MPa**
- RMSE: **{test['rmse_mpa']:.2f} MPa**
- R²: **{test['r2']:.3f}**
- Mean signed error (prediction − observed): **{test['mean_error_mpa']:.2f} MPa**

These are single-split development estimates. The machine-readable report includes 95%
recipe-bootstrap intervals. The partition was not used for estimator fitting, model selection, or
interval calibration, but the overall methodology was refined during this project audit after
earlier holdout results had been inspected. Treat this as a transparent development benchmark,
not a preregistered confirmatory test; new prospective data are required for final confirmation.

## Prediction interval

The nominal {report['interval_coverage_nominal']:.0%} recipe-grouped split-conformal interval uses
each calibration recipe's maximum absolute residual and has a constant radius of
{interval['radius_mpa']:.2f} MPa. Development-holdout point coverage was
{interval['empirical_coverage']:.1%}; all observed ages were simultaneously covered for
{interval['simultaneous_recipe_coverage']:.1%} of test recipes. Mean point-interval width was
{interval['mean_width_mpa']:.2f} MPa. Finite-sample validity relies on exchangeable recipe groups
and does not guarantee the realized coverage of one test split.

## External evaluation

{external_text}

External data were not used for fitting or model selection. Differences in laboratories,
materials, specimen geometry, curing, and testing standards can dominate prediction error.

## Important limitations

- The UCI benchmark is small (only {audit['unique_recipes']} independent recipes) and historical.
- The model has no cement chemistry, admixture identity, curing temperature/humidity, air content,
  density, specimen geometry, batch, or test-standard fields.
- Marginal range checks are only a coarse out-of-distribution warning; being in range does not
  prove that a combination is familiar.
- Prediction intervals inherit exchangeability assumptions and may under-cover shifted domains.
- Do not extrapolate to UHPC, alkali-activated binders, unusual aggregates, or field cores without
  domain-specific validation.
"""


def train_project(
    data_path: str | Path,
    output_dir: str | Path,
    *,
    global_scm_path: str | Path | None = None,
    boxcrete_path: str | Path | None = None,
    random_state: int = 42,
    quick: bool = False,
) -> dict[str, Any]:
    output = Path(output_dir)
    output.parent.mkdir(parents=True, exist_ok=True)

    raw = load_concrete_data(data_path)
    prepared = prepare_data(raw)
    split = split_by_recipe(prepared.frame, random_state=random_state)

    models = model_catalog(random_state=random_state, quick=quick)
    train_x = split.train.loc[:, FEATURE_COLUMNS]
    train_y = split.train[TARGET_COLUMN]
    fold_results, cv_summary = cross_validate_models(
        models,
        train_x,
        train_y,
        split.train["recipe_id"],
        random_state=random_state,
    )
    selected_model, selection_threshold = _select_model(cv_summary)
    fitted = clone(models[selected_model]).fit(train_x, train_y)

    calibration_prediction = np.asarray(
        fitted.predict(split.calibration.loc[:, FEATURE_COLUMNS]), dtype=float
    )
    radius = grouped_conformal_radius(
        split.calibration[TARGET_COLUMN].to_numpy() - calibration_prediction,
        split.calibration["recipe_id"],
        coverage=0.90,
    )
    predictor = ConcreteStrengthPredictor(
        model=fitted,
        model_name=selected_model,
        interval_radius_mpa=radius,
        interval_coverage=0.90,
        domain_bounds=training_domain_bounds(train_x),
        metadata={
            "random_state": random_state,
            "versions": _versions(),
            "training_mode": "smoke" if quick else "full",
            "training_rows": int(len(split.train)),
            "training_recipes": int(split.train["recipe_id"].nunique()),
        },
    )

    test_prediction = predictor.predict(split.test.loc[:, FEATURE_COLUMNS])
    test_values = test_prediction["predicted_strength_mpa"].to_numpy()
    truth = split.test[TARGET_COLUMN].to_numpy()
    test_output = pd.concat(
        [split.test.reset_index(drop=True), test_prediction.reset_index(drop=True)], axis=1
    )

    report: dict[str, Any] = {
        "selected_model": selected_model,
        "selection_rule": (
            "one-standard-error rule on grouped-CV MAE, preferring the age-monotonic model "
            "when eligible; training partition only"
        ),
        "selection_mae_threshold_mpa": selection_threshold,
        "random_state": random_state,
        "training_mode": "smoke" if quick else "full",
        "versions": _versions(),
        "data_provenance": _data_provenance(
            raw, data_path, global_scm_path, boxcrete_path
        ),
        "data_audit": prepared.audit,
        "partitions": {
            name: {"rows": int(len(part)), "recipes": int(part["recipe_id"].nunique())}
            for name, part in {
                "train": split.train,
                "calibration": split.calibration,
                "test": split.test,
            }.items()
        },
        "cross_validation": cv_summary.to_dict(orient="records"),
        "evaluation_status": (
            "fixed development holdout; methodology refined after prior holdout inspection; "
            "prospective confirmation still required"
        ),
        "development_holdout": regression_metrics(truth, test_values),
        "development_holdout_recipe_bootstrap_95": grouped_bootstrap_intervals(
            split.test, test_values, iterations=1_000, random_state=random_state
        ),
        "interval_coverage_nominal": 0.90,
        "interval_calibration_unit": "maximum absolute residual within each calibration recipe",
        "prediction_interval": grouped_interval_metrics(split.test, truth, test_values, radius),
        "age_monotonicity": age_monotonicity_report(fitted, split.test),
    }

    external_report: dict[str, Any] = {}
    external_outputs: dict[str, pd.DataFrame] = {}
    if global_scm_path is not None:
        metrics, external_predictions = _evaluate_external(
            predictor,
            load_global_scm(global_scm_path),
            prepared.frame,
            excluded_source_tokens=("10.1016/S0008-8846(98)00165-3",),
        )
        external_report["global_scm_v2_28_day_no_silica_fume"] = metrics
        external_outputs["external_global_scm_predictions.csv"] = external_predictions
    if boxcrete_path is not None:
        metrics, external_predictions = _evaluate_external(
            predictor, load_boxcrete(boxcrete_path), prepared.frame
        )
        external_report["boxcrete_standard_temperature_concrete"] = metrics
        external_outputs["external_boxcrete_predictions.csv"] = external_predictions
    if external_report:
        report["external_evaluation"] = external_report

    report = _json_safe(report)
    predictor.metadata["training_report"] = report
    with tempfile.TemporaryDirectory(prefix=f".{output.name}-", dir=output.parent) as temporary:
        staged = Path(temporary)
        predictor.save(staged / "model.joblib")
        save_split_manifest(split, staged / "split_manifest.json")
        fold_results.to_csv(staged / "cv_fold_results.csv", index=False)
        cv_summary.to_csv(staged / "cv_summary.csv", index=False)
        test_output.to_csv(staged / "development_holdout_predictions.csv", index=False)
        for filename, frame in external_outputs.items():
            frame.to_csv(staged / filename, index=False)
        (staged / "training_report.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
        (staged / "MODEL_CARD.md").write_text(_model_card(report), encoding="utf-8")

        artifact_hashes = {
            path.name: sha256_file(path) for path in sorted(staged.iterdir()) if path.is_file()
        }
        completion = {
            "status": "complete",
            "run_id": artifact_hashes["training_report.json"][:16],
            "artifacts": artifact_hashes,
        }
        (staged / "RUN_COMPLETE.json").write_text(
            json.dumps(completion, indent=2) + "\n", encoding="utf-8"
        )

        output.mkdir(parents=True, exist_ok=True)
        managed = {
            "MODEL_CARD.md",
            "RUN_COMPLETE.json",
            "cv_fold_results.csv",
            "cv_summary.csv",
            "development_holdout_predictions.csv",
            "external_boxcrete_predictions.csv",
            "external_global_scm_predictions.csv",
            "locked_test_predictions.csv",
            "model.joblib",
            "split_manifest.json",
            "training_report.json",
        }
        produced = {path.name for path in staged.iterdir() if path.is_file()}
        (output / "RUN_COMPLETE.json").unlink(missing_ok=True)
        for stale_name in managed - produced:
            (output / stale_name).unlink(missing_ok=True)
        promotion_order = sorted(
            staged.iterdir(), key=lambda path: path.name == "RUN_COMPLETE.json"
        )
        for staged_path in promotion_order:
            os.replace(staged_path, output / staged_path.name)
    return report
