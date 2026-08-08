from __future__ import annotations

from pathlib import Path

from concrete_strength.cli import resolved_training_output


def test_relative_quick_default_is_routed_to_smoke_directory(tmp_path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    assert resolved_training_output(Path("artifacts"), quick=True) == Path("artifacts/smoke")
    assert resolved_training_output(Path("custom"), quick=True) == Path("custom")
    assert resolved_training_output(Path("artifacts"), quick=False) == Path("artifacts")

