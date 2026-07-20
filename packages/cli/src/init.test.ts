import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  detectFramework,
  detectPackageManager,
  initializeProject
} from "./init.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("project initialization", () => {
  it("detects supported frameworks and package managers", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(join(cwd, "pnpm-lock.yaml"), "");

    expect(detectFramework({ next: "15.0.0", vite: "6.0.0" })).toBe("next");
    expect(detectFramework({ vite: "6.0.0" })).toBe("vite");
    expect(detectPackageManager(cwd)).toBe("pnpm");
  });

  it("adds the plugin to an existing Vite React config", async () => {
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

    const result = await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });
    const config = await readFile(join(cwd, "vite.config.ts"), "utf8");

    expect(result.framework).toBe("vite");
    expect(result.packages).toEqual([
      "@agent-feedback/vite",
      "@agent-feedback/react"
    ]);
    expect(config).toContain('from "@agent-feedback/vite"');
    expect(config).toContain("agentFeedback({ react: true })");
    expect(await readFile(join(cwd, ".gitignore"), "utf8")).toContain(
      ".agent-feedback/"
    );
    expect(
      await readFile(
        join(
          cwd,
          ".agents",
          "skills",
          "run-agent-feedback",
          "SKILL.md"
        ),
        "utf8"
      )
    ).toContain("name: run-agent-feedback");
  });

  it("adds the component and route to a Next App Router project", async () => {
    const cwd = await temporaryDirectory();
    const app = join(cwd, "src", "app");
    await mkdir(app, { recursive: true });
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ dependencies: { next: "^15.0.0", react: "^19.0.0" } })
    );
    await writeFile(
      join(app, "layout.tsx"),
      "export default function Layout({ children }) {\n  return <html><body>{children}</body></html>;\n}\n"
    );

    await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });

    expect(await readFile(join(app, "layout.tsx"), "utf8")).toContain(
      "<AgentFeedback />"
    );
    expect(
      await readFile(join(app, "%5F_agent-feedback", "route.ts"), "utf8")
    ).toContain("@agent-feedback/next/route");
    expect(
      await readFile(
        join(app, "%5F_agent-feedback", "[id]", "route.ts"),
        "utf8"
      )
    ).toContain("@agent-feedback/next/resolve");
  });

  it("uses the requested Claude skill directory", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ devDependencies: { vite: "^6.0.0" } })
    );

    const result = await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "claude"
    });

    expect(result.files).toContain(
      join(".claude", "skills", "run-agent-feedback", "SKILL.md")
    );
    expect(
      await readFile(
        join(
          cwd,
          ".claude",
          "skills",
          "run-agent-feedback",
          "SKILL.md"
        ),
        "utf8"
      )
    ).toContain("name: run-agent-feedback");
  });

  it("installs both requested skill targets", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ devDependencies: { vite: "^6.0.0" } })
    );

    const result = await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTargets: ["agents", "claude"]
    });

    expect(result.files).toEqual(
      expect.arrayContaining([
        join(".agents", "skills", "run-agent-feedback", "SKILL.md"),
        join(".claude", "skills", "run-agent-feedback", "SKILL.md")
      ])
    );
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-cli-"));
  directories.push(directory);
  return directory;
}
