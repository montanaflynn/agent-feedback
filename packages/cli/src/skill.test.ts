import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  detectSkillTarget,
  detectSkillTargets,
  installLocalSkill,
  uninstallLocalSkill
} from "./skill.js";

const directories: string[] = [];
const agentsSkillPath = join(
  ".agents",
  "skills",
  "run-agent-feedback",
  "SKILL.md"
);
const claudeSkillPath = join(
  ".claude",
  "skills",
  "run-agent-feedback",
  "SKILL.md"
);

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("local skill installation", () => {
  it("installs the packaged skill in the cross-agent directory when selected", async () => {
    const cwd = await temporaryDirectory();

    const result = await installLocalSkill({
      cwd,
      log: () => undefined,
      target: "agents"
    });

    expect(result).toEqual({
      backups: [],
      files: [agentsSkillPath],
      skipped: []
    });
    expect(await readFile(join(cwd, agentsSkillPath), "utf8")).toContain(
      "name: run-agent-feedback"
    );
  });

  it("installs into the Claude skill directory when selected", async () => {
    const cwd = await temporaryDirectory();

    const result = await installLocalSkill({
      cwd,
      log: () => undefined,
      target: "claude"
    });

    expect(result).toEqual({
      backups: [],
      files: [claudeSkillPath],
      skipped: []
    });
    expect(await readFile(join(cwd, claudeSkillPath), "utf8")).toContain(
      "name: run-agent-feedback"
    );
  });

  it("installs both skill copies when both targets are detected", async () => {
    const cwd = await temporaryDirectory();

    const result = await installLocalSkill({
      cwd,
      log: () => undefined,
      targets: ["agents", "claude"]
    });

    expect(result).toEqual({
      backups: [],
      files: [agentsSkillPath, claudeSkillPath],
      skipped: []
    });
    await expect(
      readFile(join(cwd, agentsSkillPath), "utf8")
    ).resolves.toContain("name: run-agent-feedback");
    await expect(
      readFile(join(cwd, claudeSkillPath), "utf8")
    ).resolves.toContain("name: run-agent-feedback");
  });

  it("preserves local changes unless force is set", async () => {
    const cwd = await temporaryDirectory();
    await installLocalSkill({
      cwd,
      log: () => undefined,
      target: "agents"
    });
    await writeFile(join(cwd, agentsSkillPath), "locally customized\n");

    const skipped = await installLocalSkill({
      cwd,
      log: () => undefined,
      target: "agents"
    });
    expect(skipped).toEqual({
      backups: [],
      files: [],
      skipped: [agentsSkillPath]
    });
    expect(await readFile(join(cwd, agentsSkillPath), "utf8")).toBe(
      "locally customized\n"
    );

    await installLocalSkill({
      cwd,
      force: true,
      log: () => undefined,
      target: "agents"
    });
    expect(await readFile(join(cwd, agentsSkillPath), "utf8")).toContain(
      "name: run-agent-feedback"
    );
  });

  it("backs up a modified skill before a forced replacement", async () => {
    const cwd = await temporaryDirectory();
    await installLocalSkill({
      cwd,
      log: () => undefined,
      target: "agents"
    });
    await writeFile(join(cwd, agentsSkillPath), "locally customized\n");

    const result = await installLocalSkill({
      backup: true,
      cwd,
      force: true,
      log: () => undefined,
      now: () => new Date("2026-07-20T18:00:00.000Z"),
      target: "agents"
    });

    expect(result.backups).toEqual([
      join(
        ".agent-feedback",
        "backups",
        "run-agent-feedback-agents-2026-07-20T18-00-00-000Z.md"
      )
    ]);
    expect(await readFile(join(cwd, result.backups[0]!), "utf8")).toBe(
      "locally customized\n"
    );
    expect(await readFile(join(cwd, agentsSkillPath), "utf8")).toContain(
      "name: run-agent-feedback"
    );
  });

  it("uninstalls every skill copy and backs up local changes", async () => {
    const cwd = await temporaryDirectory();
    await installLocalSkill({
      cwd,
      log: () => undefined,
      targets: ["agents", "claude"]
    });
    await writeFile(join(cwd, claudeSkillPath), "claude customization\n");

    const result = await uninstallLocalSkill({
      cwd,
      log: () => undefined,
      now: () => new Date("2026-07-20T19:00:00.000Z")
    });

    expect(result.files).toEqual([agentsSkillPath, claudeSkillPath]);
    expect(result.backups).toEqual([
      join(
        ".agent-feedback",
        "backups",
        "run-agent-feedback-claude-2026-07-20T19-00-00-000Z.md"
      )
    ]);
    await expect(readFile(join(cwd, agentsSkillPath), "utf8")).rejects.toThrow();
    await expect(readFile(join(cwd, claudeSkillPath), "utf8")).rejects.toThrow();
    await expect(
      readFile(join(cwd, result.backups[0]!), "utf8")
    ).resolves.toBe("claude customization\n");
  });

  it("keeps the package template aligned with the repository skill", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    const [repositorySkill, packageTemplate] = await Promise.all([
      readFile(
        join(root, ".agents", "skills", "run-agent-feedback", "SKILL.md"),
        "utf8"
      ),
      readFile(
        join(root, "packages", "cli", "templates", "run-agent-feedback", "SKILL.md"),
        "utf8"
      )
    ]);

    expect(packageTemplate).toBe(repositorySkill);
  });
});

describe("skill target detection", () => {
  it.each([".codex", ".cursor", ".opencode"])(
    "detects the project agent directory %s",
    async (directory) => {
      const cwd = await temporaryDirectory();
      const home = await temporaryDirectory();
      await mkdir(join(cwd, directory));

      expect(detectSkillTarget({ cwd, home, path: "" })).toBe("agents");
    }
  );

  it("detects a global Codex directory", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();
    await mkdir(join(home, ".codex"));

    expect(detectSkillTarget({ cwd, home, path: "" })).toBe("agents");
  });

  it("detects a project Claude directory", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();
    await mkdir(join(cwd, ".claude"));

    expect(detectSkillTarget({ cwd, home, path: "" })).toBe("claude");
  });

  it("detects a global Claude directory", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();
    await mkdir(join(home, ".claude"));

    expect(detectSkillTarget({ cwd, home, path: "" })).toBe("claude");
  });

  it.each(["codex", "cursor", "opencode"])(
    "detects the %s executable on PATH",
    async (command) => {
      const cwd = await temporaryDirectory();
      const home = await temporaryDirectory();
      const bin = await temporaryDirectory();
      await createExecutable(bin, command);

      expect(
        detectSkillTarget({
          cwd,
          home,
          path: bin,
          platform: process.platform
        })
      ).toBe("agents");
    }
  );

  it("detects the Claude executable on PATH", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();
    const bin = await temporaryDirectory();
    await createExecutable(bin, "claude");

    expect(
      detectSkillTarget({
        cwd,
        home,
        path: bin,
        platform: process.platform
      })
    ).toBe("claude");
  });

  it("detects both targets when Claude and Codex are present", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();
    await mkdir(join(cwd, ".claude"));
    await mkdir(join(home, ".codex"));

    expect(detectSkillTargets({ cwd, home, path: "" })).toEqual([
      "agents",
      "claude"
    ]);
    expect(detectSkillTarget({ cwd, home, path: "" })).toBe("agents");
  });

  it("falls back to the cross-agent directory without Claude signals", async () => {
    const cwd = await temporaryDirectory();
    const home = await temporaryDirectory();

    expect(detectSkillTargets({ cwd, home, path: "" })).toEqual(["agents"]);
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-skill-"));
  directories.push(directory);
  return directory;
}

async function createExecutable(
  directory: string,
  command: string
): Promise<void> {
  const executable =
    process.platform === "win32"
      ? join(directory, `${command}.cmd`)
      : join(directory, command);
  await writeFile(executable, "");
  if (process.platform !== "win32") await chmod(executable, 0o755);
}
