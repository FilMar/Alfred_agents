#!/usr/bin/env python3
# desc: List all SVILUPPO items sorted by status, reading gh project item-list JSON from stdin.
"""List all SVILUPPO items sorted by status."""
import sys, json

data = json.load(sys.stdin)
items = data.get("items", [])
print(f"Total items: {data.get('totalCount', len(items))}")
print()
for item in sorted(items, key=lambda x: x.get("status") or "zzz"):
    status = item.get("status") or "No status"
    title = item.get("title", "Unknown")
    repo = item.get("content", {}).get("repository", "")
    assignees = ", ".join(item.get("assignees", [])) or "-"
    num = item.get("content", {}).get("number", "")
    print(f"  [{status:12s}] {repo}#{num}  {title}  (@{assignees})")