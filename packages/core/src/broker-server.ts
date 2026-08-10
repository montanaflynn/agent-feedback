import { createServer, type Server } from "node:http";
import { FeedbackBroker, type BrokerOptions } from "./broker.js";

export interface BrokerServerOptions extends BrokerOptions {
  port?: number;
}

export interface BrokerServer {
  broker: FeedbackBroker;
  close(): Promise<void>;
  /**
   * Undefined when another process already listens on the port. The broker on
   * the winning process serves every sibling, so this is not an error.
   */
  server?: Server;
  port: number;
}

export function deterministicPort(
  seed: string,
  base = 42_000,
  range = 4_000
): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return base + (Math.abs(hash) % range);
}

export async function startBrokerServer(
  options: BrokerServerOptions = {}
): Promise<BrokerServer> {
  const broker = new FeedbackBroker(options);
  const port = options.port ?? deterministicPort(options.cwd ?? process.cwd());
  const middleware = broker.middleware();
  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.statusCode = 404;
      response.end();
    });
  });
  // Keep short-lived processes that evaluate configuration from hanging.
  server.unref();

  return new Promise((resolvePromise, rejectPromise) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resolvePromise({
          broker,
          close: async () => {},
          port
        });
        return;
      }
      rejectPromise(error);
    });
    server.listen(port, "127.0.0.1", () => {
      resolvePromise({
        broker,
        close: () =>
          new Promise((resolveClose) => {
            server.close(() => resolveClose());
          }),
        port,
        server
      });
    });
  });
}
