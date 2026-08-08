"""Model catalogue and group-aware cross-validation."""

from __future__ import annotations

import time
from collections.abc import Mapping

import numpy as np
import pandas as pd
from sklearn.base import RegressorMixin, clone
from sklearn.compose import TransformedTargetRegressor
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from concrete_strength.features import ConcreteFeatureEngineer, age_monotonic_constraints


def _scaled_regressor(regressor: RegressorMixin) -> TransformedTargetRegressor:
    feature_pipeline = Pipeline(
        [
            ("features", ConcreteFeatureEngineer()),
            ("scale", StandardScaler()),
            ("regressor", regressor),
        ]
    )
    return TransformedTargetRegressor(regressor=feature_pipeline, transformer=StandardScaler())


def model_catalog(*, random_state: int = 42, quick: bool = False) -> dict[str, RegressorMixin]:
    """Return fixed candidate models evaluated on identical grouped folds."""

    tree_count = 120 if quick else 500
    boost_iterations = 100 if quick else 450
    neural_iterations = 250 if quick else 3_000
    return {
        "ridge_baseline": _scaled_regressor(Ridge(alpha=10.0)),
        "scaled_rbf_svr": _scaled_regressor(SVR(C=10.0, epsilon=0.05, gamma="scale")),
        "extra_trees": Pipeline(
            [
                ("features", ConcreteFeatureEngineer()),
                (
                    "regressor",
                    ExtraTreesRegressor(
                        n_estimators=tree_count,
                        max_features=0.9,
                        min_samples_leaf=1,
                        random_state=random_state,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
        "age_monotonic_gradient_boosting": Pipeline(
            [
                ("features", ConcreteFeatureEngineer()),
                (
                    "regressor",
                    HistGradientBoostingRegressor(
                        learning_rate=0.05,
                        max_iter=boost_iterations,
                        max_leaf_nodes=23,
                        min_samples_leaf=10,
                        l2_regularization=1.0,
                        monotonic_cst=age_monotonic_constraints(),
                        early_stopping=False,
                        random_state=random_state,
                    ),
                ),
            ]
        ),
        "regularized_neural_network": _scaled_regressor(
            MLPRegressor(
                hidden_layer_sizes=(128, 64),
                activation="relu",
                solver="adam",
                alpha=0.01,
                learning_rate_init=0.003,
                max_iter=neural_iterations,
                tol=1e-5,
                n_iter_no_change=50,
                early_stopping=False,
                random_state=random_state,
            )
        ),
    }


def cross_validate_models(
    models: Mapping[str, RegressorMixin],
    X: pd.DataFrame,
    y: pd.Series,
    groups: pd.Series,
    *,
    n_splits: int = 5,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Evaluate candidates without allowing a recipe to cross a fold boundary."""

    splitter = GroupKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
    records: list[dict[str, float | int | str]] = []
    folds = list(splitter.split(X, y, groups))
    for model_name, template in models.items():
        for fold_number, (train_index, validation_index) in enumerate(folds, start=1):
            model = clone(template)
            started = time.perf_counter()
            model.fit(X.iloc[train_index], y.iloc[train_index])
            prediction = np.asarray(model.predict(X.iloc[validation_index]), dtype=float)
            elapsed = time.perf_counter() - started
            truth = y.iloc[validation_index].to_numpy(dtype=float)
            records.append(
                {
                    "model": model_name,
                    "fold": fold_number,
                    "mae_mpa": float(mean_absolute_error(truth, prediction)),
                    "rmse_mpa": float(np.sqrt(mean_squared_error(truth, prediction))),
                    "r2": float(r2_score(truth, prediction)),
                    "fit_seconds": float(elapsed),
                    "validation_rows": int(len(validation_index)),
                    "validation_recipes": int(groups.iloc[validation_index].nunique()),
                }
            )

    fold_results = pd.DataFrame(records)
    summary = (
        fold_results.groupby("model", as_index=False)
        .agg(
            mean_mae_mpa=("mae_mpa", "mean"),
            std_mae_mpa=("mae_mpa", "std"),
            mean_rmse_mpa=("rmse_mpa", "mean"),
            std_rmse_mpa=("rmse_mpa", "std"),
            mean_r2=("r2", "mean"),
            std_r2=("r2", "std"),
            total_fit_seconds=("fit_seconds", "sum"),
        )
        .sort_values(["mean_mae_mpa", "mean_rmse_mpa", "model"], ignore_index=True)
    )
    return fold_results, summary
