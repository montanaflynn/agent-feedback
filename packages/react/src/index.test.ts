// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { reactMetadataProvider } from "./index.js";

describe("React metadata provider", () => {
  it("extracts component names from an attached Fiber chain", () => {
    function PricingPage() {}
    function PricingCard() {}
    function Button() {}

    const element = document.createElement("button");
    Object.defineProperty(element, "__reactFiber$test", {
      enumerable: true,
      value: {
        return: {
          return: {
            return: { return: null, type: PricingPage },
            type: PricingCard
          },
          type: Button
        },
        type: "button"
      }
    });

    expect(reactMetadataProvider.inspect(element)).toEqual({
      component: "Button",
      framework: "react",
      hierarchy: ["PricingPage", "PricingCard", "Button"]
    });
  });

  it("returns no metadata when React is absent", () => {
    expect(reactMetadataProvider.inspect(document.createElement("div"))).toBeUndefined();
  });

  it("omits framework internals from component metadata", () => {
    function SegmentViewNode() {}
    function AppRouter() {}

    const element = document.createElement("button");
    Object.defineProperty(element, "__reactFiber$test", {
      enumerable: true,
      value: {
        return: {
          return: { return: null, type: AppRouter },
          type: SegmentViewNode
        },
        type: "button"
      }
    });

    expect(reactMetadataProvider.inspect(element)).toEqual({
      framework: "react"
    });
  });
});
