import { ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { scanForProjects } from './scanner';
import type { RunConfig, LaunchResult } from './types';

/**
 * Escapes a string for use in AppleScript
 */
function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Launches a command in Terminal.app on macOS
 */
function launchInTerminal(projectPath: string, command: string): Promise<LaunchResult> {
  return new Promise((resolve) => {
    const escapedPath = escapeAppleScript(projectPath);
    const escapedCommand = escapeAppleScript(command);

    const script = `tell application "Terminal"
      do script "cd \\"${escapedPath}\\" && ${escapedCommand}"
      activate
    end tell`;

    const osascript = spawn('osascript', ['-e', script]);

    osascript.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `osascript exited with code ${code}` });
      }
    });

    osascript.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Registers all IPC handlers for the main process
 */
export function registerIpcHandlers(): void {
  // Handler to get all detected projects
  ipcMain.handle('get-projects', async () => {
    try {
      const projects = await scanForProjects();
      return projects;
    } catch (error) {
      console.error('Error scanning for projects:', error);
      throw error;
    }
  });

  // Handler to open a project in the default file manager
  ipcMain.handle('open-project', async (_event, projectPath: string) => {
    try {
      await shell.openPath(projectPath);
      return { success: true };
    } catch (error) {
      console.error('Error opening project:', error);
      throw error;
    }
  });

  // Handler to open project in Finder explicitly
  ipcMain.handle('open-in-finder', async (_event, projectPath: string) => {
    try {
      await shell.openPath(projectPath);
      return { success: true };
    } catch (error) {
      console.error('Error opening in Finder:', error);
      throw error;
    }
  });

  // Handler to launch a project with a specific run config
  ipcMain.handle('launch-project', async (_event, projectPath: string, runConfig: RunConfig): Promise<LaunchResult> => {
    try {
      // Currently macOS only
      if (process.platform === 'darwin') {
        return await launchInTerminal(projectPath, runConfig.command);
      }

      // Fallback for other platforms - open in file manager
      await shell.openPath(projectPath);
      return { success: true };
    } catch (error) {
      console.error('Error launching project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
