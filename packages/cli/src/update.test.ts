import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { withPackageTag } from "./init.js";
import { updateProject } from "./update.js";

const directories: string[] = [];
const skillPath = join(
  ".agents",
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

describe("project updates", () => {
  it("uses explicit latest package specifiers", () => {
    expect(
      withPackageTag(
        ["@agent-feedback/vite", "@agent-feedback/react"],
        "latest"
      )
    ).toEqual([
      "@agent-feedback/vite@latest",
      "@agent-feedback/react@latest"
    ]);
  });

  it("reconciles setup and replaces a modified skill with a backup", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        dependencies: { react: "^19.0.0" },
        devDependencies: { vite: "^6.0.0" }
      })
    );
    await writeFile(
      join(cwd, "vite.config.ts"),
      'import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [] });\n'
    );
    await mkdir(join(cwd, skillPath, ".."), { recursive: true });
    await writeFile(join(cwd, skillPath), "locally customized\n");

    const result = await updateProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });

    expect(result.framework).toBe("vite");
    expect(result.packages).toEqual([
      "@agent-feedback/vite",
      "@agent-feedback/react"
    ]);
    expect(result.backups).toHaveLength(1);
    expect(await readFile(join(cwd, result.backups[0]!), "utf8")).toBe(
      "locally customized\n"
    );
    expect(await readFile(join(cwd, skillPath), "utf8")).toContain(
      "name: run-agent-feedback"
    );
    expect(await readFile(join(cwd, "vite.config.ts"), "utf8")).toContain(
      "agentFeedback({ react: true })"
    );
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-update-"));
  directories.push(directory);
  return directory;
}
