// spike: pi-ai-transport
// question: Does pi-ai complete() give the same critic F answers as Ollama /api/chat with glm-5.3-flash?
//   Same 20 frozen candidates of the critic bench, same prompt as run F_guard. Three transports:
//   native (/api/chat, think low, format json), piai_off (the model as models.json has it, no reasoning),
//   piai_low (reasoning: true, reasoning "low"). Baseline: native against the stored F_guard run, which is
//   how much glm moves on its own.
//   Answer shape: per transport, valid JSON, mean |p - stored|, drop decisions that differ, tokens out, seconds.
// opened: 2026-10-05   timebox: 2h
// run: bun spikes/2026-10-05-pi-ai-transport/main.ts
// status: answered
// answer: 20 candidates, glm-5.3-flash, |dp| and drop!= against the stored F_guard run.
//   transport                   valid  retry  |dp|   drop!=  out tokens  seconds
//   native /api/chat, think low   20     0    0.061    4        177       1.9
//   pi-ai, no reasoning           20     0    0.065    4       2713      15.2
//   pi-ai, reasoning "low"        20     0    0.061    5        194       1.9
//   native against pi-ai low: |dp| 0.053. The two are the same within glm's own noise.
//   Two traps. (1) With reasoning: true, pi-ai sends the system prompt as role "developer". Ollama drops
//   it, the model never sees the task, and 0 of 20 answers were valid JSON (results_developer_role.jsonl).
//   compat.supportsDeveloperRole = false fixes it. (2) Without reasoning, pi-ai sends no reasoning_effort,
//   and glm thinks at its default: 15 times the output tokens and 8 times the time, same answers.
//   Side finding: native run again flips 4 of 20 drop decisions against the stored run. One critic call
//   is noisy near the thresholds.
// verdict: pi-ai works as the transport, with reasoning: true, reasoning "low" and supportsDeveloperRole
//   false for Ollama. The model must state both in its config.
//
// Rules are off in here: no contracts, no tests, no abstraction.
// Delete this folder when it stops compiling. Never promote this code.

// --- parameters: edit these, then run again ---
const SAMPLE = 20                                  // candidates, spread over the bench
const MODEL = "glm-5.3-flash:cloud"
const OLLAMA = "http://localhost:11434"
const TEMPERATURE = 0.1
const THRESHOLDS: Record<string, number> = {      // drop when p >= t; rule drops when p < t
  is_textbook_definition: 0.6, is_agent_unconfirmed_claim: 0.4, is_project_detail: 0.4,
  is_about_the_agent: 0.4, is_user_rejection: 0.4,
}
const DEVELOPER_ROLE = false                     // pi-ai sends the system prompt as "developer" when true; Ollama drops it
const EP_CHARS = 2500, IN_CHARS = 6000, OUT_CHARS = 8000  // characters, as in the Python spikes
// --- end parameters ---

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { completeSimple } from "@earendil-works/pi-ai"
import type { Model } from "@earendil-works/pi-ai"
import * as tl from "../../tools/tl/src/client.js"

const HERE = import.meta.dir
const BENCH = join(HERE, "../2026-10-01-critic-bench")

const GUARD = `# The Guard

You are the last guard of a knowledge base against chaos. If nothing passes you, nothing evolves: the
base stays frozen and useless. If too much passes, everything changes at once and the base turns into
noise: pure chaos. Your job is the balance. Let in what will still be worth reading in a year, in a
different project. Stop the rest. You are not a pessimist and not an optimist: you are calibrated.`

const NOTE_QS: Record<string, string> = {
  is_textbook_definition: "a good manual or Wikipedia page on the topic already says this. Test: would someone who knows the topic learn nothing new? Yes if the note only defines or describes a known term, tool, method or feature. No if it adds a limit, a failure, a trade-off or a surprise seen in practice. Yes: \"La cosine similarity misura l'angolo tra due vettori.\" No: \"Con soglia cosine 0.95, due note che dicono il contrario sembrano duplicate.\"",
  is_agent_unconfirmed_claim: "it rests on something the agent said that the user never confirmed and no result showed, or that was denied later in the episode or the session.",
  is_project_detail: "it holds only for this project: its data, its states, its choices.",
  is_record_of_what_was_done: "it is a log or a status of this work. Test: remove the past tense and every fact of this session (what was built, changed or chosen, which file, which number). Yes if no idea usable elsewhere is left. No if a reusable idea is left. Yes: \"Abbiamo spostato la validazione JSON dal format al prompt e ora funziona.\" No: \"Se un modello ignora lo schema in format, si chiede il JSON nel prompt e lo si valida nel codice.\"",
  is_about_the_agent: "it describes the agent itself: its mistakes, its habits, or how it uses its own tools (polling, notifications, chat, commits).",
}
const RULE_QS: Record<string, string> = {
  is_user_rejection: "the quote shows the user rejecting what the agent did or proposed. A plain request or instruction (\"fai X\", \"direi di fare Y\") is not a rejection.",
}

function system(kind: string): string {
  const qs = kind === "note" ? NOTE_QS : RULE_QS
  const lines = Object.entries(qs).map(([k, v]) => `- ${k}: ${v}`).join("\n")
  const shape = Object.keys(qs).map((k) => `"${k}": 0.0`).join(", ")
  return GUARD + `

## Task
You get a piece of work (a session map, an episode, the target exchange) and ONE candidate ${kind} extracted
from the target exchange. For each question give the probability, from 0.0 to 1.0, that the answer is
yes. Say what is most likely, not only what is certain.

${lines}

\`why\`: one short sentence, Italian.
Answer only with this JSON: {${shape}, "why": ""}`
}

const NOISE = /^\s*(s[iì]|ok+|perfetto|procedi|committa|commit|vai|fatto)[\s,.!]*(procedi|committa|commit)?[\s.!]*$/i
type Ex = { id: string; input: string; output: string }
const liveCache = new Map<string, Ex[]>()

async function live(session: string): Promise<Ex[]> {
  if (liveCache.has(session)) return liveCache.get(session)!
  const rows = (await tl.fetchExchanges({ session, distilled: false, limit: 5000 })).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const out: Ex[] = []
  for (const r of rows) {
    const c = await tl.fetchContents(r.id, false)
    const ex = { id: r.id, input: c.input ?? "", output: c.output ?? "" }
    if (ex.input.startsWith("<task-notification")) continue
    if (NOISE.test(ex.input)) continue
    if (ex.output.includes("API Error:") && ex.output.length < 2000) continue
    out.push(ex)
  }
  liveCache.set(session, out)
  return out
}

async function context(c: any): Promise<string> {
  const lv = await live(c.session)
  const [f, t] = c.episode
  const part = lv.slice(f, t + 1)
  const smap = "## The whole session, episode by episode (later episodes can deny claims made earlier)\n" +
    c.episodes.map((e: any) => `- [${e.from}-${e.to}] ${e.summary}`).join("\n")
  const ep = part.map((ex, k) => `[${k}]${ex.id === c.exchange ? " <<< TARGET" : ""} USER: ${ex.input.slice(0, EP_CHARS)}\nAGENT: ${ex.output.slice(0, EP_CHARS)}`).join("\n\n")
  const tgt = part.find((ex) => ex.id === c.exchange)!
  const tgtText = `USER: ${tgt.input.slice(0, IN_CHARS)}\n\nAGENT: ${tgt.output.slice(0, OUT_CHARS)}`
  const cand = `Candidate ${c.type}: ${c.text}` + (c.why ? `\nPerché: ${c.why}` : "") + `\nQuote: ${c.quote}`
  return `${smap}\n\n## The episode\n${ep}\n\n## The target exchange\n${tgtText}\n\n## The candidate\n${cand}`
}

function parse(text: string, kind: string): Record<string, number> | string {
  const qs = Object.keys(kind === "note" ? NOTE_QS : RULE_QS)
  let d: any
  try { d = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) } catch (e) { return `not valid JSON: ${e}` }
  const miss = qs.filter((q) => typeof d[q] !== "number" || d[q] < 0 || d[q] > 1)
  return miss.length ? `need a number from 0.0 to 1.0 for ${miss}` : Object.fromEntries(qs.map((q) => [q, d[q]]))
}

type Reply = { text: string; out: number; thinking: number }
type Msg = { role: "user" | "assistant"; content: string }

async function native(sys: string, msgs: Msg[]): Promise<Reply> {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, think: "low", format: "json", options: { temperature: TEMPERATURE },
      messages: [{ role: "system", content: sys }, ...msgs] }),
  })
  const o: any = await r.json()
  return { text: o.message.content, out: o.eval_count ?? 0, thinking: (o.message.thinking ?? "").length }
}

function model(reasoning: boolean): Model<"openai-completions"> {
  return { id: MODEL, name: MODEL, api: "openai-completions", provider: "ollama", baseUrl: `${OLLAMA}/v1`, reasoning,
    input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1048576, maxTokens: 32000,
    compat: { supportsDeveloperRole: DEVELOPER_ROLE } } as any
}

function piai(reasoning: boolean) {
  return async (sys: string, msgs: Msg[]): Promise<Reply> => {
    const m = await completeSimple(model(reasoning), {
      systemPrompt: sys,
      messages: msgs.map((x) => x.role === "user"
        ? { role: "user", content: x.content, timestamp: Date.now() }
        : { role: "assistant", content: [{ type: "text", text: x.content }], timestamp: Date.now() } as any),
    }, { apiKey: "ollama", temperature: TEMPERATURE, ...(reasoning ? { reasoning: "low" } : {}) })
    if (m.stopReason === "error") throw new Error(m.errorMessage)
    const text = m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("")
    const thinking = m.content.filter((c: any) => c.type === "thinking").map((c: any) => c.thinking).join("").length
    return { text, out: m.usage.output, thinking }
  }
}

const TRANSPORTS: Record<string, (sys: string, msgs: Msg[]) => Promise<Reply>> = {
  native, piai_off: piai(false), piai_low: piai(true),
}

async function judge(call: (s: string, m: Msg[]) => Promise<Reply>, c: any, user: string) {
  const sys = system(c.type)
  const msgs: Msg[] = [{ role: "user", content: user }]
  let out = 0, thinking = 0, tries = 0
  const t0 = Date.now()
  for (; tries < 2; tries++) {
    const r = await call(sys, msgs)
    out += r.out; thinking += r.thinking
    const p = parse(r.text, c.type)
    if (typeof p !== "string") return { probs: p, tries: tries + 1, out, thinking, s: (Date.now() - t0) / 1000 }
    msgs.push({ role: "assistant", content: r.text }, { role: "user", content: `Your JSON is wrong: ${p}. Answer again with only the corrected JSON.` })
  }
  return { probs: null, tries, out, thinking, s: (Date.now() - t0) / 1000 }
}

function drops(kind: string, p: Record<string, number>): string[] {
  if (kind === "rule") return p.is_user_rejection < THRESHOLDS.is_user_rejection ? ["is_user_rejection"] : []
  return Object.keys(p).filter((q) => q in THRESHOLDS && p[q] >= THRESHOLDS[q])
}

async function run() {
  const bench = readFileSync(join(BENCH, "bench.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l))
  const stored = new Map(readFileSync(join(BENCH, "run_F_guard.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [r.id, r.answers]))
  const step = bench.length / SAMPLE
  const sample = Array.from({ length: SAMPLE }, (_, k) => bench[Math.floor(k * step)])
  const rows: any[] = []
  for (const c of sample) {
    const user = await context(c)
    for (const [name, call] of Object.entries(TRANSPORTS)) {
      const r = await judge(call, c, user)
      rows.push({ id: c.id, type: c.type, transport: name, stored: stored.get(c.id), ...r })
      console.log(`${c.id} ${c.type} ${name} tries=${r.tries} out=${r.out} think_chars=${r.thinking} ${r.s.toFixed(1)}s`)
    }
  }
  writeFileSync(join(HERE, "results.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n")
  report(rows)
}

function report(rows: any[]) {
  console.log(`\n${"transport".padEnd(10)} ${"valid".padStart(6)} ${"retry".padStart(6)} ${"|dp|".padStart(6)} ${"drop!=".padStart(7)} ${"out".padStart(6)} ${"think".padStart(7)} ${"s".padStart(5)}`)
  for (const name of Object.keys(TRANSPORTS)) {
    const rs = rows.filter((r) => r.transport === name)
    const ok = rs.filter((r) => r.probs && r.stored)
    const diffs = ok.flatMap((r) => Object.keys(r.probs).map((q) => Math.abs(r.probs[q] - r.stored[q])))
    const dropDiff = ok.filter((r) => drops(r.type, r.probs).join() !== drops(r.type, r.stored).join()).length
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)
    console.log(`${name.padEnd(10)} ${String(rs.filter((r) => r.probs).length).padStart(6)} ${String(rs.filter((r) => r.tries > 1).length).padStart(6)} ${mean(diffs).toFixed(3).padStart(6)} ${String(dropDiff).padStart(7)} ${mean(rs.map((r) => r.out)).toFixed(0).padStart(6)} ${mean(rs.map((r) => r.thinking)).toFixed(0).padStart(7)} ${mean(rs.map((r) => r.s)).toFixed(1).padStart(5)}`)
  }
}

if (process.argv[2] === "report") report(readFileSync(join(HERE, "results.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)))
else await run()
