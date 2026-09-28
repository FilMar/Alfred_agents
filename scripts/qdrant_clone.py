#!/usr/bin/env python3
"""Clone a Qdrant collection: same vector config, same payload indices, same points.

Copies dense and sparse vectors as they are. No re-embedding, so the clone is a
byte-for-byte usable replacement of the source. Use it before an alias swap.

    ./qdrant_clone.py third-brain third-brain__nomic-v1.5-768
"""
import json
import random
import sys
import urllib.error
import urllib.request

QDRANT_URL = __import__("os").environ.get("QDRANT_URL", "http://localhost:6333")
PAGE_SIZE = 100
UPSERT_BATCH = 100
MAX_PAGES = 1000
SAMPLE_SIZE = 5


def call(method, path, body=None, timeout=120):
    assert path.startswith("/"), "call: path must be absolute"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{QDRANT_URL}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode()[:400]


def collection_info(name):
    status, body = call("GET", f"/collections/{name}")
    return body["result"] if status == 200 else None


def index_requests(payload_schema):
    out = []
    for field, spec in payload_schema.items():
        schema = spec.get("params") or spec["data_type"]
        out.append((field, schema))
    return out


def create_target(name, source):
    params = source["config"]["params"]
    body = {"vectors": params["vectors"]}
    if params.get("sparse_vectors"):
        body["sparse_vectors"] = params["sparse_vectors"]
    status, res = call("PUT", f"/collections/{name}", body)
    assert status == 200, f"create_target: {status} {res}"
    for field, schema in index_requests(source.get("payload_schema", {})):
        status, res = call("PUT", f"/collections/{name}/index?wait=true",
                           {"field_name": field, "field_schema": schema})
        assert status == 200, f"create_target index {field}: {status} {res}"


def read_page(name, offset):
    body = {"limit": PAGE_SIZE, "with_payload": True, "with_vector": True}
    if offset is not None:
        body["offset"] = offset
    status, res = call("POST", f"/collections/{name}/points/scroll", body)
    assert status == 200, f"read_page: {status} {res}"
    return res["result"]["points"], res["result"]["next_page_offset"]


def write_points(name, points):
    assert len(points) > 0, "write_points: nothing to write"
    payload = [{"id": p["id"], "vector": p["vector"], "payload": p["payload"]} for p in points]
    status, res = call("PUT", f"/collections/{name}/points?wait=true", {"points": payload})
    assert status == 200, f"write_points: {status} {res}"


def copy_points(src, dst):
    offset, copied, buffer = None, 0, []
    for page in range(MAX_PAGES):
        points, offset = read_page(src, offset)
        buffer.extend(points)
        while len(buffer) >= UPSERT_BATCH:
            write_points(dst, buffer[:UPSERT_BATCH])
            copied += UPSERT_BATCH
            buffer = buffer[UPSERT_BATCH:]
        if offset is None:
            break
    else:
        raise AssertionError("copy_points: MAX_PAGES reached, source larger than expected")
    if buffer:
        write_points(dst, buffer)
        copied += len(buffer)
    return copied


def fetch_one(name, point_id):
    status, res = call("POST", f"/collections/{name}/points",
                       {"ids": [point_id], "with_payload": True, "with_vector": True})
    assert status == 200, f"fetch_one: {status} {res}"
    found = res["result"]
    return found[0] if found else None


def verify(src, dst, sample_ids):
    left, right = collection_info(src), collection_info(dst)
    assert left["points_count"] == right["points_count"], \
        f"verify: {left['points_count']} points in {src}, {right['points_count']} in {dst}"
    for point_id in sample_ids:
        a, b = fetch_one(src, point_id), fetch_one(dst, point_id)
        assert b is not None, f"verify: {point_id} missing in {dst}"
        assert a["payload"] == b["payload"], f"verify: payload differs on {point_id}"
        assert a["vector"] == b["vector"], f"verify: vector differs on {point_id}"
    return left["points_count"]


def sample_ids(name, size):
    points, _ = read_page(name, None)
    ids = [p["id"] for p in points]
    return random.sample(ids, min(size, len(ids)))


def main(src, dst):
    source = collection_info(src)
    assert source is not None, f"main: source collection '{src}' not found"
    target = collection_info(dst)
    assert target is None or target["points_count"] == 0, \
        f"main: target '{dst}' already holds {target['points_count']} points"

    if target is None:
        create_target(dst, source)
        print(f"created {dst}")

    ids = sample_ids(src, SAMPLE_SIZE)
    copied = copy_points(src, dst)
    print(f"copied {copied} points")
    total = verify(src, dst, ids)
    print(f"verified {total} points, {len(ids)} samples identical (payload and vectors)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
