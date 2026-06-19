import yaml from "js-yaml"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { roll2d6 } from "./dice.ts"
import type { Table, TableEntry } from "../types.ts"

const BUILTIN_DIR = join(import.meta.dir, "../../tables")
const USER_DIR = join(homedir(), ".local", "share", "mvr", "tables")

export function loadTable(name: string): Table {
  const userPath = join(USER_DIR, `${name}.yaml`)
  const builtinPath = join(BUILTIN_DIR, `${name}.yaml`)
  const path = existsSync(userPath) ? userPath : existsSync(builtinPath) ? builtinPath : null
  if (!path) throw new Error(`Tabella "${name}" non trovata`)
  return yaml.load(readFileSync(path, "utf8")) as Table
}

export function resolveEntry(raw: TableEntry | string): TableEntry {
  return typeof raw === "string" ? { text: raw } : raw
}

export function rollTable(table: Table): { roll: number; entry: TableEntry } {
  const [a, b] = roll2d6()
  const roll = a + b
  const raw = table.entries[roll]
  if (!raw) throw new Error(`Nessuna entry per roll ${roll} in tabella ${table.name}`)
  return { roll, entry: resolveEntry(raw) }
}
