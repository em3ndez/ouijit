import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync, spawn } from 'node:child_process';

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

/**
 * Checks if a command exists in PATH
 */
function commandExists(command: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${cmd} ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the path where mise should be installed
 */
function getMiseInstallPath(): string {
  return path.join(os.homedir(), '.local', 'bin', 'mise');
}

/**
 * Gets the mise binary path (checks common locations)
 */
async function getMisePath(): Promise<string | null> {
  // Check if mise is in PATH
  if (commandExists('mise')) {
    try {
      const result = execSync('which mise', { encoding: 'utf8' }).trim();
      return result;
    } catch {
      return 'mise'; // Fall back to just the command name
    }
  }

  // Check common install locations
  const locations = [
    getMiseInstallPath(),
    path.join(os.homedir(), '.local', 'bin', 'mise'),
    '/usr/local/bin/mise',
    '/opt/homebrew/bin/mise',
  ];

  for (const loc of locations) {
    if (await fileExists(loc)) {
      return loc;
    }
  }

  return null;
}

/**
 * Installs mise if not present
 */
export async function ensureMiseInstalled(): Promise<{ success: boolean; misePath?: string; error?: string }> {
  // Check if already installed
  const existingPath = await getMisePath();
  if (existingPath) {
    return { success: true, misePath: existingPath };
  }

  // Install mise
  console.log('Installing mise...');

  try {
    // Create install directory
    const installDir = path.dirname(getMiseInstallPath());
    await fs.mkdir(installDir, { recursive: true });

    // Download and install mise using the official installer
    // This works on macOS and Linux
    if (process.platform === 'win32') {
      return {
        success: false,
        error: 'Windows installation not yet supported. Please install mise manually: https://mise.jdx.dev'
      };
    }

    // Use the official install script
    execSync('curl https://mise.run | sh', {
      stdio: 'inherit',
      shell: '/bin/bash',
      env: {
        ...process.env,
        MISE_INSTALL_PATH: getMiseInstallPath(),
      },
    });

    const misePath = getMiseInstallPath();
    if (await fileExists(misePath)) {
      return { success: true, misePath };
    }

    return { success: false, error: 'mise installation completed but binary not found' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install mise',
    };
  }
}

export interface RuntimeRequirement {
  runtime: 'node' | 'go' | 'rust' | 'python' | 'ruby' | 'java' | 'bun' | 'deno' | null;
  version?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'cargo' | 'go';
  installCommand?: string;
}

/**
 * Detects the runtime requirements for a project
 */
export async function detectRuntime(projectPath: string): Promise<RuntimeRequirement> {
  // Check for Node.js
  const hasPackageJson = await fileExists(path.join(projectPath, 'package.json'));
  if (hasPackageJson) {
    let version: string | undefined;

    // Try to get version from .nvmrc, .node-version, or package.json engines
    for (const file of ['.nvmrc', '.node-version']) {
      const filePath = path.join(projectPath, file);
      if (await fileExists(filePath)) {
        try {
          version = (await fs.readFile(filePath, 'utf8')).trim();
          break;
        } catch {}
      }
    }

    if (!version) {
      try {
        const pkgJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
        version = pkgJson.engines?.node;
      } catch {}
    }

    // Detect package manager
    let packageManager: RuntimeRequirement['packageManager'] = 'npm';
    let installCommand = 'npm install';

    if (await fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
      installCommand = 'pnpm install';
    } else if (await fileExists(path.join(projectPath, 'yarn.lock'))) {
      packageManager = 'yarn';
      installCommand = 'yarn install';
    } else if (await fileExists(path.join(projectPath, 'bun.lockb'))) {
      packageManager = 'bun';
      installCommand = 'bun install';
    } else if (await fileExists(path.join(projectPath, 'package-lock.json'))) {
      installCommand = 'npm ci';
    }

    return {
      runtime: packageManager === 'bun' ? 'bun' : 'node',
      version: version || 'lts',
      packageManager,
      installCommand,
    };
  }

  // Check for Go
  const hasGoMod = await fileExists(path.join(projectPath, 'go.mod'));
  if (hasGoMod) {
    let version: string | undefined;
    try {
      const goMod = await fs.readFile(path.join(projectPath, 'go.mod'), 'utf8');
      const match = goMod.match(/^go\s+([\d.]+)/m);
      if (match) {
        version = match[1];
      }
    } catch {}

    return {
      runtime: 'go',
      version: version || 'latest',
      packageManager: 'go',
      installCommand: 'go mod download',
    };
  }

  // Check for Rust
  const hasCargoToml = await fileExists(path.join(projectPath, 'Cargo.toml'));
  if (hasCargoToml) {
    let version: string | undefined;
    // Check rust-toolchain.toml or rust-toolchain
    for (const file of ['rust-toolchain.toml', 'rust-toolchain']) {
      const filePath = path.join(projectPath, file);
      if (await fileExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const match = content.match(/channel\s*=\s*"([^"]+)"/);
          if (match) {
            version = match[1];
          }
        } catch {}
      }
    }

    return {
      runtime: 'rust',
      version: version || 'stable',
      packageManager: 'cargo',
      installCommand: 'cargo build',
    };
  }

  // Check for Python
  const hasPyproject = await fileExists(path.join(projectPath, 'pyproject.toml'));
  const hasRequirements = await fileExists(path.join(projectPath, 'requirements.txt'));
  const hasSetupPy = await fileExists(path.join(projectPath, 'setup.py'));

  if (hasPyproject || hasRequirements || hasSetupPy) {
    let version: string | undefined;
    // Check .python-version
    const pythonVersionFile = path.join(projectPath, '.python-version');
    if (await fileExists(pythonVersionFile)) {
      try {
        version = (await fs.readFile(pythonVersionFile, 'utf8')).trim();
      } catch {}
    }

    let installCommand = 'pip install -e .';
    if (hasRequirements) {
      installCommand = 'pip install -r requirements.txt';
    }

    return {
      runtime: 'python',
      version: version || '3.12',
      packageManager: 'pip',
      installCommand,
    };
  }

  // Check for Ruby
  const hasGemfile = await fileExists(path.join(projectPath, 'Gemfile'));
  if (hasGemfile) {
    let version: string | undefined;
    const rubyVersionFile = path.join(projectPath, '.ruby-version');
    if (await fileExists(rubyVersionFile)) {
      try {
        version = (await fs.readFile(rubyVersionFile, 'utf8')).trim();
      } catch {}
    }

    return {
      runtime: 'ruby',
      version: version || 'latest',
      installCommand: 'bundle install',
    };
  }

  // Check for Deno
  const hasDenoJson = await fileExists(path.join(projectPath, 'deno.json')) ||
                      await fileExists(path.join(projectPath, 'deno.jsonc'));
  if (hasDenoJson) {
    return {
      runtime: 'deno',
      version: 'latest',
    };
  }

  // No runtime detected
  return { runtime: null };
}

/**
 * Checks if dependencies are installed for a project
 */
export async function needsDependencyInstall(projectPath: string, runtime: RuntimeRequirement): Promise<boolean> {
  if (!runtime.runtime) return false;

  switch (runtime.runtime) {
    case 'node':
    case 'bun':
      // Check for node_modules
      return !(await fileExists(path.join(projectPath, 'node_modules')));

    case 'go':
      // Go modules are downloaded on build, check for go.sum
      const hasGoSum = await fileExists(path.join(projectPath, 'go.sum'));
      return !hasGoSum;

    case 'rust':
      // Check for target directory
      return !(await fileExists(path.join(projectPath, 'target')));

    case 'python':
      // Check for venv
      const hasVenv = await fileExists(path.join(projectPath, 'venv')) ||
                      await fileExists(path.join(projectPath, '.venv'));
      return !hasVenv;

    case 'ruby':
      // Check for vendor/bundle or .bundle
      return !(await fileExists(path.join(projectPath, 'vendor', 'bundle')));

    default:
      return false;
  }
}

/**
 * Builds the command to run with mise, including setup if needed
 */
export async function buildMiseCommand(
  projectPath: string,
  runCommand: string,
  options: { skipDependencyInstall?: boolean } = {}
): Promise<{ command: string; needsMise: boolean }> {
  const runtime = await detectRuntime(projectPath);

  // No runtime detected, just run the command directly
  if (!runtime.runtime) {
    return { command: runCommand, needsMise: false };
  }

  // Check if we need to install dependencies
  const needsInstall = !options.skipDependencyInstall &&
                       await needsDependencyInstall(projectPath, runtime);

  // Build the mise use command to ensure runtime is installed
  const miseUse = `mise use ${runtime.runtime}@${runtime.version || 'latest'}`;

  // For package managers that mise can install (pnpm, yarn, bun)
  let ensurePackageManager = '';
  if (runtime.packageManager === 'pnpm') {
    ensurePackageManager = ' && mise use pnpm@latest';
  } else if (runtime.packageManager === 'yarn') {
    ensurePackageManager = ' && mise use yarn@latest';
  } else if (runtime.packageManager === 'bun') {
    // Bun is both runtime and package manager
  }

  // Build full command
  let fullCommand = miseUse + ensurePackageManager;

  if (needsInstall && runtime.installCommand) {
    // For Python, we need to create a venv first
    if (runtime.runtime === 'python') {
      fullCommand += ` && python -m venv venv && source venv/bin/activate && ${runtime.installCommand}`;
    } else {
      fullCommand += ` && ${runtime.installCommand}`;
    }
  }

  // Add the run command, wrapped in mise exec to use the installed runtime
  fullCommand += ` && mise exec -- ${runCommand}`;

  return { command: fullCommand, needsMise: true };
}

/**
 * Gets or installs mise, then returns the full command to run
 */
export async function getCommandWithMise(
  projectPath: string,
  runCommand: string,
  isImportedProject: boolean
): Promise<string> {
  // Only use mise for imported projects
  if (!isImportedProject) {
    return runCommand;
  }

  // Ensure mise is installed
  const miseResult = await ensureMiseInstalled();
  if (!miseResult.success) {
    console.error('Failed to install mise:', miseResult.error);
    // Fall back to running command directly
    return runCommand;
  }

  // Build the mise command
  const { command, needsMise } = await buildMiseCommand(projectPath, runCommand);

  if (!needsMise) {
    return runCommand;
  }

  // Prepend mise path setup if needed
  const misePath = miseResult.misePath;
  if (misePath && misePath !== 'mise') {
    // Add mise to PATH for this command
    const miseDir = path.dirname(misePath);
    return `export PATH="${miseDir}:$PATH" && ${command}`;
  }

  return command;
}
