---
tags: [skill, ritchie, review, render, template]
sources: [conversation, skills/ritchie/references/review-template.md, skills/ritchie/scripts/contract_report.py]
replaces: [skill_ritchie_review_is_the_verdict_packet@24c6521]
---

## Decision

Ritchie writes the review as `review.json`, not `REVIEW.md`. The model writes only what no script can know:

- `scostamenti`: what Ritchie did differently from the plan, and why. One line each. Each line names the entity or file it is about. An empty list is valid.
- `derive`: the contracts that do not derive from the spec. Contract, source, principle.
- `giri`: one entry per review round, with the user's comment. The last one is the verdict in force.

Scripts give the rest: metrics from `contract_report.py`, test counts from the test runner, the mutants and whether each one was killed. The same fixed renderer that draws the spec puts all of it on one page, next to the planned-against-built graph. A deviation shows on the node it names. The user gives the verdict in chat: "ok", or the comments copied from the [Codice tab](skill_ritchie_review_marks_code_against_agreement).

## Why

The first real review (`HttpClient` to `tools/common`) was written as `REVIEW.md`, out of habit. Reading it back, most of it was already on the page or was a measured number. `Copertura della spec` repeated in text the six green flows the graph showed. Metrics, tests and mutants are script output. Only the deviations and the `derive?` contracts need the model.

The six questions of the old review still hold. Did we build what we said? Is everything built justified? What is the health? How do the tests behave? What changed from the plan? What is the verdict? The page answers each one, and only one of them needs prose.

The review was also the memory between rounds. A list of rounds in `review.json` keeps that.

## Cross-references

- [The spec is shown, not written](skill_ritchie_spec_is_shown_not_written)
- [The review shows planned against built](skill_ritchie_review_shows_plan_against_built)
- [The pair is ephemeral scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)
