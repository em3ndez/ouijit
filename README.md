# Ouijit

Run multiple Claude Code sessions in parallel without losing the terminal.

## Why Ouijit?

Most agent orchestration tools add dashboards and abstractions on top of the AI. Ouijit takes a different approach: keep the TUI, manage the isolation.

You work directly in Claude Code's terminal. Ouijit handles git worktrees so each session stays isolated, tracks tasks tied to those worktrees, and persists sessions across restarts. That's it.

## How It Works

1. Open a project to enter Theatre Mode
2. Create a task - Ouijit creates an isolated git worktree
3. Launch Claude Code in that worktree
4. Repeat - run multiple sessions in parallel via the terminal card stack
5. Review diffs (⌘D), mark tasks ready-to-ship, merge when done

Each Claude Code session sees only its own worktree. No stepping on each other's changes.

## Features

**Terminal Card Stack** - Multiple terminal sessions with quick switching

**Git Integration** - Branch status, switching, worktree diffs, one-click merge

**Task Lifecycle** - Open → Ready to Ship → Closed, with worktree cleanup

## Script Hooks

Configure shell scripts that run at key points in the task lifecycle:

| Hook | When it runs | Example use |
|------|--------------|-------------|
| **init** | After worktree is created | `npm install` to set up dependencies |
| **run** | On-demand via launch menu | `npm run dev` to start dev server |
| **cleanup** | Before worktree is removed | Clean up resources, stop services |

Hooks receive environment variables:

```
OUIJIT_PROJECT_PATH    # Main project directory
OUIJIT_WORKTREE_PATH   # Task worktree directory
OUIJIT_TASK_BRANCH     # Git branch name
OUIJIT_TASK_NAME       # Task display name (e.g., "T-1")
OUIJIT_HOOK_TYPE       # Which hook is running
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ⌘D | Toggle diff panel |
| ⌘S | Open ship-it panel |
| ⌘T | Show task index |
| ⌘N | Create new task |
| ⌘P | Open runner terminal |
| ⌘W | Close current terminal |
| ⌘[ / ⌘] | Switch terminal cards |

## Development

```bash
npm install
npm run start    # Dev mode
npm run check    # Type check
npm run make     # Package for distribution
```

## Tech Stack

Electron, Vite, TypeScript, xterm.js, node-pty, @preact/signals-core

## Platforms

macOS and Linux

## License

MIT
