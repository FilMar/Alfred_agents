#!/usr/bin/env -S uv run --script
# desc: open a page in headless Brave, play its clicks, print JS errors, save shots
# usage: check_page.py --page <file> [--clicks <file>] [--wait <ms>] [--browser <path>]
# /// script
# requires-python = ">=3.12"
# dependencies = ["playwright==1.64.1"]
# ///
import argparse
import sys
from pathlib import Path
from typing import NoReturn

from playwright.sync_api import Error, Page, sync_playwright

BROWSER = "/usr/bin/brave"
WAIT_MS = 1500
VIEWPORT = {"width": 1280, "height": 900}
CLICK_MS = 400  # let each reveal or transition settle
CLICK_TIMEOUT_MS = 3000


def die(message: str, code: int = 1) -> NoReturn:
    print(f"check_page: {message}", file=sys.stderr)
    sys.exit(code)


def play(page: Page, steps: list[str], stem: Path, scheme: str) -> None:
    shots = 0
    for step in steps:
        if step == "shot":
            shots += 1
            path = stem.with_name(f"{stem.stem}-{scheme}-{shots}.png")
            page.screenshot(path=path, full_page=True)
            print(path)
        elif step.startswith("wait "):
            page.wait_for_timeout(int(step.removeprefix("wait ")))
        else:
            page.click(step, timeout=CLICK_TIMEOUT_MS)
            page.wait_for_timeout(CLICK_MS)


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--page", type=Path, required=True)
    parser.add_argument("--clicks", type=Path)
    parser.add_argument("--wait", type=int, default=WAIT_MS)
    parser.add_argument("--browser", default=BROWSER)
    args = parser.parse_args()

    if not args.page.is_file():
        die(f"no such file: {args.page}", 2)
    if not Path(args.browser).is_file():
        die(f"no browser at {args.browser}", 2)
    steps = []
    if args.clicks:
        if not args.clicks.is_file():
            die(f"no such file: {args.clicks}", 2)
        lines = (line.strip() for line in args.clicks.read_text().splitlines())
        steps = [line for line in lines if line and not line.startswith("//")]

    errors: list[str] = []
    try:
        with sync_playwright() as driver:
            browser = driver.chromium.launch(executable_path=args.browser)
            for scheme in ("light", "dark"):
                page = browser.new_page(viewport=VIEWPORT, color_scheme=scheme)
                page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                page.on(
                    "console",
                    lambda m: m.type == "error" and errors.append(f"console: {m.text}"),
                )
                page.goto(args.page.resolve().as_uri())
                page.wait_for_timeout(args.wait)
                shot = args.page.with_name(f"{args.page.stem}-{scheme}.png")
                page.screenshot(path=shot, full_page=True)
                print(shot)
                play(page, [*steps, "shot"] if steps else [], args.page, scheme)
            browser.close()
    except Error as error:
        die(f"browser failed: {error}")

    for line in dict.fromkeys(errors):
        print(f"  ERROR {line}", file=sys.stderr)
    if errors:
        die("fix the JS errors and run again")


if __name__ == "__main__":
    main()
