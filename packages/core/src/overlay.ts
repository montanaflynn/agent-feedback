import { submitFeedback } from "./client.js";
import { inspectMetadata } from "./metadata.js";
import { collectTarget, normalizeTarget } from "./selector.js";
import type { FeedbackSubmission } from "./types.js";

const HOST_ID = "agent-feedback-overlay";

export interface OverlayOptions {
  endpoint?: string;
}

export interface OverlayController {
  destroy(): void;
  start(): void;
  stop(): void;
}

export function mountAgentFeedback(
  options: OverlayOptions = {}
): OverlayController {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-agent-feedback", "");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = template();
  document.documentElement.append(host);

  const annotate = required<HTMLButtonElement>(shadow, "[data-annotate]");
  const highlight = required<HTMLDivElement>(shadow, "[data-highlight]");
  const composer = required<HTMLFormElement>(shadow, "[data-composer]");
  const targetLabel = required<HTMLElement>(shadow, "[data-target]");
  const textarea = required<HTMLTextAreaElement>(shadow, "textarea");
  const cancel = required<HTMLButtonElement>(shadow, "[data-cancel]");
  const send = required<HTMLButtonElement>(shadow, "[data-send]");
  const status = required<HTMLElement>(shadow, "[data-status]");

  let active = false;
  let selected: Element | undefined;

  const move = (event: MouseEvent) => {
    if (!active) return;
    const raw = event.target;
    if (!(raw instanceof Element) || host.contains(raw)) return;
    showHighlight(highlight, normalizeTarget(raw));
  };

  const select = (event: MouseEvent) => {
    if (!active) return;
    const raw = event.target;
    if (!(raw instanceof Element) || host.contains(raw)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selected = normalizeTarget(raw);
    const target = collectTarget(selected);
    targetLabel.textContent = `${target.tag}${target.text ? ` · ${target.text}` : ""}`;
    stop();
    composer.hidden = false;
    textarea.focus();
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (!composer.hidden) closeComposer();
      else stop();
    }
  };

  const start = () => {
    active = true;
    annotate.setAttribute("aria-pressed", "true");
    annotate.textContent = "× Stop";
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", select, true);
  };

  const stop = () => {
    active = false;
    annotate.setAttribute("aria-pressed", "false");
    annotate.textContent = "◎ Annotate";
    highlight.hidden = true;
    document.removeEventListener("mousemove", move, true);
    document.removeEventListener("click", select, true);
  };

  const closeComposer = () => {
    composer.hidden = true;
    textarea.value = "";
    status.textContent = "";
    selected = undefined;
  };

  annotate.addEventListener("click", () => (active ? stop() : start()));
  cancel.addEventListener("click", closeComposer);
  document.addEventListener("keydown", keydown, true);

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const instruction = textarea.value.trim();
    if (!selected || !instruction) return;

    send.disabled = true;
    status.textContent = "Sending…";
    const submission: FeedbackSubmission = {
      instruction,
      metadata: inspectMetadata(selected),
      page: { title: document.title, url: window.location.href },
      target: collectTarget(selected)
    };

    try {
      const result = await submitFeedback(submission, options.endpoint);
      status.textContent = `Sent ${result.id}`;
      window.setTimeout(closeComposer, 800);
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Feedback could not be sent.";
    } finally {
      send.disabled = false;
    }
  });

  return {
    destroy() {
      stop();
      document.removeEventListener("keydown", keydown, true);
      host.remove();
    },
    start,
    stop
  };
}

function showHighlight(highlight: HTMLDivElement, element: Element): void {
  const rect = element.getBoundingClientRect();
  Object.assign(highlight.style, {
    height: `${rect.height}px`,
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`
  });
  highlight.hidden = false;
}

function required<T extends Element>(
  root: ShadowRoot,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Agent Feedback is missing ${selector}`);
  return element;
}

function template(): string {
  return `
    <style>
      :host { all: initial; color-scheme: light; }
      *, *::before, *::after { box-sizing: border-box; }
      button, textarea { font: inherit; }
      [data-annotate] {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
        border: 1px solid #d4d4d8; border-radius: 999px; background: #18181b;
        color: #fff; padding: 10px 15px; box-shadow: 0 8px 30px #0003;
        font: 600 13px/1.2 ui-sans-serif, system-ui, sans-serif; cursor: pointer;
      }
      [data-annotate]:focus-visible, button:focus-visible, textarea:focus-visible {
        outline: 3px solid #a78bfa; outline-offset: 2px;
      }
      [data-highlight] {
        position: fixed; z-index: 2147483645; pointer-events: none;
        border: 2px solid #7c3aed; border-radius: 3px; background: #8b5cf622;
        box-shadow: 0 0 0 1px #fff8;
      }
      [data-composer] {
        position: fixed; right: 20px; bottom: 72px; z-index: 2147483647;
        width: min(380px, calc(100vw - 40px)); border: 1px solid #e4e4e7;
        border-radius: 14px; background: #fff; color: #18181b;
        padding: 18px; box-shadow: 0 18px 60px #0004;
        font: 14px/1.45 ui-sans-serif, system-ui, sans-serif;
      }
      [data-composer][hidden], [data-highlight][hidden] { display: none; }
      .eyebrow { margin: 0 0 4px; color: #71717a; font-size: 11px;
        font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      [data-target] { display: block; margin-bottom: 16px; font-weight: 600;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      label { display: block; margin-bottom: 7px; font-weight: 600; }
      textarea { display: block; width: 100%; min-height: 110px; resize: vertical;
        border: 1px solid #d4d4d8; border-radius: 8px; padding: 10px 11px;
        color: #18181b; background: #fff; }
      .footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
      [data-status] { margin-right: auto; color: #71717a; font-size: 12px; }
      .action { border: 0; border-radius: 7px; padding: 8px 12px; cursor: pointer; }
      [data-cancel] { background: transparent; color: #52525b; }
      [data-send] { background: #7c3aed; color: #fff; font-weight: 650; }
      [data-send]:disabled { cursor: wait; opacity: .55; }
    </style>
    <div data-highlight hidden></div>
    <button data-annotate type="button" aria-label="Annotate this page"
      aria-pressed="false">◎ Annotate</button>
    <form data-composer hidden>
      <p class="eyebrow">Target</p>
      <output data-target></output>
      <label for="agent-feedback-instruction">What should change?</label>
      <textarea id="agent-feedback-instruction" required
        placeholder="Describe the change for your coding agent…"></textarea>
      <div class="footer">
        <output data-status aria-live="polite"></output>
        <button class="action" data-cancel type="button">Cancel</button>
        <button class="action" data-send type="submit">Send</button>
      </div>
    </form>
  `;
}
