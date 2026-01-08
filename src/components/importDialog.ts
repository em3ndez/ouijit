import type { OuijitPackage } from '../types';

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

    // Handle escape key
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
}

/**
 * Shows a simple toast notification
 */
export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  // Remove any existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
