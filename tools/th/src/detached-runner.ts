#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { runMember, type RunMemberOpts } from "./runner.js";

type JobPaths = { out: string; log: string; status: string };

const [memberName, task, pathsJson, optsJson] = process.argv.slice(2);

if (!memberName || !task || !pathsJson || !optsJson) {
  process.stderr.write("detached-runner: argomenti mancanti\n");
  process.exit(1);
}

const paths: JobPaths = JSON.parse(pathsJson);
const opts: RunMemberOpts = JSON.parse(optsJson);

await runMember(memberName, task, paths, opts).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  // Ensure the status file reaches a terminal state even when the job dies
  // before executeSession (e.g. buildSession throws on an invalid member or
  // model). Otherwise it stays "running" forever and `th wait` can never tell
  // a dead job from a live one.
  try { writeFileSync(paths.status, `error: ${msg}`); } catch { /* status path unwritable — nothing we can do */ }
  process.stderr.write(`detached-runner error: ${msg}\n`);
  process.exit(1);
});
