// The CLI's view of the archive. The store is a file on another machine, so every
// read and write goes through our own API.

import { HttpClient } from "../../tb/src/infra.js";
import { assert } from "../../contract/contract.js";
import { API_PORT } from "./api.js";
import type { Contents, Exchange, Extraction, ExtractionFilters, Extractor, NewExtraction, NewExtractor, Session } from "./types.js";
import { isRowId, validateNewExtractions, validateNewExtractor } from "./types.js";
import type { ExchangeFilters, SessionFilters } from "./db.js";

export const API_URL = process.env.TL_API_URL ?? `http://localhost:${API_PORT}`;

const TIMEOUT_MS = 10_000;

// Bodies are the whole text of an exchange, so they travel in small batches.
const CONTENTS_PER_REQUEST = 20;
const ROWS_PER_REQUEST = 200;

const client = new HttpClient({ baseUrl: API_URL, timeout: TIMEOUT_MS });

export async function health(): Promise<{ sessions: number; exchanges: number; contents: number }> {
  return client.request("GET", "/health");
}

export async function putSessions(rows: Session[]): Promise<number> {
  return putBatched("/sessions", rows, ROWS_PER_REQUEST);
}

export async function putExchanges(rows: Exchange[]): Promise<number> {
  return putBatched("/exchanges", rows, ROWS_PER_REQUEST);
}

export async function putContents(rows: Contents[]): Promise<number> {
  return putBatched("/contents", rows, CONTENTS_PER_REQUEST);
}

async function putBatched<T>(path: string, rows: T[], perRequest: number): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += perRequest) {
    const batch = rows.slice(i, i + perRequest);
    const answer = await client.request<{ written: number }>("POST", path, batch);
    written += answer.written;
  }
  return written;
}

export async function fetchSessions(filters: SessionFilters = {}): Promise<Session[]> {
  return client.request("GET", `/sessions${query(filters as Record<string, unknown>)}`);
}

export async function fetchExchanges(filters: ExchangeFilters = {}): Promise<Exchange[]> {
  return client.request("GET", `/exchanges${query(filters as Record<string, unknown>)}`);
}

export async function fetchExchange(id: string): Promise<Exchange> {
  return client.request("GET", `/exchanges/${id}`);
}

export async function fetchContents(id: string, withTools: boolean): Promise<Contents> {
  return client.request("GET", `/contents/${id}${withTools ? "?tools=true" : ""}`);
}

export async function markDistilled(id: string, distilled: string | null): Promise<void> {
  await client.request("PATCH", `/exchanges/${id}`, { distilled });
}

export async function putExtractor(row: NewExtractor): Promise<number> {
  assert(validateNewExtractor(row) === null, `putExtractor: ${validateNewExtractor(row)}`);
  const result = await client.request<{ id: number }>("POST", "/extractors", row);
  const id = result.id;
  assert(isRowId(id), "putExtractor: the new id is a row id");
  return id;
}

export async function fetchExtractor(id: number | "active"): Promise<Extractor> {
  assert(id === "active" || isRowId(id), `fetchExtractor: id is a row id or active, id=${id}`);
  const result = await client.request<Extractor>("GET", `/extractors/${id}`);
  assert(validateNewExtractor(result) === null, `fetchExtractor: ${validateNewExtractor(result)}`);
  assert(id !== "active" || result.active, "fetchExtractor: asking for active returns an active row");
  assert(id === "active" || result.id === id, "fetchExtractor: the row returned is the one asked for");
  return result;
}

export async function activateExtractor(id: number): Promise<void> {
  assert(isRowId(id), `activateExtractor: id is a row id, id=${id}`);
  await client.request("PATCH", `/extractors/${id}`, { active: true });
}

export async function putExtractions(rows: NewExtraction[]): Promise<number> {
  assert(validateNewExtractions(rows) === null, `putExtractions: ${validateNewExtractions(rows)}`);
  const result = await client.request<{ written: number }>("POST", "/extractions", rows);
  const written = result.written;
  assert(written === rows.length, "putExtractions: every row is written");
  return written;
}

export async function fetchExtractions(filters: ExtractionFilters = {}): Promise<Extraction[]> {
  const result = await client.request<Extraction[]>("GET", `/extractions${query(filters as Record<string, unknown>)}`);
  assert(validateNewExtractions(result) === null, `fetchExtractions: ${validateNewExtractions(result)}`);
  return result;
}

function query(params: Record<string, unknown>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}
