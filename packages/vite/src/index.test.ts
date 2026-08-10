import { afterEach, describe, expect, it, vi } from "vitest";
import { agentFeedback } from "./index.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Vite plugin", () => {
  it("stays inert without AGENT_FEEDBACK=1", () => {
    const plugin = agentFeedback();

    expect(plugin.name).toBe("agent-feedback");
    expect(plugin.transformIndexHtml).toBeUndefined();
    expect(plugin.configureServer).toBeUndefined();
  });

  it("injects the resolvable virtual-module URL when enabled", () => {
    vi.stubEnv("AGENT_FEEDBACK", "1");
    const plugin = agentFeedback();
    const transform = plugin.transformIndexHtml;
    if (!transform || typeof transform === "function") {
      throw new Error("Expected an ordered HTML transform.");
    }

    const result = transform.handler.call({} as never, "<html></html>", {} as never);

    expect(result).toEqual([
      {
        attrs: {
          src: "/@id/virtual:agent-feedback",
          type: "module"
        },
        injectTo: "body",
        tag: "script"
      }
    ]);
  });
});
