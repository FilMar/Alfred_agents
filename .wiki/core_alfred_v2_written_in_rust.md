---
tags: [core, alfred, rust, language]
sources: [conversation]
---

## Decision

alfred v2 is written in Rust. The TypeScript tools in `tools/` are a reference for what to do, not code to port line by line.

## Why

The reason is trust, not speed. The user knows Rust and trusts its safety. The user does not know TypeScript, and the current tools were written mostly by agents. So the user maintains code they cannot judge.

Speed was never the problem: the slow parts are network calls and model calls.

## Cross-references

- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — what gets written
