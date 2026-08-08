"""Deterministic domain features for concrete mixtures."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

from concrete_strength.schema import FEATURE_COLUMNS, to_model_frame

ENGINEERED_FEATURES = [
    "total_binder",
    "water_binder_ratio",
    "scm_fraction",
    "aggregate_binder_ratio",
    "fine_aggregate_fraction",
    "superplasticizer_binder_ratio",
    "log_age",
]
MODEL_FEATURES = [*FEATURE_COLUMNS, *ENGINEERED_FEATURES]


def engineer_features(data: pd.DataFrame) -> pd.DataFrame:
    frame = to_model_frame(data)
    binder = frame["cement"] + frame["blast_furnace_slag"] + frame["fly_ash"]
    aggregate = frame["coarse_aggregate"] + frame["fine_aggregate"]
    engineered = frame.copy()
    engineered["total_binder"] = binder
    engineered["water_binder_ratio"] = frame["water"] / binder
    engineered["scm_fraction"] = (frame["blast_furnace_slag"] + frame["fly_ash"]) / binder
    engineered["aggregate_binder_ratio"] = aggregate / binder
    engineered["fine_aggregate_fraction"] = frame["fine_aggregate"] / aggregate
    engineered["superplasticizer_binder_ratio"] = frame["superplasticizer"] / binder
    engineered["log_age"] = np.log1p(frame["age"])
    engineered = engineered.loc[:, MODEL_FEATURES]
    if not np.isfinite(engineered.to_numpy(dtype=float)).all():
        raise ValueError("Engineered concrete features must all be finite.")
    return engineered


class ConcreteFeatureEngineer(TransformerMixin, BaseEstimator):
    """Scikit-learn compatible, stateless feature engineering."""

    def fit(self, X: pd.DataFrame, y: object = None) -> ConcreteFeatureEngineer:  # noqa: N803
        engineer_features(X)
        self.n_features_in_ = len(FEATURE_COLUMNS)
        self.feature_names_in_ = np.asarray(FEATURE_COLUMNS, dtype=object)
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:  # noqa: N803
        return engineer_features(X).to_numpy(dtype=float)

    def get_feature_names_out(self, input_features: object = None) -> np.ndarray:
        return np.asarray(MODEL_FEATURES, dtype=object)


def age_monotonic_constraints() -> list[int]:
    constraints = [0] * len(MODEL_FEATURES)
    constraints[MODEL_FEATURES.index("age")] = 1
    constraints[MODEL_FEATURES.index("log_age")] = 1
    return constraints
