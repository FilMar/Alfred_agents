---
tags: [th, annibale, verification, workflow]
sources: [skills/annibale/SKILL.md@cac8a87, skills/annibale/references/tdd-coding.md@cac8a87]
---

## Decision

Every check or verification in a `th` workflow runs as the controller that launched the run, a deterministic script, or the user. A check is never an action the run takes on itself, and never a check delegated to another run. A member's job stops at producing output; confirming that output is correct is never the member's own call.

This constrains every workflow built on `th`: it takes the simplest shape — act, stop, hand back — with verification external and visible. It was first written into `annibale` on 2026-09-11. On 2026-10-14 `annibale` became a debate runner and lost its TDD flow (`tdd-coding.md@cac8a87`); the rule now lives in the scripts that drive `th`, such as the one in [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role).

## Why

A member grading its own output can be wrong in the same way it was wrong when producing it, and it can be told to fake the check. A script or the controller either passes or fails; it cannot rationalize a bad result into a good one. A delegated check to another member is still opaque — a verdict readable only after the fact, not something the controller can read or steer while it happens.

## Worked example — a code-then-test flow

1. A member writes code meant to make a test suite pass. It does not run the tests; it writes and stops.
2. The controller runs the suite.
3. On failure, the controller relaunches `th` with the failure output for a fix round.
4. Repeat, capped. The control flow (run, judge, relaunch) lives entirely outside `th`.

## Cross-references

- `agents_skills_inline_members_via_th@b896c3d` — what a member is and is not
- `orchestrator_adversarial_audit_static@c194447` — the same external-verification instinct applied to the orchestrator's audit gate