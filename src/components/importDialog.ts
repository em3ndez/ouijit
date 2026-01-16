import type { OuijitPackage } from '../types';
import { registerHotkey, unregisterHotkey, pushScope, popScope, Scopes } from '../utils/hotkeys';

/**
 * Formats file size in human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Shows a modal dialog to confirm importing a .ouijit package
 */
export function showImportDialog(pkg: OuijitPackage): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'import-dialog';

    const runtimeDisplay = pkg.manifest.runtime !== 'unknown'
      ? `${pkg.manifest.runtime}${pkg.manifest.runtimeVersion ? ` ${pkg.manifest.runtimeVersion}` : ''}`
      : 'Unknown';

    dialog.innerHTML = `
      <h2 class="import-dialog-title">Import "${pkg.manifest.name}"?</h2>

      ${pkg.screenshotPath
        ? `<img src="file://${pkg.screenshotPath}" class="import-preview" alt="App preview" />`
        : `<div class="import-preview-placeholder">No preview available</div>`
      }

      <div class="import-meta">
        ${pkg.manifest.tagline ? `<p class="import-tagline">${pkg.manifest.tagline}</p>` : ''}

        <dl class="import-details">
          <div class="import-detail-row">
            <dt>Runtime</dt>
            <dd>${runtimeDisplay}</dd>
          </div>

          <div class="import-detail-row">
            <dt>Entrypoint</dt>
            <dd><code>${pkg.manifest.entrypoint || 'None specified'}</code></dd>
          </div>

          ${pkg.manifest.createdBy ? `
          <div class="import-detail-row">
            <dt>Created by</dt>
            <dd>${pkg.manifest.createdBy}</dd>
          </div>
          ` : ''}

          ${pkg.manifest.sourceRepo ? `
          <div class="import-detail-row">
            <dt>Source</dt>
            <dd class="import-source-url">${pkg.manifest.sourceRepo}</dd>
          </div>
          ` : ''}
        </dl>
      </div>

      <div class="import-actions">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="import">Import</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('modal-overlay--visible');
      dialog.classList.add('import-dialog--visible');
    });

    const cleanup = () => {
      unregisterHotkey('escape', Scopes.MODAL);
      popScope();
      overlay.classList.remove('modal-overlay--visible');
      dialog.classList.remove('import-dialog--visible');
      setTimeout(() => overlay.remove(), 200);
    };

    dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    dialog.querySelector('[data-action="import"]')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    // Set up hotkey scope for modal
    pushScope(Scopes.MODAL);
    registerHotkey('escape', Scopes.MODAL, () => {
      cleanup();
      resolve(false);
    });
  });
}

// Re-export showToast from utils for backwards compatibility
export { showToast } from '../utils/toast';
