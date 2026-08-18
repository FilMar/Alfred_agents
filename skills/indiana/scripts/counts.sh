#!/usr/bin/env bash
# desc: count source files and test files under a path
# usage: counts.sh <path>
set -euo pipefail

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
    echo "usage: counts.sh <path>" >&2
    exit 2
fi

path="$1"

src=$(find "$path" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.go" -o -name "*.rs" \) | grep -v node_modules | grep -v ".git" | wc -l)
tests=$(find "$path" \( -name "*.test.*" -o -name "*_test.*" -o -name "*spec*" \) | grep -v node_modules | wc -l)
echo "source: $src  tests: $tests"
