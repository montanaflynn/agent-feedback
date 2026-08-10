import { existsSync } from "node:fs";
import { mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export interface LegacyNextRemoval {
  backups: string[];
  files: string[];
  skipped: string[];
}

/**
 * Removes the pre-0.2.0 Next.js wiring: the `<AgentFeedback />` layout edit
 * and the `app/%5F_agent-feedback` route files. Customized files are backed
 * up under `.agent-feedback/backups/` before removal.
 */
export async function removeLegacyNextSetup(
  cwd: string
): Promise<LegacyNextRemoval> {
  const appDirectory = existsSync(join(cwd, "src", "app"))
    ? join(cwd, "src", "app")
    : join(cwd, "app");
  const files: string[] = [];
  const backups: string[] = [];
  const skipped: string[] = [];
  const layoutName = ["layout.tsx", "layout.jsx"].find((candidate) =>
    existsSync(join(appDirectory, candidate))
  );

  if (layoutName) {
    const layoutPath = join(appDirectory, layoutName);
    const source = await readFile(layoutPath, "utf8");
    const updated = source
      .replace(
        /^import\s+\{\s*AgentFeedback\s*\}\s+from\s+["']@agent-feedback\/next["'];?\r?\n?/m,
        ""
      )
      .replace(/^[ \t]*<AgentFeedback\s*\/>[ \t]*\r?\n?/m, "")
      .replace(/[ \t]*<AgentFeedback\s*\/>/m, "");
    const relative = layoutPath.slice(cwd.length + 1);

    if (
      updated.includes("@agent-feedback/next") ||
      /<AgentFeedback(?:\s|\/|>)/.test(updated)
    ) {
      skipped.push(relative);
    } else if (updated !== source) {
      await writeFile(layoutPath, updated);
      files.push(relative);
    }
  }

  const routeDirectory = join(appDirectory, "%5F_agent-feedback");
  const routes = [
    {
      label: "next-route",
      path: join(routeDirectory, "route.ts"),
      templates: [
        'export { POST } from "@agent-feedback/next/route";\n',
        'export { GET, POST } from "@agent-feedback/next/route";\n'
      ]
    },
    {
      label: "next-resolve-route",
      path: join(routeDirectory, "[id]", "route.ts"),
      templates: ['export { PATCH } from "@agent-feedback/next/resolve";\n']
    }
  ];

  for (const route of routes) {
    if (!existsSync(route.path)) continue;
    const source = await readFile(route.path, "utf8");
    if (!route.templates.includes(source)) {
      const backup = await backupOwnedFile(cwd, route.label, route.path, source);
      backups.push(backup);
    }
    await unlink(route.path);
    files.push(route.path.slice(cwd.length + 1));
  }

  await removeDirectoryIfEmpty(join(routeDirectory, "[id]"));
  await removeDirectoryIfEmpty(routeDirectory);
  return { backups, files, skipped };
}

export async function backupOwnedFile(
  cwd: string,
  label: string,
  sourcePath: string,
  source: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = basename(sourcePath).split(".").slice(1).join(".") || "txt";
  const directory = join(".agent-feedback", "backups");
  const stem = `${label}-${timestamp}`;
  let suffix = 0;
  let relativePath: string;

  do {
    relativePath = join(
      directory,
      `${stem}${suffix === 0 ? "" : `-${suffix + 1}`}.${extension}`
    );
    suffix += 1;
  } while (existsSync(join(cwd, relativePath)));

  await mkdir(dirname(join(cwd, relativePath)), { recursive: true });
  await writeFile(join(cwd, relativePath), source);
  return relativePath;
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
