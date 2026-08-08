import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listHats, loadHat } from "../src/router/hats.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cockpit-hats-"));
  await writeFile(join(dir, "black-core.md"), "Be the devil's advocate.");
  await writeFile(join(dir, "white-core.md"), "Facts only.");
  await writeFile(join(dir, "README.md"), "not a hat");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("listHats", () => {
  test("only *-core.md files, sorted, stripped", async () => {
    expect(await listHats(dir)).toEqual(["black", "white"]);
  });

  test("missing dir -> empty list", async () => {
    expect(await listHats(join(dir, "nope"))).toEqual([]);
  });
});

describe("loadHat", () => {
  test("returns the overlay text", async () => {
    expect(await loadHat(dir, "black")).toBe("Be the devil's advocate.");
  });
});
