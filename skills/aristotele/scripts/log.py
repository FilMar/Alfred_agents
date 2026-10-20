#!/usr/bin/env python3
# desc: Append one curation action to the actions.jsonl of a run.
# usage: log.py <run_dir> <op> <store> "<why>" <id> [<id> ...]
"""Ops: merge, delete, ref, hub, ghost, rule. Store: tb or ti.
The first id is the one the action produced or kept, when there is one."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

OPS = {"merge", "delete", "ref", "hub", "ghost", "rule"}
STORES = {"tb", "ti"}


def main() -> int:
    if len(sys.argv) < 6:
        print(__doc__.strip() + "\nusage: log.py <run_dir> <op> <store> \"<why>\" <id> [<id> ...]", file=sys.stderr)
        return 2
    run, op, store, why, *ids = sys.argv[1:]
    actions = Path(run) / "actions.jsonl"
    if not actions.is_file():
        print(f"no actions.jsonl in {run}: start the run with gather.sh", file=sys.stderr)
        return 2
    if op not in OPS or store not in STORES or not why.strip():
        print(f"op must be one of {sorted(OPS)}, store tb or ti, why not blank", file=sys.stderr)
        return 2
    row = {"at": datetime.now(timezone.utc).isoformat(), "op": op, "store": store, "why": why.strip(), "ids": ids}
    with actions.open("a") as out:
        out.write(json.dumps(row, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
