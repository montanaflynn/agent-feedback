export async function probeAndMount(): Promise<(() => void) | undefined> {
  const [core, react] = await Promise.all([
    import("@agent-feedback/core/browser"),
    import("@agent-feedback/react")
  ]);
  if (!(await core.probeAgentFeedback())) {
    console.warn(
      "[agent-feedback] installed but inactive — restart the dev server with AGENT_FEEDBACK=1. If this setup predates v0.2.0, run: npx @agent-feedback/cli@latest update"
    );
    return undefined;
  }
  core.registerMetadataProvider(react.reactMetadataProvider);
  const controller = core.mountAgentFeedback();
  return () => controller.destroy();
}
