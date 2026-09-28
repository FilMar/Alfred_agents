import { describe, it, expect } from "bun:test";
import { noteId, buildSparseVector, frontierIds } from "../tools/tb/src/qdrant.ts";
import { isEvidence, noteToText, withoutLink, nextHit, nextRelatedHit, matchPrefix, topRelated, groupByPayload, validateSearchOptions } from "../tools/tb/src/types.ts";
import type { Note, RelatedResult } from "../tools/tb/src/types.ts";

const bare: Note = {
  id: "n0", when: "2024-01-01", what: "w", why: "y", tags: [], kind: "dato", refs: [],
};

describe("noteId", () => {
  it("deterministic: same input → same output", () => {
    const id1 = noteId("hello world", "2024-01-01T00:00:00Z");
    const id2 = noteId("hello world", "2024-01-01T00:00:00Z");
    expect(id1).toBe(id2);
  });

  it("different inputs → different outputs", () => {
    expect(noteId("a", "b")).not.toBe(noteId("a", "c"));
    expect(noteId("a", "b")).not.toBe(noteId("b", "b"));
  });

  it("UUID-shaped format: 8-4-4-4-12 hex", () => {
    const parts = noteId("test", "2024-01-01").split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toHaveLength(8);
    expect(parts[1]).toHaveLength(4);
    expect(parts[2]).toHaveLength(4);
    expect(parts[3]).toHaveLength(4);
    expect(parts[4]).toHaveLength(12);
  });
});

describe("buildSparseVector", () => {
  it("empty text → empty vector", () => {
    expect(buildSparseVector("")).toEqual({ indices: [], values: [] });
  });

  it("only short tokens (< 2 chars) → empty vector", () => {
    expect(buildSparseVector("a b c")).toEqual({ indices: [], values: [] });
  });

  it("indices and values have the same length", () => {
    const { indices, values } = buildSparseVector("hello world foo bar");
    expect(indices.length).toBe(values.length);
  });

  it("values sum to 1.0 (frequency normalized over total tokens)", () => {
    const { values } = buildSparseVector("hello world baz");
    const sum = values.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("repeated tokens: single token → value 1.0", () => {
    const { indices, values } = buildSparseVector("hello hello");
    expect(indices).toHaveLength(1);
    expect(values[0]).toBeCloseTo(1.0, 5);
  });

  it("case insensitive: Hello and hello → same index", () => {
    const lower = buildSparseVector("hello hello");
    const mixed = buildSparseVector("Hello hello");
    expect(lower.indices).toEqual(mixed.indices);
    expect(lower.values[0]).toBeCloseTo(mixed.values[0], 5);
  });
});

describe("isEvidence", () => {
  it("'dato' is the only evidence kind", () => {
    expect(isEvidence("dato")).toBe(true);
  });

  it("all other kinds are not evidence", () => {
    for (const kind of ["protocollo", "sintesi", "attrito", "configurazione", "indice"] as const) {
      expect(isEvidence(kind)).toBe(false);
    }
  });
});

describe("noteToText", () => {
  it("joins why and what with a double newline", () => {
    expect(noteToText({ why: "context", what: "idea" })).toBe("context\n\nidea");
  });
});

describe("withoutLink", () => {
  const note: Note = {
    id: "n1", when: "2024-01-01", what: "w", why: "y", tags: [], kind: "dato",
    refs: [{ id: "n2", reason: "a" }, { id: "n3", reason: "b" }],
    backrefs: ["n2", "n4"],
  };

  it("drops the ref and the backref to the given id", () => {
    const out = withoutLink(note, "n2");
    expect(out.refs).toEqual([{ id: "n3", reason: "b" }]);
    expect(out.backrefs).toEqual(["n4"]);
  });

  it("leaves the note unchanged when the id is not linked", () => {
    expect(withoutLink(note, "zz")).toEqual(note);
  });

  it("does not add backrefs to a note that has none", () => {
    const { backrefs: _b, ...bare } = note;
    expect(withoutLink(bare, "n2").backrefs).toBeUndefined();
  });

  it("does not mutate the input", () => {
    withoutLink(note, "n2");
    expect(note.refs).toHaveLength(2);
    expect(note.backrefs).toHaveLength(2);
  });
});

describe("nextHit", () => {
  it("starts from zero when the note was never hit", () => {
    expect(nextHit({}, "2024-01-01T00:00:00Z")).toEqual({ hits: 1, last_hit: "2024-01-01T00:00:00Z" });
  });

  it("increments an existing counter", () => {
    expect(nextHit({ hits: 4 }, "t").hits).toBe(5);
  });
});

describe("nextRelatedHit", () => {
  it("starts from zero when the note was never reached through an edge", () => {
    expect(nextRelatedHit({}, "2024-01-01T00:00:00Z")).toEqual({
      hits_related: 1,
      last_hit_related: "2024-01-01T00:00:00Z",
    });
  });

  it("increments an existing counter", () => {
    expect(nextRelatedHit({ hits_related: 4 }, "t").hits_related).toBe(5);
  });

  it("counts apart from the direct counter", () => {
    expect(nextRelatedHit({ hits_related: 1 }, "t")).not.toHaveProperty("hits");
  });
});

describe("matchPrefix", () => {
  const ids = ["aa11-x", "aa22-y", "bb33-z"];

  it("keeps only the ids that start with the prefix", () => {
    expect(matchPrefix("aa", ids)).toEqual(["aa11-x", "aa22-y"]);
  });

  it("matches a full id", () => {
    expect(matchPrefix("bb33-z", ids)).toEqual(["bb33-z"]);
  });

  it("returns nothing when no id matches", () => {
    expect(matchPrefix("cc", ids)).toEqual([]);
  });

  it("does not match inside an id", () => {
    expect(matchPrefix("11", ids)).toEqual([]);
  });
});

describe("topRelated", () => {
  const related = (id: string, score: number) =>
    ({ note: { ...bare, id }, score, via: "related" }) as RelatedResult;

  it("returns the highest score first", () => {
    const ranked = topRelated([related("a", 0.1), related("b", 0.9), related("c", 0.5)], 3);
    expect(ranked.map((r) => r.note.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps at most the limit", () => {
    expect(topRelated([related("a", 0.1), related("b", 0.9)], 1)).toHaveLength(1);
  });

  it("keeps the best when it cuts", () => {
    expect(topRelated([related("a", 0.1), related("b", 0.9)], 1)[0].note.id).toBe("b");
  });

  it("breaks a tie on id, so two searches agree", () => {
    const one = topRelated([related("z", 0.5), related("a", 0.5)], 2);
    const two = topRelated([related("a", 0.5), related("z", 0.5)], 2);
    expect(one.map((r) => r.note.id)).toEqual(two.map((r) => r.note.id));
  });

  it("returns nothing at limit zero", () => {
    expect(topRelated([related("a", 0.1)], 0)).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [related("a", 0.1), related("b", 0.9)];
    topRelated(input, 2);
    expect(input.map((r) => r.note.id)).toEqual(["a", "b"]);
  });

  it("rejects a limit that is not a count", () => {
    expect(() => topRelated([], 1.5)).toThrow("topRelated: limit is a count");
  });
});

describe("groupByPayload", () => {
  it("merges the writes that carry the same payload", () => {
    const groups = groupByPayload([
      { id: "a", payload: { hits: 1 } },
      { id: "b", payload: { hits: 1 } },
      { id: "c", payload: { hits: 7 } },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ ids: ["a", "b"], payload: { hits: 1 } });
  });

  it("keeps every write", () => {
    const writes = [
      { id: "a", payload: { hits: 1 } },
      { id: "b", payload: { hits: 2 } },
      { id: "c", payload: { hits: 1 } },
    ];
    const kept = groupByPayload(writes).flatMap((g) => g.ids);
    expect(kept.sort()).toEqual(["a", "b", "c"]);
  });

  it("returns nothing for no writes", () => {
    expect(groupByPayload([])).toEqual([]);
  });
});

describe("validateSearchOptions", () => {
  it("accepts an empty option set", () => {
    expect(validateSearchOptions({})).toBeNull();
  });

  it("rejects a fractional depth", () => {
    expect(validateSearchOptions({ depth: 1.5 })).toContain("depth");
  });

  it("rejects the NaN that a bad --depth parses to", () => {
    expect(validateSearchOptions({ depth: NaN })).toContain("depth");
  });

  it("rejects the NaN that a bad --min-score parses to", () => {
    expect(validateSearchOptions({ min_score: NaN })).toContain("min_score");
  });

  it("rejects a score outside the cosine range", () => {
    expect(validateSearchOptions({ min_score: 2 })).toContain("min_score");
  });

  it("rejects a limit of zero", () => {
    expect(validateSearchOptions({ limit: 0 })).toContain("limit");
  });

  it("accepts a related_limit of zero: no related notes is a choice", () => {
    expect(validateSearchOptions({ related_limit: 0 })).toBeNull();
  });
});

describe("frontierIds", () => {
  const node = (id: string, refs: string[], backrefs?: string[]): Note => ({
    ...bare,
    id,
    refs: refs.map((r) => ({ id: r, reason: "why" })),
    ...(backrefs && { backrefs }),
  });

  it("follows refs and backrefs together", () => {
    expect(frontierIds([node("a", ["b"], ["c"])], new Set())).toEqual(["b", "c"]);
  });

  it("skips what was already visited", () => {
    expect(frontierIds([node("a", ["b"], ["c"])], new Set(["b"]))).toEqual(["c"]);
  });

  it("returns an id once, even when two notes point at it", () => {
    expect(frontierIds([node("a", ["z"]), node("b", ["z"])], new Set())).toEqual(["z"]);
  });

  it("is sorted, so a truncated hop repeats", () => {
    expect(frontierIds([node("a", ["c", "b"], ["d"])], new Set())).toEqual(["b", "c", "d"]);
  });

  it("handles a note with no backrefs field", () => {
    expect(frontierIds([node("a", ["b"])], new Set())).toEqual(["b"]);
  });
});
