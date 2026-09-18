---
tags: [core, archive, cleanup]
sources: [conversation, .wiki/architettura.md]
---

## Decision

The ghost tools `td` (Third Done, a GTD CLI) and `mvr` (multiversal rules game) were removed entirely on 2026-07-02: sources under `tools/`, the `bin` entry in `package.json`, the `~/.local/bin` symlinks, the `setup.sh` steps. Only the legacy DB `~/.pi/td.db` survives on disk. No replacement CLI lives in this repo — task management goes through the `jobs` skill.

## Why

Dead tools in `bin` and in the docs are claims the system no longer keeps. Every entry that points at nothing is a small lie the next reader pays for. Deleting beats archiving code: git holds the history, the tree stays truthful.

## Cross-references

- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — the live layers that remain