# Changelog

All packages (`@agent-feedback/core`, `react`, `vite`, `next`, `cli`) are
versioned in lockstep.

## 0.2.1 — 2026-09-28

- **Security**: the broker accepted feedback from any website open in the
  browser. It answered every request with `access-control-allow-origin: *`,
  and a cross-origin `text/plain` POST needs no preflight, so another page
  could add a feedback item that the agent would then carry out. The broker
  now refuses a request whose `Sec-Fetch-Site` names another site (`403`),
  refuses a `POST` that is not `application/json` (`415`), and sends no CORS
  headers. The overlay and the agent's `curl` are unaffected. Upgrade with
  `npx @agent-feedback/cli@latest update`.

## 0.2.0 — 2026-08-10

Off by default, and no app-code edits for Next.js.

- **Breaking**: everything is now gated behind an `AGENT_FEEDBACK=1` environment
  variable on the dev server. Without it the Vite plugin is inert, the Next
  wiring is a no-op, all endpoints return 404, and the overlay never mounts —
  a committed installation changes nothing for teammates, staging, or
  production until someone opts in. The `run-agent-feedback` skill opts in
  automatically when launching the dev server.
- New Next.js integration is configuration-only: `withAgentFeedback` in
  `next.config` starts a local broker and rewrites `/__agent-feedback` to it,
  and a one-line `instrumentation-client.ts` (Next 15.3+) mounts the overlay.
  No `layout.tsx` edits, no route files. The installer migrates existing
  layout/route wiring automatically (backups under `.agent-feedback/backups/`).
- The overlay now probes `GET /__agent-feedback/status` before mounting, so a
  single server-side flag controls the whole stack.
- The legacy `<AgentFeedback />` + route-file integration remains supported for
  Next versions before 15.3; `@agent-feedback/next/route` now also exports a
  `GET` status handler.
- When the dev server starts without the flag, it prints an
  `[agent-feedback:disabled]` block explaining how to enable it. Installed
  skills now record the release that wrote them (`version:` frontmatter,
  stamped by the CLI); if the packages were bumped directly without
  `agent-feedback update`, the block detects the outdated workflow and tells
  the agent to run the update first. The browser console gets an equivalent
  warning for legacy Next installs.

## 0.1.0 — 2026-08-07

First versioned release of the full toolchain.

- Development-only annotation overlay: select an element, describe the change,
  submit it to the local broker.
- Structured feedback records written to `.agent-feedback/feedback.jsonl` and
  printed as `[agent-feedback:new]` blocks on the development server's stdout.
- `POST /__agent-feedback` and `PATCH /__agent-feedback/:id` local HTTP API
  with `pending`/`resolved` lifecycle.
- Vite plugin (`@agent-feedback/vite`) with HTML injection and HTTP middleware.
- Next.js App Router integration (`@agent-feedback/next`) with a client
  component and route handlers.
- Optional React Fiber metadata (`@agent-feedback/react`): component names and
  hierarchy on each record.
- Installer CLI (`@agent-feedback/cli`) with `install`, `update`, `uninstall`,
  and `skill` commands, framework and agent detection, and backup of
  customized files.
- `run-agent-feedback` agent skill installed to `.claude/skills/` and/or
  `.agents/skills/`.
- Repository metadata in every package and CI/publish workflows.

## 0.0.1 – 0.0.3 — 2026-07-20

Initial npm publishes of the MVP.
