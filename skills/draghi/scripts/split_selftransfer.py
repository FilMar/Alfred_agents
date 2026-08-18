#!/usr/bin/env -S uv run --script
# desc: Split a recurring self-transfer row into an investment portion and a remainder
# usage: split_selftransfer.py <amount> <invest_amount> [match_text] [invest_category] [extra_match]
# /// script
# requires-python = ">=3.11"
# dependencies = ["polars"]
# ///
"""Split a recurring self-transfer row into an investment portion and a remainder.

Idempotent: matches on the pre-split amount, so re-running (e.g. after
importing new months) only splits rows still at the full amount, never
double-splits an already-split row.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import common


def main():
    if len(sys.argv) not in (3, 4, 5, 6):
        raise SystemExit(
            "Usage: split_selftransfer.py <amount> <invest_amount> "
            "[match_text=Filippo Mariani] [invest_category=investimenti] [extra_match]"
        )
    amount_str = f"{float(sys.argv[1]):.1f}"
    invest = float(sys.argv[2])
    match_text = sys.argv[3] if len(sys.argv) > 3 else "Filippo Mariani"
    invest_category = sys.argv[4] if len(sys.argv) > 4 else "investimenti"
    extra_match = sys.argv[5] if len(sys.argv) > 5 else ""

    with open(common.BANK_CSV) as f:
        lines = f.readlines()

    out = []
    changed = 0
    for line in lines:
        parts = line.rstrip("\n").split(",", 5)
        if (len(parts) == 6 and parts[1] == amount_str and match_text in parts[4]
                and (not extra_match or extra_match in parts[4])):
            invest_parts = parts.copy()
            invest_parts[1] = f"{-invest:.1f}"
            invest_parts[2] = invest_category
            remainder_parts = parts.copy()
            remainder_parts[1] = f"{float(amount_str) + invest:.1f}"
            out.append(",".join(invest_parts) + "\n")
            out.append(",".join(remainder_parts) + "\n")
            changed += 1
        else:
            out.append(line)

    with open(common.BANK_CSV, "w") as f:
        f.writelines(out)

    remainder = f"{float(amount_str) + invest:.1f}"
    print(f"Split {changed} rows: {amount_str} -> {invest_category} {-invest:.1f} + Altre spese {remainder}")


if __name__ == "__main__":
    main()
