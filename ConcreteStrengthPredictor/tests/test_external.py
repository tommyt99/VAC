from __future__ import annotations

import pandas as pd
from sklearn.dummy import DummyRegressor

from concrete_strength.external import PSI_TO_MPA, load_boxcrete, load_global_scm
from concrete_strength.predictor import ConcreteStrengthPredictor, training_domain_bounds
from concrete_strength.schema import FEATURE_COLUMNS
from concrete_strength.training import _evaluate_external


def test_global_scm_filters_silica_fume_and_forward_fills_study(tmp_path) -> None:
    frame = pd.DataFrame(
        {
            "Mix ID": ["A1", "A2", "B1"],
            " Cement(kg/m3)": [300.0, 280.0, 320.0],
            " Water(kg/m3)": [150.0, 160.0, 155.0],
            "Coarse aggregate(kg/m3)": [1_000.0, 990.0, 980.0],
            "Fine aggregate(kg/m3)": [700.0, 710.0, 720.0],
            " FA (kg/m3)": [100.0, 120.0, 50.0],
            "SF (kg/m3)": [0.0, 0.0, 10.0],
            "GGBFS (kg/m3)": [0.0, 0.0, 0.0],
            "SP (kg/m3)": [5.0, 5.0, 5.0],
            "Cylinder compressive strength (MPa)": [40.0, 42.0, 60.0],
            "Reference": ["study-a", None, "study-b"],
        }
    )
    path = tmp_path / "global.xlsx"
    frame.to_excel(path, index=False)
    loaded = load_global_scm(path)
    assert len(loaded) == 2
    assert loaded["source_id"].tolist() == ["study-a", "study-a"]
    assert loaded["age"].eq(28.0).all()


def test_boxcrete_filters_mortar_and_converts_psi(tmp_path) -> None:
    frame = pd.DataFrame(
        {
            "Mix Name": ["concrete", "mortar"],
            "Cement (kg/m3)": [300.0, 300.0],
            "Fly Ash (kg/m3)": [50.0, 50.0],
            "Slag (kg/m3)": [0.0, 0.0],
            "Water (kg/m3)": [160.0, 160.0],
            "HRWR (kg/m3)": [5.0, 5.0],
            "Fine Aggregate (kg/m3)": [700.0, 1_700.0],
            "Coarse Aggregates (kg/m3)": [1_000.0, 0.0],
            "Temp (C)": [22.0, 22.0],
            "Time": [28.0, 28.0],
            "Strength (Mean)": [5_000.0, 6_000.0],
        }
    )
    path = tmp_path / "boxcrete.csv"
    frame.to_csv(path, index=False)
    loaded = load_boxcrete(path)
    assert len(loaded) == 1
    assert loaded.iloc[0]["compressive_strength"] == 5_000.0 * PSI_TO_MPA


def test_external_evaluation_excludes_known_source_and_exact_uci_inputs() -> None:
    uci = pd.DataFrame(
        [
            {
                "cement": 300.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 180.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 1_000.0,
                "fine_aggregate": 750.0,
                "age": 28.0,
                "compressive_strength": 40.0,
            }
        ]
    )
    model = DummyRegressor(strategy="constant", constant=40.0).fit(
        uci[FEATURE_COLUMNS], [40.0]
    )
    predictor = ConcreteStrengthPredictor(
        model=model,
        model_name="dummy",
        interval_radius_mpa=5.0,
        interval_coverage=0.9,
        domain_bounds=training_domain_bounds(uci),
    )
    known_source = uci.assign(source_id="known-uci-study")
    exact_overlap = uci.assign(source_id="another-study")
    clean = uci.assign(
        cement=301.0, compressive_strength=41.0, source_id="independent-study"
    )
    clean_second = uci.assign(
        cement=302.0, compressive_strength=42.0, source_id="second-independent-study"
    )
    external = pd.concat(
        [known_source, exact_overlap, clean, clean_second], ignore_index=True
    )

    metrics, output = _evaluate_external(
        predictor,
        external,
        uci,
        excluded_source_tokens=("known-uci",),
    )
    assert metrics["known_uci_source_rows_excluded"] == 1
    assert metrics["other_exact_uci_input_rows_excluded"] == 1
    assert metrics["rows"] == 2
    assert output["source_id"].tolist() == [
        "independent-study",
        "second-independent-study",
    ]
