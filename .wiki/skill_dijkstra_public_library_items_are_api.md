---
tags: [skill, dijkstra, dead-code]
sources: [skills/dijkstra/SKILL.md]
---

## Decision

A public item of a library is API, not dead code, even when no code in the crate calls it. Dijkstra flags it and does not cut it.

## Why

In the Rust test, dijkstra deleted a `pub fn` because nothing in the crate called it. Callers outside the crate are invisible from inside it, so "no caller" proves nothing for a library.
