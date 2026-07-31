---
name: jobs
description: "Manages tasks via Taskwarrior through a justfile abstraction layer. Capture, organize, track and complete tasks with GTD semantics using Areas of Focus, Workflow states, and Energy levels. Use it for any task management activity: add, list, modify, complete, or review tasks, manage projects and contexts, check overdue or active work. Use it even if the user does not mention Taskwarrior by name."
---

# Jobs

Jobs manages tasks through a `justfile` that wraps Taskwarrior. Always use the recipes in this skill's `justfile` instead of calling `task` directly. The justfile provides GTD-semantic names and handles quoting. Run `just --list` from this directory to see all recipes.

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
just add "Buy bread"
just add "Send report" due:tomorrow
```

To capture an already-categorized task (if it's clear at the moment):

```bash
just add "Write chapter 3" project:WriteBook +personale +next +focus
just add "Pay electricity bill" +amministrazione +next +execute due:eom
just add "Meditation" +cura +routine +rest due:today recur:daily
```

The inbox holds tasks with no `+next`, `+waiting`, `+someday`, or `+routine` tag. These tasks wait to be clarified:

```bash
just list -next -waiting -someday -routine
```

## Clarify & Organize

Assign area of focus, workflow state, energy, project:

```bash
# Assign area of focus
just tag 12 emotion
just tag 12 cura
just tag 12 amministrazione
just tag 12 personale
just tag 12 lavoro

# Assign workflow state
just tag 12 next
just tag 12 waiting
just tag 12 someday
just tag 12 routine

# Assign energy
just tag 12 focus
just tag 12 execute
just tag 12 reflect
just tag 12 rest

# Assign project
just proj 12 WriteBook
just proj 12 JapanTrip

# Remove a tag
just untag 12 next      # e.g. move from next to waiting
just untag 12 focus

# Set a due date
just due 12 tomorrow
just due 12 2025-08-15
just due 12 eom         # end of month

# Remove the due date
just nodue 12

# Generic edit (any Taskwarrior modifier)
just modify 12 due:eom +urgent project:Work
```

## Reflect

### By Workflow State

```bash
just next-actions     # all ready actions (+next)
just waiting-list      # waiting on someone (+waiting)
just someday           # someday/maybe list (+someday)
just routine           # recurring habits (+routine)
```

### By Area of Focus

```bash
just emotion          # tasks in the Emotion area
just cura             # tasks in the Cura area
just amministrazione   # tasks in the Amministrazione area
just personale         # tasks in the Personale area
just lavoro            # tasks in the Lavoro area
```

### By Energy Required

```bash
just focus            # tasks that need deep work
just exec             # mechanical tasks to execute
just reflect          # reflection/planning tasks
just rest             # low-energy tasks
```

### Other Useful Reports

```bash
just next             # most urgent tasks (sorted by urgency)
just overdue          # overdue tasks
just active           # started but not completed tasks
just completed        # completed tasks
just projects         # project overview with task counts
just tags             # all tags in use
just calendar         # calendar with due dates
```

### Lists with Custom Filters

```bash
just list                          # all pending
just list project:WriteBook        # by project
just list +emotion +next           # area + state
just list +focus due.before:tomorrow  # energy + due date
```

### Full Details of a Task

```bash
just info 12          # full details + change history
```

## Engage

```bash
just start 12         # start working (task becomes "active")
just stop 12          # stop working
just done 12          # complete the task
just delete 12        # delete the task
```

Add an annotation (note) to a task:

```bash
just annotate 12 "Sent email to Marco for clarification"
```

## Routine

Create routines with recurrence:

```bash
# Daily routine
just add "Meditation" +cura +routine +rest due:today recur:daily

# Weekly routine
just add "Weekly review" +personale +routine +reflect due:today recur:weekly
```

Taskwarrior generates future instances automatically as each due date passes.

## Export

Export tasks to JSON for programmatic processing:

```bash
just export                          # all pending
just export project:Home status:pending
just export +next +emotion
```

## Raw

When the abstraction doesn't cover what you need, call Taskwarrior directly:

```bash
just raw burndown.weekly
just raw 12 duplicate
just raw stats
just raw +emotion calendar
```

## Recommended Workflow

### 1. Capture
Write down everything on your mind, without categorizing:
```bash
just add "Generic task"
```

### 2. Clarify
Process the inbox regularly (daily or weekly):
```bash
just list -next -waiting -someday -routine   # tasks to clarify
```

For each task, ask yourself:
- Is it actionable? If not, delete it or move it to `+someday`
- What's the next physical action?
- Which area of focus does it belong to? (`+emotion`, `+cura`, etc.)
- How much energy does it need? (`+focus`, `+execute`, `+reflect`, `+rest`)
- Is it part of a project? (`project:Name`)
- What's its state? (`+next`, `+waiting`, `+someday`, `+routine`)

### 3. Organize
Apply the categorization:
```bash
just tag 12 emotion
just tag 12 next
just tag 12 focus
just proj 12 WriteBook
```

### 4. Reflect (Review)
- **Daily:** `just next` and `just routine` to see what to do today
- **Weekly:** `just someday` to review future projects, `just projects` for an overview
- **Monthly:** `just calendar` for long-term planning

### 5. Engage (Execute)
Choose based on:
- Physical context (where you are, what tools you have)
- Available time (5 min vs 2 hours)
- Mental energy (high vs low)
- Priority (urgency + importance)

```bash
just focus      # if you have energy and time for deep work
just exec       # if you have little time/energy, mechanical tasks
just rest       # if you're tired, light habits
```

## Contexts

Taskwarrior supports predefined contexts that filter lists automatically:

```bash
just context-list         # see available contexts
just context-set next     # activate context: show only +next
just context-set focus    # activate context: show only +focus
just context-none         # deactivate context
```

Available contexts: `next`, `waiting`, `someday`, `routine`, `focus`, `exec`, `reflect`, `rest`, `emotion`, `cura`, `amministrazione`, `personale`, `lavoro`.
