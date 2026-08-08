from __future__ import annotations

from pathlib import Path

import pandas as pd
from sklearn.dummy import DummyRegressor
from streamlit.testing.v1 import AppTest

from concrete_strength.predictor import ConcreteStrengthPredictor, training_domain_bounds


def test_streamlit_app_submits_prediction(tmp_path, monkeypatch) -> None:
    frame = pd.DataFrame(
        [
            {
                "cement": 200.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 160.0,
                "superplasticizer": 0.0,
                "coarse_aggregate": 900.0,
                "fine_aggregate": 650.0,
                "age": 1.0,
            },
            {
                "cement": 500.0,
                "blast_furnace_slag": 200.0,
                "fly_ash": 150.0,
                "water": 220.0,
                "superplasticizer": 20.0,
                "coarse_aggregate": 1_100.0,
                "fine_aggregate": 900.0,
                "age": 365.0,
            },
        ]
    )
    model = DummyRegressor(strategy="mean").fit(frame, [30.0, 50.0])
    bundle = ConcreteStrengthPredictor(
        model=model,
        model_name="app-smoke",
        interval_radius_mpa=5.0,
        interval_coverage=0.9,
        domain_bounds=training_domain_bounds(frame),
        metadata={"training_mode": "full"},
    )
    model_path = tmp_path / "model.joblib"
    bundle.save(model_path)
    monkeypatch.setenv("CONCRETE_MODEL_PATH", str(model_path))

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(app_path, default_timeout=10).run()
    assert not app.exception
    assert app.toggle[0].label == "Dark mode"
    assert app.toggle[0].value is True
    app.button[0].click().run(timeout=10)
    assert not app.exception
    assert app.metric[0].label == "Predicted strength"
    assert app.metric[0].value == "40.0 MPa"

    app.toggle[0].set_value(False).run(timeout=10)
    assert not app.exception
    assert app.metric[0].value == "40.0 MPa"
