// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { mountAgentFeedback } from "./overlay.js";

afterEach(() => {
  document.body.innerHTML = "";
  document.getElementById("agent-feedback-overlay")?.remove();
  vi.restoreAllMocks();
});

describe("browser overlay", () => {
  it("selects an element and submits structured feedback", async () => {
    document.title = "Pricing";
    document.body.innerHTML =
      '<button data-testid="trial"><span>Start trial</span></button>';
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "af_test", status: "pending" }), {
        headers: { "content-type": "application/json" },
        status: 201
      })
    );
    const controller = mountAgentFeedback();
    const host = document.getElementById("agent-feedback-overlay")!;
    const shadow = host.shadowRoot!;

    shadow.querySelector<HTMLButtonElement>("[data-annotate]")!.click();
    document
      .querySelector("span")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const composer = shadow.querySelector<HTMLFormElement>("[data-composer]")!;
    expect(composer.hidden).toBe(false);
    expect(shadow.querySelector("[data-target]")!.textContent).toBe(
      "button · Start trial"
    );

    const textarea = shadow.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Use the secondary style.";
    composer.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      instruction: "Use the secondary style.",
      target: {
        selector: '[data-testid="trial"]',
        tag: "button",
        text: "Start trial"
      }
    });
    controller.destroy();
  });
});
