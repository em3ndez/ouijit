import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import type { OuijitManifest, OuijitPackage, PreviewResult, ImportResult } from '../types';

/**
 * Directory where imported projects are stored
 */
export const IMPORTS_DIR = path.join(os.homedir(), 'Ouijit', 'imports');

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
 * Calculates SHA256 checksum of a file
 */
async function calculateSha256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generates a unique project directory name
 */
async function getUniqueProjectDir(baseName: string): Promise<string> {
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
  let candidate = path.join(IMPORTS_DIR, safeName);
  let counter = 1;

  while (await fileExists(candidate)) {
    candidate = path.join(IMPORTS_DIR, `${safeName}-${counter}`);
    counter++;
  }

  return candidate;
}

/**
 * Previews a .ouijit file without fully importing it
 * Extracts to a temp directory and validates the contents
 */
export async function previewOuijitFile(filePath: string): Promise<PreviewResult> {
  const tempDir = path.join(os.tmpdir(), `ouijit-preview-${Date.now()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Read the zip file as buffer first (more reliable)
    const zipBuffer = await fs.readFile(filePath);
    const zip = new AdmZip(zipBuffer);

    // Get entries to debug
    const entries = zip.getEntries();
    console.log('Zip entries:', entries.map(e => e.entryName));

    // Extract all entries
    zip.extractAllTo(tempDir, true);

    // List extracted files for debugging
    const extractedFiles = await fs.readdir(tempDir);
    console.log('Extracted files:', extractedFiles);

    // Read manifest
    const manifestPath = path.join(tempDir, 'manifest.json');
    if (!await fileExists(manifestPath)) {
      throw new Error(`Invalid .ouijit file: missing manifest.json. Found: ${extractedFiles.join(', ')}`);
    }

    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    let manifest: OuijitManifest;
    try {
      manifest = JSON.parse(manifestContent);
    } catch {
      throw new Error('Invalid .ouijit file: malformed manifest.json');
    }

    // Validate manifest version
    if (manifest.version !== 1) {
      throw new Error(`Unsupported manifest version: ${manifest.version}`);
    }

    // Verify source tarball exists
    const sourcePath = path.join(tempDir, 'source.tar.gz');
    if (!await fileExists(sourcePath)) {
      throw new Error('Invalid .ouijit file: missing source.tar.gz');
    }

    // Verify checksum
    const actualChecksum = await calculateSha256(sourcePath);
    if (actualChecksum !== manifest.sourceChecksum) {
      throw new Error('Checksum mismatch - file may be corrupted');
    }

    // Check for screenshot (optional)
    const screenshotPath = path.join(tempDir, 'screenshot.webp');
    const hasScreenshot = await fileExists(screenshotPath);

    return {
      success: true,
      package: {
        manifest,
        screenshotPath: hasScreenshot ? screenshotPath : undefined,
        sourcePath,
        tempDir,
      },
    };

  } catch (error) {
    // Cleanup on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Imports a previously previewed .ouijit package
 * The tempDir from the preview is used to extract the source
 */
export async function importOuijitPackage(tempDir: string): Promise<ImportResult> {
  try {
    // Read manifest from temp directory
    const manifestPath = path.join(tempDir, 'manifest.json');
    if (!await fileExists(manifestPath)) {
      throw new Error('Preview expired or invalid');
    }

    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest: OuijitManifest = JSON.parse(manifestContent);

    // Ensure imports directory exists
    await fs.mkdir(IMPORTS_DIR, { recursive: true });

    // Create unique project directory
    const projectDir = await getUniqueProjectDir(manifest.name);
    await fs.mkdir(projectDir, { recursive: true });

    // Extract source tarball
    const sourcePath = path.join(tempDir, 'source.tar.gz');
    await tar.extract({
      file: sourcePath,
      cwd: projectDir,
    });

    // Write import metadata
    const metadataPath = path.join(projectDir, '.ouijit-import.json');
    await fs.writeFile(metadataPath, JSON.stringify({
      importedAt: new Date().toISOString(),
      originalManifest: manifest,
    }, null, 2));

    // Cleanup temp preview files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      projectPath: projectDir,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleans up a preview temp directory if import is cancelled
 */
export async function cleanupPreview(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
