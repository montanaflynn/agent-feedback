import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  agentFeedbackVersion,
  formatDisabledNotice,
  skillVersion,
  staleSkillPaths
} from "./notice.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("disabled notice", () => {
  it("knows its own release version", () => {
    expect(agentFeedbackVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reads the version recorded in a skill", () => {
    expect(
      skillVersion("---\nname: run-agent-feedback\nversion: 0.2.0\n---\n")
    ).toBe("0.2.0");
    expect(skillVersion("---\nname: run-agent-feedback\n---\n")).toBeUndefined();
  });

  it("explains how to enable the flag", async () => {
    const cwd = await temporaryDirectory();

    const notice = formatDisabledNotice(cwd);
    expect(notice).toContain("[agent-feedback:disabled]");
    expect(notice).toContain("AGENT_FEEDBACK=1");
    expect(notice).not.toContain("update");
    expect(notice).toContain("[/agent-feedback:disabled]");
  });

  it("flags skills from older releases and recommends update", async () => {
    const cwd = await temporaryDirectory();
    await writeSkill(cwd, ".claude", "---\nname: run-agent-feedback\n---\n");
    await writeSkill(
      cwd,
      ".agents",
      "---\nname: run-agent-feedback\nversion: 0.1.0\n---\n"
    );

    expect(staleSkillPaths(cwd)).toEqual([
      join(".claude", "skills", "run-agent-feedback", "SKILL.md"),
      join(".agents", "skills", "run-agent-feedback", "SKILL.md")
    ]);
    const notice = formatDisabledNotice(cwd);
    expect(notice).toContain("npx @agent-feedback/cli@latest update");
    expect(notice).toContain(agentFeedbackVersion);
  });

  it("treats a skill from the current release as up to date", async () => {
    const cwd = await temporaryDirectory();
    await writeSkill(
      cwd,
      ".agents",
      `---\nname: run-agent-feedback\nversion: ${agentFeedbackVersion}\n---\n`
    );

    expect(staleSkillPaths(cwd)).toEqual([]);
  });
});

async function writeSkill(
  cwd: string,
  root: string,
  content: string
): Promise<void> {
  const directory = join(cwd, root, "skills", "run-agent-feedback");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), content);
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-notice-"));
  directories.push(directory);
  return directory;
}
