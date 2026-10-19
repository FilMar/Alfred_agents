#!/usr/bin/env bash
# desc: Agentic debate on one problem: parallel voices, each with its own hat and stance, then one synthesis.
# usage: debate.sh --task "<brief>" --expert "<hat>:<stance>" --expert "<hat>:<stance>" [flags]
#
# Code drives the phases; the AI reasons only inside the runs.
# Annibale writes the brief and the stances and launches this script.
# The script cannot skip a phase, forget an output, or synthesise before
# every voice answered.
#
# Flags:
#   --task "<brief>" | --task-file <file>   the problem, self-contained
#   --expert "<hat>:<stance>"               one voice; repeat 2 to 5 times.
#                                           The first colon splits hat from stance.
#   --synth <hat>                           default blue-core
#   --model "<hat>=<provider/id>"           model for every run under that hat,
#                                           synthesis included. Repeat per hat.
#                                           Without it, th picks the model.
#   --run-id ID                             reuse to resume a crashed run
#   --timeout SEC                           per run, default 600
#   --dry-run                               validate without spending any call
#
# Voices run in the run directory, not in the project, so they see the brief
# and nothing else.
#
# Exit codes: 0 ok, 1 execution/validation failure, 2 usage error.

set -euo pipefail

TASK=""
TASK_FILE=""
HATS=()
STANCES=()
declare -A MODELS=()
SYNTH="blue-core"
RUN_ID=""
TIMEOUT=600
DRY_RUN=0
MAX_EXPERTS="${DEBATE_MAX_EXPERTS:-5}"
FLOW_BASE="${TH_FLOW_DIR:-/tmp/th-flow}"

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

die() { echo "error: $*" >&2; exit 1; }

model_args() { [[ -n "${MODELS[$1]:-}" ]] && printf -- '--model\n%s\n' "${MODELS[$1]}" || true; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)      TASK="${2:?--task needs a value}"; shift 2 ;;
    --task-file) TASK_FILE="${2:?--task-file needs a value}"; shift 2 ;;
    --expert)
      spec="${2:?--expert needs a value}"
      [[ "$spec" == *:* ]] || die "--expert needs '<hat>:<stance>' (got: $spec)"
      HATS+=("${spec%%:*}")
      STANCES+=("${spec#*:}")
      shift 2 ;;
    --model)
      spec="${2:?--model needs a value}"
      [[ "$spec" == *=* && -n "${spec%%=*}" && -n "${spec#*=}" ]] \
        || die "--model needs '<hat>=<provider/id>' (got: $spec)"
      MODELS["${spec%%=*}"]="${spec#*=}"
      shift 2 ;;
    --synth)     SYNTH="${2:?--synth needs a value}"; shift 2 ;;
    --run-id)    RUN_ID="${2:?--run-id needs a value}"; shift 2 ;;
    --timeout)   TIMEOUT="${2:?--timeout needs a value}"; shift 2 ;;
    --dry-run)   DRY_RUN=1; shift ;;
    -h|--help)   usage ;;
    *) echo "unknown option: $1" >&2; usage ;;
  esac
done

if [[ -n "$TASK_FILE" ]]; then
  [[ -s "$TASK_FILE" ]] || die "task file is missing or empty: $TASK_FILE"
  TASK=$(cat "$TASK_FILE")
fi
[[ -n "$TASK" ]] || { echo "missing --task or --task-file" >&2; usage; }
[[ "$TIMEOUT" =~ ^[1-9][0-9]*$ ]] || die "--timeout must be a positive integer (got: $TIMEOUT)"
(( ${#HATS[@]} >= 2 ))            || die "a debate needs at least 2 --expert"
(( ${#HATS[@]} <= MAX_EXPERTS ))  || die "${#HATS[@]} experts > max $MAX_EXPERTS (override with DEBATE_MAX_EXPERTS)"

command -v jq >/dev/null || die "jq is required"
command -v th >/dev/null || die "th not found in PATH"

# Fail fast: every hat must exist before anything starts.
for h in "${HATS[@]}" "$SYNTH"; do
  [[ -n "$h" ]] || die "an --expert has an empty hat"
  th hats get "$h" >/dev/null 2>&1 || die "hat not found: '$h'. Run th hats list to see the six."
done
for s in "${STANCES[@]}"; do
  [[ -n "${s// }" ]] || die "an --expert has an empty stance"
done

[[ -n "$RUN_ID" ]] || RUN_ID="debate-$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$FLOW_BASE/$RUN_ID"

echo "debate: ${#HATS[@]} voices, synth=$SYNTH" >&2
echo "run dir: $RUN_DIR  (resume with --run-id $RUN_ID)" >&2

if (( DRY_RUN )); then
  echo "dry-run: plan validated, nothing executed." >&2
  exit 0
fi

mkdir -p "$RUN_DIR"
{
  echo "task: $TASK"
  for i in "${!HATS[@]}"; do echo "voice $((i + 1)): ${HATS[$i]} — ${STANCES[$i]}"; done
  echo "synth: $SYNTH  timeout: ${TIMEOUT}s"
} > "$RUN_DIR/meta.txt"

# A step is complete when its collected output exists and is non-empty.
step_done() { [[ -s "$1" ]]; }

# Harvest a finished detached job: status must be "done", out must be non-empty.
harvest() {
  local job="$1" dest="$2" status_path out_path
  [[ -s "$job" ]] || return 1
  status_path=$(jq -r .status "$job")
  out_path=$(jq -r .out "$job")
  [[ "$(cat "$status_path" 2>/dev/null)" == "done" ]] || return 1
  [[ -s "$out_path" ]] || return 1
  cp "$out_path" "$dest"
}

# Phase 1 — LAUNCH: one detached job per missing voice
pending_status=()
pending_ids=()
for i in "${!HATS[@]}"; do
  id="v$((i + 1))"
  md="$RUN_DIR/r1-${id}.md"
  job="$RUN_DIR/r1-${id}.job"

  if step_done "$md"; then
    echo "  [skip] $id (already done)" >&2
    continue
  fi
  if harvest "$job" "$md"; then
    echo "  [harvest] $id (finished in a previous run)" >&2
    continue
  fi

  system="You are one voice in a debate. You know only the brief below. Do not read files and do not use tools. Stay inside this stance, and say what it cannot see.

Stance: ${STANCES[$i]}"
  prompt="Brief:
${TASK}
"
  prompt+="
Answer in this form, and nothing else:
Position: one sentence.
Why: up to five lines. Be specific.
What would change my mind: one line."

  mapfile -t model_flags < <(model_args "${HATS[$i]}")
  (cd "$RUN_DIR" && th run --hat "${HATS[$i]}" "${model_flags[@]}" --system "$system" --task "$prompt" \
      --detach --timeout "$TIMEOUT") > "$job"
  pending_status+=("$(jq -r .status "$job")")
  pending_ids+=("$id")
  echo "  [launch] $id (${HATS[$i]})" >&2
done

# Phase 2 — WAIT: native poll; never synthesise early
if (( ${#pending_status[@]} > 0 )); then
  th wait --timeout "$TIMEOUT" "${pending_status[@]}" > "$RUN_DIR/r1-wait.json" || true
fi

# Phase 3 — VALIDATE + COLLECT: every voice must have produced output
failed=()
for id in "${pending_ids[@]}"; do
  if ! harvest "$RUN_DIR/r1-${id}.job" "$RUN_DIR/r1-${id}.md"; then
    failed+=("$id: $(cat "$(jq -r .status "$RUN_DIR/r1-${id}.job")" 2>/dev/null || echo 'no status')")
  fi
done
if (( ${#failed[@]} > 0 )); then
  printf 'voices failed:\n' >&2
  printf '  %s\n' "${failed[@]}" >&2
  die "fix or wait, then resume with: --run-id $RUN_ID"
fi

# Phase 4 — SYNTH: the only sequential step
synth_md="$RUN_DIR/r1-synthesis.md"
if step_done "$synth_md"; then
  echo "  [skip] synthesis (already done)" >&2
else
  perspectives=""
  for i in "${!HATS[@]}"; do
    id="v$((i + 1))"
    perspectives+="
## Voice $((i + 1)) (${HATS[$i]}) — ${STANCES[$i]}
$(cat "$RUN_DIR/r1-${id}.md")
"
  done
  echo "  [synth] $SYNTH" >&2
  synth_prompt="You are the synthesiser of a debate.

Brief:
${TASK}

Independent voices:
${perspectives}

Write, in this order:
Agreement: what the voices share.
Tensions: where they truly disagree, and why. Do not flatten them.
Recommendation: one concrete decision.
Tripwires: what would make the recommendation wrong, as seen in the voices."
  mapfile -t model_flags < <(model_args "$SYNTH")
  (cd "$RUN_DIR" && th run --hat "$SYNTH" "${model_flags[@]}" --task "$synth_prompt" --timeout "$TIMEOUT") > "$synth_md"
  step_done "$synth_md" || die "synthesis produced no output — resume with: --run-id $RUN_ID"
fi

echo "── final synthesis ──" >&2
cat "$RUN_DIR/r1-synthesis.md"
