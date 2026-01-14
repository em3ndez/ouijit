import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ProjectSettings, CustomCommand, Task } from './types';

const SETTINGS_FILE = 'project-settings.json';

/**
 * Map of project paths to their settings
 */
interface SettingsStore {
  [projectPath: string]: ProjectSettings;
}

let settingsCache: SettingsStore | null = null;

/**
 * Get the path to the settings file
 */
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

/**
 * Load all settings from disk
 */
async function loadSettings(): Promise<SettingsStore> {
  if (settingsCache) {
    return settingsCache;
  }

  try {
    const content = await fs.readFile(getSettingsPath(), 'utf-8');
    settingsCache = JSON.parse(content);
    return settingsCache!;
  } catch {
    settingsCache = {};
    return settingsCache;
  }
}

/**
 * Save all settings to disk
 */
async function saveSettings(settings: SettingsStore): Promise<void> {
  settingsCache = settings;
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Get settings for a specific project
 */
export async function getProjectSettings(projectPath: string): Promise<ProjectSettings> {
  const settings = await loadSettings();
  const projectSettings = settings[projectPath] || { customCommands: [], tasks: [] };
  // Ensure tasks array exists for backwards compatibility
  if (!projectSettings.tasks) {
    projectSettings.tasks = [];
  }
  return projectSettings;
}

/**
 * Save a custom command for a project
 */
export async function saveCustomCommand(
  projectPath: string,
  command: CustomCommand
): Promise<{ success: boolean }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath] || { customCommands: [], tasks: [] };

    // Check if command with same ID exists (update) or add new
    const existingIndex = projectSettings.customCommands.findIndex(c => c.id === command.id);
    if (existingIndex >= 0) {
      projectSettings.customCommands[existingIndex] = command;
    } else {
      projectSettings.customCommands.push(command);
    }

    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to save custom command:', error);
    return { success: false };
  }
}

/**
 * Delete a custom command
 */
export async function deleteCustomCommand(
  projectPath: string,
  commandId: string
): Promise<{ success: boolean }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath];

    if (!projectSettings) {
      return { success: true };
    }

    projectSettings.customCommands = projectSettings.customCommands.filter(
      c => c.id !== commandId
    );

    // Clear default if it was the deleted command
    if (projectSettings.defaultCommandId === commandId) {
      projectSettings.defaultCommandId = undefined;
    }

    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete custom command:', error);
    return { success: false };
  }
}

/**
 * Set the default command for a project
 */
export async function setDefaultCommand(
  projectPath: string,
  commandId: string | null
): Promise<{ success: boolean }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath] || { customCommands: [], tasks: [] };

    projectSettings.defaultCommandId = commandId || undefined;
    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to set default command:', error);
    return { success: false };
  }
}

/**
 * Generate a unique ID for tasks
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all tasks for a project
 */
export async function getTasks(projectPath: string): Promise<Task[]> {
  const projectSettings = await getProjectSettings(projectPath);
  return projectSettings.tasks || [];
}

/**
 * Add a new task to a project
 */
export async function addTask(
  projectPath: string,
  title: string
): Promise<{ success: boolean; task?: Task }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath] || { customCommands: [], tasks: [] };

    if (!projectSettings.tasks) {
      projectSettings.tasks = [];
    }

    const task: Task = {
      id: generateTaskId(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    projectSettings.tasks.push(task);
    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true, task };
  } catch (error) {
    console.error('Failed to add task:', error);
    return { success: false };
  }
}

/**
 * Toggle a task's completed status
 */
export async function toggleTask(
  projectPath: string,
  taskId: string
): Promise<{ success: boolean }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath];

    if (!projectSettings?.tasks) {
      return { success: false };
    }

    const task = projectSettings.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false };
    }

    task.completed = !task.completed;
    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle task:', error);
    return { success: false };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  projectPath: string,
  taskId: string
): Promise<{ success: boolean }> {
  try {
    const settings = await loadSettings();
    const projectSettings = settings[projectPath];

    if (!projectSettings?.tasks) {
      return { success: true };
    }

    projectSettings.tasks = projectSettings.tasks.filter(t => t.id !== taskId);
    settings[projectPath] = projectSettings;
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete task:', error);
    return { success: false };
  }
}
