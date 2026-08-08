from __future__ import annotations

import pandas as pd

from concrete_strength.data import load_concrete_data, prepare_data, split_by_recipe
from concrete_strength.schema import FEATURE_COLUMNS, TARGET_COLUMN


def _synthetic_rows(recipe_count: int = 30) -> pd.DataFrame:
    rows = []
    for recipe in range(recipe_count):
        for age in (7.0, 28.0):
            rows.append(
                {
                    "cement": 200.0 + recipe,
                    "blast_furnace_slag": float(recipe % 4) * 10,
                    "fly_ash": float(recipe % 3) * 8,
                    "water": 170.0 + recipe % 5,
                    "superplasticizer": 4.0,
                    "coarse_aggregate": 950.0,
                    "fine_aggregate": 750.0,
                    "age": age,
                    TARGET_COLUMN: 15.0 + recipe * 0.2 + age * 0.5,
                }
            )
    return pd.DataFrame(rows)


def test_loader_excludes_target_derived_ksi_column(tmp_path) -> None:
    frame = _synthetic_rows(2)
    legacy = frame.rename(
        columns={
            "cement": "Cement (component 1)(kg in a m^3 mixture)",
            "blast_furnace_slag": "Blast Furnace Slag (component 2)(kg in a m^3 mixture)",
            "fly_ash": "Fly Ash (component 3)(kg in a m^3 mixture)",
            "water": "Water (component 4)(kg in a m^3 mixture)",
            "superplasticizer": "Superplasticizer (component 5)(kg in a m^3 mixture)",
            "coarse_aggregate": "Coarse Aggregate (component 6)(kg in a m^3 mixture)",
            "fine_aggregate": "Fine Aggregate (component 7)(kg in a m^3 mixture)",
            "age": "Age (day)",
            TARGET_COLUMN: "Concrete compressive strength(MPa, megapascals)",
        }
    )
    legacy["Concrete compressive strength(ksi)"] = (
        legacy["Concrete compressive strength(MPa, megapascals)"] * 0.145038
    )
    path = tmp_path / "legacy.xlsx"
    legacy.to_excel(path, index=False)
    loaded = load_concrete_data(path)
    assert list(loaded) == [*FEATURE_COLUMNS, TARGET_COLUMN]
    assert len(loaded) == 4


def test_prepare_data_deweights_duplicates_and_tracks_conflicts() -> None:
    raw = _synthetic_rows(2)
    exact_copy = raw.iloc[[0]]
    conflict = raw.iloc[[0]].assign(compressive_strength=99.0)
    prepared = prepare_data(pd.concat([raw, exact_copy, conflict], ignore_index=True))
    assert prepared.audit["exact_duplicate_rows_removed"] == 1
    assert prepared.audit["conflicting_input_age_groups"] == 1
    assert len(prepared.frame) == len(raw)
    first = prepared.frame.loc[
        (prepared.frame["cement"] == raw.iloc[0]["cement"])
        & (prepared.frame["age"] == raw.iloc[0]["age"])
    ].iloc[0]
    assert first["replicate_count"] == 2


def test_split_is_deterministic_and_recipe_disjoint() -> None:
    prepared = prepare_data(_synthetic_rows())
    first = split_by_recipe(prepared.frame, random_state=7)
    second = split_by_recipe(prepared.frame, random_state=7)
    assert first.test["recipe_id"].tolist() == second.test["recipe_id"].tolist()
    train = set(first.train["recipe_id"])
    calibration = set(first.calibration["recipe_id"])
    test = set(first.test["recipe_id"])
    assert not train & calibration
    assert not train & test
    assert not calibration & test

