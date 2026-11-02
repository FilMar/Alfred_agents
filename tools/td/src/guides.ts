import { readGuide } from "../../common/cli.js";
import { assert, isNonBlank } from "../../common/contract.js";

export const QUALITY_BAR_HEAD =
  "## Quality bar\nThe two guides below set the bar of the memory. They are written for an agent that saves by hand. Use their bar. Skip their commands: you cannot run them.";

export function qualityBar(noteGuide: string, ruleGuide: string): string {
  assert(isNonBlank(noteGuide), "qualityBar: the note guide is not blank");
  assert(isNonBlank(ruleGuide), "qualityBar: the rule guide is not blank");
  return QUALITY_BAR_HEAD + "\n\n" + noteGuide + "\n\n" + ruleGuide;
}

export const QUALITY_BAR = qualityBar(
  readGuide(new URL("../../tb/guide.md", import.meta.url)),
  readGuide(new URL("../../ti/guide.md", import.meta.url)),
);
