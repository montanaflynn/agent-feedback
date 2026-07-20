import type {
  FeedbackResponse,
  FeedbackSubmission
} from "./types.js";

export async function submitFeedback(
  submission: FeedbackSubmission,
  endpoint = "/__agent-feedback"
): Promise<FeedbackResponse> {
  const response = await fetch(endpoint, {
    body: JSON.stringify(submission),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  const body = (await response.json()) as FeedbackResponse | { error: string };
  if (!response.ok) {
    throw new Error("error" in body ? body.error : "Feedback could not be sent.");
  }
  return body as FeedbackResponse;
}
