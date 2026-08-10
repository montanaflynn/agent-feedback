import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CONFIG_CANDIDATES = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs"
];
const CONFIG_MODULE = "@agent-feedback/next/config";
const AUTO_MODULE = "@agent-feedback/next/auto";
const CONFIG_VARIABLE = "agentFeedbackConfig";

const GENERATED_CONFIG = [
  `import { withAgentFeedback } from "${CONFIG_MODULE}";`,
  "",
  "export default withAgentFeedback({});",
  ""
].join("\n");

const ESM_IMPORT = `import { withAgentFeedback } from "${CONFIG_MODULE}";\n`;
const ESM_EXPORT = `export default withAgentFeedback(${CONFIG_VARIABLE});\n`;
const CJS_IMPORT = `const { withAgentFeedback } = require("${CONFIG_MODULE}");\n`;
const CJS_EXPORT = `module.exports = withAgentFeedback(${CONFIG_VARIABLE});\n`;

export function findNextConfig(cwd: string): string | undefined {
  return CONFIG_CANDIDATES.find((candidate) =>
    existsSync(join(cwd, candidate))
  );
}

export async function wrapNextConfig(cwd: string): Promise<string> {
  const relative = findNextConfig(cwd);
  if (!relative) {
    await writeFile(join(cwd, "next.config.mjs"), GENERATED_CONFIG);
    return "next.config.mjs";
  }

  const path = join(cwd, relative);
  const source = await readFile(path, "utf8");
  if (source.includes(CONFIG_MODULE)) return relative;

  if (/^\s*export\s+default\s+/m.test(source)) {
    const body = source.replace(
      /^(\s*)export\s+default\s+/m,
      `$1const ${CONFIG_VARIABLE} = `
    );
    const separator = body.endsWith("\n") ? "" : "\n";
    await writeFile(path, `${ESM_IMPORT}${body}${separator}${ESM_EXPORT}`);
    return relative;
  }

  if (/^\s*module\.exports\s*=\s*/m.test(source)) {
    const body = source.replace(
      /^(\s*)module\.exports\s*=\s*/m,
      `$1const ${CONFIG_VARIABLE} = `
    );
    const separator = body.endsWith("\n") ? "" : "\n";
    await writeFile(path, `${CJS_IMPORT}${body}${separator}${CJS_EXPORT}`);
    return relative;
  }

  throw new Error(
    `${relative} uses an unsupported shape. Wrap its exported configuration with withAgentFeedback() from ${CONFIG_MODULE}.`
  );
}

export async function unwrapNextConfig(
  cwd: string
): Promise<{ files: string[]; skipped: string[] }> {
  const relative = findNextConfig(cwd);
  if (!relative) return { files: [], skipped: [] };
  const path = join(cwd, relative);
  const source = await readFile(path, "utf8");
  if (!source.includes(CONFIG_MODULE)) return { files: [], skipped: [] };

  if (source === GENERATED_CONFIG) {
    await unlink(path);
    return { files: [relative], skipped: [] };
  }

  let updated = source;
  if (updated.includes(ESM_IMPORT) && updated.includes(ESM_EXPORT)) {
    updated = updated
      .replace(ESM_IMPORT, "")
      .replace(ESM_EXPORT, "")
      .replace(
        new RegExp(String.raw`^(\s*)const ${CONFIG_VARIABLE} = `, "m"),
        "$1export default "
      );
  } else if (updated.includes(CJS_IMPORT) && updated.includes(CJS_EXPORT)) {
    updated = updated
      .replace(CJS_IMPORT, "")
      .replace(CJS_EXPORT, "")
      .replace(
        new RegExp(String.raw`^(\s*)const ${CONFIG_VARIABLE} = `, "m"),
        "$1module.exports = "
      );
  }

  if (
    updated.includes(CONFIG_MODULE) ||
    /\bwithAgentFeedback\s*\(/.test(updated)
  ) {
    return { files: [], skipped: [relative] };
  }

  const trimmed = updated.replace(/\n+$/, "\n");
  await writeFile(path, trimmed);
  return { files: [relative], skipped: [] };
}

export function findInstrumentationClient(cwd: string): string | undefined {
  const directories = existsSync(join(cwd, "src", "app")) ? ["src", ""] : ["", "src"];
  for (const directory of directories) {
    for (const extension of ["ts", "js"]) {
      const relative = join(directory, `instrumentation-client.${extension}`);
      if (existsSync(join(cwd, relative))) return relative;
    }
  }
  return undefined;
}

export async function ensureInstrumentationClient(
  cwd: string
): Promise<string> {
  const importLine = `import "${AUTO_MODULE}";\n`;
  const existing = findInstrumentationClient(cwd);

  if (existing) {
    const path = join(cwd, existing);
    const source = await readFile(path, "utf8");
    if (!source.includes(AUTO_MODULE)) {
      await writeFile(path, `${importLine}${source}`);
    }
    return existing;
  }

  const directory = existsSync(join(cwd, "src", "app")) ? "src" : "";
  const extension = existsSync(join(cwd, "tsconfig.json")) ? "ts" : "js";
  const relative = join(directory, `instrumentation-client.${extension}`);
  await writeFile(join(cwd, relative), importLine);
  return relative;
}

export async function removeInstrumentationClient(
  cwd: string
): Promise<{ files: string[]; skipped: string[] }> {
  const relative = findInstrumentationClient(cwd);
  if (!relative) return { files: [], skipped: [] };
  const path = join(cwd, relative);
  const source = await readFile(path, "utf8");
  const importLine = `import "${AUTO_MODULE}";\n`;
  if (!source.includes(AUTO_MODULE)) return { files: [], skipped: [] };

  if (source === importLine) {
    await unlink(path);
    return { files: [relative], skipped: [] };
  }

  const updated = source.replace(importLine, "");
  if (updated.includes(AUTO_MODULE)) {
    return { files: [], skipped: [relative] };
  }
  await writeFile(path, updated);
  return { files: [relative], skipped: [] };
}
