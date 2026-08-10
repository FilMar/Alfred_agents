---
name: linus
description: "Manages GitHub for Emotion-SRL via gh through a justfile abstraction layer. Handles issues, the SVILUPPO Project V2 (status, size, assignment), and gives a recap of project state, open PRs, and branches across all org repos. Use it for issues, project status, moving items in the SVILUPPO board, a recap of open work, listing PRs or branches, or any other GitHub management task for Emotion-SRL. Use it even if the user does not mention gh or the project by name."
---

# Linus

Linus manages GitHub for Emotion-SRL through a `justfile` that wraps the `gh` CLI. Always use the recipes in this skill's `justfile` instead of calling `gh` directly. The justfile handles the SVILUPPO project configuration, status option IDs, and cross-repo iteration for you.

## Context

- **Organization**: Emotion-SRL
- **Project**: SVILUPPO (Project V2, number 4)
- **Status flow**: Backlog → Ready → In progress → Testing → Done
- **Sizes**: XS, S, M, L, XL

## Issues

Create an issue and automatically add it to SVILUPPO with status=Backlog:

```bash
pi-just linus issue-create server_api "Fix invoice calculation"
pi-just linus issue-create-body server_api "Fix invoice" "Detailed description here"
```

List and view issues:

```bash
pi-just linus issue-list server_api           # open issues in one repo
pi-just linus issue-list-all                  # all open issues across the org
pi-just linus issue-view server_api 42        # full details
```

Manage issues:

```bash
pi-just linus issue-close server_api 42
pi-just linus issue-assign server_api 42 FilMar
pi-just linus issue-label server_api 42 bug
pi-just linus issue-comment server_api 42 "Working on this"
```

## Project SVILUPPO

List all items with their status, repo, and assignee:

```bash
pi-just linus proj-list
```

Filter by status:

```bash
pi-just linus proj-by-status "In progress"
pi-just linus proj-by-status Backlog
pi-just linus proj-in-progress              # shortcut
```

Move an item to a new status (accepts case-insensitive names):

```bash
pi-just linus proj-move PVTI_lADOBGn_Wc4BZ0EczgvCCyk "In progress"
pi-just linus proj-move PVTI_lADOBGn_Wc4BZ0EczgvCCyk Done
```

Set size on an item:

```bash
pi-just linus proj-size PVTI_lADOBGn_Wc4BZ0EczgvCCyk M
pi-just linus proj-size PVTI_lADOBGn_Wc4BZ0EczgvCCyk XL
```

Add an existing issue to SVILUPPO (defaults to Backlog):

```bash
pi-just linus proj-add server_api 42
```

## Recap

The headline feature. Shows a complete picture of the work state:

```bash
pi-just linus recap
```

This outputs three sections:
1. **Status breakdown** — item count per status column, with a visual bar, plus the list of items currently In progress
2. **Open pull requests** — all open PRs across Emotion-SRL repos, with repo, number, title, author, and last update
3. **Open branches** — all non-main/master branches across repos

For partial views:

```bash
pi-just linus prs              # open PRs only
pi-just linus branches         # open branches only
pi-just linus repos            # all repos in the org
```

## Escape hatch

When the abstraction doesn't cover what you need:

```bash
pi-just linus raw repo view Emotion-SRL/server_api
pi-just linus raw api repos/Emotion-SRL/server_api/branches
```