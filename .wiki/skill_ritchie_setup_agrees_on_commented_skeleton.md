---
tags: [skill, ritchie, spec, skeleton, render]
sources: [conversation, skills/ritchie/SKILL.md, skills/ritchie/references/spec-template.md, skills/ritchie/scripts/code_view.py, skills/ritchie/scripts/spec_page.sh]
---

## Decision

At setup Ritchie shows the code it proposes, not only the schema. It writes the skeleton in the real target files: structs, signatures, contracts as asserts, and `todo` bodies. `spec_page.sh` draws one page with two tabs. Schema is the graph from `spec.json`. Codice is the code from `code_view.py`, in the style of the dijkstra page.

The user clicks a line and writes a comment. "Copia i commenti" copies every comment with its file, line and code. The user pastes them in chat as questions. Ritchie answers, updates the spec and the skeleton, and draws the page again. This repeats until the user says "ok".

Signatures and contracts come together, in one pass. On "ok", `code_view.py --freeze` saves the skeleton in `concordato.json`. Tests and bodies come after that, with the user absent.

## Why

The user wants to read the code the agent proposes. The schema alone does not show a struct or a contract, and an error in one would show only after tests and bodies.

The user asked for signatures and contracts together. An older rule split them in two passes, so that contracts were not approved unread. The user said two passes slow the work for no reason. A comment on a line gives the same attention at a lower cost. The risk stays, and the user accepts it.

The skeleton lives in the real files because the user asked for todo functions. There is one source, a comment points at a real line, and the review uses the same view. The cost is that the tree changes before the "ok".

Rejected: the skeleton as text in `spec.json`. It keeps the tree clean. But the code is not compiled and is written twice, and the two copies can differ.

The page copies the comments and sends nothing. The user pastes them, as with "Copia la scelta" on the dijkstra page. A comment is not saved if the page reloads.

## Cross-references

- [The spec is shown, not written](skill_ritchie_spec_is_shown_not_written)
- [The review marks the code against the agreement](skill_ritchie_review_marks_code_against_agreement)
- [The dijkstra report is a before and after page](skill_dijkstra_report_is_a_before_after_page): the style of the Codice tab
