import { afterAll, beforeEach, expect, test } from "bun:test";

import { NoteCandidate, RuleCandidate } from "../tools/td/src/candidate.ts";
import { Extractor, ModelConnection, Role } from "../tools/td/src/config.ts";
import type { CriticCheckJson } from "../tools/td/src/config.ts";
import { episodeText, targetOf, targetText } from "../tools/td/src/extraction.ts";
import { SessionMap } from "../tools/td/src/episodes.ts";
import { SessionRead, Turn } from "../tools/td/src/session.ts";
import type { Contents, Exchange } from "../tools/tl/src/types.ts";

process.env.QDRANT_URL = "http://localhost:1";
const { kindOf, criticPrompt, probabilitiesCheck, dropOf, critique } = await import("../tools/td/src/critic.ts");

type Wire = { readonly messages: readonly { readonly role: string; readonly content: string }[] };
type Reply = { readonly status: number; readonly text: string };

const seen: Wire[] = [];
const replies: Reply[] = [];

function pushReply(text: string): void {
  replies.push({ status: 200, text });
}

function pushStatus(status: number): void {
  replies.push({ status, text: "" });
}

function sse(text: string): Response {
  const chunk = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;
  const body =
    chunk({ id: "critic", object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: text }, finish_reason: null }] }) +
    chunk({ id: "critic", object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }) +
    chunk({ id: "critic", object: "chat.completion.chunk", choices: [], usage: { prompt_tokens: 10, completion_tokens: 10 } }) +
    "data: [DONE]\n\n";
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

const server = Bun.serve({
  port: 0,
  async fetch(request: Request): Promise<Response> {
    seen.push(JSON.parse(await request.text()) as Wire);
    const reply = replies.shift() ?? { status: 400, text: "" };
    if (reply.status !== 200) {
      return new Response(JSON.stringify({ error: { message: "the queue has no reply", type: "invalid_request_error" } }), {
        status: reply.status,
        headers: { "content-type": "application/json" },
      });
    }
    return sse(reply.text);
  },
});

// Copied from tests/td_extraction.test.ts.
const connection = ModelConnection.fromJson({
  provider: "ollama",
  id: "glm-5.3-flash:cloud",
  api: "openai-completions",
  baseUrl: `http://localhost:${server.port}/v1`,
  reasoning: true,
  compat: { supportsDeveloperRole: false },
  contextWindow: 1048576,
  maxTokens: 32000,
});

const role = Role.fromJson({
  connection: connection.toJson(),
  thinking: "low",
  temperature: 0.1,
  system: `# The Guard

You are the last guard of a knowledge base against chaos. If nothing passes you, nothing evolves: the
base stays frozen and useless. If too much passes, everything changes at once and the base turns into
noise: pure chaos. Your job is the balance. Let in what will still be worth reading in a year, in a
different project. Stop the rest. You are not a pessimist and not an optimist: you are calibrated.`,
});

const textbook: CriticCheckJson = {
  name: "is_textbook_definition",
  text: `a good manual or Wikipedia page on the topic already says this. Test: would someone who knows the topic learn nothing new? Yes if the note only defines or describes a known term, tool, method or feature. No if it adds a limit, a failure, a trade-off or a surprise seen in practice. Yes: "La cosine similarity misura l'angolo tra due vettori." No: "Con soglia cosine 0.95, due note che dicono il contrario sembrano duplicate."`,
  kind: "note",
  dropWhen: "atLeast",
  threshold: 0.6,
};

const projectDetail: CriticCheckJson = {
  name: "is_project_detail",
  text: "it holds only for this project: its data, its states, its choices.",
  kind: "note",
  dropWhen: "atLeast",
  threshold: 0.4,
};

const userRejection: CriticCheckJson = {
  name: "is_user_rejection",
  text: `the quote shows the user rejecting what the agent did or proposed. A plain request or instruction ("fai X", "direi di fare Y") is not a rejection.`,
  kind: "rule",
  dropWhen: "under",
  threshold: 0.4,
};

function extractorOf(checks: readonly CriticCheckJson[]): Extractor {
  const roleJson = role.toJson();
  return Extractor.fromJson({
    episodes: roleJson,
    extract: roleJson,
    critic: roleJson,
    novelty: roleJson,
    checks,
    episodeChars: 2500,
    targetInputChars: 6000,
    targetOutputChars: 8000,
    listingChars: 300,
    vocabularySize: 80,
    topK: 5,
  });
}

const extractor = extractorOf([textbook, userRejection]);
const twoNotes = extractorOf([textbook, projectDetail, userRejection]);

const session = "critic-fixture";

function turn(n: number, input: string, output: string): Turn {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const exchange: Exchange = { id, session, timestamp: `2026-10-10T10:0${n}:00.000Z`, kind: "chat", actor: "alfredo" };
  const contents: Contents = { exchange_id: id, input, output };
  return Turn.of(exchange, contents);
}

const read = SessionRead.of(session, [
  turn(0, "Con soglia cosine 0.95, due note che dicono il contrario risultano duplicate: come è possibile?", "La cosine similarity misura l'angolo tra due vettori: due frasi con le stesse parole possono affermare il contrario e restare vicine."),
  turn(1, "Quindi prima di dichiarare una nota duplicate bisogna leggere le note vicine, non fidarsi solo della soglia?", "Esatto: la soglia preseleziona i vicini, la lettura decide se sono davvero lo stesso concetto."),
]);

const map = SessionMap.fromJson(
  { episodes: [{ from: 0, to: 1, summary: "L'utente capisce che la soglia di similarità non basta: le note vicine vanno lette prima di dichiararle duplicate." }] },
  read,
);

const target = targetOf(map, map.episodes()[0], 1);

const note = {
  what: "La cosine similarity può giudicare duplicate due note opposte",
  why: "due frasi con le stesse parole possono affermare il contrario e restare vicine",
  kind: "dato",
  tags: ["metriche"],
  contexts: ["vicinanza tra note", "archivio condiviso"],
  quote: "bisogna leggere le note vicine, non fidarsi solo della soglia",
};

const rule = {
  if: "il modello ignora lo schema dato in format",
  do: "si chiede il JSON nel prompt e lo si valida nel codice",
  tags: ["llm"],
  quote: "non fidarsi solo della soglia",
};

const noteCandidate = NoteCandidate.fromModel(note)!;
const ruleCandidate = RuleCandidate.fromModel(rule)!;

function wholePromptOf(candidate: NoteCandidate | RuleCandidate): string {
  const checks = extractor.checksFor(kindOf(candidate));
  return [
    target.map.text(),
    `## How this episode ended\n${target.episode.summary()}`,
    `## The episode (context)\n${episodeText(target, extractor.episodeChars())}`,
    `## The exchange the candidate comes from\n${targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())}`,
    `## The candidate (${kindOf(candidate)})\n${JSON.stringify(candidate.toJson())}`,
    `## Questions\nAnswer with one JSON object. Each key is a question name. Each value is a probability from 0.0 to 1.0 that the answer is yes.\n${checks.map((c) => `- ${c.name()}: ${c.text()}`).join("\n")}`,
  ].join("\n\n");
}

beforeEach(() => {
  seen.length = 0;
  replies.length = 0;
});

afterAll(() => {
  server.stop(true);
});

test("kindOf: a note is a note and a rule is a rule", () => {
  expect(kindOf(noteCandidate)).toBe("note");
  expect(kindOf(ruleCandidate)).toBe("rule");
});

test("criticPrompt: the whole prompt for a note", () => {
  expect(criticPrompt(target, noteCandidate, extractor)).toBe(wholePromptOf(noteCandidate));
});

test("criticPrompt: the whole prompt for a rule", () => {
  expect(criticPrompt(target, ruleCandidate, extractor)).toBe(wholePromptOf(ruleCandidate));
});

test("probabilitiesCheck: one probability per check is null, anything else is the error", () => {
  const checks = twoNotes.checksFor("note");
  const error = `need exactly these keys, each a number from 0 to 1: ${checks.map((c) => c.name()).join(", ")}`;
  expect(probabilitiesCheck({ is_textbook_definition: 0.5, is_project_detail: 0.5 }, checks)).toBe(null);
  expect(probabilitiesCheck({ is_project_detail: 0.5, is_textbook_definition: 0.5 }, checks)).toBe(null);
  expect(probabilitiesCheck({ is_textbook_definition: 0, is_project_detail: 1 }, checks)).toBe(null);
  expect(probabilitiesCheck({ is_textbook_definition: 0.5 }, checks)).toBe(error);
  expect(probabilitiesCheck({ is_textbook_definition: 0.5, is_project_detail: 0.5, is_user_rejection: 0.5 }, checks)).toBe(error);
  expect(probabilitiesCheck({ is_textbook_definition: -0.1, is_project_detail: 0.5 }, checks)).toBe(error);
  expect(probabilitiesCheck({ is_textbook_definition: 1.1, is_project_detail: 0.5 }, checks)).toBe(error);
  expect(probabilitiesCheck({ is_textbook_definition: "0.5", is_project_detail: 0.5 }, checks)).toBe(error);
  expect(probabilitiesCheck(null, checks)).toBe(error);
  expect(probabilitiesCheck([0.5, 0.5], checks)).toBe(error);
  expect(probabilitiesCheck(5, checks)).toBe(error);
  expect(probabilitiesCheck(undefined, checks)).toBe(error);
});

test("probabilitiesCheck: at least one check", () => {
  expect(() => probabilitiesCheck({ is_textbook_definition: 0.5 }, [])).toThrow("probabilitiesCheck: at least one check");
});

test("dropOf: the first check that drops, null when none drops", () => {
  expect(dropOf({ is_textbook_definition: 0.59 }, extractor.checksFor("note"))).toBe(null);
  expect(dropOf({ is_textbook_definition: 0.6 }, extractor.checksFor("note"))).toBe("is_textbook_definition");
  expect(dropOf({ is_textbook_definition: 0.59, is_user_rejection: 0.99 }, extractor.checksFor("note"))).toBe(null);
  expect(dropOf({ is_textbook_definition: 0.7, is_project_detail: 0.5 }, twoNotes.checksFor("note"))).toBe("is_textbook_definition");
  expect(dropOf({ is_textbook_definition: 0.5, is_project_detail: 0.5 }, twoNotes.checksFor("note"))).toBe("is_project_detail");
  expect(dropOf({ is_user_rejection: 0.4 }, extractor.checksFor("rule"))).toBe(null);
  expect(dropOf({ is_user_rejection: 0.39 }, extractor.checksFor("rule"))).toBe("is_user_rejection");
});

test("dropOf: every check has a probability", () => {
  expect(() => dropOf({ is_textbook_definition: 0.5 }, twoNotes.checksFor("note"))).toThrow("dropOf: every check has a probability");
});

test("critique: an ok answer has one probability per check", async () => {
  pushReply('{"is_textbook_definition": 0.9}');
  const dropped = await critique(target, noteCandidate, extractor);
  expect(dropped.answer.isOk()).toBe(true);
  expect(dropped.probabilities).toEqual({ is_textbook_definition: 0.9 });
  expect(dropped.drop).toBe("is_textbook_definition");

  pushReply('{"is_textbook_definition": 0.3}');
  const kept = await critique(target, noteCandidate, extractor);
  expect(kept.answer.isOk()).toBe(true);
  expect(kept.probabilities).toEqual({ is_textbook_definition: 0.3 });
  expect(kept.drop).toBe(null);
});

test("critique: a bad reply is retried once with the error text", async () => {
  pushReply('{"is_wrong_key": 0.5}');
  pushReply('{"is_textbook_definition": 0.2}');
  const judgement = await critique(target, noteCandidate, extractor);
  expect(judgement.answer.isOk()).toBe(true);
  expect(seen.length).toBe(2);
  expect(seen[1].messages.at(-1)?.content).toContain("need exactly these keys, each a number from 0 to 1: is_textbook_definition");
});

test("critique: two bad replies judge nothing", async () => {
  pushReply('{"is_wrong_key": 0.5}');
  pushReply('{"is_wrong_key": 0.5}');
  const judgement = await critique(target, noteCandidate, extractor);
  expect(judgement.answer.isOk()).toBe(false);
  expect(judgement.probabilities).toBe(null);
  expect(judgement.drop).toBe(null);
});

test("critique: an http error fails without a retry", async () => {
  pushStatus(400);
  const judgement = await critique(target, noteCandidate, extractor);
  expect(judgement.answer.isOk()).toBe(false);
  expect(seen.length).toBe(1);
  expect(judgement.probabilities).toBe(null);
  expect(judgement.drop).toBe(null);
});

test("critique: the hat is the system message and the prompt is the user message", async () => {
  pushReply('{"is_textbook_definition": 0.5}');
  await critique(target, noteCandidate, extractor);
  expect(seen[0].messages[0]).toEqual({ role: "system", content: role.system() });
  expect(seen[0].messages[1]).toEqual({ role: "user", content: criticPrompt(target, noteCandidate, extractor) });
});