import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  detectPackageManager,
  type Framework,
  type PackageManager
} from "./init.js";
import {
  findInstrumentationClient,
  findNextConfig,
  removeInstrumentationClient,
  unwrapNextConfig
} from "./next-config.js";
import { removeLegacyNextSetup } from "./next-legacy.js";
import {
  uninstallLocalSkill,
  type SkillTarget
} from "./skill.js";

const AGENT_FEEDBACK_PACKAGES = [
  "@agent-feedback/next",
  "@agent-feedback/vite",
  "@agent-feedback/react",
  "@agent-feedback/core"
];

export interface UninstallOptions {
  cwd: string;
  log?: (message: string) => void;
  packages?: boolean;
  skill?: boolean;
  skillTarget?: SkillTarget;
  skillTargets?: SkillTarget[];
}

export interface UninstallResult {
  backups: string[];
  files: string[];
  framework?: Framework;
  packages: string[];
  skipped: string[];
}

export async function uninstallProject(
  options: UninstallOptions
): Promise<UninstallResult> {
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
  const packages = AGENT_FEEDBACK_PACKAGES.filter(
    (packageName) => dependencies[packageName]
  );
  const framework = detectConfiguredFramework(options.cwd, dependencies);
  const files: string[] = [];
  const backups: string[] = [];
  const skipped: string[] = [];

  if (framework === "next") {
    const setup = await uninstallNextSetup(options.cwd);
    backups.push(...setup.backups);
    files.push(...setup.files);
    skipped.push(...setup.skipped);
  } else if (framework === "vite") {
    const setup = await uninstallViteSetup(options.cwd);
    files.push(...setup.files);
    skipped.push(...setup.skipped);
  }

  if (options.skill !== false) {
    const skill = await uninstallLocalSkill({
      backup: true,
      cwd: options.cwd,
      log,
      target: options.skillTarget,
      targets: options.skillTargets
    });
    backups.push(...skill.backups);
    files.push(...skill.files);
  }

  if (options.packages !== false && packages.length > 0) {
    uninstallPackages(
      options.cwd,
      detectPackageManager(options.cwd),
      packages
    );
  }

  if (framework) {
    log(`Agent Feedback uninstalled from ${framework}.`);
  } else {
    log("Agent Feedback project files were not detected; local skills were checked.");
  }
  if (skipped.length > 0) {
    log(`Review setup that could not be removed automatically: ${skipped.join(", ")}.`);
  }
  log(
    "Feedback history and the .agent-feedback/ gitignore entry were preserved."
  );

  return { backups, files, framework, packages, skipped };
}

function detectConfiguredFramework(
  cwd: string,
  dependencies: Record<string, string | undefined>
): Framework | undefined {
  if (dependencies.next) return "next";
  if (dependencies.vite) return "vite";
  if (hasNextSetup(cwd)) return "next";
  if (findViteConfig(cwd)) return "vite";
  return undefined;
}

function hasNextSetup(cwd: string): boolean {
  const configName = findNextConfig(cwd);
  if (
    configName &&
    /@agent-feedback\/next\/config/.test(
      readFileSync(join(cwd, configName), "utf8")
    )
  ) {
    return true;
  }
  const instrumentation = findInstrumentationClient(cwd);
  if (
    instrumentation &&
    /@agent-feedback\/next\/auto/.test(
      readFileSync(join(cwd, instrumentation), "utf8")
    )
  ) {
    return true;
  }
  return ["app", join("src", "app")].some((directory) => {
    const appDirectory = join(cwd, directory);
    return (
      existsSync(join(appDirectory, "%5F_agent-feedback")) ||
      ["layout.tsx", "layout.jsx"].some((layout) =>
        fileContainsAgentFeedback(join(appDirectory, layout))
      )
    );
  });
}

function fileContainsAgentFeedback(path: string): boolean {
  return (
    existsSync(path) &&
    /@agent-feedback\/next|<AgentFeedback(?:\s|\/|>)/.test(
      readFileSync(path, "utf8")
    )
  );
}

async function uninstallViteSetup(
  cwd: string
): Promise<{ files: string[]; skipped: string[] }> {
  const relative = findViteConfig(cwd);
  if (!relative) return { files: [], skipped: [] };
  const path = join(cwd, relative);
  const source = await readFile(path, "utf8");

  if (isGeneratedViteConfig(source)) {
    await unlink(path);
    return { files: [relative], skipped: [] };
  }

  let updated = source.replace(
    /^import\s+\{\s*agentFeedback\s*\}\s+from\s+["']@agent-feedback\/vite["'];?\r?\n?/m,
    ""
  );
  const call =
    String.raw`agentFeedback\s*\(\s*(?:\{\s*react\s*:\s*true\s*\})?\s*\)`;
  const followedByComma = new RegExp(`${call}\\s*,\\s*`);
  const precededByComma = new RegExp(`\\s*,\\s*${call}`);
  const invocation = new RegExp(call);

  if (followedByComma.test(updated)) {
    updated = updated.replace(followedByComma, "");
  } else if (precededByComma.test(updated)) {
    updated = updated.replace(precededByComma, "");
  } else {
    updated = updated.replace(invocation, "");
  }

  if (
    updated.includes("@agent-feedback/vite") ||
    /\bagentFeedback\s*\(/.test(updated)
  ) {
    return { files: [], skipped: [relative] };
  }
  if (updated === source) return { files: [], skipped: [] };

  await writeFile(path, updated);
  return { files: [relative], skipped: [] };
}

function findViteConfig(cwd: string): string | undefined {
  return [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs"
  ].find((candidate) => existsSync(join(cwd, candidate)));
}

function isGeneratedViteConfig(source: string): boolean {
  return [false, true].some((react) => {
    const call = `agentFeedback(${react ? "{ react: true }" : ""})`;
    return (
      source ===
      [
        'import { defineConfig } from "vite";',
        'import { agentFeedback } from "@agent-feedback/vite";',
        "",
        `export default defineConfig({ plugins: [${call}] });`,
        ""
      ].join("\n")
    );
  });
}

async function uninstallNextSetup(
  cwd: string
): Promise<{ backups: string[]; files: string[]; skipped: string[] }> {
  const legacy = await removeLegacyNextSetup(cwd);
  const config = await unwrapNextConfig(cwd);
  const instrumentation = await removeInstrumentationClient(cwd);
  return {
    backups: legacy.backups,
    files: [...legacy.files, ...config.files, ...instrumentation.files],
    skipped: [...legacy.skipped, ...config.skipped, ...instrumentation.skipped]
  };
}

function uninstallPackages(
  cwd: string,
  manager: PackageManager,
  packages: string[]
): void {
  const [command, args] = uninstallPackageCommand(manager, packages);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

export function uninstallPackageCommand(
  manager: PackageManager,
  packages: string[]
): [command: string, args: string[]] {
  const [command, args] =
    manager === "npm"
      ? ["npm", ["uninstall", ...packages]]
      : manager === "pnpm"
        ? ["pnpm", ["remove", ...packages]]
        : ["yarn", ["remove", ...packages]];
  return [command, args];
}
