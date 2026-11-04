---
tags: [skill, ritchie, spec, template, render]
sources: [conversation, skills/ritchie/references/spec-template.md, skills/ritchie/scripts/render_page.py, spikes/2026-11-04-spec-view/main.py (local, not in git)]
replaces: [skill_ritchie_spec_is_a_minimal_italian_document@86b2f64]
---

## Decision

Ritchie writes the spec as `spec.json`, not `SPEC.md`. The fields stay the same: entities (`stato`, `fa`, `non_fa`, `serve_a`, `comanda`), flows (`da`, `a`, `passa`, `torna`) and invariants. The values are in Italian. Each invariant gets one new field, `su`: the entities it binds.

A fixed renderer turns `spec.json` into one local HTML page. Entities are the nodes of a graph. Flows are animated edges: one pill goes out with what passes and one comes back with what returns. Invariants are badges on the nodes they bind. Text shows only on hover. The user approves by looking at the page, then says "ok" in chat.

The model writes data only. It never writes HTML. `skills/ritchie/scripts/render_page.py` fills one fixed template, `render_page.html`. A pike script, so it has no tests: the real runs are the test.

## Why

The user does not want to read AI text. Whatever can be shown should not be written. The spike showed it works: a six-entity spec read as a graph with flows was clear at a glance, and the user liked it.

The old markdown spec already had a strict shape, so it was data in disguise. JSON keeps the shape and lets a program draw it. The `th` runs read the same file.

Rejected: the model writes the HTML page each run. It costs five to ten times the tokens. The layout changes every time. A verbose model just makes verbose paragraphs with nicer styling. A fixed renderer gives the same shape every time, so the user learns where to look.

The old reasons still hold: the user approves the domain before code exists, in Italian, with the fewest words possible.

## Cross-references

- [The review is a page from review.json](skill_ritchie_review_is_a_page_from_review_json)
- [The pair is ephemeral scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)
- [Contract messages carry values](skill_ritchie_contract_messages_carry_values) — the contract in the code, the machine's half of the spec
