import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  DEFAULT_TIMEOUT_MS,
  ERROR_TEXT_MAX_LEN,
  HTTP_METHODS,
  HttpClient,
  HttpError,
} from "../tools/common/http.ts";

const realFetch = globalThis.fetch;
const realTimeout = AbortSignal.timeout;

type RecordedCall = { input: unknown; init: RequestInit | undefined };

let calls: RecordedCall[];
let timeouts: number[];
let signals: AbortSignal[];
let response: Response;

beforeEach(() => {
  calls = [];
  timeouts = [];
  signals = [];
  response = new Response(JSON.stringify({ value: 42 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  globalThis.fetch = ((input: unknown, init?: RequestInit) => {
    calls.push({ input, init });
    return Promise.resolve(response);
  }) as typeof globalThis.fetch;
  AbortSignal.timeout = ((ms: number) => {
    timeouts.push(ms);
    const controller = new AbortController();
    signals.push(controller.signal);
    return controller.signal;
  }) as typeof AbortSignal.timeout;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  AbortSignal.timeout = realTimeout;
});

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

async function errorFromRequest(status: number, text: string): Promise<unknown> {
  response = new Response(text, { status });
  const client = new HttpClient({ baseUrl: "http://base" });
  return catchError(client.request("GET", "/things"));
}

test("fetch rifiuta un metodo fuori dalla lista", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await expect(client.fetch("HEAD", "/things")).rejects.toThrow(
    "HttpClient.fetch: method is GET, POST, PUT, PATCH or DELETE",
  );
});

test("fetch rifiuta un path che non comincia con /", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await expect(client.fetch("GET", "")).rejects.toThrow("HttpClient.fetch: path starts with /");
});

for (const method of HTTP_METHODS) {
  test(`fetch inoltra il metodo ${method}`, async () => {
    const client = new HttpClient({ baseUrl: "http://base" });
    await client.fetch(method, "/things");
    expect(calls.length).toBe(1);
    expect(calls[0]?.init?.method).toBe(method);
  });
}

test("fetch accetta il path /", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await client.fetch("GET", "/");
  expect(calls.length).toBe(1);
  expect(calls[0]?.input).toBe("http://base/");
});

test("fetch chiama globalThis.fetch con base + path, metodo e timeout di default", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await client.fetch("GET", "/things");
  expect(calls.length).toBe(1);
  expect(calls[0]?.input).toBe("http://base/things");
  expect(calls[0]?.init?.method).toBe("GET");
  expect(calls[0]?.init?.signal).toBe(signals[0]);
  expect(timeouts).toEqual([DEFAULT_TIMEOUT_MS]);
  expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBeNull();
  expect(calls[0]?.init?.body).toBeUndefined();
});

test("fetch usa il timeout della configurazione", async () => {
  const client = new HttpClient({ baseUrl: "http://base", timeout: 2_500 });
  await client.fetch("GET", "/things");
  expect(calls.length).toBe(1);
  expect(calls[0]?.init?.signal).toBe(signals[0]);
  expect(timeouts).toEqual([2_500]);
});

test("fetch manda il body come JSON con l'header Content-Type", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await client.fetch("POST", "/things", { name: "tb" });
  expect(calls.length).toBe(1);
  expect(calls[0]?.input).toBe("http://base/things");
  expect(calls[0]?.init?.method).toBe("POST");
  expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json");
  expect(calls[0]?.init?.body).toBe(JSON.stringify({ name: "tb" }));
});

test("fetch manda null senza l'header Content-Type", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await client.fetch("POST", "/things", null);
  expect(calls.length).toBe(1);
  expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBeNull();
  expect(calls[0]?.init?.body).toBe("null");
});

test("fetch rende la risposta di globalThis.fetch", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  const fetched = await client.fetch("GET", "/things");
  expect(fetched).toBe(response);
});

test("fetch rilegge baseUrl a ogni chiamata", async () => {
  let base = "http://one";
  const client = new HttpClient({ baseUrl: () => base });
  await client.fetch("GET", "/a");
  base = "http://two";
  await client.fetch("GET", "/b");
  expect(calls.length).toBe(2);
  expect(calls[0]?.input).toBe("http://one/a");
  expect(calls[1]?.input).toBe("http://two/b");
});

test("request rifiuta un metodo fuori dalla lista", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await expect(client.request("HEAD", "/things")).rejects.toThrow(
    "HttpClient.fetch: method is GET, POST, PUT, PATCH or DELETE",
  );
});

test("request rifiuta un path che non comincia con /", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await expect(client.request("GET", "")).rejects.toThrow("HttpClient.fetch: path starts with /");
});

test("request inoltra metodo, path e body a fetch", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  await client.request("POST", "/things", { name: "tb" });
  expect(calls.length).toBe(1);
  expect(calls[0]?.input).toBe("http://base/things");
  expect(calls[0]?.init?.method).toBe("POST");
  expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json");
  expect(calls[0]?.init?.body).toBe(JSON.stringify({ name: "tb" }));
});

test("request rende il JSON del corpo quando la risposta è ok", async () => {
  const client = new HttpClient({ baseUrl: "http://base" });
  const data = await client.request<{ value: number }>("GET", "/things");
  expect(data).toEqual({ value: 42 });
});

test("request rende il JSON a 299, l'ultimo status ok", async () => {
  response = new Response(JSON.stringify({ value: 7 }), { status: 299 });
  const client = new HttpClient({ baseUrl: "http://base" });
  const data = await client.request<{ value: number }>("GET", "/things");
  expect(data).toEqual({ value: 7 });
});

test("request lancia HttpError a 300, il primo status non ok", async () => {
  const error = (await errorFromRequest(300, "redirected")) as HttpError;
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(300);
  expect(error.message).toBe("300 redirected");
});

test("request lancia HttpError con lo status e il testo della risposta non ok", async () => {
  const error = (await errorFromRequest(404, "not found here")) as HttpError;
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(404);
  expect(error.message).toBe("404 not found here");
});

test("request non taglia un testo di errore sotto il limite", async () => {
  const text = "x".repeat(ERROR_TEXT_MAX_LEN - 1);
  const error = (await errorFromRequest(500, text)) as HttpError;
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(500);
  expect(error.message).toBe(`500 ${text}`);
});

test("request non taglia un testo di errore lungo quanto il limite", async () => {
  const text = "x".repeat(ERROR_TEXT_MAX_LEN);
  const error = (await errorFromRequest(500, text)) as HttpError;
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(500);
  expect(error.message).toBe(`500 ${text}`);
});

test("request taglia un testo di errore oltre il limite", async () => {
  const error = (await errorFromRequest(500, "x".repeat(ERROR_TEXT_MAX_LEN + 1))) as HttpError;
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(500);
  expect(error.message).toBe(`500 ${"x".repeat(ERROR_TEXT_MAX_LEN)}`);
});