---
tags: [memory, wiki, architecture, extraction]
sources: [conversation, .wiki/index.md]
---

## Decision

`.wiki/` is not a tier of the memory stack. It is the notebook an agent writes to track how one project evolved. It lives and dies with the project.

A wiki page is an episodic record **about the project**, written in semantic form: dated, immutable, "this is why we chose that on 23 September", but phrased as a stable fact rather than an event.

So every page has two halves, and the test that splits them is one question:

> **Does the why survive if the project is deleted?**
>
> Yes, it is a `tb` note. No, it stays in the wiki only.

The general half goes to `tb`, in Italian and in the first person, with the page path as its `source`. One direction is enough: from another project you find the lesson with `tb search`, and from there you can walk back to the project if you need the detail.

`.wiki/` needs no producer of its own in `tl`. A `Write` to `.wiki/` is already content inside an exchange, with the whole text in the body. So there is no post-commit hook, no `extracted` flag to maintain, and no second distiller for wiki pages — one distiller reads exchanges, and the test above is a question inside its prompt.

## Why

The split is not arbitrary; it runs along a joint. The local half is episodic and project-bound. The general half is semantic and survives. Two CoALA types were sharing one file, so cutting between them is cleaner than cutting anywhere else.

The risk this answers is measurable. Seven pages written in one session hold seven general halves — a taxonomy, a threshold rule, "a queue with one human worker grows at the worker's pace" — and all seven sit in a repo named `pi`, where no other project can find them. Without the extraction step `.wiki/` is not a project wiki, it is a leak with an index.

Keeping the wiki in the repo was never the problem, and moving it out would cost three things at once: it is versioned with the code it explains, it dies when the project dies, and an agent working there can grep it with no network and no embeddings.

Rejected: indexing `.wiki/` into Qdrant so it is searchable across projects. It looks like the shortcut and it fills `tb` with forty projects' conventions, which kills the rule that makes the wiki cheap. Distillation is supposed to lose information — that is the work.

What this also means: the extraction is the job Platone does, so Platone is not a courtesy at the end of a session. It is the only pump that moves knowledge from the project's fence to the cross-project store.

## Cross-references

- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — the four types, and why the wiki is not one of them
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — why a `Write` to the wiki needs no special event
- [wiki_superseded_hidden_with_dot](wiki_superseded_hidden_with_dot) — the immutability that makes a copy of a page safe
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — the boundary this keeps
