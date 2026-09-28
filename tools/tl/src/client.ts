// The CLI's view of the archive. The store is a file on another machine, so every
// read and write goes through our own API.

import { HttpClient } from "../../tb/src/infra.js";
import { API_PORT } from "./api.js";
import type { Contents, Exchange, Session } from "./types.js";
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

export async function fetchContents(id: string): Promise<Contents> {
  return client.request("GET", `/contents/${id}`);
}

export async function markDistilled(id: string, distilled: string | null): Promise<void> {
  await client.request("PATCH", `/exchanges/${id}`, { distilled });
}

function query(params: Record<string, unknown>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}
