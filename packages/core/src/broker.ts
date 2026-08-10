import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import type {
  FeedbackRecord,
  FeedbackResponse,
  FeedbackSubmission
} from "./types.js";

const MAX_BODY_BYTES = 256 * 1024;

export interface BrokerOptions {
  cwd?: string;
  log?: (message: string) => void;
}

export class FeedbackBroker {
  readonly inboxPath: string;
  private readonly log: (message: string) => void;

  constructor(options: BrokerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.inboxPath = join(cwd, ".agent-feedback", "feedback.jsonl");
    this.log = options.log ?? console.log;
  }

  async submit(submission: FeedbackSubmission): Promise<FeedbackRecord> {
    validateSubmission(submission);
    const record: FeedbackRecord = {
      ...submission,
      createdAt: new Date().toISOString(),
      id: createFeedbackId(),
      status: "pending"
    };

    await mkdir(dirname(this.inboxPath), { recursive: true });
    await appendFile(this.inboxPath, `${JSON.stringify(record)}\n`, "utf8");
    this.log(formatFeedbackLog(record));
    return record;
  }

  async resolve(id: string): Promise<FeedbackResponse> {
    if (!/^af_[a-z0-9_-]+$/i.test(id)) throw new Error("Invalid feedback id.");
    const resolution = {
      id,
      resolvedAt: new Date().toISOString(),
      status: "resolved" as const
    };
    await mkdir(dirname(this.inboxPath), { recursive: true });
    await appendFile(this.inboxPath, `${JSON.stringify(resolution)}\n`, "utf8");
    return { id, status: "resolved" };
  }

  middleware() {
    return async (
      request: IncomingMessage,
      response: ServerResponse,
      next?: () => void
    ): Promise<void> => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (!url.pathname.startsWith("/__agent-feedback")) {
        next?.();
        return;
      }

      if (request.method === "OPTIONS") {
        writeJson(response, 204, undefined);
        return;
      }

      try {
        if (
          request.method === "GET" &&
          url.pathname === "/__agent-feedback/status"
        ) {
          writeJson(response, 200, { status: "ok" });
          return;
        }

        if (request.method === "POST" && url.pathname === "/__agent-feedback") {
          const submission = (await readJson(request)) as FeedbackSubmission;
          const record = await this.submit(submission);
          writeJson(response, 201, { id: record.id, status: record.status });
          return;
        }

        const match = url.pathname.match(
          /^\/__agent-feedback\/(af_[a-z0-9_-]+)$/i
        );
        if (request.method === "PATCH" && match?.[1]) {
          writeJson(response, 200, await this.resolve(match[1]));
          return;
        }

        writeJson(response, 404, { error: "Not found." });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid feedback request.";
        writeJson(response, 400, { error: message });
      }
    };
  }

}

export function formatFeedbackLog(record: FeedbackRecord): string {
  const pathname = safePathname(record.page.url);
  const text = record.target.text ? ` "${record.target.text}"` : "";
  return [
    "[agent-feedback:new]",
    "",
    `id: ${record.id}`,
    "",
    "page:",
    pathname,
    "",
    "target:",
    `${record.target.tag}${text}`,
    "",
    "instruction:",
    record.instruction,
    "",
    "[/agent-feedback:new]"
  ].join("\n");
}

function validateSubmission(value: FeedbackSubmission): void {
  if (!value || typeof value !== "object") throw new Error("A JSON body is required.");
  if (typeof value.instruction !== "string" || !value.instruction.trim()) {
    throw new Error("instruction is required.");
  }
  if (value.instruction.length > 10_000) {
    throw new Error("instruction is too long.");
  }
  if (!value.page || typeof value.page.url !== "string") {
    throw new Error("page.url is required.");
  }
  if (
    !value.target ||
    typeof value.target.selector !== "string" ||
    typeof value.target.tag !== "string"
  ) {
    throw new Error("target.selector and target.tag are required.");
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown
): void {
  response.statusCode = status;
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-allow-methods", "POST, PATCH, OPTIONS");
  response.setHeader("access-control-allow-origin", "*");
  if (status === 204) {
    response.end();
    return;
  }
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function createFeedbackId(): string {
  return `af_${randomBytes(6).toString("base64url").toLowerCase()}`;
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
