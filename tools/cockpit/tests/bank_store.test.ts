import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLedger, emptyBank } from "../src/bank/core.ts";
import { deleteBank, listBanks, loadBank, saveBank } from "../src/bank/store.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cockpit-banks-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadBank", () => {
  test("missing file -> empty bank", async () => {
    expect(await loadBank(dir, "ghost")).toEqual(emptyBank("ghost"));
  });

  test("missing dir -> empty bank", async () => {
    expect(await loadBank(join(dir, "nope"), "ghost")).toEqual(emptyBank("ghost"));
  });
});

describe("saveBank + loadBank", () => {
  test("round trip", async () => {
    const b = appendLedger(emptyBank("work"), { at: "2026-08-08", text: "A fact." });
    await saveBank(dir, b);
    expect(await loadBank(dir, "work")).toEqual(b);
  });

  test("creates the dir if missing", async () => {
    const nested = join(dir, "sub");
    await saveBank(nested, emptyBank("a"));
    expect(await listBanks(nested)).toEqual(["a"]);
  });
});

describe("listBanks", () => {
  test("names sorted, no extension", async () => {
    await saveBank(dir, emptyBank("zeta"));
    await saveBank(dir, emptyBank("alpha"));
    expect(await listBanks(dir)).toEqual(["alpha", "zeta"]);
  });

  test("missing dir -> empty list", async () => {
    expect(await listBanks(join(dir, "nope"))).toEqual([]);
  });
});

describe("deleteBank", () => {
  test("removes the file", async () => {
    await saveBank(dir, emptyBank("gone"));
    await deleteBank(dir, "gone");
    expect(await listBanks(dir)).toEqual([]);
  });

  test("missing file -> no throw (idempotent)", async () => {
    await deleteBank(dir, "never-existed");
  });
});
