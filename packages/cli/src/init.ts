import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { installLocalSkill, type SkillTarget } from "./skill.js";

export type Framework = "next" | "vite";
export type PackageManager = "npm" | "pnpm" | "yarn";

export interface InitOptions {
  backupSkill?: boolean;
  cwd: string;
  forceSkill?: boolean;
  install?: boolean;
  log?: (message: string) => void;
  operation?: "configure" | "update";
  packageTag?: string;
  skill?: boolean;
  skillTarget?: SkillTarget;
  skillTargets?: SkillTarget[];
}

export interface InitResult {
  backups: string[];
  files: string[];
  framework: Framework;
  packages: string[];
}

export async function initializeProject(
  options: InitOptions
): Promise<InitResult> {
  const log = options.log ?? console.log;
  const packagePath = join(options.cwd, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const framework = detectFramework(dependencies);
  const react = Boolean(dependencies.react);
  const packages =
    framework === "next"
      ? ["@agent-feedback/next"]
      : [
          "@agent-feedback/vite",
          ...(react ? ["@agent-feedback/react"] : [])
        ];

  if (options.install !== false) {
    installPackages(
      options.cwd,
      detectPackageManager(options.cwd),
      withPackageTag(packages, options.packageTag)
    );
  }

  const files =
    framework === "next"
      ? await configureNext(options.cwd)
      : await configureVite(options.cwd, react);
  const gitignore = await ensureGitignore(options.cwd);
  if (gitignore) files.push(gitignore);
  const backups: string[] = [];
  if (options.skill !== false) {
    const skill = await installLocalSkill({
      backup: options.backupSkill,
      cwd: options.cwd,
      force: options.forceSkill,
      log,
      target: options.skillTarget,
      targets: options.skillTargets
    });
    backups.push(...skill.backups);
    files.push(...skill.files);
  }

  log(
    options.operation === "update"
      ? `Agent Feedback updated for ${framework}.`
      : `Agent Feedback configured for ${framework}.`
  );
  log("Feedback will be written to .agent-feedback/feedback.jsonl and stdout.");
  return { backups, files, framework, packages };
}

export function withPackageTag(
  packages: string[],
  tag?: string
): string[] {
  return tag ? packages.map((packageName) => `${packageName}@${tag}`) : packages;
}

async function ensureGitignore(cwd: string): Promise<string | undefined> {
  const path = join(cwd, ".gitignore");
  const entry = ".agent-feedback/";
  const source = existsSync(path) ? await readFile(path, "utf8") : "";
  if (
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .includes(entry)
  ) {
    return undefined;
  }
  const separator = source.length > 0 && !source.endsWith("\n") ? "\n" : "";
  await writeFile(path, `${source}${separator}${entry}\n`);
  return ".gitignore";
}

export function detectFramework(
  dependencies: Record<string, string | undefined>
): Framework {
  if (dependencies.next) return "next";
  if (dependencies.vite) return "vite";
  throw new Error(
    "Could not detect a supported framework. Install Vite or Next.js first."
  );
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

async function configureVite(cwd: string, react: boolean): Promise<string[]> {
  const candidates = [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs"
  ];
  const relative = candidates.find((candidate) => existsSync(join(cwd, candidate)));
  const path = join(cwd, relative ?? "vite.config.ts");
  const call = `agentFeedback(${react ? "{ react: true }" : ""})`;

  if (!relative) {
    await writeFile(
      path,
      [
        'import { defineConfig } from "vite";',
        'import { agentFeedback } from "@agent-feedback/vite";',
        "",
        `export default defineConfig({ plugins: [${call}] });`,
        ""
      ].join("\n")
    );
    return [basename(path)];
  }

  let source = await readFile(path, "utf8");
  if (source.includes("@agent-feedback/vite")) return [relative];
  source = `import { agentFeedback } from "@agent-feedback/vite";\n${source}`;

  if (/plugins\s*:\s*\[/.test(source)) {
    source = source.replace(/plugins\s*:\s*\[/, (match) => `${match}${call}, `);
  } else if (/defineConfig\s*\(\s*\{/.test(source)) {
    source = source.replace(
      /defineConfig\s*\(\s*\{/,
      (match) => `${match}\n  plugins: [${call}],`
    );
  } else {
    throw new Error(
      `${relative} uses an unsupported shape. Add ${call} to its plugins array.`
    );
  }
  await writeFile(path, source);
  return [relative];
}

async function configureNext(cwd: string): Promise<string[]> {
  const appDirectory = existsSync(join(cwd, "src", "app"))
    ? join(cwd, "src", "app")
    : join(cwd, "app");
  const layoutCandidates = ["layout.tsx", "layout.jsx"];
  const layoutName = layoutCandidates.find((candidate) =>
    existsSync(join(appDirectory, candidate))
  );
  if (!layoutName) {
    throw new Error(
      "Next.js App Router layout not found. Agent Feedback currently requires app/layout.tsx."
    );
  }

  const layoutPath = join(appDirectory, layoutName);
  let layout = await readFile(layoutPath, "utf8");
  if (!layout.includes("@agent-feedback/next")) {
    layout = `import { AgentFeedback } from "@agent-feedback/next";\n${layout}`;
    if (!layout.includes("</body>")) {
      throw new Error(`${layoutName} must contain a </body> element.`);
    }
    layout = layout.replace("</body>", "        <AgentFeedback />\n      </body>");
    await writeFile(layoutPath, layout);
  }

  const routeDirectory = join(appDirectory, "%5F_agent-feedback");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(routeDirectory, { recursive: true });
  const routePath = join(routeDirectory, "route.ts");
  if (!existsSync(routePath)) {
    await writeFile(
      routePath,
      'export { POST } from "@agent-feedback/next/route";\n'
    );
  }

  const resolveDirectory = join(routeDirectory, "[id]");
  await mkdir(resolveDirectory, { recursive: true });
  const resolvePath = join(resolveDirectory, "route.ts");
  if (!existsSync(resolvePath)) {
    await writeFile(
      resolvePath,
      'export { PATCH } from "@agent-feedback/next/resolve";\n'
    );
  }

  return [
    layoutPath.slice(cwd.length + 1),
    routePath.slice(cwd.length + 1),
    resolvePath.slice(cwd.length + 1)
  ];
}

function installPackages(
  cwd: string,
  manager: PackageManager,
  packages: string[]
): void {
  const [command, args] =
    manager === "npm"
      ? ["npm", ["install", "--save-dev", ...packages]]
      : manager === "pnpm"
        ? ["pnpm", ["add", "--save-dev", ...packages]]
        : ["yarn", ["add", "--dev", ...packages]];
  execFileSync(command, args, { cwd, stdio: "inherit" });
}
