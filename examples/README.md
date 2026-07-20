# Example applications

Both examples use the local workspace packages and the repository-local
`$run-agent-feedback` skill.

From the repository root:

```bash
npm install
npm run dev:vite
```

Open <http://127.0.0.1:4173>. For Next.js:

```bash
npm run dev:next
```

Open <http://127.0.0.1:4174>.

To exercise the agent workflow from the repository, ask:

```text
Use $run-agent-feedback to launch the Vite example and respond to visual feedback.
```

For Next.js, replace “Vite” with “Next.js.” The agent should keep the
development server attached, open the app, watch its structured logs, implement
submitted feedback, mark it resolved, and continue monitoring.

The local skill is `.agents/skills/run-agent-feedback/SKILL.md`.
