import { embedDocument, embedQuery, EMBED_MODEL } from "../../tb/src/infra.js";
import { NOTE_ID_SHAPE } from "../../tb/src/qdrant.js";
import { matchPrefix } from "../../tb/src/types.js";
import { assert } from "../../common/contract.js";
import * as qdrant from "./qdrant.js";
import type { IdentityEntry, SearchOptions } from "./types.js";

/**
 * CONTRACT: 
 * - Must embed the `if` string using the configured embedding model.
 * - Must create a new entry in the `pi_identity` collection.
 * - Must never overwrite an existing entry; always create a new point.
 * - Side effect: writes to Qdrant.
 */
export async function addEntry(ifText: string, doText: string, tags: string[], exchange?: string): Promise<IdentityEntry> {
  await qdrant.ensureCollection();
  const vector = await embedDocument(ifText);

  const id = crypto.randomUUID();
  await qdrant.upsertPoint(id, vector, {
    if: ifText,
    do: [doText],
    tags,
    ...(exchange && { exchange }),
    embed_model: EMBED_MODEL,
  });

  return {
    id,
    vector: [],
    if: ifText,
    do: [doText],
    tags,
    ...(exchange && { exchange }),
  };
}

/**
 * CONTRACT:
 * - Must embed the query string.
 * - Must search the `pi_identity` collection using semantic similarity on the `if` field.
 * - Must filter by tags if provided.
 * - Must return ranked candidates with their scores.
 * - Must not call an LLM.
 */
export async function searchEntries(query: string, options: SearchOptions): Promise<IdentityEntry[]> {
  await qdrant.ensureCollection();
  const vector = await embedQuery(query);

  
  const filter = options.tags?.length ? { must: [{ key: "tags", match: { any: options.tags } }] } : undefined;
  const res = await qdrant.queryPoints(vector, {
    limit: options.limit ?? 10,
    filter,
    ...(options.min_score !== undefined && { score_threshold: options.min_score }),
  });

  return (res.result?.points ?? []).map((hit: any) => ({
    id: hit.id,
    vector: hit.vector ?? [],
    ...hit.payload,
    score: hit.score,
  })) as any[];
}

/**
 * CONTRACT:
 * - Must return all entries in the `pi_identity` collection.
 * - Must filter by tags if provided.
 * - No semantic ranking involved.
 */
export async function listEntries(tags?: string[]): Promise<IdentityEntry[]> {
  await qdrant.ensureCollection();
  const filter = tags?.length ? { must: [{ key: "tags", match: { any: tags } }] } : undefined;
  const points: any[] = [];
  let offset: any = undefined;
  do {
    const res = await qdrant.scrollPoints({ filter, limit: 100, offset });
    points.push(...(res.result?.points ?? []));
    offset = res.result?.next_page_offset ?? null;
  } while (offset !== null);

  return points.map((p: any) => ({
    id: p.id,
    vector: p.vector ?? [],
    ...p.payload,
  }));
}

/**
 * CONTRACT:
 * - Must remove the entry with the specified ID from the `pi_identity` collection.
 * - Must handle non-existent IDs gracefully (no-op or error based on Qdrant response).
 */
export async function deleteEntry(id: string): Promise<void> {
  await qdrant.ensureCollection();
  await qdrant.deletePoints([id]);
}

/**
 * CONTRACT:
 * - Must retrieve the existing entry by ID.
 * - Must append the provided `do` string to the existing `do` array.
 * - Must persist the updated array back to Qdrant.
 * - Must not modify the `if` or `vector` fields.
 */
export async function appendDo(id: string, doText: string): Promise<IdentityEntry> {
  await qdrant.ensureCollection();
  const res = await qdrant.getPointById(id);
  const point = res.result;
  
  if (!point) {
    throw new Error(`No entry found with id: ${id}`);
  }
  
  const existingEntry = point.payload;
  const vector = point.vector;
  const updatedDo = [...existingEntry.do, doText];
  
  await qdrant.upsertPoint(id, vector, {
    if: existingEntry.if,
    do: updatedDo,
    tags: existingEntry.tags,
    ...(existingEntry.exchange && { exchange: existingEntry.exchange }),
    ...(existingEntry.embed_model && { embed_model: existingEntry.embed_model }),
  });
  
  return {
    id,
    vector: [],
    if: existingEntry.if,
    do: updatedDo,
    tags: existingEntry.tags,
  };
}

const ID_CANDIDATES_SHOWN = 5;

/** Resolves a full id, or the one id that starts with `prefix`. */
export async function resolveEntryId(idOrPrefix: string): Promise<string> {
  assert(idOrPrefix.trim().length > 0, "resolveEntryId: the id is not blank");
  if (NOTE_ID_SHAPE.test(idOrPrefix)) return idOrPrefix;

  const matches = matchPrefix(idOrPrefix, (await listEntries()).map((entry) => entry.id));
  if (matches.length === 0) throw new Error(`No rule id starts with "${idOrPrefix}"`);
  if (matches.length > 1) {
    const shown = matches.slice(0, ID_CANDIDATES_SHOWN).join(", ");
    throw new Error(`Ambiguous id "${idOrPrefix}": ${matches.length} rules match (${shown})`);
  }

  assert(NOTE_ID_SHAPE.test(matches[0]), "resolveEntryId: a resolved id is a full id");
  return matches[0];
}

/** Returns the whole rule for a full id or the one prefix that matches it. */
export async function entryById(idOrPrefix: string): Promise<IdentityEntry> {
  const id = await resolveEntryId(idOrPrefix);
  await qdrant.ensureCollection();
  const res = await qdrant.getPointById(id);
  if (!res.result) throw new Error(`No rule found with id: ${id}`);
  assert(res.result.id === id, "entryById: the rule found carries the id asked");
  return { id, vector: res.result.vector ?? [], ...res.result.payload };
}
