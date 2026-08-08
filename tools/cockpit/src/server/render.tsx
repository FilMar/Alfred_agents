/** Pure HTML fragments: data in, string out. hono/jsx escapes by default —
 *  agent text can never inject markup into the page. */
import type { Bank } from "../bank/types.ts";
import type { AgentReply, Widget } from "../turn/types.ts";
import type { Session } from "./state.ts";

declare module "hono/jsx" {
  namespace JSX {
    interface HTMLAttributes {
      "hx-post"?: string;
      "hx-get"?: string;
      "hx-target"?: string;
      "hx-swap"?: string;
      "hx-vals"?: string;
      "hx-on--after-request"?: string;
    }
  }
}

const FEED = { "hx-target": "#feed", "hx-swap": "beforeend" } as const;
const vals = (obj: Record<string, string>) => JSON.stringify(obj);

/** Client-side niceties: terminal-style input history (ArrowUp/ArrowDown,
 *  persisted in localStorage) and autoscroll of the feed on new fragments.
 *  Static constant — nothing user-provided lands here. */
const PAGE_SCRIPT = `
const form = document.querySelector("form[hx-post='/turn']");
const input = form.querySelector("input[name=input]");
const feed = document.getElementById("feed");
const KEY = "cockpit-history";
let hist = JSON.parse(localStorage.getItem(KEY) || "[]");
let idx = hist.length, draft = "";
form.addEventListener("htmx:beforeRequest", () => {
  const v = input.value.trim();
  if (v && hist[hist.length - 1] !== v) {
    hist.push(v);
    if (hist.length > 100) hist.shift();
    localStorage.setItem(KEY, JSON.stringify(hist));
  }
  idx = hist.length; draft = "";
});
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" && idx > 0) {
    if (idx === hist.length) draft = input.value;
    input.value = hist[--idx];
    e.preventDefault();
  } else if (e.key === "ArrowDown" && idx < hist.length) {
    idx++;
    input.value = idx === hist.length ? draft : hist[idx];
    e.preventDefault();
  }
});
document.body.addEventListener("htmx:afterSwap", () => {
  feed.scrollTop = feed.scrollHeight;
});
`;

/** Full page shell: HTMX + Tailwind from CDN, feed, input form. */
export function renderPage(session: Session, hats: string[]): string {
  return (
    "<!DOCTYPE html>" +
    String(
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>cockpit</title>
          <script src="https://unpkg.com/htmx.org@1.9.12"></script>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-zinc-900 text-zinc-100 h-dvh flex flex-col">
          <header class="px-4 py-2 border-b border-zinc-700 text-sm flex flex-wrap gap-x-4 gap-y-1">
            <span class="font-bold">cockpit</span>
            <span>
              bank: <b>{session.bank}</b>
            </span>
            {session.hat && <span>hat: {session.hat}</span>}
            <span class="text-zinc-500">hats: {hats.map((h) => `:${h}`).join(" ")}</span>
          </header>
          <main id="feed" class="flex-1 overflow-y-auto p-4 space-y-3"></main>
          <form
            hx-post="/turn"
            {...FEED}
            hx-on--after-request="this.reset()"
            class="p-4 border-t border-zinc-700"
          >
            <input
              name="input"
              autofocus
              autocomplete="off"
              placeholder="message, or :command"
              class="w-full bg-zinc-800 rounded px-3 py-2 outline-none text-base"
            />
          </form>
          <script dangerouslySetInnerHTML={{ __html: PAGE_SCRIPT }}></script>
        </body>
      </html>,
    )
  );
}

function WidgetView({ w }: { w: Widget }) {
  switch (w.type) {
    case "table":
      return (
        <table class="text-sm border-collapse my-2">
          <thead>
            <tr>
              {w.columns.map((c) => (
                <th class="border border-zinc-600 px-2 py-1 text-left">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {w.rows.map((row) => (
              <tr>
                {row.map((cell) => (
                  <td class="border border-zinc-700 px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "action":
      return (
        <button
          hx-post="/turn"
          {...FEED}
          hx-vals={vals({ input: w.command })}
          class="bg-zinc-700 hover:bg-zinc-600 rounded px-3 py-1 text-sm my-1"
        >
          {w.label}
        </button>
      );
    case "chart":
      // Rendered via atlante in a later phase — the spec is shown raw for now.
      return <pre class="text-xs text-zinc-400 my-2">{JSON.stringify(w.spec, null, 2)}</pre>;
  }
}

/** One completed turn: user text + agent reply + widgets + ledger proposals. */
export function renderTurn(userText: string, reply: AgentReply): string {
  return String(
    <div class="space-y-2">
      <div class="text-zinc-400 whitespace-pre-wrap">&gt; {userText}</div>
      <div class="whitespace-pre-wrap">{reply.text}</div>
      {reply.widgets.map((w) => (
        <WidgetView w={w} />
      ))}
      {reply.ledgerProposals.map((p) => (
        <div class="flex items-center gap-2 text-sm bg-zinc-800 rounded px-3 py-2">
          <span class="text-zinc-300">ledger? {p}</span>
          <button
            hx-post="/ledger/confirm"
            {...FEED}
            hx-vals={vals({ text: p })}
            class="bg-emerald-800 hover:bg-emerald-700 rounded px-2 py-0.5"
          >
            confirm
          </button>
        </div>
      ))}
    </div>,
  );
}

/** Error notice (unknown command, missing bank, ...). */
export function renderError(msg: string): string {
  return String(<div class="text-red-400 text-sm whitespace-pre-wrap">{msg}</div>);
}

/** Neutral notice (hat armed, bank cleared, cwd shown, ...). */
export function renderInfo(msg: string): string {
  return String(<div class="text-zinc-400 text-sm whitespace-pre-wrap">{msg}</div>);
}

/** :mem with no name — all banks, active one marked. */
export function renderBankList(banks: string[], active: string): string {
  return String(
    <ul class="text-sm space-y-1">
      {banks.map((b) => (
        <li>{b === active ? `${b} (active)` : b}</li>
      ))}
    </ul>,
  );
}

/** :safe — current allowlist with remove buttons and an add form. */
export function renderSafeMenu(bank: Bank): string {
  const entry = (mode: "read" | "write", path: string) => (
    <li class="flex items-center gap-2">
      <span>
        {mode}: {path}
      </span>
      <button
        hx-post="/safe/remove"
        {...FEED}
        hx-vals={vals({ mode, path })}
        class="text-red-400 text-xs"
      >
        remove
      </button>
    </li>
  );
  return String(
    <div class="text-sm space-y-2">
      <div class="font-bold">safe — {bank.name}</div>
      <ul class="space-y-1">
        {bank.safe.read.map((p) => entry("read", p))}
        {bank.safe.write.map((p) => entry("write", p))}
        {!bank.safe.read.length && !bank.safe.write.length && <li>(empty — sandbox denies all)</li>}
      </ul>
      <form hx-post="/safe/add" {...FEED} class="flex gap-2">
        <select name="mode" class="bg-zinc-800 rounded px-1">
          <option value="read">read</option>
          <option value="write">write</option>
        </select>
        <input name="path" placeholder="/path" class="bg-zinc-800 rounded px-2 flex-1" />
        <button class="bg-zinc-700 rounded px-2">add</button>
      </form>
    </div>,
  );
}

/** :delete — confirmation fragment; the actual delete happens on /delete/confirm. */
export function renderDeleteConfirm(name: string): string {
  return String(
    <div class="text-sm flex items-center gap-3">
      <span>
        delete bank <b>{name}</b>, ledger included?
      </span>
      <button
        hx-post="/delete/confirm"
        {...FEED}
        hx-vals={vals({ name })}
        class="bg-red-800 hover:bg-red-700 rounded px-2 py-0.5"
      >
        delete
      </button>
    </div>,
  );
}

/** :bash — command echo + captured output + exit code. */
export function renderBashOutput(cmd: string, out: string, code: number): string {
  return String(
    <pre class="text-sm bg-black rounded p-3 overflow-x-auto whitespace-pre-wrap">
      $ {cmd}
      {"\n"}
      {out}
      {code !== 0 ? `\n(exit ${code})` : ""}
    </pre>,
  );
}

/** :edit-memory — the raw bank file in a textarea posting to /memory. */
export function renderMemoryPanel(name: string, raw: string): string {
  return String(
    <form hx-post="/memory" {...FEED} class="space-y-2">
      <div class="text-sm font-bold">memory — {name}</div>
      <textarea name="raw" rows={16} class="w-full bg-zinc-800 rounded p-2 font-mono text-xs">
        {raw}
      </textarea>
      <button class="bg-zinc-700 rounded px-3 py-1 text-sm">save</button>
    </form>,
  );
}
