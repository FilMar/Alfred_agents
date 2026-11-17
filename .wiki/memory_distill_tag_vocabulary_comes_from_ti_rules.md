---
tags: [memory, distiller, alfred, tags, vocabulary]
sources: [spec.json@c597998, review.json@c597998, tools/alfred/src/distill/rule.rs, tools/alfred/src/distill/run.rs]
---

## Decision

The tag vocabulary of the distiller in `alfred serve` is the tags of the rules in `alfred rules`. `vocabulary_of()` counts each tag over every rule, read with `rules.list` and no filter. It sorts by count, most used first. A tie goes by name. It keeps at most `vocabularySize` tags (80 in row 4).

`TagVocabulary` matches the model's tags against this list, as `td` does: known tags first, then proposed ones, at most 3.

## Why

`td` took the vocabulary from `tb tags`, the tags of the notes. The new distiller writes only rules, and `tb` is gone. The rules are now the only memory with tags. So their tags are the graph a new rule must join.

`td` broke ties by the order in which tags came out of the scroll. A tie by name gives the same list on every run.

## Cross-references

- [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) — known and proposed tags
- [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge) — why `tb` goes away
