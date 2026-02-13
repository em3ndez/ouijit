import type { CreateProjectOptions, CreateProjectResult } from '../types';
import { registerHotkey, unregisterHotkey, Scopes } from '../utils/hotkeys';
import { showDialog } from '../utils/dialog';

export interface NewProjectDialogResult {
  created: boolean;
  projectName?: string;
  projectPath?: string;
}

/**
 * Validates a project name.
 * Allows alphanumeric characters, spaces, dashes, and underscores.
 */
function isValidProjectName(name: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/.test(name);
}

/**
 * Shows a modal dialog to create a new project
 */
export function showNewProjectDialog(): Promise<NewProjectDialogResult | null> {
  return showDialog<NewProjectDialogResult>({
    content: `
      <h2 class="import-dialog-title">New Project</h2>

      <div class="new-project-form">
        <div class="form-group">
          <label class="form-label" for="project-name">Project Name</label>
          <input
            type="text"
            id="project-name"
            class="form-input"
            placeholder="My Project"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="import-actions">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="create" disabled>Create</button>
      </div>
    `,
    focusSelector: '#project-name',
    onMount({ dialog, resolve, cancel }) {
      const nameInput = dialog.querySelector('#project-name') as HTMLInputElement;
      const createBtn = dialog.querySelector('[data-action="create"]') as HTMLButtonElement;

      nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim();
        createBtn.disabled = !(name.length > 0 && isValidProjectName(name));
      });

      dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', cancel);

      dialog.querySelector('[data-action="create"]')?.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!isValidProjectName(name)) return;

        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';

        const options: CreateProjectOptions = { name };
        const result: CreateProjectResult = await window.api.createProject(options);

        if (result.success) {
          resolve({
            created: true,
            projectName: name,
            projectPath: result.projectPath,
          });
        } else {
          resolve({ created: false });
        }
      });

      registerHotkey('enter', Scopes.MODAL, () => {
        if (!createBtn.disabled) createBtn.click();
      });
    },
    onCleanup() {
      unregisterHotkey('enter', Scopes.MODAL);
    },
  });
}
