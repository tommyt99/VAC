from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from concrete_strength.evaluation import (
    conformal_radius,
    grouped_conformal_radius,
    grouped_interval_metrics,
    interval_metrics,
)


def test_conformal_radius_uses_finite_sample_higher_quantile() -> None:
    assert conformal_radius(np.arange(1.0, 11.0), coverage=0.90) == 10.0


def test_conformal_rejects_unattainable_coverage() -> None:
    with pytest.raises(ValueError, match="unattainable"):
        conformal_radius(np.array([1.0, 2.0, 3.0]), coverage=0.90)


def test_interval_is_clipped_at_zero() -> None:
    result = interval_metrics(np.array([1.0]), np.array([2.0]), radius=5.0)
    assert result["empirical_coverage"] == 1.0
    assert result["mean_width_mpa"] == 7.0


def test_grouped_conformal_uses_each_recipes_worst_residual() -> None:
    residuals = np.array([1.0, 9.0, 2.0, 3.0])
    groups = np.array(["a", "a", "b", "c"])
    assert grouped_conformal_radius(residuals, groups, coverage=0.5) == 3.0


def test_grouped_interval_requires_every_age_for_recipe_coverage() -> None:
    frame = pd.DataFrame({"recipe_id": ["a", "a", "b"]})
    result = grouped_interval_metrics(
        frame,
        truth=np.array([10.0, 20.0, 30.0]),
        prediction=np.array([10.0, 30.0, 30.0]),
        radius=2.0,
    )
    assert result["empirical_coverage"] == 2 / 3
    assert result["simultaneous_recipe_coverage"] == 0.5
