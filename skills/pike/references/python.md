# Python

The skeleton. Copy it, then delete what the script does not use.
Standard library first. A third-party package goes in an inline
script block, so `uv run` installs it and no virtualenv is needed.

```python
#!/usr/bin/env -S uv run --script
# desc: count lines per file extension under a directory
# usage: count_lines.py --root <dir> [--limit <n>]
# /// script
# requires-python = ">=3.12"
# ///
import argparse
import sys
from collections import Counter
from pathlib import Path

FILES_MAX = 100_000


def die(message: str, code: int = 1) -> None:
    print(f"count_lines: {message}", file=sys.stderr)
    sys.exit(code)


def count(root: Path) -> Counter[str]:
    totals: Counter[str] = Counter()
    for seen, path in enumerate(root.rglob("*")):
        if seen >= FILES_MAX:
            die(f"more than {FILES_MAX} files under {root}")
        if path.is_file():
            with path.open(errors="replace") as handle:
                totals[path.suffix or "<none>"] += sum(1 for _ in handle)
    return totals


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    if not args.root.is_dir():
        die(f"no such directory: {args.root}")

    for suffix, lines in count(args.root).most_common(args.limit):
        print(f"{lines}\t{suffix}")


if __name__ == "__main__":
    main()
```

## Idioms that matter

- `argparse` with `allow_abbrev=False`, so only full flags work. It
  exits with code 2 on wrong usage by itself.
- `pathlib.Path`, never string paths.
- `subprocess.run([...], check=True, timeout=...)` with a list. Never
  `shell=True`.
- An atomic write: write to `path.with_suffix(".tmp")`, then
  `tmp.replace(path)`.
- Catch only the exception you can act on, at the point where you can
  act on it. Turn it into `die(...)` with a message for the user.
- Type hints on every function. They are the cheapest check there is.
