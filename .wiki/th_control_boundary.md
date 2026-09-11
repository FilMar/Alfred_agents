# th Control Boundary

```yaml
tags: [architecture, th, annibale, workflow]
sources: [conversation]
updated: 2026-09-11
```

## Principle

Every check or verification in a `th` workflow must run as a script, or as a step owned by the controller (whoever launches `th` — the user, or a wrapping script) — never as an action a `th` member takes itself. A member's job stops at producing output (usually code); confirming that output is correct is never the member's own call.

This is a planned constraint on **annibale**: today annibale can decompose a problem and let a member both act and check its own work in the same run. The change forces every workflow annibale designs down to the simplest shape — act, stop, hand back — with verification always external.

## Why

A member grading its own output is a weak guardrail: it can be wrong in the same way it was wrong when producing the output, and it can be told to skip or fake the check. A script or the controller does not have that failure mode — it either passes or it does not, and it cannot rationalize a bad result into a passing one.

## Worked example: TDD flow

1. A workflow member writes code meant to make a given set of tests pass. It does **not** run the tests itself — it writes what it believes is correct, and stops.
2. The controller (the user, or a script) runs the test suite.
3. If tests fail, the controller relaunches `th` with the failure output, asking the same or another member to fix the code.
4. Repeat from step 2.

At no point does `th` run the tests, judge its own output, or decide whether to continue — it only ever writes code. The loop's control flow (run tests, decide pass/fail, relaunch) lives entirely outside `th`.

## Status

Not yet implemented — a planned modification to annibale's flow design, recorded on the roadmap ([roadmap](roadmap), `th` area). No detail beyond the principle and the TDD example above exists yet.

## Cross-references

- [roadmap](roadmap) — `th` area: the task this page details
- [agenti](agenti) — `th` members and execution patterns this constrains
- [orchestrator_overview](orchestrator_overview) — the same external-verification instinct already applied to the Raspberry Orchestrator's audit gate (Phase 3)
