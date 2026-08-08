import { TAIL_SIZE, type Bank, type Exchange, type LedgerEntry } from "./types.ts";

/** New bank: empty summary, ledger, tail, safe. */
export function emptyBank(name: string): Bank {
  return {
    name,
    summary: "",
    ledger: [],
    tail: [],
    safe: { read: [], write: [] },
    cwd: null,
  };
}

const SECTIONS = ["summary", "ledger", "tail", "safe", "cwd"] as const;
type Section = (typeof SECTIONS)[number];

/** Markdown -> Bank. Lenient: missing sections fall back to defaults. */
export function parseBank(name: string, raw: string): Bank {
  const bank = emptyBank(name);
  let section: Section | null = null;
  let summaryLines: string[] = [];
  let cwdLines: string[] = [];
  let exchange: { at: string; user: string[]; agent: string[] } | null = null;
  let part: "user" | "agent" | null = null;

  const flushExchange = () => {
    if (exchange) {
      bank.tail.push({
        at: exchange.at,
        user: exchange.user.join("\n").trim(),
        agent: exchange.agent.join("\n").trim(),
      });
    }
    exchange = null;
    part = null;
  };

  for (const line of raw.split("\n")) {
    const heading = /^## (\w+)$/.exec(line);
    if (heading && SECTIONS.includes(heading[1]!.toLowerCase() as Section)) {
      flushExchange();
      section = heading[1]!.toLowerCase() as Section;
      continue;
    }
    switch (section) {
      case "summary":
        summaryLines.push(line);
        break;
      case "ledger": {
        const m = /^- \[(.+?)\] (.*)$/.exec(line);
        if (m) bank.ledger.push({ at: m[1]!, text: m[2]! });
        break;
      }
      case "tail": {
        const at = /^### (.+)$/.exec(line);
        if (at) {
          flushExchange();
          exchange = { at: at[1]!, user: [], agent: [] };
        } else if (line === "**User:**") {
          part = "user";
        } else if (line === "**Agent:**") {
          part = "agent";
        } else if (exchange && part) {
          exchange[part].push(line);
        }
        break;
      }
      case "safe": {
        const m = /^- (read|write): (.*)$/.exec(line);
        if (m) bank.safe[m[1] as "read" | "write"].push(m[2]!);
        break;
      }
      case "cwd":
        cwdLines.push(line);
        break;
      case null:
        break;
    }
  }
  flushExchange();
  bank.summary = summaryLines.join("\n").trim();
  const cwd = cwdLines.join("\n").trim();
  bank.cwd = cwd === "" ? null : cwd;
  return bank;
}

/** Bank -> markdown. Strict: render(parse(x)) is stable. */
export function renderBank(bank: Bank): string {
  const out: string[] = [`# bank: ${bank.name}`, ""];
  out.push("## Summary", "");
  if (bank.summary) out.push(bank.summary, "");
  out.push("## Ledger", "");
  for (const e of bank.ledger) out.push(`- [${e.at}] ${e.text}`);
  if (bank.ledger.length) out.push("");
  out.push("## Tail", "");
  for (const ex of bank.tail) {
    out.push(`### ${ex.at}`, "", "**User:**", "", ex.user, "", "**Agent:**", "", ex.agent, "");
  }
  out.push("## Safe", "");
  for (const p of bank.safe.read) out.push(`- read: ${p}`);
  for (const p of bank.safe.write) out.push(`- write: ${p}`);
  if (bank.safe.read.length || bank.safe.write.length) out.push("");
  if (bank.cwd !== null) out.push("## Cwd", "", bank.cwd, "");
  return out.join("\n");
}

/** Push an exchange, keep the last TAIL_SIZE. Returns a new Bank. */
export function pushExchange(bank: Bank, ex: Exchange): Bank {
  return { ...bank, tail: [...bank.tail, ex].slice(-TAIL_SIZE) };
}

/** Append one ledger entry. Returns a new Bank. */
export function appendLedger(bank: Bank, entry: LedgerEntry): Bank {
  return { ...bank, ledger: [...bank.ledger, entry] };
}

/** Replace the summary (after async re-condensation). Returns a new Bank. */
export function setSummary(bank: Bank, summary: string): Bank {
  return { ...bank, summary };
}

/** /clear: wipe summary and tail, keep ledger and safe. Returns a new Bank. */
export function clearBank(bank: Bank): Bank {
  return { ...bank, summary: "", tail: [] };
}
