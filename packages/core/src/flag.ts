const DISABLED_VALUES = new Set(["", "0", "false", "off"]);

export function isAgentFeedbackEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const value = env.AGENT_FEEDBACK;
  if (value === undefined) return false;
  return !DISABLED_VALUES.has(value.trim().toLowerCase());
}
