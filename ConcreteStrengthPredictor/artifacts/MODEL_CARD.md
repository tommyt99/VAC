# Model card

## Intended use

Estimate laboratory concrete compressive strength from seven mixture quantities and curing age.
The output is a screening estimate—not a substitute for trial batches, cylinder/cube testing,
structural design checks, specifications, or professional engineering judgment.

## Selected model

`age_monotonic_gradient_boosting` was selected using only five-fold recipe-grouped cross-validation on
the training partition. Its grouped-CV MAE was 3.73 ±
0.28 MPa. The one-standard-error rule preferred the age-monotonic candidate
when its mean MAE was within one estimated standard error of the lowest-MAE model. This is a
parsimony/physics heuristic, not a statistical significance test. The neural network and every
baseline used the same folds.

## Data and leakage controls

- UCI Concrete Compressive Strength canonical contents verified. DOI 10.24432/C5PK67, CC BY 4.0 when verified.
- 1030 source rows became 996 unique recipe-age rows.
- 25 beyond-first exact duplicates were removed; identical
  inputs with differing measurements were averaged and their replicate statistics retained.
- All seven ingredient quantities define a recipe group; recipes never cross train, calibration,
  and fixed development-holdout boundaries.
- The legacy workbook's strength-in-ksi formula and summary cells are explicitly excluded.

## Fixed development-holdout performance

- MAE: **3.97 MPa**
- RMSE: **6.21 MPa**
- R²: **0.862**
- Mean signed error (prediction − observed): **-0.79 MPa**

These are single-split development estimates. The machine-readable report includes 95%
recipe-bootstrap intervals. The partition was not used for estimator fitting, model selection, or
interval calibration, but the overall methodology was refined during this project audit after
earlier holdout results had been inspected. Treat this as a transparent development benchmark,
not a preregistered confirmatory test; new prospective data are required for final confirmation.

## Prediction interval

The nominal 90% recipe-grouped split-conformal interval uses
each calibration recipe's maximum absolute residual and has a constant radius of
11.02 MPa. Development-holdout point coverage was
92.1%; all observed ages were simultaneously covered for
84.6% of test recipes. Mean point-interval width was
21.96 MPa. Finite-sample validity relies on exchangeable recipe groups
and does not guarantee the realized coverage of one test split.

## External evaluation

- **global_scm_v2_28_day_no_silica_fume:** 643 evaluated rows; MAE 10.48 MPa, RMSE 13.60 MPa, R² 0.321. Source-macro MAE 10.77 MPa; source-bootstrap 95% MAE interval 8.93–12.12 MPa. 297 rows are within every training marginal range. Excluded 122 rows from a known UCI source and 0 other exact UCI-input overlaps. Source-file checksum verified: yes.
- **boxcrete_standard_temperature_concrete:** 381 evaluated rows; MAE 10.20 MPa, RMSE 13.77 MPa, R² 0.483. Source-macro MAE 10.45 MPa; source-bootstrap 95% MAE interval 8.70–11.95 MPa. 143 rows are within every training marginal range. Excluded 0 rows from a known UCI source and 0 other exact UCI-input overlaps. Source-file checksum verified: yes.

External data were not used for fitting or model selection. Differences in laboratories,
materials, specimen geometry, curing, and testing standards can dominate prediction error.

## Important limitations

- The UCI benchmark is small (only 428 independent recipes) and historical.
- The model has no cement chemistry, admixture identity, curing temperature/humidity, air content,
  density, specimen geometry, batch, or test-standard fields.
- Marginal range checks are only a coarse out-of-distribution warning; being in range does not
  prove that a combination is familiar.
- Prediction intervals inherit exchangeability assumptions and may under-cover shifted domains.
- Do not extrapolate to UHPC, alkali-activated binders, unusual aggregates, or field cores without
  domain-specific validation.
