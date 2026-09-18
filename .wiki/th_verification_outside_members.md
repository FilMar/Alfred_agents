---
tags: [th, annibale, verification, workflow]
sources: [skills/annibale/SKILL.md, skills/annibale/references/tdd-coding.md]
---

## Decision

Every check or verification in a `th` workflow runs as Annibale itself, a deterministic script, or the user — never as an action a `th` member takes on itself, and never as a check delegated to a different member. A member's job stops at producing output; confirming that output is correct is never the member's own call.

This constrains annibale: every workflow it designs takes the simplest shape — act, stop, hand back — with verification external and visible. Implemented 2026-09-11 in the annibale skill (`SKILL.md` rule + `references/tdd-coding.md` phases 2-4: compiler and test-runner steps run as Annibale; the implement loop is real bash with an iteration cap; the coder's task text says "do not run the test suite yourself"). Phase 5 (review) is unchanged on purpose: critique from a member is not a pass/fail gate — Annibale reads it and decides whether to loop back.

## Why

A member grading its own output can be wrong in the same way it was wrong when producing it, and it can be told to fake the check. A script or the controller either passes or fails; it cannot rationalize a bad result into a good one. A delegated check to another member is still opaque — a verdict readable only after the fact, not something the controller can read or steer while it happens.

## Worked example — TDD flow

1. A member writes code meant to make a test suite pass. It does not run the tests; it writes and stops.
2. Annibale runs the suite.
3. On failure, Annibale relaunches `th` with the failure output for a fix round.
4. Repeat, capped. The control flow (run, judge, relaunch) lives entirely outside `th`.

## Cross-references

- [agents_skills_inline_members_via_th](agents_skills_inline_members_via_th) — what a member is and is not
- [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) — the same external-verification instinct applied to the orchestrator's audit gate