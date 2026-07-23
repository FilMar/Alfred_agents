import { ollamaClient, EMBED_MODEL } from "../../tb/src/infra.js";
import * as qdrant from "./qdrant.js";
import type { IdentityEntry, SearchOptions } from "./types.js";

/**
 * CONTRACT: 
 * - Must embed the `if` string using the configured embedding model.
 * - Must create a new entry in the `pi_identity` collection.
 * - Must never overwrite an existing entry; always create a new point.
 * - Side effect: writes to Qdrant.
 */
export async function addEntry(ifText: string, doText: string, tags: string[]): Promise<IdentityEntry> {
  await qdrant.ensureCollection();
  const data = await ollamaClient.request<{ embeddings: number[][] }>("POST", "/api/embed", { model: EMBED_MODEL, input: ifText });
  const vector = data.embeddings[0];
  
  const id = crypto.randomUUID();
  await qdrant.upsertPoint(id, vector, { if: ifText, do: [doText], tags });
  
  return {
    id,
    vector: [],
    if: ifText,
    do: [doText],
    tags
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
  const data = await ollamaClient.request<{ embeddings: number[][] }>("POST", "/api/embed", { model: EMBED_MODEL, input: query });
  const vector = data.embeddings[0];
  
  const filter = options.tags?.length ? { must: [{ key: "tags", match: { any: options.tags } }] } : undefined;
  const res = await qdrant.queryPoints(vector, { limit: options.limit ?? 10, filter });

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
  const res = await qdrant.scrollPoints({ filter });

  return (res.result?.points ?? []).map((p: any) => ({
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
    tags: existingEntry.tags 
  });
  
  return {
    id,
    vector: [],
    if: existingEntry.if,
    do: updatedDo,
    tags: existingEntry.tags,
  };
}
