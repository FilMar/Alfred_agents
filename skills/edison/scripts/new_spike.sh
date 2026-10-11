#!/usr/bin/env bash
# desc: Create a self-contained spike folder under spikes/ with a header block and a one-command runner.
# usage: new_spike.sh <rust|python|node|go|shell> <slug> "<question>"
set -euo pipefail

langs="rust python node go shell"

if [ "$#" -lt 3 ]; then
    echo "usage: new_spike.sh <lang> <slug> \"<question>\""
    echo "lang:  $langs"
    exit 1
fi

lang="$1"
slug="$2"
question="$3"

case " $langs " in
    *" $lang "*) ;;
    *) echo "error: unknown lang '$lang'. pick one of: $langs"; exit 1 ;;
esac

case "$slug" in
    *[!a-z0-9_-]*) echo "error: slug must be lowercase letters, digits, - or _"; exit 1 ;;
esac

root=$(git rev-parse --show-toplevel)
day=$(date +%Y-%m-%d)
dir="spikes/${day}-${slug}"
abs="${root}/${dir}"

if [ -e "$abs" ]; then
    echo "error: $dir already exists"
    exit 1
fi

mkdir -p "$abs"
printf 'target\n__pycache__\nnode_modules\n' > "${abs}/.gitignore"

header() {
    local mark="$1" run="$2"
    cat <<EOF
${mark} spike: ${slug}
${mark} question: ${question}
${mark} opened: ${day}   timebox: 2h
${mark} run: ${run}
${mark} status: open
${mark} answer: -
${mark}
${mark} Rules are off in here: no contracts, no tests, no abstraction.
${mark} Delete this folder when it stops compiling. Never promote this code.
EOF
}

params() {
    local mark="$1"
    printf '%s --- parameters: edit these, then run again ---\n' "$mark"
}

panel_end() {
    printf '%s --- end parameters ---\n' "$1"
}

case "$lang" in
rust)
    run="cargo run --release --manifest-path ${dir}/Cargo.toml"
    cat > "${abs}/Cargo.toml" <<EOF
[package]
name = "spike-${slug}"
version = "0.0.0"
edition = "2021"

[workspace]

[[bin]]
name = "spike-${slug}"
path = "main.rs"

[dependencies]
EOF
    {
        header "//" "$run"
        printf '\n'; params "//"
        printf 'const TICKS: usize = 200; // how many steps to run\n'
        panel_end "//"
        printf '\nfn main() {\n    todo!("%s: {}", TICKS)\n}\n' "$question"
    } > "${abs}/main.rs"
    echo "note: add path dependencies to ${dir}/Cargo.toml, e.g. core_ca = { path = \"../../modules/core_ca\" }"
    ;;
python)
    run="python ${dir}/main.py"
    {
        header "#" "$run"
        printf '\n'; params "#"
        printf 'TICKS = 200  # how many steps to run\n'
        panel_end "#"
        printf '\nimport sys, pathlib\n'
        printf 'sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))\n'
        printf '\ndef main():\n    raise SystemExit(f"%s {TICKS}")\n\nmain()\n' "$question"
    } > "${abs}/main.py"
    ;;
node)
    run="node ${dir}/main.mjs"
    {
        header "//" "$run"
        printf '\n'; params "//"
        printf 'const TICKS = 200 // how many steps to run\n'
        panel_end "//"
        printf '\nfunction main() {\n  throw new Error(`%s ${TICKS}`)\n}\n\nmain()\n' "$question"
    } > "${abs}/main.mjs"
    ;;
go)
    run="cd ${dir} && go run ."
    printf 'module spike/%s\n\ngo 1.22\n' "$slug" > "${abs}/go.mod"
    {
        header "//" "$run"
        printf '\npackage main\n\n'; params "//"
        printf 'const Ticks = 200 // how many steps to run\n'
        panel_end "//"
        printf '\nfunc main() {\n\tpanic("%s")\n}\n' "$question"
    } > "${abs}/main.go"
    ;;
shell)
    run="${dir}/main.sh"
    {
        printf '#!/usr/bin/env bash\n'
        header "#" "$run"
        printf '\n'; params "#"
        printf 'TICKS=200  # how many steps to run\n'
        panel_end "#"
        printf '\nset -euo pipefail\n\nmain() {\n    echo "%s $TICKS"\n}\n\nmain "$@"\n' "$question"
    } > "${abs}/main.sh"
    chmod +x "${abs}/main.sh"
    ;;
esac

echo "created ${dir}"
echo "run:     ${run}"
