"use client";

import { useEffect } from "react";
import { probeAndMount } from "./mount.js";

export function AgentFeedback(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let disposed = false;
    let destroy: (() => void) | undefined;
    void probeAndMount().then((cleanup) => {
      if (!cleanup) return;
      if (disposed) {
        cleanup();
        return;
      }
      destroy = cleanup;
    });

    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);

  return null;
}
