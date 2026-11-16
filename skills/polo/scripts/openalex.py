#!/usr/bin/env python3
# desc: search studies on OpenAlex: year, venue, citations, abstract, free copy
# usage: openalex.py <query> [--reviews] [--since <year>] [--limit <n>]
"""Needs OPENALEX_API_KEY: a free key from https://openalex.org/settings/api.
A search costs about $0.001 of the free $1 a day.
The cost of each call goes to stderr."""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT_S = 20
LIMIT_MAX = 25
ABSTRACT_CHARS = 1200
FIELDS = (
    "display_name,publication_year,type,cited_by_count,doi,"
    "open_access,primary_location,abstract_inverted_index"
)


def die(message: str, code: int = 1) -> None:
    print(f"openalex: {message}", file=sys.stderr)
    sys.exit(code)


def fetch(params: dict[str, str]) -> dict:
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as reply:
            return json.load(reply)
    except urllib.error.HTTPError as error:
        die(f"api.openalex.org answered {error.code}: the daily budget may be spent")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        die(f"api.openalex.org did not answer: {error}")
    return {}


def abstract(index: dict[str, list[int]] | None) -> str:
    if not index:
        return "(no abstract)"
    words = sorted((pos, word) for word, places in index.items() for pos in places)
    text = " ".join(word for _, word in words)
    return text if len(text) <= ABSTRACT_CHARS else text[:ABSTRACT_CHARS] + "…"


def show(work: dict) -> None:
    source = (work.get("primary_location") or {}).get("source") or {}
    free = (work.get("open_access") or {}).get("oa_url") or "(no free copy)"
    print(f"## {work.get('display_name')}")
    print(
        f"{work.get('publication_year')} · {work.get('type')} · "
        f"{source.get('display_name') or '(no venue)'} · "
        f"cited {work.get('cited_by_count', 0)}",
    )
    print(f"doi: {work.get('doi') or '(none)'}\nfree: {free}")
    print(f"{abstract(work.get('abstract_inverted_index'))}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--reviews", action="store_true", help="reviews only")
    parser.add_argument("--since", type=int, help="published in this year or later")
    parser.add_argument("--limit", type=int, default=5, help=f"1 to {LIMIT_MAX}")
    args = parser.parse_args()
    key = os.environ.get("OPENALEX_API_KEY", "").strip()
    if not key:
        die("set OPENALEX_API_KEY: get a free key at https://openalex.org/settings/api")
    if not args.query.strip():
        die("empty query", 2)
    if not 1 <= args.limit <= LIMIT_MAX:
        die(f"--limit must be 1 to {LIMIT_MAX}", 2)
    filters = [
        *(["type:review"] if args.reviews else []),
        *([f"from_publication_date:{args.since}-01-01"] if args.since else []),
    ]
    params = {"search": args.query, "per_page": str(args.limit), "select": FIELDS}
    params |= {"filter": ",".join(filters)} if filters else {}
    data = fetch({**params, "api_key": key})
    works = data.get("results", [])
    meta = data.get("meta", {})
    print(
        f"{meta.get('count', 0)} works, cost ${meta.get('cost_usd', '?')}",
        file=sys.stderr,
    )
    if not works:
        die(f"no work for {args.query!r}")
    for work in works:
        show(work)


if __name__ == "__main__":
    main()
