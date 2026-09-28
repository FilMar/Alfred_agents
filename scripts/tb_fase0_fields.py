#!/usr/bin/env python3
"""Fase 0 migration: repair the graph debt and write the new payload fields.

Repairs, in one pass over every note:
- a ref whose target does not exist is resolved by its first id block, which is
  the part `noteId` derives first and the only part that survives truncation;
- duplicate refs collapse to the first occurrence, its reason kept;
- a self-ref is dropped;
- a ref that resolves to nothing is dropped;
- `backrefs` is recomputed from the repaired refs — it is derived data, and today
  it disagrees with refs in both directions;
- a payload without `id` gets the point id.

Then writes the fields the later phases read: `embed_model`, `status`,
`superseded_by`, `about`, `updated_at`, `source_raw`, `source_event`, and
`origin` on every ref.

Every change lands in a JSON report next to this script. Dry run by default.

    ./tb_fase0_fields.py third-brain --apply
"""
import json
import sys
from pathlib import Path

from qdrant_clone import call
from tb_corpus_report import read_all

VECTORS_MADE_BY = "nomic-embed-text"
REPORT = Path(__file__).parent / "reports" / "fase0_repair.json"
SET_PAYLOAD_BATCH = 50


ID_BLOCK_LEN = 8


def prefix_index(known_ids):
    index = {}
    for known in known_ids:
        index.setdefault(known[:ID_BLOCK_LEN], []).append(known)
    return index


def resolve(target, known_ids, by_prefix):
    if target in known_ids:
        return target, None
    candidates = by_prefix.get(target[:ID_BLOCK_LEN], [])
    if len(candidates) == 1:
        return candidates[0], ("resolved", target, candidates[0])
    return None, ("unresolved", target, len(candidates))


def canonical_refs(point_id, refs, known_ids, by_prefix):
    kept, changes, seen = [], [], set()
    for ref in refs:
        target, change = resolve(ref["id"], known_ids, by_prefix)
        if change is not None:
            changes.append(change)
        if target is None:
            continue
        if target == point_id:
            changes.append(("self", target, None))
        elif target in seen:
            changes.append(("duplicate", target, None))
        else:
            seen.add(target)
            kept.append({**ref, "id": target, "origin": "umano"})
    return kept, changes


def rebuild(points):
    known = {p["id"] for p in points}
    by_prefix = prefix_index(known)
    repaired, dropped_refs = {}, {}
    for point in points:
        note = point["payload"]
        kept, dropped = canonical_refs(point["id"], note.get("refs") or [], known, by_prefix)
        repaired[point["id"]] = kept
        if dropped:
            dropped_refs[point["id"]] = dropped

    backrefs = {pid: [] for pid in known}
    for source, refs in repaired.items():
        for ref in refs:
            backrefs[ref["id"]].append(source)
    return repaired, backrefs, dropped_refs


def new_fields(point, refs, backrefs):
    note = point["payload"]
    fields = {
        "refs": refs,
        "backrefs": sorted(backrefs),
        "embed_model": VECTORS_MADE_BY,
        "status": "promossa",
        "superseded_by": None,
        "about": "mondo",
        "updated_at": note["when"],
        "source_raw": "",
        "source_event": None,
    }
    if not note.get("id"):
        fields["id"] = point["id"]
    return fields


def write_payloads(collection, updates):
    for start in range(0, len(updates), SET_PAYLOAD_BATCH):
        for point_id, fields in updates[start:start + SET_PAYLOAD_BATCH]:
            status, res = call("POST", f"/collections/{collection}/points/payload?wait=true",
                               {"payload": fields, "points": [point_id]})
            assert status == 200, f"write_payloads: {point_id} {status} {res}"
        print(f"  written {min(start + SET_PAYLOAD_BATCH, len(updates))} / {len(updates)}")


def main(collection, apply):
    points = read_all(collection)
    repaired, backrefs, dropped = rebuild(points)

    old_backrefs = {p["id"]: set(p["payload"].get("backrefs") or []) for p in points}
    lost_backrefs = {pid: sorted(old - set(backrefs[pid]))
                     for pid, old in old_backrefs.items() if old - set(backrefs[pid])}
    gained_backrefs = {pid: sorted(set(backrefs[pid]) - old)
                       for pid, old in old_backrefs.items() if set(backrefs[pid]) - old}

    updates = [(p["id"], new_fields(p, repaired[p["id"]], backrefs[p["id"]])) for p in points]
    missing_id = [pid for pid, fields in updates if "id" in fields]

    report = {
        "collection": collection,
        "notes": len(points),
        "edges_before": sum(len(p["payload"].get("refs") or []) for p in points),
        "edges_after": sum(len(r) for r in repaired.values()),
        "ref_changes": dropped,
        "backrefs_removed": lost_backrefs,
        "backrefs_added": gained_backrefs,
        "payload_id_filled": missing_id,
        "embed_model": VECTORS_MADE_BY,
    }
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=1, ensure_ascii=False, sort_keys=True))

    print(f"notes            {report['notes']}")
    print(f"edges            {report['edges_before']} -> {report['edges_after']}")
    by_reason = {}
    for changes in dropped.values():
        for change in changes:
            by_reason[change[0]] = by_reason.get(change[0], 0) + 1
    print(f"ref changes      {by_reason} on {len(dropped)} notes")
    print(f"backrefs removed {sum(len(v) for v in lost_backrefs.values())} on {len(lost_backrefs)} notes")
    print(f"backrefs added   {sum(len(v) for v in gained_backrefs.values())} on {len(gained_backrefs)} notes")
    print(f"payload id fixed {len(missing_id)}")
    print(f"report           {REPORT}")

    if not apply:
        print("dry run: nothing written. Pass --apply.")
        return 0
    write_payloads(collection, updates)
    print("done")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(main(args[0] if args else "third-brain", "--apply" in sys.argv))
