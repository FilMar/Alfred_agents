# Note quality

The bar for a note in the Third Brain (`tb`). Every skill that saves a note follows this file. The text of a note is written in Italian. This file is in English.

The sections run in order: worth, write, check, fields, purity.

## 1. Worth saving

A concept is valid only if it meets all three:

- **Atomic.** One idea per note.
- **Why.** The idea makes sense alone. Do not save what was done. Save why the solution works.
- **Useful beyond the task.** It helps in a situation other than the current one.

## 2. Write it simply

- **Twelve-year-old test.** Rewrite the idea for a 12-year-old, in plain words.
- **Mechanism, not label.** Say how it works. A name alone explains nothing.
- **No jargon.** Explain a needed technical term at once, in simple words. Drop a word that only sounds smart.
- **A puzzle piece.** Start with an everyday image: a queue, a kitchen, a bridge. Then say the mechanism in one sentence, in words that belong to no single project. Keep the real technical term once, inside the mechanism, so a search by that term finds the note.
- **Two-context test.** Name two unrelated situations where the note helps. With only one, the note is a project detail. Widen it or drop it.

## 3. Check before saving

Run these once per window, then per note:

```bash
tb tags                                          # once: the tag vocabulary
tb search "<key concept>" --limit 5 --no-hits    # per note: the closest notes
```

`--no-hits` keeps the usage counter clean.

Read the notes that come back, not only their scores. For each one, decide: it agrees, it contradicts, or it is unrelated.

- **Same idea.** Score 0.9 or more, and the two notes say the same thing: drop the new note. If it adds a real angle, add a ref to the old note instead.
- **Different idea.** Score below 0.9: save it. Add a ref to each close note that shares a real mechanism.
- **Contradiction.** The new note says the opposite of an existing one. Never drop it as a duplicate, at any score: opposite claims on one topic score high. Save it as `attrito` and add a ref to the contradicted note:
  ```bash
  tb update <new-id> --add-ref "<old-id>:contraddice: <what each says, where they differ>"
  ```
  Do not edit or delete the old note. The network checks consistency, not truth. An old false note can make a new true one look wrong. Record the conflict and leave the judgment to the curator.
- **A note without a source loses.** If it contradicts a note that has a source, it does not win. Save it as `attrito` and say in `why` that the sourceless side is the weak one.

No confirmation step. The filters and the checks are the gate. A note that fails is dropped, not held for review. Nothing to save is a normal result.

## 4. Fields

```bash
tb save --what "<idea>" --why "<reason>" --kind <kind> \
  --tags <tag> --tags <tag> --status provvisoria \
  [--exchange "<tl exchange id>"] [--source "<origin>"]
```

`--tags` is a repeatable flag, one tag per flag. It is not a comma-separated string.

- **`what`.** The idea as a puzzle piece, in Italian. A reader must understand it in ten years, without the session logs.
- **`why`.** Why the idea matters, apart from the current debate. Italian.
- **`status`.** Always `provvisoria`. A note becomes `promossa` only through use, never through the skill that saves it.
- **`kind`.** Exactly one. `indice` is a curation node, not an atomic note: only a curation pass creates it, never a skill that extracts notes. `tb save` defaults to `dato`, so always pass the kind.
  - `dato`: a finding, observed mechanism or fact, from a study, a systematic observation or a measurement. It can be narrative. It must have an origin (see `source`).
  - `protocollo`: something you can do. An "if A then B" procedure or a routine.
  - `sintesi`: a bridge between at least two different domains that the source did not make. If the source already says it, it is not a synthesis.
  - `attrito`: an unresolved tension, a paradox, a limit of a model, or a contradiction between two notes.
  - `configurazione`: a decision made, a preference, a chosen setup.
  - From books and research, most notes are `dato` or `protocollo`. Use `sintesi` only when the bridge is yours. Limits and exceptions of a model are often the best `attrito`.
- **`tags`.** Run `tb tags` first. Reuse before inventing. Lowercase singular nouns. Domain level: not `fear-of-judgment`, not `mind`. At most 3, chosen to discriminate best.
- **`exchange`.** When the note comes from `tl`, the id of the exchange that holds the evidence. Always fill it. It is the way back to the raw text.
- **`source`.** See section 5.

## 5. The source of a datum

`source` is the real origin of the datum: the book, the video, the article, the study. It is not the place where the datum was found.

- **Book or essay:** `"Author — Title"`.
- **Web page or video:** the direct URL.
- **Second-hand.** A blog cites a study. If the study is reachable, the source is the study. If not, the source is the blog, and `why` says: reported by it, original not checked.
- **Never reconstruct a source from memory.** A fact the agent "knows" with no known origin has no source.
- **Session work.** Leave `source` empty and fill `exchange`.

The origin of a datum sets how it is saved:

| origin | fields | treatment |
|---|---|---|
| external source | `source` | full datum |
| measurement or observation from the work, in `tl` | `exchange`, numbers in `what` | full datum, the proof is reachable |
| no origin (agent memory, "they say") | none | see below |

A claim with no origin is never `kind: dato`.

- If it holds as an idea (a mechanism that stands by reasoning), save it as `sintesi` or `protocollo`. Write `what` with a verb that does not assert: "si ipotizza", "secondo un ragionamento non verificato".
- If its value is the fact or the number, and it cannot stand without a source, drop it. A note that looks like knowledge but has no origin keeps coming back in search results.

## 6. Purity of the text

Zero tolerance. A note holds none of these:

- names of team members;
- hats, colors or roles;
- process fragments: "sintesi del dibattito", "dopo la discussione è emerso", "risultato dello scontro tra X e Y";
- references to the user: "come richiesto", "in risposta a Filippo".

## 7. The bridge

After the last save of a window, run `tb random`. It returns a random note. Ask if a real connection exists between it and the note you saved. Look for the truth, not for an answer that fits.

- **A connection exists.** Write it in one precise sentence and add the ref, with no confirmation:
  ```bash
  tb update <new-note-id> --add-ref "<random-id>:<reason>"
  ```
- **None exists.** Do not force it. Move on.

The content of both notes must support the bridge. Free association is not enough.
