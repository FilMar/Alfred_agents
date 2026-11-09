# Spec template

`spec.json` is written in step 1, in the project root. Keys are fixed.
Values are in Italian: the spec is the domain in the user's words, and
the user is Italian.

One short line per value. Drop the optional fields this domain does not
need. The user does not read this file: `scripts/spec_page.sh` draws it
as a page, next to the skeleton, and the user looks at the page.

```json
{
  "feature": "<feature>",
  "entita": [
    {
      "id": "<Nome>",
      "codice": ["<folder/ or file it will live in>"],
      "stato": "<cosa contiene>",
      "fa": "<cosa fa>",
      "non_fa": "<cosa non fa>",
      "serve_a": "<chi la usa e per cosa>",
      "comanda": ["<Nome di un'altra entità>"]
    }
  ],
  "flussi": [
    {"da": "<Nome>", "a": "<Nome>", "passa": "<cosa passa>", "torna": "<cosa torna, o null>"}
  ],
  "invarianti": [
    {"testo": "<regola che vale sempre>", "su": ["<Nome>"]}
  ],
  "fatti": ["<un fatto che i contratti non portano, per le run th>"]
}
```

- `codice`: paths from the repo root. A file or a folder. `null` when
  the entity lives outside the repo. Two entities may share one file:
  then the graph tells them apart by the symbol that matches `id`.
- `cli` and `comandi` (optional): the command an entity runs as, and
  its subcommands, such as `"cli": "tb"`, `"comandi": ["search"]`.
  They let `overlay.py` find calls that graphify cannot see.
- `su`: the entities an invariant binds. The page puts a badge on each.
- `fatti`: optional. See `tests-and-body.md`, step 1.
- Every name in `da`, `a`, `comanda` and `su` is an `id` of `entita`.
  `render_page.py` stops on a name it does not know.

## The round

`spec_page.sh` runs `code_view.py`, which reads the changed files under
the `codice` paths and colours them with `code_paint.py`. Then it runs
`render_page.py`. The page has two tabs: Schema and Codice.

1. The user clicks a line in Codice, writes a comment, and copies all the
   comments into chat. Each comment is a question.
2. Answer each one in chat. Update the spec and the skeleton.
3. Draw the page again. Repeat until the user says "ok".

On "ok", freeze what was agreed. The review compares the code with it:

```
scripts/code_view.py --spec spec.json --freeze concordato.json
```
