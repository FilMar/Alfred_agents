#!/usr/bin/env -S uv run --script
# desc: Write a trend or summary JSON file shaped for atlante's bar/line recipes
# usage: export_chart.py trend <category|totale> <years|''> <output.json>
# usage: export_chart.py summary <year> <output.json>
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Write a JSON file shaped for atlante's bar/line recipes (DATA + LABELS arrays)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common
import polars as pl


def export_trend(args):
    if len(args) != 3:
        raise SystemExit("Usage: export_chart.py trend <category|totale> <years|''> <output.json>")
    target, years_raw, output_raw = args
    years = years_raw.split(",") if years_raw else None
    output = Path(output_raw)

    df = common.load_bank_df()
    if years:
        df = df.filter(pl.col("source_year").is_in(years))
    if target.lower() != "totale":
        df = df.filter(pl.col("category") == target)

    monthly = (
        df.with_columns(pl.col("date").str.slice(0, 7).alias("month"))
        .group_by("month")
        .agg(pl.col("amount").sum().alias("total"))
        .sort("month")
    )
    payload = {"labels": monthly["month"].to_list(), "values": monthly["total"].to_list()}
    output.write_text(json.dumps(payload, indent=2))
    print(output)


def export_summary(args):
    if len(args) != 2:
        raise SystemExit("Usage: export_chart.py summary <year> <output.json>")
    year, output_raw = args
    output = Path(output_raw)

    df = common.load_bank_df()
    totals = (
        df.filter(pl.col("source_year") == year)
        .group_by("category")
        .agg(pl.col("amount").sum().alias("total"))
        .sort("category")
    )
    payload = {"labels": totals["category"].to_list(), "values": totals["total"].to_list()}
    output.write_text(json.dumps(payload, indent=2))
    print(output)


EXPORTERS = {"trend": export_trend, "summary": export_summary}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in EXPORTERS:
        raise SystemExit(f"Usage: export_chart.py <{'|'.join(EXPORTERS)}> ...")
    EXPORTERS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    main()
