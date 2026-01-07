// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import type { Project, RunConfig, LaunchResult } from './types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  /**
   * Scans for projects in predefined directories
   */
  getProjects: (): Promise<Project[]> => ipcRenderer.invoke('get-projects'),

  /**
   * Opens a project directory in the default file manager
   */
  openProject: (path: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('open-project', path),

  /**
   * Launch a project with a specific run configuration
   */
  launchProject: (projectPath: string, runConfig: RunConfig): Promise<LaunchResult> =>
    ipcRenderer.invoke('launch-project', projectPath, runConfig),

  /**
   * Open project in Finder
   */
  openInFinder: (path: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('open-in-finder', path),
});
