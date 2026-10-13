#!/bin/bash
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
CLAUDE="$HOME/.claude"
PI="$HOME/.pi/agent"

# --- prereq check ---
if ! command -v bun &>/dev/null; then
    echo "[error] bun non trovato in PATH — installa da https://bun.sh"
    exit 1
fi

link() {
    local src="$1" dst="$2" label="$3"
    if [[ -e "$dst" ]]; then
        echo "  [skip] $label already exists"
    else
        ln -s "$src" "$dst"
        echo "  [ok]   $label -> $src"
    fi
}

# --- directories ---
mkdir -p "$HOME/.local/bin"
mkdir -p "$PI"
mkdir -p "$HOME/.pi"
mkdir -p "$CLAUDE"

# --- identity ---
echo "identity (alfred.md)"
link "$REPO/alfred.md" "$CLAUDE/CLAUDE.md"  "~/.claude/CLAUDE.md"
link "$REPO/alfred.md" "$PI/SYSTEM.md"      "~/.pi/agent/SYSTEM.md"

# --- skills ---
echo "skills"
link "$REPO/skills" "$CLAUDE/skills" "~/.claude/skills"
link "$REPO/skills" "$PI/skills"     "~/.pi/agent/skills"

# --- tools (tb, td, th, ti, tl) ---
echo "tools (tb, td, th, ti, tl)"
cd "$REPO" && bun install --silent
echo "  [ok]   bun install done"
for tool in tb td th ti tl; do
    chmod +x "$REPO/tools/$tool/src/cli.ts"
    link "$REPO/tools/$tool/src/cli.ts" "$HOME/.local/bin/$tool" "~/.local/bin/$tool"
done

# --- tb_ti extension (claude hook + pi extension) ---
if command -v claude &>/dev/null || command -v pi &>/dev/null; then
    echo "tb_ti extension"
    if command -v claude &>/dev/null; then
        mkdir -p "$CLAUDE/hooks"
        link "$REPO/extensions/tb_ti/claude.sh" "$CLAUDE/hooks/inject-ti-tb-context.sh" "~/.claude/hooks/inject-ti-tb-context.sh"
    fi
    if command -v pi &>/dev/null; then
        mkdir -p "$PI/extensions"
        link "$REPO/extensions/tb_ti/pi.ts" "$PI/extensions/tb_ti.ts" "~/.pi/agent/extensions/tb_ti.ts"
    fi
fi

# --- systemd user services (tb, ti HTTP API) ---
echo "systemd user services (tb, ti)"
mkdir -p "$HOME/.config/systemd/user"
link "$REPO/tools/tb/deploy/tb.service" "$HOME/.config/systemd/user/tb.service" "~/.config/systemd/user/tb.service"
link "$REPO/tools/ti/deploy/ti.service" "$HOME/.config/systemd/user/ti.service" "~/.config/systemd/user/ti.service"
systemctl --user daemon-reload
echo "  [ok]   linked, not enabled. To start: systemctl --user enable --now tb.service ti.service"
