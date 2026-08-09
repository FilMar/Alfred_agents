#!/usr/bin/env bun
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createSession, resolveModel } from "../../../th/src/runner.ts";
import type { Widget } from "./types.ts";

/** stdin contract with the parent process (turn/agent.ts), running inside the bwrap sandbox. */
export type RunnerInput = {
  systemPrompt: string;
  userPrompt: string;
  cwd: string | null;
  modelStr?: string;
  thinkingLevel?: string;
  timeoutSec?: number;
};

/** stdout contract back to the parent. */
export type RunnerOutput = {
  text: string;
  widgets: Widget[];
  ledgerProposals: string[];
};

type AssistantLike = { role: string; content: { type: string; text?: string }[] };

/** Last assistant message with text content is the turn's reply — earlier ones may be tool-call-only. */
export function extractReplyText(messages: AssistantLike[]): string {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return "";
  return lastAssistant.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
}

export function makeEmitWidgetTool(widgets: Widget[]): ToolDefinition {
  return {
    name: "emit_widget",
    label: "Emit widget",
    description:
      "Emit a structured UI widget (table, chart, or action button) for the cockpit frontend to render. Never emit raw HTML.",
    parameters: Type.Union([
      Type.Object({
        type: Type.Literal("table"),
        columns: Type.Array(Type.String()),
        rows: Type.Array(Type.Array(Type.String())),
      }),
      Type.Object({ type: Type.Literal("chart"), spec: Type.Unknown() }),
      Type.Object({ type: Type.Literal("action"), label: Type.String(), command: Type.String() }),
    ]),
    execute: async (_id, params) => {
      widgets.push(params as Widget);
      return { content: [{ type: "text" as const, text: "widget queued" }], details: {} };
    },
  };
}

export function makeProposeLedgerTool(ledgerProposals: string[]): ToolDefinition {
  return {
    name: "propose_ledger",
    label: "Propose ledger entry",
    description:
      "Propose a fixed sentence to append to the bank's append-only ledger. The user confirms before it is written — this only queues the proposal.",
    parameters: Type.Object({ text: Type.String() }),
    execute: async (_id, params) => {
      ledgerProposals.push((params as { text: string }).text);
      return { content: [{ type: "text" as const, text: "proposal queued" }], details: {} };
    },
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const input: RunnerInput = JSON.parse(await readStdin());
  const widgets: Widget[] = [];
  const ledgerProposals: string[] = [];

  const { session } = await createSession({
    customTools: [makeEmitWidgetTool(widgets), makeProposeLedgerTool(ledgerProposals)],
    systemPrompt: input.systemPrompt,
    cwd: input.cwd ?? undefined,
    model: input.modelStr ? resolveModel(input.modelStr) : undefined,
    thinkingLevel: input.thinkingLevel as never,
  });

  const timeoutSec = input.timeoutSec ?? 120;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout dopo ${timeoutSec}s`)), timeoutSec * 1000),
  );
  await Promise.race([session.prompt(input.userPrompt), timeout]);

  const output: RunnerOutput = { text: extractReplyText(session.messages as AssistantLike[]), widgets, ledgerProposals };
  process.stdout.write(JSON.stringify(output));
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
