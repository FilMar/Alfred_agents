---
tags: [skill, ritchie, spec, template]
sources: [conversation, skills/ritchie/references/spec-template.md]
---

## Decision

Ritchie writes `SPEC.md` in step 1, next to the work. It is the domain in the words of the user, in Italian, on the shape of the template: a list of entities, each with five fields (`stato`, `fa`, `non fa`, `serve a`, `comanda`), then the flows, then the invariants. One line per field. No prose between the bullets.

## Why

The user reads the spec and approves the domain before any code exists. The reader is the user, the user is Italian, and the spec is the domain in the words of the user, so it is Italian.

Minimal, because every extra line is a line the user must read before saying "ok". Entities say what exists, flows say who talks to whom, invariants say what always holds. That is the minimum that lets the review check the code against the spec.

Rejected: total Design by Contract, the code itself as the spec. It is one source of truth that cannot lie. But step 1 is the user approving the domain, and approving a domain by reading `assert!` lines is harder than reading "the balance never goes below zero". The code is the construction and the document is the plan. Step 2 already translates the spec into contracts, so the two views of the domain exist once each.

The formats found in research (C4, arc42, ADR, lean SAD) target a whole system or a single decision, not one feature. None prescribes this one-page shape.

## Cross-references

- [The review is the verdict packet](skill_ritchie_review_is_the_verdict_packet)
- [The pair is ephemeral scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)
- [Contract messages carry values](skill_ritchie_contract_messages_carry_values) — the contract in the code, the machine's half of the spec
