import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Member } from "./types.js";

// ─── Percorsi ─────────────────────────────────────────────────────────────────

function resolveHatsDir(): string {
  const fromEnv = process.env.TH_HATS_DIR;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`TH_HATS_DIR non trovato: "${fromEnv}"`);
    return fromEnv;
  }
  const fromMeta = new URL("../hats", import.meta.url).pathname;
  if (existsSync(fromMeta)) return fromMeta;
  // fallback: cerca relativo all'eseguibile (utile per binary compilati)
  const fromBin = join(process.argv[1] ?? "", "../hats");
  if (existsSync(fromBin)) return fromBin;
  throw new Error(`Directory hats non trovata. Imposta TH_HATS_DIR oppure esegui da tools/th/.`);
}

const MEMBERS_DIR = process.env.TH_MEMBERS_DIR ?? join(process.cwd(), ".th", "members");
const TMP_MEMBERS_DIR = process.env.TH_TMP_MEMBERS_DIR ?? join("/tmp", ".th", "members");
const GLOBAL_MEMBERS_DIR = process.env.TH_GLOBAL_MEMBERS_DIR ?? join(homedir(), ".th", "members");

// ─── Validazione ──────────────────────────────────────────────────────────────

const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

export function validateName(name: string): void {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`Nome non valido: "${name}". Usa solo lettere, cifre, "-" e "_".`);
  }
  // ridondante ma esplicita: blocca path traversal
  if (name.includes("/") || name.includes("\\")) {
    throw new Error(`Nome non valido: "${name}". Non sono ammessi path separator.`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadHat(hat: string): string {
  validateName(hat);
  const hatsDir = resolveHatsDir();
  const hatPath = join(hatsDir, `${hat}.md`);
  if (!existsSync(hatPath)) {
    const available = readdirSync(hatsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
    throw new Error(`Hat "${hat}" non trovato. Disponibili: ${available.join(", ")}`);
  }
  return readFileSync(hatPath, "utf-8");
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(
    match[1].split("\n").flatMap((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return [];
      return [[line.slice(0, idx).trim(), line.slice(idx + 1).trim()]];
    })
  );
}

// Gestisce sia la sintassi inline YAML `[a, b]` sia le righe con trattino `- a`
function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    // inline: [read, bash]
    return trimmed.slice(1, -1).split(",").map((t) => t.trim()).filter(Boolean);
  }
  if (trimmed.startsWith("-")) {
    // multi-line YAML collassato su una sola stringa (edge case da parse manuale)
    return trimmed.split(/\n?\s*-\s+/).map((t) => t.trim()).filter(Boolean);
  }
  // valore singolo senza parentesi
  return trimmed ? [trimmed] : [];
}

// ─── Lettura member da file ────────────────────────────────────────────────────

function resolveMemberPath(name: string): string {
  validateName(name);
  const local = join(MEMBERS_DIR, `${name}.md`);
  if (existsSync(local)) return local;
  const tmp = join(TMP_MEMBERS_DIR, `${name}.md`);
  if (existsSync(tmp)) return tmp;
  const global = join(GLOBAL_MEMBERS_DIR, `${name}.md`);
  if (existsSync(global)) return global;
  throw new Error(`Membro "${name}" non trovato (cercato in .th/members/, /tmp/.th/members/, ~/.th/members/).`);
}

function parseMemberContent(name: string, content: string): { member: Member; systemPrompt: string } {
  const meta = parseFrontmatter(content);
  const member: Member = {
    name: meta.name ?? name,
    hat: meta.hat ?? "",
    tools: parseList(meta.tools),
    skills: parseList(meta.skills),
  };
  const systemPrompt = content.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  return { member, systemPrompt };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export function createMember(name: string, hat: string, role: string, tools: string[], skills: string[], tmp = false): Member {
  validateName(name);
  if (role.includes("\n")) throw new Error(`Il ruolo non può contenere newline. Usa una riga singola.`);

  const dir = tmp ? TMP_MEMBERS_DIR : MEMBERS_DIR;
  const memberPath = join(dir, `${name}.md`);

  if (existsSync(memberPath)) throw new Error(`Membro "${name}" esiste già.`);

  const hatContent = loadHat(hat);

  const content = [
    `---`,
    `name: ${name}`,
    `hat: ${hat}`,
    `tools: [${tools.join(", ")}]`,
    `skills: [${skills.join(", ")}]`,
    `---`,
    ``,
    `## Ruolo`,
    ``,
    role,
    ``,
    `---`,
    ``,
    hatContent.trim(),
  ].join("\n");

  mkdirSync(dir, { recursive: true });
  writeFileSync(memberPath, content, "utf-8");

  return { name, hat, tools, skills };
}

type Scope = "local" | "global" | "tmp";

function fromDir(dir: string, scope: Scope): Array<Member & { scope: Scope }> {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const content = readFileSync(join(dir, f), "utf-8");
      const { member } = parseMemberContent(f.replace(".md", ""), content);
      return { ...member, scope };
    });
}

export function listMembers(opts: { local?: boolean; global?: boolean; tmp?: boolean } = {}): {
  local: Array<Member & { scope: Scope }>;
  global: Array<Member & { scope: Scope }>;
  tmp: Array<Member & { scope: Scope }>;
} {
  const showAll = !opts.local && !opts.global && !opts.tmp;
  return {
    local: showAll || opts.local ? fromDir(MEMBERS_DIR, "local") : [],
    global: showAll || opts.global ? fromDir(GLOBAL_MEMBERS_DIR, "global") : [],
    tmp: showAll || opts.tmp ? fromDir(TMP_MEMBERS_DIR, "tmp") : [],
  };
}

export function loadMember(name: string): { member: Member; systemPrompt: string } {
  const memberPath = resolveMemberPath(name);
  const content = readFileSync(memberPath, "utf-8");
  return parseMemberContent(name, content);
}

export function getMember(name: string): Member {
  return loadMember(name).member;
}

export function deleteMember(name: string): void {
  const memberPath = resolveMemberPath(name);
  unlinkSync(memberPath);
}

export function promoteMember(name: string, force = false): Member {
  validateName(name);
  const srcPath = (() => {
    const local = join(MEMBERS_DIR, `${name}.md`);
    if (existsSync(local)) return local;
    const tmp = join(TMP_MEMBERS_DIR, `${name}.md`);
    if (existsSync(tmp)) return tmp;
    throw new Error(`Membro "${name}" non trovato in locale o tmp.`);
  })();
  const destPath = join(GLOBAL_MEMBERS_DIR, `${name}.md`);
  if (existsSync(destPath) && !force) {
    throw new Error(`Membro globale "${name}" esiste già. Usa --force per sovrascrivere.`);
  }
  mkdirSync(GLOBAL_MEMBERS_DIR, { recursive: true });
  copyFileSync(srcPath, destPath);
  return getMember(name);
}

export function createMemberFrom(name: string, globalName: string): Member {
  validateName(name);
  validateName(globalName);
  const srcPath = join(GLOBAL_MEMBERS_DIR, `${globalName}.md`);
  if (!existsSync(srcPath)) throw new Error(`Membro globale "${globalName}" non trovato.`);
  const destPath = join(MEMBERS_DIR, `${name}.md`);
  if (existsSync(destPath)) throw new Error(`Membro "${name}" esiste già.`);
  mkdirSync(MEMBERS_DIR, { recursive: true });
  let content = readFileSync(srcPath, "utf-8");
  if (name !== globalName) content = content.replace(/^name: .+$/m, `name: ${name}`);
  writeFileSync(destPath, content, "utf-8");
  return getMember(name);
}

/** Garantisce che il membro esista localmente. Se trovato solo in globale, lo copia in locale.
 *  Ritorna true se è stato auto-istanziato da globale. */
export function ensureLocalMember(name: string): boolean {
  validateName(name);
  if (existsSync(join(MEMBERS_DIR, `${name}.md`))) return false;
  if (existsSync(join(TMP_MEMBERS_DIR, `${name}.md`))) return false;
  const globalPath = join(GLOBAL_MEMBERS_DIR, `${name}.md`);
  if (!existsSync(globalPath)) {
    throw new Error(`Membro "${name}" non trovato (cercato in .th/members/, /tmp/.th/members/, ~/.th/members/).`);
  }
  mkdirSync(MEMBERS_DIR, { recursive: true });
  copyFileSync(globalPath, join(MEMBERS_DIR, `${name}.md`));
  return true;
}

export function listHats(): string[] {
  const hatsDir = resolveHatsDir();
  return readdirSync(hatsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""))
    .sort();
}

export function getHat(hat: string): string {
  return loadHat(hat);
}
