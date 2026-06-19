const B = "\x1b[1m"
const DIM = "\x1b[2m"
const R = "\x1b[0m"
const CYAN = "\x1b[36m"
const YELLOW = "\x1b[33m"

export function bold(s: string): string { return `${B}${s}${R}` }
export function dim(s: string): string { return `${DIM}${s}${R}` }
export function cyan(s: string): string { return `${CYAN}${s}${R}` }
export function yellow(s: string): string { return `${YELLOW}${s}${R}` }

export function header(label: string): string {
  return bold(label.toUpperCase())
}

export function rollLine(roll: number, text: string): string {
  return `${cyan(`[${roll}]`)} ${text}`
}

export function suggest(cmds: string[]): string {
  return dim(`→ ${cmds.join("  |  ")}`)
}

export function die(msg: string): never {
  process.stderr.write(`Errore: ${msg}\n`)
  process.exit(1)
}
