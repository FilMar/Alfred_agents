---
name: steward
description: "Manages tasks via Taskwarrior through a justfile abstraction layer. Capture, organize, track and complete tasks with GTD semantics. Use it whenever the user wants to add, list, modify, complete, or review tasks, manage projects and contexts, check overdue or active work, or do any task management activity — even if they don't mention Taskwarrior explicitly."
---

# Steward

Steward manages tasks through a `justfile` that wraps Taskwarrior. Always use the recipes in this skill's `justfile` instead of calling `task` directly — the justfile provides GTD-semantic names and handles quoting. Run `just --list` from this directory to see all recipes.

## Capture

Add a task. Modifiers (tags, due date, project, priority) can be appended:

```bash
just add "Comprare pane" +errands due:tomorrow
just add "Revisionare contratto" project:Lavoro priority:H
```

The inbox — tasks without a project yet, waiting to be clarified:

```bash
just list -PROJECT
```

## Clarify & Organize

Assign a project, set tags, due dates, and priorities:

```bash
just proj 12 Home
just tag 12 weekend
just untag 12 weekend
just due 12 eom
just nodue 12
just prio 12 H
just noprio 12
```

Generic modification (any Taskwarrior modifier):

```bash
just modify 12 due:eom priority:H +urgent
```

Contexts — filter the task list by area of focus:

```bash
just context-set work
just context-none
just context-list
```

## Reflect

See what's urgent, what's overdue, what's active:

```bash
just next           # most urgent tasks
just overdue        # tasks past their due date
just active         # started but not completed
just waiting        # hidden, waiting for a future date
just completed      # done tasks
just projects       # project overview with counts
just tags           # all tags in use
just calendar       # calendar with due dates
```

List with filters (Taskwarrior filter syntax):

```bash
just list                        # all pending
just list project:Home           # by project
just list +weekend due.before:eom  # by tag and date
```

Full details on a single task, including change history:

```bash
just info 12
```

## Engage

Start, stop, complete, or delete:

```bash
just start 12
just stop 12
just done 12
just delete 12
```

Add a note to a task:

```bash
just annotate 12 "Inviata mail a Marco per chiarimenti"
```

## Export

Dump tasks as JSON for programmatic processing:

```bash
just export
just export project:Home status:pending
```

## Raw

When the abstraction doesn't cover what you need, pass through to Taskwarrior directly:

```bash
just raw burndown.weekly
just raw 12 duplicate
just raw stats
```