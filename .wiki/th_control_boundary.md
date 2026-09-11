# th Control Boundary

```yaml
tags: [architecture, th, annibale, workflow]
sources: [skills/annibale/SKILL.md, skills/annibale/references/tdd-coding.md]
updated: 2026-09-11
```

## Principle

Every check or verification in a `th` workflow must run as: Annibale itself, a deterministic script, or the user — never as an action a `th` member takes itself. A member's job stops at producing output (usually code); confirming that output is correct is never the member's own call, and it is never handed off to a *different* member either — a delegated check is still opaque, only readable after the fact as a verdict, not something the controller can read or steer while it happens.

This constrains **annibale**: before this change annibale could decompose a problem and let a member both act and check its own work in the same run. The rule forces every workflow annibale designs down to the simplest shape — act, stop, hand back — with verification always external and visible.

## Why

A member grading its own output is a weak guardrail: it can be wrong in the same way it was wrong when producing the output, and it can be told to skip or fake the check. A script or the controller does not have that failure mode — it either passes or it does not, and it cannot rationalize a bad result into a passing one.

## Worked example: TDD flow

1. A workflow member writes code meant to make a given set of tests pass. It does **not** run the tests itself — it writes what it believes is correct, and stops.
2. The controller (the user, or a script) runs the test suite.
3. If tests fail, the controller relaunches `th` with the failure output, asking the same or another member to fix the code.
4. Repeat from step 2.

At no point does `th` run the tests, judge its own output, or decide whether to continue — it only ever writes code. The loop's control flow (run tests, decide pass/fail, relaunch) lives entirely outside `th`.

## Status

**Done (2026-09-11).** Implemented in the annibale skill:

- `SKILL.md`, `## Rules`: new rule — verification is never delegated to a member, only to Annibale, a deterministic script, or the user.
- `references/tdd-coding.md`, Phase 2 (Stub): compiler/type-check now runs as an explicit Annibale step, not left implicit.
- `references/tdd-coding.md`, Phase 3 (Tests): the test command now explicitly runs as an Annibale step, not the black member that wrote the tests.
- `references/tdd-coding.md`, Phase 4 (Implement loop): the pseudocode `# run the test runner` / `# if all tests pass → break` became real bash (`TEST_OUTPUT`/`TEST_EXIT`, an `ITER` counter capping at 3) run by Annibale between iterations; the member's task text now explicitly says "Do not run the test suite yourself" — needed because the coder member holds `bash` tool access and could otherwise self-verify.
- `references/tdd-coding.md`, `## Rules`: mirrors the `SKILL.md` rule for readers who only open this file.

Verified with `python3 skills/efesto/scripts/lint_skill.py skills/annibale` — clean.

Out of scope, deliberately: Phase 5 (Review) still has black/white members critique the code. This is not a check in the gate sense — no member decides pass/fail; Annibale reads the critique and decides whether to loop back to Phase 4. Left unchanged.

## Cross-references

- [roadmap](roadmap) — `th` area: the task this page details
- [agenti](agenti) — `th` members and execution patterns this constrains
- [orchestrator_overview](orchestrator_overview) — the same external-verification instinct already applied to the Raspberry Orchestrator's audit gate (Phase 3)
