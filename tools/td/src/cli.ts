#!/usr/bin/env bun

import { Command } from "commander";

import { ContractError } from "../../contract/contract.js";
import { errorMessage } from "../../tb/src/types.js";
import { distillerOf, distillSession } from "./distiller.js";
import type { ExchangeReport, SessionReport } from "./distiller.js";
import { Version } from "./registry.js";
import { SessionRead } from "./session.js";

function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function exchangeSummary(report: ExchangeReport) {
  return {
    exchange: report.turn.id(),
    extraction: report.extraction.answer.isOk() ? "ok" : "failed",
    notes: report.extraction.notes.length,
    rules: report.extraction.rules.length,
    kept: report.judgements.length,
    criticFailed: report.judgements.filter((j) => j.probabilities === null).length,
    passed: report.outcomes.filter((o) => o.isOpen()).length,
  };
}

function summary(report: SessionReport, version: Version, run: string) {
  return {
    session: report.read.session(),
    extractor: version.id(),
    run,
    turns: report.read.turns().length,
    split: report.split.map === null ? "failed" : "ok",
    exchanges: report.exchanges.map(exchangeSummary),
  };
}

const program = new Command();

program.name("td").description("Third Distiller — turns the pending exchanges into candidates").version("1.0.0");

program
  .command("distill <session>")
  .description("Run one session through the extractor in shadow. Writes only to extractions")
  .option("--extractor <id>", "Extractor row id, or active", "active")
  .action(async (session: string, opts) => {
    try {
      const id = opts.extractor === "active" ? "active" : parseInt(opts.extractor, 10);
      if (id !== "active" && !Number.isInteger(id)) die("--extractor must be a row id or active.");
      const version = await Version.read(id);
      if (version === null) die(`No extractor ${opts.extractor}.`);
      const read = await SessionRead.read(session);
      if (read.turns().length === 0) die(`Session ${session} has no pending exchange.`);
      const distiller = await distillerOf(version, new Date());
      out(summary(await distillSession(distiller, read), version, distiller.recorder.run()));
    } catch (err) {
      die(errorMessage(err));
    }
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof ContractError) die(`td bug, please report: ${err.message}\n${err.stack ?? ""}`);
  die(errorMessage(err));
});
