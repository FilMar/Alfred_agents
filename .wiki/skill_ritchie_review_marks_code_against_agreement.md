---
tags: [skill, ritchie, review, skeleton, render]
sources: [conversation, skills/ritchie/references/review-template.md, skills/ritchie/scripts/code_view.py, skills/ritchie/scripts/review_page.sh]
---

## Decision

The review page has the same Codice tab as setup. `final_rows()` in `code_view.py` compares the final code with `concordato.json`, line by line. Each line gets one of four marks:

- yellow: a line that was not agreed, or an assert added inside a body
- red, struck through: an agreed line that is gone
- blue edge: a body that replaced a `todo` line
- no mark: an agreed line, unchanged

A chunk counts as a body only when it replaces `todo` lines and nothing else. Test files are not shown. The user comments on lines as at setup, and sends the work back with the copied comments.

`--freeze` refuses to overwrite `concordato.json`. The file leaves the tree on approval.

## Why

The user wants to see what differs from what was agreed, not reread everything. A plain diff of the skeleton against the final code is no use: every body would show as a change. The `todo` lines tell a body, which was expected, from a change, which was not.

A body next to a changed contract turns all yellow, because the two are one chunk. New functions in that chunk cannot be told apart from the body. A false alarm costs a look. A hidden difference costs the point of the page.

Tests are written after the agreement by design, so they are no difference from it.

Freeze refuses a second run because a freeze after the bodies would erase the agreement and hide every difference.

## Cross-references

- [The setup agrees on a commented skeleton](skill_ritchie_setup_agrees_on_commented_skeleton)
- [The review is a page from review.json](skill_ritchie_review_is_a_page_from_review_json)
- [The review shows planned against built](skill_ritchie_review_shows_plan_against_built): the same comparison on the graph
