import type { FeedbackTarget } from "./types.js";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='switch']",
  "[role='tab']"
].join(",");

const ATTRIBUTE_ALLOWLIST = [
  "aria-label",
  "aria-labelledby",
  "data-testid",
  "href",
  "name",
  "placeholder",
  "title",
  "type"
];

export function normalizeTarget(element: Element): Element {
  return element.closest(INTERACTIVE_SELECTOR) ?? element;
}

export function collectTarget(element: Element): FeedbackTarget {
  const target = normalizeTarget(element);
  const attributes: Record<string, string> = {};

  for (const name of ATTRIBUTE_ALLOWLIST) {
    const value = target.getAttribute(name);
    if (value) attributes[name] = value;
  }

  return {
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    role: target.getAttribute("role") ?? implicitRole(target),
    selector: createSelector(target),
    tag: target.tagName.toLowerCase(),
    text: visibleText(target)
  };
}

export function createSelector(element: Element): string {
  if (element.id) return `#${cssEscape(element.id)}`;

  const testId = element.getAttribute("data-testid");
  if (testId) return `[data-testid="${escapeAttribute(testId)}"]`;

  const path: string[] = [];
  let current: Element | null = element;

  while (current && path.length < 5) {
    const tag = current.tagName.toLowerCase();
    const stableAttribute = stableAttributeSelector(current);
    let part = stableAttribute ? `${tag}${stableAttribute}` : tag;
    const parentElement: Element | null = current.parentElement;

    if (parentElement) {
      const sameTagSiblings = Array.from(parentElement.children).filter(
        (child) => child.tagName === current?.tagName
      );
      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }
    }

    path.unshift(part);
    const selector = path.join(" > ");
    if (isUnique(element.ownerDocument, selector)) return selector;
    current = parentElement;
  }

  return path.join(" > ");
}

function stableAttributeSelector(element: Element): string {
  for (const name of ["name", "aria-label", "data-plan"]) {
    const value = element.getAttribute(name);
    if (value) return `[${name}="${escapeAttribute(value)}"]`;
  }
  return "";
}

function isUnique(document: Document, selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function escapeAttribute(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function visibleText(element: Element): string | undefined {
  const text = element.textContent?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 160) : undefined;
}

function implicitRole(element: Element): string | undefined {
  const tag = element.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && element.hasAttribute("href")) return "link";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag !== "input") return undefined;

  const type = element.getAttribute("type")?.toLowerCase() ?? "text";
  if (["button", "reset", "submit"].includes(type)) return "button";
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio";
  return "textbox";
}
