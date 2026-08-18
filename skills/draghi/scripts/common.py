# desc: Shared paths, schema, and parsing helpers imported by the other draghi scripts
"""Shared paths, schema, and parsing helpers for the draghi skill."""
import os
from pathlib import Path

import polars as pl

ESSAYS_ROOT = Path(os.environ.get("ESSAYS_ROOT", Path.home() / "git_projects" / "essays"))
BANK_CSV = ESSAYS_ROOT / ".bank.csv"
BANK_DIR = ESSAYS_ROOT / "bank"

SCHEMA_COLUMNS = ["date", "amount", "category", "description", "description_full", "source_year"]
SCHEMA_TYPES = {c: (pl.Float64 if c == "amount" else pl.Utf8) for c in SCHEMA_COLUMNS}


def parse_date_it(raw):
    """Convert a dd/mm/yyyy date to ISO yyyy-mm-dd."""
    day, month, year = raw.strip().split("/")
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def resolve_amount(entrate, uscite, context):
    """Pick the amount for a row from parsed Entrate/Uscite floats (None if blank).

    Both blank: return None, caller skips the row.
    Both set: ask the user which one to keep.
    Only one set: use that one.
    """
    if entrate is None and uscite is None:
        return None
    if entrate is not None and uscite is not None:
        print("Row has both Entrate and Uscite set:")
        print(f"  {context}")
        print(f"  Entrate: {entrate}")
        print(f"  Uscite:  {uscite}")
        choice = input("Keep which one? [e]ntrate / [u]scite: ").strip().lower()
        return entrate if choice.startswith("e") else uscite
    return entrate if entrate is not None else uscite


def load_bank_df():
    if not BANK_CSV.exists():
        return pl.DataFrame(schema=SCHEMA_TYPES)
    return pl.read_csv(BANK_CSV, schema_overrides=SCHEMA_TYPES)


def warn_duplicates(existing_df, new_rows):
    if existing_df.is_empty():
        return
    existing_keys = set(zip(existing_df["date"], existing_df["amount"], existing_df["description"]))
    for row in new_rows:
        key = (row["date"], row["amount"], row["description"])
        if key in existing_keys:
            print(f"WARNING: possible duplicate already in .bank.csv: {row['date']} {row['amount']} {row['description']}")


def append_rows(new_rows):
    if not new_rows:
        return 0
    df_new = pl.DataFrame(new_rows, schema=SCHEMA_TYPES)
    write_header = not BANK_CSV.exists()
    with open(BANK_CSV, "a") as f:
        df_new.write_csv(f, include_header=write_header)
    return len(df_new)
