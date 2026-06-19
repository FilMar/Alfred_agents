import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { homedir } from "node:os"
import { join, dirname } from "node:path"
import type { AppState, CampaignState, ProvaState } from "../types.ts"

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

export function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-")
}

// App state

export function getAppState(): AppState {
  const defaults: AppState = {
    rulesPath: join(import.meta.dir, "../../..", "multiversal_rules_v2.md"),
  }
  return { ...defaults, ...(readJSON<AppState>(STATE_FILE) ?? {}) }
}

export function saveAppState(state: AppState): void {
  writeJSON(STATE_FILE, state)
}

// Campaign

export function campaignDir(name: string): string {
  return join(BASE, "campaigns", slug(name))
}

export function getCampaign(name: string): CampaignState | null {
  return readJSON<CampaignState>(join(campaignDir(name), "campaign.json"))
}

export function saveCampaign(state: CampaignState): void {
  writeJSON(join(campaignDir(state.name), "campaign.json"), state)
}

export function getCurrentCampaign(): CampaignState | null {
  const app = getAppState()
  if (!app.currentCampaign) return null
  return getCampaign(app.currentCampaign)
}

export function saveCurrentCampaign(state: CampaignState): void {
  saveCampaign(state)
}

// Prova

export function getProva(): ProvaState | null {
  return readJSON<ProvaState>(PROVA_FILE)
}

export function saveProva(state: ProvaState): void {
  ensureDir(BASE)
  writeJSON(PROVA_FILE, state)
}

export function clearProva(): void {
  if (existsSync(PROVA_FILE)) unlinkSync(PROVA_FILE)
}

// Session log

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function timeStr(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function getSessionLogPath(campaignName: string): string {
  return join(campaignDir(campaignName), "sessions", `${todayStr()}.md`)
}

export function logEntry(line: string): void {
  const app = getAppState()
  if (!app.currentCampaign) return
  const path = getSessionLogPath(app.currentCampaign)
  ensureDir(dirname(path))
  const entry = `[${timeStr()}] ${line}\n`
  writeFileSync(path, entry, { flag: "a" })
}
