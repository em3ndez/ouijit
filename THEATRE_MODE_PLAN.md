# Theatre Mode for Terminal - Implementation Plan

## Overview
Add a "theatre mode" that expands the terminal to fill most of the window, with the project info replacing the header's refresh/search area.

## Files to Modify

1. **`src/components/terminalComponent.ts`** - Core theatre mode logic
2. **`src/index.css`** - Theatre mode styling
3. **`src/components/projectRow.ts`** - Pass project data to terminal handler
4. **`src/renderer.ts`** - Update handler signatures

---

## Implementation Steps

### 1. Add Theatre Mode State & Functions (terminalComponent.ts)

Add module-level state after line 15:
```typescript
let theatreModeProjectPath: string | null = null;
let originalHeaderContent: string | null = null;
```

Export functions:
- `enterTheatreMode(projectPath, projectData)` - Activates theatre mode
- `exitTheatreMode()` - Restores normal view
- `isTheatreModeActive()` - Check current state

### 2. Add Theatre Button to Terminal Header (terminalComponent.ts:29-37)

In `createTerminalContainer`, add a maximize button before the close button:
```typescript
const theatreBtn = document.createElement('button');
theatreBtn.className = 'terminal-theatre-btn';
theatreBtn.title = 'Theatre mode';
// Use Maximize2 SVG icon (or innerHTML with SVG path)

controls.appendChild(theatreBtn);  // Add before closeBtn
controls.appendChild(closeBtn);
```

### 3. Implement Enter Theatre Mode (terminalComponent.ts)

Create `enterTheatreMode(projectPath: string, projectData: Project)`:

1. Add `theatre-mode` class to `<body>` (this hides `.main-content`)
2. Save original `.header-content` innerHTML to `originalHeaderContent`
3. Replace header content with project info layout:
   ```html
   <div class="theatre-header-content">
     <img class="theatre-project-icon" src="..." />  <!-- or placeholder -->
     <div class="theatre-project-info">
       <span class="theatre-project-name">Project Name</span>
       <span class="theatre-project-path">/path/to/project</span>
     </div>
     <span class="theatre-project-description">Description here</span>
     <div class="theatre-badges"><!-- language, git, claude badges --></div>
     <button class="theatre-exit-btn" title="Exit theatre mode">
       <!-- Minimize2 icon -->
     </button>
   </div>
   ```
4. Add `terminal-accordion--theatre` class to terminal container
5. Call `fitAddon.fit()` to resize terminal to new dimensions
6. Add Escape key listener to exit theatre mode
7. Set `theatreModeProjectPath = projectPath`

### 4. Implement Exit Theatre Mode (terminalComponent.ts)

Create `exitTheatreMode()`:

1. Remove `theatre-mode` class from `<body>`
2. Restore original header content from `originalHeaderContent`
3. Re-initialize lucide icons with `createIcons()`
4. Re-attach refresh button click handler
5. Remove `terminal-accordion--theatre` class from terminal container
6. Remove Escape key listener
7. Call `fitAddon.fit()` to resize terminal back to normal
8. Set `theatreModeProjectPath = null`

### 5. Wire Up Event Handlers (terminalComponent.ts)

In `createTerminal()` after setting up close button (around line 141):
```typescript
const theatreBtn = container.querySelector('.terminal-theatre-btn') as HTMLButtonElement;
theatreBtn.addEventListener('click', () => {
  if (isTheatreModeActive()) {
    exitTheatreMode();
  } else if (projectData) {
    enterTheatreMode(projectPath, projectData);
  }
});
```

### 6. CSS Styles (index.css, add after line 1017)

```css
/* ===================================
   Theatre Mode Styles
   =================================== */

/* Hide main content in theatre mode */
body.theatre-mode .main-content {
  display: none;
}

/* Theatre mode header content layout */
.theatre-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding-left: 80px; /* Space for macOS traffic lights */
}

.theatre-project-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.theatre-project-icon-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.theatre-project-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.theatre-project-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theatre-project-path {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theatre-project-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.theatre-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.theatre-exit-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theatre-exit-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* Theatre mode terminal - fixed position, full viewport */
.terminal-accordion--theatre {
  position: fixed;
  top: 72px; /* header height */
  left: 20px;
  right: 20px;
  bottom: 20px;
  max-height: none;
  margin: 0;
  opacity: 1;
  z-index: 100;
  border-radius: var(--radius-lg);
}

.terminal-accordion--theatre .terminal-viewport {
  height: calc(100% - 40px); /* subtract terminal header height */
}

/* Theatre button in terminal header (matches close button styling) */
.terminal-theatre-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: var(--radius-full);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.terminal-theatre-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.terminal-theatre-btn svg {
  width: 14px;
  height: 14px;
}
```

### 7. Pass Project Data Through Handler Chain

**projectRow.ts** - Modify the terminal button click handler (around line 289-305):
```typescript
terminalBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  onOpenTerminal(project.path, row, project); // Pass full project object
});
```

Update the `CreateProjectRowOptions` interface to change `onOpenTerminal` signature:
```typescript
onOpenTerminal?: (path: string, row: HTMLElement, project: Project) => void;
```

**renderer.ts** - Update `handleOpenTerminal` signature (around line 99):
```typescript
async function handleOpenTerminal(
  path: string,
  row: HTMLElement,
  project?: Project
): Promise<void> {
  // ... existing code ...
  const result = await createTerminal(path, undefined, row, project);
  // ...
}
```

**terminalComponent.ts** - Update `createTerminal` signature (line 77):
```typescript
export async function createTerminal(
  projectPath: string,
  command: string | undefined,
  anchorElement: HTMLElement,
  projectData?: Project
): Promise<{ success: boolean; error?: string }>
```

Store `projectData` in the terminal instance or closure for use when entering theatre mode.

### 8. Handle Edge Cases

**Terminal destroyed while in theatre mode** - In `destroyTerminal()` (line 193):
```typescript
export function destroyTerminal(projectPath: string): void {
  // Exit theatre mode if this terminal is active
  if (theatreModeProjectPath === projectPath) {
    exitTheatreMode();
  }

  // ... rest of existing code ...
}
```

**New terminal opened while in theatre mode** - In `createTerminal()`:
```typescript
// At the start of the function
if (theatreModeProjectPath && theatreModeProjectPath !== projectPath) {
  exitTheatreMode();
}
```

**Escape key handler** - Add in `enterTheatreMode`:
```typescript
function handleEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    exitTheatreMode();
  }
}

// In enterTheatreMode:
document.addEventListener('keydown', handleEscapeKey);

// In exitTheatreMode:
document.removeEventListener('keydown', handleEscapeKey);
```

---

## Verification Steps

1. Open a terminal for any project
2. Click the theatre mode button (maximize icon) next to close button
3. Verify:
   - Project info (icon, name, path, description, tags) appears in header area
   - Refresh button and search input are hidden
   - All other project rows are hidden
   - Terminal fills viewport with 20px margins on left, right, and bottom
   - Terminal starts immediately below header (72px from top)
4. Click exit button in header or press Escape
5. Verify normal view is fully restored (search, refresh, all projects visible)
6. Test closing terminal while in theatre mode - should exit theatre mode cleanly
7. Test opening a different project's terminal while in theatre mode - should exit and open new one
