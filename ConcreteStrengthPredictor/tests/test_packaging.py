from __future__ import annotations

import importlib.resources
import json
from pathlib import Path


def test_packaged_source_manifest_matches_documented_copy() -> None:
    packaged = json.loads(
        importlib.resources.files("concrete_strength").joinpath("sources.json").read_text()
    )
    documented = json.loads(
        (Path(__file__).resolve().parents[1] / "data" / "sources.json").read_text()
    )
    assert packaged == documented

