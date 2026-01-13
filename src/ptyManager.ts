import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import type { PtyId, PtySpawnOptions, PtySpawnResult } from './types';
import { getCommandWithMise, isImportedProject } from './ouijit';

interface ManagedPty {
  process: pty.IPty;
  projectPath: string;
  command: string;
}

const activePtys = new Map<PtyId, ManagedPty>();

function generatePtyId(): PtyId {
  return `pty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

export async function spawnPty(
  options: PtySpawnOptions,
  window: BrowserWindow
): Promise<PtySpawnResult> {
  try {
    const ptyId = generatePtyId();
    const shell = getDefaultShell();

    // Always spawn an interactive shell so the session persists after commands finish
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      } as Record<string, string>,
    });

    let finalCommand = options.command || '';

    activePtys.set(ptyId, {
      process: ptyProcess,
      projectPath: options.cwd,
      command: finalCommand,
    });

    ptyProcess.onData((data: string) => {
      if (!window.isDestroyed()) {
        window.webContents.send(`pty:data:${ptyId}`, data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (!window.isDestroyed()) {
        window.webContents.send(`pty:exit:${ptyId}`, exitCode);
      }
      activePtys.delete(ptyId);
    });

    // If a command was provided, write it to the shell after a brief delay
    // to ensure the shell is ready
    if (options.command) {
      const isImported = await isImportedProject(options.cwd);
      finalCommand = await getCommandWithMise(options.cwd, options.command, isImported);
      // Update the stored command
      const managed = activePtys.get(ptyId);
      if (managed) {
        managed.command = finalCommand;
      }
      // Small delay to let shell initialize, then send the command
      setTimeout(() => {
        const m = activePtys.get(ptyId);
        if (m) {
          m.process.write(finalCommand + '\r');
        }
      }, 100);
    }

    return { success: true, ptyId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to spawn PTY',
    };
  }
}

export function writeToPty(ptyId: PtyId, data: string): void {
  const managed = activePtys.get(ptyId);
  if (managed) {
    managed.process.write(data);
  }
}

export function resizePty(ptyId: PtyId, cols: number, rows: number): void {
  const managed = activePtys.get(ptyId);
  if (managed) {
    managed.process.resize(cols, rows);
  }
}

export function killPty(ptyId: PtyId): void {
  const managed = activePtys.get(ptyId);
  if (managed) {
    managed.process.kill();
    activePtys.delete(ptyId);
  }
}

export function cleanupAllPtys(): void {
  for (const [, managed] of activePtys) {
    try {
      managed.process.kill();
    } catch {
      // Ignore errors during cleanup
    }
  }
  activePtys.clear();
}
