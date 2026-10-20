import { assert } from "../../common/contract.js";
import type { Counted } from "../../tb/src/refine.js";
import type { IdentityEntry } from "./types.js";

export const COUNTERS_START = new Date("2026-10-20T00:00:00.000Z");

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function isAbsentOrIsoDate(text: string | undefined): boolean {
  return text === undefined || Number.isFinite(Date.parse(text));
}

function whenHolds(counted: Counted, rule: IdentityEntry, countersStart: Date): boolean {
  return counted.when === (rule.when ?? countersStart.toISOString());
}

function countersKept(counted: Counted, rule: IdentityEntry): boolean {
  return (
    counted.id === rule.id &&
    counted.hits === rule.hits &&
    counted.last_hit === rule.last_hit &&
    counted.archived_at === rule.archived_at &&
    counted.hits_related === undefined &&
    counted.last_hit_related === undefined
  );
}

export function countedOf(rule: IdentityEntry, countersStart: Date): Counted {
  assert(isValidDate(countersStart), "countedOf: countersStart is a valid date");
  assert(isAbsentOrIsoDate(rule.when), "countedOf: when is absent or an ISO date");
  let result: Counted;
  result = {
    id: rule.id,
    what: rule.if,
    when: rule.when ?? countersStart.toISOString(),
    hits: rule.hits,
    hits_related: undefined,
    last_hit: rule.last_hit,
    last_hit_related: undefined,
    archived_at: rule.archived_at,
  };
  assert(result.what === rule.if, "countedOf: what is the if of the rule");
  assert(whenHolds(result, rule, countersStart), "countedOf: when is the rule when, or the counters start");
  assert(countersKept(result, rule), "countedOf: id and counters are the rule ones, with no related hits");
  return result;
}
