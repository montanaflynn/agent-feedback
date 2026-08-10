export async function probeAgentFeedback(
  endpoint = "/__agent-feedback"
): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/status`);
    if (!response.ok) return false;
    const body = (await response.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}
