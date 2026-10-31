# Standards

Two standards, one file.

1. **Text.** How to write every text the agent produces.
2. **Checklists.** How to check the work before it leaves.

They are independent. A text can pass the style and fail a check.

This file is the only place where these rules live. A skill, a guide or a
`CLAUDE.md` points here. It does not repeat the rules.

---

# Part 1 — Text

## 1.1 Scope

This part applies to every text the agent produces:

- skill files: `SKILL.md`, scripts, references;
- reports to the user, summaries, syntheses;
- commit messages, error messages, CLI help;
- docs, README, `.design/` files, wiki pages;
- checklist files, including this one.

Three places are outside it, on purpose:

| Place | Why |
|---|---|
| Third Brain notes, `what` and `why` | The reader is a vector index. Analogy and two vocabularies help it match. `tb guide` already rules this. |
| the `if` of a Third Identity rule | It is a match key. Copy the words of the situation, do not clean them. |
| old text | No migration. Fix old text only when you touch it for another reason. |

Reason for the last one: a mass rewrite costs a lot and changes meaning by
accident. New text follows this file from today.

## 1.2 Two tiers

The tier depends on what the text does, not on the project and not on the
skill. One skill holds both tiers: its `SKILL.md` is tier hard, the report it
writes to the user is tier lite.

### Tier hard — text that orders

Use it for: steps, constraints, error messages, commit messages, script
contracts, checklist items, the `do` of a rule.

- One action per sentence. Maximum 20 words in English, 25 in Italian.
- Start an instruction with the verb: `EXECUTE`, `VERIFY`, `REMOVE`, `WRITE`.
- State a requirement with `MUST` or `DEVI`. State a ban with `MUST NOT`,
  `NON DEVI` or `VIETATO`.
- Remove these words: *forse*, *prova a*, *se possibile*, *maybe*, *try to*,
  *if possible*, *should*, *potrebbe essere utile*.
- Use the active voice.
- Use one word for one thing, every time.
- Delete greetings, preambles and closing summaries. Start with the action.

### Tier lite — text that explains

Use it for: teaching, explanations, debate syntheses, report bodies, README
prose, wiki pages, the `why` of a decision.

- Short sentences. One idea per sentence.
- Common words. Active voice.
- Keep the example. Keep the analogy when it carries the idea.
- Keep a calibrated hedge. "Usually 3-5 exchanges" is information, not noise.
  The amount in a word is part of the instruction.
- Italian: the `si` impersonale is allowed.
- The 20-word limit does not apply. `MUST` and `DEVI` do not apply.

A tier-lite text MUST NOT turn an observation into an order. "Le frasi
semplici hanno meno ambiguità" is a finding. "DEVI usare frasi semplici" is a
rule. Write the one you mean.

## 1.3 Italian and English

The split is by audience, not by file type:

- **public or shareable** — repos, skills, scripts, docs, commit messages:
  English;
- **private** — Third Brain, personal notes, `.design/`: Italian.

Italian is not a translation of English. Keep this map:

| English | Italian | Note |
|---|---|---|
| `MUST` | `DEVI` | absolute requirement |
| `MUST NOT` | `NON DEVI`, `VIETATO` | absolute ban |
| 20 words | 25 words | one Italian clause costs fewer words |
| active voice | active voice | `si` impersonale allowed in tier lite only |
| one word, one meaning | same | Italian tolerates synonyms less than English |

## 1.4 Domain words

Some words mean one thing in this repo. Write them the same way every time.
Do not translate them, do not invent a synonym:

`attrito`, `sintesi`, `[da chiarire: ...]`, `[proposta di Piano]`, killer
item, pause point, gate, review, `PASS`/`FAIL`, `tb`, `ti`, `tl`, `th`.

A skill may add its own words. List them in the skill, one line each.

## 1.5 Check the text

Two checks, different in kind.

**Mechanical — a script.** Sentence length, missing verb, banned word,
`si` impersonale in tier hard. Planned: `skills/efesto/scripts/lint_skill.py
--ste`. Not written yet — see 3.2.

**Judgment — a read.** Is the tier right for this paragraph? Is a hedge
carrying information or hiding a gap? Is an observation written as an order?
A script cannot answer these.

---

# Part 2 — Checklists

## 2.1 What a checklist is

A short list of the checks that must pass before the work moves on.

The user and the agent write it together, over time, from failures that
really happened. The agent MUST NOT generate a checklist during a run. A list
written by the one it judges approves everything it does.

## 2.2 Where it lives

One file per checklist:

```
~/.pi/agent/checklists/<name>.md
~/.pi/agent/checklists/INDEX.md     one line per checklist
```

Open decision — see 3.1.

## 2.3 Format

```markdown
# <name>

when:   <the moment this checklist applies>
mode:   READ-DO | DO-CONFIRM
point:  PRE | POST
items:  5 to 9

- [ ] <one imperative action>
      proof: <what shows the item passed>
      case:  <the real failure that added this item, date>
```

`READ-DO`: read one item, do it, go to the next.
`DO-CONFIRM`: do the work, then check the result against the list.
`PRE` / `POST`: before the work starts, or before the output leaves.

## 2.4 Rules

- **5 to 9 items.** Below 5 the list is a formality. Above 9 nobody runs it.
- **`PASS` or `FAIL`.** No third value. No "partly".
- **Every `PASS` carries a proof:** command output, `file:line`, a diff.
  An item without a proof is `FAIL`. This is the rule that keeps the
  checklist from becoming theatre.
- **An item enters only after a real failure.** Write that failure in `case`.
  An item from theory never fires.
- **If a script can check the item, write the script.** Drop the item. A
  script cannot rubber-stamp.
- **One checklist fits one screen.** `INDEX.md` fits one screen.
- **Prune.** An item that never fails after a run of uses is removed or
  rewritten. A library without pruning becomes sediment.
- **Log the result.** No trace, no pruning, no audit.

## 2.5 Two kinds

| Kind | Called by | Example |
|---|---|---|
| **gate** | a skill, at a named pause point | before `tb save`, before a commit, end of `ritchie` |
| **review** | the user, by name | release review, new project review |

Both are reusable across projects. The gate is named by the skill, the review
is named by the user.

## 2.6 Invocation

A file that nobody opens is dead. The problem is the habit, not the content.

For each recurring moment, one Third Identity rule: `if` = the moment, `do` =
run the named checklist. One rule per checklist. Not one rule per item.

## 2.7 Starter set

Build these by extraction, not by invention. The prose already exists.

| Source | Checklist |
|---|---|
| `efesto`, rules 1-3 | `skill-audit` |
| `tb guide`, section 3 | `note-save` |
| `ti guide`, section 5 | `rule-save` |
| the user's git flow | `pre-commit` |

After extraction, the source guide points to the checklist. It does not keep
the items. Two copies of one list are worse than one.

## 2.8 The two parts meet

A checklist file is tier-hard text: imperative items, `PASS`/`FAIL`, no
explanation inside an item. The reason for an item lives in `case`, one line.

---

# Part 3 — Open decisions

## 3.1 Where the checklist library lives

Proposed: `~/.pi/agent/checklists/`, so every project reaches it.
Alternative: a folder in this repo, shared through git.

Not decided. Both work. The first is simpler, the second is versioned.

## 3.2 Who runs the first migration

Not started. The order agreed:

1. run the style lint on every skill;
2. the user reads the flagged lines and decides line by line;
3. the lines kept become the exception glossary in 1.4;
4. write the mechanical check into `lint_skill.py`;
5. replace `efesto` rule 2 with a pointer to this file.

---

# Part 4 — What this file is not

This file holds rules. It holds no status, no progress log, no "done" marks.
What was built belongs in `tl`, not here.
