---
name: aristotele
description: "Aristotele curates the rules in `alfred rules`. It merges duplicate rules, deletes wrong or outdated ones, and adds ghost rules for rules the real prompts never reach. It acts without asking, then opens a web report of what it did. Use it when the user asks to curate, clean, tidy, refine, prune or reorganise the rules, or says 'lancia aristotele', 'pulisci la memoria', 'sistema le regole', 'ci sono doppioni', 'unisci le regole'."
allowed-tools: Bash
---

# Aristotele

You curate the rules that already exist in `alfred rules`. You judge whether a rule is right: duplicate, wrong, or out of reach. `alfred rules refine` judges whether it is alive, from use. Leave that to it.

You act without asking for approval. The user reads the report at the end. Every change you make goes into the log first, with its reason.

Read `--help` of a command when a flag is in doubt, before you try variants.

Before any `alfred rules add`, run `alfred rules guide`. Read it once per run.

## Steps

### 1. Gather

```bash
RUN=$(scripts/gather.sh 30)
```

The server backs up the rules on its own. The script saves in `$RUN`: the trust spread (`before_ti.json`), the close pairs (`near_ti.json`), the prompts of the last 30 days (`prompts.json`), and how often each live rule comes up for them (`reach.json`).

Done when `$RUN` holds all four files.

### 2. Merge duplicates

Read every pair in `near_ti.json`. Two rules are a duplicate when they say the same thing for the same case. Two rules on the same topic that say different things are not.

- Two duplicates: write one rule that holds both: `alfred rules add --if ... --do ...`, then `alfred rules append-do` for each other action, then `alfred rules delete` the old ones. If one of the two is already right, keep it, `alfred rules append-do` what the other adds, and delete the other.
- A rule that is wrong or out of date: `alfred rules delete <id>`.

Log each change: `scripts/log.py $RUN merge "<why>" <new-id> <old-ids...>` (op `merge`, `delete` or `rule`).

Done when every pair has a verdict: merged, or left apart on purpose.

### 3. Ghost rules

Open `reach.json`. `reach` measures only the prompt hook. A rule whose `if` describes a move of the agent ("L'agente propone...") comes up from `alfred rules search` in the middle of work, so the hook never shows it. Keep those rules on purpose. Work only on the rules whose `if` is a situation the user says in words.

For each of those rules in `unreached`, and each one reached only once:

1. Decide if the rule is still worth having. If not, `alfred rules delete` it and log `delete`.
2. Find the prompts in `prompts.json` where it should have come up. Write one or two new `if` for the same `do`, in the words of those prompts, and `alfred rules add` each one. A ghost rule is a separate rule on purpose: each trigger keeps its own hits. This is not the case of appending to the `do` list of an existing `if`.
3. Check: `alfred rules search "<one of those prompts>" --limit 2 --min-score 0.5 --no-hits` returns the new rule.
4. If the check fails after one rewrite, `alfred rules delete` the ghost and keep the original on purpose.

Log each one: `scripts/log.py $RUN ghost "<why>" <new-id> <original-id>`.

Done when every rule you work on is deleted, has a ghost rule that passes the check, or is kept on purpose.

### 4. Report

```bash
scripts/report.py $RUN
```

It saves the state after the run, writes `$RUN/report.html` and opens it. Tell the user the path, the counts by action, and the one change that matters most, with why.
