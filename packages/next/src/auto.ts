import { probeAndMount } from "./mount.js";

// Imported for its side effect from instrumentation-client.ts. The development
// check is statically eliminated from production bundles, and the probe keeps
// the overlay unmounted unless the dev server runs with AGENT_FEEDBACK=1.
if (
  process.env.NODE_ENV === "development" &&
  typeof document !== "undefined"
) {
  void probeAndMount();
}
