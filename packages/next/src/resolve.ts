import {
  FeedbackBroker,
  isAgentFeedbackEnabled
} from "@agent-feedback/core/server";

const broker = new FeedbackBroker();

interface ResolveContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  _request: Request,
  context: ResolveContext
): Promise<Response> {
  if (
    process.env.NODE_ENV === "production" ||
    !isAgentFeedbackEnabled()
  ) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const { id } = await context.params;
    return Response.json(await broker.resolve(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid feedback request.";
    return Response.json({ error: message }, { status: 400 });
  }
}
