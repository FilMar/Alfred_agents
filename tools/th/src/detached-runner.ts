#!/usr/bin/env bun
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
  process.stderr.write(`detached-runner error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
