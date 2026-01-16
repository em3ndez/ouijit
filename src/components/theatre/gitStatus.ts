/**
 * Git status display for theatre mode - per-terminal git status on card labels
 */

import type { CompactGitStatus } from '../../types';
import { theatreState, GIT_STATUS_IDLE_DELAY, TheatreTerminal } from './state';
import { projectPath, terminals, gitDropdownVisible } from './signals';

/**
 * Hide the git dropdown (cleanup for exitTheatreMode)
 */
export function hideGitDropdown(): void {
  if (!gitDropdownVisible.value) return;

  if (theatreState.gitDropdownCleanup) {
    theatreState.gitDropdownCleanup();
    theatreState.gitDropdownCleanup = null;
  }

  gitDropdownVisible.value = false;
}

/**
 * Refresh git status for all terminals
 */
export async function refreshGitStatus(): Promise<void> {
  if (!projectPath.value) return;
  await refreshAllTerminalGitStatus();
}

/**
 * Schedule a git status refresh after idle period
 */
export function scheduleGitStatusRefresh(): void {
  // Clear any existing timeout
  if (theatreState.gitStatusIdleTimeout) {
    clearTimeout(theatreState.gitStatusIdleTimeout);
  }

  // Update last output time
  theatreState.lastTerminalOutputTime = Date.now();

  // Schedule refresh after idle period
  theatreState.gitStatusIdleTimeout = setTimeout(() => {
    refreshGitStatus();
  }, GIT_STATUS_IDLE_DELAY);
}

// Map of pending per-terminal git status refreshes
const pendingTerminalGitRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Get the git path for a terminal (worktree path if it's a worktree, otherwise project path)
 */
export function getTerminalGitPath(term: TheatreTerminal): string {
  return term.worktreePath || term.projectPath;
}

/**
 * Schedule a debounced git status refresh for a specific terminal
 */
export function scheduleTerminalGitStatusRefresh(term: TheatreTerminal): void {
  const key = term.ptyId;
  const existing = pendingTerminalGitRefreshes.get(key);
  if (existing) clearTimeout(existing);

  pendingTerminalGitRefreshes.set(key, setTimeout(async () => {
    await refreshTerminalGitStatus(term);
    // Import dynamically to avoid circular deps
    const { updateTerminalCardLabel } = await import('./terminalCards');
    updateTerminalCardLabel(term);
    pendingTerminalGitRefreshes.delete(key);
  }, GIT_STATUS_IDLE_DELAY));
}

/**
 * Refresh git status for a specific terminal
 */
export async function refreshTerminalGitStatus(term: TheatreTerminal): Promise<void> {
  const gitPath = getTerminalGitPath(term);
  const compactStatus = await window.api.getCompactGitStatus(gitPath);
  term.gitStatus = compactStatus;
}

/**
 * Refresh git status for all terminals
 */
export async function refreshAllTerminalGitStatus(): Promise<void> {
  const currentTerminals = terminals.value;
  await Promise.all(currentTerminals.map(refreshTerminalGitStatus));
}

/**
 * Build compact git status HTML for display in terminal card
 */
export function buildCardGitStatusHtml(compactStatus: CompactGitStatus | null): string {
  if (!compactStatus) return '';

  const {
    branch,
    mainBranch,
    dirtyFileCount,
    insertions,
    deletions,
    branchDiffFileCount,
    branchDiffInsertions,
    branchDiffDeletions,
  } = compactStatus;

  // Determine what stats to show
  const showUncommitted = dirtyFileCount > 0;
  const showBranchDiff = !showUncommitted && branch !== mainBranch && branchDiffFileCount > 0;

  let statsContent = '';
  let statsClass = 'theatre-card-git-stats';

  let diffType = '';

  if (showUncommitted) {
    const maxDots = 3;
    const addDots = Math.min(Math.ceil(insertions / 10), maxDots);
    const delDots = Math.min(Math.ceil(deletions / 10), maxDots);
    let dotsHtml = '';
    if (addDots > 0 || delDots > 0) {
      dotsHtml = '<span class="theatre-git-dots">';
      for (let i = 0; i < addDots; i++) dotsHtml += '<span class="dot dot--add"></span>';
      for (let i = 0; i < delDots; i++) dotsHtml += '<span class="dot dot--del"></span>';
      dotsHtml += '</span>';
    }
    statsContent = `<span class="theatre-card-git-count">${dirtyFileCount}</span>${dotsHtml}`;
    statsClass += ' theatre-card-git-stats--clickable';
    diffType = 'uncommitted';
  } else if (showBranchDiff) {
    const maxDots = 3;
    const addDots = Math.min(Math.ceil(branchDiffInsertions / 10), maxDots);
    const delDots = Math.min(Math.ceil(branchDiffDeletions / 10), maxDots);
    let dotsHtml = '';
    if (addDots > 0 || delDots > 0) {
      dotsHtml = '<span class="theatre-git-dots">';
      for (let i = 0; i < addDots; i++) dotsHtml += '<span class="dot dot--add"></span>';
      for (let i = 0; i < delDots; i++) dotsHtml += '<span class="dot dot--del"></span>';
      dotsHtml += '</span>';
    }
    statsContent = `<span class="theatre-card-git-count">${branchDiffFileCount}</span>${dotsHtml}`;
    statsClass += ' theatre-card-git-stats--clickable';
    diffType = 'branch';
  }

  const hasStats = showUncommitted || showBranchDiff;

  return `
    <div class="theatre-card-git-status">
      <span class="theatre-card-git-branch" title="${branch}">
        <i data-lucide="git-branch" class="theatre-card-git-icon"></i>
        ${branch}
      </span>
      ${hasStats ? `<span class="${statsClass}" data-diff-type="${diffType}" title="View changes">${statsContent}</span>` : ''}
    </div>
  `;
}
