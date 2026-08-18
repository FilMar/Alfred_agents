---
name: linus
description: "Manages GitHub for Emotion-SRL via gh. Handles issues, the SVILUPPO Project V2 (status, size, assignment), and gives a recap of project state, open PRs, and branches across all org repos. Use it for issues, project status, moving items in the SVILUPPO board, a recap of open work, listing PRs or branches, or any other GitHub management task for Emotion-SRL. Use it even if the user does not mention gh or the project by name."
---

# Linus

Linus manages GitHub for Emotion-SRL. It calls `gh` directly, and uses the
scripts in `scripts/` for the actions that chain more than one `gh` call.

## Context

- **Organization**: Emotion-SRL
- **Project**: SVILUPPO (Project V2, number 4), project ID `PVT_kwDOBGn_Wc4BZ0Ec`
- **Status field ID**: `PVTSSF_lADOBGn_Wc4BZ0EczhUwJEU`
- **Size field ID**: `PVTSSF_lADOBGn_Wc4BZ0EczhUwJRk`
- **Status flow**: Backlog → Ready → In progress → Testing → Done
- **Sizes**: XS, S, M, L, XL

## Issues

Create an issue and add it to SVILUPPO with status Backlog (issue create,
project item-add, item-edit — three chained calls):

```bash
scripts/issue_create.sh server_api "Fix invoice calculation"
scripts/issue_create.sh server_api "Fix invoice" "Detailed description here"
```

List and view issues:

```bash
gh issue list --repo Emotion-SRL/server_api --state open
gh issue view 42 --repo Emotion-SRL/server_api
```

List all open issues across the org:

```bash
gh search issues --owner Emotion-SRL --state open \
    --json repository,number,title,updatedAt \
    --jq '.[] | "\(.repository.nameWithOwner)#\(.number)\t\(.title)\t\(.updatedAt[0:10])"' \
    | column -t -s $'\t'
```

Manage issues:

```bash
gh issue close 42 --repo Emotion-SRL/server_api
gh issue edit 42 --repo Emotion-SRL/server_api --add-assignee FilMar
gh issue edit 42 --repo Emotion-SRL/server_api --add-label bug
gh issue comment 42 --repo Emotion-SRL/server_api --body "Working on this"
```

## Project SVILUPPO

List all items with their status, repo, and assignee:

```bash
gh project item-list 4 --owner Emotion-SRL --format json | python3 scripts/proj_list.py
```

Filter by status:

```bash
gh project item-list 4 --owner Emotion-SRL --format json | python3 scripts/proj_by_status.py "In progress"
gh project item-list 4 --owner Emotion-SRL --format json | python3 scripts/proj_by_status.py Backlog
```

Move an item to a new status. Pick the option ID for the target status from
the table below, then run the edit:

```bash
gh project item-edit --id PVTI_lADOBGn_Wc4BZ0EczgvCCyk --project-id PVT_kwDOBGn_Wc4BZ0Ec \
    --field-id PVTSSF_lADOBGn_Wc4BZ0EczhUwJEU --single-select-option-id <option-id>
```

| Status | option-id |
|---|---|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| Testing | `df73e18b` |
| Done | `98236657` |

Set size on an item. Pick the option ID from the table, then run the edit:

```bash
gh project item-edit --id PVTI_lADOBGn_Wc4BZ0EczgvCCyk --project-id PVT_kwDOBGn_Wc4BZ0Ec \
    --field-id PVTSSF_lADOBGn_Wc4BZ0EczhUwJRk --single-select-option-id <option-id>
```

| Size | option-id |
|---|---|
| XS | `6c6483d2` |
| S | `f784b110` |
| M | `7515a9f1` |
| L | `817d0097` |
| XL | `db339eb2` |

Add an existing issue to SVILUPPO with status Backlog (item-add, item-edit —
two chained calls):

```bash
scripts/proj_add.sh server_api 42
```

Create a draft item directly in SVILUPPO, not linked to any repo issue,
status Backlog (item-create, item-edit — two chained calls):

```bash
scripts/proj_draft_create.sh "Title" "Body text"
```

## Recap

The headline feature. Shows a complete picture of the work state: status
breakdown with in-progress items, open PRs, and open branches across every
repo in the org. It chains a project query, a PR search, and a per-repo
branch loop:

```bash
scripts/recap.sh
```

`recap.sh` calls `scripts/recap_status.py` for the status breakdown and
`scripts/branches.sh` for the branch loop.

For partial views:

```bash
gh search prs --owner Emotion-SRL --state open \
    --json repository,number,title,author,updatedAt \
    --jq '.[] | "\(.repository.nameWithOwner)#\(.number)\t\(.title)\t@\(.author.login)\t\(.updatedAt[0:10])"' \
    | column -t -s $'\t'

scripts/branches.sh              # open branches, looping over every repo in the org

gh repo list Emotion-SRL --limit 100 --json name,visibility,updatedAt \
    --jq '.[] | "\(.name)\t\(.visibility)\t\(.updatedAt[0:10])"' | column -t -s $'\t'
```

## Escape hatch

When this skill doesn't cover what you need, call `gh` directly:

```bash
gh repo view Emotion-SRL/server_api
gh api repos/Emotion-SRL/server_api/branches
```

## Known issue

`issue_create.sh` and `proj_draft_create.sh` pass title and body unquoted
through a shell variable. An apostrophe in the text (e.g. "tower's") is
safe now, since the scripts use double quotes, but test a new value once
if it contains other shell metacharacters like `` ` `` or `$`.
