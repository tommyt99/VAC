# Audit of the original SURF notebooks

The original OneDrive folder contains the standard 1,030-row UCI Concrete Compressive Strength
benchmark plus five notebooks. The artifacts are useful as a record of the research progression,
but their saved metrics are not comparable to a leakage-safe evaluation.

## Dataset findings

- The first nine workbook columns exactly match the official UCI data.
- Column J is a formula-derived conversion of the MPa target to ksi. It must never be used as a
  predictor. Columns K–M contain four summary formulas and labels and are also excluded.
- There are only 428 distinct seven-ingredient recipes. A random row split can place the same
  mixture recipe—often at another curing age—in both training and testing.
- The workbook includes 25 beyond-first exact duplicate records and 34 beyond-first duplicate
  input-age rows. Nine identical input-age groups have conflicting measured strengths.

## Notebook findings

| Artifact | Saved result | Why it is not a valid benchmark |
|---|---:|---|
| One-hidden-layer NN | Test MAE 6.25 MPa; R² 0.770 | Unscaled inputs, unseeded row split, recipe leakage, no restored best epoch |
| Deep neural network | No completed run | Import failed; later cells were never executed; disabled scaling would leak test statistics |
| OLS | R² 0.931 | Fitted/evaluated on all rows without an intercept; this is an uncentered in-sample statistic |
| SVR Method 1 | Test R² 0.006 | Unscaled default SVR; the intended tuned constructor was never assigned |
| SVR Method 2 | Negative R² | `X` and `y` were shuffled independently, destroying feature-target pairing |

## What this replacement changes

1. Select only the canonical eight inputs and MPa target by name.
2. Remove exact duplication and average conflicting repeated measurements at identical inputs.
3. Hash the seven ingredient quantities into a recipe ID, excluding age.
4. Keep recipe IDs disjoint across training, calibration, and a fixed development holdout.
5. Fit scaling inside each fold, set seeds, compare all candidates on the same grouped folds, and
   apply the documented one-standard-error MAE rule with an age-monotonic preference.
6. Calibrate a held-out recipe-grouped split-conformal interval and report recipe-bootstrap
   uncertainty.
7. Audit modern separately sourced datasets without using them for fitting or model selection.
