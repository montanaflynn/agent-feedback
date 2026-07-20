import {
  initializeProject,
  type InitResult
} from "./init.js";
import type { SkillTarget } from "./skill.js";

export interface UpdateOptions {
  cwd: string;
  install?: boolean;
  log?: (message: string) => void;
  skill?: boolean;
  skillTarget?: SkillTarget;
  skillTargets?: SkillTarget[];
}

export type UpdateResult = InitResult;

export async function updateProject(
  options: UpdateOptions
): Promise<UpdateResult> {
  return initializeProject({
    backupSkill: true,
    cwd: options.cwd,
    forceSkill: true,
    install: options.install,
    log: options.log,
    operation: "update",
    packageTag: "latest",
    skill: options.skill,
    skillTarget: options.skillTarget,
    skillTargets: options.skillTargets
  });
}
