import { FeedbackBroker } from "@agent-feedback/core/server";
import type { FeedbackSubmission } from "@agent-feedback/core";

const broker = new FeedbackBroker();

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
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
