#!/usr/bin/env -S uv run --script
# desc: draw the cuts from cut_holes.py as one HTML page, each cut before and after
# usage: render_cuts.py --data <file> [--out <file>] [--open]
# /// script
# requires-python = ">=3.12"
# ///
import argparse
import json
import sys
import tempfile
import webbrowser
from pathlib import Path
from typing import Any, NoReturn

TEMPLATE = Path(__file__).with_name("cuts_page.html")

Json = dict[str, Any]


def die(message: str, code: int = 1) -> NoReturn:
    print(f"render_cuts: {message}", file=sys.stderr)
    sys.exit(code)


def write(target: Path, text: str) -> None:
    tmp = target.with_name(f".{target.name}.tmp")
    try:
        tmp.write_text(text)
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()

    if not TEMPLATE.is_file():
        die(f"no template next to the script: {TEMPLATE}")
    try:
        data: Json = json.loads(args.data.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {args.data}: {error}", 2)
    if not data.get("tagli"):
        die(f"{args.data} has no tagli", 2)
    if any("rows" not in c["stampo"] for c in data["tagli"] if "stampo" in c):
        die(f"{args.data} has stamps without holes: run cut_holes.py first", 2)

    data["tagli"].sort(key=lambda c: c["delta"])
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    out = args.out or Path(tempfile.gettempdir()) / "cuts-page.html"
    write(out, TEMPLATE.read_text().replace("__DATA__", blob))
    print(out)
    if args.open:
        webbrowser.open(out.resolve().as_uri())


if __name__ == "__main__":
    main()
