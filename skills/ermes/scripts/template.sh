#!/usr/bin/env bash
# desc: compose a new draft, save it to ~/mail/outbox, never send it
# usage: template.sh <account> <to> "<subject>" "<body>"
set -euo pipefail

if [ "$#" -ne 4 ]; then
    echo 'Usage: template.sh <account> <to> "<subject>" "<body>"' >&2
    exit 1
fi

account="$1"
to="$2"
subject="$3"
body="$4"

mkdir -p ~/mail/outbox
slug=$(echo "$subject" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
file=~/mail/outbox/"$slug".eml
himalaya message compose -a "$account" -t "$to" -s "$subject" --body "$body" > "$file"
echo "Template saved: $file"
