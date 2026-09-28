import { mkdtemp, readFile, rm } from "node:fs/promises";
import { once } from "node:events";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FeedbackBroker } from "./broker.js";
import type { FeedbackSubmission } from "./types.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("FeedbackBroker", () => {
  it("persists JSONL and emits a structured log", async () => {
    const cwd = await temporaryDirectory();
    const logs: string[] = [];
    const broker = new FeedbackBroker({ cwd, log: (message) => logs.push(message) });

    const record = await broker.submit(submission());
    const line = await readFile(
      join(cwd, ".agent-feedback", "feedback.jsonl"),
      "utf8"
    );

    expect(JSON.parse(line)).toEqual(record);
    expect(record.id).toMatch(/^af_[a-z0-9_-]+$/);
    expect(logs[0]).toContain("[agent-feedback:new]");
    expect(logs[0]).toContain('button "Start trial"');
    expect(logs[0]).toContain("[/agent-feedback:new]");
  });

  it("serves POST and resolution requests over HTTP", async () => {
    const cwd = await temporaryDirectory();
    const broker = new FeedbackBroker({ cwd, log: () => undefined });
    const server = createServer(broker.middleware());
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port.");
    const endpoint = `http://127.0.0.1:${address.port}/__agent-feedback`;

    try {
      const status = await fetch(`${endpoint}/status`, {
        headers: { connection: "close" }
      });
      expect(status.status).toBe(200);
      expect(await status.json()).toEqual({ status: "ok" });

      const response = await fetch(endpoint, {
        body: JSON.stringify(submission()),
        headers: {
          connection: "close",
          "content-type": "application/json"
        },
        method: "POST"
      });
      const created = (await response.json()) as { id: string; status: string };
      expect(response.status).toBe(201);
      expect(created.status).toBe("pending");

      const resolved = await fetch(`${endpoint}/${created.id}`, {
        headers: { connection: "close" },
        method: "PATCH"
      });
      expect(await resolved.json()).toEqual({
        id: created.id,
        status: "resolved"
      });

      const lines = (
        await readFile(join(cwd, ".agent-feedback", "feedback.jsonl"), "utf8")
      )
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { status: string });
      expect(lines.map((line) => line.status)).toEqual(["pending", "resolved"]);
    } finally {
      server.close();
      server.closeAllConnections();
    }
  });

  it("refuses feedback from other sites", async () => {
    const cwd = await temporaryDirectory();
    const broker = new FeedbackBroker({ cwd, log: () => undefined });
    const server = createServer(broker.middleware());
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port.");
    const endpoint = `http://127.0.0.1:${address.port}/__agent-feedback`;
    const body = JSON.stringify(submission());

    try {
      const post = (headers: Record<string, string>) =>
        fetch(endpoint, {
          body,
          headers: { connection: "close", ...headers },
          method: "POST"
        });

      // A page on another site: refused whatever the type.
      for (const site of ["cross-site", "same-site"]) {
        const response = await post({
          "content-type": "application/json",
          "sec-fetch-site": site
        });
        expect(response.status).toBe(403);
      }

      // No preflight is needed for these, so they could come from anywhere.
      for (const type of [
        "text/plain",
        "application/x-www-form-urlencoded",
        "multipart/form-data; boundary=x"
      ]) {
        expect((await post({ "content-type": type })).status).toBe(415);
      }

      const preflight = await fetch(endpoint, {
        headers: {
          "access-control-request-method": "POST",
          connection: "close",
          origin: "https://elsewhere.example"
        },
        method: "OPTIONS"
      });
      expect(preflight.headers.get("access-control-allow-origin")).toBeNull();

      const resolve = await fetch(`${endpoint}/af_abc`, {
        headers: { connection: "close", "sec-fetch-site": "cross-site" },
        method: "PATCH"
      });
      expect(resolve.status).toBe(403);

      const own = await post({
        "content-type": "application/json; charset=utf-8",
        "sec-fetch-site": "same-origin"
      });
      expect(own.status).toBe(201);

      const lines = (
        await readFile(join(cwd, ".agent-feedback", "feedback.jsonl"), "utf8")
      )
        .trim()
        .split("\n");
      expect(lines).toHaveLength(1);
    } finally {
      server.close();
      server.closeAllConnections();
    }
  });

  it("rejects incomplete submissions", async () => {
    const cwd = await temporaryDirectory();
    const broker = new FeedbackBroker({ cwd, log: () => undefined });

    await expect(
      broker.submit({ ...submission(), instruction: "" })
    ).rejects.toThrow("instruction is required");
  });
});

function submission(): FeedbackSubmission {
  return {
    instruction: "Use the secondary style.",
    metadata: { framework: "react" },
    page: {
      title: "Pricing",
      url: "http://localhost:3000/pricing"
    },
    target: {
      role: "button",
      selector: "[data-plan='starter'] button",
      tag: "button",
      text: "Start trial"
    }
  };
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-feedback-"));
  directories.push(directory);
  return directory;
}
