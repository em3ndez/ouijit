import { ipcMain, shell } from 'electron';
import { scanForProjects } from './scanner';

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
      // Open the directory in the system file manager
      await shell.openPath(projectPath);
      return { success: true };
    } catch (error) {
      console.error('Error opening project:', error);
      throw error;
    }
  });
}
