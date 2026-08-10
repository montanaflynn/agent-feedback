export async function probeAndMount(): Promise<(() => void) | undefined> {
  const [core, react] = await Promise.all([
    import("@agent-feedback/core/browser"),
    import("@agent-feedback/react")
  ]);
  if (!(await core.probeAgentFeedback())) return undefined;
  core.registerMetadataProvider(react.reactMetadataProvider);
  const controller = core.mountAgentFeedback();
  return () => controller.destroy();
}
