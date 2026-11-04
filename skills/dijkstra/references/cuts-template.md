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
      "id": "D3", "tipo": "cerimonia", "cosa": "via gli assert che non possono fallire",
      "dove": "tools/td/src/candidate.ts", "delta": -4,
      "cerimonia": {"funzioni": [{"nome": "NoteCandidate.create", "via": ["text is a string"], "restano": 2}]}
    },
    {
      "id": "D5", "tipo": "default", "cosa": "6 Server partono da DEFAULTS",
      "dove": "src/servers.ts", "delta": -40,
      "matrice": {"oggetto": "new Server", "campi": ["host", "port"], "righe": [["localhost", 8080], ["localhost", 8081]]}
    },
    {"id": "D6", "tipo": "morto", "cosa": "via TAGS_MAX, nessuno la usa", "dove": "tools/td/src/candidate.ts:12", "delta": -1}
  ]
}
```

Every cut has `id`, `tipo`, `cosa`, `dove` and `delta` (the net line
change, callers included). It has at most one view:

- `stampo`: two or more copies of similar code, read from the files by
  line range (1-based, inclusive). tree-sitter finds the holes. `dopo`
  is the proposed code. `chiamata` is one call or table row, with the
  hole numbers (①, ②, ...) as arguments; without it, `chiamanti` lists
  the call sites. `involucro` wraps each copy when the grammar cannot
  parse it alone, such as a TypeScript method.
- `cerimonia`: per function, the asserts that go (`via`) and how many
  stay (`restano`).
- `matrice`: many near-equal constructions. Each row has one value per
  field; the script finds the defaults.

A cut with no view is one line with its checkbox: dead code, a weak
test, a redundant check.
