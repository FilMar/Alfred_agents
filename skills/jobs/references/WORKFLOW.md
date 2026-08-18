# Recommended GTD Workflow

The five GTD steps, mapped to the commands in SKILL.md.

### 1. Capture
Write down everything on your mind, without categorizing:
```bash
task add "Generic task"
```

### 2. Clarify
Process the inbox regularly (daily or weekly):
```bash
task -next -waiting -someday -routine list   # tasks to clarify
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
task 12 modify +emotion +next +focus project:WriteBook
```

### 4. Reflect (Review)
- **Daily:** `task next` and `task +routine list` to see what to do today
- **Weekly:** `task +someday list` to review future projects, `task projects` for an overview
- **Monthly:** `task calendar` for long-term planning

### 5. Engage (Execute)
Choose based on:
- Physical context (where you are, what tools you have)
- Available time (5 min vs 2 hours)
- Mental energy (high vs low)
- Priority (urgency + importance)

```bash
task +focus next      # if you have energy and time for deep work
task +execute exec    # if you have little time/energy, mechanical tasks
task +rest next       # if you're tired, light habits
```
