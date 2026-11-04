#!/usr/bin/env -S uv run --script
# desc: draw spec.json (plain or from overlay.py) and review.json as one HTML page
# usage: render_page.py --spec <file> [--review <file>] [--out <file>] [--open]
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

TEMPLATE = Path(__file__).with_name("render_page.html")
SPEC_KEYS = {"feature", "entita", "flussi", "invarianti"}

Json = dict[str, Any]


def die(message: str, code: int = 1) -> NoReturn:
    print(f"render_page: {message}", file=sys.stderr)
    sys.exit(code)


def load(path: Path) -> Json:
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {path}: {error}")


def unknown_names(spec: Json, review: Json) -> set[str]:
    named = [n for f in spec["flussi"] for n in (f["da"], f["a"])]
    named += [n for e in spec["entita"] for n in e.get("comanda", [])]
    bound = spec["invarianti"] + review.get("scostamenti", [])
    named += [n for v in bound for n in v.get("su", [])]
    return set(named) - {e["id"] for e in spec["entita"]}


def write(target: Path, text: str) -> None:
    tmp = target.with_name(f".{target.name}.tmp")
    try:
        tmp.write_text(text)
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--review", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()

    if not TEMPLATE.is_file():
        die(f"no template next to the script: {TEMPLATE}")
    for path in (args.spec, args.review):
        if path and not path.is_file():
            die(f"no such file: {path}", 2)
    spec = load(args.spec)
    review = load(args.review) if args.review else None
    if missing := SPEC_KEYS - spec.keys():
        die(f"{args.spec} has no {', '.join(sorted(missing))}")
    if unknown := unknown_names(spec, review or {}):
        die(f"names not among the entities: {', '.join(sorted(unknown))}")

    data = {"spec": spec, "review": review, "extra": spec.get("extra", [])}
    data |= {"overlay": "commit" in spec, "commit": spec.get("commit", "-")}
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    out = args.out or Path(tempfile.gettempdir()) / f"{args.spec.stem}-page.html"
    write(out, TEMPLATE.read_text().replace("__DATA__", blob))
    print(out)
    if args.open:
        webbrowser.open(out.resolve().as_uri())


if __name__ == "__main__":
    main()
