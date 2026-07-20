import { describe, expect, it } from "vitest";
import { agentFeedback } from "./index.js";

describe("Vite plugin", () => {
  it("injects the resolvable virtual-module URL", () => {
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
