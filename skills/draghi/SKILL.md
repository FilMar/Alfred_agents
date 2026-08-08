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

   Right after an import, re-run any standing adjustment recipes below
   (rent split, self-transfer split) so freshly imported rows for
   recurring transfers get corrected too — they are idempotent, safe to
   run every time.

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

6. **Adjust recurring rent for a roommate paying cash.** When part of a
   rent row is covered off-ledger (e.g. a roommate pays their share in
   cash), reduce the recorded amount:
   ```
   just -f ~/.claude/skills/draghi/justfile adjust-rent <full_amount> <reduction> <since_date>
   ```
   Matches `Casa` rows paid to Giulio Nozzoli at exactly `<full_amount>`
   (e.g. `-630.0`) from `<since_date>` (ISO, inclusive) onward, and adds
   `<reduction>` to each (e.g. `350` turns -630.0 into -280.0). Idempotent
   — only touches rows still at the full amount, so re-running after a
   later import is safe.

   Current standing adjustment: `adjust-rent -630.0 350 2025-09-01`.

7. **Split a recurring self-transfer.** Personal transfers to Trade
   Republic (`Ben: Filippo Mariani`) mix an investment (PAC) portion with
   monthly living expenses in one row. Split them apart:
   ```
   just -f ~/.claude/skills/draghi/justfile split-selftransfer <amount> <invest_amount> [match_text] [invest_category] [extra_match]
   ```
   Finds rows at exactly `<amount>` whose `description_full` contains
   `match_text` (default `Filippo Mariani`) and, if given, `extra_match`
   too, and replaces each with two rows: `-<invest_amount>` under
   `investimenti`, and the remainder under the original category (`Altre
   spese`). Idempotent — only touches rows still at the full amount. No
   IBAN or Cau text is hardcoded in the script; pass whatever substring
   disambiguates the target rows.

   Current standing adjustments:
   - `split-selftransfer -800.0 200` (Jan 2026 onward, 800/month, Cau
     "Spese e Pac" — unambiguous amount, no `extra_match` needed)
   - `split-selftransfer -600.0 100 "spese libere e p ac"` (Jul-Dec 2025,
     600/month — needs `match_text` set to this Cau wording, otherwise it
     collides with the -600.0 "Altre spese" remainder rows left behind by
     the -800.0 split above, which share the same amount and beneficiary)

## Notes

- `import` only understands the official bank format. If a file does not
  match it, the recipe fails with an error instead of guessing.
- All amounts come from the bank export already signed (income positive,
  expenses negative) — recipes never re-derive the sign.
