from __future__ import annotations

import pandas as pd
from sklearn.dummy import DummyRegressor

from concrete_strength.predictor import ConcreteStrengthPredictor, training_domain_bounds


def _frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "cement": 300.0,
                "blast_furnace_slag": 50.0,
                "fly_ash": 25.0,
                "water": 180.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 1_000.0,
                "fine_aggregate": 750.0,
                "age": 28.0,
            },
            {
                "cement": 350.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 170.0,
                "superplasticizer": 8.0,
                "coarse_aggregate": 950.0,
                "fine_aggregate": 800.0,
                "age": 56.0,
            },
        ]
    )


def test_prediction_bundle_round_trip_and_domain_warning(tmp_path) -> None:
    frame = _frame()
    model = DummyRegressor(strategy="mean").fit(frame, [30.0, 50.0])
    predictor = ConcreteStrengthPredictor(
        model=model,
        model_name="dummy",
        interval_radius_mpa=5.0,
        interval_coverage=0.9,
        domain_bounds=training_domain_bounds(frame),
    )
    path = tmp_path / "model.joblib"
    predictor.save(path)
    loaded = ConcreteStrengthPredictor.load(path)
    result = loaded.predict({**frame.iloc[0].to_dict(), "age": 365.0}).iloc[0]
    assert result.predicted_strength_mpa == 40.0
    assert not result.in_training_domain
    assert "age=" in result.warnings

