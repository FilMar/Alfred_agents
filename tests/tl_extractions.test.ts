import { describe, expect, it } from "bun:test";

import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";
import { exchangeId, validateNewExtraction, validateNewExtractions, validateNewExtractor } from "../tools/tl/src/types.ts";
import type { NewExtraction, NewExtractor } from "../tools/tl/src/types.ts";

const NOW = "2026-10-07T10:00:00.000Z";
const SESSION = "session-1";
const EXCHANGE = exchangeId(SESSION, "message-1");

const extractor: NewExtractor = { parent: null, why: "first", config: "{}", created: NOW };

const extraction: NewExtraction = {
  extractor_id: 1,
  run: "run-1",
  exchange_id: EXCHANGE,
  kind: "note",
  body: "{}",
  quote: "a quote",
  dropped_by: null,
  probabilities: null,
  verdict: null,
  of: null,
  saved_id: null,
  created: NOW,
};

function freshDb() {
  const handle = db.open(":memory:");
  db.upsertSession(handle, { id: SESSION, started: NOW });
  db.upsertExchange(handle, { id: EXCHANGE, session: SESSION, timestamp: NOW, kind: "chat", actor: "alfredo" });
  return handle;
}

const server = Bun.serve({ port: 0, fetch: createApp(freshDb()).fetch });
process.env.TL_API_URL = `http://localhost:${server.port}`;
const client = await import("../tools/tl/src/client.ts?extractions");

describe("types.ts", () => {
  it("validateNewExtractor", () => {
    validateNewExtractor(extractor);
    validateNewExtractor({ ...extractor, why: "" });
    validateNewExtractor({ ...extractor, config: "{" });
    validateNewExtractor({ ...extractor, created: "yesterday" });
    validateNewExtractor({ ...extractor, parent: 0 });
  });

  it("validateNewExtraction", () => {
    validateNewExtraction(extraction);
    validateNewExtraction({ ...extraction, extractor_id: 0 });
    validateNewExtraction({ ...extraction, run: "" });
    validateNewExtraction({ ...extraction, exchange_id: "e" });
    validateNewExtraction({ ...extraction, kind: "memo" as never });
    validateNewExtraction({ ...extraction, quote: "" });
    validateNewExtraction({ ...extraction, quote: "", dropped_by: "check:quote" });
    validateNewExtraction({ ...extraction, quote: "", dropped_by: "critic:is_project_detail" });
    validateNewExtraction({ ...extraction, body: "{" });
    validateNewExtraction({ ...extraction, probabilities: "{" });
    validateNewExtraction({ ...extraction, dropped_by: "critc:is_project_detail" });
    validateNewExtraction({ ...extraction, dropped_by: "critic:is_project_detail", verdict: "new" });
    validateNewExtraction({ ...extraction, dropped_by: "check:no_quote", probabilities: "{}" });
    validateNewExtraction({ ...extraction, dropped_by: "near_identical", probabilities: "{}" });
    validateNewExtraction({ ...extraction, saved_id: "x" });
    validateNewExtraction({ ...extraction, of: "x" });
    validateNewExtraction({ ...extraction, verdict: "extends", of: "x", saved_id: "y" });
  });

  it("validateNewExtractions", () => {
    validateNewExtractions([]);
    validateNewExtractions([extraction, extraction]);
    validateNewExtractions([extraction, { ...extraction, run: "" }]);
  });
});

describe("db.ts", () => {
  it("insertExtractor", () => {
    const handle = freshDb();
    db.insertExtractor(handle, extractor);
    db.insertExtractor(handle, { ...extractor, parent: 1 });
  });

  it("insertExtractor rejects a broken row", () => {
    expect(() => db.insertExtractor(freshDb(), { ...extractor, why: "" })).toThrow("insertExtractor: why is required");
  });

  it("getExtractor", () => {
    const handle = freshDb();
    db.insertExtractor(handle, extractor);
    db.getExtractor(handle, 1);
    db.getExtractor(handle, 2);
  });

  it("getExtractor rejects a bad id", () => {
    expect(() => db.getExtractor(freshDb(), 0)).toThrow("getExtractor: id is a row id");
  });

  it("getActiveExtractor", () => {
    const handle = freshDb();
    db.getActiveExtractor(handle);
    db.insertExtractor(handle, extractor);
    db.setActiveExtractor(handle, 1);
    db.getActiveExtractor(handle);
  });

  it("setActiveExtractor", () => {
    const handle = freshDb();
    db.insertExtractor(handle, extractor);
    db.insertExtractor(handle, extractor);
    db.setActiveExtractor(handle, 1);
    db.setActiveExtractor(handle, 2);
    db.setActiveExtractor(handle, 2);
    db.setActiveExtractor(handle, 99);
  });

  it("setActiveExtractor rejects a bad id", () => {
    expect(() => db.setActiveExtractor(freshDb(), -1)).toThrow("setActiveExtractor: id is a row id");
  });

  it("insertExtraction", () => {
    const handle = freshDb();
    db.insertExtractor(handle, extractor);
    db.insertExtraction(handle, extraction);
    db.insertExtraction(handle, { ...extraction, dropped_by: "critic:is_project_detail", probabilities: "{}" });
  });

  it("insertExtraction rejects a broken row", () => {
    expect(() => db.insertExtraction(freshDb(), { ...extraction, run: "" })).toThrow("insertExtraction: run is required");
  });

  it("listExtractions", () => {
    const handle = freshDb();
    db.insertExtractor(handle, extractor);
    db.insertExtraction(handle, extraction);
    db.insertExtraction(handle, { ...extraction, run: "run-2", dropped_by: "check:no_quote" });
    db.listExtractions(handle);
    db.listExtractions(handle, { extractor_id: 1, run: "run-1", exchange_id: EXCHANGE, kept: true });
    db.listExtractions(handle, { kept: false });
  });

  it("listExtractions rejects a bad extractor id", () => {
    expect(() => db.listExtractions(freshDb(), { extractor_id: 0 })).toThrow("listExtractions: extractor_id is a row id");
  });
});

describe("api.ts", () => {
  const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) =>
    app.request(path, { method: "POST", body: JSON.stringify(body) });

  it("routes", async () => {
    const app = createApp(freshDb());
    await post(app, "/extractors", extractor);
    await post(app, "/extractors", { ...extractor, why: "" });
    await post(app, "/extractions", [extraction, { ...extraction, run: "run-2" }]);
    await app.request("/extractors/1");
    await app.request("/extractors/active");
    await app.request("/extractors/9");
    await app.request("/extractors/1", { method: "PATCH", body: JSON.stringify({ active: true }) });
    await app.request("/extractors/1", { method: "PATCH", body: JSON.stringify({ why: "x" }) });
    await app.request("/extractors/active");
    await app.request("/extractions?extractor_id=1&run=run-1&kept=true");
  });
});

describe("client.ts", () => {
  it("talks to the api", async () => {
    await client.putExtractor(extractor);
    await client.fetchExtractor(1);
    await client.activateExtractor(1);
    await client.fetchExtractor("active");
    await client.putExtractions([extraction]);
    await client.fetchExtractions({ extractor_id: 1 });
  });

  it("putExtractor rejects a broken row", async () => {
    await expect(client.putExtractor({ ...extractor, config: "{" })).rejects.toThrow("putExtractor: config must be JSON");
  });

  it("fetchExtractor rejects a bad id", async () => {
    await expect(client.fetchExtractor(0)).rejects.toThrow("fetchExtractor: id is a row id or active");
  });

  it("activateExtractor rejects a bad id", async () => {
    await expect(client.activateExtractor(0)).rejects.toThrow("activateExtractor: id is a row id");
  });

  it("putExtractions rejects a broken row", async () => {
    await expect(client.putExtractions([{ ...extraction, run: "" }])).rejects.toThrow("putExtractions: run is required");
  });
});
