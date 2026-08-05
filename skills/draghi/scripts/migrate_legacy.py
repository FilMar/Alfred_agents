# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""One-time migration of the legacy spese2021.csv / spese2022.csv files into .bank.csv.

Run once. After it succeeds, delete bank/spese2021.csv, bank/spese2022.csv,
and the bank/ folder itself.
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common

LEGACY_FILES = ["spese2021.csv", "spese2022.csv"]


def parse_legacy_amount(raw):
    raw = raw.strip()
    if not raw:
        return None
    sign = "-" if raw.startswith("-") else ""
    raw = raw.lstrip("-").replace("€", "").strip()
    raw = raw.replace(".", "").replace(",", ".")
    return float(sign + raw)


def main():
    new_rows = []
    skipped_empty = 0
    for name in LEGACY_FILES:
        path = common.BANK_DIR / name
        if not path.exists():
            print(f"Skipping {name}: not found in {common.BANK_DIR}")
            continue
        with open(path, newline="", encoding="utf-8") as f:
            for record in csv.DictReader(f):
                context = f"{record['Data']} {record['Descrizione']}"
                amount = common.resolve_amount(
                    parse_legacy_amount(record["Entrate"] or ""),
                    parse_legacy_amount(record["Uscite"] or ""),
                    context,
                )
                if amount is None:
                    skipped_empty += 1
                    continue
                new_rows.append({
                    "date": common.parse_date_it(record["Data"]),
                    "amount": amount,
                    "category": record["Moneymap"],
                    "description": record["Descrizione"],
                    "description_full": record["Descrizione_Completa"],
                    "source_year": record["Data"].strip().split("/")[-1],
                })

    existing = common.load_bank_df()
    common.warn_duplicates(existing, new_rows)
    count = common.append_rows(new_rows)

    print(f"Migrated {count} legacy rows into {common.BANK_CSV}")
    if skipped_empty:
        print(f"Skipped {skipped_empty} rows with no Entrate and no Uscite")


if __name__ == "__main__":
    main()
