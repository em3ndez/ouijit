import { execSync } from 'node:child_process';

/**
 * Git status information for a project
 */
export interface GitStatus {
  branch: string;
  isDirty: boolean;
}

/**
 * Gets the current git branch and dirty status for a project
 * @param projectPath - Path to the project directory
 * @returns GitStatus object or null if not a git repo or commands fail
 */
export function getGitStatus(projectPath: string): GitStatus | null {
  const opts = { cwd: projectPath, encoding: 'utf8' as const, stdio: ['pipe', 'pipe', 'pipe'] as const };

  try {
    // Get current branch name
    let branch: string;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', opts).toString().trim();
    } catch {
      // Not a git repo or no commits yet
      return null;
    }

    // Check if working directory is dirty
    let isDirty = false;
    try {
      const status = execSync('git status --porcelain', opts).toString();
      isDirty = status.length > 0;
    } catch {
      // If status fails, assume clean
      isDirty = false;
    }

    return { branch, isDirty };
  } catch {
    return null;
  }
}
