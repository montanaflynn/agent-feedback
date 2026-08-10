import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deterministicPort, startBrokerServer } from "./broker-server.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("deterministicPort", () => {
  it("is stable for a seed and stays inside the range", () => {
    const port = deterministicPort("/some/project");
    expect(port).toBe(deterministicPort("/some/project"));
    expect(port).toBeGreaterThanOrEqual(42_000);
    expect(port).toBeLessThan(46_000);
    expect(deterministicPort("/another/project")).not.toBe(
      deterministicPort("/some/project/deeper")
    );
  });
});

describe("startBrokerServer", () => {
  it("serves the status endpoint and tolerates a second start", async () => {
    const cwd = await temporaryDirectory();
    const port = deterministicPort(cwd);
    const first = await startBrokerServer({ cwd, log: () => undefined, port });

    try {
      expect(first.server).toBeDefined();
      const response = await fetch(
        `http://127.0.0.1:${port}/__agent-feedback/status`,
        { headers: { connection: "close" } }
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });

      const second = await startBrokerServer({
        cwd,
        log: () => undefined,
        port
      });
      expect(second.server).toBeUndefined();
      await second.close();
    } finally {
      first.server?.closeAllConnections();
      await first.close();
    }
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-"));
  directories.push(directory);
  return directory;
}
