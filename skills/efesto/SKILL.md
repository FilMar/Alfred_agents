---
name: efesto
description: "Use this skill to create, write, review, or fix a skill (SKILL.md + scripts/ + references/) in this repo. Covers: turning a workflow or idea into a new skill; auditing or improving an existing skill; checking a skill against the three core rules — predictability, English-only easy-English text, and the direct-CLI scripts convention; migrating a skill off its old justfile; running a skill for a real test; packaging a skill to share. If the user is talking about a skill as something to make, fix, review, standardize, migrate, test, or package — use this skill."
---

# Efesto

Efesto creates and audits skills. A skill is a folder with three parts:

- `SKILL.md` — the instructions. It is a router: it keeps only what every
  run needs, and it calls the real CLI directly.
- `scripts/` — optional. One executable file per deterministic multi-step
  sequence. Every script describes itself with a `# desc:` header.
- `references/` — optional. One file per deep-dive topic. `SKILL.md`
  links to them; read one only when the task needs it.

Commands below use paths relative to this skill's folder. Resolve them
against the base directory shown when the skill loads.

Every skill Efesto touches — new or old — must pass three rules. They are
the whole audit; nothing else in this skill matters more.

## Steps

### Create a skill

1. **Understand the intent.** What should the skill let the agent do? When
   should it trigger? What does a good result look like? If the user is
   turning an existing conversation into a skill, pull the steps, the
   corrections, and the input/output shapes from that conversation first.
   Don't make the user repeat what already happened.
2. **Check for an existing skill first.**
   ```
   python3 scripts/roster.py
   ```
   A duplicate skill is the same failure mode as a duplicate rule inside
   one skill. Say it once. Extend the existing skill, or point to it,
   instead of writing it twice.
3. **Look outside for a precedent, when the task is common enough that
   someone else has likely built it** (a language's test runner, a common
   CLI wrapper, a well-known workflow):
   ```
   skills-cli search "<task keywords>"
   skills-cli info <skill-name>
   ```
   `info` prints the full `SKILL.md` of one registry result — read it for
   the shape and the trigger phrasing, not to copy verbatim. Inspiration,
   not obligation: skip it for anything narrow or repo-specific.
   Research only — nothing gets installed.
4. **Draft `SKILL.md`.** Frontmatter: `name`, `description` (the trigger —
   see "Writing the description" below). Body: the steps the agent
   follows, in order, each with a clear completion criterion, calling the
   real CLI directly. When a step needs long task-specific detail, move
   that detail to a file under `references/` and link it from the step.
5. **Draft `scripts/`, if needed.** Write a script for a sequence that is
   multi-step, deterministic, and reused the same way every run. A single
   CLI call stays as prose in `SKILL.md`. Follow the script contract in
   Rule 3.
6. **Run the audit** (Reference, below) against all three rules. Fix what
   fails.
7. **Test it for real**:
   ```
   scripts/test_skill.sh <skill_path> "<realistic task>"
   ```
   This runs the skill in a throwaway `th` member, inside a bwrap
   sandbox: only the current directory, `~/.pi`, `~/.bun`, and `/tmp`
   are writable. A write failure elsewhere is the sandbox at work, not a
   bug in the skill.
8. **Ask the user to look at the result** and tell you what's wrong. Fix,
   retest, repeat until they're satisfied.

### Improve an existing skill

1. Read the current `SKILL.md`, `scripts/` and `references/` in full.
2. Run the audit against all three rules — this alone often finds most of
   what needs fixing.
3. Add whatever the user is asking for, then re-run the audit — a fix for
   one rule can break another (e.g. a new example written in Italian).
4. Test it for real, same as step 7 above.

### Migrate a skill off its justfile

The justfile layer is retired. Follow `references/MIGRATION.md` step by
step.

### Package a skill

```
python3 scripts/package_skill.py <skill_path> [<output_dir>]
```

### Writing the description

The `description` field makes the agent trigger the skill on its own.
Write it a little "pushy": name the skill's job, then list the phrasings
and situations that should trigger it. Include cases where the user
doesn't name the skill directly. A description that only states what the
skill does, and never says when to reach for it, under-triggers.

## Reference: the three rules

Run these three checks on every skill, in this order — 1 and 2 are
judgment, 3 has a script.

### Rule 1 — Predictability

A skill exists to make the agent take the same *process* every run, not
the same output. Read the skill once for structure, once for prose, and
check it against these failure modes:

- **Sprawl** — the skill is too long, even if every line is true and
  unique. Fix: move material the agent only needs *sometimes* into a
  linked file under `references/`, and point to it from `SKILL.md`. Keep
  in `SKILL.md` only what every run needs: the steps, and reference
  every branch reads.
- **Sediment** — old instructions nobody removed because deleting felt
  risky. Fix: for every line, ask "does this still bear on what the skill
  does?" — if not, delete it, don't soften it.
- **Duplication** — the same rule or fact stated in more than one place.
  Fix: say it once, and point to that one place from everywhere else.
  Script descriptions live in the `# desc:` headers — `SKILL.md` points
  at the scripts, it does not re-describe them.
- **No-op** — an instruction the model already follows by default, costing
  context for nothing (e.g. "be thorough" — the model already tries to
  be). Fix: cut it, or replace it with a sharper word (e.g. "exhaustive").
- **Negation** — "never do X" pulls X into the model's attention and makes
  it *more* likely, not less. Fix: state the wanted behaviour instead of
  the unwanted one. Keep a "never" only as a hard guardrail, and always
  pair it with what to do instead.
- **Premature completion** — a step gets cut short because the steps after
  it are visible and pull attention toward being done. Fix: first sharpen
  that step's completion criterion (cheap); only if that's not enough,
  split the sequence so the later steps are out of view.

For the full vocabulary behind these checks (predictability, information
hierarchy, leading words, and more), see `references/GLOSSARY.md` — read
it when a term above needs the fuller definition, not by default.

### Rule 2 — English-only, easy English

Every skill file (`SKILL.md`, scripts, reference files, commit messages)
is written in English, easy-English style:

- Short sentences. One idea per sentence.
- No subordinate clauses where two sentences would do.
- Common words over Latinate ones ("use" not "utilize", "fix" not
  "rectify").
- Active voice ("the script reads the file", not "the file is read by the
  script").
- No idioms — they don't translate and they don't parse reliably.

This applies to anything public or shareable. The Third Brain and
personal notes stay in Italian — the split is by audience, not by file
type, and skills are always on the public side of it.

### Rule 3 — Direct CLI + scripts

`SKILL.md` calls the tools it needs directly — `tb`, `ti`, `th`, `gh`,
whatever the skill is about. The prose and the CLI meet with no layer in
between: one source of truth, nothing to keep in sync. The CLI's
`--help` is the authority on syntax; the skill, on procedure. When a
command fails or a flag is in doubt, read `--help` before trying
variants — each skill states this once near its commands.

Deterministic sequences are the one exception. When a step is multi-step,
fixed-order, and reused the same way every run, it becomes one executable
file under `scripts/`, and `SKILL.md` calls that file. Scripts call the
pure CLI too.

The script contract:

- executable, with a shebang line;
- a `# desc: <one line>` header in the first 5 lines (`// desc:` in JavaScript);
- a `# usage: ...` header when it takes arguments;
- bash scripts set `set -euo pipefail` and validate their arguments.

The threshold cuts both ways: a sequence reused identically belongs in a
script; a script that wraps a single command gets deleted and its command
inlined in `SKILL.md`.

The list of a skill's scripts is computed from the headers, so it cannot
go stale. Check the contract with `lint`:

```
scripts/list_scripts.sh <skill_path>          # list scripts + descriptions
python3 scripts/lint_skill.py [<skill_path>]  # no arg: every skill in the repo
```

`lint` flags a leftover `justfile`, a `just`/`pi-just` call in a code
block, a script with no `# desc:` header, a `SKILL.md` reference to a
missing script, a script `SKILL.md` never mentions, invalid frontmatter
(via `validate.py`), and a `SKILL.md` long enough to need a
`references/` split. `lint` cannot see rule 1 or rule 2 — those need a
read, not a grep.

## Communicating with the user

People with very different backgrounds use this skill. Write for the
person in front of you. If you are not sure they know a term like
"frontmatter" or "shebang", explain it in a short phrase.
