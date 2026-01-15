/**
 * Theatre mode barrel exports
 * Re-exports all theatre module functionality for external use
 */

// State
export {
  theatreState,
  projectSessions,
  taskTerminalMap,
  ensureHiddenSessionsContainer,
  resetTheatreState,
  MAX_THEATRE_TERMINALS,
  HIDDEN_SESSIONS_CONTAINER_ID,
  GIT_STATUS_IDLE_DELAY,
  GIT_STATUS_PERIODIC_INTERVAL,
  type TheatreTerminal,
  type StoredTheatreSession,
  type SummaryType,
} from './state';

// Git status
export {
  buildGitStatusHtml,
  buildGitDropdownHtml,
  switchToBranch,
  createNewBranch,
  performMergeIntoMain,
  showGitDropdown,
  hideGitDropdown,
  toggleGitDropdown,
  updateGitStatusElement,
  refreshGitStatus,
  scheduleGitStatusRefresh,
} from './gitStatus';

// Diff panel
export {
  formatDiffStats,
  buildDiffPanelHtml,
  buildDiffFileDropdownHtml,
  showDiffFileDropdown,
  hideDiffFileDropdown,
  toggleDiffFileDropdown,
  renderDiffContentHtml,
  selectDiffFile,
  showDiffPanel,
  hideDiffPanel,
  toggleDiffPanel,
} from './diffPanel';

// Terminal cards
export {
  getTerminalTheme,
  stripAnsi,
  analyzeTerminalOutput,
  updateTaskStatusIndicator,
  updateTerminalCardLabel,
  scheduleTerminalSummaryUpdate,
  createTheatreCard,
  updateCardStack,
  switchToTheatreTerminal,
  addTheatreTerminal,
  closeTheatreTerminal,
} from './terminalCards';

// Tasks panel
export {
  getTaskTerminal,
  buildTasksPanelHtml,
  buildTaskItemHtml,
  launchClaudeForTask,
  renderTasksList,
  refreshTasksList,
  showTasksPanel,
  hideTasksPanel,
  toggleTasksPanel,
} from './tasksPanel';

// Launch dropdown
export {
  buildTheatreHeader,
  buildLaunchDropdownContent,
  showLaunchDropdown,
  hideLaunchDropdown,
  toggleLaunchDropdown,
  runDefaultCommand,
} from './launchDropdown';

// Theatre mode orchestration
export {
  enterTheatreMode,
  exitTheatreMode,
  destroyTheatreSessions,
  getPreservedSessionPaths,
  hasPreservedSession,
  isInTheatreMode,
} from './theatreMode';
