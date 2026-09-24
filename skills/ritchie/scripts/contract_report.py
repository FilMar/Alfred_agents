#!/usr/bin/env python3
# desc: Per-function report: logic lines (contracts excluded), invariant count, compound or computing asserts, recursion, tests with own asserts. Rust, Python, TypeScript, Go.
# usage: contract_report.py <file-or-dir>... [--lines 40] [--asserts 5] [--all]
"""Heuristic report, not a parser. It reads one file at a time with regexes.

Flags:
  lines>N      more than N logic lines (asserts, blanks, comments, lone brackets excluded)
  asserts>N    more than N asserts in one function
  compound     an assert joins two clauses with && / and
  computes     an assert holds a closure, lambda, comprehension or iterator call
  recursion    the body calls the function by its own name
  test-assert  a test function holds an assert of its own

Exit 1 when any function is flagged, so the script can gate a commit.
"""
import re
import statistics
import sys
from pathlib import Path

EXT = {".rs": "rust", ".py": "python", ".ts": "ts", ".tsx": "ts", ".js": "ts",
       ".mjs": "ts", ".go": "go"}
SKIP_DIRS = {"target", "node_modules", ".git", "spikes", "__pycache__", "dist", "build"}
TS_KEYWORDS = {"if", "for", "while", "switch", "catch", "function", "return",
               "else", "do", "try", "with"}

FN_START = {
    "rust": re.compile(r"^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const\s+|async\s+|unsafe\s+|extern\s+\"C\"\s+)*fn\s+(\w+)"),
    "python": re.compile(r"^(\s*)(?:async\s+)?def\s+(\w+)"),
    "go": re.compile(r"^func\s+(?:\((\w+)\s+[^)]*\)\s*)?(\w+)"),
    "ts": re.compile(
        r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)"
        r"|^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?"
        r"(?:get\s+|set\s+)?(#?\w+)\s*(?:<[^>]*>)?\([^)]*\)\s*(?::\s*[^{;]+)?\{\s*$"),
}
ASSERT_START = {
    "rust": re.compile(r"^\s*(?:debug_)?assert(?:_eq|_ne)?!\s*\("),
    "python": re.compile(r"^\s*assert\b"),
    "ts": re.compile(r"^\s*(?:console\.)?assert\s*\("),
    "go": re.compile(r"^\s*(?:\w+\.)?[Aa]ssert\s*\("),
}
LINE_COMMENT = {"rust": "//", "python": "#", "ts": "//", "go": "//"}
AND_TOKEN = {"rust": "&&", "python": " and ", "ts": "&&", "go": "&&"}
COMPUTE_MARKERS = {
    "rust": [re.compile(r"\|\s*[\w_,\s()]*\|"), re.compile(r"\.(all|any|iter|map|fold|filter)\(")],
    "python": [re.compile(r"\blambda\b"), re.compile(r"\bfor\b"), re.compile(r"\b(all|any|sum)\(")],
    "ts": [re.compile(r"=>"), re.compile(r"\.(every|some|map|filter|reduce)\(")],
    "go": [re.compile(r"\bfunc\s*\(")],
}
STRING = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:\\.|[^\'\\])\'|`[^`]*`')
LONE_BRACKET = re.compile(r"^[\s)\]};,]*$")


def strip_strings(line):
    return STRING.sub('""', line)


def strip_comment(line, lang):
    bare = strip_strings(line)
    idx = bare.find(LINE_COMMENT[lang])
    if idx >= 0:
        return bare[:idx]
    return bare


def is_comment_only(line, lang):
    return line.strip().startswith(LINE_COMMENT[lang])


def paren_delta(text):
    return text.count("(") - text.count(")")


class Function:
    def __init__(self, path, line_no, name, is_test):
        self.path = path
        self.line_no = line_no
        self.name = name
        self.is_test = is_test
        self.logic_lines = 0
        self.asserts = []
        self.logic_text = []
        self.flags = []


def take_assert(lines, i, lang):
    """Return (assert_text, next_index) starting at an assert line."""
    text = []
    depth = 0
    while i < len(lines):
        raw = strip_comment(lines[i], lang)
        text.append(lines[i])
        depth += paren_delta(raw)
        i += 1
        if lang == "python":
            if depth <= 0 and not raw.rstrip().endswith(("\\", ",")):
                break
        elif depth <= 0:
            break
    return text, i


def body_range_brace(lines, start, lang):
    """Find the body lines of a brace-delimited function from its start line."""
    depth = 0
    opened = False
    i = start
    first_body = None
    while i < len(lines):
        raw = strip_comment(lines[i], lang)
        if not opened and ";" in raw and "{" not in raw:
            return None
        for ch in raw:
            if ch == "{":
                depth += 1
                if not opened:
                    opened = True
                    first_body = i + 1
            elif ch == "}":
                depth -= 1
        if opened and depth <= 0:
            return first_body, i
        i += 1
    return None


def body_range_python(lines, start):
    indent = len(lines[start]) - len(lines[start].lstrip())
    i = start
    while i < len(lines) and not strip_strings(lines[i]).rstrip().endswith(":"):
        i += 1
    first_body = i + 1
    j = first_body
    while j < len(lines):
        line = lines[j]
        if line.strip() and (len(line) - len(line.lstrip())) <= indent:
            break
        j += 1
    return first_body, j


def detect_test(lines, i, lang, name, sig):
    if lang == "rust":
        window = "\n".join(lines[max(0, i - 4):i])
        return "#[test]" in window
    if lang == "python":
        return name.startswith("test_")
    if lang == "go":
        return name.startswith("Test") and "testing.T" in sig
    return False


def match_start(line, lang):
    m = FN_START[lang].match(line)
    if not m:
        return None, None
    if lang == "rust":
        return m.group(1), None
    if lang == "python":
        return m.group(2), None
    if lang == "go":
        return m.group(2), m.group(1)
    name = m.group(1) or m.group(2)
    if name in TS_KEYWORDS:
        return None, None
    return name, None


def self_call(name, receiver, is_method):
    """A method calls itself through its receiver; a free function by its bare name."""
    if is_method:
        heads = [r"self\.", r"this\.", r"cls\.", r"Self::"]
        if receiver:
            heads.append(re.escape(receiver) + r"\.")
    else:
        heads = [r"(?<![\w.:#])"]
    return re.compile("(?:" + "|".join(heads) + ")" + re.escape(name) + r"\s*\(")


def detect_method(lines, i, lang, receiver):
    sig = lines[i]
    if lang == "rust":
        return bool(re.search(r"\(\s*&?\s*(mut\s+)?self\b", sig))
    if lang == "python":
        return bool(re.match(r"\s*(async\s+)?def\s+\w+\s*\(\s*(self|cls)\b", sig))
    if lang == "go":
        return receiver is not None
    return not re.match(r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\b", sig)


def scan_file(path, lang, limit_lines, limit_asserts):
    lines = path.read_text(errors="replace").split("\n")
    functions = []
    i = 0
    while i < len(lines):
        name, receiver = match_start(lines[i], lang)
        if not name:
            i += 1
            continue
        if lang == "python":
            rng = body_range_python(lines, i)
        else:
            rng = body_range_brace(lines, i, lang)
        if rng is None:
            i += 1
            continue
        first, last = rng
        fn = Function(path, i + 1, name, detect_test(lines, i, lang, name, lines[i]))
        is_method = detect_method(lines, i, lang, receiver)
        j = first
        while j < last:
            line = lines[j]
            if ASSERT_START[lang].match(line):
                text, j = take_assert(lines, j, lang)
                fn.asserts.append(text)
                continue
            raw = strip_comment(line, lang)
            if raw.strip() and not is_comment_only(line, lang) and not LONE_BRACKET.match(raw):
                fn.logic_lines += 1
                fn.logic_text.append(raw)
            j += 1
        judge(fn, lang, receiver, is_method, limit_lines, limit_asserts)
        functions.append(fn)
        i += 1
    return functions


def judge(fn, lang, receiver, is_method, limit_lines, limit_asserts):
    if fn.logic_lines > limit_lines:
        fn.flags.append(f"lines>{limit_lines}")
    if len(fn.asserts) > limit_asserts:
        fn.flags.append(f"asserts>{limit_asserts}")
    for text in fn.asserts:
        joined = " ".join(strip_comment(t, lang) for t in text)
        if AND_TOKEN[lang] in joined:
            fn.flags.append("compound")
        if any(m.search(joined) for m in COMPUTE_MARKERS[lang]):
            fn.flags.append("computes")
    body = "\n".join(fn.logic_text)
    if self_call(fn.name, receiver, is_method).search(body):
        fn.flags.append("recursion")
    if fn.is_test and fn.asserts:
        fn.flags.append("test-assert")
    fn.flags = sorted(set(fn.flags))


def collect(paths):
    for p in paths:
        p = Path(p)
        if p.is_file():
            if p.suffix in EXT:
                yield p
            continue
        for f in sorted(p.rglob("*")):
            if f.is_file() and f.suffix in EXT and not (set(f.parts) & SKIP_DIRS):
                yield f


def main(argv):
    limit_lines, limit_asserts, show_all, paths = 40, 5, False, []
    it = iter(argv)
    for a in it:
        if a == "--lines":
            limit_lines = int(next(it))
        elif a == "--asserts":
            limit_asserts = int(next(it))
        elif a == "--all":
            show_all = True
        else:
            paths.append(a)
    if not paths:
        print(__doc__.strip().split("\n")[0])
        print("usage: contract_report.py <file-or-dir>... [--lines 40] [--asserts 5] [--all]")
        return 2
    functions = []
    for f in collect(paths):
        functions.extend(scan_file(f, EXT[f.suffix], limit_lines, limit_asserts))
    if not functions:
        print("no functions found")
        return 2
    rows = functions if show_all else [f for f in functions if f.flags]
    for fn in rows:
        print(f"{fn.path}:{fn.line_no}  {fn.name:<28} logic={fn.logic_lines:<3} inv={len(fn.asserts):<2} "
              + " ".join(fn.flags))
    sizes = [f.logic_lines for f in functions]
    flagged = [f for f in functions if f.flags]
    print(f"\n{len(functions)} functions  median={statistics.median(sizes):g}  "
          f"mean={statistics.mean(sizes):.1f}  max={max(sizes)}  "
          f"over{limit_lines}={sum(s > limit_lines for s in sizes)}  flagged={len(flagged)}")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
