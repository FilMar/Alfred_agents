#!/usr/bin/env -S uv run --script
# desc: check the cites of a lesson, count its prose, wrap it in the frame
# usage: lesson_page.py --lesson <file> --sources <file> [--words <n>] [--out <file>]
# /// script
# requires-python = ">=3.12"
# ///
import argparse
import html
import json
import re
import sys
from pathlib import Path
from typing import NoReturn

FRAME = Path(__file__).with_name("lesson_frame.html")
WORDS_MAX = 180
STATIC = re.compile(r'<cite\s+data-src="(\w+):(\d+)"\s+data-q="([^"]+)"')
DYNAMIC = re.compile(r'cite\(\s*"(\w+):(\d+)",\s*"([^"]+)"\s*\)')
HIDDEN = re.compile(r"<(script|style|svg)\b.*?</\1>", re.DOTALL)
TAGS = re.compile(r"<cite\b.*?</cite>|<[^>]+>", re.DOTALL)


def die(message: str, code: int = 1) -> NoReturn:
    print(f"lesson_page: {message}", file=sys.stderr)
    sys.exit(code)


def flat(text: str) -> str:
    return " ".join(text.split())


def load_sources(path: Path) -> dict[str, tuple[str, list[str]]]:
    try:
        raw = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {path}: {error}", 2)
    sources = {}
    for key, entry in raw.items():
        file = path.parent / entry["file"]
        if not file.is_file():
            die(f"source {key}: no such file: {file}", 2)
        sources[key] = (entry.get("url", str(file)), file.read_text().splitlines())
    return sources


def check_cites(lesson: str, sources: dict) -> tuple[dict[str, str], list[str]]:
    pairs = [(s, int(n), html.unescape(q)) for s, n, q in STATIC.findall(lesson)]
    pairs += [(s, int(n), q) for s, n, q in DYNAMIC.findall(lesson)]
    used, bad = {}, []
    for src, line, quote in pairs:
        lines = sources.get(src, (None, []))[1]
        para = lines[line - 1] if 0 < line <= len(lines) else ""
        if not para or flat(quote) not in flat(para):
            bad.append(f"{src}:{line} does not contain: {quote}")
        else:
            used[f"{src}:{line}"] = para
    if not pairs:
        bad.append("no cite: every claim needs a source")
    return used, bad


def count_words(lesson: str) -> int:
    prose = TAGS.sub(" ", HIDDEN.sub(" ", lesson))
    return len(html.unescape(prose).split())


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--lesson", type=Path, required=True)
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--words", type=int, default=WORDS_MAX)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    if not args.lesson.is_file():
        die(f"no such file: {args.lesson}", 2)
    lesson = args.lesson.read_text()
    sources = load_sources(args.sources)
    used, bad = check_cites(lesson, sources)
    words = count_words(lesson)

    print(f"cites: {len(used)} paragraphs, bad: {len(bad)}", file=sys.stderr)
    for line in bad:
        print(f"  BAD {line}", file=sys.stderr)
    print(f"words: {words} / {args.words}", file=sys.stderr)
    if bad or words > args.words:
        die("fix the lesson and run again")

    urls = {key: url for key, (url, _) in sources.items()}
    data = json.dumps({"used": used, "urls": urls}, ensure_ascii=False)
    page = FRAME.read_text().replace("__DATA__", data.replace("</", "<\\/"))
    out = (args.out or args.lesson.with_name("page.html")).resolve()
    out.write_text(page.replace("__LESSON__", lesson))
    print(out)


if __name__ == "__main__":
    main()
