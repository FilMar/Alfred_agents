---
tags: [memory, distiller, alfred, tags, rust]
sources: [spec.json@c597998, review.json@c597998, tools/alfred/src/distill/text.rs]
---

## Decision

`tag_key()` takes the accents off a tag with Unicode NFD and drops the combining marks U+0300 to U+036F. This is the same as `normalize("NFD")` in `td`. The crate `unicode-normalization` does the NFD.

## Why

A key must match the one `td` made for the same tag, so the two distillers agree in the shadow comparison.

Rejected: a hand table of accented letters. It needs no crate, but it covers only the letters someone wrote down. The first body run wrote such a table, and it missed letters NFD handles.

## Cross-references

- [memory_distill_tag_vocabulary_comes_from_ti_rules](memory_distill_tag_vocabulary_comes_from_ti_rules) — where the keys are matched
