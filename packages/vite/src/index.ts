import {
  FeedbackBroker,
  isAgentFeedbackEnabled,
  type BrokerOptions
} from "@agent-feedback/core/server";
import type { Plugin } from "vite";

const PUBLIC_ID = "virtual:agent-feedback";
const RESOLVED_ID = `\0${PUBLIC_ID}`;

export interface AgentFeedbackPluginOptions extends BrokerOptions {
  react?: boolean;
}

export function agentFeedback(
  options: AgentFeedbackPluginOptions = {}
): Plugin {
  // Off by default: the plugin stays committed in vite.config while remaining
  // inert until the dev server runs with AGENT_FEEDBACK=1.
  if (!isAgentFeedbackEnabled()) {
    return { apply: "serve", name: "agent-feedback" };
  }

  const broker = new FeedbackBroker(options);

  return {
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(broker.middleware());
    },
    enforce: "pre",
    load(id) {
      if (id !== RESOLVED_ID) return;
      const reactSetup = options.react
        ? `
          import { registerMetadataProvider } from "@agent-feedback/core/browser";
          import { reactMetadataProvider } from "@agent-feedback/react";
          registerMetadataProvider(reactMetadataProvider);
        `
        : "";
      return `
        import { mountAgentFeedback } from "@agent-feedback/core/browser";
        ${reactSetup}
        mountAgentFeedback();
      `;
    },
    name: "agent-feedback",
    resolveId(id) {
      return id === PUBLIC_ID ? RESOLVED_ID : undefined;
    },
    transformIndexHtml: {
      handler() {
        return [
          {
            attrs: {
              src: `/@id/${PUBLIC_ID}`,
              type: "module"
            },
            injectTo: "body",
            tag: "script"
          }
        ];
      },
      order: "post"
    }
  };
}
