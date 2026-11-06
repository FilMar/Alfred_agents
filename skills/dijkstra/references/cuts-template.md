# cuts.json

One file per run, in `${TMPDIR:-/tmp}`. Keys are fixed; values are in
Italian. `scripts/cut_holes.py` checks the shape and stops on a missing
key.

```json
{
  "scope": "tools/td",
  "tagli": [
    {
      "id": "D1", "tipo": "duplicazione", "cosa": "i due #withTags diventano cutTags",
      "dove": "tools/td/src/candidate.ts", "delta": -9,
      "stampo": {
        "lingua": "typescript",
        "involucro": ["class X {", "}"],
        "copie": [
          {"nome": "NoteCandidate.#withTags", "file": "tools/td/src/candidate.ts", "righe": [80, 89]},
          {"nome": "RuleCandidate.#withTags", "file": "tools/td/src/candidate.ts", "righe": [140, 149]}
        ],
        "dopo": "function cutTags(...) {\n  ...\n}",
        "chiamanti": ["tools/td/src/candidate.ts:95 cutTags(evidence, ...)"]
      }
    },
    {
      "id": "D3", "tipo": "cerimonia", "cosa": "via gli assert isUnique che non possono fallire",
      "dove": "2 funzioni", "delta": -2,
      "codice": {
        "lingua": "typescript",
        "pezzi": [
          {"nome": "TagVocabulary.known", "file": "tools/td/src/candidate.ts", "righe": [86, 100], "via": [98]},
          {"nome": "TagVocabulary.proposed", "file": "tools/td/src/candidate.ts", "righe": [102, 118], "via": [115]}
        ]
      }
    },
    {
      "id": "D4", "tipo": "test debole", "cosa": "kindOf copre lo stesso percorso di criticPrompt",
      "dove": "tests/td_critic.test.ts", "delta": -4,
      "codice": {"lingua": "typescript", "pezzi": [{"nome": "kindOf", "file": "tests/td_critic.test.ts", "righe": [182, 185]}]}
    },
    {
      "id": "D5", "tipo": "default", "cosa": "6 Server partono da DEFAULTS",
      "dove": "src/servers.ts", "delta": -40,
      "matrice": {"oggetto": "new Server", "campi": ["host", "port"], "righe": [["localhost", 8080], ["localhost", 8081]]}
    },
    {
      "id": "D6", "tipo": "morto", "cosa": "via TAGS_MAX, nessuno la usa", "dove": "tools/td/src/candidate.ts", "delta": -1,
      "codice": {"lingua": "typescript", "pezzi": [{"nome": "TAGS_MAX", "file": "tools/td/src/candidate.ts", "righe": [12, 12], "simbolo": "TAGS_MAX"}]}
    }
  ]
}
```

Every cut has `id`, `tipo`, `cosa`, `dove` and `delta` (the net line
change, callers included).

One cut is one decision. The same change in many places is one cut,
and its view lists every place. `dove` then names the count, such as
"4 file". A stamp is the exception: one cut holds one stamp.

A cut has at most one view:

- `stampo`: two or more copies of similar code, read from the files by
  line range (1-based, inclusive). tree-sitter finds the holes. `dopo`
  is the proposed code. `chiamata` is one call or table row, with the
  hole numbers (①, ②, ...) as arguments; without it, `chiamanti` lists
  the call sites. `involucro` wraps each copy when the grammar cannot
  parse it alone, such as a TypeScript method.
- `codice`: the code that goes, read from the files so the user can
  judge it. Each piece is a line range. `via` lists the lines that go;
  without it, the whole piece goes. A weak test is the whole test. An
  assert that cannot fail is its whole function, with the assert lines
  in `via`. Dead code and a redundant check use it too.
  `simbolo` asks for the proof that a symbol is dead. The script runs
  `rg -w` on the repo and `graphify explain <file>::<simbolo>`. It
  shows every hit outside the cut and every caller in the graph. "Non
  nel grafo" proves nothing. Any hit turns the proof red.
- `matrice`: many near-equal constructions. Each row has one value per
  field; the script finds the defaults.
