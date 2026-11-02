// Tests for tools/td/src/novelty.ts: the session list, the candidate texts,
// the prompt, the verdict check, the settle mapping and the model call.
// A call with no expect of its own is deliberate: the contract asserts in the
// module body are the oracle. The tables carry the values spec.md states.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { NoteCandidate, RuleCandidate } from "../tools/td/src/candidate.ts";
import { Extractor } from "../tools/td/src/config.ts";
import { QUALITY_BAR } from "../tools/td/src/guides.ts";
import {
  KNOWN_TEXT_CHARS,
  MODEL_VERDICTS,
  SETTLED_VERDICTS,
  SessionList,
  candidateText,
  judgeNovelty,
  noveltyPrompt,
  savedText,
  settle,
  verdictsCheck,
  type Known,
} from "../tools/td/src/novelty.ts";
import { extractorJson, startModelStub, type ModelStub } from "./helpers/td_stubs.ts";

const NOTE = NoteCandidate.fromModel({
  what: "La SessionList conserva gli item già salvati",
  why: "il modello non deve riscrivere lo stesso concetto",
  kind: "attrito",
  tags: ["architettura"],
  contexts: ["prima", "dopo"],
  quote: "la session list evita i doppioni in sessione",
})!;

const RULE = RuleCandidate.fromModel({
  if: "una sessione finisce male",
  do: "rifarla da capo al giro successivo",
  tags: ["protocollo"],
  quote: "una sessione non si chiude con un errore",
})!;

const PAIR = [NOTE, RULE];

const KNOWN2: readonly Known[] = [
  { key: "k0", kind: "note", text: "una nota già salvata in sessione" },
  { key: "k1", kind: "rule", text: "SE una sessione fallisce ALLORA si rifà da capo" },
];

// spec.md: a note reads `<what> | perché: <why>`, a rule `SE <if> ALLORA <do>`.
const NOTE_TEXT = `${NOTE.toJson().what} | perché: ${NOTE.toJson().why}`;
const RULE_TEXT = `SE ${RULE.toJson().if} ALLORA ${RULE.toJson().do}`;

// spec.md: the tail of every novelty prompt.
const IDS = "Use the integer after C as `cand` and the integer after N as `of`.";

const extractorAt = (port: number): Extractor => Extractor.fromJson(extractorJson(`http://localhost:${port}/v1`));

describe("the fixed sets", () => {
  it("holds the verdicts the model picks from, the settled ones and the cut", () => {
    expect(MODEL_VERDICTS.note).toEqual(["new", "duplicate", "extends", "contradicts"]);
    expect(MODEL_VERDICTS.rule).toEqual(["new", "duplicate", "append"]);
    expect(SETTLED_VERDICTS.note).toEqual(["new", "duplicate", "extends", "contradicts", "ref_only"]);
    expect(SETTLED_VERDICTS.rule).toEqual(["new", "duplicate", "append"]);
    expect(KNOWN_TEXT_CHARS).toBe(400);
  });
});

describe("SessionList", () => {
  it("add refuses a blank text", () => {
    const list = SessionList.empty();
    expect(() => list.add("note", "", null)).toThrow("SessionList.add: the text is not blank");
    expect(() => list.add("note", "  \t ", null)).toThrow("SessionList.add: the text is not blank");
  });

  it("add refuses a blank id that is not null", () => {
    const list = SessionList.empty();
    expect(() => list.add("note", "testo", "")).toThrow("SessionList.add: the id is null or not blank");
    expect(() => list.add("note", "testo", "   ")).toThrow("SessionList.add: the id is null or not blank");
  });

  it("add grows the list by one", () => {
    const list = SessionList.empty();
    list.add("note", "primo", null);
    list.add("rule", "secondo", "id-uno");
  });

  it("add keys the item by the saved id", () => {
    SessionList.empty().add("note", "testo", "già-salvato");
  });

  it("add keys the item by its position when nothing is saved", () => {
    const list = SessionList.empty();
    list.add("note", "primo", null);
    list.add("rule", "secondo", null);
    list.add("note", "terzo", "id-due");
    list.add("rule", "quarto", null);
  });

  it("add carries the kind and the text", () => {
    SessionList.empty().add("rule", "SE a ALLORA b", null);
  });

  it("appends and returns a copy of the items", () => {
    const list = SessionList.empty();
    const first = list.add("note", "primo", null);
    const second = list.add("rule", "SE a ALLORA b", "id-uno");
    const items = list.items();
    expect(items).toEqual([first, second]);
    (items as Known[]).push({ key: "intruso", kind: "note", text: "estraneo" });
    expect(list.items()).toEqual([first, second]);
    expect(list.size()).toBe(2);
  });
});

describe("candidateText and savedText", () => {
  const texts: [string, () => string, string][] = [
    ["candidateText reads a note as <what> | perché: <why>", () => candidateText(NOTE), NOTE_TEXT],
    ["candidateText reads a rule as SE <if> ALLORA <do>", () => candidateText(RULE), RULE_TEXT],
    ["savedText saves a note as its what", () => savedText(NOTE), NOTE.toJson().what],
    ["savedText saves a rule as SE <if> ALLORA <do>", () => savedText(RULE), RULE_TEXT],
  ];

  for (const [name, call, expected] of texts) {
    it(name, () => {
      expect(call()).toBe(expected);
    });
  }
});

describe("noveltyPrompt", () => {
  it("wants at least one candidate", () => {
    expect(() => noveltyPrompt([], [])).toThrow("noveltyPrompt: at least one candidate");
    expect(() => noveltyPrompt([], KNOWN2)).toThrow("noveltyPrompt: at least one candidate");
  });

  it("lists the only candidate and no neighbour", () => {
    const expected = `${QUALITY_BAR}

## Candidates
C0 (note): ${NOTE_TEXT}

## Neighbours

${IDS}`;
    expect(noveltyPrompt([NOTE], [])).toBe(expected);
  });

  it("numbers every candidate and every known item", () => {
    const expected = `${QUALITY_BAR}

## Candidates
C0 (note): ${NOTE_TEXT}
C1 (rule): ${RULE_TEXT}

## Neighbours
N0 (note): ${KNOWN2[0].text}
N1 (rule): ${KNOWN2[1].text}

${IDS}`;
    expect(noveltyPrompt(PAIR, KNOWN2)).toBe(expected);
  });

  it("cuts a known text at KNOWN_TEXT_CHARS: inside, at the edge, outside", () => {
    const inside = "x".repeat(KNOWN_TEXT_CHARS - 1) + "!";
    const edge = "y".repeat(KNOWN_TEXT_CHARS - 1) + "!";
    const outside = "z".repeat(KNOWN_TEXT_CHARS) + "@";
    const expected = `${QUALITY_BAR}

## Candidates
C0 (note): ${NOTE_TEXT}

## Neighbours
N0 (note): ${inside}
N1 (note): ${edge}
N2 (note): ${outside.slice(0, KNOWN_TEXT_CHARS)}

${IDS}`;
    expect(
      noveltyPrompt([NOTE], [
        { key: "n0", kind: "note", text: inside },
        { key: "n1", kind: "note", text: edge },
        { key: "n2", kind: "note", text: outside },
      ]),
    ).toBe(expected);
  });
});

describe("verdictsCheck", () => {
  it("wants at least one candidate", () => {
    expect(() => verdictsCheck({}, [], [])).toThrow("verdictsCheck: at least one candidate");
    expect(() => verdictsCheck({ verdicts: [{ cand: 0, verdict: "new" }] }, [], KNOWN2)).toThrow(
      "verdictsCheck: at least one candidate",
    );
  });

  const LIST = "need list `verdicts`";
  const ONE = "need exactly one verdict per cand 0..1";
  const NOTE_SET = "cand 0: verdict must be one of contradicts, duplicate, extends, new";
  const OF = "cand 0: `of` must be a neighbour id 0..1";
  const rows: [string, unknown, readonly (NoteCandidate | RuleCandidate)[], readonly Known[], string | null][] = [
    ["needs a record with a verdicts list", null, PAIR, KNOWN2, LIST],
    ["needs a record with a verdicts list", "no", PAIR, KNOWN2, LIST],
    ["needs a record with a verdicts list", {}, PAIR, KNOWN2, LIST],
    ["needs a record with a verdicts list", { verdicts: null }, PAIR, KNOWN2, LIST],
    ["needs a record with a verdicts list", { verdicts: 3 }, PAIR, KNOWN2, LIST],
    ["needs exactly one verdict per cand", { verdicts: [] }, PAIR, KNOWN2, ONE],
    ["needs exactly one verdict per cand", { verdicts: [{ cand: 0, verdict: "new" }] }, PAIR, KNOWN2, ONE],
    ["needs exactly one verdict per cand", { verdicts: [{ cand: 0, verdict: "new" }, { cand: 0, verdict: "new" }] }, PAIR, KNOWN2, ONE],
    ["needs exactly one verdict per cand", { verdicts: [{ cand: 0, verdict: "new" }, { cand: 1, verdict: "new" }, { cand: 1, verdict: "new" }] }, PAIR, KNOWN2, ONE],
    ["needs exactly one verdict per cand", { verdicts: [5, { cand: 1, verdict: "new" }] }, PAIR, KNOWN2, ONE],
    ["needs a verdict of the fixed set of the kind", { verdicts: [{ cand: 0, verdict: "append", of: 0 }, { cand: 1, verdict: "new" }] }, PAIR, KNOWN2, NOTE_SET],
    ["needs a verdict of the fixed set of the kind", { verdicts: [{ cand: 0, verdict: "new" }, { cand: 1, verdict: "extends", of: 0 }] }, PAIR, KNOWN2, "cand 1: verdict must be one of append, duplicate, new"],
    ["needs a verdict of the fixed set of the kind", { verdicts: [{ cand: 0 }, { cand: 1, verdict: "new" }] }, PAIR, KNOWN2, NOTE_SET],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate", of: 2 }] }, [NOTE], KNOWN2, OF],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate", of: -1 }] }, [NOTE], KNOWN2, OF],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate", of: 1.5 }] }, [NOTE], KNOWN2, OF],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate", of: "1" }] }, [NOTE], KNOWN2, OF],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate" }] }, [NOTE], KNOWN2, OF],
    ["needs a neighbour id when the verdict is not new", { verdicts: [{ cand: 0, verdict: "duplicate" }] }, [NOTE], [], "cand 0: `of` must be a neighbour id 0..-1"],
    ["accepts one good verdict per candidate", { verdicts: [{ cand: 0, verdict: "new" }] }, [NOTE], [], null],
    ["accepts one good verdict per candidate", { verdicts: [{ cand: 0, verdict: "new", of: 99 }] }, [NOTE], KNOWN2, null],
    ["accepts one good verdict per candidate", { verdicts: [{ cand: 0, verdict: "duplicate", of: 0 }] }, [NOTE], KNOWN2, null],
    ["accepts one good verdict per candidate", { verdicts: [{ cand: 0, verdict: "duplicate", of: 1 }] }, [NOTE], KNOWN2, null],
    ["accepts one good verdict per candidate", { verdicts: [{ cand: 0, verdict: "contradicts", of: 0 }, { cand: 1, verdict: "append", of: 1 }] }, PAIR, KNOWN2, null],
    ["returns the first of the errors", { verdicts: [{ cand: 0, verdict: "side", of: 2 }] }, [NOTE], KNOWN2, NOTE_SET],
    ["returns the first of the errors", { verdicts: [{ cand: 0, verdict: "side" }, { cand: 0, verdict: "new" }] }, PAIR, KNOWN2, ONE],
  ];

  for (const [at, [name, json, candidates, known, expected]] of rows.entries()) {
    it(`${name} (${at})`, () => {
      expect(verdictsCheck(json, candidates, known)).toBe(expected);
    });
  }
});

describe("settle", () => {
  it("wants a json that passes the check", () => {
    expect(() => settle({}, [NOTE], KNOWN2)).toThrow("settle: the json passes the check");
    expect(() => settle({ verdicts: [] }, [NOTE], KNOWN2)).toThrow("settle: the json passes the check");
    expect(() => settle({ verdicts: [{ cand: 0, verdict: "duplicate" }] }, [NOTE], KNOWN2)).toThrow(
      "settle: the json passes the check",
    );
  });

  it("returns one settled verdict per candidate", () => {
    settle(
      {
        verdicts: [
          { cand: 0, verdict: "new" },
          { cand: 1, verdict: "append", of: 0, do: "fare anche questo" },
        ],
      },
      PAIR,
      KNOWN2,
    );
  });

  const v = (cand: number, verdict: string, of: string | null = null, adds: string | null = null, reason: string | null = null, d: string | null = null) =>
    ({ cand, verdict, of, adds, reason, do: d });
  const settled: [string, unknown, readonly (NoteCandidate | RuleCandidate)[], ReturnType<typeof v>[]][] = [
    ["keeps a new verdict and trims its strings", { verdicts: [{ cand: 0, verdict: "new", adds: "  nuova idea  ", reason: "  perché  ", do: "  azione  " }] }, [NOTE], [v(0, "new", null, "nuova idea", "perché", "azione")]],
    ["drops the of of a new verdict even when the model gave one", { verdicts: [{ cand: 0, verdict: "new", of: 1 }] }, [NOTE], [v(0, "new")]],
    ...["duplicate", "extends", "contradicts"].map((verdict): [string, unknown, readonly NoteCandidate[], ReturnType<typeof v>[]] =>
      [`turns a note ${verdict} that points at a rule into new`, { verdicts: [{ cand: 0, verdict, of: 1, adds: "aggiunge", adds_is_new_idea: true, reason: "perché" }] }, [NOTE], [v(0, "new")]]),
    ["turns a rule append that points at a note into new", { verdicts: [{ cand: 0, verdict: "append", of: 0, do: "azione" }] }, [RULE], [v(0, "new")]],
    ["keeps a note verdict that points at a note", { verdicts: [{ cand: 0, verdict: "contradicts", of: 0, reason: "dice il contrario" }] }, [NOTE], [v(0, "contradicts", "k0", null, "dice il contrario")]],
    ["keeps a rule verdict that points at a rule", { verdicts: [{ cand: 0, verdict: "append", of: 1, do: "azione" }] }, [RULE], [v(0, "append", "k1", null, null, "azione")]],
    ["turns a note extends without adds into duplicate", { verdicts: [{ cand: 0, verdict: "extends", of: 0 }] }, [NOTE], [v(0, "duplicate", "k0")]],
    ["turns a note extends with a blank adds into duplicate", { verdicts: [{ cand: 0, verdict: "extends", of: 0, adds: "   " }] }, [NOTE], [v(0, "duplicate", "k0")]],
    ["carries a contradicts verdict with its trimmed reason", { verdicts: [{ cand: 0, verdict: "contradicts", of: 0, reason: "  dice il contrario  " }] }, [NOTE], [v(0, "contradicts", "k0", null, "dice il contrario")]],
    ["turns a rule append without a do into duplicate", { verdicts: [{ cand: 0, verdict: "append", of: 1 }] }, [RULE], [v(0, "duplicate", "k1")]],
    ["turns a rule append with a blank do into duplicate", { verdicts: [{ cand: 0, verdict: "append", of: 1, do: "   " }] }, [RULE], [v(0, "duplicate", "k1")]],
    ["keeps a rule append with its trimmed do", { verdicts: [{ cand: 0, verdict: "append", of: 1, do: "  anche questo  " }] }, [RULE], [v(0, "append", "k1", null, null, "anche questo")]],
    ["keeps a rule new verdict with no of", { verdicts: [{ cand: 0, verdict: "new" }] }, [RULE], [v(0, "new")]],
    ["sorts the verdicts by cand", { verdicts: [{ cand: 1, verdict: "new" }, { cand: 0, verdict: "duplicate", of: 0 }] }, PAIR, [v(0, "duplicate", "k0"), v(1, "new")]],
  ];

  for (const [name, json, candidates, expected] of settled) {
    it(name, () => {
      expect(settle(json, candidates, KNOWN2)).toEqual(expected);
    });
  }

  it("keeps a note extends when the adds is a new idea", () => {
    expect(
      settle({ verdicts: [{ cand: 0, verdict: "extends", of: 0, adds: "  aggiunge  ", adds_is_new_idea: true }] }, [NOTE], KNOWN2),
    ).toEqual([{ cand: 0, verdict: "extends", of: "k0", adds: "aggiunge", reason: null, do: null }]);
    for (const value of ["true", "TRUE", "True"]) {
      const settled = settle(
        { verdicts: [{ cand: 0, verdict: "extends", of: 0, adds: "aggiunge", adds_is_new_idea: value }] },
        [NOTE],
        KNOWN2,
      );
      expect(settled[0].verdict).toBe("extends");
    }
  });

  it("turns a note extends with no new idea into ref_only", () => {
    expect(settle({ verdicts: [{ cand: 0, verdict: "extends", of: 0, adds: "aggiunge" }] }, [NOTE], KNOWN2)).toEqual([
      { cand: 0, verdict: "ref_only", of: "k0", adds: "aggiunge", reason: null, do: null },
    ]);
    for (const value of [false, 1, "si", ""]) {
      const settled = settle(
        { verdicts: [{ cand: 0, verdict: "extends", of: 0, adds: "aggiunge", adds_is_new_idea: value }] },
        [NOTE],
        KNOWN2,
      );
      expect(settled[0].verdict).toBe("ref_only");
    }
  });

  it("nulls a reason that is missing, blank or not a string", () => {
    expect(settle({ verdicts: [{ cand: 0, verdict: "duplicate", of: 0 }] }, [NOTE], KNOWN2)[0].reason).toBe(null);
    expect(settle({ verdicts: [{ cand: 0, verdict: "duplicate", of: 0, reason: "   " }] }, [NOTE], KNOWN2)[0].reason).toBe(null);
    expect(settle({ verdicts: [{ cand: 0, verdict: "duplicate", of: 0, reason: 7 }] }, [NOTE], KNOWN2)[0].reason).toBe(null);
  });

  it("maps the of to the key of the known item, first and last", () => {
    const twoNotes: readonly Known[] = [
      { key: "k0", kind: "note", text: "la prima nota" },
      { key: "k1", kind: "note", text: "la seconda nota" },
    ];
    expect(settle({ verdicts: [{ cand: 0, verdict: "duplicate", of: 0 }] }, [NOTE], twoNotes)[0].of).toBe("k0");
    expect(settle({ verdicts: [{ cand: 0, verdict: "duplicate", of: 1 }] }, [NOTE], twoNotes)[0].of).toBe("k1");
  });
});

describe("judgeNovelty", () => {
  let model: ModelStub;

  beforeEach(() => {
    model = startModelStub();
  });

  afterEach(() => {
    model.stop();
  });

  it("makes no call and answers nothing with no candidate", async () => {
    const judged = await judgeNovelty([], KNOWN2, extractorAt(model.port));
    expect(judged.answer).toBe(null);
    expect(judged.verdicts).toEqual([]);
    expect(model.queue.length).toBe(0);
  });

  it("gives no verdict for a failed answer", async () => {
    model.queue.push("no json object in this reply", "still no json object in this reply");
    const judged = await judgeNovelty([NOTE], KNOWN2, extractorAt(model.port));
    expect(judged.answer?.isOk()).toBe(false);
    expect(judged.verdicts).toEqual([]);
  });

  it("settles one verdict per candidate for an ok answer", async () => {
    model.queue.push(
      JSON.stringify({
        verdicts: [
          { cand: 0, verdict: "extends", of: 0, adds: "aggiunge il contesto", adds_is_new_idea: false },
          { cand: 1, verdict: "new" },
        ],
      }),
    );
    const judged = await judgeNovelty(PAIR, KNOWN2, extractorAt(model.port));
    expect(judged.answer?.isOk()).toBe(true);
    expect(judged.verdicts).toEqual([
      { cand: 0, verdict: "ref_only", of: "k0", adds: "aggiunge il contesto", reason: null, do: null },
      { cand: 1, verdict: "new", of: null, adds: null, reason: null, do: null },
    ]);
  });
});