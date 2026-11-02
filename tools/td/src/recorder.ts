import { assert, isNonBlank, isPositiveInt, isRecord, isUnit, sameJson } from "../../common/contract.js";
import { putExtractions } from "../../tl/src/client.js";
import { ID_SHAPE, TIMESTAMP_SHAPE, validateNewExtraction } from "../../tl/src/types.js";
import type { NewExtraction } from "../../tl/src/types.js";
import type { Checked, NoteCandidateJson, RuleCandidateJson } from "./candidate.js";
import { kindOf } from "./critic.js";
import type { Candidate } from "./critic.js";

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

  static of(checked: Checked<Candidate>): Outcome {
    const candidate = checked.candidate();
    const drop = checked.drop();
    return new Outcome({
      kind: kindOf(candidate),
      body: candidate.toJson(),
      quote: candidate.quote(),
      droppedBy: drop === null ? null : `check:${drop}`,
      probabilities: null,
      verdict: null,
      of: null,
      savedId: null,
    });
  }

  judged(probabilities: Probabilities, drop: string | null): Outcome {
    assert(this.isOpen(), () => `Outcome.judged: only an open candidate is judged, droppedBy=${this.#s.droppedBy}`);
    assert(this.#s.probabilities === null, "Outcome.judged: a candidate is judged once");
    assert(Outcome.#isProbabilities(probabilities), () => `Outcome.judged: probabilities name at least one check, each from 0 to 1, got=${JSON.stringify(probabilities)}`);
    assert(drop === null || Object.hasOwn(probabilities, drop), () => `Outcome.judged: the drop names a judged check, drop=${drop}`);
    return new Outcome({ ...this.#s, probabilities: Object.freeze({ ...probabilities }), droppedBy: drop === null ? null : `critic:${drop}` });
  }

  decided(verdict: string, of: string | null): Outcome {
    assert(this.isOpen(), () => `Outcome.decided: only an open candidate gets a verdict, droppedBy=${this.#s.droppedBy}`);
    assert(this.#s.verdict === null, "Outcome.decided: a candidate gets one verdict");
    assert(isNonBlank(verdict), "Outcome.decided: the verdict is not blank");
    assert(of === null || isNonBlank(of), "Outcome.decided: of is null or not blank");
    return new Outcome({ ...this.#s, verdict, of });
  }

  saved(id: string): Outcome {
    assert(this.#s.verdict !== null, "Outcome.saved: only a candidate with a verdict is saved");
    assert(this.#s.savedId === null, "Outcome.saved: a candidate is saved once");
    assert(isNonBlank(id), "Outcome.saved: the id is not blank");
    return new Outcome({ ...this.#s, savedId: id });
  }

  isOpen(): boolean {
    return this.#s.droppedBy === null;
  }

  verdict(): string | null {
    return this.#s.verdict;
  }

  savedId(): string | null {
    return this.#s.savedId;
  }

  probabilities(): Probabilities | null {
    return this.#s.probabilities;
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
    assert(sameJson(Outcome.#stateOf(result), this.#s), "Outcome.toRow: the row reads back as this outcome");
    return result;
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

  extractorId(): number {
    return this.#s.extractorId;
  }

  rows(exchangeId: string, outcomes: readonly Outcome[], now: Date): NewExtraction[] {
    assert(ID_SHAPE.test(exchangeId), () => `Recorder.rows: exchangeId is an exchange id, got=${exchangeId}`);
    assert(!Number.isNaN(now.getTime()), "Recorder.rows: now is a valid date");
    const head = { extractor_id: this.#s.extractorId, run: this.#s.run, exchange_id: exchangeId, created: now.toISOString() };
    return outcomes.map((o) => o.toRow(head));
  }

  async write(exchangeId: string, outcomes: readonly Outcome[]): Promise<void> {
    const rows = this.rows(exchangeId, outcomes, new Date());
    if (rows.length > 0) await putExtractions(rows);
  }
}
