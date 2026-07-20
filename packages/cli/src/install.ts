import {
  initializeProject,
  type InitOptions,
  type InitResult
} from "./init.js";

export type InstallOptions = InitOptions;
export type InstallResult = InitResult;

export async function installProject(
  options: InstallOptions
): Promise<InstallResult> {
  return initializeProject(options);
}
