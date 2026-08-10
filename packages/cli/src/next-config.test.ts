import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureInstrumentationClient,
  removeInstrumentationClient,
  unwrapNextConfig,
  wrapNextConfig
} from "./next-config.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("wrapNextConfig", () => {
  it("creates a wrapped configuration when none exists", async () => {
    const cwd = await temporaryDirectory();

    expect(await wrapNextConfig(cwd)).toBe("next.config.mjs");
    const config = await readFile(join(cwd, "next.config.mjs"), "utf8");
    expect(config).toContain("export default withAgentFeedback({});");
  });

  it("wraps an ESM default export and unwraps it back", async () => {
    const cwd = await temporaryDirectory();
    const original = [
      "const nextConfig = {",
      "  reactStrictMode: true",
      "};",
      "",
      "export default nextConfig;",
      ""
    ].join("\n");
    await writeFile(join(cwd, "next.config.mjs"), original);

    await wrapNextConfig(cwd);
    const wrapped = await readFile(join(cwd, "next.config.mjs"), "utf8");
    expect(wrapped).toContain(
      'import { withAgentFeedback } from "@agent-feedback/next/config";'
    );
    expect(wrapped).toContain("const agentFeedbackConfig = nextConfig;");
    expect(wrapped).toContain(
      "export default withAgentFeedback(agentFeedbackConfig);"
    );

    // Idempotent on a second run.
    await wrapNextConfig(cwd);
    expect(await readFile(join(cwd, "next.config.mjs"), "utf8")).toBe(wrapped);

    const result = await unwrapNextConfig(cwd);
    expect(result).toEqual({ files: ["next.config.mjs"], skipped: [] });
    expect(await readFile(join(cwd, "next.config.mjs"), "utf8")).toBe(original);
  });

  it("wraps a CommonJS export and unwraps it back", async () => {
    const cwd = await temporaryDirectory();
    const original = "module.exports = { output: 'standalone' };\n";
    await writeFile(join(cwd, "next.config.js"), original);

    await wrapNextConfig(cwd);
    const wrapped = await readFile(join(cwd, "next.config.js"), "utf8");
    expect(wrapped).toContain(
      'const { withAgentFeedback } = require("@agent-feedback/next/config");'
    );
    expect(wrapped).toContain(
      "const agentFeedbackConfig = { output: 'standalone' };"
    );
    expect(wrapped).toContain(
      "module.exports = withAgentFeedback(agentFeedbackConfig);"
    );

    await unwrapNextConfig(cwd);
    expect(await readFile(join(cwd, "next.config.js"), "utf8")).toBe(original);
  });

  it("deletes a generated configuration on unwrap", async () => {
    const cwd = await temporaryDirectory();
    await wrapNextConfig(cwd);

    const result = await unwrapNextConfig(cwd);
    expect(result.files).toEqual(["next.config.mjs"]);
    expect(existsSync(join(cwd, "next.config.mjs"))).toBe(false);
  });

  it("skips hand-customized wrapping it cannot reverse", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "next.config.mjs"),
      [
        'import { withAgentFeedback } from "@agent-feedback/next/config";',
        "export default withAgentFeedback({ reactStrictMode: true }, { port: 4820 });",
        ""
      ].join("\n")
    );

    const result = await unwrapNextConfig(cwd);
    expect(result).toEqual({ files: [], skipped: ["next.config.mjs"] });
  });

  it("throws on unsupported configuration shapes", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      join(cwd, "next.config.js"),
      "exports.reactStrictMode = true;\n"
    );

    await expect(wrapNextConfig(cwd)).rejects.toThrow("unsupported shape");
  });
});

describe("instrumentation client", () => {
  it("creates, reuses, and removes the client file", async () => {
    const cwd = await temporaryDirectory();
    await writeFile(join(cwd, "tsconfig.json"), "{}");

    expect(await ensureInstrumentationClient(cwd)).toBe(
      "instrumentation-client.ts"
    );
    expect(
      await readFile(join(cwd, "instrumentation-client.ts"), "utf8")
    ).toBe('import "@agent-feedback/next/auto";\n');

    const removal = await removeInstrumentationClient(cwd);
    expect(removal.files).toEqual(["instrumentation-client.ts"]);
    expect(existsSync(join(cwd, "instrumentation-client.ts"))).toBe(false);
  });

  it("prepends to an existing client file and removes only its line", async () => {
    const cwd = await temporaryDirectory();
    const existing = 'console.log("boot");\n';
    await writeFile(join(cwd, "instrumentation-client.js"), existing);

    expect(await ensureInstrumentationClient(cwd)).toBe(
      "instrumentation-client.js"
    );
    expect(
      await readFile(join(cwd, "instrumentation-client.js"), "utf8")
    ).toBe(`import "@agent-feedback/next/auto";\n${existing}`);

    await removeInstrumentationClient(cwd);
    expect(
      await readFile(join(cwd, "instrumentation-client.js"), "utf8")
    ).toBe(existing);
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-nextcfg-"));
  directories.push(directory);
  return directory;
}
