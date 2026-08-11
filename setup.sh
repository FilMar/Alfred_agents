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

# --- tools (tb, th, ti) ---
echo "tools (tb, th, ti)"
cd "$REPO" && bun install --silent
echo "  [ok]   bun install done"
chmod +x "$REPO/tools/tb/src/cli.ts"
chmod +x "$REPO/tools/th/src/cli.ts"
chmod +x "$REPO/tools/ti/src/cli.ts"
link "$REPO/tools/tb/src/cli.ts"  "$HOME/.local/bin/tb"  "~/.local/bin/tb"
link "$REPO/tools/th/src/cli.ts"  "$HOME/.local/bin/th"  "~/.local/bin/th"
link "$REPO/tools/ti/src/cli.ts"  "$HOME/.local/bin/ti"  "~/.local/bin/ti"

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
link "$REPO/tools/tb/tb.service" "$HOME/.config/systemd/user/tb.service" "~/.config/systemd/user/tb.service"
link "$REPO/tools/ti/ti.service" "$HOME/.config/systemd/user/ti.service" "~/.config/systemd/user/ti.service"
systemctl --user daemon-reload
echo "  [ok]   linked, not enabled. To start: systemctl --user enable --now tb.service ti.service"
