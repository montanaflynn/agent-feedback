#!/usr/bin/env node

import { resolve } from "node:path";
import { isMainModule } from "./entry.js";
import { installProject } from "./install.js";
import {
  installLocalSkill,
  uninstallLocalSkill
} from "./skill.js";
import { uninstallProject } from "./uninstall.js";
import { updateProject } from "./update.js";

export {
  detectFramework,
  detectPackageManager,
  initializeProject
} from "./init.js";
export { installProject } from "./install.js";
export {
  detectSkillTarget,
  detectSkillTargets,
  installLocalSkill,
  uninstallLocalSkill
} from "./skill.js";
export { uninstallProject } from "./uninstall.js";
export { updateProject } from "./update.js";
export type { InstallOptions, InstallResult } from "./install.js";
export type {
  Framework,
  InitOptions,
  InitResult,
  PackageManager
} from "./init.js";
export type {
  DetectSkillTargetOptions,
  InstallSkillOptions,
  InstallSkillResult,
  SkillTarget,
  UninstallSkillOptions
} from "./skill.js";
export type {
  UninstallOptions,
  UninstallResult
} from "./uninstall.js";
export type { UpdateOptions, UpdateResult } from "./update.js";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const cwdIndex = args.indexOf("--cwd");
  const cwdArgument = cwdIndex >= 0 ? args[cwdIndex + 1] : undefined;
  const cwd = cwdArgument ? resolve(cwdArgument) : process.cwd();

  if (command === "install" || command === "init") {
    await installProject({
      cwd,
      forceSkill: args.includes("--force"),
      install: !args.includes("--no-install"),
      skill: !args.includes("--no-skill")
    });
    return;
  }

  if (command === "uninstall") {
    await uninstallProject({
      cwd,
      packages: !args.includes("--keep-packages"),
      skill: !args.includes("--keep-skill")
    });
    return;
  }

  if (command === "skill") {
    await installLocalSkill({
      cwd,
      force: args.includes("--force")
    });
    return;
  }

  if (command === "update") {
    await updateProject({
      cwd,
      install: !args.includes("--no-install"),
      skill: !args.includes("--no-skill")
    });
    return;
  }

  console.log(
    [
      "Usage:",
      "  npx @agent-feedback/cli install [--cwd <directory>] [--no-install] [--no-skill] [--force]",
      "  npx @agent-feedback/cli uninstall [--cwd <directory>] [--keep-packages] [--keep-skill]",
      "  npx @agent-feedback/cli update [--cwd <directory>] [--no-install] [--no-skill]",
      "",
      "Aliases:",
      "  init  Alias for install",
      "",
      "Advanced:",
      "  npx @agent-feedback/cli skill [--cwd <directory>] [--force]",
    ].join("\n")
  );
  process.exitCode = command ? 1 : 0;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
