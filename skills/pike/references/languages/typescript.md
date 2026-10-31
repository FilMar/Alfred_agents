# TypeScript

Answers to `references/adapting-a-language.md`. Scripts run on Deno:
it runs TypeScript directly and has the linter, the type checker and
the formatter built in.

1. **Run.** `#!/usr/bin/env -S deno run --allow-read=. --allow-run=git`.
   Grant only the permissions the script needs. Packages are imported
   inline from `jsr:` or `npm:`; Deno caches them on the first run.
2. **Fail fast.** An uncaught error or rejected promise stops the
   script with exit code 1. Use top-level `await`.
3. **Flags.** `parseArgs` from `jsr:@std/cli`, with an `unknown`
   callback that exits with code 2. See the skeleton.
4. **Die.**
   ```ts
   function die(message: string, code = 1): never {
     console.error(`name: ${message}`);
     Deno.exit(code);
   }
   ```
5. **Subprocess.**
   ```ts
   const { code, stdout } = await new Deno.Command("git", {
     args: ["status", "--porcelain"],
     signal: AbortSignal.timeout(30_000),
   }).output();
   if (code !== 0) die(`git status failed with ${code}`);
   ```
6. **Files.**
   ```ts
   const tmp = await Deno.makeTempFile({ dir: dirname(target) });
   try {
     await Deno.writeTextFile(tmp, text);
     await Deno.rename(tmp, target);
   } finally {
     await Deno.remove(tmp).catch(() => {});
   }
   ```
7. **Gate.** `deno check --no-lock`, `deno lint` without the
   `no-import-prefix` rule (inline imports are the point), and
   `deno fmt --check`. Deno type checks in strict mode by default.

## Skeleton

```ts
#!/usr/bin/env -S deno run --allow-read
// desc: print the largest files under a directory
// usage: largest.ts --root <dir> [--limit <n>]
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import { walk } from "jsr:@std/fs@^1/walk";

const FILES_MAX = 100_000;

function die(message: string, code = 1): never {
  console.error(`largest: ${message}`);
  Deno.exit(code);
}

const args = parseArgs(Deno.args, {
  string: ["root", "limit"],
  boolean: ["help"],
  default: { limit: "10" },
  unknown: (flag) => die(`unknown flag: ${flag}`, 2),
});
if (args.help || !args.root) {
  die("usage: largest.ts --root <dir> [--limit <n>]", 2);
}
const limit = Number(args.limit);
if (!Number.isInteger(limit) || limit < 1) {
  die("--limit must be a whole number above 0", 2);
}

const info = await Deno.stat(args.root).catch(() => null);
if (!info?.isDirectory) die(`no such directory: ${args.root}`);

const files: [number, string][] = [];
for await (const entry of walk(args.root, { includeDirs: false })) {
  if (files.length >= FILES_MAX) {
    die(`more than ${FILES_MAX} files under ${args.root}`);
  }
  files.push([(await Deno.stat(entry.path)).size, entry.path]);
}
files.sort((a, b) => b[0] - a[0]);
for (const [size, path] of files.slice(0, limit)) {
  console.log(`${size}\t${path}`);
}
```

## Idioms that matter

- Narrow permissions: `--allow-read=.` beats `--allow-read`, and
  `--allow-all` is never used.
- `Deno.Command` with an `args` array, never a shell string.
- `node:path` or `jsr:@std/path` for paths, never string concatenation.
