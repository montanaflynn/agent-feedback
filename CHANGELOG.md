# Changelog

All packages (`@agent-feedback/core`, `react`, `vite`, `next`, `cli`) are
versioned in lockstep.

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
