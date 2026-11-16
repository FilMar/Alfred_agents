#!/usr/bin/env python3
# desc: search recent news on Google News, with the WP:RSP verdict of each outlet
# usage: news.py <query> [--lang it|en] [--days <n>] [--limit <n>]
"""The verdicts come from Wikipedia:Reliable sources/Perennial sources.
They are cached for a week in ~/.cache/polo/rsp.json.
An outlet that is not listed is "not rated"."""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

TIMEOUT_S = 20
LIMIT_MAX = 30
DAYS_MAX = 365
RSP_PAGES = 8
RSP_MAX_AGE_S = 7 * 24 * 3600
CACHE = Path.home() / ".cache" / "polo" / "rsp.json"
USER_AGENT = "polo-news/1.0 (personal research script)"
VERDICTS = {
    "gr": "generally reliable",
    "nc": "no consensus",
    "gu": "generally unreliable",
    "d": "deprecated",
}
EDITIONS = {"it": "hl=it&gl=IT&ceid=IT:it", "en": "hl=en-US&gl=US&ceid=US:en"}


def die(message: str, code: int = 1) -> None:
    print(f"news: {message}", file=sys.stderr)
    sys.exit(code)


def fetch(url: str) -> bytes:
    # The scheme is always https: every URL is built in this file.
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})  # noqa: S310
    try:
        reply = urllib.request.urlopen(request, timeout=TIMEOUT_S)  # noqa: S310
        with reply:
            return reply.read()
    except (urllib.error.URLError, TimeoutError) as error:
        die(f"{urllib.parse.urlsplit(url).netloc} did not answer: {error}")
    return b""


def rsp_rows(page: int) -> dict[str, str]:
    params = {
        "action": "parse",
        "page": f"Wikipedia:Reliable sources/Perennial sources/{page}",
        "prop": "wikitext",
        "format": "json",
        "formatversion": "2",
    }
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    text = json.loads(fetch(url))["parse"]["wikitext"]
    verdicts = {}
    for row in text.split("\n|-"):
        status = re.search(r"\{\{WP:RSPSTATUS\|([a-z]+)", row)
        uses = re.search(r"\{\{WP:RSPUSES\|([^}]+)\}\}", row)
        if status and uses:
            label = VERDICTS.get(status.group(1), status.group(1))
            for domain in uses.group(1).split("|"):
                verdicts[domain.strip().lower()] = label
    return verdicts


def rsp() -> dict[str, str]:
    if CACHE.is_file() and time.time() - CACHE.stat().st_mtime < RSP_MAX_AGE_S:
        return json.loads(CACHE.read_text())
    pages = range(1, RSP_PAGES + 1)
    verdicts = {k: v for page in pages for k, v in rsp_rows(page).items()}
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    tmp = CACHE.with_suffix(".tmp")
    tmp.write_text(json.dumps(verdicts))
    tmp.replace(CACHE)
    return verdicts


def verdict(domain: str, verdicts: dict[str, str]) -> str:
    parts = domain.lower().removeprefix("www.").split(".")
    found = (verdicts.get(".".join(parts[i:])) for i in range(len(parts) - 1))
    return next((v for v in found if v), "not rated")


def show(item: ET.Element, verdicts: dict[str, str]) -> None:
    source = item.find("source")
    outlet = source.text if source is not None else "?"
    site = source.get("url", "") if source is not None else ""
    domain = urllib.parse.urlsplit(site).netloc
    print(f"## {item.findtext('title')}")
    print(f"{item.findtext('pubDate')} · {outlet} ({domain})")
    print(f"WP:RSP: {verdict(domain, verdicts)}\n{item.findtext('link')}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--lang", default="en", choices=sorted(EDITIONS))
    parser.add_argument("--days", type=int, default=7, help=f"1 to {DAYS_MAX}")
    parser.add_argument("--limit", type=int, default=10, help=f"1 to {LIMIT_MAX}")
    args = parser.parse_args()
    if not args.query.strip():
        die("empty query", 2)
    if not 1 <= args.days <= DAYS_MAX or not 1 <= args.limit <= LIMIT_MAX:
        die(f"--days must be 1 to {DAYS_MAX}, --limit 1 to {LIMIT_MAX}", 2)
    q = urllib.parse.quote(f"{args.query} when:{args.days}d")
    url = f"https://news.google.com/rss/search?q={q}&{EDITIONS[args.lang]}"
    # Google News is a known host; the feed has no entity tricks to fear.
    feed = ET.fromstring(fetch(url))  # noqa: S314
    items = feed.findall(".//item")[: args.limit]
    if not items:
        die(f"no news for {args.query!r} in the last {args.days} days")
    verdicts = rsp()
    for item in items:
        show(item, verdicts)


if __name__ == "__main__":
    main()
