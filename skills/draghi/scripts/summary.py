#!/usr/bin/env -S uv run --script
# desc: Per-category totals for one year, compared with the previous year
# usage: summary.py <year>
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Per-category totals for one year, compared with the previous year."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common
import polars as pl


def totals_by_category(df, year):
    return (
        df.filter(pl.col("source_year") == str(year))
        .group_by("category")
        .agg(pl.col("amount").sum().alias("total"))
    )


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: summary.py <year>")
    year = int(sys.argv[1])

    df = common.load_bank_df()
    current = totals_by_category(df, year)
    previous = totals_by_category(df, year - 1)

    merged = current.join(previous, on="category", how="full", suffix="_prev").fill_null(0)
    merged = merged.with_columns(pl.coalesce(["category", "category_prev"]).alias("category")).sort("category")

    print(f"Summary {year} vs {year - 1}")
    for row in merged.iter_rows(named=True):
        delta = row["total"] - row["total_prev"]
        print(f"{row['category']:30s}  {year}: {row['total']:10.2f}  {year - 1}: {row['total_prev']:10.2f}  delta: {delta:+.2f}")


if __name__ == "__main__":
    main()
