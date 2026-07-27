#!/usr/bin/env bash
# Flow harness: Council of Experts.
#
# Code drives the phases; the AI reasons only inside member runs.
# Annibale picks the roster and launches this script — it cannot skip
# a phase, forget an output, or synthesise before every expert answered.
#
# Usage:
#   council.sh --task "<problem>" --members "a,b,c" \
#              [--rounds N] [--synth <member>] [--run-id ID] [--timeout SEC]
#
# Resume: re-run with the same --run-id — completed steps are skipped,
# failed or missing ones are re-executed.
#
# Exit codes: 0 ok, 1 execution/validation failure, 2 usage error.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JUSTFILE="$SCRIPT_DIR/../justfile"

# ─── Defaults ─────────────────────────────────────────────────────────────────

TASK=""
MEMBERS_CSV=""
ROUNDS=1
SYNTH="von-neumann-blue"
RUN_ID=""
TIMEOUT=600
DRY_RUN=0
MAX_MEMBERS="${COUNCIL_MAX_MEMBERS:-5}"
FLOW_BASE="${TH_FLOW_DIR:-/tmp/th-flow}"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

die() { echo "error: $*" >&2; exit 1; }

# ─── Parse args ───────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)    TASK="${2:?--task needs a value}"; shift 2 ;;
    --members) MEMBERS_CSV="${2:?--members needs a value}"; shift 2 ;;
    --rounds)  ROUNDS="${2:?--rounds needs a value}"; shift 2 ;;
    --synth)   SYNTH="${2:?--synth needs a value}"; shift 2 ;;
    --run-id)  RUN_ID="${2:?--run-id needs a value}"; shift 2 ;;
    --timeout) TIMEOUT="${2:?--timeout needs a value}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown option: $1" >&2; usage ;;
  esac
done

[[ -n "$TASK" ]]        || { echo "missing --task" >&2; usage; }
[[ -n "$MEMBERS_CSV" ]] || { echo "missing --members" >&2; usage; }
[[ "$ROUNDS" =~ ^[1-9][0-9]*$ ]]  || die "--rounds must be a positive integer (got: $ROUNDS)"
[[ "$TIMEOUT" =~ ^[1-9][0-9]*$ ]] || die "--timeout must be a positive integer (got: $TIMEOUT)"

IFS=',' read -ra MEMBERS <<< "$MEMBERS_CSV"
(( ${#MEMBERS[@]} >= 2 ))            || die "a council needs at least 2 members"
(( ${#MEMBERS[@]} <= MAX_MEMBERS ))  || die "${#MEMBERS[@]} members > max $MAX_MEMBERS (override with COUNCIL_MAX_MEMBERS)"

command -v jq >/dev/null || die "jq is required"
command -v just >/dev/null || die "just not found in PATH"

# ─── Pre-flight: every member must exist (fail fast, not mid-run) ─────────────

# The harness delegates member existence checks to the annibale justfile.
# Launch this script from the project root.
for m in "${MEMBERS[@]}" "$SYNTH"; do
  just -f "$JUSTFILE" member-exists "$m" >/dev/null 2>&1 \
    || die "member not found: '$m'. Project members are resolved from the cwd — are you in the project root? (or create it via the fury skill)"
done

# ─── Run dir (deterministic names → resume) ───────────────────────────────────

[[ -n "$RUN_ID" ]] || RUN_ID="council-$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$FLOW_BASE/$RUN_ID"

echo "council: ${#MEMBERS[@]} members, $ROUNDS round(s), synth=$SYNTH" >&2
echo "run dir: $RUN_DIR  (resume with --run-id $RUN_ID)" >&2

if (( DRY_RUN )); then
  echo "dry-run: plan validated, nothing executed." >&2
  exit 0
fi

mkdir -p "$RUN_DIR"
{
  echo "task: $TASK"
  echo "members: ${MEMBERS[*]}"
  echo "rounds: $ROUNDS  synth: $SYNTH  timeout: ${TIMEOUT}s"
} > "$RUN_DIR/meta.txt"

# ─── Helpers ──────────────────────────────────────────────────────────────────

# A step is complete when its collected output exists and is non-empty.
step_done() { [[ -s "$1" ]]; }

# Harvest a finished detached job: status must be "done", out must be non-empty.
# harvest <job-json-file> <dest-md>  → 0 if collected, 1 otherwise
harvest() {
  local job="$1" dest="$2" status_path out_path
  [[ -s "$job" ]] || return 1
  status_path=$(jq -r .status "$job")
  out_path=$(jq -r .out "$job")
  [[ "$(cat "$status_path" 2>/dev/null)" == "done" ]] || return 1
  [[ -s "$out_path" ]] || return 1
  cp "$out_path" "$dest"
}

# ─── Rounds ───────────────────────────────────────────────────────────────────

CONTEXT=""

for round in $(seq 1 "$ROUNDS"); do
  echo "── round $round/$ROUNDS ──" >&2

  # Phase 1 — LAUNCH: parallel fan-out, one detached job per missing output
  pending_status=()
  pending_members=()
  for m in "${MEMBERS[@]}"; do
    md="$RUN_DIR/r${round}-${m}.md"
    job="$RUN_DIR/r${round}-${m}.job"

    if step_done "$md"; then
      echo "  [skip] $m (already done)" >&2
      continue
    fi
    # Crash-recovery: a previous launch may have finished without being collected.
    if harvest "$job" "$md"; then
      echo "  [harvest] $m (finished in a previous run)" >&2
      continue
    fi

    prompt="You are summoned as an expert in a council. Round ${round}.

Problem:
${TASK}
"
    if [[ -n "$CONTEXT" ]]; then
      prompt+="
Synthesis of the previous round:
${CONTEXT}
"
    fi
    prompt+="
Analyse from your point of view only. Be specific, not generic. Bring what only you can bring."

    just -f "$JUSTFILE" run-detached "$m" "$prompt" --timeout "$TIMEOUT" > "$job"
    pending_status+=("$(jq -r .status "$job")")
    pending_members+=("$m")
    echo "  [launch] $m" >&2
  done

  # Phase 2 — WAIT: native poll with crash detection; never synthesise early
  if (( ${#pending_status[@]} > 0 )); then
    just -f "$JUSTFILE" wait --timeout "$TIMEOUT" "${pending_status[@]}" > "$RUN_DIR/r${round}-wait.json" || true
  fi

  # Phase 3 — VALIDATE + COLLECT: every expert must have produced output
  failed=()
  for m in "${pending_members[@]}"; do
    if ! harvest "$RUN_DIR/r${round}-${m}.job" "$RUN_DIR/r${round}-${m}.md"; then
      failed+=("$m: $(cat "$(jq -r .status "$RUN_DIR/r${round}-${m}.job")" 2>/dev/null || echo 'no status')")
    fi
  done
  if (( ${#failed[@]} > 0 )); then
    printf 'round %s failed for:\n' "$round" >&2
    printf '  %s\n' "${failed[@]}" >&2
    die "fix or wait, then resume with: --run-id $RUN_ID"
  fi

  # Phase 4 — SYNTH: the only sequential step of the round
  synth_md="$RUN_DIR/r${round}-synthesis.md"
  if step_done "$synth_md"; then
    echo "  [skip] synthesis (already done)" >&2
  else
    perspectives=""
    for m in "${MEMBERS[@]}"; do
      perspectives+="
## Perspective: ${m}
$(cat "$RUN_DIR/r${round}-${m}.md")
"
    done
    echo "  [synth] $SYNTH" >&2
    synth_prompt="You are the synthesiser of a council of experts. Round ${round}.

Problem:
${TASK}

Independent perspectives collected:
${perspectives}

Synthesise into ONE concrete recommendation: points of agreement, real tensions, decision. Do not flatten disagreements — surface them."
    just -f "$JUSTFILE" run "$SYNTH" "$synth_prompt" --timeout "$TIMEOUT" > "$synth_md"
    step_done "$synth_md" || die "synthesis produced no output — resume with: --run-id $RUN_ID"
  fi

  CONTEXT=$(cat "$synth_md")
done

# ─── Result ───────────────────────────────────────────────────────────────────

echo "── final synthesis (round $ROUNDS) ──" >&2
cat "$RUN_DIR/r${ROUNDS}-synthesis.md"
