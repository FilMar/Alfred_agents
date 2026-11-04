# Review template

`review.json` is written in step 3, in the project root, in Italian. It
holds only what no script knows. `scripts/render_page.py` draws it next
to the spec laid over the graph, so coverage of the spec is the graph
itself: green, yellow, red, grey.

```json
{
  "scostamenti": [{"testo": "<cosa è stato fatto diversamente, e perché>", "su": ["<Nome>"]}],
  "derive": [{"contratto": "<firma e contratto>", "da": "<spec o regola>", "principio": "<P1–P7>"}],
  "giri": ["<il commento dell'utente a ogni giro; l'ultimo vale>"],
  "metriche": "<l'output di contract_report.py, verbatim>",
  "test": {"passati": 0, "falliti": 0, "nuovi": 0},
  "mutanti": [{"mutazione": "<cosa è cambiato>", "ucciso": true}]
}
```

- `scostamenti` is never skipped. An empty list is valid. Each line
  names in `su` the entities it is about, and the page shows it there.
- `derive`, `giri`: an empty list is valid.
- `metriche`, `test`, `mutanti`: copied from the script and runner
  output. A failed test or a surviving mutant shows in red.

`overlay.py` marks a link red only when it sits on a line the work
changed, so draw the page while the diff is still open. Without
graphify, pass `spec.json` to `render_page.py` as it is: the page shows
the spec and the review, with no states.
