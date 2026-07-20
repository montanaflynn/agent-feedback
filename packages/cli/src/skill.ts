import { accessSync, constants, existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  rmdir,
  unlink,
  writeFile
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type SkillTarget = "agents" | "claude";

const SKILL_RELATIVE_PATHS: Record<SkillTarget, string> = {
  agents: join(".agents", "skills", "run-agent-feedback", "SKILL.md"),
  claude: join(".claude", "skills", "run-agent-feedback", "SKILL.md")
};

export interface InstallSkillOptions {
  backup?: boolean;
  cwd: string;
  force?: boolean;
  log?: (message: string) => void;
  now?: () => Date;
  target?: SkillTarget;
  targets?: SkillTarget[];
}

export interface InstallSkillResult {
  backups: string[];
  files: string[];
  skipped: string[];
}

export interface UninstallSkillOptions {
  backup?: boolean;
  cwd: string;
  log?: (message: string) => void;
  now?: () => Date;
  target?: SkillTarget;
  targets?: SkillTarget[];
}

export interface DetectSkillTargetOptions {
  cwd: string;
  home?: string;
  path?: string;
  platform?: NodeJS.Platform;
}

export function detectSkillTarget(
  options: DetectSkillTargetOptions
): SkillTarget {
  return detectSkillTargets(options)[0] ?? "agents";
}

export function detectSkillTargets(
  options: DetectSkillTargetOptions
): SkillTarget[] {
  const home = options.home ?? homedir();
  const path = options.path ?? process.env.PATH ?? "";
  const platform = options.platform ?? process.platform;
  const targets: SkillTarget[] = [];
  const agentsDetected =
    [
      join(options.cwd, ".codex"),
      join(options.cwd, ".cursor"),
      join(options.cwd, ".opencode"),
      join(home, ".codex"),
      join(home, ".cursor"),
      join(home, ".opencode"),
      join(home, ".config", "opencode")
    ].some(existsSync) ||
    ["codex", "cursor", "opencode"].some((command) =>
      hasExecutable(command, path, platform)
    );

  if (agentsDetected) targets.push("agents");

  const claudeDetected =
    existsSync(join(options.cwd, ".claude")) ||
    existsSync(join(home, ".claude")) ||
    hasExecutable("claude", path, platform);
  if (claudeDetected) {
    targets.push("claude");
  }

  return targets.length > 0 ? targets : ["agents"];
}

export async function installLocalSkill(
  options: InstallSkillOptions
): Promise<InstallSkillResult> {
  const log = options.log ?? console.log;
  const targets = [
    ...new Set(
      options.target
        ? [options.target]
        : (options.targets ?? detectSkillTargets({ cwd: options.cwd }))
    )
  ];
  const template = await readFile(
    new URL("../templates/run-agent-feedback/SKILL.md", import.meta.url),
    "utf8"
  );
  const backups: string[] = [];
  const files: string[] = [];
  const skipped: string[] = [];

  for (const target of targets) {
    const skillRelativePath = SKILL_RELATIVE_PATHS[target];
    const path = join(options.cwd, skillRelativePath);
    if (existsSync(path)) {
      const current = await readFile(path, "utf8");
      if (current === template) {
        log(`Agent Feedback skill is already current at ${skillRelativePath}.`);
        continue;
      }
      if (!options.force) {
        skipped.push(skillRelativePath);
        log(
          `Kept modified skill at ${skillRelativePath}. Use --force to replace it.`
        );
        continue;
      }
      if (options.backup) {
        const backupRelativePath = nextBackupPath(
          options.cwd,
          target,
          options.now?.() ?? new Date()
        );
        await mkdir(dirname(join(options.cwd, backupRelativePath)), {
          recursive: true
        });
        await writeFile(join(options.cwd, backupRelativePath), current);
        backups.push(backupRelativePath);
        log(`Backed up modified skill to ${backupRelativePath}.`);
      }
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, template);
    files.push(skillRelativePath);
    log(`Installed Agent Feedback skill at ${skillRelativePath}.`);
  }

  return { backups, files, skipped };
}

export async function uninstallLocalSkill(
  options: UninstallSkillOptions
): Promise<InstallSkillResult> {
  const log = options.log ?? console.log;
  const targets = [
    ...new Set(
      options.target
        ? [options.target]
        : (options.targets ?? (Object.keys(SKILL_RELATIVE_PATHS) as SkillTarget[]))
    )
  ];
  const template = await readFile(
    new URL("../templates/run-agent-feedback/SKILL.md", import.meta.url),
    "utf8"
  );
  const backups: string[] = [];
  const files: string[] = [];

  for (const target of targets) {
    const skillRelativePath = SKILL_RELATIVE_PATHS[target];
    const path = join(options.cwd, skillRelativePath);
    if (!existsSync(path)) continue;

    const current = await readFile(path, "utf8");
    if (options.backup !== false && current !== template) {
      const backupRelativePath = nextBackupPath(
        options.cwd,
        target,
        options.now?.() ?? new Date()
      );
      await mkdir(dirname(join(options.cwd, backupRelativePath)), {
        recursive: true
      });
      await writeFile(join(options.cwd, backupRelativePath), current);
      backups.push(backupRelativePath);
      log(`Backed up modified skill to ${backupRelativePath}.`);
    }

    await unlink(path);
    await removeDirectoryIfEmpty(dirname(path));
    files.push(skillRelativePath);
    log(`Removed Agent Feedback skill at ${skillRelativePath}.`);
  }

  return { backups, files, skipped: [] };
}

async function removeDirectoryIfEmpty(path: string): Promise<void> {
  try {
    await rmdir(path);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      !["ENOTEMPTY", "ENOENT"].includes(String(error.code))
    ) {
      throw error;
    }
  }
}

function nextBackupPath(
  cwd: string,
  target: SkillTarget,
  date: Date
): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  const directory = join(".agent-feedback", "backups");
  const stem = `run-agent-feedback-${target}-${timestamp}`;
  let suffix = 0;

  while (true) {
    const filename = `${stem}${suffix === 0 ? "" : `-${suffix + 1}`}.md`;
    const relativePath = join(directory, filename);
    if (!existsSync(join(cwd, relativePath))) return relativePath;
    suffix += 1;
  }
}

function hasExecutable(
  command: string,
  path: string,
  platform: NodeJS.Platform
): boolean {
  const separator = platform === "win32" ? ";" : ":";
  const extensions =
    platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  const mode = platform === "win32" ? constants.F_OK : constants.X_OK;

  for (const directory of path.split(separator)) {
    const normalizedDirectory = directory.replace(/^"(.*)"$/, "$1");
    if (!normalizedDirectory) continue;

    for (const extension of extensions) {
      try {
        accessSync(join(normalizedDirectory, `${command}${extension}`), mode);
        return true;
      } catch {
        // Keep searching the remaining PATH entries.
      }
    }
  }

  return false;
}
