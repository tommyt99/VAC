"""Adapters for separately sourced external robustness audits."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from concrete_strength.schema import FEATURE_COLUMNS, TARGET_COLUMN

PSI_TO_MPA = 0.006894757293168361


def load_global_scm(path: str | Path) -> pd.DataFrame:
    """Load the common-schema, silica-fume-free 28-day subset of Global SCM v2."""

    raw = pd.read_excel(path)
    raw.columns = [str(column).strip() for column in raw.columns]
    mapping = {
        "Cement(kg/m3)": "cement",
        "GGBFS (kg/m3)": "blast_furnace_slag",
        "FA (kg/m3)": "fly_ash",
        "Water(kg/m3)": "water",
        "SP (kg/m3)": "superplasticizer",
        "Coarse aggregate(kg/m3)": "coarse_aggregate",
        "Fine aggregate(kg/m3)": "fine_aggregate",
        "Cylinder compressive strength (MPa)": TARGET_COLUMN,
    }
    missing = [column for column in [*mapping, "SF (kg/m3)", "Reference"] if column not in raw]
    if missing:
        raise ValueError(f"Global SCM columns missing: {', '.join(missing)}")
    study_id = raw["Reference"].ffill()
    subset = raw.loc[raw["SF (kg/m3)"] == 0, list(mapping)].rename(columns=mapping).copy()
    subset = subset.replace(-1, np.nan)
    subset["age"] = 28.0
    subset = subset.dropna(subset=[*FEATURE_COLUMNS, TARGET_COLUMN])
    subset["source_id"] = study_id.loc[subset.index].astype(str)
    return subset.loc[:, [*FEATURE_COLUMNS, TARGET_COLUMN, "source_id"]].reset_index(drop=True)


def load_boxcrete(path: str | Path) -> pd.DataFrame:
    """Load measured standard-temperature concrete rows and convert strength from psi to MPa."""

    raw = pd.read_csv(path)
    required = [
        "Mix Name",
        "Cement (kg/m3)",
        "Fly Ash (kg/m3)",
        "Slag (kg/m3)",
        "Water (kg/m3)",
        "HRWR (kg/m3)",
        "Fine Aggregate (kg/m3)",
        "Coarse Aggregates (kg/m3)",
        "Temp (C)",
        "Time",
        "Strength (Mean)",
    ]
    missing = [column for column in required if column not in raw]
    if missing:
        raise ValueError(f"BOxCrete columns missing: {', '.join(missing)}")
    subset = raw.loc[
        (raw["Coarse Aggregates (kg/m3)"] > 0)
        & np.isclose(raw["Temp (C)"], 22.0)
        & raw["Strength (Mean)"].notna()
    ].copy()
    subset = subset.rename(
        columns={
            "Cement (kg/m3)": "cement",
            "Slag (kg/m3)": "blast_furnace_slag",
            "Fly Ash (kg/m3)": "fly_ash",
            "Water (kg/m3)": "water",
            "HRWR (kg/m3)": "superplasticizer",
            "Coarse Aggregates (kg/m3)": "coarse_aggregate",
            "Fine Aggregate (kg/m3)": "fine_aggregate",
            "Time": "age",
        }
    )
    subset[TARGET_COLUMN] = subset["Strength (Mean)"] * PSI_TO_MPA
    subset["source_id"] = subset["Mix Name"].astype(str)
    return subset.loc[:, [*FEATURE_COLUMNS, TARGET_COLUMN, "source_id"]].reset_index(drop=True)
