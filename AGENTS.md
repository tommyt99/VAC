# Agent instructions

These instructions apply in Cursor and Codex.

## Plan model recommendations

When writing or updating a plan with multiple tasks:

1. Tag every task with a recommended model using `[model: …]` in the task title, or a short "Model" line under it.
2. Prefer cheaper/faster models for work with strong mechanical verification (seeded tests, published constants, lint/format, scaffolding deletes).
3. Prefer stronger models for judgment-heavy work (statistical estimators, subtle numerical physics, large refactors with weak tests, architecture tradeoffs).
4. For each recommendation, give one sentence of why (verification strength, not vibes).
5. If a plan naturally splits into batches that need different models, group tasks into those batches and note the handoff point.
6. Do not claim the tool will auto-switch models. Recommendations are for the human (or parent agent) to apply.
