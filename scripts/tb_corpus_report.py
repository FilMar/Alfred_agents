#!/usr/bin/env python3
"""Measure the third-brain corpus. Read-only.

Prints the numbers the memory roadmap is argued from, so every claim in it can be
re-checked with one command. Also prints the structural debt: duplicate refs,
self-refs, payloads without an id, edges pointing at notes that do not exist.

    ./tb_corpus_report.py [collection]
"""
import json
import sys
from collections import Counter

from qdrant_clone import call

MAX_PAGES = 1000
PAGE_SIZE = 250


def read_all(collection, with_vector=False):
    points, offset = [], None
    for _ in range(MAX_PAGES):
        body = {"limit": PAGE_SIZE, "with_payload": True, "with_vector": with_vector}
        if offset is not None:
            body["offset"] = offset
        status, res = call("POST", f"/collections/{collection}/points/scroll", body)
        assert status == 200, f"read_all: {status} {res}"
        points.extend(res["result"]["points"])
        offset = res["result"]["next_page_offset"]
        if offset is None:
            return points
    raise AssertionError("read_all: MAX_PAGES reached")


def debt(notes, known_ids):
    out = {"dup_refs": [], "self_refs": [], "missing_id": [], "dangling_refs": [],
           "dangling_backrefs": [], "refs_over_limit": []}
    for note in notes:
        nid = note.get("id")
        if not nid:
            out["missing_id"].append(note.get("what", "")[:60])
            continue
        refs = note.get("refs") or []
        seen = Counter(r["id"] for r in refs)
        if any(count > 1 for count in seen.values()):
            out["dup_refs"].append(nid)
        if nid in seen:
            out["self_refs"].append(nid)
        if len(refs) > 6:
            out["refs_over_limit"].append(nid)
        for ref in refs:
            if ref["id"] not in known_ids:
                out["dangling_refs"].append((nid, ref["id"]))
        for back in note.get("backrefs") or []:
            if back not in known_ids:
                out["dangling_backrefs"].append((nid, back))
    return out


def distribution(notes, key):
    return Counter(note.get(key) for note in notes).most_common()


def main(collection):
    points = read_all(collection)
    notes = [p["payload"] for p in points]
    known = {p["id"] for p in points}
    print(f"collection      {collection}")
    print(f"notes           {len(notes)}")
    print(f"kind            {distribution(notes, 'kind')}")
    print(f"per month       {sorted(Counter(n['when'][:7] for n in notes).items())}")

    edges = sum(len(n.get('refs') or []) for n in notes)
    linked = sum(1 for n in notes if n.get('refs'))
    print(f"refs            {edges} edges, {edges / len(notes):.2f} per note, {linked} notes with at least one")
    print(f"backrefs        {sum(len(n.get('backrefs') or []) for n in notes)}")

    hit = [n for n in notes if n.get("hits")]
    print(f"hits            {len(hit)} notes hit, {len(notes) - len(hit)} never, max {max((n['hits'] for n in hit), default=0)}")
    print(f"source          {sum(1 for n in notes if n.get('source'))} / {len(notes)}")

    for field in ("embed_model", "status", "about", "updated_at", "superseded_by",
                  "session"):
        present = sum(1 for n in notes if field in n)
        print(f"{field:<15} present on {present} / {len(notes)}")

    print("--- debt ---")
    for name, rows in debt(notes, known).items():
        print(f"{name:<18} {len(rows)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "third-brain"))
