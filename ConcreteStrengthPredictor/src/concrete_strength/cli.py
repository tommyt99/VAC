"""Command-line interface."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from concrete_strength.data import fetch_uci_data, load_concrete_data, prepare_data
from concrete_strength.predictor import ConcreteStrengthPredictor
from concrete_strength.schema import FEATURE_COLUMNS
from concrete_strength.training import train_project


def resolved_training_output(output: Path, *, quick: bool, cwd: Path | None = None) -> Path:
    working_directory = Path.cwd() if cwd is None else cwd
    default_output = working_directory / "artifacts"
    if quick and output.resolve() == default_output.resolve():
        return output / "smoke"
    return output


def build_parser() -> argparse.ArgumentParser:
    working_directory = Path.cwd()
    parser = argparse.ArgumentParser(description="Concrete compressive-strength modeling tools")
    commands = parser.add_subparsers(dest="command", required=True)

    fetch = commands.add_parser("fetch-data", help="Download and checksum the UCI benchmark")
    fetch.add_argument("--destination", type=Path, default=working_directory / "data" / "raw")

    audit = commands.add_parser("audit-data", help="Audit and clean a UCI-format workbook/CSV")
    audit.add_argument("--data", type=Path, required=True)

    train = commands.add_parser(
        "train", help="Run grouped model selection and fixed holdout evaluation"
    )
    train.add_argument("--data", type=Path, required=True)
    train.add_argument("--output", type=Path, default=working_directory / "artifacts")
    train.add_argument("--global-scm", type=Path)
    train.add_argument("--boxcrete", type=Path)
    train.add_argument("--seed", type=int, default=42)
    train.add_argument(
        "--quick",
        action="store_true",
        help="Smoke test with smaller estimators; not for deployment",
    )

    predict = commands.add_parser("predict", help="Predict one concrete mixture")
    predict.add_argument(
        "--model", type=Path, default=working_directory / "artifacts" / "model.joblib"
    )
    for feature in FEATURE_COLUMNS:
        predict.add_argument(f"--{feature.replace('_', '-')}", type=float, required=True)
    return parser


def main(argv: list[str] | None = None) -> None:
    arguments = build_parser().parse_args(argv)
    if arguments.command == "fetch-data":
        print(fetch_uci_data(arguments.destination))
        return
    if arguments.command == "audit-data":
        audit = prepare_data(load_concrete_data(arguments.data)).audit
        print(json.dumps(audit, indent=2))
        return
    if arguments.command == "train":
        output = resolved_training_output(arguments.output, quick=arguments.quick)
        report = train_project(
            arguments.data,
            output,
            global_scm_path=arguments.global_scm,
            boxcrete_path=arguments.boxcrete,
            random_state=arguments.seed,
            quick=arguments.quick,
        )
        print(json.dumps(report, indent=2))
        return
    if arguments.command == "predict":
        model = ConcreteStrengthPredictor.load(arguments.model)
        inputs = {feature: getattr(arguments, feature) for feature in FEATURE_COLUMNS}
        print(model.predict(inputs).to_json(orient="records", indent=2))


if __name__ == "__main__":
    main()
