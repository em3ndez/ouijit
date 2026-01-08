import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Checks if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface DependencyCheck {
  needsInstall: boolean;
  installCommand?: string;
  packageManager?: string;
}

/**
 * Checks if a project needs dependencies installed and returns the install command
 */
export async function checkDependencies(projectPath: string): Promise<DependencyCheck> {
  // Check for Node.js project
  const hasPackageJson = await fileExists(path.join(projectPath, 'package.json'));
  const hasNodeModules = await fileExists(path.join(projectPath, 'node_modules'));

  if (hasPackageJson && !hasNodeModules) {
    // Detect package manager by lockfile
    const hasPnpmLock = await fileExists(path.join(projectPath, 'pnpm-lock.yaml'));
    const hasYarnLock = await fileExists(path.join(projectPath, 'yarn.lock'));
    const hasNpmLock = await fileExists(path.join(projectPath, 'package-lock.json'));
    const hasBunLock = await fileExists(path.join(projectPath, 'bun.lockb'));

    if (hasPnpmLock) {
      return { needsInstall: true, installCommand: 'pnpm install', packageManager: 'pnpm' };
    } else if (hasYarnLock) {
      return { needsInstall: true, installCommand: 'yarn install', packageManager: 'yarn' };
    } else if (hasBunLock) {
      return { needsInstall: true, installCommand: 'bun install', packageManager: 'bun' };
    } else if (hasNpmLock) {
      return { needsInstall: true, installCommand: 'npm ci', packageManager: 'npm' };
    } else {
      // No lockfile, use npm install
      return { needsInstall: true, installCommand: 'npm install', packageManager: 'npm' };
    }
  }

  // Check for Python project
  const hasRequirements = await fileExists(path.join(projectPath, 'requirements.txt'));
  const hasPyproject = await fileExists(path.join(projectPath, 'pyproject.toml'));
  const hasVenv = await fileExists(path.join(projectPath, 'venv')) ||
                  await fileExists(path.join(projectPath, '.venv'));

  if ((hasRequirements || hasPyproject) && !hasVenv) {
    if (hasRequirements) {
      return {
        needsInstall: true,
        installCommand: 'python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt',
        packageManager: 'pip'
      };
    } else if (hasPyproject) {
      return {
        needsInstall: true,
        installCommand: 'python3 -m venv venv && source venv/bin/activate && pip install -e .',
        packageManager: 'pip'
      };
    }
  }

  // Check for Rust project
  const hasCargoToml = await fileExists(path.join(projectPath, 'Cargo.toml'));
  const hasTarget = await fileExists(path.join(projectPath, 'target'));

  if (hasCargoToml && !hasTarget) {
    return { needsInstall: true, installCommand: 'cargo build', packageManager: 'cargo' };
  }

  // Check for Go project
  const hasGoMod = await fileExists(path.join(projectPath, 'go.mod'));
  const hasGoSum = await fileExists(path.join(projectPath, 'go.sum'));

  if (hasGoMod && !hasGoSum) {
    return { needsInstall: true, installCommand: 'go mod download', packageManager: 'go' };
  }

  return { needsInstall: false };
}

/**
 * Checks if a project is an imported project
 */
export async function isImportedProject(projectPath: string): Promise<boolean> {
  return fileExists(path.join(projectPath, '.ouijit-import.json'));
}

/**
 * Gets the full command to run, prepending install if needed
 */
export async function getFullCommand(projectPath: string, runCommand: string): Promise<string> {
  const isImported = await isImportedProject(projectPath);

  if (!isImported) {
    return runCommand;
  }

  const depCheck = await checkDependencies(projectPath);

  if (depCheck.needsInstall && depCheck.installCommand) {
    // Chain install command with the run command
    return `${depCheck.installCommand} && ${runCommand}`;
  }

  return runCommand;
}
