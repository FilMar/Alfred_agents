#!/usr/bin/env -S uv run --script
# desc: Reduce recurring rent rows by a fixed amount, from a given date onward
# usage: adjust_rent.py <full_amount> <reduction> <since_date>
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Reduce recurring rent rows by a fixed amount, from a given date onward.

Idempotent: matches on the pre-adjustment amount, so re-running (e.g. after
importing new months) only touches rows still at the full rent, never
double-adjusts an already-reduced row.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common

DESC_MATCH = "Giulio Nozzoli"
CATEGORY = "Casa"


def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: adjust_rent.py <full_amount> <reduction> <since_date>")
    full_amount = f"{float(sys.argv[1]):.1f}"
    reduction = float(sys.argv[2])
    since = sys.argv[3]

    with open(common.BANK_CSV) as f:
        lines = f.readlines()

    out = []
    changed = 0
    for line in lines:
        parts = line.rstrip("\n").split(",", 5)
        if (len(parts) == 6 and parts[2] == CATEGORY and DESC_MATCH in parts[4]
                and parts[1] == full_amount and parts[0] >= since):
            parts[1] = f"{float(parts[1]) + reduction:.1f}"
            line = ",".join(parts) + "\n"
            changed += 1
        out.append(line)

    with open(common.BANK_CSV, "w") as f:
        f.writelines(out)

    new_amount = f"{float(full_amount) + reduction:.1f}"
    print(f"Adjusted {changed} rent rows since {since}: {full_amount} -> {new_amount}")


if __name__ == "__main__":
    main()
