#!/usr/bin/env python3
# desc: find Our World in Data charts, or print a chart's data with unit and sources
# usage: owid.py search|data <query or slug> [--limit n] [--countries A~B] [--since y]
"""Search uses the site's own search endpoint. It has no documentation and may change.
Data uses the chart data API: <slug>.metadata.json and <slug>.csv."""

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT_S = 30
LIMIT_MAX = 20
ROWS_MAX = 400
SITE = "https://ourworldindata.org"
USER_AGENT = "polo-owid/1.0 (personal research script)"


def die(message: str, code: int = 1) -> None:
    print(f"owid: {message}", file=sys.stderr)
    sys.exit(code)


def fetch(path: str, params: dict[str, str]) -> bytes:
    url = f"{SITE}/{path}?" + urllib.parse.urlencode(params)
    # The scheme is always https: the URL is built above.
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})  # noqa: S310
    try:
        reply = urllib.request.urlopen(request, timeout=TIMEOUT_S)  # noqa: S310
        with reply:
            return reply.read()
    except urllib.error.HTTPError as error:
        hint = ": check the slug with search" if error.code == 404 else ""  # noqa: PLR2004
        die(f"{url} answered {error.code}{hint}")
    except (urllib.error.URLError, TimeoutError) as error:
        die(f"ourworldindata.org did not answer: {error}")
    return b""


def search(query: str, limit: int) -> None:
    hits = json.loads(fetch("api/search", {"q": query})).get("results", [])
    charts = [hit for hit in hits if hit.get("type") == "chart"][:limit]
    if not charts:
        die(f"no chart for {query!r}")
    for chart in charts:
        print(f"## {chart['title']}  (slug: {chart['slug']})")
        print(f"{chart.get('subtitle') or chart.get('variantName') or ''}".strip())
        print(f"updated {chart.get('updatedAt', '?')[:10]} · {chart['url']}\n")


def data(slug: str, countries: str | None, since: int | None) -> None:
    meta = json.loads(fetch(f"grapher/{slug}.metadata.json", {"v": "1"}))
    for column in meta.get("columns", {}).values():
        print(f"# {column.get('titleShort')} ({column.get('unit') or 'no unit'})")
        print(f"sources: {column.get('citationShort')}")
        print(f"span {column.get('timespan')} · updated {column.get('lastUpdated')}")
    params = {"v": "1", "csvType": "filtered", "useColumnShortNames": "true"}
    params |= {"country": countries} if countries else {}
    params |= {"time": f"{since}..latest"} if since else {}
    rows = fetch(f"grapher/{slug}.csv", params).decode().splitlines()
    print(f"{SITE}/grapher/{slug}\n")
    print("\n".join(rows[: ROWS_MAX + 1]))
    if len(rows) > ROWS_MAX + 1:
        print(
            f"(first {ROWS_MAX} of {len(rows) - 1} rows: use --countries or --since)",
            file=sys.stderr,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["search", "data"])
    parser.add_argument("text", help="the query for search, the chart slug for data")
    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help=f"charts for search, 1 to {LIMIT_MAX}",
    )
    parser.add_argument("--countries", help="ISO3 codes joined by ~, like ITA~FRA")
    parser.add_argument("--since", type=int, help="first year of the data")
    args = parser.parse_args()
    if not args.text.strip():
        die("empty query or slug", 2)
    if not 1 <= args.limit <= LIMIT_MAX:
        die(f"--limit must be 1 to {LIMIT_MAX}", 2)
    if args.countries and not re.fullmatch(r"[A-Z_]{3,}(~[A-Z_]{3,})*", args.countries):
        die(f"bad --countries: {args.countries} (ISO3 codes joined by ~)", 2)
    if args.command == "search":
        search(args.text, args.limit)
    else:
        data(args.text, args.countries, args.since)


if __name__ == "__main__":
    main()
