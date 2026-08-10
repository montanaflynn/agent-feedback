import {
  deterministicPort,
  formatDisabledNotice,
  isAgentFeedbackEnabled,
  startBrokerServer
} from "@agent-feedback/core/server";

let noticePrinted = false;

interface Rewrite {
  destination: string;
  source: string;
}

interface GroupedRewrites {
  afterFiles?: Rewrite[];
  beforeFiles?: Rewrite[];
  fallback?: Rewrite[];
}

type Rewrites = Rewrite[] | GroupedRewrites;

interface ConfigWithRewrites {
  [key: string]: unknown;
  rewrites?: (() => Promise<Rewrites> | Rewrites) | undefined;
}

export interface WithAgentFeedbackOptions {
  cwd?: string;
  port?: number;
}

export function withAgentFeedback<Config extends ConfigWithRewrites>(
  config: Config = {} as Config,
  options: WithAgentFeedbackOptions = {}
): Config {
  if (process.env.NODE_ENV === "production") return config;
  if (!isAgentFeedbackEnabled()) {
    // Turbopack can evaluate the configuration more than once per process.
    if (process.env.NODE_ENV === "development" && !noticePrinted) {
      noticePrinted = true;
      console.log(formatDisabledNotice(options.cwd));
    }
    return config;
  }

  const cwd = options.cwd ?? process.cwd();
  const port = options.port ?? deterministicPort(cwd);
  // Turbopack may evaluate the configuration in several processes; the broker
  // tolerates EADDRINUSE so exactly one of them serves the shared port.
  void startBrokerServer({ cwd, port }).catch((error: unknown) => {
    console.error(
      `[agent-feedback] broker failed to start on port ${port}:`,
      error instanceof Error ? error.message : error
    );
  });

  const origin = `http://127.0.0.1:${port}`;
  const added: Rewrite[] = [
    { destination: `${origin}/__agent-feedback`, source: "/__agent-feedback" },
    {
      destination: `${origin}/__agent-feedback/:path*`,
      source: "/__agent-feedback/:path*"
    }
  ];
  const previous = config.rewrites;

  return {
    ...config,
    rewrites: async (): Promise<Rewrites> => {
      const resolved = previous ? await previous() : undefined;
      if (!resolved) {
        return { afterFiles: [], beforeFiles: added, fallback: [] };
      }
      if (Array.isArray(resolved)) return [...added, ...resolved];
      return {
        ...resolved,
        beforeFiles: [...added, ...(resolved.beforeFiles ?? [])]
      };
    }
  };
}
