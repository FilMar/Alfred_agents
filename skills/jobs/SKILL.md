---
name: jobs
description: "Manages tasks via Taskwarrior through a justfile abstraction layer. Capture, organize, track and complete tasks with GTD semantics using Areas of Focus, Workflow states, and Energy levels. Use it for any task management activity: add, list, modify, complete, or review tasks, manage projects and contexts, check overdue or active work. Use it even if the user does not mention Taskwarrior by name."
---

# Jobs

Jobs manages tasks through a `justfile` that wraps Taskwarrior. Always use the recipes in this skill's `justfile` instead of calling `task` directly, via the `pi-just jobs <recipe>` wrapper. The justfile provides GTD-semantic names and handles quoting. Run `pi-just jobs default` to see all recipes.

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
pi-just jobs add "Buy bread"
pi-just jobs add "Send report" due:tomorrow
```

To capture an already-categorized task (if it's clear at the moment):

```bash
pi-just jobs add "Write chapter 3" project:WriteBook +personale +next +focus
pi-just jobs add "Pay electricity bill" +amministrazione +next +execute due:eom
pi-just jobs add "Meditation" +cura +routine +rest due:today recur:daily
```

The inbox holds tasks with no `+next`, `+waiting`, `+someday`, or `+routine` tag. These tasks wait to be clarified:

```bash
pi-just jobs list -next -waiting -someday -routine
```

## Clarify & Organize

Assign area of focus, workflow state, energy, project:

```bash
# Assign area of focus
pi-just jobs tag 12 emotion
pi-just jobs tag 12 cura
pi-just jobs tag 12 amministrazione
pi-just jobs tag 12 personale
pi-just jobs tag 12 lavoro

# Assign workflow state
pi-just jobs tag 12 next
pi-just jobs tag 12 waiting
pi-just jobs tag 12 someday
pi-just jobs tag 12 routine

# Assign energy
pi-just jobs tag 12 focus
pi-just jobs tag 12 execute
pi-just jobs tag 12 reflect
pi-just jobs tag 12 rest

# Assign project
pi-just jobs proj 12 WriteBook
pi-just jobs proj 12 JapanTrip

# Remove a tag
pi-just jobs untag 12 next      # e.g. move from next to waiting
pi-just jobs untag 12 focus

# Set a due date
pi-just jobs due 12 tomorrow
pi-just jobs due 12 2025-08-15
pi-just jobs due 12 eom         # end of month

# Remove the due date
pi-just jobs nodue 12

# Generic edit (any Taskwarrior modifier)
pi-just jobs modify 12 due:eom +urgent project:Work
```

## Reflect

### By Workflow State

```bash
pi-just jobs next-actions     # all ready actions (+next)
pi-just jobs waiting-list      # waiting on someone (+waiting)
pi-just jobs someday           # someday/maybe list (+someday)
pi-just jobs routine           # recurring habits (+routine)
```

### By Area of Focus

```bash
pi-just jobs emotion          # tasks in the Emotion area
pi-just jobs cura             # tasks in the Cura area
pi-just jobs amministrazione   # tasks in the Amministrazione area
pi-just jobs personale         # tasks in the Personale area
pi-just jobs lavoro            # tasks in the Lavoro area
```

### By Energy Required

```bash
pi-just jobs focus            # tasks that need deep work
pi-just jobs exec             # mechanical tasks to execute
pi-just jobs reflect          # reflection/planning tasks
pi-just jobs rest             # low-energy tasks
```

### Other Useful Reports

```bash
pi-just jobs next             # most urgent tasks (sorted by urgency)
pi-just jobs overdue          # overdue tasks
pi-just jobs active           # started but not completed tasks
pi-just jobs completed        # completed tasks
pi-just jobs projects         # project overview with task counts
pi-just jobs tags             # all tags in use
pi-just jobs calendar         # calendar with due dates
```

### Lists with Custom Filters

```bash
pi-just jobs list                          # all pending
pi-just jobs list project:WriteBook        # by project
pi-just jobs list +emotion +next           # area + state
pi-just jobs list +focus due.before:tomorrow  # energy + due date
```

### Full Details of a Task

```bash
pi-just jobs info 12          # full details + change history
```

## Engage

```bash
pi-just jobs start 12         # start working (task becomes "active")
pi-just jobs stop 12          # stop working
pi-just jobs done 12          # complete the task
pi-just jobs delete 12        # reject the task: tag +rejected, drop all other tags (no delete)
```

Add an annotation (note) to a task:

```bash
pi-just jobs annotate 12 "Sent email to Marco for clarification"
```

## Routine

Create routines with recurrence:

```bash
# Daily routine
pi-just jobs add "Meditation" +cura +routine +rest due:today recur:daily

# Weekly routine
pi-just jobs add "Weekly review" +personale +routine +reflect due:today recur:weekly
```

Taskwarrior generates future instances automatically as each due date passes.

## Export

Export tasks to JSON for programmatic processing:

```bash
pi-just jobs export                          # all pending
pi-just jobs export project:Home status:pending
pi-just jobs export +next +emotion
```

## Raw

When the abstraction doesn't cover what you need, call Taskwarrior directly:

```bash
pi-just jobs raw burndown.weekly
pi-just jobs raw 12 duplicate
pi-just jobs raw stats
pi-just jobs raw +emotion calendar
```

## Recommended Workflow

### 1. Capture
Write down everything on your mind, without categorizing:
```bash
pi-just jobs add "Generic task"
```

### 2. Clarify
Process the inbox regularly (daily or weekly):
```bash
pi-just jobs list -next -waiting -someday -routine   # tasks to clarify
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
pi-just jobs tag 12 emotion
pi-just jobs tag 12 next
pi-just jobs tag 12 focus
pi-just jobs proj 12 WriteBook
```

### 4. Reflect (Review)
- **Daily:** `pi-just jobs next` and `pi-just jobs routine` to see what to do today
- **Weekly:** `pi-just jobs someday` to review future projects, `pi-just jobs projects` for an overview
- **Monthly:** `pi-just jobs calendar` for long-term planning

### 5. Engage (Execute)
Choose based on:
- Physical context (where you are, what tools you have)
- Available time (5 min vs 2 hours)
- Mental energy (high vs low)
- Priority (urgency + importance)

```bash
pi-just jobs focus      # if you have energy and time for deep work
pi-just jobs exec       # if you have little time/energy, mechanical tasks
pi-just jobs rest       # if you're tired, light habits
```

## Contexts

Taskwarrior supports predefined contexts that filter lists automatically:

```bash
pi-just jobs context-list         # see available contexts
pi-just jobs context-set next     # activate context: show only +next
pi-just jobs context-set focus    # activate context: show only +focus
pi-just jobs context-none         # deactivate context
```

Available contexts: `next`, `waiting`, `someday`, `routine`, `focus`, `exec`, `reflect`, `rest`, `emotion`, `cura`, `amministrazione`, `personale`, `lavoro`.
