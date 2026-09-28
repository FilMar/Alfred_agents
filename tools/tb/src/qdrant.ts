import { createHash } from "node:crypto";
import { COLLECTION, DENSE_VECTOR_NAME, SPARSE_VECTOR_NAME, VECTOR_SIZE, SNIPPET_MAX_LEN, qdrantClient, HttpError, getCollectionInfo, createCollection } from "./infra.js";
import type { Note, NoteType, SearchOptions, SearchResult, RelatedResult, Citation } from "./types.js";
import { NOTE_TYPES, isEvidence, noteToText, assert, topRelated, RELATED_LIMIT } from "./types.js";

// ─── ID / Vettori ─────────────────────────────────────────────────────────────

/** The shape every note id has: UUID-shaped lowercase hex, 8-4-4-4-12. */
export const NOTE_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Genera un UUID-shaped ID deterministico da SHA256(what + ":" + when). */
export function noteId(what: string, when: string): string {
  const hash = createHash("sha256").update(`${what}:${when}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

export function buildSparseVector(text: string): { indices: number[]; values: number[] } {
  const tokens = text.toLowerCase().split(/\W+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return { indices: [], values: [] };

  const freq = new Map<number, number>();
  for (const token of tokens) {
    const idx = hashToken(token);
    freq.set(idx, (freq.get(idx) ?? 0) + 1);
  }

  const total = tokens.length;
  const indices: number[] = [];
  const values: number[] = [];
  for (const [idx, count] of freq.entries()) {
    indices.push(idx);
    values.push(count / total);
  }
  return { indices, values };
}

const SPARSE_VOCAB_SIZE = 32768;

function hashToken(token: string, vocabSize = SPARSE_VOCAB_SIZE): number {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash + token.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % vocabSize;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function createIndices(only?: string[]): Promise<void> {
  const keyword = ["tags", "kind"].filter((f) => !only || only.includes(f));
  const text = ["what", "why"].filter((f) => !only || only.includes(f));
  for (const field of keyword) {
    await qdrantClient.request("PUT", `/collections/${COLLECTION}/index`, {
      field_name: field,
      field_schema: "keyword",
    });
  }
  for (const field of text) {
    await qdrantClient.request("PUT", `/collections/${COLLECTION}/index`, {
      field_name: field,
      field_schema: { type: "text", tokenizer: "word", lowercase: true },
    });
  }
}

export async function ensureCollection(): Promise<void> {
  const check = await getCollectionInfo(COLLECTION);

  if (check.exists) {
    const info = check.info as {
      result?: {
        config?: { params?: { sparse_vectors?: unknown } };
        payload_schema?: Record<string, unknown>;
      };
    };

    if (info.result?.config?.params?.sparse_vectors === undefined) {
      throw new Error(
        `Qdrant: collection '${COLLECTION}' has no sparse vector config. ` +
        `Migrate it, or point COLLECTION at a collection that has one. ` +
        `Never fix this by deleting the collection.`,
      );
    }

    const schema = info.result?.payload_schema ?? {};
    const missing = ["tags", "kind", "what", "why"].filter((f) => !(f in schema));
    if (missing.length > 0) await createIndices(missing);
    return;
  }

  await createCollection(COLLECTION, {
    vectors: { [DENSE_VECTOR_NAME]: { size: VECTOR_SIZE, distance: "Cosine" } },
    sparse_vectors: { [SPARSE_VECTOR_NAME]: { modifier: "idf" } },
  });

  await createIndices();
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

/** Saves (or overwrites) a note with its vector. No business logic. */
export async function upsert(note: Note, vector: number[]): Promise<void> {
  const sparse = buildSparseVector(noteToText(note));
  await qdrantClient.request("PUT", `/collections/${COLLECTION}/points?wait=true`, {
    points: [
      {
        id: note.id,
        vector: { [DENSE_VECTOR_NAME]: vector, [SPARSE_VECTOR_NAME]: sparse },
        payload: note,
      },
    ],
  });
}

/** Deletes points by ID. */
export async function deletePoints(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await qdrantClient.request("POST", `/collections/${COLLECTION}/points/delete?wait=true`, {
    points: ids,
  });
}

/** Updates specific fields of a note's payload. */
export async function setPayload(id: string, payload: Record<string, unknown>): Promise<void> {
  await setPayloadMany([id], payload);
}

/** Writes one payload on many notes in a single request. */
export async function setPayloadMany(ids: string[], payload: Record<string, unknown>): Promise<void> {
  if (ids.length === 0) return;
  await qdrantClient.request("POST", `/collections/${COLLECTION}/points/payload?wait=true`, {
    payload,
    points: ids,
  });
}

/** Fetches notes by ID. Returns [] on 404. */
export async function getByIds(ids: string[]): Promise<Note[]> {
  if (ids.length === 0) return [];

  let data: { result: Array<{ payload: Note }> };
  try {
    data = await qdrantClient.request<{ result: Array<{ payload: Note }> }>(
      "POST",
      `/collections/${COLLECTION}/points`,
      { ids, with_payload: true, with_vector: false },
    );
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return [];
    throw err;
  }

  return data.result.map((r) => r.payload).filter(Boolean);
}

/** Returns a random note ID using a normalized random vector. O(log n), no Ollama. */
export async function randomNoteId(): Promise<string | null> {
  const v = Array.from({ length: VECTOR_SIZE }, () => Math.random() * 2 - 1);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const vector = v.map((x) => x / norm);

  type QueryResp = { result?: { points?: Array<{ id: string }> } };
  let data: QueryResp;
  try {
    data = await qdrantClient.request<QueryResp>(
      "POST",
      `/collections/${COLLECTION}/points/query`,
      { query: vector, using: DENSE_VECTOR_NAME, limit: 1, with_payload: false },
    );
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null;
    throw new Error(`randomNoteId: ${err instanceof Error ? err.message : String(err)}`);
  }

  const points = data.result?.points ?? [];
  return points.length > 0 ? points[0].id : null;
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function buildSearchFilter(options: SearchOptions): Record<string, unknown> | undefined {
  const must: unknown[] = [];
  const must_not: unknown[] = [];

  if (options.tags?.length) {
    must.push({ key: "tags", match: { any: options.tags } });
  }

  if (options.evidence_only) {
    must.push({ key: "kind", match: { any: NOTE_TYPES.filter(isEvidence) } });
  } else if (options.kind?.length) {
    must.push({ key: "kind", match: { any: options.kind } });
  }

  if (!options.include_hubs) {
    must_not.push({ key: "kind", match: { value: "indice" } });
  }

  if (must.length === 0 && must_not.length === 0) return undefined;
  const filter: Record<string, unknown> = {};
  if (must.length > 0) filter.must = must;
  if (must_not.length > 0) filter.must_not = must_not;
  return filter;
}

// ─── Traversal ────────────────────────────────────────────────────────────────

const MAX_CORRELATES_VISITED = 500;
const MAX_IDS_PER_BATCH = 200;

/** Ids one hop from the frontier, through refs and backrefs. Sorted: truncation must repeat. */
export function frontierIds(frontier: Note[], seen: Set<string>): string[] {
  const linked = frontier.flatMap((n) => [...n.refs.map((c) => c.id), ...(n.backrefs ?? [])]);
  return [...new Set(linked.filter((id) => !seen.has(id)))].sort();
}

async function traverseCorrelates(
  initial: Note[],
  seen: Set<string>,
  depth: number,
  queryVector: number[],
  filter: Record<string, unknown> | undefined,
): Promise<RelatedResult[]> {
  const results: RelatedResult[] = [];
  let frontier = initial;

  for (let hop = 0; hop < depth; hop++) {
    const room = MAX_CORRELATES_VISITED - seen.size;
    if (room <= 0) break;

    const ids = frontierIds(frontier, seen).slice(0, room);
    if (ids.length === 0) break;

    // asked for is visited: a note the filter drops is not asked for again
    for (const id of ids) seen.add(id);

    const scored = await queryByIds(queryVector, ids, filter);
    frontier = scored.map((s) => s.note);
    results.push(...scored.map((s) => ({ note: s.note, score: s.score, via: "related" as const })));
  }

  assert(seen.size <= MAX_CORRELATES_VISITED, "traverseCorrelates: visit bound held");
  return results;
}

/**
 * Scores notes by id against the query vector, under the search filter.
 * The engine returns its own cosine, so a related score and a direct score are one quantity.
 */
async function queryByIds(
  queryVector: number[],
  ids: string[],
  filter?: Record<string, unknown>,
): Promise<Array<{ note: Note; score: number }>> {
  const scored: Array<{ note: Note; score: number }> = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_BATCH) {
    scored.push(...await queryIdBatch(queryVector, ids.slice(i, i + MAX_IDS_PER_BATCH), filter));
  }
  return scored;
}

async function queryIdBatch(
  queryVector: number[],
  ids: string[],
  filter?: Record<string, unknown>,
): Promise<Array<{ note: Note; score: number }>> {
  if (ids.length === 0) return [];

  try {
    const data = await qdrantClient.request<QdrantQueryResponse>(
      "POST",
      `/collections/${COLLECTION}/points/query`,
      {
        query: queryVector,
        using: DENSE_VECTOR_NAME,
        filter: withIds(filter, ids),
        limit: ids.length,
        with_payload: true,
      },
    );
    return data.result.points.map((p) => ({ note: p.payload, score: p.score }));
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return [];
    throw err;
  }
}

function withIds(filter: Record<string, unknown> | undefined, ids: string[]): Record<string, unknown> {
  const must = [...((filter?.must as unknown[]) ?? []), { has_id: ids }];
  return { ...filter, must };
}

// ─── Search ──────────────────────────────────────────────────────────────────

type QdrantQueryResponse = { result: { points: Array<{ payload: Note; score: number }> } };
type QdrantIdResponse = { result: { points: Array<{ id: string }> } };

const DEFAULT_LIMIT = 10;

export async function search(vector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
  const filter = buildSearchFilter(options);

  const direct = options.hybrid && options.query_text
    ? await fusedThenScored(vector, options.query_text, options, filter)
    : await denseScored(vector, options, filter);

  const results: SearchResult[] = direct.map((d) => ({
    note: d.note,
    score: d.score,
    via: "search" as const,
    citation: citationOf(d.note, d.score),
  }));

  const depth = options.depth ?? 1;
  if (depth > 0 && results.length > 0) {
    const seen = new Set(results.map((r) => r.note.id));
    const related = await traverseCorrelates(results.map((r) => r.note), seen, depth, vector, filter);
    results.push(...topRelated(related, options.related_limit ?? RELATED_LIMIT));
  }

  return results;
}

async function denseScored(
  vector: number[],
  options: SearchOptions,
  filter: Record<string, unknown> | undefined,
): Promise<Array<{ note: Note; score: number }>> {
  const data = await qdrantClient.request<QdrantQueryResponse>(
    "POST",
    `/collections/${COLLECTION}/points/query`,
    {
      query: vector,
      using: DENSE_VECTOR_NAME,
      limit: options.limit ?? DEFAULT_LIMIT,
      with_payload: true,
      ...(filter && { filter }),
      ...(options.min_score !== undefined && { score_threshold: options.min_score }),
    },
  );
  return data.result.points.map((p) => ({ note: p.payload, score: p.score }));
}

/**
 * Fusion picks the candidates, cosine scores them. An RRF score is 1/(k + rank),
 * so it is not a similarity and a cutoff in cosine units cannot be applied to it.
 */
async function fusedThenScored(
  vector: number[],
  queryText: string,
  options: SearchOptions,
  filter: Record<string, unknown> | undefined,
): Promise<Array<{ note: Note; score: number }>> {
  const sparse = buildSparseVector(queryText);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const prefetchLimit = Math.max(limit * 3, 20);

  const data = await qdrantClient.request<QdrantIdResponse>(
    "POST",
    `/collections/${COLLECTION}/points/query`,
    {
      prefetch: [
        { query: vector, using: DENSE_VECTOR_NAME, limit: prefetchLimit, ...(filter && { filter }) },
        { query: sparse, using: SPARSE_VECTOR_NAME, limit: prefetchLimit, ...(filter && { filter }) },
      ],
      query: { fusion: "rrf" },
      limit,
      with_payload: false,
      ...(filter && { filter }),
    },
  );

  const scored = await queryByIds(vector, data.result.points.map((p) => p.id), filter);
  const min = options.min_score;
  const kept = min === undefined ? scored : scored.filter((s) => s.score >= min);
  return kept.sort((a, b) => b.score - a.score);
}

function citationOf(note: Note, score: number): Citation {
  return {
    note_id: note.id,
    snippet: note.what.slice(0, SNIPPET_MAX_LEN),
    score,
    source: note.source,
    timestamp: note.when,
  };
}

// ─── Facets ──────────────────────────────────────────────────────────────────

export interface TagFacet {
  value: string;
  count: number;
}

export async function listTags(limit = 200): Promise<TagFacet[]> {
  const freq = new Map<string, number>();
  let offset: string | null = null;

  while (true) {
    const body: Record<string, unknown> = {
      limit: 100,
      with_payload: ["tags"],
      with_vector: false,
      ...(offset && { offset }),
    };
    const data = await qdrantClient.request<{
      result: { points: Array<{ payload: { tags?: string[] } }>; next_page_offset: string | null };
    }>("POST", `/collections/${COLLECTION}/points/scroll`, body);

    for (const point of data.result.points) {
      for (const tag of point.payload.tags ?? []) {
        freq.set(tag, (freq.get(tag) ?? 0) + 1);
      }
    }

    if (!data.result.next_page_offset) break;
    offset = data.result.next_page_offset;
  }

  return Array.from(freq.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Scroll ──────────────────────────────────────────────────────────────────

const SCROLL_PAGE_SIZE = 250;
const SCROLL_MAX_PAGES = 100;

/** Returns every note that links to `id`, via refs or backrefs. Paginated, bounded. */
export async function scrollLinkedTo(id: string): Promise<Note[]> {
  const filter = {
    should: [
      { key: "refs[].id", match: { value: id } },
      { key: "backrefs", match: { value: id } },
    ],
  };
  const results: Note[] = [];
  let offset: string | null = null;

  for (let page = 0; page < SCROLL_MAX_PAGES; page++) {
    const body: Record<string, unknown> = {
      limit: SCROLL_PAGE_SIZE,
      filter,
      with_payload: true,
      with_vector: false,
      ...(offset && { offset }),
    };
    const data = await qdrantClient.request<ScrollResponse<never>>(
      "POST",
      `/collections/${COLLECTION}/points/scroll`,
      body,
    );
    results.push(...data.result.points.map((p) => p.payload));
    if (!data.result.next_page_offset) break;
    offset = data.result.next_page_offset;
  }

  return results;
}

type IdPage = { result: { points: Array<{ id: string }>; next_page_offset: string | null } };

/** Every point id in the collection. No payload on the wire. */
export async function scrollAllIds(): Promise<string[]> {
  const ids: string[] = [];
  let offset: string | null = null;
  let page = 0;

  for (; page < SCROLL_MAX_PAGES; page++) {
    const data: IdPage = await qdrantClient.request<IdPage>("POST", `/collections/${COLLECTION}/points/scroll`, {
      limit: SCROLL_PAGE_SIZE,
      with_payload: false,
      with_vector: false,
      ...(offset && { offset }),
    });

    ids.push(...data.result.points.map((p) => p.id));
    if (!data.result.next_page_offset) break;
    offset = data.result.next_page_offset;
  }

  assert(page < SCROLL_MAX_PAGES, "scrollAllIds: the collection fits inside the page cap");
  assert(new Set(ids).size === ids.length, "scrollAllIds: no id read twice");
  return ids;
}

export interface ScrollOptions {
  kind?: NoteType;
  since?: string;
  limit?: number;
}

type ScrollResponse<V> = {
  result: {
    points: Array<{ payload: Note; vector: V }>;
    next_page_offset: string | null;
  };
};

export async function scroll(options: ScrollOptions = {}): Promise<Note[]> {
  const must: unknown[] = [];
  if (options.kind) must.push({ key: "kind", match: { value: options.kind } });
  if (options.since) must.push({ key: "when", range: { gte: options.since } });

  const body: Record<string, unknown> = {
    limit: options.limit ?? 20,
    with_payload: true,
    with_vector: false,
  };
  if (must.length > 0) body.filter = { must };

  const data = await qdrantClient.request<ScrollResponse<never>>(
    "POST",
    `/collections/${COLLECTION}/points/scroll`,
    body,
  );

  return data.result.points.map((p) => p.payload);
}

/** Scarica tutte le note con i loro vettori densi, paginando via next_page_offset. */
export async function scrollAllWithVectors(): Promise<Array<{ note: Note; vector: number[] }>> {
  const results: Array<{ note: Note; vector: number[] }> = [];
  let offset: string | null = null;

  while (true) {
    const body: Record<string, unknown> = {
      limit: 250,
      with_payload: true,
      with_vector: [DENSE_VECTOR_NAME],
      ...(offset && { offset }),
    };
    const data = await qdrantClient.request<ScrollResponse<Record<string, number[]>>>(
      "POST",
      `/collections/${COLLECTION}/points/scroll`,
      body,
    );

    for (const p of data.result.points) {
      const vector = p.vector?.[DENSE_VECTOR_NAME];
      if (vector) results.push({ note: p.payload, vector });
    }

    if (!data.result.next_page_offset) break;
    offset = data.result.next_page_offset;
  }

  return results;
}
