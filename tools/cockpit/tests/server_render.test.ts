import { describe, expect, test } from "bun:test";
import {
  renderBankList,
  renderError,
  renderMemoryPanel,
  renderPage,
  renderTurn,
} from "../src/server/render.tsx";
import type { AgentReply } from "../src/turn/types.ts";

const reply = (over: Partial<AgentReply> = {}): AgentReply => ({
  text: "plain answer",
  widgets: [],
  ledgerProposals: [],
  ...over,
});

describe("renderTurn", () => {
  test("shows user text and agent text", () => {
    const html = renderTurn("my question", reply());
    expect(html).toContain("my question");
    expect(html).toContain("plain answer");
  });

  test("agent text is escaped — no markup injection", () => {
    const html = renderTurn("q", reply({ text: "<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("table widget renders columns and rows", () => {
    const html = renderTurn(
      "q",
      reply({ widgets: [{ type: "table", columns: ["name", "age"], rows: [["ada", "36"]] }] }),
    );
    expect(html).toContain("name");
    expect(html).toContain("ada");
    expect(html).toContain("<table");
  });

  test("action widget is a button posting the whitelisted command to /turn", () => {
    const html = renderTurn(
      "q",
      reply({ widgets: [{ type: "action", label: "clear bank", command: ":clear" }] }),
    );
    expect(html).toContain("clear bank");
    expect(html).toContain('hx-post="/turn"');
    expect(html).toContain(":clear");
  });

  test("ledger proposal carries a confirm button with the exact sentence", () => {
    const html = renderTurn("q", reply({ ledgerProposals: ["We chose Hono."] }));
    expect(html).toContain("We chose Hono.");
    expect(html).toContain('hx-post="/ledger/confirm"');
  });
});

describe("renderPage", () => {
  test("has the input form wired to /turn and the CDN scripts", () => {
    const html = renderPage({ bank: "main", hat: null }, ["black"]);
    expect(html).toContain('hx-post="/turn"');
    expect(html).toContain("htmx");
    expect(html).toContain("main");
  });
});

describe("renderBankList", () => {
  test("marks the active bank", () => {
    const html = renderBankList(["main", "work"], "work");
    expect(html).toContain("main");
    expect(html).toMatch(/work[^<]*\*|\*[^<]*work|active/);
  });
});

describe("renderMemoryPanel", () => {
  test("raw bank text is escaped inside the textarea", () => {
    const html = renderMemoryPanel("main", "## Summary\n\n<b>bold</b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain('hx-post="/memory"');
  });
});

describe("renderError", () => {
  test("shows the message", () => {
    expect(renderError("unknown command: :men")).toContain(":men");
  });
});
