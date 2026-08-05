# Agent instructions

These instructions apply in Cursor and Codex.

## Agency workflow

For multi-file, ambiguous, high-risk, or judgment-heavy work, follow
[`docs/agent-agency-sop.md`](docs/agent-agency-sop.md).

Use the smallest safe workflow:

1. Make narrow, reversible changes with obvious tests directly.
2. For nontrivial work, separate planner, worker, and independent judge roles.
3. Give each worker one bounded outcome, acceptance criteria, and verification.
4. Parallelize only independent tasks using isolated branches or worktrees.
5. Stop after two evidence-driven failed correction attempts and escalate.
6. Never weaken tests, assertions, published tolerances, or security controls merely
   to obtain a pass.
7. Do not self-merge, deploy, rewrite shared history, expose secrets, or perform
   destructive operations without explicit approval.

## Plan model recommendations

When writing or updating a plan with multiple tasks:

1. Tag every task with a recommended model using `[model: …]` in the task title, or a short "Model" line under it.
2. Prefer cheaper/faster models for work with strong mechanical verification (seeded tests, published constants, lint/format, scaffolding deletes).
3. Prefer stronger models for judgment-heavy work (statistical estimators, subtle numerical physics, large refactors with weak tests, architecture tradeoffs).
4. For each recommendation, give one sentence of why (verification strength, not vibes).
5. If a plan naturally splits into batches that need different models, group tasks into those batches and note the handoff point.
6. Do not claim the tool will auto-switch models. Recommendations are for the human (or parent agent) to apply.
