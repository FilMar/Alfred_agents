import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const SUFFIX = "-core.md";

/** Hat names from a hats dir: "black-core.md" -> "black". */
export async function listHats(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir))
      .filter((f) => f.endsWith(SUFFIX))
      .map((f) => f.slice(0, -SUFFIX.length))
      .sort();
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return [];
    throw err;
  }
}

/** One hat file -> system-prompt overlay text. */
export async function loadHat(dir: string, name: string): Promise<string> {
  return readFile(join(dir, `${name}${SUFFIX}`), "utf8");
}
