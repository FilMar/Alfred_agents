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
just issue-create server_api "Fix invoice calculation"
just issue-create-body server_api "Fix invoice" "Detailed description here"
```

List and view issues:

```bash
just issue-list server_api           # open issues in one repo
just issue-list-all                  # all open issues across the org
just issue-view server_api 42        # full details
```

Manage issues:

```bash
just issue-close server_api 42
just issue-assign server_api 42 FilMar
just issue-label server_api 42 bug
just issue-comment server_api 42 "Working on this"
```

## Project SVILUPPO

List all items with their status, repo, and assignee:

```bash
just proj-list
```

Filter by status:

```bash
just proj-by-status "In progress"
just proj-by-status Backlog
just proj-in-progress              # shortcut
```

Move an item to a new status (accepts case-insensitive names):

```bash
just proj-move PVTI_lADOBGn_Wc4BZ0EczgvCCyk "In progress"
just proj-move PVTI_lADOBGn_Wc4BZ0EczgvCCyk Done
```

Set size on an item:

```bash
just proj-size PVTI_lADOBGn_Wc4BZ0EczgvCCyk M
just proj-size PVTI_lADOBGn_Wc4BZ0EczgvCCyk XL
```

Add an existing issue to SVILUPPO (defaults to Backlog):

```bash
just proj-add server_api 42
```

## Recap

The headline feature. Shows a complete picture of the work state:

```bash
just recap
```

This outputs three sections:
1. **Status breakdown** — item count per status column, with a visual bar, plus the list of items currently In progress
2. **Open pull requests** — all open PRs across Emotion-SRL repos, with repo, number, title, author, and last update
3. **Open branches** — all non-main/master branches across repos

For partial views:

```bash
just prs              # open PRs only
just branches         # open branches only
just repos            # all repos in the org
```

## Escape hatch

When the abstraction doesn't cover what you need:

```bash
just raw repo view Emotion-SRL/server_api
just raw api repos/Emotion-SRL/server_api/branches
```