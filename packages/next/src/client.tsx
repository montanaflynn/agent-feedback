"use client";

import { useEffect } from "react";

export function AgentFeedback(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let disposed = false;
    let destroy: (() => void) | undefined;
    void Promise.all([
      import("@agent-feedback/core/browser"),
      import("@agent-feedback/react")
    ]).then(([core, react]) => {
      if (disposed) return;
      core.registerMetadataProvider(react.reactMetadataProvider);
      const controller = core.mountAgentFeedback();
      destroy = () => controller.destroy();
    });

    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);

  return null;
}
