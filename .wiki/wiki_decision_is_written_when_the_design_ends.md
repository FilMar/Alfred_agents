---
tags: [wiki, process, omero]
sources: [conversation, ROADMAP_MEMORIA.md]
---

## Decision

A decision page is written after the design session ends, not while it runs. During
the session the notes live anywhere else: the roadmap, the chat, a scratch file. When
the shape stops moving, the page gets written once.

## Why

A decision page never changes once written. A design under discussion changes every
few minutes. Writing the page during the discussion puts those two rules against each
other, and the rule that loses is the one that says the page is immutable.

It happened on 2026-09-28. The `tl` schema was written to the wiki while its shape was
still being argued. The page then had to be superseded by a second page on the same
day, and the first one carried the old name of the thing — "event log" instead of "work
archive". A name written too early keeps pulling the design back toward the old idea:
the schema grew to nineteen columns because every new column looked reasonable for an
event log. The final shape has three tables and thirteen columns in the queryable one.

So the cost of writing early is not a wasted file. It is a design that drifts toward
whatever the premature page called it.

The rejected alternative was to allow edits to a page while its design is open, with
the immutability starting later. That needs a marker for "this page is still soft",
and a reader who checks it. A page that might be provisional is worth less than no
page, because the reader cannot tell which kind they are holding.

## Cross-references

- [A superseded decision is hidden with a dot](wiki_superseded_hidden_with_dot)
- [tl is a work archive, not an event log](memory_tl_work_archive_not_event_log) — the
  page this lesson came from.
