import { assert } from "../../common/contract.js";
import { embedDocument } from "../../tb/src/infra.js";
import { kindOf } from "./critic.js";
import type { Candidate } from "./critic.js";
import { savedText } from "./novelty.js";
import type { SessionList, Verdict } from "./novelty.js";
import { isCutoffOrNull, twinOf } from "./twin.js";
import type { SessionVector } from "./twin.js";

const vectors = new Map<string, readonly number[]>();

async function vectorOf(text: string): Promise<readonly number[]> {
  const known = vectors.get(text);
  if (known !== undefined) return known;
  const vector = await embedDocument(text);
  vectors.set(text, vector);
  return vector;
}

function allDuplicatesOfTheList(found: ReadonlyMap<number, Verdict>, list: SessionList, count: number): boolean {
  const keys = new Set(list.items().map((item) => item.key));
  return [...found].every(([at, verdict]) => at >= 0 && at < count && verdict.verdict === "duplicate" && verdict.of !== null && keys.has(verdict.of));
}

/** The candidates that say again what an item of this session already says, as ready-made duplicate verdicts, by candidate index. */
export async function twinVerdicts(candidates: readonly Candidate[], list: SessionList, cutoff: number | null): Promise<ReadonlyMap<number, Verdict>> {
  assert(isCutoffOrNull(cutoff), "twinVerdicts: the cutoff is a number above 0 and at most 1, or null");
  const found = new Map<number, Verdict>();
  if (cutoff !== null && list.size() > 0) {
    for (let at = 0; at < candidates.length; at += 1) {
      const kind = kindOf(candidates[at]);
      const items: SessionVector[] = [];
      for (const item of list.items().filter((entry) => entry.kind === kind)) {
        items.push({ key: item.key, vector: await vectorOf(item.text) });
      }
      if (items.length > 0) {
        const twin = twinOf(await vectorOf(savedText(candidates[at])), items, cutoff);
        if (twin !== null) {
          found.set(at, { cand: at, verdict: "duplicate", of: twin.key, adds: null, reason: "same idea as an item of this session", do: null });
        }
      }
    }
  }
  assert(cutoff !== null || found.size === 0, "twinVerdicts: with no cutoff nothing is a twin");
  assert(allDuplicatesOfTheList(found, list, candidates.length), "twinVerdicts: every twin is a duplicate of an item of the list");
  return found;
}
