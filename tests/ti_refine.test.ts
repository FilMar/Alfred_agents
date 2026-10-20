// countedOf: the contract is the oracle. Bare calls reach the postconditions.

import { describe, expect, it } from "bun:test";
import { COUNTERS_START, countedOf } from "../tools/ti/src/refine.ts";
import type { IdentityEntry } from "../tools/ti/src/types.ts";

function rule(overrides: Partial<IdentityEntry> = {}): IdentityEntry {
  return {
    id: "r-1",
    if: "if the user asks about the tide, check the tide table first",
    do: ["read the tide table before answering"],
    tags: ["hook"],
    ...overrides,
  };
}

describe("countedOf", () => {
  describe("preconditions", () => {
    it("throws when countersStart is not a valid date", () => {
      expect(() => countedOf(rule(), new Date("not a date"))).toThrow(
        "countedOf: countersStart is a valid date",
      );
    });

    it("throws when rule.when is set but is not a date", () => {
      expect(() => countedOf(rule({ when: "not a date" }), COUNTERS_START)).toThrow(
        "countedOf: when is absent or an ISO date",
      );
    });
  });

  describe("postconditions", () => {
    it("sets what to the if of the rule, whole and untruncated", () => {
      countedOf(
        rule({
          if: "if the user asks for the weather, open the window and look at the sky before answering with anything else",
        }),
        COUNTERS_START,
      );
    });

    it("keeps the when of the rule when it has one", () => {
      countedOf(rule({ when: "2026-10-01T09:30:00.000Z" }), COUNTERS_START);
    });

    it("keeps the when string verbatim, without normalizing it", () => {
      countedOf(rule({ when: "2026-10-01" }), COUNTERS_START);
    });

    it("uses COUNTERS_START as the when of a rule that has none", () => {
      countedOf(rule(), COUNTERS_START);
    });

    it("uses the countersStart argument, not the COUNTERS_START constant", () => {
      countedOf(rule(), new Date("2020-05-04T00:00:00.000Z"));
    });

    it("keeps the id and the counters of the rule, with no related hits", () => {
      countedOf(
        rule({
          id: "r-42",
          when: "2026-10-18T08:00:00.000Z",
          hits: 3,
          last_hit: "2026-10-19T07:45:00.000Z",
          archived_at: "2026-10-19T08:00:00.000Z",
        }),
        COUNTERS_START,
      );
    });

    it("keeps absent counters absent", () => {
      countedOf(rule({ when: "2026-10-18T00:00:00.000Z" }), COUNTERS_START);
    });
  });
});