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

  it("wires a Next App Router project through configuration only", async () => {
    const cwd = await temporaryDirectory();
    const app = join(cwd, "src", "app");
    await mkdir(app, { recursive: true });
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ dependencies: { next: "^15.3.0", react: "^19.0.0" } })
    );
    await writeFile(join(cwd, "tsconfig.json"), "{}");
    const layout =
      "export default function Layout({ children }) {\n  return <html><body>{children}</body></html>;\n}\n";
    await writeFile(join(app, "layout.tsx"), layout);

    const result = await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });

    expect(await readFile(join(app, "layout.tsx"), "utf8")).toBe(layout);
    expect(await readFile(join(cwd, "next.config.mjs"), "utf8")).toContain(
      'withAgentFeedback({})'
    );
    expect(
      await readFile(join(cwd, "src", "instrumentation-client.ts"), "utf8")
    ).toBe('import "@agent-feedback/next/auto";\n');
    expect(result.files).toContain("next.config.mjs");
    expect(result.skipped).toEqual([]);
  });

  it("migrates legacy Next wiring to the configuration style", async () => {
    const cwd = await temporaryDirectory();
    const app = join(cwd, "app");
    const routeDirectory = join(app, "%5F_agent-feedback");
    await mkdir(join(routeDirectory, "[id]"), { recursive: true });
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ dependencies: { next: "^15.3.0", react: "^19.0.0" } })
    );
    await writeFile(join(cwd, "tsconfig.json"), "{}");
    await writeFile(
      join(app, "layout.tsx"),
      [
        'import { AgentFeedback } from "@agent-feedback/next";',
        "export default function Layout({ children }) {",
        "  return <html><body>{children}<AgentFeedback /></body></html>;",
        "}",
        ""
      ].join("\n")
    );
    await writeFile(
      join(routeDirectory, "route.ts"),
      'export { POST } from "@agent-feedback/next/route";\n'
    );
    await writeFile(
      join(routeDirectory, "[id]", "route.ts"),
      'export { PATCH } from "@agent-feedback/next/resolve";\n'
    );
    await writeFile(
      join(cwd, "next.config.mjs"),
      "export default { reactStrictMode: true };\n"
    );

    const result = await initializeProject({
      cwd,
      install: false,
      log: () => undefined,
      skillTarget: "agents"
    });

    const layout = await readFile(join(app, "layout.tsx"), "utf8");
    expect(layout).not.toContain("AgentFeedback");
    await expect(
      readFile(join(routeDirectory, "route.ts"), "utf8")
    ).rejects.toThrow();
    const config = await readFile(join(cwd, "next.config.mjs"), "utf8");
    expect(config).toContain(
      'import { withAgentFeedback } from "@agent-feedback/next/config";'
    );
    expect(config).toContain(
      "const agentFeedbackConfig = { reactStrictMode: true };"
    );
    expect(config).toContain(
      "export default withAgentFeedback(agentFeedbackConfig);"
    );
    expect(
      await readFile(join(cwd, "instrumentation-client.ts"), "utf8")
    ).toBe('import "@agent-feedback/next/auto";\n');
    expect(result.skipped).toEqual([]);
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
