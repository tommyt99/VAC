from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from concrete_strength.features import MODEL_FEATURES, engineer_features


def test_engineered_ratios_are_dimensionless_and_finite() -> None:
    frame = pd.DataFrame(
        [
            {
                "cement": 300.0,
                "blast_furnace_slag": 100.0,
                "fly_ash": 100.0,
                "water": 200.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 1_000.0,
                "fine_aggregate": 750.0,
                "age": 28.0,
            }
        ]
    )
    transformed = engineer_features(frame)
    assert list(transformed) == MODEL_FEATURES
    assert transformed.iloc[0]["total_binder"] == 500.0
    assert transformed.iloc[0]["water_binder_ratio"] == 0.4
    assert transformed.iloc[0]["scm_fraction"] == 0.4
    assert np.isfinite(transformed.to_numpy()).all()


def test_zero_total_aggregate_is_rejected() -> None:
    frame = pd.DataFrame(
        [
            {
                "cement": 300.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 180.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 0.0,
                "fine_aggregate": 0.0,
                "age": 28.0,
            }
        ]
    )
    with pytest.raises(ValueError, match="Total aggregate"):
        engineer_features(frame)
