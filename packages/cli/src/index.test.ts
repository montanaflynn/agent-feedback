import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isMainModule } from "./entry.js";

describe("CLI entry point", () => {
  it("recognizes package-manager bin symlinks as the main module", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agent-feedback-cli-"));
    const modulePath = join(cwd, "index.js");
    const binPath = join(cwd, "agent-feedback");

    await writeFile(modulePath, "");
    await symlink(modulePath, binPath);

    expect(isMainModule(pathToFileURL(modulePath).href, binPath)).toBe(true);
  });

  it("does not treat a different executable as the main module", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agent-feedback-cli-"));
    const modulePath = join(cwd, "index.js");
    const otherPath = join(cwd, "other.js");

    await writeFile(modulePath, "");
    await writeFile(otherPath, "");

    expect(isMainModule(pathToFileURL(modulePath).href, otherPath)).toBe(false);
  });
});
