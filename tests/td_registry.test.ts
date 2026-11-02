import { test, expect } from "bun:test";
import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";
import { Extractor } from "../tools/td/src/config.ts";
import { extractorJson } from "./helpers/td_stubs.ts";

const server = Bun.serve({ port: 0, fetch: createApp(db.open(":memory:")).fetch });
process.env.TL_API_URL = `http://localhost:${server.port}`;
const { Version } = await import("../tools/td/src/registry.ts");

const extractor = (): Extractor => Extractor.fromJson(extractorJson("http://localhost:11434/v1", "You are the critic."));

const NOW = "2026-10-08T10:00:00.000Z";
const LATER = "2026-10-08T10:05:00.000Z";

test("add with an invalid date throws: now is a valid date", async () => {
  await expect(Version.add(extractor(), null, "never written", new Date("nope"))).rejects.toThrow(
    "Version.add: now is a valid date",
  );
});

test("read of active returns null before any version is active", async () => {
  expect(await Version.read("active")).toBeNull();
  await Version.add(extractor(), null, "inactive so far", new Date(NOW));
  expect(await Version.read("active")).toBeNull();
});

test("read of an id that does not exist gives null", async () => {
  expect(await Version.read(4242)).toBeNull();
});

test("add with no parent", async () => {
  await Version.add(extractor(), null, "first extractor", new Date(NOW));
});

test("add with an earlier version as the parent", async () => {
  const first = await Version.add(extractor(), null, "first", new Date(NOW));
  await Version.add(extractor(), first.id(), "second, derived from the first", new Date(LATER));
});

test("read of an id that exists gives the version", async () => {
  const added = await Version.add(extractor(), null, "to find", new Date(NOW));
  const found = await Version.read(added.id());
  expect(found?.id()).toBe(added.id());
});

test("activate of an inactive version", async () => {
  const version = await Version.add(extractor(), null, "to activate", new Date(NOW));
  await version.activate();
});

test("read of active gives the version after one is active", async () => {
  const version = await Version.add(extractor(), null, "the active one", new Date(NOW));
  await version.activate();
  const active = await Version.read("active");
  expect(active?.id()).toBe(version.id());
});

test("activate of a version that is already active", async () => {
  const version = await Version.add(extractor(), null, "already active", new Date(NOW));
  await version.activate();
  await version.activate();
});

test("read of active gives the other version after a second activate on another version", async () => {
  const first = await Version.add(extractor(), null, "first", new Date(NOW));
  await first.activate();
  const second = await Version.add(extractor(), null, "second", new Date(LATER));
  await second.activate();
  const active = await Version.read("active");
  expect(active?.id()).toBe(second.id());
});