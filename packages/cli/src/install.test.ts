import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installProject } from "./install.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("project installation", () => {
  it("provides a first-class install operation", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ devDependencies: { vite: "^6.0.0" } })
    );

    const result = await installProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });

    expect(result.framework).toBe("vite");
    expect(result.files).toContain("vite.config.ts");
    expect(result.files).toContain(
      join(".agents", "skills", "run-agent-feedback", "SKILL.md")
    );
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-install-"));
  directories.push(directory);
  return directory;
}
