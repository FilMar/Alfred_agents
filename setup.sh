#!/usr/bin/env bash
# desc: install alfred on a client: clone the repo if missing, link identity, skills and extensions, cargo install alfred
# usage: setup.sh [--dry-run]
set -euo pipefail

readonly repo_url=https://github.com/FilMar/Alfred_agents
# Run from a checkout, use it and its branch; piped through curl, clone main.
self=$(cd "$(dirname "${BASH_SOURCE[0]:-/nowhere/x}")" 2>/dev/null && pwd || true)
[[ -f $self/tools/alfred/Cargo.toml ]] || self=$HOME/.local/share/alfred/repo
readonly home_dir=${ALFRED_HOME:-$self}
here=$(git -C "$home_dir" branch --show-current 2>/dev/null || true)
readonly branch=${ALFRED_BRANCH:-${here:-main}}

die() { printf 'setup: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }
say() { printf '  %s\n' "$1" >&2; }
run() { if $dry_run; then say "would run: $*"; else "$@"; fi; }

link() {
    local src=$1 dst=$2
    if [[ -e $dst || -L $dst ]]; then say "[skip] $dst exists"; return; fi
    run mkdir --parents "$(dirname "$dst")"
    run ln --symbolic "$src" "$dst"
    say "[ok]   $dst -> $src"
}

dry_run=false
while (($#)); do
    case $1 in
        --dry-run) dry_run=true; shift ;;
        --help) usage ;;
        *) die "unknown argument: $1" 2 ;;
    esac
done
command -v git >/dev/null || die "git not found"
command -v cargo >/dev/null || die "cargo not found: install rustup (https://rustup.rs)"

if [[ -d $home_dir/.git ]]; then say "[skip] $home_dir is a checkout"
else run git clone --branch "$branch" "$repo_url" "$home_dir"; fi

claude=$HOME/.claude pi=$HOME/.pi/agent ext=$home_dir/extensions
link "$home_dir/alfred.md" "$claude/CLAUDE.md"
link "$home_dir/alfred.md" "$pi/SYSTEM.md"
for dir in "$claude" "$pi"; do link "$home_dir/skills" "$dir/skills"; done
if command -v claude >/dev/null; then
    for name in rules hist refine; do link "$ext/$name/claude.sh" "$claude/hooks/$name.sh"; done
fi
if command -v pi >/dev/null; then
    for name in rules hist refine; do link "$ext/$name/pi.ts" "$pi/extensions/$name.ts"; done
fi

run cargo install --git "$repo_url" --branch "$branch" \
    --profile release-checked --locked --root "$HOME/.local" alfred
