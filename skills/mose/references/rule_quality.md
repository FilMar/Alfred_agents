# Rule quality

The bar for a rule in Third Identity (`ti`). Every skill that saves a rule follows this file. The text of a rule is written in Italian. This file is in English.

`tb` answers "what is true?". `ti` answers "what do I do now?". A rule is procedure. Knowledge goes to `tb`.

## 1. Who runs the rule

The executor is the agent, not the user. A rule is one an LLM agent can apply while it works: writing code, designing, estimating, configuring, producing text. The agent has no memory of past sessions and cannot ask questions. It reads the `if`, retrieves the rule and follows the `do`.

Habits, sleep, in-person talk and other personal-life protocols are not rules. The agent never meets those situations. They stay in `tb`.

## 2. The `if`: a situation

The `if` is a situation the agent can notice itself in, in the middle of a task. It is not a topic or a category.

- **Situation, not topic.** "Si configura un sistema multi-agente" works. "Sistemi multi-agente" does not.
- **One context per rule.** If the `if` holds "o" or "e anche", split it into two rules. One clean context makes retrieval precise.
- **Concrete enough to fire, general enough to recur.** Not a project setting ("si usa Ollama con Qdrant qui"). Not everything ("si lavora con agenti").
- **Recognition test.** Read the `if` in the middle of work. Can you say "I am in this situation now" without judgment or background knowledge? If not, rewrite it.

## 3. The `do`: an order

- **Start with a verb.** "Implementa", "Scrivi", "Chiedi", "Non permettere".
- **Verifiable.** A reviewer can say "followed" or "not followed". "Fai attenzione" leaves no trace. "Non permettere scrittura diretta senza checkpoint umano" does.
- **A dry order, no reason.** No "perché…". The reason is knowledge and lives in `tb`. If the order needs its reason to be followed, the `if` is not sharp. Fix the `if`. Do not pad the `do`.
- **Self-contained.** No "come detto sopra". No reference to a conversation, a person, a team member or a session. The rule is read alone, years later.
- **Tool routing is prime material.** Orders about the agent's own tools fire in every session: when to call `tb`, `ti`, `th`, a skill, a bash pattern. Save them whenever a session settles which tool handles which situation.

## 4. What is not a rule

| candidate | goes to |
|---|---|
| a fact or mechanism | `tb`, kind `dato` or `sintesi` |
| a value statement ("l'osservabilità è importante") | drop, or extract the action it implies |
| a one-off project decision | `.wiki/` |
| a personal-life protocol | stays in `tb` |
| vague advice ("considera i trade-off") | drop |
| a rule that names a specific `th` member | route the delegation through the orchestrator instead: members are project roster, not identity |
| a real "in situation X, do Y" that recurs across projects | `ti` |

Final test: doing it and not doing it must look different. If they look the same, it is not a rule.

## 5. Check before saving

Search first. Read the rules that come back, not only their scores.

```bash
ti list                                            # once per window: the tag vocabulary
ti search "<draft context>" --limit 5 --min-score 0.5
```

For each close rule, decide:

- **Same context, same action.** Nothing to do.
- **Same context, new action that adds.** `ti append-do <id> --do "<action>"`, not a new rule.
- **Overlapping contexts.** Sharpen the new `if` until the two situations differ, or merge them. Merge only when the two are one situation. Split when the `if` holds two.
- **The new rule denies the old one.** Same situation, opposite order. Replace it, see section 6.

No confirmation step. The anatomy and the checks are the gate. A rule that fails is dropped, not held for review. When in doubt, drop it: a wrong rule steers every later retrieval.

## 6. A rule that denies an older one

The newer correction wins. Do this, in order:

1. **Write the lesson to `tb`, first.** The old rule is about to be deleted, and its text goes with it. Save one note that says what the old rule ordered, what the new rule orders, and why the old one was wrong. Give it the origin exchange. The note follows `note_quality.md` in full.
   ```bash
   tb save --what "<old order vs new order, as a general lesson>" --why "<why the old one failed>" \
     --kind attrito --tags <tag> --status provvisoria --exchange "<id of the correcting exchange>"
   ```
   If the lesson is only a project detail and fails the note bar, skip the note. The new rule still carries the exchange.
2. **Delete the old rule.**
   ```bash
   ti delete <old-id>
   ```
3. **Add the new rule**, with `--exchange <id of the correcting exchange>`.

Delete only when the two rules give opposite orders in the same situation. A rule that is only narrower, wider or adds an action is a case of section 5.

## 7. Save

```bash
ti add --if "<context>" --do "<action>" --tags <tag> --tags <tag> [--exchange "<tl exchange id>"]
```

- **Language.** `if` and `do` in Italian.
- **Tags.** `--tags` is a repeatable flag, one tag per flag. Lowercase singular nouns. At most 3. Reuse the vocabulary of `ti list` before inventing. A tag is a filter, not a taxonomy: pick the ones someone would filter by.
- **`exchange`.** The id of the `tl` exchange that holds the evidence. It is the way back to the raw text.

## 8. Rules from `tl`

The only way in is a correction. The user rejects what the agent did and says what to do instead: "no, fai così", "non farlo più", "sempre X quando Y". One clear correction is enough.

- **No rule from silence.** Do not infer a rule from repeated plain work. A pattern with no correction stays in `tl`. `ti` has no usage counter, so a rule saved on a guess cannot fade by itself.
- **The `if`** is the situation the agent was in when it was corrected.
- **The `do`** is the correct action.
- **Cross-project only.** A project-specific correction is not a rule.
- **A repeated correction** of an existing rule is not new. Add the action with `append-do` if it is new. Do nothing if it is the same.
- **A correction that denies a rule** follows section 6.

Nothing to save is the normal result of a window.
