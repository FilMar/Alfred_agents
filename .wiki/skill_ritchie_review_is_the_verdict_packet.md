---
tags: [skill, ritchie, review, template]
sources: [conversation, skills/ritchie/references/review-template.md, skills/ritchie/scripts/contract_report.py]
---

## Decision

Ritchie writes `REVIEW.md` in step 3, next to the work, in Italian.
Six sections, every one mandatory:

- `Esito` — the state, plus one line per review round; the last line
  is the verdict in force.
- `Copertura della spec` — one line per spec item, pointing at where
  it landed in the code.
- `Contratti derive?` — a table: contract, what it derives from,
  which principle.
- `Metriche` — the `contract_report.py` output, verbatim.
- `Test` — counts and failures, not the full output.
- `Scostamenti` — what Ritchie did differently from the plan, and
  why. "Nessuno" is a valid entry; the section is never skipped.

## Why

The review is the interface between Ritchie's autonomous work and the
user's judgment. It must let the user judge without re-deriving
everything, so it is self-contained: the machine outputs are embedded
and the chat is free to scroll away.

Each section answers one review question. `Esito` keeps the approve or
send-back loop as a trail. `Copertura` answers "did we build what we
said" — completeness, from the spec side. `Contratti derive?` answers
the inverse: "is everything built justified by the spec or a
principle" — traceability, from the code side. `Metriche` is the
objective health. `Test` is the behaviour. `Scostamenti` forces the
deviations into the open, the same rule the user keeps in ti for style
conventions: deviations are annotated, never omitted.

The verdict sits on top, not at the bottom: a reader of an old review
wants the state at a glance, like a PR page.

## Cross-references

- [The spec is a minimal Italian document](skill_ritchie_spec_is_a_minimal_italian_document)
- [The pair is ephemeral scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)