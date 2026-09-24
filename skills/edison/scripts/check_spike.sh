#!/usr/bin/env bash
# desc: Check a spike stays contained: one path, one arrow, free to delete, one command.
# usage: check_spike.sh <spike_path>
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "usage: check_spike.sh <spike_path>"
    exit 1
fi

root=$(git rev-parse --show-toplevel)
abs=$(cd "$1" 2>/dev/null && pwd) || { echo "error: $1 is not a directory"; exit 1; }
rel="${abs#"$root"/}"
name=$(basename "$abs")
fail=0

say() { printf '%-28s %s\n' "$1" "$2"; }

case "$rel" in
    spikes/*) say "one path" "ok    $rel" ;;
    *) say "one path" "FAIL  lives outside spikes/: $rel"; fail=1 ;;
esac

hits=$(grep -rIl --exclude-dir=.git --exclude-dir=target --exclude-dir=spikes \
    --exclude-dir=node_modules -e "$name" -e "$rel" "$root" 2>/dev/null || true)
if [ -n "$hits" ]; then
    say "one arrow" "FAIL  the project mentions the spike:"
    echo "$hits" | sed 's/^/                             /'
    fail=1
else
    say "one arrow" "ok    nothing outside points here"
fi

manifests=$(ls "$root"/Cargo.toml "$root"/package.json "$root"/pyproject.toml \
    "$root"/go.work "$root"/go.mod 2>/dev/null || true)
listed=""
for m in $manifests; do
    if grep -q "spikes" "$m" 2>/dev/null; then listed="${listed} ${m#"$root"/}"; fi
done
if [ -n "$listed" ]; then
    say "free to delete" "FAIL  build manifests list spikes:${listed}"
    fail=1
else
    say "free to delete" "ok    outside every build manifest"
fi

code=$(find "$abs" -maxdepth 1 -type f \
    ! -name '.gitignore' ! -name '*.toml' ! -name '*.lock' ! -name '*.sum' \
    ! -name '*.json' ! -name 'go.mod')
lines=$(cat $code 2>/dev/null | wc -l)
count=$(echo "$code" | grep -c . || true)
if [ "$count" -gt 1 ] && [ "$lines" -le 1000 ]; then
    say "one code file" "WARN  $count files, only $lines lines: merge them"
elif [ "$lines" -gt 1000 ]; then
    say "one code file" "WARN  $lines lines: the question was too big, split it"
else
    say "one code file" "ok    $lines lines"
fi

head_file=$(grep -l "spike: " $code 2>/dev/null | head -1 || true)
missing=""
if [ -z "$head_file" ]; then
    missing=" the whole header block"
else
    for field in "question:" "run:" "status:"; do
        grep -q "$field" "$head_file" || missing="${missing} ${field}"
    done
fi
if [ -n "$missing" ]; then
    say "one command" "FAIL  header is missing:${missing}"
    fail=1
else
    say "one command" "ok    header names the question and the run command"
fi

panel=$(grep -n -- "--- parameters" "$head_file" 2>/dev/null | head -1 | cut -d: -f1 || true)
entry=$(grep -nE "fn main|def main|func main|function main|^main\(\)" "$head_file" 2>/dev/null | head -1 | cut -d: -f1 || true)
if [ -z "$panel" ]; then
    say "one panel" "FAIL  no parameter block: the file cannot be driven without reading it"
    fail=1
elif [ -n "$entry" ] && [ "$panel" -gt "$entry" ]; then
    say "one panel" "FAIL  parameter block sits below the entry point"
    fail=1
else
    say "one panel" "ok    parameters on top, line $panel"
fi

exit "$fail"
