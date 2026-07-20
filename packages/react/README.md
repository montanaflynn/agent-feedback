# @agent-feedback/react

Optional React metadata enrichment for Agent Feedback.

```bash
npm install --save-dev @agent-feedback/react
```

The provider inspects React development metadata to add component names and a
component hierarchy to feedback payloads. Element selection and submission do
not depend on this package.

Vite users enable it with:

```ts
agentFeedback({ react: true })
```

See the [Agent Feedback repository](https://github.com/montanaflynn/agent-feedback) for full documentation.
