from __future__ import annotations

import json

import pandas as pd
from sklearn.dummy import DummyRegressor

import concrete_strength.training as training
from concrete_strength.schema import TARGET_COLUMN


def test_end_to_end_training_writes_loadable_artifacts(tmp_path, monkeypatch) -> None:
    rows = []
    for recipe in range(100):
        for age in (7.0, 28.0):
            rows.append(
                {
                    "cement": 220.0 + recipe,
                    "blast_furnace_slag": float(recipe % 4) * 10.0,
                    "fly_ash": float(recipe % 3) * 8.0,
                    "water": 165.0 + recipe % 5,
                    "superplasticizer": 4.0,
                    "coarse_aggregate": 950.0,
                    "fine_aggregate": 750.0,
                    "age": age,
                    TARGET_COLUMN: 15.0 + recipe * 0.2 + age * 0.5,
                }
            )
    data_path = tmp_path / "concrete.csv"
    pd.DataFrame(rows).to_csv(data_path, index=False)
    monkeypatch.setattr(
        training,
        "model_catalog",
        lambda **_: {"age_monotonic_gradient_boosting": DummyRegressor(strategy="mean")},
    )

    output = tmp_path / "artifacts"
    report = training.train_project(data_path, output, quick=True)

    assert report["selected_model"] == "age_monotonic_gradient_boosting"
    assert report["training_mode"] == "smoke"
    assert report["partitions"]["test"]["recipes"] > 0
    assert (output / "model.joblib").is_file()
    assert (output / "split_manifest.json").is_file()
    assert (output / "RUN_COMPLETE.json").is_file()
    assert not (output / "locked_test_predictions.csv").exists()
    saved = json.loads((output / "training_report.json").read_text())
    training_source = saved["data_provenance"]["input_files"]["training_data"]
    assert training_source["file_sha256"]
    assert training_source["verified_as_uci_concrete"] is False
