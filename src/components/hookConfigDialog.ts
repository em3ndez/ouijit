import type { ScriptHook, HookType } from '../types';
import { showToast } from './importDialog';
import { generateId } from '../utils/ids';
import { showDialog } from '../utils/dialog';

export interface HookConfigDialogResult {
  saved: boolean;
  hook?: ScriptHook;
  killExistingOnRun?: boolean;
}

export interface HookConfigDialogOptions {
  /** Current value of killExistingOnRun setting (only used for run hook) */
  killExistingOnRun?: boolean;
}

const HOOK_LABELS: Record<HookType, { title: string; description: string; placeholder: string; envVars?: boolean }> = {
  start: {
    title: 'Start Script',
    description: 'Runs as the first command when a new task is created (e.g., install dependencies and start Claude)',
    placeholder: 'npm install && claude "$OUIJIT_TASK_PROMPT"',
    envVars: true,
  },
  continue: {
    title: 'Continue Script',
    description: 'Runs as the first command when reopening an existing task (e.g., resume Claude session)',
    placeholder: 'claude -c',
    envVars: true,
  },
  run: {
    title: 'Run Script',
    description: 'Runs when you click the play button (e.g., start dev server)',
    placeholder: 'npm run dev',
    envVars: true,
  },
  cleanup: {
    title: 'Cleanup Script',
    description: 'Runs before archiving a task (e.g., push to remote)',
    placeholder: 'git push origin HEAD',
    envVars: true,
  },
  'sandbox-setup': {
    title: 'Sandbox Setup',
    description: 'Runs inside the VM before each terminal command. Use idempotent commands so repeated runs are fast.',
    placeholder: 'which claude || npm i -g @anthropic-ai/claude-code',
  },
};


export function showHookConfigDialog(
  projectPath: string,
  hookType: HookType,
  existingHook?: ScriptHook,
  options?: HookConfigDialogOptions
): Promise<HookConfigDialogResult | null> {
  const labels = HOOK_LABELS[hookType];
  const isRunHook = hookType === 'run';
  const killExistingChecked = options?.killExistingOnRun !== false;

  const envVarsHtml = labels.envVars ? `
    <details class="hook-env-vars">
      <summary>Environment variables</summary>
      <ul>
        <li><code>OUIJIT_PROJECT_PATH</code> - main project path</li>
        <li><code>OUIJIT_WORKTREE_PATH</code> - task worktree path</li>
        <li><code>OUIJIT_TASK_BRANCH</code> - git branch name</li>
        <li><code>OUIJIT_TASK_NAME</code> - task display name</li>
        <li><code>OUIJIT_TASK_PROMPT</code> - task description (start/continue hooks)</li>
      </ul>
    </details>
  ` : '';

  return showDialog<HookConfigDialogResult>({
    content: `
      <h2 class="import-dialog-title">${labels.title}</h2>
      <p class="hook-description">${labels.description}</p>

      <div class="new-project-form">
        <div class="form-group">
          <label class="form-label" for="hook-command">Command</label>
          <textarea
            id="hook-command"
            class="form-input form-textarea"
            placeholder="${labels.placeholder}"
            autocomplete="off"
            spellcheck="false"
            rows="3"
          >${existingHook?.command || ''}</textarea>
        </div>

        ${isRunHook ? `
        <div class="form-group" style="margin-top: 12px;">
          <label class="custom-checkbox">
            <input type="checkbox" id="kill-existing" ${killExistingChecked ? 'checked' : ''} />
            <span class="custom-checkbox-label">Stop existing processes before starting</span>
          </label>
        </div>
        ` : ''}

        ${envVarsHtml}
      </div>

      <div class="import-actions">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="save">Save</button>
      </div>
    `,
    focusSelector: '#hook-command',
    onMount({ dialog, resolve, cancel }) {
      const commandInput = dialog.querySelector('#hook-command') as HTMLTextAreaElement;

      dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', cancel);

      dialog.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
        const command = commandInput.value.trim();

        // Empty command = clear the hook
        if (command.length === 0) {
          await window.api.hooks.delete(projectPath, hookType);
          resolve({ saved: true, hook: undefined });
          return;
        }

        const hook: ScriptHook = {
          id: existingHook?.id || generateId('hook'),
          type: hookType,
          name: labels.title,
          command,
        };

        const result = await window.api.hooks.save(projectPath, hook);

        // Save kill setting for run hook
        let killExistingValue: boolean | undefined;
        if (isRunHook) {
          const killCheckbox = dialog.querySelector('#kill-existing') as HTMLInputElement;
          killExistingValue = killCheckbox?.checked ?? true;
          await window.api.setKillExistingOnRun(projectPath, killExistingValue);
        }

        if (result.success) {
          resolve({ saved: true, hook, killExistingOnRun: killExistingValue });
        } else {
          showToast('Failed to save hook', 'error');
          resolve({ saved: false });
        }
      });
    },
  });
}
