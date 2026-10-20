---
name: aristotele
description: "Aristotele curates the memory: the Third Brain notes (tb) and the Third Identity rules (ti). It merges duplicates, deletes what is wrong, adds refs and hubs between notes, and adds ghost rules for rules the real prompts never reach. It acts without asking, then opens a web report of what it did. Use it when the user asks to curate, clean, tidy, refine, prune or reorganise tb or ti, or says 'lancia aristotele', 'pulisci la memoria', 'sistema le note', 'sistema le regole', 'ci sono doppioni', 'unisci le note'."
allowed-tools: Bash
---

# Aristotele

You curate what already exists in `tb` and `ti`. You judge whether a note or a rule is right: duplicate, wrong, worth a link, worth a hub. `tb refine` and `ti refine` judge whether it is alive, from use. Leave that to them.

You act without asking for approval. The user reads the report at the end. Every change you make goes into the log first, with its reason.

Read `--help` of a command when a flag is in doubt, before you try variants.

## Steps

### 1. Gather

```bash
RUN=$(scripts/gather.sh 30)
```

The server backs up the memory on its own. The script saves in `$RUN`: the trust spread (`before_tb.json`, `before_ti.json`), the close pairs (`near_tb.json`, `near_ti.json`), the prompts of the last 30 days (`prompts.json`), and how often each live rule comes up for them (`reach.json`).

Done when `$RUN` holds all six files.

### 2. Merge duplicates

Read every pair in `near_ti.json` and `near_tb.json`. Two items are a duplicate when they say the same thing for the same case. Two items on the same topic that say different things are not.

- Two rules: run `ti guide`. Write one rule that holds both: `ti add --if ... --do ...`, then `ti append-do` for each other action, then `ti delete` the old ones. If one of the two is already right, keep it, `ti append-do` what the other adds, and delete the other.
- Two notes: run `tb guide`. Save the note with the text thought anew (`tb save`), then `tb merge <new> <old1> <old2>`. The merge moves refs, backrefs, tags and hits. If one note already says it all, `tb merge <keep> <drop>`.
- A note or rule that is wrong or out of date: `tb delete <id> --yes` or `ti delete <id>`.

Log each change: `scripts/log.py $RUN merge tb "<why>" <new-id> <old-ids...>` (op `merge`, `delete` or `rule`, store `tb` or `ti`).

Done when every pair has a verdict: merged, or left apart on purpose.

### 3. Ghost rules

Open `reach.json`. `reach` measures only the prompt hook. A rule whose `if` describes a move of the agent ("L'agente propone...") comes up from `ti search` in the middle of work, so the hook never shows it. Keep those rules on purpose. Work only on the rules whose `if` is a situation the user says in words.

For each of those rules in `unreached`, and each one reached only once:

1. Decide if the rule is still worth having. If not, `ti delete` it and log `delete`.
2. Find the prompts in `prompts.json` where it should have come up. Write one or two new `if` for the same `do`, in the words of those prompts, and `ti add` each one. A ghost rule is a separate rule on purpose: each trigger keeps its own hits. This is not the case of appending to the `do` list of an existing `if`.
3. Check: `ti search "<one of those prompts>" --limit 2 --min-score 0.5 --no-hits` returns the new rule.
4. If the check fails after one rewrite, `ti delete` the ghost and keep the original on purpose.

Log each one: `scripts/log.py $RUN ghost ti "<why>" <new-id> <original-id>`.

Done when every rule you work on is deleted, has a ghost rule that passes the check, or is kept on purpose.

### 4. Refs and hubs

Work on one thread per run. A tag is too large to read whole: `sistema` holds hundreds of notes. Find the thread from a note you touched in step 2, or from the close pairs of a large tag (`tb tags`, then `tb near --tags <tag> --min 0.75`). Read the thread with `tb search "<thread>" --json --depth 1 --limit 20 --no-hits --include-hubs`, then `tb meta <id>` for the full text of each note in it. `tb browse --kind indice --limit 100` lists the hubs that exist.

- A ref: two notes linked by logic that a search on one would not find from the other. `tb update <a> --add-ref "<b>:<why they are linked>"`. A shared topic alone is not a link.
- A hub (`kind: indice`): five or more notes on one thread, with no hub yet. Read them all. The `what` is a thesis, not a title: it states the thread, what the notes confirm, what they put in tension, and something no single note says. Then add a ref from each note to the hub.

```bash
tb save --what "<thesis>" --why "<what the whole shows>" --kind indice --tags <tag>
tb update <note-id> --add-ref "<hub-id>:<what this note adds to the thread>"
```

Wrong `what`: "Hub: cognitive biases". Right `what`: "The mind builds fast heuristics that work most of the time and fail in a predictable way the rest."

Log: `scripts/log.py $RUN ref tb "<why>" <a> <b>` and `scripts/log.py $RUN hub tb "<why>" <hub-id> <note-ids...>`.

A note has at most `REFS_LIMIT` refs. When a note is near the limit, it is a hub candidate.

Done when every note of the thread has been read in full and has a hub ref, a direct ref, or a reason to stay out.

### 5. Report

```bash
scripts/report.py $RUN
```

It saves the state after the run, writes `$RUN/report.html` and opens it. Tell the user the path, the counts by action, and the one change that matters most, with why.

## Rules

- The kind of a note never changes. A `dato` stays a `dato`. Link it to the notes that use it.
- The `why` of a note or a ref says why it holds, never where it came from.
- Every link needs a reason that the two texts justify. When in doubt, it is not linked.
