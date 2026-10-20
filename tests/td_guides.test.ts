import { describe, expect, it } from "bun:test";

import { QUALITY_BAR, qualityBar } from "../tools/td/src/guides.ts";

const NOTE_GUIDE = "# Note guide\nSave notes with a source.";
const RULE_GUIDE = "# Rule guide\nSave rules as orders.";

describe("qualityBar", () => {
  it("rejects a blank note guide", () => {
    expect(() => qualityBar("", RULE_GUIDE)).toThrow("qualityBar: the note guide is not blank");
  });

  it("rejects a whitespace-only note guide", () => {
    expect(() => qualityBar(" \t\n ", RULE_GUIDE)).toThrow("qualityBar: the note guide is not blank");
  });

  it("rejects a blank rule guide", () => {
    expect(() => qualityBar(NOTE_GUIDE, "")).toThrow("qualityBar: the rule guide is not blank");
  });

  it("rejects a whitespace-only rule guide", () => {
    expect(() => qualityBar(NOTE_GUIDE, " \t\n ")).toThrow("qualityBar: the rule guide is not blank");
  });

  // Postconditions: the asserts inside qualityBar are the oracle, a bare call fails when one fires.
  it("returns a bar that starts with its head", () => {
    qualityBar("N", "R");
  });

  it("returns a bar that holds the note guide, then the rule guide", () => {
    qualityBar(NOTE_GUIDE, RULE_GUIDE);
  });
});

describe("QUALITY_BAR", () => {
  // Built at import: readGuide feeds qualityBar, whose asserts are the oracle.
  it("is the bar read once from the real guides", () => {
    void QUALITY_BAR;
  });
});