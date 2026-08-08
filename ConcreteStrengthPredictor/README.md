# Concrete Strength Predictor

A reproducible replacement for the original SURF concrete-strength notebooks. It predicts
laboratory compressive strength from a seven-component mixture and curing age, while preventing
the target leakage and recipe overlap found in the legacy workflow.

## Result

The selected age-monotonic histogram gradient booster achieved the following on a fixed holdout
containing entirely unseen recipes:

| Evaluation | MAE (MPa) | RMSE (MPa) | R² |
|---|---:|---:|---:|
| Selected model, 5-fold grouped CV mean | 3.73 | 5.18 | 0.895 |
| Fixed UCI recipe development holdout | 3.97 | 6.21 | 0.862 |
| Global SCM v2 robustness set | 10.48 | 13.60 | 0.321 |
| BOxCrete robustness set | 10.20 | 13.77 | 0.483 |

The original one-layer neural notebook reported 6.25 MPa MAE on an easier random row split. That
number is not a formal baseline because its split, preprocessing, and duplicate handling differ.
The replacement's neural candidate reached 4.10 MPa mean grouped-CV MAE after tuning, while the
selected monotonic tabular model reached 3.73 MPa.

The regularized MLP remains in the benchmark, but it did not win. On small tabular data, choosing
the grouped-CV model is more defensible than assuming that a deeper network is automatically
better. The monotonic model was within one standard error of Extra Trees' lowest mean MAE and was
preferred so the app cannot predict strength loss solely from increasing age. See
[the model card](artifacts/MODEL_CARD.md) for uncertainty, external-domain degradation, and use
limitations.

These are transparent development results, not preregistered confirmatory claims: the methodology
was refined during the audit after earlier holdout results had been seen. A newly collected or
prospectively reserved dataset is still required for final confirmation.

## What was fixed

- Excludes the workbook's `strength (ksi)` column, which is a direct formula from the MPa target.
- Collapses exact duplication and averages conflicting measurements at identical inputs.
- Defines a recipe using all seven ingredient quantities, excluding curing age.
- Keeps recipes disjoint across training, conformal calibration, and the fixed development holdout.
- Fits all learned preprocessing inside each fold and sets deterministic seeds.
- Compares ridge, scaled RBF SVR, Extra Trees, age-monotonic gradient boosting, and a regularized
  two-layer MLP on identical grouped folds.
- Reports MAE, RMSE, R², signed bias, whole-recipe bootstrap intervals, age monotonicity, and a
  calibrated prediction interval.
- Flags inputs outside both raw and engineered training ranges.
- Audits separately sourced modern data without using it for fitting or model selection; removes
  the Global SCM study that republishes UCI before scoring.

The [legacy audit](docs/legacy-audit.md) explains why the old notebook scores cannot be used as
validated benchmarks. The [methodology](docs/methodology.md) documents the statistical protocol.

## Inputs and output

Inputs are cement, blast-furnace slag, fly ash, water, superplasticizer, coarse aggregate, and fine
aggregate in kg/m³, plus curing age in days. Output is predicted compressive strength in MPa and
psi, a nominal 90% recipe-grouped split-conformal interval, and domain warnings.

This is a screening tool. It does **not** replace mixture qualification, trial batches, cylinder or
cube testing, acceptance criteria, structural design, specifications, or professional engineering
judgment.

## Setup

Python 3.11 or newer is required.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -c requirements-verified.txt -e ".[app,dev]"
```

The constraints file reproduces the versions used for the checked model artifact. The broader
ranges in `pyproject.toml` are for future compatibility testing; serialized scikit-learn artifacts
warn when loaded under a different scikit-learn or Python version.

Fetch the official UCI workbook (DOI `10.24432/C5PK67`) with checksum verification:

```bash
concrete-strength fetch-data
```

Or point directly at the original `Concrete_Data.xlsx` workbook.

## Train and verify

```bash
concrete-strength audit-data --data /path/to/Concrete_Data.xlsx
concrete-strength train --data /path/to/Concrete_Data.xlsx --output artifacts
pytest -q
ruff check .
```

Optional external robustness evaluation:

```bash
concrete-strength train \
  --data /path/to/Concrete_Data.xlsx \
  --global-scm /path/to/global_scm_v2.xlsx \
  --boxcrete /path/to/boxcrete.csv \
  --output artifacts
```

Training writes a serialized bundle, fixed split manifest, fold metrics, development-holdout
predictions, machine-readable report, and generated model card to `artifacts/`.

`--quick` is only a pipeline smoke test. When the default output is used, quick artifacts are
written to `artifacts/smoke/` so they cannot silently overwrite the full model.

## Predict from the command line

```bash
concrete-strength predict \
  --cement 300 \
  --blast-furnace-slag 80 \
  --fly-ash 40 \
  --water 175 \
  --superplasticizer 6 \
  --coarse-aggregate 980 \
  --fine-aggregate 760 \
  --age 28
```

## Run the local interface

```bash
streamlit run app.py
```

The interface shows MPa/psi estimates, the calibrated interval, training-domain warnings, and a
predicted strength-development curve.

## Data provenance

- [UCI Concrete Compressive Strength](https://archive.ics.uci.edu/dataset/165/concrete%2Bcompressive%2Bstrength), CC BY 4.0.
- [Global SCM database v2](https://data.mendeley.com/datasets/npwgdyy4np/2), CC BY 4.0.
- [BOxCrete / SustainableConcrete](https://github.com/facebookresearch/SustainableConcrete), MIT repository license.

Exact data URLs, commits, licenses, and SHA-256 values are recorded in `data/sources.json`;
dependency versions used for each run are recorded in the training report.
