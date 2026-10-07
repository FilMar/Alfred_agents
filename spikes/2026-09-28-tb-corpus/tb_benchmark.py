#!/usr/bin/env python3
"""Compare two embedding models on the same corpus. Dense only, positions not scores.

Three measures, no human judgment involved:

- paraphrase recall: a note must come back from an Italian paraphrase of itself
  that avoids its rare words (`tb_paraphrase_set.py`). recall@1 and MRR@10.
- ref recall: a note's own text as the query must bring back the notes its author
  linked it to. 1134 hand-written edges are relevance judgments already paid for.
  Biased in favour of the model the links were written under, so a win against it
  counts double.
- control: a deliberately off-topic query must score visibly lower than a real one.

Each collection is queried with the prefix convention it was built with. The v1.5
collection has no prefix, so this compares model and prefix together — the prefix
is not an option for a Nomic model, it is how the model is used.

    ./tb_benchmark.py
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

from qdrant_clone import call, collection_info
from tb_corpus_report import read_all

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
PARAPHRASES = Path(__file__).parent / "data" / "paraphrases.json"
OUT = Path(__file__).parent / "reports" / "fase0_benchmark.json"
TOP_K = 10
CONTROL_QUERY = "ricetta della carbonara con guanciale e pecorino romano"
REF_SAMPLE = 200

CANDIDATES = [
    {"collection": "third-brain__nomic-v1.5-768", "model": "nomic-embed-text", "query_prefix": ""},
    {"collection": "third-brain__v2moe-768", "model": "nomic-embed-text-v2-moe", "query_prefix": "search_query: "},
]


def embed(model, text):
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed",
        data=json.dumps({"model": model, "input": text}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as res:
        vectors = json.load(res)["embeddings"]
    assert len(vectors) == 1, f"embed: {len(vectors)} vectors for one text"
    return vectors[0]


def query(collection, vector, limit):
    body = {"query": vector, "using": "dense", "limit": limit, "with_payload": False}
    status, res = call("POST", f"/collections/{collection}/points/query", body)
    assert status == 200, f"query: {status} {res}"
    return [p["id"] for p in res["result"]["points"]], res["result"]["points"]


def rank_of(target, ids):
    return ids.index(target) + 1 if target in ids else None


def paraphrase_recall(candidate, rows):
    at_one, reciprocal, missed = 0, 0.0, []
    for row in rows:
        vector = embed(candidate["model"], candidate["query_prefix"] + row["paraphrase"])
        ids, _ = query(candidate["collection"], vector, TOP_K)
        rank = rank_of(row["id"], ids)
        if rank == 1:
            at_one += 1
        if rank is not None:
            reciprocal += 1 / rank
        else:
            missed.append(row["id"])
    return {"queries": len(rows), "recall_at_1": at_one / len(rows),
            "mrr_at_10": reciprocal / len(rows), "missed": len(missed)}


def ref_recall(candidate, notes):
    linked = [n for n in notes if n.get("refs")][:REF_SAMPLE]
    found, total = 0, 0
    for note in linked:
        text = candidate["query_prefix"] + f"{note['why']}\n\n{note['what']}"
        ids, _ = query(candidate["collection"], embed(candidate["model"], text), TOP_K + 1)
        ids = [i for i in ids if i != note["id"]][:TOP_K]
        targets = {r["id"] for r in note["refs"]}
        found += len(targets & set(ids))
        total += len(targets)
    return {"notes": len(linked), "edges": total, "in_top_10": found, "rate": found / total}


def control(candidate, rows):
    real = rows[0]["paraphrase"]
    _, hits = query(candidate["collection"], embed(candidate["model"], candidate["query_prefix"] + real), 1)
    real_score = hits[0]["score"]
    _, hits = query(candidate["collection"], embed(candidate["model"], candidate["query_prefix"] + CONTROL_QUERY), 1)
    return {"real_top_score": real_score, "control_top_score": hits[0]["score"],
            "gap": real_score - hits[0]["score"]}


def main():
    rows = json.loads(PARAPHRASES.read_text())["rows"]
    notes = [p["payload"] for p in read_all(CANDIDATES[0]["collection"])]
    report = {"paraphrases": len(rows), "top_k": TOP_K, "candidates": {}}

    for candidate in CANDIDATES:
        info = collection_info(candidate["collection"])
        assert info is not None, f"main: '{candidate['collection']}' not found"
        print(f"--- {candidate['collection']} ({info['points_count']} points) ---")
        result = {
            "model": candidate["model"],
            "query_prefix": candidate["query_prefix"],
            "paraphrase": paraphrase_recall(candidate, rows),
            "ref": ref_recall(candidate, notes),
            "control": control(candidate, rows),
        }
        report["candidates"][candidate["collection"]] = result
        p, r, c = result["paraphrase"], result["ref"], result["control"]
        print(f"  paraphrase  recall@1 {p['recall_at_1']:.3f}  MRR@10 {p['mrr_at_10']:.3f}  missed {p['missed']}/{p['queries']}")
        print(f"  ref         {r['in_top_10']}/{r['edges']} edges in top 10 = {r['rate']:.3f} ({r['notes']} notes)")
        print(f"  control     real {c['real_top_score']:.3f} vs off-topic {c['control_top_score']:.3f}, gap {c['gap']:.3f}")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(report, indent=1, ensure_ascii=False))
    print(f"report {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
