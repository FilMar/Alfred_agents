import { stat } from "node:fs/promises";
import { clearBank, emptyBank, renderBank as bankToMarkdown } from "../bank/core.ts";
import { listBanks, loadBank, saveBank } from "../bank/store.ts";
import { parseCommand } from "../router/core.ts";
import { loadHat } from "../router/hats.ts";
import type { Command } from "../router/types.ts";
import { afterTurn, runTurn, type TurnDeps } from "../turn/pipeline.ts";
import {
  renderBankList,
  renderBashOutput,
  renderDeleteConfirm,
  renderError,
  renderInfo,
  renderMemoryPanel,
  renderSafeMenu,
  renderTurn,
} from "./render.tsx";
import type { CockpitConfig, Session } from "./state.ts";

/** What a handler gives back to the UI layer. */
export type HandlerResult = {
  html: string; // fragment for the feed
  session: Session; // possibly updated (bank switch, hat armed/consumed)
  bookkeeping?: Promise<void>; // async tail push + re-condense + save; tests await it
};

/** Full dispatch: input -> parseCommand -> the right handler.
 *  One entry point, so the app layer stays a shell. */
export async function handleInput(
  input: string,
  session: Session,
  cfg: CockpitConfig,
  deps: TurnDeps,
  knownHats: string[],
): Promise<HandlerResult> {
  const cmd = parseCommand(input, knownHats);
  const keep = (html: string): HandlerResult => ({ html, session });

  switch (cmd.kind) {
    case "turn":
      return handleTurn(cmd, session, cfg, deps);
    case "hat":
      return { html: renderInfo(`hat armed for next turn: ${cmd.name}`), session: { ...session, hat: cmd.name } };
    case "mem": {
      const banks = [...new Set([...(await listBanks(cfg.banksDir)), session.bank])].sort();
      if (cmd.name === undefined) return keep(renderBankList(banks, session.bank));
      if (!banks.includes(cmd.name))
        return keep(renderError(`no bank "${cmd.name}" — create it with :new ${cmd.name}`));
      return { html: renderInfo(`bank: ${cmd.name}`), session: { ...session, bank: cmd.name } };
    }
    case "new": {
      const banks = await listBanks(cfg.banksDir);
      if (banks.includes(cmd.name)) return keep(renderError(`bank "${cmd.name}" already exists`));
      await saveBank(cfg.banksDir, emptyBank(cmd.name));
      return { html: renderInfo(`bank created: ${cmd.name}`), session: { ...session, bank: cmd.name } };
    }
    case "clear": {
      const bank = await loadBank(cfg.banksDir, session.bank);
      await saveBank(cfg.banksDir, clearBank(bank));
      return keep(renderInfo(`bank cleared: ${session.bank} (ledger kept)`));
    }
    case "cd": {
      const bank = await loadBank(cfg.banksDir, session.bank);
      if (cmd.path === undefined) return keep(renderInfo(`cwd: ${bank.cwd ?? "(default)"}`));
      const ok = await stat(cmd.path).then((s) => s.isDirectory()).catch(() => false);
      if (!ok) return keep(renderError(`not a directory: ${cmd.path}`));
      await saveBank(cfg.banksDir, { ...bank, cwd: cmd.path });
      return keep(renderInfo(`cwd: ${cmd.path}`));
    }
    case "safe":
      return keep(renderSafeMenu(await loadBank(cfg.banksDir, session.bank)));
    case "delete":
      return keep(renderDeleteConfirm(cmd.name ?? session.bank));
    case "bash": {
      const bank = await loadBank(cfg.banksDir, session.bank);
      const r = await runUserBash(cmd.cmd, bank.cwd);
      return keep(renderBashOutput(cmd.cmd, r.out, r.code));
    }
    case "edit-memory": {
      const bank = await loadBank(cfg.banksDir, session.bank);
      return keep(renderMemoryPanel(session.bank, bankToMarkdown(bank)));
    }
    case "detach":
      return keep(renderInfo(":detach is not implemented yet (v1)"));
    case "unknown":
      return keep(renderError(`unknown command: ${cmd.raw}`));
  }
}

async function handleTurn(
  cmd: Command & { kind: "turn" },
  session: Session,
  cfg: CockpitConfig,
  deps: TurnDeps,
): Promise<HandlerResult> {
  const bank = await loadBank(cfg.banksDir, session.bank);
  const overlay = session.hat ? await loadHat(cfg.hatsDir, session.hat) : null;
  const reply = await runTurn(bank, cmd, overlay, deps);
  const ex = { at: new Date().toISOString(), user: cmd.text, agent: reply.text };
  const bookkeeping = afterTurn(bank, ex, deps).then((b) => saveBank(cfg.banksDir, b));
  return { html: renderTurn(cmd.text, reply), session: { ...session, hat: null }, bookkeeping };
}

/** :bash — run the user's command on the server, bank cwd, capture out+err.
 *  User privilege by design (foundation decision 7): no sandbox, no audit. */
export async function runUserBash(
  cmd: string,
  cwd: string | null,
): Promise<{ out: string; code: number }> {
  const proc = Bun.spawn(["sh", "-c", cmd], {
    cwd: cwd ?? undefined,
    stdout: "pipe",
    stderr: "pipe",
  });
  const timer = setTimeout(() => proc.kill(), 30_000);
  try {
    const [out, err] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const code = await proc.exited;
    return { out: out + err, code };
  } finally {
    clearTimeout(timer);
  }
}
