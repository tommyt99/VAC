"""Regression, uncertainty, and physical-consistency diagnostics."""

from __future__ import annotations

import math
from collections.abc import Callable

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from concrete_strength.schema import FEATURE_COLUMNS, INGREDIENT_COLUMNS, TARGET_COLUMN


def regression_metrics(truth: np.ndarray, prediction: np.ndarray) -> dict[str, float]:
    truth = np.asarray(truth, dtype=float)
    prediction = np.asarray(prediction, dtype=float)
    return {
        "mae_mpa": float(mean_absolute_error(truth, prediction)),
        "rmse_mpa": float(np.sqrt(mean_squared_error(truth, prediction))),
        "r2": _safe_r2(truth, prediction),
        "mean_error_mpa": float(np.mean(prediction - truth)),
    }


def _safe_r2(truth: np.ndarray, prediction: np.ndarray) -> float:
    if len(truth) < 2 or np.ptp(truth) == 0:
        return float("nan")
    return float(r2_score(truth, prediction))


def conformal_radius(residuals: np.ndarray, *, coverage: float = 0.90) -> float:
    """Finite-sample split-conformal radius using the conservative higher order statistic."""

    residuals = np.sort(np.abs(np.asarray(residuals, dtype=float)))
    if residuals.size == 0:
        raise ValueError("At least one calibration residual is required.")
    if not 0 < coverage < 1:
        raise ValueError("Coverage must be between zero and one.")
    rank = math.ceil((residuals.size + 1) * coverage)
    if rank > residuals.size:
        maximum = residuals.size / (residuals.size + 1)
        raise ValueError(
            f"Coverage {coverage:.3f} is unattainable with {residuals.size} calibration scores; "
            f"use coverage <= {maximum:.3f} or collect more calibration groups."
        )
    return float(residuals[rank - 1])


def grouped_conformal_radius(
    residuals: np.ndarray,
    groups: np.ndarray | pd.Series,
    *,
    coverage: float = 0.90,
) -> float:
    """Calibrate on each recipe's worst residual for simultaneous within-recipe coverage."""

    residuals = np.abs(np.asarray(residuals, dtype=float))
    group_values = np.asarray(groups)
    if len(residuals) != len(group_values):
        raise ValueError("Residual and group lengths do not match.")
    scores = pd.DataFrame({"group": group_values, "residual": residuals}).groupby(
        "group", sort=False
    )["residual"].max()
    return conformal_radius(scores.to_numpy(), coverage=coverage)


def interval_metrics(
    truth: np.ndarray, prediction: np.ndarray, radius: float
) -> dict[str, float]:
    truth = np.asarray(truth, dtype=float)
    prediction = np.asarray(prediction, dtype=float)
    lower = np.maximum(0.0, prediction - radius)
    upper = prediction + radius
    return {
        "empirical_coverage": float(np.mean((truth >= lower) & (truth <= upper))),
        "mean_width_mpa": float(np.mean(upper - lower)),
        "radius_mpa": float(radius),
    }


def grouped_interval_metrics(
    frame: pd.DataFrame,
    truth: np.ndarray,
    prediction: np.ndarray,
    radius: float,
) -> dict[str, float | int]:
    """Report point coverage and whether every observed age is covered for each recipe."""

    truth = np.asarray(truth, dtype=float)
    prediction = np.asarray(prediction, dtype=float)
    if len(frame) != len(truth) or len(truth) != len(prediction):
        raise ValueError("Frame, truth, and prediction lengths do not match.")
    lower = np.maximum(0.0, prediction - radius)
    upper = prediction + radius
    covered = (truth >= lower) & (truth <= upper)
    coverage_frame = pd.DataFrame(
        {"recipe_id": frame["recipe_id"].to_numpy(), "covered": covered}
    )
    recipe_coverage = coverage_frame.groupby("recipe_id", sort=False)["covered"].all()
    return {
        **interval_metrics(truth, prediction, radius),
        "recipe_count": int(len(recipe_coverage)),
        "completely_covered_recipes": int(recipe_coverage.sum()),
        "simultaneous_recipe_coverage": float(recipe_coverage.mean()),
    }


def grouped_bootstrap_intervals(
    frame: pd.DataFrame,
    prediction: np.ndarray,
    *,
    iterations: int = 1_000,
    random_state: int = 42,
) -> dict[str, dict[str, float]]:
    """Bootstrap complete held-out recipes rather than treating rows as independent."""

    prediction = np.asarray(prediction, dtype=float)
    if len(frame) != len(prediction):
        raise ValueError("Frame and prediction lengths do not match.")
    return grouped_bootstrap_metric_intervals(
        frame[TARGET_COLUMN].to_numpy(dtype=float),
        prediction,
        frame["recipe_id"].to_numpy(),
        iterations=iterations,
        random_state=random_state,
    )


def grouped_bootstrap_metric_intervals(
    truth: np.ndarray,
    prediction: np.ndarray,
    groups: np.ndarray | pd.Series,
    *,
    iterations: int = 1_000,
    random_state: int = 42,
) -> dict[str, dict[str, float]]:
    """Bootstrap whole source groups for regression-metric uncertainty."""

    truth_all = np.asarray(truth, dtype=float)
    prediction = np.asarray(prediction, dtype=float)
    group_values = np.asarray(groups)
    if len(truth_all) != len(prediction) or len(truth_all) != len(group_values):
        raise ValueError("Truth, prediction, and group lengths do not match.")
    rng = np.random.default_rng(random_state)
    unique_groups = pd.Series(group_values).drop_duplicates().to_numpy()
    group_positions = {
        group: np.flatnonzero(group_values == group) for group in unique_groups
    }
    metric_functions: dict[str, Callable[[np.ndarray, np.ndarray], float]] = {
        "mae_mpa": lambda y, p: float(mean_absolute_error(y, p)),
        "rmse_mpa": lambda y, p: float(np.sqrt(mean_squared_error(y, p))),
        "r2": _safe_r2,
    }
    samples = {name: [] for name in metric_functions}
    for _ in range(iterations):
        chosen = rng.choice(unique_groups, size=len(unique_groups), replace=True)
        positions = np.concatenate([group_positions[group] for group in chosen])
        truth = truth_all[positions]
        predicted = prediction[positions]
        for name, function in metric_functions.items():
            value = function(truth, predicted)
            if np.isfinite(value):
                samples[name].append(value)
    return {
        name: {
            "lower_95": float(np.quantile(values, 0.025)),
            "upper_95": float(np.quantile(values, 0.975)),
        }
        for name, values in samples.items()
    }


def macro_group_mae(
    truth: np.ndarray, prediction: np.ndarray, groups: np.ndarray | pd.Series
) -> float:
    errors = pd.DataFrame(
        {
            "group": np.asarray(groups),
            "absolute_error": np.abs(
                np.asarray(prediction, dtype=float) - np.asarray(truth, dtype=float)
            ),
        }
    )
    return float(errors.groupby("group")["absolute_error"].mean().mean())


def age_monotonicity_report(
    model: object,
    frame: pd.DataFrame,
    *,
    age_grid: tuple[float, ...] = (1, 3, 7, 14, 28, 56, 90, 180, 365),
) -> dict[str, object]:
    """Sweep every held-out recipe over a common age grid to expose counterfactual decreases."""

    recipes = frame.drop_duplicates("recipe_id").loc[:, ["recipe_id", *INGREDIENT_COLUMNS]]
    assessed = recipes.merge(pd.DataFrame({"age": age_grid}), how="cross")
    assessed["prediction"] = np.asarray(
        model.predict(assessed.loc[:, FEATURE_COLUMNS]), dtype=float
    )
    pair_count = 0
    violation_count = 0
    maximum_drop = 0.0
    violating_recipes = 0
    for _, group in assessed.sort_values("age").groupby("recipe_id"):
        differences = np.diff(group["prediction"].to_numpy(dtype=float))
        pair_count += len(differences)
        drops = differences[differences < -1e-9]
        violation_count += len(drops)
        if len(drops):
            violating_recipes += 1
            maximum_drop = max(maximum_drop, float(-drops.min()))
    return {
        "age_grid_days": list(age_grid),
        "recipes_assessed": int(len(recipes)),
        "recipes_with_violation": violating_recipes,
        "adjacent_age_pairs": pair_count,
        "violating_pairs": violation_count,
        "violation_rate": float(violation_count / pair_count) if pair_count else 0.0,
        "maximum_predicted_drop_mpa": maximum_drop,
    }
