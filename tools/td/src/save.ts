import { assert, ContractError, isNonBlank, isPositiveInt } from "../../common/contract.js";
import { addRefs, createNote } from "../../tb/src/notes.js";
import { getByIds } from "../../tb/src/qdrant.js";
import { errorMessage } from "../../common/cli.js";
import type { NoteType } from "../../tb/src/types.js";
import { addEntry, appendDo } from "../../ti/src/identity.js";
import { getPointById } from "../../ti/src/qdrant.js";
import { fetchExchange, markDistilled } from "../../tl/src/client.js";
import { ID_SHAPE, TIMESTAMP_SHAPE } from "../../tl/src/types.js";
import type { CandidateKind } from "../../tl/src/types.js";
import type { NoteCandidate, RuleCandidate } from "./candidate.js";
import { kindOf } from "./critic.js";
import type { Candidate } from "./critic.js";
import { SETTLED_VERDICTS } from "./novelty.js";
import type { Verdict } from "./novelty.js";

export const MODES = ["shadow", "active"] as const;
export type Mode = (typeof MODES)[number];

export const ACTIONS = ["create", "create_ref", "add_rule", "append_do", "nothing"] as const;
export type Action = (typeof ACTIONS)[number];

export type SaveResult = Readonly<{ savedId: string | null; failure: string | null }>;

export class Budget {
  readonly #max: number | null;
  #spent = 0;

  private constructor(max: number | null) {
    this.#max = max;
  }

  static of(max: number | null): Budget {
    assert(max === null || isPositiveInt(max), () => `Budget.of: max is null or a positive integer, got=${max}`);
    const result = new Budget(max);
    assert(result.spent() === 0, "Budget.of: nothing is spent yet");
    assert(max === null || !result.isSpent(), "Budget.of: a new budget is not spent");
    return result;
  }

  take(): boolean {
    let result: boolean;
    const before = this.#spent;
    if (this.isSpent()) {
      result = false;
    } else {
      this.#spent = this.#spent + 1;
      result = true;
    }
    assert(this.#spent === before + (result ? 1 : 0), "Budget.take: one is spent only when taken");
    assert(this.#max === null || this.#spent <= this.#max, "Budget.take: never past the max");
    return result;
  }

  spent(): number {
    return this.#spent;
  }

  isSpent(): boolean {
    return this.#max !== null && this.#spent >= this.#max;
  }
}

export function actionOf(kind: CandidateKind, verdict: string): Action {
  let result: Action;
  assert(SETTLED_VERDICTS[kind].includes(verdict), () => `actionOf: the verdict is settled for the kind, kind=${kind}, verdict=${verdict}`);
  if (verdict === "new") {
    result = kind === "note" ? "create" : "add_rule";
  } else if (verdict === "duplicate" || verdict === "ref_only") {
    result = "nothing";
  } else if (kind === "note") {
    result = "create_ref";
  } else {
    result = "append_do";
  }
  assert((result === "nothing") === (verdict === "duplicate" || verdict === "ref_only"), "actionOf: only a duplicate and a ref_only do nothing");
  assert(kind === "note" || !["create", "create_ref"].includes(result), "actionOf: a rule never makes a note action");
  assert(kind === "rule" || !["add_rule", "append_do"].includes(result), "actionOf: a note never makes a rule action");
  return result;
}

export async function saveNote(candidate: NoteCandidate, verdict: Verdict, exchangeId: string): Promise<SaveResult> {
  let result: SaveResult;
  assert(ID_SHAPE.test(exchangeId), () => `saveNote: exchangeId is an exchange id, got=${exchangeId}`);
  assert(["create", "create_ref"].includes(actionOf("note", verdict.verdict)), () => `saveNote: the verdict writes a note, verdict=${verdict.verdict}`);
  let savedId: string | null = null;
  try {
    const json = candidate.toJson();
    const note = await createNote({
      what: json.what,
      why: json.why,
      kind: json.kind as NoteType,
      tags: [...json.tags, ...json.proposedTags],
      exchange: exchangeId,
    });
    savedId = note.id;
    if ((await getByIds([note.id])).length === 0) {
      result = { savedId: null, failure: `saveNote: the note is not in the store, id=${note.id}` };
    } else {
      if (actionOf("note", verdict.verdict) === "create_ref" && verdict.of !== null && !verdict.of.startsWith("session:")) {
        const reason = verdict.verdict === "extends" ? (verdict.adds ?? "extends") : (verdict.reason ?? "contradicts");
        await addRefs(note.id, [{ id: verdict.of, reason, origin: "td" }]);
      }
      result = { savedId, failure: null };
    }
  } catch (error) {
    result = { savedId, failure: worldFailure(error) };
  }
  assert(result.savedId !== null || result.failure !== null, "saveNote: a note write gives an id or a failure");
  assert(result.failure === null || isNonBlank(result.failure), "saveNote: a failure is not blank");
  return result;
}

export async function saveRule(candidate: RuleCandidate, verdict: Verdict, exchangeId: string): Promise<SaveResult> {
  let result: SaveResult;
  assert(ID_SHAPE.test(exchangeId), () => `saveRule: exchangeId is an exchange id, got=${exchangeId}`);
  assert(["add_rule", "append_do"].includes(actionOf("rule", verdict.verdict)), () => `saveRule: the verdict writes a rule, verdict=${verdict.verdict}`);
  assert(hasAppendData(verdict), () => `saveRule: an append names an of and a do, verdict=${verdict.verdict}`);
  const action = actionOf("rule", verdict.verdict);
  if (action === "append_do" && verdict.of?.startsWith("session:") === true) {
    result = { savedId: null, failure: null };
  } else {
    let savedId: string | null = null;
    try {
      if (action === "append_do") {
        const entry = await appendDo(verdict.of as string, verdict.do as string);
        savedId = entry.do.at(-1) === verdict.do ? (verdict.of as string) : null;
        result = { savedId, failure: savedId === null ? `saveRule: the do is not in the store, id=${verdict.of}` : null };
      } else {
        const json = candidate.toJson();
        const entry = await addEntry(json.if, json.do, [...json.tags, ...json.proposedTags], exchangeId);
        const stored = await getPointById(entry.id);
        savedId = stored?.result ? entry.id : null;
        result = { savedId, failure: savedId === null ? `saveRule: the rule is not in the store, id=${entry.id}` : null };
      }
    } catch (error) {
      result = { savedId, failure: worldFailure(error) };
    }
  }
  assert(result.savedId !== null || result.failure !== null || verdict.of?.startsWith("session:") === true, "saveRule: a rule write gives an id or a failure, or skips a session item");
  assert(result.failure === null || isNonBlank(result.failure), "saveRule: a failure is not blank");
  return result;
}

export async function saveItem(candidate: Candidate, verdict: Verdict, exchangeId: string, mode: Mode): Promise<SaveResult> {
  let result: SaveResult;
  assert(ID_SHAPE.test(exchangeId), () => `saveItem: exchangeId is an exchange id, got=${exchangeId}`);
  assert(SETTLED_VERDICTS[kindOf(candidate)].includes(verdict.verdict), () => `saveItem: the verdict is settled for the kind, verdict=${verdict.verdict}`);
  assert(namesItsOf(verdict), () => `saveItem: a verdict other than new names an of, verdict=${verdict.verdict}`);
  const kind = kindOf(candidate);
  if (mode === "shadow" || actionOf(kind, verdict.verdict) === "nothing") {
    result = { savedId: null, failure: null };
  } else if (kind === "note") {
    result = await saveNote(candidate as NoteCandidate, verdict, exchangeId);
  } else {
    result = await saveRule(candidate as RuleCandidate, verdict, exchangeId);
  }
  assert(mode === "active" || isQuiet(result), "saveItem: shadow writes nothing");
  assert(actionOf(kindOf(candidate), verdict.verdict) !== "nothing" || result.savedId === null, "saveItem: an action that does nothing saves no id");
  return result;
}

export async function closeExchanges(ids: readonly string[], run: string): Promise<string | null> {
  let result: string | null;
  assert(ids.length > 0, "closeExchanges: at least one exchange");
  assert(new Set(ids).size === ids.length, "closeExchanges: no exchange twice");
  assert(TIMESTAMP_SHAPE.test(run), () => `closeExchanges: the run is an ISO-8601 UTC time, got=${run}`);
  result = null;
  for (const id of ids) {
    try {
      await markDistilled(id, run);
      const exchange = await fetchExchange(id);
      if (exchange?.distilled !== run) {
        result = `closeExchanges: the exchange is not distilled, id=${id}`;
        break;
      }
    } catch (error) {
      result = worldFailure(error);
      break;
    }
  }
  assert(result === null || isNonBlank(result), "closeExchanges: a failure is not blank");
  return result;
}

function namesItsOf(verdict: Verdict): boolean {
  return verdict.verdict === "new" || isNonBlank(verdict.of ?? "");
}

function isQuiet(result: SaveResult): boolean {
  return result.savedId === null && result.failure === null;
}

function hasAppendData(verdict: Verdict): boolean {
  return actionOf("rule", verdict.verdict) !== "append_do" || (isNonBlank(verdict.of ?? "") && isNonBlank(verdict.do ?? ""));
}

export function worldFailure(error: unknown): string {
  if (error instanceof ContractError || error instanceof TypeError || error instanceof ReferenceError) throw error;
  const result = errorMessage(error);
  assert(isNonBlank(result), "worldFailure: a failure is not blank");
  return result;
}
