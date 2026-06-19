export interface TableEntry {
  text: string
  suggest?: string[]
}

export interface Table {
  name: string
  dice: string
  entries: Record<number, TableEntry | string>
}

export interface Wound {
  name: string   // "braccio rotto"
  level: 1 | 2 | 3
}

export interface Alteration {
  name: string
  value: number  // -1, +2, ecc.
  global: boolean
}

export interface Character {
  name: string
  level: number
  exp: number
  characteristics: Record<string, number>
  abilities: Record<string, number>
  traits: string[]
  wounds: Wound[]
  alterations: Alteration[]
  prepPoints: number
}

export interface Faction {
  name: string
  objective: string
  resource: string
  tension: string
  clockSize: number
  clockCurrent: number
}

export interface NPC {
  name: string
  role: string
  faction?: string
  relation: number  // -3 a +3
  notes: string
}

export interface ProvaState {
  diff: number
  target: number
  pool: number
  rolls: number[]
  total: number
}

export interface CampaignState {
  name: string
  pg?: Character
  factions: Faction[]
  npcs: NPC[]
  sceneCount: number
}

export interface AppState {
  currentCampaign?: string
  rulesPath: string
}
