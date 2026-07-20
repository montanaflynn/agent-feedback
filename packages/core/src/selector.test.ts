// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  collectTarget,
  createSelector,
  normalizeTarget
} from "./selector.js";

describe("element selection", () => {
  it("normalizes a nested element to its interactive ancestor", () => {
    document.body.innerHTML =
      '<button data-testid="start"><span>Start trial</span></button>';
    const span = document.querySelector("span");

    expect(normalizeTarget(span!)).toBe(document.querySelector("button"));
    expect(collectTarget(span!)).toMatchObject({
      role: "button",
      selector: '[data-testid="start"]',
      tag: "button",
      text: "Start trial"
    });
  });

  it("builds a unique structural selector", () => {
    document.body.innerHTML = `
      <main>
        <section><button>First</button></section>
        <section><button aria-label="Choose starter">Second</button></section>
      </main>
    `;
    const button = document.querySelectorAll("button")[1]!;

    const selector = createSelector(button);

    expect(document.querySelector(selector)).toBe(button);
    expect(selector).toContain('[aria-label="Choose starter"]');
  });

  it("collects only useful, non-sensitive attributes", () => {
    document.body.innerHTML = `
      <input name="email" placeholder="you@example.com"
        data-private="secret" value="private value">
    `;

    expect(collectTarget(document.querySelector("input")!)).toMatchObject({
      attributes: {
        name: "email",
        placeholder: "you@example.com"
      },
      role: "textbox",
      tag: "input"
    });
  });
});
