import { describe, test, expect } from "bun:test";
import {
  ProjectTerms,
  TagVocabulary,
  Evidence,
  Checked,
  NoteCandidate,
  RuleCandidate,
} from "../tools/td/src/candidate.ts";
import type { CheckDrop } from "../tools/td/src/candidate.ts";

describe("ProjectTerms", () => {
  test("of: postcondition - every term is at least TERM_MIN characters", () => {
    ProjectTerms.of("term1 term2");
  });

  test("hitsIn: postcondition - every hit is a term", () => {
    const pt = ProjectTerms.of("term1 term2");
    pt.hitsIn("some text");
  });

  test("hitsIn: postcondition - every hit occurs in the text, case ignored", () => {
    const pt = ProjectTerms.of("term1 term2");
    pt.hitsIn("some text");
  });
});

describe("TagVocabulary", () => {
  test("of: precondition - every tag is not blank", () => {
    expect(() => TagVocabulary.of([""])).toThrow("TagVocabulary.of: every tag is not blank");
    expect(() => TagVocabulary.of([" "])).toThrow("TagVocabulary.of: every tag is not blank");
  });

  test("of: precondition - valid input", () => {
    TagVocabulary.of(["tag1"]);
  });

  test("of: postcondition - no tag is invented", () => {
    TagVocabulary.of(["tag1"]);
  });

  test("known: postcondition - every result is a tag of the vocabulary", () => {
    const tv = TagVocabulary.of(["tag1"]);
    tv.known(["tag1"]);
  });

  test("known: postcondition - no tag twice", () => {
    const tv = TagVocabulary.of(["tag1"]);
    tv.known(["tag1"]);
  });

  test("proposed: postcondition - no result matches the vocabulary", () => {
    const tv = TagVocabulary.of(["tag1"]);
    tv.proposed(["tag2"]);
  });

  test("proposed: postcondition - no tag twice", () => {
    const tv = TagVocabulary.of(["tag1"]);
    tv.proposed(["tag2"]);
  });

  test("proposed: postcondition - no blank tag", () => {
    const tv = TagVocabulary.of(["tag1"]);
    tv.proposed(["tag2"]);
  });
});

describe("Evidence", () => {
  test("of: precondition - target is not blank", () => {
    const pt = ProjectTerms.of("term1");
    const tv = TagVocabulary.of(["tag1"]);
    expect(() => Evidence.of("", "user", pt, tv)).toThrow("Evidence.of: target is not blank");
    expect(() => Evidence.of(" ", "user", pt, tv)).toThrow("Evidence.of: target is not blank");
  });

  test("of: precondition - valid input", () => {
    const pt = ProjectTerms.of("term1");
    const tv = TagVocabulary.of(["tag1"]);
    Evidence.of("target", "user", pt, tv);
  });
});

describe("Checked", () => {
  test("kept: postcondition - the result is kept", () => {
    Checked.kept({});
  });

  test("dropped: postcondition - the result carries the reason", () => {
    Checked.dropped({}, "empty");
  });
});

describe("NoteCandidate", () => {
  const validModel = {
    what: "Cosa",
    why: "Perché",
    kind: "dato",
    tags: ["tag1"],
    contexts: ["ctx1", "ctx2"],
    quote: "Questa è una citazione lunga abbastanza",
  };

  test("fromModel: postcondition - a candidate comes only from a note shape", () => {
    NoteCandidate.fromModel(validModel);
  });

  test("fromModel: postcondition - no tag is proposed before the check", () => {
    NoteCandidate.fromModel(validModel);
  });

  test("check: postcondition - a dropped result carries this candidate", () => {
    const nc = NoteCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    nc.check(ev);
  });

  test("check: postcondition - the drop names a check the note fails", () => {
    const nc = NoteCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    nc.check(ev);
  });

  test("check: postcondition - a kept note has one to three tags, at least one known", () => {
    const nc = NoteCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    nc.check(ev);
  });

  test("check: postcondition - a kept note passes every check", () => {
    const nc = NoteCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    nc.check(ev);
  });


  describe("Thresholds", () => {
    const ev = Evidence.of("target text with long quote for notes", "user", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));

    test("NOTE_QUOTE_MIN (10)", () => {
      NoteCandidate.fromModel({ ...validModel, quote: "123456789" })!.check(ev); // 9: just outside
      NoteCandidate.fromModel({ ...validModel, quote: "1234567890" })!.check(ev); // 10: at edge
      NoteCandidate.fromModel({ ...validModel, quote: "12345678901" })!.check(ev); // 11: just inside
    });

    test("MAX_TAGS (3)", () => {
      NoteCandidate.fromModel({ ...validModel, tags: ["tag1", "tag2"] })!.check(ev); // 2: just inside
      NoteCandidate.fromModel({ ...validModel, tags: ["tag1", "tag2", "tag3"] })!.check(ev); // 3: at edge
      NoteCandidate.fromModel({ ...validModel, tags: ["tag1", "tag2", "tag3", "tag4"] })!.check(ev); // 4: just outside
    });
  });
});

function rulesToDedupe(): Checked<RuleCandidate>[] {
  const ev = Evidence.of("target", "devi leggere il log prima di toccare il codice", ProjectTerms.of(""), TagVocabulary.of(["qualità"]));
  const rule = (quote: string, tags: string[]) =>
    RuleCandidate.fromModel({ if: "il test fallisce", do: "leggi il log prima del codice", tags, quote })!.check(ev);
  return [
    rule("leggere il log prima di toccare il codice", ["qualità"]),
    rule("Leggere il log, prima di toccare il codice!", ["qualità"]),
    rule("leggere il log prima di toccare il codice", ["inventato"]),
  ];
}

describe("RuleCandidate", () => {
  const validModel = {
    if: "Se succede X",
    do: "Allora fai Y",
    tags: ["tag1"],
    quote: "Questa è una citazione per regole",
  };

  test("fromModel: postcondition - a candidate comes only from a rule shape", () => {
    RuleCandidate.fromModel(validModel);
  });

  test("fromModel: postcondition - no tag is proposed before the check", () => {
    RuleCandidate.fromModel(validModel);
  });

  test("check: postcondition - a dropped result carries this candidate", () => {
    const rc = RuleCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user text with long quote for rules", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    rc.check(ev);
  });

  test("check: postcondition - the drop names a check the rule fails", () => {
    const rc = RuleCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user text with long quote for rules", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    rc.check(ev);
  });

  test("check: postcondition - a kept rule has one to three tags, at least one known", () => {
    const rc = RuleCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user text with long quote for rules", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    rc.check(ev);
  });

  test("check: postcondition - a kept rule passes every check", () => {
    const rc = RuleCandidate.fromModel(validModel)!;
    const ev = Evidence.of("target", "user text with long quote for rules", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));
    rc.check(ev);
  });

  test("dedupe: postcondition - every rule is kept or dropped", () => {
    RuleCandidate.dedupe(rulesToDedupe());
  });

  test("dedupe: postcondition - no two kept rules share a quote", () => {
    RuleCandidate.dedupe(rulesToDedupe());
  });

  test("dedupe: postcondition - a rule already dropped keeps its reason, a new drop is same_quote", () => {
    RuleCandidate.dedupe(rulesToDedupe());
  });


  describe("Thresholds", () => {
    const ev = Evidence.of("target", "user text with long quote for rules", ProjectTerms.of("term1"), TagVocabulary.of(["tag1"]));

    test("RULE_QUOTE_MIN (8)", () => {
      RuleCandidate.fromModel({ ...validModel, quote: "1234567" })!.check(ev); // 7: just outside
      RuleCandidate.fromModel({ ...validModel, quote: "12345678" })!.check(ev); // 8: at edge
      RuleCandidate.fromModel({ ...validModel, quote: "123456789" })!.check(ev); // 9: just inside
    });
  });
});

describe("ProjectTerms Thresholds", () => {
  test("TERM_MIN (4)", () => {
    // These are internally checked by #allLongEnough, which is a postcondition of .of()
    ProjectTerms.of("123"); // 3: just outside
    ProjectTerms.of("1234"); // 4: at edge
    ProjectTerms.of("12345"); // 5: just inside
  });
});

// Outcome tables: classifiers have no independent contract, so these tests name the expected result.
describe("outcomes", () => {
  const target = "Abbiamo visto che con soglia cosine 0.95 due note opposte sembrano duplicate, quindi la soglia va abbassata.";
  const user = "secondo me quando il test fallisce devi leggere il log prima di toccare il codice";
  const terms = ProjectTerms.of("uso `tools/td` e la funzione `normText` con max_tags");
  const vocabulary = TagVocabulary.of(["sviluppo-software", "architettura", "memoria", "qualità"]);
  const ev = Evidence.of(target, user, terms, vocabulary);

  const note = {
    what: "La soglia cosine è troppo alta per vedere le note che si contraddicono",
    why: "Due note opposte con le stesse parole hanno un coseno alto e sembrano una duplicata",
    kind: "attrito",
    tags: ["architettura", "Memoria", "nuovo-tag"],
    contexts: ["deduplicare le note", "cercare contraddizioni nel grafo"],
    quote: "con soglia cosine 0.95 due note opposte",
  };
  const rule = {
    if: "il test fallisce",
    do: "leggi il log prima di toccare il codice",
    tags: ["qualità"],
    quote: "leggere il log prima di toccare il codice",
  };

  test("a good note is kept, with known tags first and the new one proposed", () => {
    const checked = NoteCandidate.fromModel(note)!.check(ev);
    expect(checked.drop()).toBeNull();
    expect(checked.candidate().toJson().tags).toEqual(["architettura", "memoria"]);
    expect(checked.candidate().toJson().proposedTags).toEqual(["nuovo-tag"]);
  });

  test.each([
    ["empty", { what: "" }],
    ["kind", { kind: "sintesi" }],
    ["tags", { tags: ["inventato"] }],
    ["contexts", { contexts: ["deduplicare le note"] }],
    ["contexts", { contexts: ["Deduplicare le note.", "deduplicare le note"] }],
    ["quote", { quote: "una frase che nel testo non c'è" }],
    ["quote", { quote: "0.95 due" }],
    ["italian", { what: "The cosine threshold is too high for notes that contradict", why: "Two opposite notes with the same words have a high cosine" }],
    ["project_term", { what: "La funzione normText sbaglia con la soglia" }],
    ["purity", { why: "Come richiesto, la soglia va abbassata per le note opposte" }],
  ])("a note drops for %s", (drop, change) => {
    expect(NoteCandidate.fromModel({ ...note, ...change })!.check(ev).drop()).toBe(drop as CheckDrop);
  });

  test("a note quote of exactly NOTE_QUOTE_MIN characters is enough", () => {
    expect(NoteCandidate.fromModel({ ...note, quote: "0.95 due n" })!.check(ev).drop()).toBeNull();
  });

  test("more than MAX_TAGS known tags are cut to the first three, nothing proposed", () => {
    const tags = ["architettura", "memoria", "qualità", "sviluppo-software", "nuovo"];
    const checked = NoteCandidate.fromModel({ ...note, tags })!.check(ev);
    expect(checked.candidate().toJson().tags).toEqual(["architettura", "memoria", "qualità"]);
    expect(checked.candidate().toJson().proposedTags).toEqual([]);
  });

  test("a good rule is kept", () => {
    expect(RuleCandidate.fromModel(rule)!.check(ev).drop()).toBeNull();
  });

  test.each([
    ["empty", { do: " " }],
    ["tags", { tags: ["inventato"] }],
    ["rule_quote", { quote: "una frase che l'utente non ha detto" }],
    ["rule_quote", { quote: "con soglia cosine 0.95 due note opposte" }],
    ["italian", { if: "when the test fails", do: "read the log before the code" }],
  ])("a rule drops for %s", (drop, change) => {
    expect(RuleCandidate.fromModel({ ...rule, ...change })!.check(ev).drop()).toBe(drop as CheckDrop);
  });

  test("dedupe drops a later rule with the same quote and keeps other reasons", () => {
    expect(RuleCandidate.dedupe(rulesToDedupe()).map((c) => c.drop())).toEqual([null, "same_quote", "tags"]);
  });

  test("known tags match by key: case, accents, spaces and underscores", () => {
    expect(vocabulary.known(["Sviluppo_Software", "ARCHITETTURA", "qualita"])).toEqual(["sviluppo-software", "architettura", "qualità"]);
  });

  test("proposed tags are trimmed, not blank, one per key", () => {
    expect(vocabulary.proposed(["Sviluppo_Software", " nuovo tag ", "nuovo-tag", " "])).toEqual(["nuovo tag"]);
  });

  test("project terms are found case ignored", () => {
    expect(terms.hitsIn("uso NORMTEXT qui")).toEqual(["normText"]);
  });

  test("project terms: snake case and paths, short backtick words left out", () => {
    expect([...ProjectTerms.of("abc_d `x1` foo/bar").hitsIn("abc_d x1 foo/bar")].sort()).toEqual(["abc_d", "foo/bar"]);
  });

  test("fromModel returns null for a wrong shape", () => {
    expect(NoteCandidate.fromModel({ ...note, tags: "architettura" })).toBeNull();
    expect(RuleCandidate.fromModel({ if: "x" })).toBeNull();
  });
});
