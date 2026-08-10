import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const agentFeedbackVersion: string = readOwnVersion();

function readOwnVersion(): string {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { version?: string };
    return manifest.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function skillVersion(source: string): string | undefined {
  return /^version:\s*(\d+\.\d+\.\d+\S*)\s*$/m.exec(source)?.[1];
}

function isOlderVersion(candidate: string, reference: string): boolean {
  const left = candidate.split(/[.-]/).map(Number);
  const right = reference.split(/[.-]/).map(Number);
  for (let index = 0; index < 3; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}

/**
 * Project-local run-agent-feedback skills written by an older Agent Feedback
 * release than the one currently installed — the signature of packages bumped
 * directly instead of through `agent-feedback update`. Skills without a
 * recorded version predate 0.2.0.
 */
export function staleSkillPaths(cwd = process.cwd()): string[] {
  return [".claude", ".agents"]
    .map((directory) =>
      join(directory, "skills", "run-agent-feedback", "SKILL.md")
    )
    .filter((relative) => {
      const path = join(cwd, relative);
      if (!existsSync(path)) return false;
      const recorded = skillVersion(readFileSync(path, "utf8"));
      return !recorded || isOlderVersion(recorded, agentFeedbackVersion);
    });
}

export function formatDisabledNotice(cwd = process.cwd()): string {
  const stale = staleSkillPaths(cwd);
  const lines = [
    "[agent-feedback:disabled]",
    "",
    "Agent Feedback is installed but inactive. To enable it, restart the",
    "development server with the flag:",
    "",
    "  AGENT_FEEDBACK=1 <your dev command>",
    ""
  ];
  if (stale.length > 0) {
    lines.push(
      `This project's agent workflow was written by a release older than the`,
      `installed ${agentFeedbackVersion} (${stale.join(", ")}).`,
      "Synchronize the setup and workflow before continuing:",
      "",
      "  npx @agent-feedback/cli@latest update",
      ""
    );
  }
  lines.push("[/agent-feedback:disabled]");
  return lines.join("\n");
}
