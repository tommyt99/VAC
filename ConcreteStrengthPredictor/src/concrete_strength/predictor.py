"""Serializable prediction bundle with calibrated intervals and domain checks."""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import platform
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from concrete_strength.features import MODEL_FEATURES, engineer_features
from concrete_strength.schema import FEATURE_COLUMNS, to_model_frame


@dataclass
class ConcreteStrengthPredictor:
    model: Any
    model_name: str
    interval_radius_mpa: float
    interval_coverage: float
    domain_bounds: dict[str, dict[str, float]]
    metadata: dict[str, Any] = field(default_factory=dict)

    def in_domain(self, data: pd.DataFrame | dict[str, float]) -> pd.Series:
        engineered = engineer_features(to_model_frame(data))
        in_range = pd.Series(True, index=engineered.index)
        for feature in MODEL_FEATURES:
            bounds = self.domain_bounds[feature]
            in_range &= engineered[feature].between(bounds["min"], bounds["max"], inclusive="both")
        return in_range

    def domain_warnings(self, data: pd.DataFrame | dict[str, float]) -> list[list[str]]:
        engineered = engineer_features(to_model_frame(data))
        warnings: list[list[str]] = []
        for _, row in engineered.iterrows():
            row_warnings: list[str] = []
            for feature in MODEL_FEATURES:
                value = float(row[feature])
                bounds = self.domain_bounds[feature]
                if value < bounds["min"] or value > bounds["max"]:
                    row_warnings.append(
                        f"{feature}={value:.3g} is outside training range "
                        f"[{bounds['min']:.3g}, {bounds['max']:.3g}]"
                    )
            warnings.append(row_warnings)
        return warnings

    def predict(self, data: pd.DataFrame | dict[str, float]) -> pd.DataFrame:
        frame = to_model_frame(data)
        prediction = np.asarray(self.model.predict(frame), dtype=float)
        lower = np.maximum(0.0, prediction - self.interval_radius_mpa)
        upper = prediction + self.interval_radius_mpa
        warnings = self.domain_warnings(frame)
        domain_status = self.in_domain(frame)
        return pd.DataFrame(
            {
                "predicted_strength_mpa": prediction,
                "interval_lower_mpa": lower,
                "interval_upper_mpa": upper,
                "predicted_strength_psi": prediction / 0.006894757293168361,
                "in_training_domain": domain_status.to_numpy(dtype=bool),
                "warnings": ["; ".join(values) for values in warnings],
            },
            index=frame.index,
        )

    def save(self, path: str | Path) -> None:
        destination = Path(path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, destination, compress=3)

    @classmethod
    def load(cls, path: str | Path) -> ConcreteStrengthPredictor:
        source = Path(path)
        completion_path = source.parent / "RUN_COMPLETE.json"
        if completion_path.exists():
            completion = json.loads(completion_path.read_text(encoding="utf-8"))
            expected = completion.get("artifacts", {}).get(source.name)
            if expected is None:
                raise ValueError(f"Completion manifest does not include {source.name}.")
            digest = hashlib.sha256()
            with source.open("rb") as artifact:
                for block in iter(lambda: artifact.read(1024 * 1024), b""):
                    digest.update(block)
            if digest.hexdigest() != expected:
                raise ValueError(f"Artifact checksum mismatch for {source.name}.")
        loaded = joblib.load(source)
        if not isinstance(loaded, cls):
            raise TypeError(f"Artifact is not a {cls.__name__} bundle.")
        recorded = loaded.metadata.get("versions", {})
        current_sklearn = importlib.metadata.version("scikit-learn")
        if recorded.get("scikit-learn") not in {None, current_sklearn}:
            warnings.warn(
                "The model was trained with scikit-learn "
                f"{recorded['scikit-learn']} but is loading under {current_sklearn}; "
                "use requirements-verified.txt for a supported environment.",
                RuntimeWarning,
                stacklevel=2,
            )
        recorded_python = str(recorded.get("python", ""))
        current_python = platform.python_version()
        if recorded_python and recorded_python.split(".")[:2] != current_python.split(".")[:2]:
            warnings.warn(
                f"The model was trained with Python {recorded_python} but is loading under "
                f"{current_python}; serialized model compatibility is not guaranteed.",
                RuntimeWarning,
                stacklevel=2,
            )
        return loaded


def training_domain_bounds(frame: pd.DataFrame) -> dict[str, dict[str, float]]:
    engineered = engineer_features(frame.loc[:, FEATURE_COLUMNS])
    return {
        feature: {
            "min": float(engineered[feature].min()),
            "max": float(engineered[feature].max()),
        }
        for feature in MODEL_FEATURES
    }
