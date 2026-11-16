#!/usr/bin/env bash
# desc: install alfred; client also clones the repo and links identity, skills and extensions; server also starts the user unit
# usage: setup.sh client|server [--dry-run]
set -euo pipefail

readonly repo_url=https://github.com/FilMar/Alfred_agents
readonly branch=${ALFRED_BRANCH:-main}
readonly home_dir=${ALFRED_HOME:-$HOME/.local/share/alfred/repo}
readonly port=${ALFRED_PORT:-8791}
readonly unit_dir=$HOME/.config/systemd/user
readonly unit=$unit_dir/alfred.service

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

install_alfred() {
    run cargo install --git "$repo_url" --branch "$branch" \
        --profile release-checked --locked --root "$HOME/.local" alfred
}

client() {
    command -v git >/dev/null || die "git not found"
    if [[ -d $home_dir/.git ]]; then say "[skip] $home_dir is a checkout"
    else run git clone --branch "$branch" "$repo_url" "$home_dir"; fi
    local claude=$HOME/.claude pi=$HOME/.pi/agent ext=$home_dir/extensions
    link "$home_dir/alfred.md" "$claude/CLAUDE.md"
    link "$home_dir/alfred.md" "$pi/SYSTEM.md"
    link "$home_dir/skills" "$claude/skills"
    link "$home_dir/skills" "$pi/skills"
    if command -v claude >/dev/null; then
        link "$ext/tb_ti/claude.sh" "$claude/hooks/inject-ti-tb-context.sh"
        link "$ext/tl/claude.sh" "$claude/hooks/ingest-tl.sh"
        link "$ext/tb_refine/claude.sh" "$claude/hooks/refine-tb.sh"
    fi
    if command -v pi >/dev/null; then
        link "$ext/tb_ti/pi.ts" "$pi/extensions/tb_ti.ts"
        link "$ext/tl/pi.ts" "$pi/extensions/tl.ts"
        link "$ext/tb_refine/pi.ts" "$pi/extensions/tb_refine.ts"
    fi
    install_alfred
}

# systemd expands ${ALFRED_PORT}, not the shell.
# shellcheck disable=SC2016
unit_text() {
    printf '%s\n' '[Unit]' 'Description=alfred serve' 'After=network-online.target' '' \
        '[Service]' "Environment=ALFRED_PORT=$port" 'EnvironmentFile=-%h/.config/alfred/env' \
        'ExecStart=%h/.local/bin/alfred serve --port ${ALFRED_PORT}' 'Restart=on-failure' '' \
        '[Install]' 'WantedBy=default.target'
}

server() {
    command -v systemctl >/dev/null || die "systemctl not found"
    command -v loginctl >/dev/null || die "loginctl not found"
    install_alfred
    local want have linger
    want=$(unit_text)
    have=$(cat "$unit" 2>/dev/null || true)
    if [[ $want == "$have" ]]; then say "[skip] $unit is current"
    elif $dry_run; then say "would write $unit"
    else
        mkdir --parents "$unit_dir"
        tmp=$(mktemp "$unit.XXXXXX")
        printf '%s\n' "$want" >"$tmp"
        chmod 644 "$tmp"
        mv "$tmp" "$unit"
        say "[ok]   $unit"
    fi
    linger=$(loginctl show-user "$USER" --property=Linger --value)
    [[ $linger == yes ]] || run loginctl enable-linger "$USER"
    run systemctl --user daemon-reload
    run systemctl --user enable alfred.service
    run systemctl --user restart alfred.service
}

role="" dry_run=false
while (($#)); do
    case $1 in
        client | server) role=$1; shift ;;
        --dry-run) dry_run=true; shift ;;
        --help) usage ;;
        *) die "unknown argument: $1" 2 ;;
    esac
done
[[ -n $role ]] || usage
command -v cargo >/dev/null || die "cargo not found: install rustup (https://rustup.rs)"
tmp=""
trap 'rm -f "$tmp"' EXIT
"$role"
