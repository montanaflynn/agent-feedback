import {
  FeedbackBroker,
  isAgentFeedbackEnabled
} from "@agent-feedback/core/server";
import type { FeedbackSubmission } from "@agent-feedback/core";

const broker = new FeedbackBroker();

function disabled(): boolean {
  return (
    process.env.NODE_ENV === "production" || !isAgentFeedbackEnabled()
  );
}

export async function GET(): Promise<Response> {
  if (disabled()) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  return Response.json({ status: "ok" });
}

export async function POST(request: Request): Promise<Response> {
  if (disabled()) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const submission = (await request.json()) as FeedbackSubmission;
    const record = await broker.submit(submission);
    return Response.json(
      { id: record.id, status: record.status },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid feedback request.";
    return Response.json({ error: message }, { status: 400 });
  }
}
