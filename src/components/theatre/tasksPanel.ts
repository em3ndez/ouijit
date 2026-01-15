/**
 * Tasks panel for theatre mode - task management and Claude integration
 */

import { createIcons, CheckSquare, Square, Play, Trash2 } from 'lucide';
import type { Task, RunConfig } from '../../types';
import { taskTerminalMap, TheatreTerminal } from './state';
import {
  projectPath,
  terminals,
  activeIndex,
  tasksPanelVisible,
  tasksList,
} from './signals';
import { escapeHtml } from '../../utils/html';
import { addTheatreTerminal, switchToTheatreTerminal } from './terminalCards';

const taskIcons = { CheckSquare, Square, Play, Trash2 };

/**
 * Get the terminal associated with a task
 */
export function getTaskTerminal(taskId: string): TheatreTerminal | undefined {
  const ptyId = taskTerminalMap.get(taskId);
  if (!ptyId) return undefined;
  return terminals.value.find(t => t.ptyId === ptyId);
}

/**
 * Build tasks panel HTML
 */
export function buildTasksPanelHtml(): string {
  return `
    <div class="tasks-panel">
      <div class="tasks-panel-header">
        <span class="tasks-panel-title">Tasks</span>
        <button class="tasks-panel-close" title="Close tasks panel">&times;</button>
      </div>
      <div class="tasks-panel-input-wrapper">
        <input type="text" class="tasks-panel-input" placeholder="Add task..." spellcheck="false" autocomplete="off" />
      </div>
      <div class="tasks-panel-list"></div>
    </div>
  `;
}

/**
 * Build a single task item HTML
 */
export function buildTaskItemHtml(task: Task): string {
  const checkIcon = task.completed ? 'check-square' : 'square';
  const terminal = getTaskTerminal(task.id);
  const hasTerminal = !!terminal;
  const statusType = terminal?.summaryType || 'idle';
  const statusSummary = terminal?.summary || '';

  return `
    <div class="tasks-panel-item${task.completed ? ' tasks-panel-item--completed' : ''}${hasTerminal ? ' tasks-panel-item--has-terminal' : ''}" data-task-id="${task.id}">
      <button class="tasks-panel-item-checkbox" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
        <i data-lucide="${checkIcon}"></i>
      </button>
      ${hasTerminal ? `<span class="tasks-panel-item-status" data-status="${statusType}" title="${escapeHtml(statusSummary)}"></span>` : ''}
      <span class="tasks-panel-item-title">${escapeHtml(task.title)}</span>
      <button class="tasks-panel-item-claude" title="${hasTerminal ? 'Show terminal' : 'Run with Claude'}">
        <i data-lucide="play"></i>
      </button>
      <button class="tasks-panel-item-delete" title="Delete task">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;
}

/**
 * Launch Claude Code in a new theatre terminal for a task
 */
export async function launchClaudeForTask(task: Task): Promise<void> {
  if (!projectPath.value) return;

  // Check if this task already has a terminal - if so, switch to it
  const existingTerminal = getTaskTerminal(task.id);
  if (existingTerminal) {
    const index = terminals.value.indexOf(existingTerminal);
    if (index !== -1) {
      switchToTheatreTerminal(index);
      return;
    }
  }

  // Truncate label for display
  const label = `Claude: ${task.title.slice(0, 20)}${task.title.length > 20 ? '...' : ''}`;

  // Create a RunConfig for Claude
  const claudeConfig: RunConfig = {
    name: label,
    command: 'claude',
    source: 'custom',
    priority: 0,
  };

  const success = await addTheatreTerminal(claudeConfig);

  if (success) {
    // Get the newly added terminal and store the mapping
    const currentTerminals = terminals.value;
    const claudeTerminal = currentTerminals[currentTerminals.length - 1];
    taskTerminalMap.set(task.id, claudeTerminal.ptyId);

    // Re-render tasks to show the status indicator
    renderTasksList();

    // Send task title then Enter key after Claude initializes
    setTimeout(() => {
      window.api.pty.write(claudeTerminal.ptyId, task.title);
      setTimeout(() => {
        window.api.pty.write(claudeTerminal.ptyId, '\r');
      }, 100);
    }, 1500);
  }
}

/**
 * Render the tasks list in the panel
 */
export function renderTasksList(): void {
  const listEl = document.querySelector('.tasks-panel-list');
  if (!listEl) return;

  const currentTasks = tasksList.value;

  if (currentTasks.length === 0) {
    listEl.innerHTML = '<div class="tasks-panel-empty">No tasks yet</div>';
    return;
  }

  // Sort: incomplete tasks first, then completed
  const sortedTasks = [...currentTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  listEl.innerHTML = sortedTasks.map(buildTaskItemHtml).join('');
  createIcons({ icons: taskIcons, nodes: [listEl as HTMLElement] });

  // Wire up checkbox clicks
  listEl.querySelectorAll('.tasks-panel-item-checkbox').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = (btn as HTMLElement).closest('.tasks-panel-item') as HTMLElement;
      const taskId = item?.dataset.taskId;
      const currentProjectPath = projectPath.value;
      if (taskId && currentProjectPath) {
        await window.api.toggleTask(currentProjectPath, taskId);
        await refreshTasksList();
      }
    });
  });

  // Wire up delete clicks
  listEl.querySelectorAll('.tasks-panel-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = (btn as HTMLElement).closest('.tasks-panel-item') as HTMLElement;
      const taskId = item?.dataset.taskId;
      const currentProjectPath = projectPath.value;
      if (taskId && currentProjectPath) {
        await window.api.deleteTask(currentProjectPath, taskId);
        await refreshTasksList();
      }
    });
  });

  // Wire up Claude button clicks
  listEl.querySelectorAll('.tasks-panel-item-claude').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = (btn as HTMLElement).closest('.tasks-panel-item') as HTMLElement;
      const taskId = item?.dataset.taskId;
      const task = tasksList.value.find(t => t.id === taskId);
      const currentProjectPath = projectPath.value;
      if (task && currentProjectPath) {
        await launchClaudeForTask(task);
      }
    });
  });
}

/**
 * Refresh the tasks list from the API
 */
export async function refreshTasksList(): Promise<void> {
  if (!projectPath.value) return;
  tasksList.value = await window.api.getTasks(projectPath.value);
  renderTasksList();
}

/**
 * Refit the active terminal after panel animation
 */
function refitActiveTerminal(): void {
  const currentTerminals = terminals.value;
  const currentActiveIndex = activeIndex.value;
  if (currentTerminals.length > 0 && currentActiveIndex < currentTerminals.length) {
    const active = currentTerminals[currentActiveIndex];
    active.fitAddon.fit();
    window.api.pty.resize(active.ptyId, active.terminal.cols, active.terminal.rows);
  }
}

/**
 * Show the tasks panel
 */
export async function showTasksPanel(): Promise<void> {
  if (tasksPanelVisible.value) return;

  tasksPanelVisible.value = true;

  // Create and insert panel
  const panelHtml = buildTasksPanelHtml();
  document.body.insertAdjacentHTML('beforeend', panelHtml);

  const panel = document.querySelector('.tasks-panel');
  if (!panel) return;

  // Add class to theatre stack to make room
  const stack = document.querySelector('.theatre-stack');
  if (stack) {
    stack.classList.add('tasks-panel-open');
  }

  // Mark tasks button as active
  const tasksBtn = document.querySelector('.theatre-tasks-btn');
  if (tasksBtn) {
    tasksBtn.classList.add('active');
  }

  // Wire up close button
  const closeBtn = panel.querySelector('.tasks-panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => hideTasksPanel());
  }

  // Wire up input for adding tasks
  const input = panel.querySelector('.tasks-panel-input') as HTMLInputElement;
  if (input) {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const title = input.value.trim();
        const currentProjectPath = projectPath.value;
        if (title && currentProjectPath) {
          await window.api.addTask(currentProjectPath, title);
          input.value = '';
          await refreshTasksList();
        }
      }
    });
  }

  // Load and render tasks
  await refreshTasksList();

  // Animate panel in
  requestAnimationFrame(() => {
    panel.classList.add('tasks-panel--visible');
  });

  // Refit active theatre terminal after animation
  setTimeout(() => refitActiveTerminal(), 250);
}

/**
 * Hide the tasks panel
 */
export function hideTasksPanel(): void {
  if (!tasksPanelVisible.value) return;

  const panel = document.querySelector('.tasks-panel');
  if (panel) {
    panel.classList.remove('tasks-panel--visible');
    setTimeout(() => panel.remove(), 250);
  }

  // Remove class from theatre stack
  const stack = document.querySelector('.theatre-stack');
  if (stack) {
    stack.classList.remove('tasks-panel-open');
  }

  // Remove active state from tasks button
  const tasksBtn = document.querySelector('.theatre-tasks-btn');
  if (tasksBtn) {
    tasksBtn.classList.remove('active');
  }

  // Refit active theatre terminal after animation
  setTimeout(() => refitActiveTerminal(), 250);

  tasksPanelVisible.value = false;
  tasksList.value = [];
}

/**
 * Toggle the tasks panel visibility
 */
export async function toggleTasksPanel(): Promise<void> {
  if (tasksPanelVisible.value) {
    hideTasksPanel();
  } else {
    await showTasksPanel();
  }
}
