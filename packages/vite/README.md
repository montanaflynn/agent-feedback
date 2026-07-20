# @agent-feedback/vite

Vite integration for Agent Feedback.

```bash
npm install --save-dev @agent-feedback/vite
```

```ts
import { defineConfig } from "vite";
import { agentFeedback } from "@agent-feedback/vite";

export default defineConfig({
  plugins: [agentFeedback({ react: true })]
});
```

The plugin injects the development-only annotation overlay and registers the
local feedback HTTP middleware. Omit `{ react: true }` outside React projects.

See the [Agent Feedback repository](https://github.com/montanaflynn/agent-feedback) for full documentation.
