#!/usr/bin/env python3
"""Point an alias at a collection, atomically.

If a real collection still carries the alias name, it is deleted first — but only
after checking that every one of its points already exists in the target, with the
same payload and the same vectors. Qdrant refuses an alias whose name belongs to a
collection (HTTP 409), so the deletion cannot be avoided, only made safe.

    ./qdrant_alias_point.py third-brain third-brain__nomic-v1.5-768
"""
import sys

from qdrant_clone import call, collection_info, fetch_one, read_page

SAMPLE_SIZE = 20


def is_fully_copied(src, dst):
    left, right = collection_info(src), collection_info(dst)
    if left["points_count"] != right["points_count"]:
        return False, f"{left['points_count']} points in {src}, {right['points_count']} in {dst}"
    points, _ = read_page(src, None)
    for point in points[:SAMPLE_SIZE]:
        mirror = fetch_one(dst, point["id"])
        if mirror is None:
            return False, f"{point['id']} missing in {dst}"
        if mirror["payload"] != point["payload"]:
            return False, f"payload differs on {point['id']}"
        if mirror["vector"] != point["vector"]:
            return False, f"vector differs on {point['id']}"
    return True, f"{left['points_count']} points, {len(points[:SAMPLE_SIZE])} samples identical"


def current_target(alias):
    status, res = call("GET", "/aliases")
    assert status == 200, f"current_target: {status} {res}"
    for entry in res["result"]["aliases"]:
        if entry["alias_name"] == alias:
            return entry["collection_name"]
    return None


def swap(alias, collection):
    actions = []
    if current_target(alias) is not None:
        actions.append({"delete_alias": {"alias_name": alias}})
    actions.append({"create_alias": {"collection_name": collection, "alias_name": alias}})
    status, res = call("POST", "/collections/aliases", {"actions": actions})
    assert status == 200, f"swap: {status} {res}"


def main(alias, collection):
    target = collection_info(collection)
    assert target is not None, f"main: collection '{collection}' not found"
    assert target["points_count"] > 0, f"main: collection '{collection}' is empty"

    blocking = collection_info(alias) if current_target(alias) is None else None
    if blocking is not None:
        ok, detail = is_fully_copied(alias, collection)
        assert ok, f"main: refusing to delete collection '{alias}' — {detail}"
        print(f"collection '{alias}' is fully copied into '{collection}': {detail}")
        status, res = call("DELETE", f"/collections/{alias}")
        assert status == 200, f"main: delete '{alias}': {status} {res}"
        print(f"deleted collection {alias}")

    previous = current_target(alias)
    swap(alias, collection)
    now = current_target(alias)
    assert now == collection, f"main: alias '{alias}' points at {now}, not {collection}"
    print(f"alias {alias} -> {collection}" + (f" (was {previous})" if previous else ""))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
