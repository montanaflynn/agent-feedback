# @agent-feedback/next

Next.js App Router integration for Agent Feedback.

```bash
npm install --save-dev @agent-feedback/next
```

Render `AgentFeedback` in the root layout, then export the included `POST` and
`PATCH` handlers from `app/%5F_agent-feedback/route.ts` and
`app/%5F_agent-feedback/[id]/route.ts`.

The client and handlers are development-only. For automatic configuration, run:

```bash
npx @agent-feedback/cli init
```

See the [Agent Feedback repository](https://github.com/montanaflynn/agent-feedback) for full documentation.
