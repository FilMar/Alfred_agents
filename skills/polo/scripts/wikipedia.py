#!/usr/bin/env python3
# desc: search Wikipedia, or read one article with its sections and cited links
# usage: wikipedia.py search|read <query or title> [--lang <code>] [--limit <n>]
"""Search prints one block per hit: title, excerpt, URL.
Read prints title, URL, the text with == Section == headings, then the cited links."""

import argparse
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT_S = 20
LIMIT_MAX = 20
LINKS_MAX = 500
USER_AGENT = "polo-wikipedia/1.0 (personal research script)"


def die(message: str, code: int = 1) -> None:
    print(f"wikipedia: {message}", file=sys.stderr)
    sys.exit(code)


def api(lang: str, params: dict[str, str]) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    url = f"https://{lang}.wikipedia.org/w/api.php?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        # The scheme is always https: the URL is built above.
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as reply:  # noqa: S310
            return json.load(reply)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        die(f"{lang}.wikipedia.org did not answer: {error}")
    return {}


def plain(snippet: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", snippet))


def search(lang: str, query: str, limit: int) -> None:
    data = api(
        lang,
        {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": str(limit),
            "srprop": "snippet",
        },
    )
    hits = data.get("query", {}).get("search", [])
    if not hits:
        hint = data.get("query", {}).get("searchinfo", {}).get("suggestion")
        die(f"no article for {query!r}" + (f": try {hint!r}" if hint else ""))
    for hit in hits:
        title = hit["title"]
        slug = urllib.parse.quote(title.replace(" ", "_"))
        url = f"https://{lang}.wikipedia.org/wiki/{slug}"
        print(f"## {title}\n{plain(hit.get('snippet', ''))}\n{url}\n")


def read(lang: str, title: str) -> None:
    data = api(
        lang,
        {
            "action": "query",
            "prop": "extracts|extlinks|info",
            "inprop": "url",
            "explaintext": "1",
            "ellimit": str(LINKS_MAX),
            "redirects": "1",
            "titles": title,
        },
    )
    pages = data.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        die(f"no article titled {title!r}: run search first")
    page = pages[0]
    links = [link["url"] for link in page.get("extlinks", [])]
    print(
        f"# {page['title']}\n{page['fullurl']}\n\n{page.get('extract', '').strip()}\n",
    )
    print("## Cited links")
    print("\n".join(f"- {link}" for link in links) or "(none)")
    if "continue" in data:
        print(f"(only the first {LINKS_MAX} links)", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["search", "read"])
    parser.add_argument("text", help="the query for search, the exact title for read")
    parser.add_argument(
        "--lang",
        default="en",
        help="Wikipedia language code (default en)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help=f"hits for search, 1 to {LIMIT_MAX}",
    )
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z]{2,3}(-[a-z]+)?", args.lang):
        die(f"bad language code: {args.lang}", 2)
    if not 1 <= args.limit <= LIMIT_MAX:
        die(f"--limit must be 1 to {LIMIT_MAX}", 2)
    if not args.text.strip():
        die("empty query or title", 2)
    if args.command == "search":
        search(args.lang, args.text, args.limit)
    else:
        read(args.lang, args.text)


if __name__ == "__main__":
    main()
