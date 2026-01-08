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

/**
 * Checks if a project is an imported project
 */
export async function isImportedProject(projectPath: string): Promise<boolean> {
  return fileExists(path.join(projectPath, '.ouijit-import.json'));
}
