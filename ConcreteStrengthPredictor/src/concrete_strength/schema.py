"""Canonical feature schema and validation rules."""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np
import pandas as pd

INGREDIENT_COLUMNS = [
    "cement",
    "blast_furnace_slag",
    "fly_ash",
    "water",
    "superplasticizer",
    "coarse_aggregate",
    "fine_aggregate",
]
FEATURE_COLUMNS = [*INGREDIENT_COLUMNS, "age"]
TARGET_COLUMN = "compressive_strength"

DISPLAY_NAMES = {
    "cement": "Cement (kg/m³)",
    "blast_furnace_slag": "Blast-furnace slag (kg/m³)",
    "fly_ash": "Fly ash (kg/m³)",
    "water": "Water (kg/m³)",
    "superplasticizer": "Superplasticizer (kg/m³)",
    "coarse_aggregate": "Coarse aggregate (kg/m³)",
    "fine_aggregate": "Fine aggregate (kg/m³)",
    "age": "Curing age (days)",
    "compressive_strength": "Compressive strength (MPa)",
}


def to_model_frame(data: pd.DataFrame | Mapping[str, float]) -> pd.DataFrame:
    """Return a numeric model frame in canonical feature order."""

    frame = pd.DataFrame([data]) if isinstance(data, Mapping) else data.copy()
    missing = [column for column in FEATURE_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {', '.join(missing)}")

    frame = frame.loc[:, FEATURE_COLUMNS].apply(pd.to_numeric, errors="raise")
    values = frame.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("All concrete inputs must be finite numeric values.")
    if (frame[INGREDIENT_COLUMNS] < 0).any().any():
        raise ValueError("Ingredient quantities cannot be negative.")
    if (frame["age"] <= 0).any():
        raise ValueError("Curing age must be greater than zero days.")
    if ((frame["cement"] + frame["blast_furnace_slag"] + frame["fly_ash"]) <= 0).any():
        raise ValueError("Total binder must be greater than zero.")
    if ((frame["coarse_aggregate"] + frame["fine_aggregate"]) <= 0).any():
        raise ValueError("Total aggregate must be greater than zero.")
    return frame
