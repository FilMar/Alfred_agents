# td: neighbours, novelty, save, active mode

Spec and decision log. The code is checked against it.
Files: `src/neighbours.ts`, `src/novelty.ts`, `src/save.ts`, `src/distiller.ts`, `src/session.ts`.

## Goal

`td` runs in active mode: it saves new notes and rules to `tb` and `ti`, and sets `distilled` in `tl`. It replaces erodoto.

## Principles

- P1. State has one owner. `Outcome` owns its verdict and saved id. `SessionList` owns the session list. `Budget` owns the save counter. Save is the only writer to `tb`, `ti` and `distilled`.
- P2. The contract is the boundary. Save crosses the disk: it writes, then reads back.
- P5. A broken store, a 429 or a bad JSON is a world error. It is a return value. The session stays pending.

## Decisions

1. No cosine cut. Phase 2a only searches neighbours. `Outcome.nearIdentical` and `NEAR_IDENTICAL` lose their callers. They are flagged, not deleted.
2. The unit of `distilled` is the session. Every pending exchange of the session read (kept turns and noise) gets `distilled = recorder.run()`, an ISO-8601 UTC time (the `tl` check wants that shape). Only when the split, every extraction, every critic call, every novelty call and every save went well. Else nothing is closed and the session is redone from the start next time. Phase 2b turns the repeats into `duplicate`, because it sees what `tb` already holds.
3. `td distill` with no argument takes every session with pending exchanges. `td distill <session>` stays. `--active` turns Save on. `--max-saved <n>` caps the writes of one run. Without `--active`, nothing is written to `tb`, `ti` or `distilled`.
4. `ref_only` saves nothing. A ref needs two notes, and a `ref_only` candidate makes none. It is recorded in `extractions` only. (Found while writing the code. The table in the first spec said "ref only": it had no note to link from.)
5. A candidate whose critic call failed stays open and unjudged. It is a failure of the session: the session is not closed.

## Domain

- **Neighbours (9)**: knows `topK` and the two searches. Reads only. Does not know the model.
- **Novelty (10)**: knows the kept candidates of one exchange, their neighbours, the items saved earlier in the session. One call per exchange. The model picks from fixed sets and never writes an id. Code maps the integer back to a key.
- **SessionList**: owns the items saved earlier in the session. Only `add` changes it.
- **Save (11)**: knows the verdict and the mode. Does not know what is new. Only it writes to `tb`, `ti` and `distilled`.
- **Budget**: owns the count of writes in one run.
- **Distiller (13)**: conducts. Keeps no state except the `SessionList` of the session it runs and the `Budget` of the run.

## Invariants of the domain

- Active mode saves only an item that passed the checks, the critic and Novelty.
- Every saved item carries the exchange id it came from.
- Shadow mode writes only to `extractions`.
- An item is written at most once per run. A write that does not happen because of the cap is a failure, not silence.
- A session is closed only when it had no failure.

## Facts the contracts do not carry

### neighbours.ts

- `neighbourOfNote(note)`: `{ id: note.id, kind: "note", text: note.what }`.
- `neighbourOfEntry(entry)`: `{ id: entry.id, kind: "rule", text: "SE <if> ALLORA <do joined with '; '>" }`.
- `queryOf(candidate)`: a note is searched by its `what`, a rule by its `if`.
- `neighboursOf(candidate, topK)`: a note: `searchNotes(query, { depth: 0, limit: topK, record_hits: false })`, each result's `.note` through `neighbourOfNote`. A rule: `searchEntries(query, { limit: topK })`, each through `neighbourOfEntry`. `record_hits: false` is a must: the search must not write. A store error is not caught here: it throws. `decideTarget` catches it.

### novelty.ts

- `candidateText`: a note `<what> | perché: <why>`. A rule `SE <if> ALLORA <do>`.
- `savedText`: a note `<what>`. A rule `SE <if> ALLORA <do>`.
- `SessionList.add(kind, text, id)`: key is `id` when given, else `session:<position before the add>`. Appends. Returns the new item. `items()` returns a copy.
- `noveltyPrompt(candidates, known)`: lines joined with `\n`:
  `## Candidates`, then one line `C<k> (<kind>): <candidateText>` per candidate, an empty line, `## Neighbours`, then one line `N<k> (<kind>): <text cut to KNOWN_TEXT_CHARS>` per known item. Then `\n\nUse the integer after C as \`cand\` and the integer after N as \`of\`.` at the end.
- The model answers `{"verdicts":[{"cand":0,"verdict":"new","of":3,"reason":"...","do":"...","adds":"...","adds_is_new_idea":true}]}`. `of` is the integer after N. Only `cand` and `verdict` are always there.
- `verdictsCheck(json, candidates, known)` returns the first of these errors, else null (null exactly when the json is a good list):
  - not a record with a list `verdicts`: `need list \`verdicts\``
  - the `cand` values are not each of 0..n-1 once: `need exactly one verdict per cand 0..<n-1>`
  - `cand k`, verdict not in the model set of its kind: `cand <k>: verdict must be one of <sorted set joined with ', '>`
  - `cand k`, verdict not `new` and `of` not an integer in 0..known.length-1: `cand <k>: \`of\` must be a neighbour id 0..<known.length-1>`
- `settle(json, candidates, known)` returns the verdicts sorted by `cand`. For each: `verdict` is the model's, except:
  - note `extends` with `adds` missing or blank becomes `duplicate`
  - note `extends` with `adds` not blank but `adds_is_new_idea` not true (the value `true`, or the text `"true"` in any case) becomes `ref_only`
  - rule `append` with `do` missing or blank becomes `duplicate`
  `of` is `known[of].key` when the model's verdict is not `new`, else null (even if the model gave one). `adds`, `reason`, `do` are the trimmed string, or null when missing, not a string or blank.
- `judgeNovelty(candidates, known, extractor)`: no candidate: no call, `{ answer: null, verdicts: [] }`. Else one `ModelCaller.ask(extractor.novelty(), noveltyPrompt(...), (json) => verdictsCheck(json, candidates, known))`. An ok answer gives `settle(answer.json(), ...)`, a failed one gives no verdict.

### save.ts

- `Budget.take()`: spent already: false, nothing changes. Else spent + 1, true. `Budget.of(null)` is never spent.
- `actionOf(kind, verdict)` outcome table:

| kind | verdict | action |
|---|---|---|
| note | new | create |
| note | extends | create_ref |
| note | contradicts | create_ref |
| note | ref_only | nothing |
| note | duplicate | nothing |
| rule | new | add_rule |
| rule | append | append_do |
| rule | duplicate | nothing |

- `saveItem(candidate, verdict, exchangeId, mode)`: shadow, or action `nothing`: `{ savedId: null, failure: null }`. Else a note goes to `saveNote`, a rule to `saveRule`.
- `saveNote`:
  - `createNote({ what, why, kind, tags: [...tags, ...proposedTags], exchange: exchangeId, status: "provvisoria" })` from the note candidate json.
  - Then read it back with `getByIds([note.id])`. Not found: `{ savedId: null, failure: "..." }`.
  - `create_ref` also calls `addRefs(note.id, [{ id: verdict.of, reason, origin: "td" }])`. The reason is `verdict.adds` for `extends`, `verdict.reason ?? "contradicts"` for `contradicts`. If `verdict.of` starts with `session:`, the ref is skipped (that item was never stored).
  - Any thrown error is caught and becomes `failure` (the message). If the note was created before the error, `savedId` is its id.
- `saveRule`:
  - `add_rule`: `addEntry(if, do, [...tags, ...proposedTags], exchangeId)`, read back with ti `getPointById(entry.id)`. `savedId` is the entry id.
  - `append_do`: `appendDo(verdict.of, verdict.do)`, `savedId` is `verdict.of`. If `verdict.of` starts with `session:`, nothing is written: `{ null, null }`.
  - Any thrown error is caught and becomes `failure`.
- `closeExchanges(ids, run)`: for each id in order `markDistilled(id, run)`, then `fetchExchange(id).distilled === run`. The first error or mismatch stops the loop and is returned as a message. All good: null.

### distiller.ts

- `judgeablesOf(report)`: the outcomes are the notes first, then the rules, in the order of `report.extraction`. Outcome `i` belongs to `extraction.notes[i]`, or to `extraction.rules[i - notes.length]`. A judgeable is an outcome that is open and has probabilities (the critic judged it). Its candidate is the kept candidate at that index.
- `knownFor(neighbours, listed)`: the neighbours without repeats of `id` (first one wins), each as `{ key: id, kind, text }`, then `listed` as it is.
- `decideItems(distiller, exchangeId, outcomes, judgeables, verdicts, list)`: for each judgeable `k`, in order:
  - the outcome `at` becomes `outcome.decided(verdict, of)`.
  - If the mode is active and `actionOf(kind, verdict)` is not `nothing`: if `budget.take()` is false, add the failure `cap: --max-saved reached` (once) and do not write. Else `saveItem(...)`. A `savedId` goes to `outcome.saved(id)`. A `failure` goes to `failures` as `save: <failure>`. Every result goes to `saves`.
  - A note with verdict `new`, `extends` or `contradicts`, and a rule with verdict `new`, is added to the list: `list.add(kind, savedText(candidate), savedId)`. In shadow `savedId` is null.
  - Shadow never touches the budget and never calls `saveItem`.
- `decideTarget(distiller, target, report, list)`:
  - `judgeablesOf(report)`. An outcome open and not judged adds the failure `critic failed`.
  - No judgeable: return `{ ...report, decision }` with the failures only.
  - Neighbours: `neighboursOf(candidate, extractor.topK())` for each judgeable. A thrown error becomes the failure `neighbours: <message>` and the result has no verdict.
  - `known = knownFor(all neighbours, list.items())`.
  - `judgeNovelty(...)`. A failed answer adds the failure `novelty: <failure>` and nothing is decided.
  - Else `decideItems(...)`. The result is `{ ...report, outcomes: decided.outcomes, decision: { answer, verdicts, saves, failures } }`.
- `sessionFailures(split, exchanges)`: `split failed` when the map is null. `extraction failed: <exchange id>` for each exchange whose extraction answer is not ok. Each failure of each exchange `decision.failures`, as it is.
- `closeSession(distiller, read, split, exchanges)`: `failures = sessionFailures(...)`. Shadow, or any failure: `{ closed: [], failures }`. Else `closeExchanges(ids of read.turns() then read.noise(), distiller.recorder.run())`. A returned message becomes the failure `close: <message>` and `closed` is empty. Else `closed` is those ids.
- `distillAll(distiller, sessions)`: for each session in order: stop when `distiller.budget.isSpent()`. `SessionRead.read(session)`. Skip it when it has no turn. Else `distillSession`. Returns the reports.

### session.ts

- `pendingSessions()`: `fetchExchanges({ distilled: false, limit: PENDING_SESSIONS_CAP })`, the distinct `session` values in order of first appearance. The count of exchanges must be below the cap (assert in the body, with a message).

## How the tests reach the edges

Tests import `./helpers/td_stubs.ts`:

- `startMemoryStubs()`: in-memory Qdrant and Ollama. Sets `QDRANT_URL` and `OLLAMA_URL`. Returns `{ collections, failPath(fragment | null), stop() }`. `failPath("/points")` makes every Qdrant request whose path contains it answer 500, until `failPath(null)`. Seed with the real functions: `createNote` from `tools/tb/src/notes.ts`, `addEntry` from `tools/ti/src/identity.ts`. Search is by cosine of a word-hash embedding: identical words, high score.
- `startTlStub()`: a real `tl` app on an in-memory db. Sets `TL_API_URL`. Returns `{ handle, stop() }`. Seed with `db.upsertSession(handle, { id, started })` and `db.upsertExchange(handle, exchange)` from `tools/tl/src/db.ts`.
- `startModelStub()`: returns `{ port, queue, stop() }`. Push one text per model call into `queue`. The call consumes one text.
- Set the env, then import the modules under test with `await import(...)`, as the stubs read the env on each call.
- Exchange ids: `exchangeId(SESSION, "message-1")` from `tools/tl/src/types.ts`. An exchange: `{ id, session, timestamp, kind: "chat", actor: "alfredo" }`, contents `{ exchange_id, input, output }`, a turn is `Turn.of(exchange, contents)` from `src/session.ts`.
- A candidate: `NoteCandidate.fromModel({ what, why, kind: "attrito", tags: ["architettura"], contexts: ["a", "b"], quote })`, `RuleCandidate.fromModel({ if, do, tags, quote })`, from `src/candidate.ts`.
- An outcome: `Outcome.ofNote(Checked.kept(candidate))`, `Outcome.ofRule(...)`, then `.judged({ is_textbook_definition: 0.1 }, null)`. `Checked` is in `src/candidate.ts`, `Outcome` in `src/recorder.ts`.
- The extractor config for `Extractor.fromJson`, and `Version.add(extractor, null, "first", NOW)`:

```ts
const connection = { provider: "ollama", id: "glm-5.3-flash", api: "openai-completions",
  baseUrl: `http://localhost:${model.port}/v1`, reasoning: true,
  compat: { supportsDeveloperRole: false }, contextWindow: 128000, maxTokens: 8192 };
const role = { connection, thinking: "low", temperature: 0.1, system: "You extract notes." };
const extractor = Extractor.fromJson({
  episodes: role, extract: role, critic: role, novelty: role,
  checks: [
    { name: "is_textbook_definition", text: "A manual already says this.", kind: "note", dropWhen: "atLeast", threshold: 0.6 },
    { name: "is_user_rejection", text: "The user rejected something.", kind: "rule", dropWhen: "under", threshold: 0.4 },
  ],
  episodeChars: 4000, targetInputChars: 6000, targetOutputChars: 8000, listingChars: 300, vocabularySize: 80, topK: 5,
});
```

- `distillerOf(version, NOW, mode, maxSaved)` reads the tag vocabulary from the `third-brain` collection: seed one note with tags first. Model replies in the order the distiller consumes them: split, extraction, one critic per kept candidate, then the novelty verdicts of the exchange.
- Pure functions get tables and edge values. Functions with I/O get a few bare calls with stubs and one failure case each (`failPath`).

## Rules for the bodies

- No callback with a block body (no `return` inside an arrow function): the body checker reads it as an early return. Use expression arrows, or a plain `for` loop.
- Write no helper function: only the `todo` lines change.

## Out of scope

New tags in the extraction prompt. Tag synonym guard. Decay of `provvisoria` notes. Repeats inside one session beyond the session list. Phase 3 bridges. Episode index. Deleting `Outcome.nearIdentical`.
