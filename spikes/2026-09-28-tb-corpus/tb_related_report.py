#!/usr/bin/env python3
"""Measures the related block of a depth-1 search: fan-out, scores, and what a
threshold would keep. Read-only. Writes reports/fase1_related.json.

Run: python3 spikes/2026-09-28-tb-corpus/tb_related_report.py
"""

import json
import os
import pathlib
import urllib.request

QDRANT = os.environ.get("QDRANT_URL", "http://localhost:6333")
OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
COLLECTION = "third-brain"
MODEL = "nomic-embed-text-v2-moe"

QUERIES = [
    "come si sceglie la soglia di uno score semantico",
    "quando conviene separare chi scrive codice da chi lo verifica",
    "perche un test che passa non prova che il codice sia giusto",
    "come si decide il confine di un tipo di dato",
    "cosa rende un backup affidabile",
    "quando un agente deve fermarsi e chiedere",
    "come si misura il debito tecnico di un repository",
    "perche la memoria di un agente deve dimenticare",
]

CUTOFFS = [0.35, 0.5]
LIMIT = 10


def post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    return json.load(urllib.request.urlopen(req, timeout=120))


def embed_query(text: str) -> list:
    body = {"model": MODEL, "input": "search_query: " + text}
    return post(f"{OLLAMA}/api/embed", body)["embeddings"][0]


def query(vector: list, extra: dict) -> list:
    body = {"query": vector, "using": "dense", "with_payload": True, **extra}
    return post(f"{QDRANT}/collections/{COLLECTION}/points/query", body)["result"]["points"]


NO_HUBS = {"must_not": [{"key": "kind", "match": {"value": "indice"}}]}


def measure(text: str) -> dict:
    vector = embed_query(text)
    direct = query(vector, {"limit": LIMIT, "filter": NO_HUBS})
    seen = {p["id"] for p in direct}

    refs_only = {r["id"] for p in direct for r in p["payload"].get("refs", [])} - seen
    backrefs_only = {b for p in direct for b in p["payload"].get("backrefs", [])} - seen - refs_only
    frontier = sorted(refs_only | backrefs_only)

    scored = []
    if frontier:
        filt = {"must": [{"has_id": frontier}], **NO_HUBS}
        scored = query(vector, {"limit": len(frontier), "filter": filt})
    scores = sorted((p["score"] for p in scored), reverse=True)

    return {
        "query": text,
        "direct": len(direct),
        "direct_score_min": round(min((p["score"] for p in direct), default=0.0), 4),
        "related_refs_only": len(refs_only),
        "related_with_backrefs": len(frontier),
        "related_scored": len(scored),
        "related_dropped_by_filter": len(frontier) - len(scored),
        "related_score_max": round(scores[0], 4) if scores else None,
        "related_score_min": round(scores[-1], 4) if scores else None,
        "kept_by_cutoff": {str(c): sum(1 for s in scores if s >= c) for c in CUTOFFS},
        "top3": [round(s, 4) for s in scores[:3]],
    }


def main() -> None:
    rows = [measure(q) for q in QUERIES]
    total_refs = sum(r["related_refs_only"] for r in rows)
    total_both = sum(r["related_with_backrefs"] for r in rows)
    report = {
        "collection": COLLECTION,
        "model": MODEL,
        "queries": len(rows),
        "limit": LIMIT,
        "avg_related_refs_only": round(total_refs / len(rows), 2),
        "avg_related_with_backrefs": round(total_both / len(rows), 2),
        "backref_gain": round(total_both / total_refs, 2) if total_refs else None,
        "kept_by_cutoff_total": {
            str(c): sum(r["kept_by_cutoff"][str(c)] for r in rows) for c in CUTOFFS
        },
        "related_total": sum(r["related_scored"] for r in rows),
        "rows": rows,
    }

    out = pathlib.Path(__file__).parent / "reports" / "fase1_related.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "rows"}, indent=2, ensure_ascii=False))
    print(f"\nwritten: {out}")


if __name__ == "__main__":
    main()
