---
name: draghi
description: Draghi imports bank export CSVs into a running personal expense ledger and computes trends and summaries. Use it when the user wants to import a new bank statement, log a month of spending, see how spending moves over time, compare yearly totals by category, or get spending data ready for an atlante chart. Trigger phrases include "importa l'estratto conto", "aggiungi le spese del mese", "quanto ho speso", "confronta le spese con l'anno scorso", "trend spese", "spese per categoria", "import bank statement", "expense summary".
compatibility: needs uv and just. Reads and writes files inside the essays repo (default ~/git_projects/essays, override with the ESSAYS_ROOT env var).
---

# Draghi

Draghi keeps one running ledger of personal spending: `.bank.csv` at the
root of the essays repo. Every recipe reads or writes that one file.

## Ledger schema

`date` (ISO yyyy-mm-dd), `amount` (float, negative = expense, positive =
income), `category`, `description`, `description_full`, `source_year`.

## Steps

1. **Import a new bank statement.** The user downloads a CSV export from
   the bank, in the official format (`Data_Operazione,Data_Valuta,
   Entrate,Uscite,Descrizione,Descrizione_Completa,Stato,Moneymap`, with
   metadata rows before the header). Run:
   ```
   just -f ~/.claude/skills/draghi/justfile import <file.csv>
   ```
   This appends the parsed rows to `.bank.csv`. It warns, but does not
   block, on a row that looks like a duplicate of one already in the
   ledger. If a row has both `Entrate` and `Uscite` set, it asks
   interactively which one to keep. This is the only recipe used
   routinely, once a month or so.

2. **One-time legacy migration.** Only if `essays/bank/spese2021.csv` or
   `spese2022.csv` still exist and have not been migrated yet:
   ```
   just -f ~/.claude/skills/draghi/justfile migrate-legacy
   ```
   After it succeeds, tell the user they can delete `essays/bank/`
   entirely — the raw exports are not needed once their data is in
   `.bank.csv`. Do not delete the folder yourself without asking.

3. **Show a trend.**
   ```
   just -f ~/.claude/skills/draghi/justfile trend <category|totale> [years]
   ```
   `years` is a comma-separated list (e.g. `2023,2024`); omit it for all
   years. Prints one line per month: total and 3-month moving average.

4. **Show a yearly summary.**
   ```
   just -f ~/.claude/skills/draghi/justfile summary <year>
   ```
   Prints totals per category for `<year>`, next to the same totals for
   `<year> - 1`, with the delta.

5. **Feed a chart to atlante.** When the user wants a picture instead of
   numbers:
   ```
   just -f ~/.claude/skills/draghi/justfile export-chart-trend <category|totale> [years] [output.json]
   just -f ~/.claude/skills/draghi/justfile export-chart-summary <year> [output.json]
   ```
   Each writes a JSON file with `labels` and `values` arrays, ready for
   atlante's `bar` or `line` recipe. Read the file, then call atlante.

## Notes

- `import` only understands the official bank format. If a file does not
  match it, the recipe fails with an error instead of guessing.
- All amounts come from the bank export already signed (income positive,
  expenses negative) — recipes never re-derive the sign.
