<h1 align="center">Agent Feedback</h1>

<p align="center">
  <strong>Leave comments on your live app. Your coding agent resolves them.</strong>
</p>

<p align="center">
  <a href="https://github.com/montanaflynn/agent-feedback/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/montanaflynn/agent-feedback/ci.yml?branch=main&label=tests"></a>
  <a href="https://www.npmjs.com/package/@agent-feedback/cli"><img alt="npm" src="https://img.shields.io/npm/v/%40agent-feedback%2Fcli?label=npm"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="#install"><img alt="Works with Vite and Next.js" src="https://img.shields.io/badge/works%20with-Vite%20%C2%B7%20Next.js-646CFF"></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#install">Install</a> ·
  <a href="#what-the-agent-sees">What the agent sees</a> ·
  <a href="#http-api">HTTP API</a> ·
  <a href="#develop">Develop</a>
</p>

---

![Selecting a button in a running app and describing the change](docs/demo.gif)

## Why Agent Feedback exists

Point, don't describe.

Explaining a UI change to a coding agent in prose is slow and lossy — "the third card in the pricing grid, no, the *button* under the title" takes longer to type than the fix. Meanwhile the exact selector, component name, and page URL are sitting right there in the DOM.

Agent Feedback adds a development-only **◎ Annotate** overlay to your app. Click an element, say what you want, and a structured record — selector, component, page, instruction — lands in your dev server's stdout, where an agent is already watching. No screenshots, no copy-pasted selectors, no hand-written prompt.

Everything is local and off by default. The overlay and endpoints only exist while the dev server runs with `AGENT_FEEDBACK=1` — the committed setup is inert for teammates who don't opt in, and nothing ships in production builds. Feedback lives in `.agent-feedback/feedback.jsonl` and your development server logs; there is no hosted service and no account.

## Quickstart

From an app using Vite or the Next.js App Router:

```sh
npx @agent-feedback/cli@latest install
```

Start your dev server with the flag that turns the loop on:

```sh
AGENT_FEEDBACK=1 npm run dev
```

Then:

1. Click **◎ Annotate** (bottom-right, development only)
2. Hover and click an element
3. Describe the change and press **Send**

Without `AGENT_FEEDBACK=1` nothing mounts and every endpoint 404s, so installing Agent Feedback changes nothing for teammates until they (or their agent) opt in. The bundled skill starts the dev server with the flag automatically; humans can put it in `.env.local` or their shell.

Nested elements normalize to an interactive ancestor — selecting a `span` inside a button targets the button. The installer also drops a `run-agent-feedback` skill into your project so your agent knows to keep the dev server attached, watch for feedback, implement each request, and mark it resolved:

```text
Use $run-agent-feedback to launch the app and respond to visual feedback.
```

To try it without your own app, this repo ships complete examples — see [Develop](#develop).

## What the agent sees

Each accepted request gets an `af_` ID and a `pending` status, appended to `.agent-feedback/feedback.jsonl`:

```json
{"id":"af_a1b2c3","status":"pending","createdAt":"2026-07-20T15:00:00.000Z","instruction":"Use the secondary button style.","page":{"url":"http://localhost:3000/pricing","title":"Pricing"},"target":{"selector":"[data-testid=\"trial\"]","tag":"button","text":"Start trial","role":"button"},"metadata":{"framework":"react","component":"PricingCard","hierarchy":["PricingPage","PricingCard"]}}
```

The dev server also prints a recognizable block, so an agent tailing the process needs zero integration:

```text
[agent-feedback:new]

id: af_a1b2c3

page:
/pricing

target:
button "Start trial"

instruction:
Use the secondary button style.

[/agent-feedback:new]
```

With `@agent-feedback/react` installed, records include the component name and hierarchy from React's development metadata.

## Install

```sh
npx @agent-feedback/cli@latest install
```

The installer detects your framework and package manager, installs the relevant integration, updates the framework configuration, adds `.agent-feedback/` to `.gitignore`, and installs the agent workflow in every detected agent location:

- `.claude/skills/run-agent-feedback/SKILL.md` when Claude is detected
- `.agents/skills/run-agent-feedback/SKILL.md` when Codex, Cursor, or OpenCode is detected — and as the portable fallback when no agent is detected

Detection checks project and home configuration directories plus executables on `PATH`; the skill is always written to the project. `init` is an alias for `install`. Use `--no-skill` to configure only the runtime, or `npx @agent-feedback/cli skill` to install or inspect only the skill (existing customized skills are preserved; `--force` restores the packaged version).

<details>
<summary><strong>Manual setup — Vite</strong></summary>

```sh
npm install --save-dev @agent-feedback/vite
```

For a React application, also install `@agent-feedback/react`, then add the plugin:

```ts
import { defineConfig } from "vite";
import { agentFeedback } from "@agent-feedback/vite";

export default defineConfig({
  plugins: [agentFeedback({ react: true })]
});
```

Omit `{ react: true }` for Vue, Svelte, Solid, Preact, or plain HTML. Element selection and submission still work; only React component metadata is omitted.

</details>

<details>
<summary><strong>Manual setup — Next.js App Router</strong></summary>

```sh
npm install --save-dev @agent-feedback/next
```

No app code changes are needed — only configuration. Wrap `next.config`:

```js
// next.config.mjs
import { withAgentFeedback } from "@agent-feedback/next/config";

export default withAgentFeedback({
  /* your existing config */
});
```

And create `instrumentation-client.ts` (or add the import to your existing one; requires Next 15.3+):

```ts
import "@agent-feedback/next/auto";
```

When the dev server runs with `AGENT_FEEDBACK=1`, the wrapper starts a local feedback broker and rewrites `/__agent-feedback` to it; the client probes that endpoint and mounts the overlay only when it answers. In production builds — or without the flag — both are inert.

For projects on Next older than 15.3, the previous integration still works: render `<AgentFeedback />` from `@agent-feedback/next` in the root layout and export the `GET`/`POST` and `PATCH` handlers from `@agent-feedback/next/route` and `@agent-feedback/next/resolve` in `app/%5F_agent-feedback/` route files.

</details>

### Update

```sh
npx @agent-feedback/cli@latest update
```

Installs the latest integration packages, re-runs the idempotent framework setup, and refreshes every project-local skill copy. Unlike the conservative `skill` command, `update` deliberately replaces an outdated or customized workflow — differing copies are first saved under `.agent-feedback/backups/`. Use `--no-install` to skip dependency changes, `--no-skill` to keep workflows untouched, or pin a version (`npx @agent-feedback/cli@0.1.0 update`) for a staged rollout.

### Uninstall

```sh
npx @agent-feedback/cli@latest uninstall
```

Removes the framework wiring, the `@agent-feedback/*` packages, and both possible skill copies — backing up customized files under `.agent-feedback/backups/` first. Feedback history, backups, and the `.gitignore` entry are preserved to avoid destructive data deletion. Use `--keep-packages` or `--keep-skill` for a partial uninstall.

Restart the development server after any lifecycle operation.

## HTTP API

All endpoints exist only in development and only while the server runs with `AGENT_FEEDBACK=1`; otherwise they return `404`.

Feedback becomes instructions for your agent, so the endpoints accept it only from the app's own pages: a request whose `Sec-Fetch-Site` names another site gets `403`, a `POST` that is not `application/json` gets `415`, and no CORS headers are sent, so a cross-origin preflight fails. Requests without `Sec-Fetch-Site`, such as the agent's `curl`, are not from a browser page and are accepted.

`GET /__agent-feedback/status` answers `{ "status": "ok" }` — the overlay probes it before mounting, and agents can use it to confirm the loop is live.

`POST /__agent-feedback` accepts:

```json
{
  "instruction": "Use the secondary button style.",
  "page": { "url": "http://localhost:3000/pricing", "title": "Pricing" },
  "target": {
    "selector": "[data-testid=\"trial\"]",
    "tag": "button",
    "text": "Start trial",
    "role": "button"
  },
  "metadata": {}
}
```

and responds `201`:

```json
{ "id": "af_a1b2c3", "status": "pending" }
```

`PATCH /__agent-feedback/:id` appends a resolution event and returns:

```json
{ "id": "af_a1b2c3", "status": "resolved" }
```

Resolution is driven by the agent through this endpoint; the browser UI does not expose resolution controls.

## Develop

Requires Node.js 20+.

```sh
npm install
npm run check
```

The workspace packages:

| Package | What it is |
| --- | --- |
| `@agent-feedback/core` | Overlay, selectors, HTTP client, broker, persistence |
| `@agent-feedback/react` | Optional React Fiber metadata |
| `@agent-feedback/vite` | Vite HTML injection and HTTP middleware |
| `@agent-feedback/next` | App Router client and route handlers |
| `@agent-feedback/cli` | Project installer CLI |

Two complete example apps are included — `npm run dev:vite` (<http://127.0.0.1:4173>) and `npm run dev:next` (<http://127.0.0.1:4174>). To try the intended continuous loop, invoke the repo-local skill:

```text
Use $run-agent-feedback to launch the Vite example and respond to visual feedback.
```

See the [examples guide](examples/README.md) for both commands and [Architecture](docs/architecture.md) for boundaries and design decisions.
