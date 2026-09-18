import { describe, it, expect } from "bun:test";
import { noteId, buildSparseVector } from "../tools/tb/src/qdrant.ts";
import { isEvidence, noteToText } from "../tools/tb/src/types.ts";

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