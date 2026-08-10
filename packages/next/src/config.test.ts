import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withAgentFeedback } from "./config.js";

const directories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("withAgentFeedback", () => {
  it("returns the configuration unchanged without AGENT_FEEDBACK=1", () => {
    const config = { reactStrictMode: true };

    expect(withAgentFeedback(config)).toBe(config);
  });

  it("prepends rewrites to an array-returning configuration", async () => {
    vi.stubEnv("AGENT_FEEDBACK", "1");
    const cwd = await temporaryDirectory();
    const existing = { destination: "/there", source: "/here" };
    const config = withAgentFeedback(
      { rewrites: async () => [existing] },
      { cwd, port: 41_101 }
    );

    const rewrites = await config.rewrites?.();
    expect(rewrites).toEqual([
      {
        destination: "http://127.0.0.1:41101/__agent-feedback",
        source: "/__agent-feedback"
      },
      {
        destination: "http://127.0.0.1:41101/__agent-feedback/:path*",
        source: "/__agent-feedback/:path*"
      },
      existing
    ]);
  });

  it("prepends beforeFiles rewrites to grouped and missing configurations", async () => {
    vi.stubEnv("AGENT_FEEDBACK", "1");
    const cwd = await temporaryDirectory();
    const existing = { destination: "/there", source: "/here" };

    const grouped = withAgentFeedback(
      { rewrites: () => ({ beforeFiles: [existing] }) },
      { cwd, port: 41_102 }
    );
    const groupedRewrites = await grouped.rewrites?.();
    expect(groupedRewrites).toMatchObject({
      beforeFiles: [
        expect.objectContaining({ source: "/__agent-feedback" }),
        expect.objectContaining({ source: "/__agent-feedback/:path*" }),
        existing
      ]
    });

    const bare = withAgentFeedback({}, { cwd, port: 41_103 });
    const bareRewrites = await (
      bare as { rewrites?: () => Promise<unknown> }
    ).rewrites?.();
    expect(bareRewrites).toMatchObject({
      afterFiles: [],
      beforeFiles: [
        expect.objectContaining({ source: "/__agent-feedback" }),
        expect.objectContaining({ source: "/__agent-feedback/:path*" })
      ],
      fallback: []
    });
  });

  it("starts a reachable broker for the rewrite target", async () => {
    vi.stubEnv("AGENT_FEEDBACK", "1");
    const cwd = await temporaryDirectory();
    withAgentFeedback({}, { cwd, port: 41_104 });

    const response = await vi.waitFor(async () => {
      const result = await fetch(
        "http://127.0.0.1:41104/__agent-feedback/status",
        { headers: { connection: "close" } }
      );
      return result;
    });
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-next-"));
  directories.push(directory);
  return directory;
}
