#!/usr/bin/env python3
"""Re-embed a collection into a new one with a different model.

Dense vectors are recomputed, sparse vectors and payloads are copied as they are:
a sparse vector is built from words, so it does not depend on the model. The
payload's `embed_model` is rewritten to the model that actually produced the
vector, which is the only way to know later what a vector can be compared with.

Nomic models want a task prefix on the text. The document prefix belongs here;
the query prefix belongs to whoever searches.

    ./tb_reembed.py third-brain third-brain__v2moe-768 nomic-embed-text-v2-moe --fields why,what
"""
import json
import os
import sys
import urllib.request

from qdrant_clone import call, collection_info, create_target
from tb_corpus_report import read_all

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DOCUMENT_PREFIX = "search_document: "
EMBED_BATCH = 16
UPSERT_BATCH = 100


def embed_many(model, texts):
    assert len(texts) > 0, "embed_many: no input"
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed",
        data=json.dumps({"model": model, "input": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=600) as res:
        vectors = json.load(res)["embeddings"]
    assert len(vectors) == len(texts), f"embed_many: {len(vectors)} vectors for {len(texts)} texts"
    return vectors


def note_text(payload, fields):
    parts = [payload.get(field) or "" for field in fields]
    return DOCUMENT_PREFIX + "\n\n".join(parts)


def dense_name(config):
    vectors = config["params"]["vectors"]
    if "size" in vectors:
        return None
    assert len(vectors) == 1, f"dense_name: {len(vectors)} named vectors, expected 1"
    return next(iter(vectors))


def rebuilt_vector(point, vector, name):
    if name is None:
        return vector
    kept = {k: v for k, v in point["vector"].items() if k != name}
    return {name: vector, **kept}


def write_batch(collection, rows):
    status, res = call("PUT", f"/collections/{collection}/points?wait=true", {"points": rows})
    assert status == 200, f"write_batch: {status} {res}"


def main(src, dst, model, fields):
    source = collection_info(src)
    assert source is not None, f"main: source '{src}' not found"
    target = collection_info(dst)
    assert target is None or target["points_count"] == 0, \
        f"main: target '{dst}' already holds {target['points_count']} points"
    if target is None:
        create_target(dst, source)
        print(f"created {dst}")

    name = dense_name(source["config"])
    points = read_all(src, with_vector=True)
    print(f"embedding {len(points)} points with {model} (dense vector: {name or 'unnamed'})")

    rows = []
    for start in range(0, len(points), EMBED_BATCH):
        batch = points[start:start + EMBED_BATCH]
        vectors = embed_many(model, [note_text(p["payload"], fields) for p in batch])
        for point, vector in zip(batch, vectors):
            rows.append({
                "id": point["id"],
                "vector": rebuilt_vector(point, vector, name),
                "payload": {**point["payload"], "embed_model": model},
            })
        if len(rows) >= UPSERT_BATCH:
            write_batch(dst, rows)
            print(f"  written {start + len(batch)} / {len(points)}")
            rows = []
    if rows:
        write_batch(dst, rows)

    after = collection_info(dst)
    assert after["points_count"] == source["points_count"], \
        f"main: {source['points_count']} in {src}, {after['points_count']} in {dst}"
    print(f"done: {after['points_count']} points in {dst}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 3:
        print(__doc__)
        sys.exit(2)
    flag = [a for a in sys.argv[1:] if a.startswith("--fields=")]
    fields = flag[0].split("=", 1)[1].split(",") if flag else ["why", "what"]
    main(args[0], args[1], args[2], fields)
