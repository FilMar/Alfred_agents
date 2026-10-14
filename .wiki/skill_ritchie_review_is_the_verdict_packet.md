---
tags: [skill, ritchie, review, template]
sources: [conversation, skills/ritchie/references/review-template.md, skills/ritchie/scripts/contract_report.py]
---

## Decision

Ritchie writes `REVIEW.md` in step 3, next to the work, in Italian. Six sections, all mandatory:

- `Esito`: the state, plus one line per review round. The last line is the verdict in force.
- `Copertura della spec`: one line per spec item, pointing at where it landed in the code.
- `Contratti derive?`: a table of contract, what it derives from, which principle.
- `Metriche`: the output of `contract_report.py`, verbatim.
- `Test`: counts and failures, not the full output.
- `Scostamenti`: what Ritchie did differently from the plan, and why. "Nessuno" is valid. The section is never skipped.

## Why

The review is the interface between the autonomous work of Ritchie and the judgment of the user. It must let the user judge without re-deriving everything, so it is self-contained: the machine outputs are embedded and the chat can scroll away.

Each section answers one question. `Esito` keeps the loop of approve or send back as a trail. `Copertura` asks "did we build what we said" (completeness, from the spec). `Contratti derive?` asks the inverse, "is everything built justified by the spec or a principle" (traceability, from the code). `Metriche` is the objective health and `Test` the behaviour. `Scostamenti` forces deviations into the open, the same rule the user keeps in `ti` for style conventions: annotate, never omit.

The verdict sits on top, not at the bottom: a reader of an old review wants the state at a glance, like a PR page.

## Cross-references

- [The spec is a minimal Italian document](skill_ritchie_spec_is_a_minimal_italian_document)
- [The pair is ephemeral scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)
