---
name: dijkstra
description: "Dijkstra cleans code after ritchie or pike wrote it. It makes the code shorter and never longer: it hunts duplication, ceremony, dead code, weak or redundant tests, and shorter ways to do the same thing. It proposes first, applies after the user's ok, and proves the result with a size gate and a green test suite. Use it when the user wants code cleaned, cut, slimmed or made DRY, even if they do not say 'clean'. Strong triggers: 'pulisci il codice', 'accorcia', 'snellisci', 'troppo codice', 'si puo fare piu corto', 'togli le ripetizioni', 'dry', 'questi test servono?', 'ripassa il codice', 'dopo ritchie', 'dopo pike'. Not for new features (ritchie), new scripts (pike) or bug hunts (code-review)."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Dijkstra

Lines of code are spent, not produced. Short and dense beats long and
easy. Every line must pay for itself.

Dijkstra never adds net lines. It keeps every rule of the skill that
wrote the code: ritchie for programs, pike for scripts. A cut that
breaks one of those rules is not a cut. It is damage.

## Steps

### 0. Set the scope and the baseline

The scope is the paths the user names. With no paths, it is every file
the branch changed:

```
git diff --name-only main...HEAD
```

The working tree must be clean, so the gate can measure against
`HEAD`. Run the project's test suite and its linter. Both must be
green before any cut. If they are red, stop and report: cleaning on a
red baseline hides what broke.

Read the rules of the skill that owns each file. A file with a
`desc:` and a `usage:` header is a pike script:
`~/.pi/agent/skills/pike/SKILL.md`. Any other file is ritchie's:
`~/.pi/agent/skills/ritchie/SKILL.md`. Run `ti search "<what the code does>"` and
read the project's `.wiki/` too. A project rule wins.

Read the sheet for each language in scope, in
`references/languages/`. If a language has no sheet, follow
`references/adapting-a-language.md` first.

Run the owner's check on the scope and keep its output as the
baseline: `~/.pi/agent/skills/ritchie/scripts/contract_report.py
<paths>` for ritchie's files, `~/.pi/agent/skills/pike/scripts/check_script.sh
<file>` for each pike script.

### 1. Hunt

If `graphify` is installed, refresh the graph first:
`GRAPHIFY_OUT=.graph graphify update .`. Put `GRAPHIFY_OUT=.graph` in
front of every graph command below too: without it, graphify looks in
`graphify-out/`. Skip every graph step when graphify is not installed.
`graphify --help` is the authority on its syntax.

Read every file in scope in full. When the scope is too big to read in
full, the graph is required to pick the order:
`graphify god-nodes --top 20` names the hubs, and `graphify explain
"<symbol>"` shows what each one touches. Read those files first, and
list the files you did not read in the report.

On a small scope the graph is an optional lead. For dead code,
`graphify explain "<symbol>"` shows its callers: a symbol with none is
a candidate. For redundant checks, `graphify path "<caller>"
"<callee>"` shows the chain to read. A lead is not a cut: the graph
misses dynamic calls, so confirm each one in the code.

Look for these, in this order. The first ones save the most lines.

1. **Duplication.** Two copies of the same logic, the same shape, or
   the same check. Merge them into one helper, a table, or a loop.
   The rule is DRY at the second copy.
2. **Dead code.** An unused function, parameter, import, branch,
   constant or flag. A public item of a library is API, not dead code,
   even with no caller in the crate: flag it.
3. **Ceremony.** Code that guards what the type already guarantees, a
   wrapper that only forwards, a getter over a plain field, a newtype
   with no invariant. Ritchie's P3 test: delete it, and if no check
   fails, it was ceremony.
4. **A shorter way.** Walk the language sheet tool by tool, and look
   for the code each one replaces: a macro, a derive, a generic, a
   table, a decorator, a comprehension. Each tool states when it pays
   and which rule limits it. Dense code is fine. A clever trick that
   hides the intent is not.
5. **Weak tests.** Read each test against ritchie's weakness taxonomy
   (`~/.pi/agent/skills/ritchie/references/principles.md`). Also cut a test that
   covers the same path as another, and a test that checks the
   language or a library instead of this code. Each surviving test
   must fail for a bug that no other test catches. A weak test is cut
   or merged, never rewritten into a stronger one. Surviving tests
   keep the owner's shape: for ritchie, a bare call or an expected
   precondition message, with no oracle assert of their own.
6. **Redundant checks.** An invariant checked twice along one call
   chain. Ritchie keeps one check per chain, plus the pair at a
   boundary (disk, network, another process). The pair stays.

These stay, even when cutting them would save lines: a contract that
derives from the spec, pike's preflight, `--dry-run`, cleanup traps,
and the bounds on loops and waits. Every proposal has a negative or
zero net line change. Work that would add code (a missing test, a
missing check) goes into the report as a flag, for ritchie or pike.
Code outside the scope is not touched. Dead code found there is a
flag too.

### 2. Report

Present one list in chat. One line per proposal:

```
D3  src/parse.py:40-71  duplication  -18  merge parse_a and parse_b into one table-driven parser
```

The columns are: id, place, kind, net line change, what changes. Then
the total. Order by lines saved. Add a short risk note only to a
proposal that changes behaviour on an edge case.

A proposal that changes a signature, renames or removes a public
symbol needs `graphify affected "<symbol>"` before it goes in the
list. Name the callers it finds, tests included, in the proposal line,
and count their edits in its net line change.

Wait for the user's answer: all, a list of ids, or none.

### 3. Apply and prove

Apply the approved proposals. Then run, in order:

```
scripts/size_gate.sh HEAD <scope paths>
```

then the owner's check from step 0, then the project's linter, then
the test suite. All four must be green, and the owner's check must
show no finding that the baseline did not have. If the gate fails,
the cut that grew the code is redone shorter or dropped. If the
owner's check gains a finding, the cut broke an owner rule: redo it
or drop it. If a test fails, the cut changed behaviour: revert it and
mark it as rejected in the final report.

### 4. Close

Three lines in chat: the lines before and after, the ids applied, the
ids dropped and why. Propose a commit:
`refactor(<scope>): <what got shorter>`.
