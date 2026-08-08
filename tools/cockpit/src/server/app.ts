import { Hono, type Context } from "hono";
import { appendLedger, parseBank, renderBank as bankToMarkdown } from "../bank/core.ts";
import { deleteBank, loadBank, saveBank } from "../bank/store.ts";
import { listHats } from "../router/hats.ts";
import type { TurnDeps } from "../turn/pipeline.ts";
import { handleInput } from "./handlers.ts";
import { renderInfo, renderMemoryPanel, renderPage, renderSafeMenu } from "./render.tsx";
import { defaultSession, type CockpitConfig } from "./state.ts";

const today = () => new Date().toISOString().slice(0, 10);

/** Build the Hono app. Deps injected: tests run with a fake agent, no socket needed.
 *  Routes are shells — logic lives in handlers.ts. */
export function buildApp(cfg: CockpitConfig, deps: TurnDeps): Hono {
  const app = new Hono();
  let session = defaultSession();
  const hats = listHats(cfg.hatsDir); // resolved once, hats change only on restart

  const field = async (c: { req: { parseBody: () => Promise<Record<string, unknown>> } }, name: string) => {
    const v = (await c.req.parseBody())[name];
    return typeof v === "string" && v !== "" ? v : null;
  };

  app.get("/", async (c) => c.html(renderPage(session, await hats)));

  app.post("/turn", async (c) => {
    const input = await field(c, "input");
    if (input === null) return c.text("input is required", 400);
    const r = await handleInput(input, session, cfg, deps, await hats);
    session = r.session;
    r.bookkeeping?.catch((err) => console.error("bookkeeping failed:", err));
    return c.html(r.html);
  });

  app.post("/ledger/confirm", async (c) => {
    const text = await field(c, "text");
    if (text === null) return c.text("text is required", 400);
    const bank = await loadBank(cfg.banksDir, session.bank);
    await saveBank(cfg.banksDir, appendLedger(bank, { at: today(), text }));
    return c.html(renderInfo(`ledger: added "${text}"`));
  });

  const safeEdit = (add: boolean) => async (c: Context) => {
    const body = await c.req.parseBody();
    const mode = body["mode"];
    const path = body["path"];
    if ((mode !== "read" && mode !== "write") || typeof path !== "string" || path === "")
      return c.text("mode (read|write) and path are required", 400);
    const bank = await loadBank(cfg.banksDir, session.bank);
    const paths = add
      ? [...new Set([...bank.safe[mode], path])]
      : bank.safe[mode].filter((p) => p !== path);
    const updated = { ...bank, safe: { ...bank.safe, [mode]: paths } };
    await saveBank(cfg.banksDir, updated);
    return c.html(renderSafeMenu(updated));
  };
  app.post("/safe/add", safeEdit(true));
  app.post("/safe/remove", safeEdit(false));

  app.post("/delete/confirm", async (c) => {
    const name = await field(c, "name");
    if (name === null) return c.text("name is required", 400);
    await deleteBank(cfg.banksDir, name);
    if (session.bank === name) session = { ...session, bank: "main" };
    return c.html(renderInfo(`bank deleted: ${name}`));
  });

  app.get("/memory", async (c) => {
    const bank = await loadBank(cfg.banksDir, session.bank);
    return c.html(renderMemoryPanel(session.bank, bankToMarkdown(bank)));
  });

  app.post("/memory", async (c) => {
    const raw = await field(c, "raw");
    if (raw === null) return c.text("raw is required", 400);
    await saveBank(cfg.banksDir, parseBank(session.bank, raw));
    return c.html(renderInfo(`memory saved: ${session.bank}`));
  });

  return app;
}
