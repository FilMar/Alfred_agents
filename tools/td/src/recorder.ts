import { assert, isNonBlank, isPositiveInt, isRecord, isUnit, sameJson } from "../../contract/contract.js";
import { putExtractions } from "../../tl/src/client.js";
import { ID_SHAPE, NEAR_IDENTICAL, TIMESTAMP_SHAPE, validateNewExtraction } from "../../tl/src/types.js";
import type { NewExtraction } from "../../tl/src/types.js";
import type { Checked, NoteCandidate, NoteCandidateJson, RuleCandidate, RuleCandidateJson } from "./candidate.js";

export type Probabilities = Readonly<Record<string, number>>;

type RowHead = Pick<NewExtraction, "extractor_id" | "run" | "exchange_id" | "created">;

type OutcomeState = {
  readonly kind: "note" | "rule";
  readonly body: NoteCandidateJson | RuleCandidateJson;
  readonly quote: string;
  readonly droppedBy: string | null;
  readonly probabilities: Probabilities | null;
  readonly verdict: string | null;
  readonly of: string | null;
  readonly savedId: string | null;
};

export class Outcome {
  readonly #s: OutcomeState;

  private constructor(s: OutcomeState) {
    this.#s = Object.freeze(s);
  }

  static ofNote(checked: Checked<NoteCandidate>): Outcome {
    const result = Outcome.#of("note", checked.candidate().toJson(), checked.candidate().quote(), checked.drop());
    assert(result.#s.kind === "note", "Outcome.ofNote: the kind is note");
    assert(result.isOpen() === checked.isKept(), "Outcome.ofNote: open only when the checks kept the note");
    assert(checked.isKept() || result.#s.droppedBy === `check:${checked.drop()}`, () => `Outcome.ofNote: a check drop is recorded as check:<reason>, drop=${checked.drop()}`);
    assert(sameJson(result.#s.body, checked.candidate().toJson()), "Outcome.ofNote: the body is the checked note");
    return result;
  }

  static ofRule(checked: Checked<RuleCandidate>): Outcome {
    const result = Outcome.#of("rule", checked.candidate().toJson(), checked.candidate().quote(), checked.drop());
    assert(result.#s.kind === "rule", "Outcome.ofRule: the kind is rule");
    assert(result.isOpen() === checked.isKept(), "Outcome.ofRule: open only when the checks kept the rule");
    assert(checked.isKept() || result.#s.droppedBy === `check:${checked.drop()}`, () => `Outcome.ofRule: a check drop is recorded as check:<reason>, drop=${checked.drop()}`);
    assert(sameJson(result.#s.body, checked.candidate().toJson()), "Outcome.ofRule: the body is the checked rule");
    return result;
  }

  judged(probabilities: Probabilities, drop: string | null): Outcome {
    assert(this.isOpen(), () => `Outcome.judged: only an open candidate is judged, droppedBy=${this.#s.droppedBy}`);
    assert(this.#s.probabilities === null, "Outcome.judged: a candidate is judged once");
    assert(Outcome.#isProbabilities(probabilities), () => `Outcome.judged: probabilities name at least one check, each from 0 to 1, got=${JSON.stringify(probabilities)}`);
    assert(drop === null || Object.hasOwn(probabilities, drop), () => `Outcome.judged: the drop names a judged check, drop=${drop}`);
    const droppedBy = drop === null ? null : `critic:${drop}`;
    const result = new Outcome({ ...this.#s, probabilities: Object.freeze({ ...probabilities }), droppedBy });
    assert(result.#s.droppedBy === (drop === null ? null : `critic:${drop}`), () => `Outcome.judged: a critic drop is recorded as critic:<name>, drop=${drop}`);
    return result;
  }

  nearIdentical(): Outcome {
    assert(this.isOpen(), () => `Outcome.nearIdentical: only an open candidate is dropped, droppedBy=${this.#s.droppedBy}`);
    const result = new Outcome({ ...this.#s, droppedBy: NEAR_IDENTICAL });
    assert(result.#s.droppedBy === NEAR_IDENTICAL, "Outcome.nearIdentical: the drop is near_identical");
    return result;
  }

  decided(verdict: string, of: string | null): Outcome {
    assert(this.isOpen(), () => `Outcome.decided: only an open candidate gets a verdict, droppedBy=${this.#s.droppedBy}`);
    assert(this.#s.verdict === null, "Outcome.decided: a candidate gets one verdict");
    assert(isNonBlank(verdict), "Outcome.decided: the verdict is not blank");
    assert(of === null || isNonBlank(of), "Outcome.decided: of is null or not blank");
    const result = new Outcome({ ...this.#s, verdict, of });
    assert(result.#s.verdict === verdict, "Outcome.decided: the verdict is recorded");
    return result;
  }

  saved(id: string): Outcome {
    assert(this.#s.verdict !== null, "Outcome.saved: only a candidate with a verdict is saved");
    assert(this.#s.savedId === null, "Outcome.saved: a candidate is saved once");
    assert(isNonBlank(id), "Outcome.saved: the id is not blank");
    const result = new Outcome({ ...this.#s, savedId: id });
    assert(result.#s.savedId === id, "Outcome.saved: the id is recorded");
    return result;
  }

  isOpen(): boolean {
    return this.#s.droppedBy === null;
  }

  toRow(head: RowHead): NewExtraction {
    const s = this.#s;
    const result: NewExtraction = {
      ...head,
      kind: s.kind,
      body: JSON.stringify(s.body),
      quote: s.quote,
      dropped_by: s.droppedBy,
      probabilities: s.probabilities === null ? null : JSON.stringify(s.probabilities),
      verdict: s.verdict,
      of: s.of,
      saved_id: s.savedId,
    };
    assert(validateNewExtraction(result) === null, () => `Outcome.toRow: the row passes the tl checks, error=${validateNewExtraction(result)}`);
    assert(Outcome.#carries(result, head), "Outcome.toRow: the row carries the head");
    assert(sameJson(Outcome.#stateOf(result), this.#s), "Outcome.toRow: the row reads back as this outcome");
    return result;
  }

  static #carries(row: NewExtraction, head: RowHead): boolean {
    return row.extractor_id === head.extractor_id && row.run === head.run && row.exchange_id === head.exchange_id && row.created === head.created;
  }

  static #stateOf(row: NewExtraction): OutcomeState {
    return {
      kind: row.kind,
      body: JSON.parse(row.body),
      quote: row.quote,
      droppedBy: row.dropped_by,
      probabilities: row.probabilities === null ? null : JSON.parse(row.probabilities),
      verdict: row.verdict,
      of: row.of,
      savedId: row.saved_id,
    };
  }

  static #of(kind: OutcomeState["kind"], body: OutcomeState["body"], quote: string, drop: string | null): Outcome {
    return new Outcome({
      kind,
      body,
      quote,
      droppedBy: drop === null ? null : `check:${drop}`,
      probabilities: null,
      verdict: null,
      of: null,
      savedId: null,
    });
  }

  static #isProbabilities(p: unknown): boolean {
    return isRecord(p) && Object.keys(p).length > 0 && Object.entries(p).every(([k, v]) => isNonBlank(k) && typeof v === "number" && isUnit(v));
  }
}

type RecorderState = {
  readonly extractorId: number;
  readonly run: string;
};

export class Recorder {
  readonly #s: RecorderState;

  private constructor(s: RecorderState) {
    this.#s = Object.freeze(s);
  }

  static start(extractorId: number, now: Date): Recorder {
    assert(isPositiveInt(extractorId), () => `Recorder.start: extractorId is a row id, got=${extractorId}`);
    assert(!Number.isNaN(now.getTime()), "Recorder.start: now is a valid date");
    const result = new Recorder({ extractorId, run: now.toISOString() });
    assert(TIMESTAMP_SHAPE.test(result.run()), () => `Recorder.start: the run is an ISO-8601 UTC time, run=${result.run()}`);
    return result;
  }

  run(): string {
    return this.#s.run;
  }

  rows(exchangeId: string, outcomes: readonly Outcome[], now: Date): NewExtraction[] {
    assert(ID_SHAPE.test(exchangeId), () => `Recorder.rows: exchangeId is an exchange id, got=${exchangeId}`);
    assert(!Number.isNaN(now.getTime()), "Recorder.rows: now is a valid date");
    const head = { extractor_id: this.#s.extractorId, run: this.#s.run, exchange_id: exchangeId, created: now.toISOString() };
    const result = outcomes.map((o) => o.toRow(head));
    assert(result.length === outcomes.length, "Recorder.rows: one row per outcome");
    assert(this.#allCarry(result, exchangeId, now), "Recorder.rows: every row carries this run, the exchange and the time");
    return result;
  }

  #allCarry(rows: readonly NewExtraction[], exchangeId: string, now: Date): boolean {
    const created = now.toISOString();
    return rows.every((r) => r.run === this.#s.run && r.extractor_id === this.#s.extractorId && r.exchange_id === exchangeId && r.created === created);
  }

  async write(exchangeId: string, outcomes: readonly Outcome[]): Promise<void> {
    const rows = this.rows(exchangeId, outcomes, new Date());
    if (rows.length > 0) await putExtractions(rows);
  }
}
