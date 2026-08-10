import { describe, expect, it } from "vitest";
import { isAgentFeedbackEnabled } from "./flag.js";

describe("isAgentFeedbackEnabled", () => {
  it("is off by default", () => {
    expect(isAgentFeedbackEnabled({})).toBe(false);
    expect(isAgentFeedbackEnabled({ AGENT_FEEDBACK: undefined })).toBe(false);
  });

  it("treats explicit negatives as off", () => {
    for (const value of ["", "0", "false", "FALSE", "off", " off "]) {
      expect(isAgentFeedbackEnabled({ AGENT_FEEDBACK: value })).toBe(false);
    }
  });

  it("treats any other value as on", () => {
    for (const value of ["1", "true", "on", "yes"]) {
      expect(isAgentFeedbackEnabled({ AGENT_FEEDBACK: value })).toBe(true);
    }
  });
});
