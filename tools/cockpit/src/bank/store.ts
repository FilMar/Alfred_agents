import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { emptyBank, parseBank, renderBank } from "./core.ts";
import type { Bank } from "./types.ts";

function isNoEnt(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}

/** Read <dir>/<name>.md; missing file -> emptyBank. */
export async function loadBank(dir: string, name: string): Promise<Bank> {
  try {
    return parseBank(name, await readFile(join(dir, `${name}.md`), "utf8"));
  } catch (err) {
    if (isNoEnt(err)) return emptyBank(name);
    throw err;
  }
}

/** Atomic write: tmp file + rename. */
export async function saveBank(dir: string, bank: Bank): Promise<void> {
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `.${bank.name}.md.tmp`);
  await writeFile(tmp, renderBank(bank), "utf8");
  await rename(tmp, join(dir, `${bank.name}.md`));
}

/** /delete: remove <dir>/<name>.md entirely, ledger included. Idempotent. */
export async function deleteBank(dir: string, name: string): Promise<void> {
  try {
    await unlink(join(dir, `${name}.md`));
  } catch (err) {
    if (!isNoEnt(err)) throw err;
  }
}

/** Bank names in <dir> (files *.md), sorted. */
export async function listBanks(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir))
      .filter((f) => f.endsWith(".md") && !f.startsWith("."))
      .map((f) => f.slice(0, -3))
      .sort();
  } catch (err) {
    if (isNoEnt(err)) return [];
    throw err;
  }
}
