# Plan: Add Git Branch/Status to Theatre Mode Header

## Overview
Add git branch name and dirty/clean status indicator to the theatre mode header, next to the project name/path.

## Current State
- Theatre header shows: icon, project name, project path, exit button
- `Project` interface has `hasGit: boolean` but no branch/status info
- Git commands are already used in `export.ts` (`getGitInfo()`) as a pattern reference
- IPC pattern: main handler → preload bridge → renderer API

## Implementation

### 1. Add git status utility function
**File:** `src/git.ts` (new file)

```typescript
export interface GitStatus {
  branch: string;
  isDirty: boolean;
}

export async function getGitStatus(projectPath: string): Promise<GitStatus | null>
```

- Use `git rev-parse --abbrev-ref HEAD` for branch name
- Use `git status --porcelain` for dirty check (any output = dirty)
- Return `null` if not a git repo or commands fail

### 2. Add IPC handler
**File:** `src/ipc.ts`

```typescript
ipcMain.handle('get-git-status', async (_event, projectPath: string) => {
  return getGitStatus(projectPath);
});
```

### 3. Add preload bridge
**File:** `src/preload.ts`

```typescript
getGitStatus: (projectPath: string): Promise<GitStatus | null> =>
  ipcRenderer.invoke('get-git-status', projectPath),
```

### 4. Update theatre header
**File:** `src/components/terminalComponent.ts`

Modify `buildTheatreHeader()` to accept optional git status and render:
- Branch name with git-branch icon
- Colored dot indicator (green = clean, yellow = dirty)

Update `enterTheatreMode()` to:
1. Fetch git status via `window.api.getGitStatus(projectPath)`
2. Pass to `buildTheatreHeader()`

### 5. Add idle-refresh for git status
**File:** `src/components/terminalComponent.ts`

Add debounced git status refresh on terminal data:
- Track last terminal output timestamp
- After ~1 second of idle (no output), refresh git status
- Update the `.theatre-git-status` element in place (no full header rebuild)
- Clear interval/timeout on exit theatre mode

### 6. Add styles
**File:** `src/index.css`

- `.theatre-git-status` container
- `.theatre-git-branch` with icon
- `.theatre-git-indicator` colored dot

## Files to Modify
1. `src/git.ts` - NEW - git status utility
2. `src/ipc.ts` - add handler
3. `src/preload.ts` - add bridge method
4. `src/components/terminalComponent.ts` - update header + idle refresh
5. `src/index.css` - add styles

## Verification
1. Open a git project with uncommitted changes → should show branch + yellow dot
2. Open a git project with clean state → should show branch + green dot
3. Open a non-git project → should not show git section
4. Enter/exit theatre mode repeatedly → should work correctly
5. Run `git commit` in theatre mode → status should update to clean after idle
6. Edit a file in another window → status should update to dirty after next terminal activity
