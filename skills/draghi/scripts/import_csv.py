#!/usr/bin/env -S uv run --script
# desc: Import one official bank export CSV into essays/.bank.csv
# usage: import_csv.py <file.csv>
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Import one official bank export CSV into essays/.bank.csv."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common

EXPECTED_HEADER = [
    "Data_Operazione", "Data_Valuta", "Entrate", "Uscite",
    "Descrizione", "Descrizione_Completa", "Stato", "Moneymap",
]


def find_header(rows):
    for i, row in enumerate(rows):
        if row == EXPECTED_HEADER:
            return i
    raise SystemExit("Header row not found. Is this the official bank export format?")


def parse_amount(raw):
    raw = raw.strip()
    return float(raw) if raw else None


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: import_csv.py <file.csv>")
    path = Path(sys.argv[1])
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    header_idx = find_header(rows)
    data_rows = rows[header_idx + 1:]

    skipped_empty = 0
    new_rows = []
    for raw in data_rows:
        if not raw or all(not c.strip() for c in raw):
            continue
        record = dict(zip(EXPECTED_HEADER, raw))
        context = f"{record['Data_Operazione']} {record['Descrizione']}"
        amount = common.resolve_amount(
            parse_amount(record["Entrate"]), parse_amount(record["Uscite"]), context
        )
        if amount is None:
            skipped_empty += 1
            continue
        new_rows.append({
            "date": common.parse_date_it(record["Data_Operazione"]),
            "amount": amount,
            "category": record["Moneymap"],
            "description": record["Descrizione"],
            "description_full": record["Descrizione_Completa"],
            "source_year": record["Data_Operazione"].strip().split("/")[-1],
        })

    existing = common.load_bank_df()
    common.warn_duplicates(existing, new_rows)
    count = common.append_rows(new_rows)

    print(f"Imported {count} rows into {common.BANK_CSV}")
    if skipped_empty:
        print(f"Skipped {skipped_empty} rows with no Entrate and no Uscite")


if __name__ == "__main__":
    main()
