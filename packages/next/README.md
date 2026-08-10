# @agent-feedback/next

Next.js App Router integration for Agent Feedback.

```bash
npm install --save-dev @agent-feedback/next
```

Configuration-only wiring — no app code changes. Wrap `next.config`:

```js
import { withAgentFeedback } from "@agent-feedback/next/config";

export default withAgentFeedback({});
```

And create `instrumentation-client.ts` (Next 15.3+):

```ts
import "@agent-feedback/next/auto";
```

Everything stays inert unless the dev server runs with `AGENT_FEEDBACK=1`, and
nothing ships in production builds. For automatic configuration, run:

```bash
npx @agent-feedback/cli install
```

See the [Agent Feedback repository](https://github.com/montanaflynn/agent-feedback) for full documentation.
