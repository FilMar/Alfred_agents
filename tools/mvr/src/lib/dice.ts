export function d6(): number {
  return Math.floor(Math.random() * 6) + 1
}

export function roll2d6(): [number, number] {
  return [d6(), d6()]
}

export function provaTarget(diff: number): number {
  if (diff >= 11) return 30
  return diff * 2 + 10
}

export function provaOutcome(total: number, target: number): {
  label: string
  suggest: string[]
} {
  if (total > target) return { label: "Fallimento Critico", suggest: ["mvr roll complications", "mvr roll complications"] }
  if (total === target) return { label: "Successo Critico", suggest: ["mvr roll fortune", "mvr roll fortune"] }
  if (total === target - 1) return { label: "Successo, e...", suggest: ["mvr roll fortune"] }
  if (total === target - 2) return { label: "Successo, ma...", suggest: ["mvr roll complications"] }
  if (total === target - 3) return { label: "Fallimento, ma...", suggest: ["mvr roll fortune"] }
  if (total === target - 4) return { label: "Fallimento, e...", suggest: ["mvr roll complications"] }
  return { label: "Fallimento", suggest: ["mvr roll complications"] }
}
