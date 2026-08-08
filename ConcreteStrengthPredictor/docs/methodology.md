# Methodology

## Prediction contract

The model predicts laboratory compressive strength in MPa from cement, blast-furnace slag, fly
ash, water, superplasticizer, coarse aggregate, fine aggregate (all kg/m³), and curing age (days).
It does not predict field-core strength or account for curing regime, specimen geometry, cement
chemistry, air content, or test standard.

## Cleaning and independence

Exact records are counted once. Repeated observations with identical ingredients and age are
reduced to a mean target while retaining replicate count and standard deviation. A stable hash of
the seven ingredient quantities defines an independent recipe; age is deliberately excluded.

The fixed split is 70% recipe groups for training, 15% for conformal calibration, and 15% for a
fixed development holdout. Five-fold grouped cross-validation inside the training partition
applies a
one-standard-error rule to MAE: when the age-monotonic model's mean MAE is within one estimated
standard error of the lowest mean-MAE candidate, the constrained model is preferred. This is a
physics/parsimony heuristic, not a statistical significance test. Neither calibration nor holdout
rows influence model choice.

## Candidate models

- Ridge regression: transparent linear baseline.
- Scaled RBF SVR: repairs the original SVR's missing scaling and assignment errors.
- Extra Trees: nonlinear tabular ensemble.
- Histogram gradient boosting with non-decreasing age and log-age constraints.
- Regularized two-hidden-layer MLP: scaled inputs and target, deterministic initialization, and no
  random row-level early-stopping split.

All models receive deterministic ratios including water/binder, SCM fraction, aggregate/binder,
fine-aggregate fraction, superplasticizer/binder, total binder, and log-age. Learned scaling is
fit only inside the training fold.

## Metrics and uncertainty

MAE is the primary selection metric because it stays in MPa and is less dominated by a few large
errors than RMSE. RMSE, R², and mean signed error are secondary. Development-holdout 95%
uncertainty bands are obtained by resampling whole recipe groups. A separate calibration partition produces a
finite-sample 90% recipe-grouped split-conformal interval. Its score is the maximum absolute
residual within each calibration recipe, so the target is simultaneous coverage across the ages
observed for a newly sampled recipe—not row-level exchangeability.

External robustness evaluation is kept separate from model fitting and selection. Global SCM v2 supplies 28-day, silica-fume-free rows
that fit the shared schema; BOxCrete supplies measured standard-temperature concrete rows, with psi
converted to MPa. The Global SCM study that republishes the UCI/Yeh source is excluded in full, and
any remaining exact UCI input overlaps are removed. Full-set and marginally in-training-range
results are reported separately.

The methodology was strengthened during the project audit after earlier results from the fixed
holdout and external datasets had been inspected. Accordingly, these are development and
robustness estimates, not preregistered confirmatory results. A newly collected or prospectively
reserved dataset is still required for a final performance claim.
