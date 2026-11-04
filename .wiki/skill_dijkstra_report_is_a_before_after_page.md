---
tags: [skill, dijkstra, report, render, tree-sitter]
sources: [conversation, spikes/2026-11-04-cuts-view/main.py (local, not in git)]
---

## Decision

The dijkstra report becomes one local HTML page, drawn by a fixed renderer from data the model writes. The model never writes HTML. This is a design target: no script exists yet.

Each cut is one view with two states, Prima and Dopo, switched by buttons. A header pair, Tutto prima and Tutto dopo, switches every view. There are no animations.

A merge of similar code is a stamp. tree-sitter (`tree-sitter-language-pack`) parses each copy, and a tree diff walks them together. A node with the same type and the same child count recurses. Equal leaves are the skeleton. Any other node is one whole hole, numbered ①②. A hole whose text equals an earlier hole ("uguale"), or sits inside a string ("stringify"), is derived: it is not a parameter. The free holes become a table, one column per hole, in the hole's colour. Code is coloured by the leaf node types.

The page lists every cut with a checkbox and a live total of the lines saved. "Copia la scelta" copies the chosen ids, and the user pastes them in chat to approve.

graphify gives the facts the page needs. `affected` finds the callers of a merged function. `explain` finds dead code with no callers. `path` finds ceremony chains. `god-nodes` picks files in a big scope.

## Why

The user does not want to read AI text: a merge is shown, not described. The spike drew five kinds of cut on real and invented code. They were a method pair, ten tests that become a table, ceremony asserts, Rust structs that become a macro, and constructions that become a defaults table. The user could decide from the page.

Token diffs gave holes in pieces, and whitespace counted as holes. The tree diff gives whole holes. The table shows what the macro or builder will take as its arguments.

Animations were tried first and dropped. The user said they add nothing. A play button could not go back to the old state, and Prima and Dopo are enough.

## Cross-references

- [The spec is shown, not written](skill_ritchie_spec_is_shown_not_written): the same model-writes-data, renderer-draws rule
- [Dijkstra never grows the code](skill_dijkstra_never_grows_the_code): the total on the page is the size gate's number
