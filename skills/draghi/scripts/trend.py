#!/usr/bin/env -S uv run --script
# desc: Monthly time series for one category or the total, with a 3-month moving average
# usage: trend.py <category|totale> [year,year,...]
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Monthly time series for one category or the total, with a 3-month moving average."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common
import polars as pl


def monthly_series(df, target, years):
    if years:
        df = df.filter(pl.col("source_year").is_in(years))
    if target.lower() != "totale":
        df = df.filter(pl.col("category") == target)
    return (
        df.with_columns(pl.col("date").str.slice(0, 7).alias("month"))
        .group_by("month")
        .agg(pl.col("amount").sum().alias("total"))
        .sort("month")
        .with_columns(pl.col("total").rolling_mean(window_size=3).alias("moving_avg_3m"))
    )


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: trend.py <category|totale> [year,year,...]")
    target = sys.argv[1]
    years = sys.argv[2].split(",") if len(sys.argv) > 2 and sys.argv[2] else None

    df = common.load_bank_df()
    monthly = monthly_series(df, target, years)

    for row in monthly.iter_rows(named=True):
        avg = f"{row['moving_avg_3m']:.2f}" if row["moving_avg_3m"] is not None else "-"
        print(f"{row['month']}  total={row['total']:.2f}  avg3m={avg}")


if __name__ == "__main__":
    main()
