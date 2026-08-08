from __future__ import annotations

import numpy as np
import pandas as pd

from concrete_strength.evaluation import age_monotonicity_report
from concrete_strength.training import _select_model


def test_one_standard_error_rule_prefers_monotonic_model_when_eligible() -> None:
    summary = pd.DataFrame(
        [
            {"model": "extra_trees", "mean_mae_mpa": 3.60, "std_mae_mpa": 0.40},
            {
                "model": "age_monotonic_gradient_boosting",
                "mean_mae_mpa": 3.70,
                "std_mae_mpa": 0.20,
            },
        ]
    )
    selected, threshold = _select_model(summary, n_splits=5)
    assert selected == "age_monotonic_gradient_boosting"
    assert threshold > 3.70


def test_one_standard_error_rule_keeps_best_when_monotonic_model_is_outside() -> None:
    summary = pd.DataFrame(
        [
            {"model": "extra_trees", "mean_mae_mpa": 3.60, "std_mae_mpa": 0.10},
            {
                "model": "age_monotonic_gradient_boosting",
                "mean_mae_mpa": 3.80,
                "std_mae_mpa": 0.20,
            },
        ]
    )
    selected, _ = _select_model(summary, n_splits=5)
    assert selected == "extra_trees"


def test_counterfactual_age_grid_detects_predicted_strength_drop() -> None:
    class DroppingModel:
        def predict(self, frame: pd.DataFrame) -> np.ndarray:
            age = frame["age"].to_numpy(dtype=float)
            return np.where(age <= 28.0, age, 56.0 - age)

    recipe = pd.DataFrame(
        [
            {
                "recipe_id": "recipe-a",
                "cement": 300.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 180.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 1_000.0,
                "fine_aggregate": 750.0,
                "age": 28.0,
            }
        ]
    )
    report = age_monotonicity_report(DroppingModel(), recipe)
    assert report["recipes_with_violation"] == 1
    assert report["violating_pairs"] > 0
    assert report["maximum_predicted_drop_mpa"] > 0

