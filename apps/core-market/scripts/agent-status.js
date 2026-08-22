#!/usr/bin/env node
/**
 * agent:status
 *
 * Prints a quick summary of .agent/CURRENT.md. Does NOT audit the project.
 * Cross-platform (Windows/macOS/Linux) — pure Node, no shell dependency.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CURRENT_PATH = path.join(ROOT, ".agent", "CURRENT.md");

function extractSection(content, heading) {
  // Line-based parsing instead of a single regex: the previous version
  // relied on "\Z" as an end-of-string anchor, which is not a valid
  // JavaScript regex token (it matches a literal "Z" instead). That made
  // extraction silently fail for whichever section happens to be last in
  // the file, since there's no following "## " heading to bound it.
  const lines = content.split("\n");
  const headingRe = new RegExp(`^##\\s+${heading}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "UNKNOWN";

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const text = lines.slice(start, end).join("\n").trim();
  return text.length ? text : "UNKNOWN";
}

function main() {
  if (!fs.existsSync(CURRENT_PATH)) {
    console.error(
      "agent:status — .agent/CURRENT.md not found.\n" +
        "Run this from the repository root, or restore CURRENT.md per AGENTS.md."
    );
    process.exit(1);
  }

  const content = fs.readFileSync(CURRENT_PATH, "utf8");

  const fields = [
    ["Current Objective", "Current Objective"],
    ["Current Phase", "Current Phase"],
    ["Current Status", "Current Status"],
    ["Last Agent", "Last Agent"],
    ["Last Updated", "Last Updated"],
    ["Known Problems", "Open Problems"],
    ["Next Recommended Action", "Next Action"],
  ];

  console.log("CORE-Market Agent Status\n");
  for (const [heading, label] of fields) {
    const value = extractSection(content, heading);
    console.log(`${label}:\n${value}\n`);
  }
}

main();
