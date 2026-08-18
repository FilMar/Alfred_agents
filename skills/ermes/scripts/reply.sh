#!/usr/bin/env bash
# desc: build a reply draft (quoted original prefilled), save it to ~/mail/outbox, never send it
# usage: reply.sh <account> <id> [folder]
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
    echo "Usage: reply.sh <account> <id> [folder]" >&2
    exit 1
fi

account="$1"
id="$2"
folder="${3:-INBOX}"

mkdir -p ~/mail/outbox
file=~/mail/outbox/reply-"$id".eml
himalaya message reply "$id" -m "$folder" -a "$account" > "$file"
echo "Template saved: $file"
