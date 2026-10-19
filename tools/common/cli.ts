import { readFileSync } from "node:fs";

import { assert, isNonBlank } from "./contract.js";

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function outText(text: string): void {
  if (text !== "") process.stdout.write(text + "\n");
}

export function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

export function collect(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

export function readGuide(url: URL): string {
  assert(url.protocol === "file:", "readGuide: the guide is a local file");
  let result: string;
  result = readFileSync(url, "utf8").trimEnd();
  assert(isNonBlank(result), "readGuide: the guide is not empty");
  assert(result === result.trimEnd(), "readGuide: the guide ends without trailing whitespace");
  return result;
}
