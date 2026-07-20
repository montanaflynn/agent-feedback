import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isMainModule(
  moduleUrl: string,
  entryPath: string | undefined
): boolean {
  if (!entryPath) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entryPath);
  } catch {
    return false;
  }
}
