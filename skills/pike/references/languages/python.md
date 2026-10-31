# Python

Answers to `references/adapting-a-language.md`.

1. **Run.** `#!/usr/bin/env -S uv run --script`. Packages go in the
   inline `# /// script` block; `uv` installs them on the first run.
   Standard library first.
2. **Fail fast.** Python stops on any uncaught exception. Catch only
   what you turn into `die`, at the place you can name the cause.
3. **Flags.** `argparse.ArgumentParser(allow_abbrev=False)`. It exits
   with code 2 on a wrong flag by itself.
4. **Die.**
   ```python
   def die(message: str, code: int = 1) -> NoReturn:
       print(f"name: {message}", file=sys.stderr)
       sys.exit(code)
   ```
5. **Subprocess.**
   ```python
   subprocess.run(["git", "fetch", "--prune"], check=True, timeout=30)
   ```
6. **Files.**
   ```python
   tmp = target.with_name(f".{target.name}.tmp")
   try:
       tmp.write_text(text)
       tmp.replace(target)
   finally:
       tmp.unlink(missing_ok=True)
   ```
7. **Gate.** `ruff check --select ALL --ignore D,T20,INP001,CPY` and
   `ruff format --check`.

## Skeleton

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
from typing import NoReturn

FILES_MAX = 100_000


def die(message: str, code: int = 1) -> NoReturn:
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

- `pathlib.Path`, never string paths.
- A list for `subprocess.run`, never `shell=True`.
- Type hints on every function. They are the cheapest check there is.
