---
name: jobs
description: "Manages tasks via Taskwarrior (the `task` CLI) with GTD semantics. Capture, organize, track and complete tasks using Areas of Focus, Workflow states, and Energy levels. Use it for any task management activity: add, list, modify, complete, or review tasks, manage projects and contexts, check overdue or active work. Use it even if the user does not mention Taskwarrior by name."
---

# Jobs

Jobs manages tasks with Taskwarrior (`task`), organized with a GTD system.
Call `task` directly. Taskwarrior's syntax is `task <filter> <command> <mods>`
— the filter comes before the command.

## Custom GTD System

The system organizes tasks along three dimensions:

### 1. Areas of Focus (where the task belongs in your life)
- `+emotion` — main work, deep relationships, purpose
- `+cura` — health, wellbeing, exercise, home maintenance
- `+amministrazione` — bills, tax deadlines, admin/bureaucracy
- `+personale` — creative projects, study, intellectual hobbies
- `+lavoro` — side jobs, freelance, clients

### 2. Workflow (state of the action)
- `+next` — actions ready to do now
- `+waiting` — waiting on someone or something external
- `+someday` — maybe someday (not active now)
- `+routine` — recurring daily/weekly habits

### 3. Energy Required (how much the task demands)
- `+focus` — deep work, high concentration
- `+execute` — mechanical, no thinking needed
- `+reflect` — reflection, planning, brainstorming
- `+rest` — low energy, recovery, light habits

### 4. Projects (specific outcomes with a defined end)
- `project:ProjectName` — e.g. `project:WriteBook`, `project:JapanTrip`
- You do not create projects explicitly. Assign the first task and the project exists

## Capture

Add a task to the inbox (no categorization, just a description):

```bash
task add "Buy bread"
task add "Send report" due:tomorrow
```

To capture an already-categorized task (if it's clear at the moment):

```bash
task add "Write chapter 3" project:WriteBook +personale +next +focus
task add "Pay electricity bill" +amministrazione +next +execute due:eom
task add "Meditation" +cura +routine +rest due:today recur:daily
```

`recur:daily` / `recur:weekly` makes a task a routine. Taskwarrior
generates future instances automatically as each due date passes.

The inbox holds tasks with no `+next`, `+waiting`, `+someday`, or `+routine` tag. These tasks wait to be clarified:

```bash
task -next -waiting -someday -routine list
```

## Clarify & Organize

Assign area of focus, workflow state, energy, project with `task <id> modify`.
A tag adds with `+tag`, removes with `-tag`:

```bash
# Assign area of focus (pick one: emotion, cura, amministrazione, personale, lavoro)
task 12 modify +emotion

# Assign workflow state (pick one: next, waiting, someday, routine)
task 12 modify +next

# Assign energy (pick one: focus, execute, reflect, rest)
task 12 modify +focus

# Assign project
task 12 modify project:WriteBook

# Remove a tag
task 12 modify -next      # e.g. move from next to waiting

# Set a due date
task 12 modify due:tomorrow
task 12 modify due:2025-08-15
task 12 modify due:eom         # end of month

# Remove the due date
task 12 modify due:

# Generic edit (any Taskwarrior modifier)
task 12 modify due:eom +urgent project:Work
```

## Reflect

### By Workflow State

```bash
task +next next            # all ready actions
task +waiting list         # waiting on someone
task +someday list         # someday/maybe list
task +routine list         # recurring habits
```

### By Area of Focus

```bash
task +emotion next   # swap the area tag: cura, amministrazione, personale, lavoro
```

### By Energy Required

```bash
task +focus next           # deep work
task +execute exec         # mechanical tasks to execute
task +reflect next         # reflection/planning tasks
task +rest next            # low-energy tasks
```

### Other Useful Reports

```bash
task next                  # most urgent tasks (sorted by urgency)
task +OVERDUE list         # overdue tasks
task active                # started but not completed tasks
task completed             # completed tasks
task projects              # project overview with task counts
task tags                  # all tags in use
task calendar              # calendar with due dates
task 12 information        # full details of one task + change history
```

Lists take any filter, combined freely: `task project:WriteBook list`,
`task +emotion +next list`, `task +focus due.before:tomorrow list`.

## Engage

```bash
task 12 start               # start working (task becomes "active")
task 12 stop                # stop working
task 12 done                # complete the task
```

Reject a task (tag `+rejected`, drop all other tags — no delete):

```bash
task 12 modify +rejected -next -waiting -someday -routine -focus -execute -reflect -rest -emotion -cura -amministrazione -personale -lavoro -idea
```

Add an annotation (note) to a task:

```bash
task 12 annotate "Sent email to Marco for clarification"
```

## Export

Export tasks to JSON for programmatic processing:

```bash
task export                          # all pending
task project:Home status:pending export
task +next +emotion export
```

## Raw

When the GTD prose above doesn't cover what you need, call Taskwarrior directly — anything `task` supports works:

```bash
task burndown.weekly
task 12 duplicate
task stats
task +emotion calendar
```

## Recommended Workflow

The five GTD steps — Capture, Clarify, Organize, Reflect, Engage — mapped
to the commands above. See `references/WORKFLOW.md` for the full walk-through.

## Contexts

Taskwarrior supports predefined contexts that filter lists automatically:

```bash
task context list         # see available contexts
task context next         # activate context: show only +next
task context focus        # activate context: show only +focus
task context none         # deactivate context
```

Available contexts: `next`, `waiting`, `someday`, `routine`, `focus`, `exec`, `reflect`, `rest`, `emotion`, `cura`, `amministrazione`, `personale`, `lavoro`.
