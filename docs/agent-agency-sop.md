# Agent Agency SOP

## Purpose

Use this procedure for nontrivial software work that benefits from separate planning,
implementation, and review. The goal is faster delivery with explicit evidence, not
more process.

For a one-file, low-risk change with an obvious test, use one agent and skip directly
to implementation and verification.

## Core principles

1. Separate planning, implementation, and judgment.
2. Give each worker one bounded outcome and a clear definition of done.
3. Route model cost according to verification strength, not task size alone.
4. Treat tests, published constants, type checks, and reproducible builds as evidence.
5. Never weaken a test, tolerance, assertion, or quality gate merely to obtain a pass.
6. Keep a human approval gate for ambiguous requirements, destructive operations,
   secrets, production changes, and final merge.
7. Prefer a few well-defined stages over a large swarm of loosely coordinated agents.

## Roles

### Planner

The planner investigates the repository, resolves architecture decisions, decomposes
the goal, and defines acceptance criteria. It does not implement code.

Use a strong reasoning model when the work includes architecture, numerical methods,
uncertain requirements, or weak verification.

Planner output:

- Goal and non-goals
- Relevant files and constraints
- Ordered tasks with dependencies
- Acceptance criteria for every task
- Verification commands and expected signals
- Risk classification and recommended model for every task
- Explicit handoff points and stop conditions

### Worker

A worker implements one task or one tightly coupled batch. It does not redesign the
overall plan unless new evidence makes the plan invalid.

Use a fast, economical model when mechanical checks can catch mistakes. Escalate to a
stronger model for subtle algorithms, broad refactors, or behavior that can look
plausible while being wrong.

Worker output:

- Files changed
- Decisions or assumptions made
- Verification performed and results
- Remaining risks or blockers
- A reviewable diff or pull request

### Judge

The judge reviews independently against the plan and acceptance criteria. It should
begin from the goal, plan, and diff rather than the worker's claim that the work is
correct. It does not edit during its first review pass.

Judge output:

- Pass, revise, or escalate
- Actionable findings with file and line references
- Missing acceptance coverage
- Evidence that was not independently reproduced
- Whether another implementation cycle is justified

### Human owner

The human approves material product or architecture choices, grants sensitive access,
accepts explicit risk, and performs the final merge unless a narrowly scoped
auto-merge policy was approved in advance.

## Model routing

Classify each task by the strength of its verification signal.

### Tier 1: strong mechanical verification

Examples: formatting, generated files, scaffolding removal, dependency cleanup,
seeded tests, published reference constants, compiler errors, and exact equivalence
tests.

Recommended worker: a fast or economical coding model, such as Composer or Grok.
Reason: deterministic checks sharply constrain the answer and catch most mistakes.

### Tier 2: mixed verification

Examples: feature work with good unit tests, localized refactors, API integrations,
and UI behavior with reproducible browser tests.

Recommended worker: a capable general coding model; use a strong judge.
Reason: tests cover the main path but may miss integration and design errors.

### Tier 3: weak or judgment-heavy verification

Examples: architecture, statistical estimators, subtle numerical physics, security
boundaries, concurrency, migrations, and large refactors with intermittent failures.

Recommended planner and worker: a frontier reasoning model, such as GPT-5.6 or Opus.
Use an independent strong judge.
Reason: incorrect work can remain plausible and pass superficial checks.

Model names change over time. Preserve the tier and rationale when substituting newer
models. Do not assume one automation can switch models during a run; use separate
automations or explicitly handed-off runs when tiers differ.

## Workflow

### Stage 0: Triage

Choose the smallest process that safely fits the task.

- Direct path: one agent for a narrow, reversible change with an obvious test.
- Planned path: planner, worker, and judge for multi-file or ambiguous work.
- High-assurance path: strong planner, isolated workers, independent judge, and human
  approval for Tier 3, security-sensitive, destructive, or production work.

Exit criterion: the path and risk tier are explicit.

### Stage 1: Intake contract

Normalize the request before implementation:

- Problem or desired outcome
- Target repository and branch
- Constraints and non-goals
- Definition of done
- Required tools, services, and permissions
- Deliverable: report, patch, branch, or pull request

Ask only questions whose answers materially change the implementation. Record
assumptions when safe defaults exist.

Exit criterion: an agent can state what success means without inventing requirements.

### Stage 2: Investigation

Inspect the current implementation, tests, repository instructions, dependency graph,
and relevant runtime evidence. Verify uncertain claims before planning around them.

Do not modify files during a planning-only investigation.

Exit criterion: the plan cites concrete repository evidence and identifies unknowns.

### Stage 3: Plan and batch

Split work into independently verifiable tasks. Every task must include:

- One outcome
- Dependencies
- Acceptance criteria
- Verification command or evidence
- Risk tier
- Recommended model and one-sentence rationale
- Files or system boundaries expected to change

Place a handoff checkpoint before changing model tier or entering a large refactor.
The checkpoint must leave the repository in a tested, reviewable state.

Exit criterion: the human approves material choices, or the request was already
specific enough to authorize implementation.

### Stage 4: Implement

For each task:

1. Confirm its scope and current repository state.
2. Implement only the accepted task.
3. Add or update tests with the implementation.
4. Run focused checks, then broader checks proportional to risk.
5. Stop if evidence contradicts the plan; return to planning instead of improvising.
6. Produce a concise handoff record.

Workers may run in parallel only when their file ownership and dependencies do not
overlap. Use isolated branches or worktrees for parallel implementation.

Exit criterion: acceptance criteria pass and the diff contains no unrelated cleanup.

### Stage 5: Judge

The judge independently checks:

- The implementation matches the stated goal and non-goals.
- Every acceptance criterion has evidence.
- Tests would fail without the intended behavior.
- Existing tests or tolerances were not weakened.
- Error paths, boundary cases, and rollback behavior are covered.
- The diff does not introduce security, data-loss, concurrency, or compatibility risk.
- Documentation and dependencies match the implementation.

The judge returns one decision:

- **Pass:** all required evidence is present.
- **Revise:** bounded actionable findings can be fixed in another worker cycle.
- **Escalate:** a human decision or deeper investigation is required.

Exit criterion: pass, or an explicit human risk acceptance.

### Stage 6: Handoff

Provide:

- Outcome
- Important files changed
- Checks run and their results
- Review findings resolved
- Known limitations and deferred work
- Link to the branch or pull request when applicable

Do not self-merge by default. Merging, deployment, and destructive cleanup require
explicit authorization or a pre-approved narrow policy.

## Automation design criteria

An automated stage should be:

- **Scoped:** one repository, branch policy, and bounded responsibility.
- **Idempotent:** rerunning it does not duplicate comments, commits, tickets, or PRs.
- **Observable:** it reports its input, decision, verification, and final status.
- **Permission-minimal:** it receives only the tools and credentials it needs.
- **Retry-bounded:** at most two automatic correction cycles by default.
- **Fail-closed:** missing tests, unavailable dependencies, or uncertain destructive
  actions stop the run rather than being guessed around.
- **Concurrency-safe:** overlapping runs use cancellation, deduplication, or isolated
  branches.
- **Reviewable:** code changes end in a branch or pull request, not an invisible
  production mutation.

Recommended automation boundaries:

1. Intake or ticket event starts a planning run.
2. An approved plan starts one or more worker runs.
3. A pull request open or push event starts the judge.
4. Failed CI starts a bounded diagnosis/fix run.
5. A passing judge and CI notify the human owner for merge.

Keep these as separate automations when they require different models, permissions, or
triggers. Passing a durable artifact—plan, issue, commit, PR, or check result—between
stages is more reliable than relying on one long conversation.

## Mandatory stop conditions

Stop and escalate when:

- Requirements conflict or a missing choice materially changes the result.
- Required authentication, permissions, data, or external services are unavailable.
- The same failure persists after two evidence-driven correction attempts.
- Passing requires weakening an assertion, tolerance, benchmark, or security control.
- The change would delete data, rewrite shared history, deploy to production, expose a
  secret, or incur material cost without prior approval.
- Runtime evidence contradicts the accepted architecture or scientific assumption.

## Definition of done

Work is done only when:

- Accepted scope is implemented.
- Acceptance criteria are mapped to passing evidence.
- Relevant tests, lint, type checks, and builds pass.
- Independent review has no unresolved blocking finding.
- Documentation and dependency metadata are current.
- Remaining limitations are explicit.
- The human receives a reviewable handoff.

Green CI alone is evidence, not the definition of correctness.

## Minimal plan task template

```markdown
### Task: <bounded outcome> [model: <recommended model or tier>]

Reason: <why this model fits the verification strength>
Depends on: <task IDs or none>
Scope: <files or system boundary>
Acceptance:
- <observable behavior>
- <edge or failure behavior>
Verification:
- `<command>` — <expected signal>
Stop if:
- <condition requiring replanning or human input>
```
