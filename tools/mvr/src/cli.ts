#!/usr/bin/env bun
import { Command } from "commander"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import yaml from "js-yaml"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableEntry { text: string; suggest?: string[] }
interface Table { name: string; dice: string; entries: Record<number, TableEntry | string> }
interface Wound { name: string; level: 1 | 2 | 3 }
interface Alteration { name: string; value: number; global: boolean }
interface Character {
  name: string; level: number; exp: number
  characteristics: Record<string, number>
  abilities: Record<string, number>
  traits: string[]
  wounds: Wound[]
  alterations: Alteration[]
  prepPoints: number
}
interface Faction { name: string; objective: string; resource: string; tension: string; clockSize: number; clockCurrent: number }
interface NPC { name: string; role: string; faction?: string; relation: number; notes: string }
interface ProvaState { diff: number; target: number; pool: number; rolls: number[]; total: number }
interface CampaignState { name: string; pg?: Character; factions: Faction[]; npcs: NPC[]; sceneCount: number }
interface AppState { currentCampaign?: string; rulesPath: string }

// ─── Storage ──────────────────────────────────────────────────────────────────

import { homedir } from "node:os"
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs"

const BASE = join(homedir(), ".local", "share", "mvr")
const STATE_FILE = join(BASE, "state.json")
const PROVA_FILE = join(BASE, "prova.json")

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}
function readJSON<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf8")) as T
}
function writeJSON(path: string, data: unknown): void {
  ensureDir(dirname(path))
  writeFileSync(path, JSON.stringify(data, null, 2))
}
function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-")
}
function getAppState(): AppState {
  const defaults: AppState = { rulesPath: join(import.meta.dir, "../data/rules.md") }
  return { ...defaults, ...(readJSON<AppState>(STATE_FILE) ?? {}) }
}
function saveAppState(s: AppState): void { writeJSON(STATE_FILE, s) }
function campaignDir(name: string): string { return join(BASE, "campaigns", slug(name)) }
function getCampaign(name: string): CampaignState | null {
  return readJSON<CampaignState>(join(campaignDir(name), "campaign.json"))
}
function saveCampaign(s: CampaignState): void { writeJSON(join(campaignDir(s.name), "campaign.json"), s) }
function getCurrentCampaign(): CampaignState | null {
  const app = getAppState()
  if (!app.currentCampaign) return null
  return getCampaign(app.currentCampaign)
}
function requireCampaign(): CampaignState {
  const c = getCurrentCampaign()
  if (!c) die("Nessuna campagna attiva. Usa: mvr campaign new <nome>")
  return c
}
function getProva(): ProvaState | null { return readJSON<ProvaState>(PROVA_FILE) }
function saveProva(s: ProvaState): void { writeJSON(PROVA_FILE, s) }
function clearProva(): void { if (existsSync(PROVA_FILE)) unlinkSync(PROVA_FILE) }
function todayStr(): string { return new Date().toISOString().slice(0, 10) }
function timeStr(): string { return new Date().toTimeString().slice(0, 5) }
function sessionLogPath(campaignName: string): string {
  return join(campaignDir(campaignName), "sessions", `${todayStr()}.md`)
}
function logEntry(line: string): void {
  const app = getAppState()
  if (!app.currentCampaign) return
  const path = sessionLogPath(app.currentCampaign)
  ensureDir(dirname(path))
  writeFileSync(path, `[${timeStr()}] ${line}\n`, { flag: "a" })
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

function d6(): number { return Math.floor(Math.random() * 6) + 1 }
function roll2d6(): number { return d6() + d6() }
function provaTarget(diff: number): number { return diff >= 11 ? 30 : diff * 2 + 10 }
function provaOutcome(total: number, target: number): { label: string; suggest: string[] } {
  if (total > target)    return { label: "Fallimento Critico", suggest: ["mvr roll complications", "mvr roll complications"] }
  if (total === target)  return { label: "Successo Critico",   suggest: ["mvr roll fortune", "mvr roll fortune"] }
  if (total === target - 1) return { label: "Successo, e...",     suggest: ["mvr roll fortune"] }
  if (total === target - 2) return { label: "Successo, ma...",    suggest: ["mvr roll complications"] }
  if (total === target - 3) return { label: "Fallimento, ma...", suggest: ["mvr roll fortune"] }
  if (total === target - 4) return { label: "Fallimento, e...",  suggest: ["mvr roll complications"] }
  return { label: "Fallimento", suggest: ["mvr roll complications"] }
}

// ─── Tables ───────────────────────────────────────────────────────────────────

const TABLES_DIR = join(import.meta.dir, "../data/tables")
const USER_TABLES_DIR = join(BASE, "tables")

function loadTable(name: string): Table {
  const userPath = join(USER_TABLES_DIR, `${name}.yaml`)
  const builtinPath = join(TABLES_DIR, `${name}.yaml`)
  const path = existsSync(userPath) ? userPath : existsSync(builtinPath) ? builtinPath : null
  if (!path) die(`Tabella "${name}" non trovata`)
  return yaml.load(readFileSync(path!, "utf8")) as Table
}
function resolveEntry(raw: TableEntry | string): TableEntry {
  return typeof raw === "string" ? { text: raw } : raw
}
function rollTable(table: Table): { roll: number; entry: TableEntry } {
  const roll = roll2d6()
  const raw = table.entries[roll]
  if (!raw) die(`Nessuna entry per roll ${roll} in tabella ${table.name}`)
  return { roll, entry: resolveEntry(raw!) }
}

// ─── Fmt ──────────────────────────────────────────────────────────────────────

const B = "\x1b[1m"; const DIM = "\x1b[2m"; const R = "\x1b[0m"
const CYAN = "\x1b[36m"; const YELLOW = "\x1b[33m"; const GREEN = "\x1b[32m"

function bold(s: string): string { return `${B}${s}${R}` }
function dim(s: string): string { return `${DIM}${s}${R}` }
function cyan(s: string): string { return `${CYAN}${s}${R}` }
function yellow(s: string): string { return `${YELLOW}${s}${R}` }
function green(s: string): string { return `${GREEN}${s}${R}` }
function header(s: string): string { return bold(s.toUpperCase()) }
function rollLine(roll: number, text: string): string { return `${cyan(`[${roll}]`)} ${text}` }
function suggestLine(cmds: string[]): string { return dim(`→ ${cmds.join("  |  ")}`) }
function die(msg: string): never { process.stderr.write(`Errore: ${msg}\n`); process.exit(1) }

function relationLabel(r: number): string {
  const labels: Record<number, string> = {
    "-3": "Nemico attivo", "-2": "Ostile", "-1": "Diffidente",
    "0": "Neutro", "1": "Favorevole", "2": "Alleato", "3": "Legame"
  }
  return labels[r] ?? String(r)
}

function woundLabel(w: Wound): string {
  const lvl = ["", "Lieve −1", "Media −2", "Grave −3"][w.level]
  return `${w.name} (${lvl})`
}

function clockBar(current: number, size: number): string {
  return "[" + "█".repeat(current) + "░".repeat(size - current) + `] ${current}/${size}`
}

// ─── Program ──────────────────────────────────────────────────────────────────

const program = new Command()
program.name("mvr").description("Multiversal Rules CLI").version("0.1.0")

// ─── roll ─────────────────────────────────────────────────────────────────────

program
  .command("roll <tables...>")
  .description("Tira su una o più tabelle (oracle, complications, fortune, events, direction, visibility, png, tone, spark, impact)")
  .action((tableNames: string[]) => {
    for (const name of tableNames) {
      const table = loadTable(name)
      const { roll, entry } = rollTable(table)
      console.log()
      console.log(header(table.name))
      console.log(rollLine(roll, entry.text))
      if (entry.suggest?.length) console.log(suggestLine(entry.suggest))
      logEntry(`ROLL ${name.toUpperCase()} → [${roll}] ${entry.text}`)
    }
    console.log()
  })

// ─── prova ────────────────────────────────────────────────────────────────────

const prova = new Command("prova").description("Blackjack sequenziale")

prova
  .command("open")
  .description("Apre una nuova prova")
  .requiredOption("--diff <n>", "Difficoltà (0-10)", (v) => parseInt(v, 10))
  .option("--pool <n>", "Pool dadi totale (default: 2 base + char se PG presente)", (v) => parseInt(v, 10))
  .action((opts) => {
    if (getProva()) die("Prova già aperta. Usa: mvr prova stop  oppure  mvr prova status")
    const target = provaTarget(opts.diff)
    let pool = opts.pool ?? 2
    const pg = getCurrentCampaign()?.pg
    if (!opts.pool && pg) {
      const charTotal = Object.values(pg.characteristics).reduce((a, b) => a + b, 0)
      pool = Math.min(2 + charTotal, 10)
    }
    const state: ProvaState = { diff: opts.diff, target, pool, rolls: [], total: 0 }
    saveProva(state)
    console.log()
    console.log(bold("PROVA APERTA"))
    console.log(`Difficoltà ${opts.diff}  →  Target: ${yellow(String(target))}  |  Pool: ${pool}d6`)
    console.log(suggestLine(["mvr prova roll"]))
    console.log()
    logEntry(`PROVA OPEN diff:${opts.diff} target:${target} pool:${pool}`)
  })

prova
  .command("roll")
  .description("Tira il prossimo dado nella prova aperta")
  .action(() => {
    const state = getProva()
    if (!state) die("Nessuna prova aperta. Usa: mvr prova open --diff <n>")
    const remaining = state.pool - state.rolls.length
    if (remaining <= 0) die("Dadi esauriti. Usa: mvr prova stop")
    const die_ = d6()
    state.rolls.push(die_)
    state.total += die_
    saveProva(state)
    const margin = state.target - state.total
    const rollsStr = state.rolls.map(r => `[${r}]`).join(" ")
    console.log()
    console.log(`${cyan(`[${die_}]`)}  Totale: ${bold(String(state.total))}  |  Target: ${state.target}  |  Margine: ${margin >= 0 ? green(String(margin)) : yellow(String(margin))}  |  Dadi rimasti: ${state.pool - state.rolls.length}`)
    if (state.total > state.target) {
      const outcome = provaOutcome(state.total, state.target)
      console.log()
      console.log(`${rollsStr}  →  ${yellow(outcome.label)}`)
      if (outcome.suggest.length) console.log(suggestLine(outcome.suggest))
      logEntry(`PROVA rolls:${rollsStr} total:${state.total} → ${outcome.label}`)
      clearProva()
    } else {
      const suggest_: string[] = []
      if (state.pool - state.rolls.length > 0) suggest_.push("mvr prova roll")
      suggest_.push("mvr prova stop")
      console.log(suggestLine(suggest_))
    }
    console.log()
  })

prova
  .command("stop")
  .description("Chiude la prova e mostra l'esito")
  .action(() => {
    const state = getProva()
    if (!state) die("Nessuna prova aperta.")
    const outcome = provaOutcome(state.total, state.target)
    const rollsStr = state.rolls.map(r => `[${r}]`).join(" ")
    console.log()
    console.log(`${rollsStr || "(nessun dado tirato)"}  →  Totale: ${bold(String(state.total))}  |  Target: ${state.target}`)
    console.log(bold(outcome.label))
    if (outcome.suggest.length) console.log(suggestLine(outcome.suggest))
    logEntry(`PROVA STOP rolls:${rollsStr} total:${state.total} → ${outcome.label}`)
    clearProva()
    console.log()
  })

prova
  .command("status")
  .description("Mostra lo stato della prova in corso")
  .action(() => {
    const state = getProva()
    if (!state) { console.log("Nessuna prova aperta."); return }
    const rollsStr = state.rolls.length ? state.rolls.map(r => `[${r}]`).join(" ") : "—"
    console.log()
    console.log(bold("PROVA IN CORSO"))
    console.log(`Target: ${state.target}  |  Pool: ${state.pool}d6  |  Rimasti: ${state.pool - state.rolls.length}`)
    console.log(`Dadi: ${rollsStr}  |  Totale: ${bold(String(state.total))}  |  Margine: ${state.target - state.total}`)
    console.log()
  })

program.addCommand(prova)

// ─── pg ───────────────────────────────────────────────────────────────────────

const pg = new Command("pg").description("Gestione personaggio")

const RANDOM_ABILITIES = [
  "furtività", "persuasione", "combattimento", "medicina", "atletismo",
  "sopravvivenza", "inganno", "percezione", "intimidazione", "alchimia",
  "navigazione", "storia", "magia", "fabbricare trappole", "scalare",
]

const RANDOM_NAMES = [
  "Aldric", "Mira", "Solan", "Veth", "Caera", "Dusk", "Fen", "Isolde",
  "Karyn", "Lorn", "Nia", "Oryn", "Petra", "Rael", "Sable", "Thyra",
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]! }
function pickN<T>(arr: T[], n: number): T[] {
  const pool = [...arr]
  const result: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0]!)
  }
  return result
}

function randomPG(name: string): Character {
  const charKeys = ["atletica", "destrezza", "conoscenza", "carisma", "intuito"]
  const chars: Record<string, number> = Object.fromEntries(charKeys.map(k => [k, 1]))
  const abilities: Record<string, number> = {}
  let points = 3

  // ogni punto: 50% va a una caratteristica (se < 3), 50% a una nuova abilità
  while (points > 0) {
    const upgradableChars = charKeys.filter(k => chars[k]! < 3)
    const addAbility = Math.random() > 0.5 || !upgradableChars.length
    if (addAbility) {
      const pool = RANDOM_ABILITIES.filter(a => !(a in abilities))
      if (pool.length) { abilities[pick(pool)] = 1; points-- }
      else if (upgradableChars.length) { const k = pick(upgradableChars); chars[k] = (chars[k] ?? 1) + 1; points-- }
      else break
    } else {
      const key = pick(upgradableChars)
      chars[key] = (chars[key] ?? 1) + 1
      points--
    }
  }

  return { name, level: 1, exp: 0, characteristics: chars, abilities, traits: [], wounds: [], alterations: [], prepPoints: 5 }
}

pg
  .command("create")
  .description("Crea un nuovo personaggio")
  .option("--name <nome>", "Nome del personaggio")
  .option("--char <list>", "Caratteristiche extra es. atletica:2,destrezza:1 (base 1 per tutte, 3 punti da spendere)")
  .option("--ability <list>", "Abilità es. furtività:2,acrobazia:1")
  .option("--random", "Genera un personaggio casuale")
  .action((opts) => {
    const c = requireCampaign()
    if (c.pg) die(`PG già presente: ${c.pg.name}. Modifica direttamente la scheda.`)
    let character: Character
    if (opts.random) {
      const name = opts.name ?? pick(RANDOM_NAMES)
      character = randomPG(name)
    } else {
      if (!opts.name) die("--name richiesto (oppure usa --random)")
      const chars: Record<string, number> = { atletica: 1, destrezza: 1, conoscenza: 1, carisma: 1, intuito: 1 }
      if (opts.char) {
        for (const pair of opts.char.split(",")) {
          const [k, v] = pair.trim().split(":")
          if (k && v) chars[k.trim()] = parseInt(v.trim(), 10)
        }
      }
      const abilities: Record<string, number> = {}
      if (opts.ability) {
        for (const pair of opts.ability.split(",")) {
          const [k, v] = pair.trim().split(":")
          if (k && v) abilities[k.trim()] = parseInt(v.trim(), 10)
        }
      }
      character = { name: opts.name, level: 1, exp: 0, characteristics: chars, abilities, traits: [], wounds: [], alterations: [], prepPoints: 5 }
    }
    c.pg = character
    saveCampaign(c)
    console.log()
    console.log(`${bold(character.name)} creato. Punti prep iniziali: 5`)
    console.log(suggestLine(["mvr pg show"]))
    console.log()
    logEntry(`PG CREATE ${character.name}`)
  })

pg
  .command("show")
  .description("Mostra la scheda personaggio")
  .action(() => {
    const c = requireCampaign()
    const p = c.pg
    if (!p) die("Nessun personaggio. Usa: mvr pg create --name <nome>")
    console.log()
    console.log(bold(`${p.name}`) + `  Lv.${p.level}  EXP: ${p.exp}/${p.level * 100}  Prep: ${yellow(String(p.prepPoints))}`)
    console.log()
    console.log(dim("CARATTERISTICHE"))
    for (const [k, v] of Object.entries(p.characteristics)) console.log(`  ${k}: ${bold(String(v))}`)
    if (Object.keys(p.abilities).length) {
      console.log()
      console.log(dim("ABILITÀ"))
      for (const [k, v] of Object.entries(p.abilities)) console.log(`  ${k}: ${v}`)
    }
    if (p.traits.length) {
      console.log()
      console.log(dim("TRATTI"))
      for (const t of p.traits) console.log(`  ${t}`)
    }
    if (p.wounds.length) {
      console.log()
      console.log(dim("FERITE / ALTERAZIONI"))
      for (const w of p.wounds) console.log(`  ${yellow("!")} ${woundLabel(w)}`)
    }
    if (p.alterations.length) {
      console.log()
      console.log(dim("ALTERAZIONI GLOBALI"))
      for (const a of p.alterations) console.log(`  ${a.name}: ${a.value > 0 ? "+" : ""}${a.value}${a.global ? " (globale)" : ""}`)
    }
    console.log()
  })

pg
  .command("wound <nome> <livello>")
  .description("Aggiunge una ferita/alterazione (livello 1=lieve 2=media 3=grave)")
  .action((nome: string, livelloStr: string) => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    const level = parseInt(livelloStr, 10) as 1 | 2 | 3
    if (![1, 2, 3].includes(level)) die("Livello deve essere 1, 2 o 3")
    const existing = p.wounds.find(w => w.name.toLowerCase() === nome.toLowerCase())
    if (existing) {
      if (existing.level === level) {
        existing.level = Math.min(3, existing.level + 1) as 1 | 2 | 3
        console.log(`\n${yellow(nome)} peggiora → ${["", "Lieve", "Media", "Grave"][existing.level]}\n`)
      } else {
        existing.level = Math.max(existing.level, level) as 1 | 2 | 3
        console.log(`\n${yellow(nome)} aggiornato → ${["", "Lieve", "Media", "Grave"][existing.level]}\n`)
      }
    } else {
      p.wounds.push({ name: nome, level })
      console.log(`\n${yellow("!")} ${nome} (${["", "Lieve −1", "Media −2", "Grave −3"][level]}) aggiunto\n`)
    }
    const gravi = p.wounds.filter(w => w.level === 3).length
    if (gravi >= 4) console.log(yellow("⚠ 4+ ferite gravi → MORTE ISTANTANEA\n"))
    else if (gravi === 3) console.log(yellow("⚠ 3 ferite gravi → DEATH ROLL\n"))
    saveCampaign(c)
    logEntry(`WOUND "${nome}" lv${level}`)
  })

pg
  .command("heal <nome>")
  .description("Scala o rimuove una ferita")
  .action((nome: string) => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    const idx = p.wounds.findIndex(w => w.name.toLowerCase() === nome.toLowerCase())
    if (idx === -1) die(`Ferita "${nome}" non trovata`)
    const w = p.wounds[idx]!
    if (w.level > 1) {
      w.level = (w.level - 1) as 1 | 2 | 3
      console.log(`\n${green("✓")} ${nome} scala → ${["", "Lieve −1", "Media −2", "Grave −3"][w.level]}\n`)
    } else {
      p.wounds.splice(idx, 1)
      console.log(`\n${green("✓")} ${nome} rimossa\n`)
    }
    saveCampaign(c)
    logEntry(`HEAL "${nome}"`)
  })

pg
  .command("prep <n> [motivo]")
  .description("Modifica punti preparazione (es. -1 o +2)")
  .action((nStr: string, motivo?: string) => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    const delta = parseInt(nStr, 10)
    if (isNaN(delta)) die("Valore non valido")
    p.prepPoints = Math.max(0, p.prepPoints + delta)
    const label = motivo ? ` (${motivo})` : ""
    console.log(`\nPrep: ${yellow(String(p.prepPoints))}${label}\n`)
    saveCampaign(c)
    logEntry(`PREP ${delta >= 0 ? "+" : ""}${delta}${label} → ${p.prepPoints}`)
  })

pg
  .command("exp <n>")
  .description("Aggiunge punti esperienza")
  .action((nStr: string) => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    const n = parseInt(nStr, 10)
    p.exp += n
    const needed = p.level * 100
    console.log(`\nEXP: ${p.exp}/${needed}`)
    if (p.exp >= needed) console.log(suggestLine(["mvr pg levelup"]))
    console.log()
    saveCampaign(c)
    logEntry(`EXP +${n} → ${p.exp}`)
  })

pg
  .command("levelup")
  .description("Applica levelup se hai EXP sufficienti")
  .action(() => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    const needed = p.level * 100
    if (p.exp < needed) die(`EXP insufficienti: ${p.exp}/${needed}`)
    p.exp -= needed
    p.level++
    console.log(`\n${green("★")} ${p.name} → Livello ${bold(String(p.level))}\n`)
    console.log("Guadagni 2 punti da spendere come in creazione.\n")
    saveCampaign(c)
    logEntry(`LEVELUP → Lv.${p.level}`)
  })

pg
  .command("rest <tipo>")
  .description("Applica recupero (breve, lungo, prolungato)")
  .action((tipo: string) => {
    const c = requireCampaign()
    const p = c.pg!
    if (!p) die("Nessun personaggio.")
    if (!["breve", "lungo", "prolungato"].includes(tipo)) die("Tipo: breve | lungo | prolungato")
    if (tipo === "breve") {
      p.wounds = p.wounds.filter(w => w.level > 1)
      p.prepPoints += 1
      console.log("\nRiposo Breve: ferite Lievi rimosse, prep +1\n")
    } else if (tipo === "lungo") {
      p.wounds = p.wounds.filter(w => w.level > 1).map(w => w.level > 2 ? w : { ...w, level: 1 as const })
      p.wounds = p.wounds.map(w => ({ ...w, level: Math.max(1, w.level - 1) as 1 | 2 | 3 }))
      p.wounds = p.wounds.filter(w => w.level > 0)
      p.prepPoints += 2
      console.log("\nRiposo Lungo: ferite scalano di 1 (Gravi restano), prep +2\n")
    } else {
      p.wounds = p.wounds.map(w => w.level === 3 ? { ...w, level: 2 as const } : w)
      p.wounds = p.wounds.map(w => ({ ...w, level: Math.max(1, w.level - 1) as 1 | 2 | 3 }))
      p.wounds = p.wounds.filter(w => w.level > 0)
      console.log("\nRiposo Prolungato: tutte le ferite scalano di 1\n")
    }
    saveCampaign(c)
    logEntry(`REST ${tipo}`)
  })

program.addCommand(pg)

// ─── session ──────────────────────────────────────────────────────────────────

const session = new Command("session").description("Gestione sessione di gioco")

session
  .command("start [nome]")
  .description("Inizia una sessione e apre il log")
  .action((nome?: string) => {
    const c = requireCampaign()
    const path = sessionLogPath(c.name)
    ensureDir(dirname(path))
    const title = nome ? `# ${nome}` : `# Sessione ${todayStr()}`
    if (!existsSync(path)) writeFileSync(path, `${title}\n\n`)
    writeFileSync(path, `[${timeStr()}] SESSION START\n`, { flag: "a" })
    console.log(`\nSessione iniziata → ${dim(path)}\n`)
  })

session
  .command("end")
  .description("Chiude la sessione corrente")
  .action(() => {
    const c = requireCampaign()
    logEntry("SESSION END")
    c.sceneCount++
    saveCampaign(c)
    console.log(`\nSessione chiusa. Scene totali: ${c.sceneCount}\n`)
  })

session
  .command("log")
  .description("Mostra il log della sessione odierna")
  .action(() => {
    const c = requireCampaign()
    const path = sessionLogPath(c.name)
    if (!existsSync(path)) die("Nessun log per oggi.")
    process.stdout.write(readFileSync(path, "utf8"))
  })

program.addCommand(session)

// ─── faction ──────────────────────────────────────────────────────────────────

const faction = new Command("faction").description("Gestione fazioni (Sistema Sandbox)")

faction
  .command("add <nome>")
  .description("Aggiunge una fazione")
  .option("--clock <n>", "Dimensione orologio (4, 6 o 8)", "6")
  .option("--objective <s>", "Obiettivo")
  .option("--resource <s>", "Risorsa")
  .option("--tension <s>", "Con chi sono in conflitto")
  .action((nome: string, opts) => {
    const c = requireCampaign()
    if (c.factions.find(f => f.name.toLowerCase() === nome.toLowerCase())) die(`Fazione "${nome}" già presente`)
    c.factions.push({
      name: nome, objective: opts.objective ?? "", resource: opts.resource ?? "",
      tension: opts.tension ?? "", clockSize: parseInt(opts.clock, 10), clockCurrent: 0,
    })
    saveCampaign(c)
    console.log(`\n${bold(nome)} aggiunta. Orologio: ${clockBar(0, parseInt(opts.clock, 10))}\n`)
    logEntry(`FACTION ADD "${nome}"`)
  })

faction
  .command("show [nome]")
  .description("Mostra fazioni")
  .action((nome?: string) => {
    const c = requireCampaign()
    const list = nome ? c.factions.filter(f => f.name.toLowerCase().includes(nome.toLowerCase())) : c.factions
    if (!list.length) die("Nessuna fazione trovata.")
    console.log()
    for (const f of list) {
      console.log(bold(f.name) + "  " + clockBar(f.clockCurrent, f.clockSize))
      if (f.objective) console.log(`  Obiettivo: ${f.objective}`)
      if (f.resource)  console.log(`  Risorsa:   ${f.resource}`)
      if (f.tension)   console.log(`  Tensione:  ${f.tension}`)
      console.log()
    }
  })

faction
  .command("tick [nome]")
  .description("Avanza l'orologio di 1 tacca")
  .action((nome?: string) => {
    const c = requireCampaign()
    const f = nome
      ? c.factions.find(f => f.name.toLowerCase().includes(nome.toLowerCase()))
      : c.factions[0]
    if (!f) die("Fazione non trovata.")
    f.clockCurrent = Math.min(f.clockCurrent + 1, f.clockSize)
    saveCampaign(c)
    const bar = clockBar(f.clockCurrent, f.clockSize)
    console.log(`\n${bold(f.name)}  ${bar}`)
    if (f.clockCurrent >= f.clockSize) console.log(yellow(`\n⚠ OROLOGIO PIENO — ${f.name} ha raggiunto il suo obiettivo!\n`))
    else console.log()
    logEntry(`FACTION TICK "${f.name}" → ${f.clockCurrent}/${f.clockSize}`)
  })

faction
  .command("untick [nome]")
  .description("Riporta l'orologio indietro di 1 tacca")
  .action((nome?: string) => {
    const c = requireCampaign()
    const f = nome
      ? c.factions.find(f => f.name.toLowerCase().includes(nome.toLowerCase()))
      : c.factions[0]
    if (!f) die("Fazione non trovata.")
    f.clockCurrent = Math.max(0, f.clockCurrent - 1)
    saveCampaign(c)
    console.log(`\n${bold(f.name)}  ${clockBar(f.clockCurrent, f.clockSize)}\n`)
    logEntry(`FACTION UNTICK "${f.name}" → ${f.clockCurrent}/${f.clockSize}`)
  })

faction
  .command("tension <nome> <livello>")
  .description("Imposta tensione con un'altra fazione (1=diffidenza 2=conflitto 3=guerra)")
  .action((nome: string, livelloStr: string) => {
    const c = requireCampaign()
    const f = c.factions.find(f => f.name.toLowerCase().includes(nome.toLowerCase()))
    if (!f) die(`Fazione "${nome}" non trovata`)
    const lv = parseInt(livelloStr, 10)
    if (![1, 2, 3].includes(lv)) die("Livello tensione: 1, 2 o 3")
    f.tension = `${f.tension.split("→")[0].trim()} → tensione ${lv}`
    saveCampaign(c)
    console.log(`\nTensione aggiornata: ${bold(f.name)} → lv.${lv}\n`)
  })

program.addCommand(faction)

// ─── npc ──────────────────────────────────────────────────────────────────────

const npc = new Command("npc").description("Registro PNG (Sistema Sandbox)")

npc
  .command("add <nome>")
  .description("Aggiunge un PNG al registro")
  .option("--role <s>", "Ruolo nel mondo")
  .option("--faction <s>", "Fazione di appartenenza")
  .option("--relation <n>", "Relazione iniziale (-3/+3)", "0")
  .option("--notes <s>", "Note")
  .action((nome: string, opts) => {
    const c = requireCampaign()
    if (c.npcs.find(n => n.name.toLowerCase() === nome.toLowerCase())) die(`PNG "${nome}" già presente`)
    c.npcs.push({
      name: nome, role: opts.role ?? "", faction: opts.faction,
      relation: parseInt(opts.relation, 10), notes: opts.notes ?? "",
    })
    saveCampaign(c)
    console.log(`\n${bold(nome)} aggiunto. Relazione: ${relationLabel(parseInt(opts.relation, 10))}\n`)
    logEntry(`NPC ADD "${nome}"`)
  })

npc
  .command("show [nome]")
  .description("Mostra PNG")
  .action((nome?: string) => {
    const c = requireCampaign()
    const list = nome ? c.npcs.filter(n => n.name.toLowerCase().includes(nome.toLowerCase())) : c.npcs
    if (!list.length) die("Nessun PNG trovato.")
    console.log()
    for (const n of list) {
      const relStr = `${n.relation >= 0 ? "+" : ""}${n.relation}  ${relationLabel(n.relation)}`
      console.log(bold(n.name) + (n.faction ? dim(` [${n.faction}]`) : ""))
      if (n.role) console.log(`  ${n.role}`)
      console.log(`  Relazione: ${n.relation >= 0 ? green(relStr) : yellow(relStr)}`)
      if (n.notes) console.log(`  ${dim(n.notes)}`)
      console.log()
    }
  })

npc
  .command("rel <nome> <delta> [motivo]")
  .description("Modifica relazione PNG (es. +1 o -2)")
  .action((nome: string, deltaStr: string, motivo?: string) => {
    const c = requireCampaign()
    const n = c.npcs.find(n => n.name.toLowerCase().includes(nome.toLowerCase()))
    if (!n) die(`PNG "${nome}" non trovato`)
    const delta = parseInt(deltaStr, 10)
    n.relation = Math.max(-3, Math.min(3, n.relation + delta))
    const label = motivo ? ` (${motivo})` : ""
    console.log(`\n${bold(n.name)}: ${n.relation >= 0 ? "+" : ""}${n.relation}  ${relationLabel(n.relation)}${label}\n`)
    saveCampaign(c)
    logEntry(`NPC REL "${n.name}" ${delta >= 0 ? "+" : ""}${delta}${label} → ${n.relation}`)
  })

program.addCommand(npc)

// ─── note ─────────────────────────────────────────────────────────────────────

program
  .command("note <testo>")
  .description("Aggiunge una nota libera al log sessione")
  .action((testo: string) => {
    logEntry(`NOTE ${testo}`)
    console.log(`\n${dim(`[${timeStr()}]`)} ${testo}\n`)
  })

// ─── rules ────────────────────────────────────────────────────────────────────

program
  .command("rules <query>")
  .description("Cerca nelle regole del gioco")
  .action((query: string) => {
    const app = getAppState()
    if (!existsSync(app.rulesPath)) die(`File regole non trovato: ${app.rulesPath}\nImposta il path con: mvr campaign config --rules-path <path>`)
    const src = readFileSync(app.rulesPath, "utf8")
    const lines = src.split("\n")
    const q = query.toLowerCase()

    // cerca sezioni (## o ###) il cui titolo contiene la query
    const sectionStarts: number[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (/^#{1,3} /.test(line) && line.toLowerCase().includes(q)) sectionStarts.push(i)
    }

    if (sectionStarts.length) {
      for (const start of sectionStarts) {
        const level = (lines[start]!.match(/^(#+)/)?.[1].length ?? 1)
        let end = start + 1
        while (end < lines.length && !(new RegExp(`^#{1,${level}} `).test(lines[end]!))) end++
        console.log()
        console.log(lines.slice(start, end).join("\n"))
      }
    } else {
      // full-text fallback con contesto
      let found = false
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.toLowerCase().includes(q)) {
          if (!found) { console.log(); found = true }
          const from = Math.max(0, i - 1)
          const to = Math.min(lines.length, i + 3)
          console.log(lines.slice(from, to).join("\n"))
          console.log(dim("---"))
        }
      }
      if (!found) die(`Nessun risultato per "${query}"`)
    }
    console.log()
  })

// ─── campaign ─────────────────────────────────────────────────────────────────

const campaign = new Command("campaign").description("Gestione campagne")

campaign
  .command("new <nome>")
  .description("Crea una nuova campagna e la imposta come corrente")
  .action((nome: string) => {
    if (getCampaign(nome)) die(`Campagna "${nome}" già esistente`)
    const state: CampaignState = { name: nome, factions: [], npcs: [], sceneCount: 0 }
    saveCampaign(state)
    const app = getAppState()
    app.currentCampaign = nome
    saveAppState(app)
    console.log(`\nCampagna ${bold(nome)} creata e impostata come corrente.\n`)
    console.log(suggestLine(["mvr pg create --name <nome>", "mvr session start"]))
    console.log()
  })

campaign
  .command("use <nome>")
  .description("Imposta la campagna corrente")
  .action((nome: string) => {
    if (!getCampaign(nome)) die(`Campagna "${nome}" non trovata`)
    const app = getAppState()
    app.currentCampaign = nome
    saveAppState(app)
    console.log(`\nCampagna corrente: ${bold(nome)}\n`)
  })

campaign
  .command("list")
  .description("Elenca le campagne disponibili")
  .action(() => {
    const dir = join(BASE, "campaigns")
    if (!existsSync(dir)) { console.log("\nNessuna campagna.\n"); return }
    const app = getAppState()
    const names = readdirSync(dir)
    console.log()
    for (const n of names) {
      const marker = n === slug(app.currentCampaign ?? "") ? green("▸ ") : "  "
      const data = readJSON<CampaignState>(join(dir, n, "campaign.json"))
      console.log(`${marker}${bold(data?.name ?? n)}`)
    }
    console.log()
  })

campaign
  .command("show")
  .description("Mostra info campagna corrente")
  .action(() => {
    const c = requireCampaign()
    console.log()
    console.log(bold(c.name) + `  ${dim(`Scene: ${c.sceneCount}`)}`)
    if (c.pg) console.log(`  PG: ${c.pg.name} Lv.${c.pg.level}`)
    if (c.factions.length) {
      console.log()
      console.log(dim("FAZIONI"))
      for (const f of c.factions) console.log(`  ${f.name}  ${clockBar(f.clockCurrent, f.clockSize)}`)
    }
    if (c.npcs.length) {
      console.log()
      console.log(dim("PNG"))
      for (const n of c.npcs) console.log(`  ${n.name}  ${n.relation >= 0 ? "+" : ""}${n.relation}`)
    }
    console.log()
  })

program.addCommand(campaign)

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  die(err instanceof Error ? err.message : String(err))
})
