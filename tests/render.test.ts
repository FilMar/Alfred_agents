import { expect, test } from "bun:test";

import {
  opensBlock,
  emptyIffNone,
  lineCountAtLeast,
  startedLines,
  isBlockStart,
  allBlockStarts,
  containsAll,
  sameKeysWithout,
  shortId,
  noteBlock,
  ruleBlock,
  blocksOf,
  ruleView,
} from "../tools/common/render.ts";

test.each([
  { name: "the marker line holds the short id", text: "-- abcdefgh\nwhat\nwhy", id: "abcdefgh1234", expected: true },
  { name: "the id of exactly 8 characters", text: "-- abcdefgh\nwhat", id: "abcdefgh", expected: true },
  { name: "the id shorter than 8 characters", text: "-- abc\nwhat", id: "abc", expected: true },
  { name: "a wrong short id", text: "-- abcdefg\nwhat", id: "abcdefgh12", expected: false },
  { name: "more than 8 characters before the newline", text: "-- abcdefgh9\nwhat", id: "abcdefgh90", expected: false },
  { name: "the marker not at the start", text: "  -- abcdefgh\nwhat", id: "abcdefgh12", expected: false },
  { name: "the empty text", text: "", id: "abcdefgh12", expected: false },
])("opensBlock: $name", ({ text, id, expected }) => {
  expect(opensBlock(text, id)).toBe(expected);
});

test.each([
  { name: "a block of the spec", text: "-- abcdefgh\nwhat\nwhy", expected: true },
  { name: "the marker alone", text: "-- ", expected: true },
  { name: "the dashes without the space", text: "--", expected: false },
  { name: "the dashes glued to the id", text: "--abcdefgh\nwhat", expected: false },
  { name: "the marker with leading spaces", text: "  -- abcdefgh\nwhat", expected: false },
  { name: "the empty text", text: "", expected: false },
])("isBlockStart: $name", ({ text, expected }) => {
  expect(isBlockStart(text)).toBe(expected);
});

test.each([
  { name: "every part is in the text", text: "-- abcdefgh\nwhat\nwhy", parts: ["what", "why"], expected: true },
  { name: "a part is missing", text: "-- abcdefgh\nwhat", parts: ["what", "why"], expected: false },
  { name: "there are no parts", text: "anything", parts: [], expected: true },
])("containsAll: $name", ({ text, parts, expected }) => {
  expect(containsAll(text, parts)).toBe(expected);
});

test.each([
  { name: "the dropped key is gone, the rest is kept", source: { id: 1, vector: 2 }, result: { id: 1 }, dropped: "vector", expected: true },
  { name: "the dropped key is still there", source: { id: 1, why: 2, vector: 3 }, result: { id: 1, vector: 3 }, dropped: "vector", expected: false },
  { name: "a kept key is gone too", source: { id: 1, why: 2, vector: 3 }, result: { id: 1 }, dropped: "vector", expected: false },
  { name: "the result has an extra key", source: { id: 1, vector: 2 }, result: { id: 1, extra: 3 }, dropped: "vector", expected: false },
  { name: "there is nothing to drop", source: { id: 1 }, result: { id: 1 }, dropped: "vector", expected: true },
  { name: "everything is dropped", source: { vector: 1 }, result: {}, dropped: "vector", expected: true },
])("sameKeysWithout: $name", ({ source, result, dropped, expected }) => {
  expect(sameKeysWithout(source, result, dropped)).toBe(expected);
});

test("shortId rejects a blank id", () => {
  expect(() => shortId("")).toThrow("shortId: id is not blank");
});

test("shortId rejects an id shorter than 8 characters", () => {
  expect(() => shortId("abcdefg")).toThrow("shortId: id has at least 8 characters");
});

test("shortId keeps the result at 8 characters", () => {
  shortId("abcdefgh1234");
});

test("shortId keeps the result a prefix of the id", () => {
  shortId("qwertyuiopasdf");
});

test("shortId accepts an id of exactly 8 characters", () => {
  shortId("abcdefgh");
});

test("shortId accepts an id of 9 characters", () => {
  shortId("abcdefghi");
});

test("noteBlock rejects a blank what", () => {
  expect(() => noteBlock({ id: "abcdefgh1234", what: "", why: "the why" })).toThrow("noteBlock: what is not blank");
});

test("noteBlock rejects a blank why", () => {
  expect(() => noteBlock({ id: "abcdefgh1234", what: "the what", why: "" })).toThrow("noteBlock: why is not blank");
});

test("noteBlock keeps the block open with the short id", () => {
  noteBlock({ id: "abcdefgh", what: "w", why: "y" });
});

test("noteBlock keeps what and why in the block", () => {
  noteBlock({ id: "zzzzzzzz4321", what: "the what", why: "the why" });
});

test("noteBlock keeps the why at the end of the block", () => {
  noteBlock({ id: "abcdefgh9876", what: "first line", why: "last line" });
});

test("ruleBlock rejects a rule with no actions", () => {
  expect(() => ruleBlock({ id: "abcdefgh1234", do: [] })).toThrow("ruleBlock: the rule has at least one action");
});

test("ruleBlock rejects a blank action", () => {
  expect(() => ruleBlock({ id: "abcdefgh1234", do: ["a real action", ""] })).toThrow("ruleBlock: every action is not blank");
});

test("ruleBlock keeps the block open with the short id", () => {
  ruleBlock({ id: "abcdefgh", do: ["the only action"] });
});

test("ruleBlock keeps every action in the block", () => {
  ruleBlock({ id: "zzzzzzzz8765", do: ["first action", "second action"] });
});

test("blocksOf rejects a block without the marker", () => {
  expect(() => blocksOf(["-- abcdefgh\nok", "no marker here"])).toThrow("blocksOf: every block opens with the marker");
});

test("blocksOf keeps the text empty for no blocks", () => {
  blocksOf([]);
});

test("blocksOf keeps one block in the text", () => {
  blocksOf(["-- aaaaaaaa\nsingle block"]);
});

test("blocksOf keeps every block in the text", () => {
  blocksOf(["-- aaaaaaaa\nfirst block", "-- bbbbbbbb\nsecond block"]);
});

test("ruleView rejects an entry that is not a record", () => {
  expect(() => ruleView(null as unknown as { vector?: unknown })).toThrow("ruleView: the entry is a record");
});

test("ruleView keeps the vector out of the result", () => {
  ruleView({ id: "abcdefgh1234", do: ["an action"], vector: [0.1, 0.2, 0.3] });
});

test("ruleView keeps every other field of the entry", () => {
  ruleView({ id: "zzzzzzzz5678", what: "the what", why: "the why", vector: [1, 2] });
});

test("ruleView accepts an entry without a vector", () => {
  ruleView<{ id: string; vector?: unknown }>({ id: "abcdefgh" });
});

test("ruleView accepts an entry with an undefined vector", () => {
  ruleView({ id: "abcdefgh", vector: undefined });
});

test("ruleView accepts an entry made only of the vector", () => {
  ruleView({ vector: [0.5] });
});

test.each([
  { name: "three lines for three", text: "a\nb\nc", count: 3, expected: true },
  { name: "two lines for three", text: "a\nb", count: 3, expected: false },
  { name: "one line for one", text: "a", count: 1, expected: true },
  { name: "more lines than asked", text: "a\nb\nc\nd", count: 2, expected: true },
])("lineCountAtLeast: $name", ({ text, count, expected }) => {
  expect(lineCountAtLeast(text, count)).toBe(expected);
});

test.each([
  { name: "two blocks on two lines", text: "-- aaaaaaaa\nx\n-- bbbbbbbb\ny", expected: 2 },
  { name: "two blocks glued on one line", text: "-- aaaaaaaa\nx-- bbbbbbbb\ny", expected: 1 },
  { name: "no block at all", text: "plain\ntext", expected: 0 },
  { name: "the empty text", text: "", expected: 0 },
])("startedLines: $name", ({ text, expected }) => {
  expect(startedLines(text)).toBe(expected);
});


test.each([
  { name: "no blocks, empty text", text: "", blocks: [], expected: true },
  { name: "no blocks, some text", text: "x", blocks: [], expected: false },
  { name: "a block, some text", text: "-- aaaaaaaa\nx", blocks: ["-- aaaaaaaa\nx"], expected: true },
  { name: "a block, empty text", text: "", blocks: ["-- aaaaaaaa\nx"], expected: false },
])("emptyIffNone: $name", ({ text, blocks, expected }) => {
  expect(emptyIffNone(text, blocks)).toBe(expected);
});


test.each([
  { name: "every block opens with the marker", blocks: ["-- a\nx", "-- b\ny"], expected: true },
  { name: "one block has no marker", blocks: ["-- a\nx", "b\ny"], expected: false },
  { name: "no blocks", blocks: [], expected: true },
])("allBlockStarts: $name", ({ blocks, expected }) => {
  expect(allBlockStarts(blocks)).toBe(expected);
});
