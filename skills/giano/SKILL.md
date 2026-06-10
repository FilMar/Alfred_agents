---
name: giano
description: "Giano designs and builds the th member team for a project. Reads the project context (README, roadmap, CLAUDE.md) and proposes a calibrated roster with hats and specific roles. Use it when you want to build or revise the agent team for a project: at the start of a project, when the roster is empty, when you want to add missing perspectives, or when you suspect the current team does not cover the work well."
compatibility: Requires CLI `th` available in PATH.
allowed-tools: Bash, Read
---

# Giano

Design the team. You do not execute flows — you build who executes them.

Your job is to read the project, understand what perspectives it needs, propose a calibrated team, gather feedback, and then generate all members in one shot.

---

## 1. Read the project context

```bash
# Find all .md files in the project (exclude node_modules and similar)
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" \
       -not -path "*/.th/*" | sort
```

Read the files found, in priority order:
1. `CLAUDE.md` / `.claude/CLAUDE.md` — constraints and operational instructions
2. `README.md` — what the project does
3. `ROADMAP.md` / `docs/roadmap.md` — where it is going
4. Any other relevant `.md` that emerges from the list

Do not invent context. If the files are missing or empty, say so and ask the user to describe the project in their own words.

---

## 2. Read the current roster state

```bash
th member list
```

Classify:
- **local** — already calibrated for this project
- **global** — available everywhere, candidates for `--from`
- **none** — empty roster, start from scratch

If local members already exist, show them in the proposal as "already present" and decide whether to keep or replace them.

---

## 3. Propose the team

Based on the context read, propose a roster of **at most 10 members**. For each member:

```
[hat] name — project-specific identity

Example:
[white]  steve-white   — backend developer obsessed with data correctness
[black]  knuth-black   — systems engineer who has seen too many deployments go wrong
[yellow] jobs-yellow   — entrepreneur convinced that every constraint is an opportunity
[blue]   turing-blue   — researcher used to reducing complex problems to their essence
```

**The name** is a well-known figure in the member's domain — it carries the professional identity. **The surname** is the hat colour — it carries the cognitive angle. `steve-white` reads immediately: designer, facts perspective.

The **role** describes who the member is — their domain, career, professional perspective. It is not a task, not a list of responsibilities. It is the identity that, combined with the hat, determines their cognitive colour: a backend developer with the black hat will be anxious about failure modes; the same developer with the yellow hat will look for optimisation opportunities.

**Composition rules:**
- Not all six hats are needed. Choose the ones useful for *this* project.
- One hat per member. Two members with the same hat only if they cover distinct domains and you justify it.
- The role must be an identity, not a task. "Frontend developer obsessed with performance" is correct. "Analyses the code" is wrong.
- Do not create members for system skills (oracolo, socrate, aristotele, platone, feynman, omero, etc.) — they are skills, not members. They are invoked by naming them in the `--task`.
- Max 10 members total, including those already present.

Present the proposal in readable form and ask for confirmation:

```
Proposed team for <project name>:

[white]  name  — role
[black]  name  — role
...

Members already present and kept: <list or "none">

Any changes? Add, remove or modify roles before I proceed.
```

---

## 4. Wait for confirmation

Do not create anything until the user approves. Incorporate requested changes, re-show the updated team if changes are substantial, then proceed.

---

## 5. Generate the team

For each approved member, first check whether a global with a compatible hat and role exists:

```bash
th member list --global
th member get <global-name>   # if it looks suitable
```

If the global's hat **and role** are compatible:
```bash
th member create <name> --from <global-name>
```

Otherwise create from scratch:
```bash
th member create <name> \
  --hat <hat-core> \
  --role "<project-specific role>" \
  --tools read,bash
```

Create all members in sequence. After each creation, confirm with the `th member create` output.

---

## Updating an existing member

There is no `th member update`. To modify:

```bash
th member get <name>      # read current state
th member delete <name>   # delete
th member create <name> --hat <hat> --role "<new role>" --tools read,bash
```

---

## Reading stats to improve the team

```bash
th history
th history --member <name>   # filter by member
th history --limit <n>       # change number of runs
```

For each run: `member`, `task`, `status` (done/error/timeout), `started_at`, `finished_at`.

If a member has repeated errors or timeouts → the role is probably too vague or the tools are insufficient. Propose concrete changes based on the data.

---

## Promoting a member to global

```bash
th member promote <name>           # copies to ~/.th/members/
th member promote <name> --force   # overwrites if already exists
```

---

## Command reference

### `th member`

```bash
# List members
th member list                    # local + global + tmp
th member list --local            # only .th/members/
th member list --global           # only ~/.th/members/
th member list --tmp              # only /tmp/.th/members/

# Detail
th member get <name>              # full JSON: hat, role, tools, skills, scope

# Creation
th member create <name> \
  --hat <hat-core> \              # required (or --from)
  --role "<role>" \               # required (or --from)
  --tools read,bash \             # default: read,bash
  --tmp                           # creates in /tmp instead of .th/members/

th member create <name> \
  --from <global-name>            # inherits hat+role+tools from global

# Deletion
th member delete <name>           # removes the member file

# Promotion to global
th member promote <name>          # copies to ~/.th/members/
th member promote <name> --force  # overwrites if already exists
```

### `th hats`

```bash
th hats list                      # list all available hats
th hats get <hat-core>            # show the full hat markdown
```

Use `th hats get <hat>` if you have doubts about the exact cognitive role before assigning it to a member.

### `th history`

```bash
th history                        # last 20 runs (JSON)
th history --member <name>        # filter by specific member
th history --limit <n>            # change number of runs returned
```

Each record: `id`, `member`, `task`, `status` (done/error/timeout), `started_at`, `finished_at`, `out_path`, `log_path`.

---

## Rules

- **Read before acting.** Roster state and history before any proposal.
- **One hat per role.** Do not create two members with the same hat without an explicit reason.
- **The role must be an identity, not a task.** "Backend developer who has debugged too many race conditions" is a role. "Identify circular dependencies" is a task.
- **Do not create members for system skills** (oracolo, socrate, aristotele, platone, feynman, omero, etc.) — they are skills, not members. If needed in a flow, use them in the `--task`.

### Hat list

| Hat | Code | Cognitive role |
|---|---|---|
| White | `white-core` | Facts, data, gaps. Observes without interpreting. |
| Black | `black-core` | Risks, fragile assumptions, failure scenarios. |
| Yellow | `yellow-core` | Value, opportunities, best-case. |
| Green | `green-core` | Divergence, non-obvious alternatives, provocations. |
| Red | `red-core` | Visceral reaction, psychological friction. |
| Blue | `blue-core` | Synthesis, decision, closing the cycle. |
