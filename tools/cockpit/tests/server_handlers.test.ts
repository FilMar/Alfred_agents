import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLedger, emptyBank, setSummary } from "../src/bank/core.ts";
import { loadBank, saveBank } from "../src/bank/store.ts";
import { handleInput, runUserBash } from "../src/server/handlers.ts";
import type { CockpitConfig, Session } from "../src/server/state.ts";
import type { TurnDeps } from "../src/turn/pipeline.ts";
import type { AgentPrompt, AgentReply } from "../src/turn/types.ts";

let root: string;
let cfg: CockpitConfig;
const HATS = ["black"];

const fresh = (): Session => ({ bank: "main", hat: null });

function fakeDeps(): TurnDeps & { prompts: AgentPrompt[] } {
  const prompts: AgentPrompt[] = [];
  return {
    prompts,
    retrieve: async () => ({ tb: [], ti: [] }),
    runAgent: async (prompt): Promise<AgentReply> => {
      prompts.push(prompt);
      return { text: "agent says hi", widgets: [], ledgerProposals: [] };
    },
    condense: async (summary, ex) => `${summary}|${ex.user}`.replace(/^\|/, ""),
  };
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "cockpit-srv-"));
  cfg = { banksDir: join(root, "banks"), hatsDir: join(root, "hats"), port: 0 };
  await mkdir(cfg.hatsDir, { recursive: true });
  await writeFile(join(cfg.hatsDir, "black-core.md"), "Be the devil's advocate.");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const run = (input: string, session: Session = fresh(), deps: TurnDeps = fakeDeps()) =>
  handleInput(input, session, cfg, deps, HATS);

describe("turn", () => {
  test("replies now, bookkeeping persists tail and summary", async () => {
    const r = await run("hello there");
    expect(r.html).toContain("agent says hi");
    await r.bookkeeping;
    const bank = await loadBank(cfg.banksDir, "main");
    expect(bank.tail).toHaveLength(1);
    expect(bank.tail[0]!.user).toBe("hello there");
    expect(bank.tail[0]!.agent).toBe("agent says hi");
    expect(bank.summary).toBe("hello there");
  });

  test("armed hat lands in the system prompt and is consumed", async () => {
    const deps = fakeDeps();
    const r = await run("question", { bank: "main", hat: "black" }, deps);
    expect(deps.prompts[0]!.system).toContain("Be the devil's advocate.");
    expect(r.session.hat).toBeNull();
    await r.bookkeeping;
  });
});

describe(":black", () => {
  test("arms the hat for the next turn", async () => {
    const r = await run(":black");
    expect(r.session.hat).toBe("black");
  });
});

describe(":mem", () => {
  test("no name: lists banks with the active one", async () => {
    await saveBank(cfg.banksDir, emptyBank("main"));
    await saveBank(cfg.banksDir, emptyBank("work"));
    const r = await run(":mem");
    expect(r.html).toContain("work");
    expect(r.session.bank).toBe("main");
  });

  test("switches to an existing bank", async () => {
    await saveBank(cfg.banksDir, emptyBank("work"));
    const r = await run(":mem work");
    expect(r.session.bank).toBe("work");
  });

  test("missing bank: error, no switch", async () => {
    const r = await run(":mem ghost");
    expect(r.session.bank).toBe("main");
    expect(r.html).toContain(":new");
  });
});

describe(":new", () => {
  test("creates the bank and switches", async () => {
    const r = await run(":new scratch");
    expect(r.session.bank).toBe("scratch");
    expect(await loadBank(cfg.banksDir, "scratch")).toEqual(emptyBank("scratch"));
  });

  test("existing name: error, no switch", async () => {
    await saveBank(cfg.banksDir, emptyBank("scratch"));
    const r = await run(":new scratch");
    expect(r.session.bank).toBe("main");
  });
});

describe(":clear", () => {
  test("wipes summary and tail, keeps ledger", async () => {
    let b = setSummary(emptyBank("main"), "old summary");
    b = appendLedger(b, { at: "2026-08-08", text: "kept" });
    await saveBank(cfg.banksDir, b);
    await run(":clear");
    const after = await loadBank(cfg.banksDir, "main");
    expect(after.summary).toBe("");
    expect(after.ledger).toHaveLength(1);
  });
});

describe(":cd", () => {
  test("sets and persists the bank cwd", async () => {
    await run(`:cd ${root}`);
    expect((await loadBank(cfg.banksDir, "main")).cwd).toBe(root);
  });

  test("nonexistent dir: error, cwd unchanged", async () => {
    const r = await run(":cd /no/such/dir");
    expect(r.html).toContain("/no/such/dir");
    expect((await loadBank(cfg.banksDir, "main")).cwd).toBeNull();
  });

  test("no path: shows the current one", async () => {
    const r = await run(":cd");
    expect(r.html.length).toBeGreaterThan(0);
  });
});

describe(":safe", () => {
  test("shows the current allowlist", async () => {
    const b = { ...emptyBank("main"), safe: { read: ["/data"], write: ["essays/"] } };
    await saveBank(cfg.banksDir, b);
    const r = await run(":safe");
    expect(r.html).toContain("/data");
    expect(r.html).toContain("essays/");
  });
});

describe(":delete", () => {
  test("asks for confirmation, does not delete yet", async () => {
    await saveBank(cfg.banksDir, emptyBank("main"));
    const r = await run(":delete");
    expect(r.html).toContain('hx-post="/delete/confirm"');
    expect(await loadBank(cfg.banksDir, "main")).toEqual(emptyBank("main"));
  });
});

describe(":bash", () => {
  test("runs with the bank cwd and shows output", async () => {
    await saveBank(cfg.banksDir, { ...emptyBank("main"), cwd: root });
    const r = await run(":bash pwd");
    expect(r.html).toContain(root);
  });
});

describe("errors and stubs", () => {
  test("unknown command never reaches the agent", async () => {
    const deps = fakeDeps();
    const r = await run(":men work", fresh(), deps);
    expect(r.html).toContain(":men work");
    expect(deps.prompts).toHaveLength(0);
  });

  test(":detach is a declared stub in v1", async () => {
    const r = await run(":detach long job");
    expect(r.html.toLowerCase()).toContain("not");
  });
});

describe("runUserBash", () => {
  test("captures output and exit code", async () => {
    expect(await runUserBash("echo hi", null)).toEqual({ out: "hi\n", code: 0 });
    expect((await runUserBash("false", null)).code).toBe(1);
  });

  test("stderr is captured too", async () => {
    const r = await runUserBash("echo oops >&2", null);
    expect(r.out).toContain("oops");
  });
});
