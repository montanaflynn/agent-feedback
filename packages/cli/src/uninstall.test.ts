import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installLocalSkill } from "./skill.js";
import {
  uninstallPackageCommand,
  uninstallProject
} from "./uninstall.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("project uninstallation", () => {
  it.each([
    ["npm", ["npm", ["uninstall", "@agent-feedback/vite"]]],
    ["pnpm", ["pnpm", ["remove", "@agent-feedback/vite"]]],
    ["yarn", ["yarn", ["remove", "@agent-feedback/vite"]]]
  ] as const)("uses the %s package removal command", (manager, expected) => {
    expect(
      uninstallPackageCommand(manager, ["@agent-feedback/vite"])
    ).toEqual(expected);
  });

  it("removes Vite wiring and every installed skill copy", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        dependencies: { react: "^19.0.0" },
        devDependencies: {
          "@agent-feedback/react": "^0.0.1",
          "@agent-feedback/vite": "^0.0.1",
          vite: "^6.0.0"
        }
      })
    );
    await writeFile(
      join(cwd, "vite.config.ts"),
      [
        'import { agentFeedback } from "@agent-feedback/vite";',
        'import { defineConfig } from "vite";',
        "",
        "export default defineConfig({",
        "  plugins: [react(), agentFeedback({ react: true })]",
        "});",
        ""
      ].join("\n")
    );
    await installLocalSkill({
      cwd,
      log: () => undefined,
      targets: ["agents", "claude"]
    });
    const claudeSkill = join(
      cwd,
      ".claude",
      "skills",
      "run-agent-feedback",
      "SKILL.md"
    );
    await writeFile(claudeSkill, "customized\n");

    const result = await uninstallProject({
      cwd,
      log: () => undefined,
      packages: false
    });

    expect(result.framework).toBe("vite");
    expect(result.packages).toEqual([
      "@agent-feedback/vite",
      "@agent-feedback/react"
    ]);
    expect(result.backups).toHaveLength(1);
    expect(await readFile(join(cwd, result.backups[0]!), "utf8")).toBe(
      "customized\n"
    );
    const config = await readFile(join(cwd, "vite.config.ts"), "utf8");
    expect(config).not.toContain("@agent-feedback/vite");
    expect(config).not.toContain("agentFeedback(");
    expect(config).toContain("plugins: [react()]");
    await expect(readFile(claudeSkill, "utf8")).rejects.toThrow();
  });

  it("removes Next layout wiring and owned route files", async () => {
    const cwd = await temporaryDirectory();
    const app = join(cwd, "src", "app");
    const routeDirectory = join(app, "%5F_agent-feedback");
    await mkdir(join(routeDirectory, "[id]"), { recursive: true });
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        dependencies: {
          "@agent-feedback/next": "^0.0.1",
          next: "^15.0.0",
          react: "^19.0.0"
        }
      })
    );
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
      [
        'export { PATCH } from "@agent-feedback/next/resolve";',
        "// local route customization",
        ""
      ].join("\n")
    );

    const result = await uninstallProject({
      cwd,
      log: () => undefined,
      packages: false,
      skill: false
    });

    expect(result.framework).toBe("next");
    expect(result.backups).toHaveLength(1);
    expect(await readFile(join(cwd, result.backups[0]!), "utf8")).toContain(
      "local route customization"
    );
    const layout = await readFile(join(app, "layout.tsx"), "utf8");
    expect(layout).not.toContain("@agent-feedback/next");
    expect(layout).not.toContain("<AgentFeedback");
    await expect(
      readFile(join(routeDirectory, "route.ts"), "utf8")
    ).rejects.toThrow();
    await expect(
      readFile(join(routeDirectory, "[id]", "route.ts"), "utf8")
    ).rejects.toThrow();
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-uninstall-"));
  directories.push(directory);
  return directory;
}
