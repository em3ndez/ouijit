# Theatre Mode for Terminal - Revised Plan (V2)

## Core Principle
**The terminal never moves in the DOM.** We only toggle CSS classes. Theatre mode is achieved purely through CSS that:
1. Hides sibling elements (project rows, search)
2. Makes the terminal `position: fixed` to fill the viewport
3. Updates header content for project info

## Why V1 Failed
The original plan hid `.main-content` with `display: none`, but the terminal is INSIDE `.main-content`. Moving the terminal to `document.body` caused:
- Event handlers to stop working (buttons unresponsive)
- State synchronization issues
- Complex anchor element tracking for restoration
- Fragile DOM manipulation

## V2 Approach: Hide Siblings, Not Parents

### DOM Structure (unchanged)
```
body
  .app-header
    .header-content  (search, refresh button)
  .main-content
    #project-grid
      .project-row
      .project-row
      .terminal-accordion  <-- sibling of project rows, NOT child
      .project-row
```

### Theatre Mode Behavior
1. Add `body.theatre-mode` class
2. CSS hides `.project-row` elements and search area
3. CSS makes `.terminal-accordion` fixed-position fullscreen
4. Terminal stays exactly where it is in DOM
5. JS only: update header content, handle escape key

---

## Implementation Steps

### 1. Minimal State (terminalComponent.ts)

```typescript
let theatreModeProjectPath: string | null = null;
let originalHeaderContent: string | null = null;
let escapeKeyHandler: ((e: KeyboardEvent) => void) | null = null;
```

No anchor element tracking needed.

### 2. Theatre Button (already exists in terminal header)

Same as before - maximize/minimize icon button.

### 3. Enter Theatre Mode (simplified)

```typescript
export function enterTheatreMode(projectPath: string, projectData: Project): void {
  if (theatreModeProjectPath) return; // Already in theatre mode

  const instance = terminals.get(projectPath);
  if (!instance) return;

  // 1. Add class to body - CSS handles the rest
  document.body.classList.add('theatre-mode');

  // 2. Add class to terminal container
  instance.container.classList.add('terminal-accordion--theatre');

  // 3. Update header content
  const headerContent = document.querySelector('.header-content');
  if (headerContent) {
    originalHeaderContent = headerContent.innerHTML;
    headerContent.innerHTML = buildTheatreHeader(projectData);
  }

  // 4. Escape key handler
  escapeKeyHandler = (e) => { if (e.key === 'Escape') exitTheatreMode(); };
  document.addEventListener('keydown', escapeKeyHandler);

  // 5. Refit terminal
  requestAnimationFrame(() => {
    instance.fitAddon.fit();
    if (instance.ptyId) {
      window.api.pty.resize(instance.ptyId, instance.terminal.cols, instance.terminal.rows);
    }
  });

  theatreModeProjectPath = projectPath;
}
```

### 4. Exit Theatre Mode (simplified)

```typescript
export function exitTheatreMode(): void {
  if (!theatreModeProjectPath) return;

  const instance = terminals.get(theatreModeProjectPath);

  // 1. Remove class from body
  document.body.classList.remove('theatre-mode');

  // 2. Remove class from terminal
  if (instance) {
    instance.container.classList.remove('terminal-accordion--theatre');
  }

  // 3. Restore header content
  const headerContent = document.querySelector('.header-content');
  if (headerContent && originalHeaderContent) {
    headerContent.innerHTML = originalHeaderContent;
    createIcons(); // Re-init lucide icons
    // Re-attach refresh handler
    const refreshBtn = headerContent.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        (window as any).refreshProjects?.();
      });
    }
  }

  // 4. Remove escape handler
  if (escapeKeyHandler) {
    document.removeEventListener('keydown', escapeKeyHandler);
    escapeKeyHandler = null;
  }

  // 5. Refit terminal
  if (instance) {
    requestAnimationFrame(() => {
      instance.fitAddon.fit();
      if (instance.ptyId) {
        window.api.pty.resize(instance.ptyId, instance.terminal.cols, instance.terminal.rows);
      }
    });
  }

  originalHeaderContent = null;
  theatreModeProjectPath = null;
}
```

### 5. CSS - The Key Difference

```css
/* ===================================
   Theatre Mode Styles
   =================================== */

/* Hide project rows - NOT main-content */
body.theatre-mode .project-row {
  display: none !important;
}

/* Hide search/refresh area in header */
body.theatre-mode .search-container {
  display: none !important;
}

body.theatre-mode .refresh-btn {
  display: none !important;
}

/* Theatre mode terminal - position fixed lifts it visually */
.terminal-accordion--theatre {
  position: fixed !important;
  top: 72px;
  left: 20px;
  right: 20px;
  bottom: 20px;
  max-height: none !important;
  height: auto !important;
  margin: 0 !important;
  opacity: 1 !important;
  overflow: visible !important;
  z-index: 100;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
}

.terminal-accordion--theatre .terminal-viewport {
  flex: 1;
  min-height: 0;
}

/* Theatre header content */
.theatre-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding-left: 80px;
}

/* ... rest of theatre header styles ... */
```

### 6. Button Click Handler

```typescript
theatreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isInTheatre = container.classList.contains('terminal-accordion--theatre');
  if (isInTheatre) {
    exitTheatreMode();
  } else if (projectData) {
    enterTheatreMode(projectPath, projectData);
  }
});
```

---

## What's Different from V1

| Aspect | V1 (Failed) | V2 (Simpler) |
|--------|-------------|--------------|
| DOM Movement | Moves terminal to body | Terminal never moves |
| Hide Strategy | `display:none` on parent | `display:none` on siblings |
| Anchor Tracking | Required | Not needed |
| State Complexity | High (anchor, position) | Low (just path + header) |
| Event Handlers | Can break | Stay intact |
| Exit Logic | Complex restoration | Just remove classes |

---

## Verification Steps

1. Open terminal for any project
2. Click theatre button
3. Verify: project rows hidden, terminal fullscreen, header shows project info
4. Click theatre button again OR press Escape
5. Verify: normal view restored, terminal back to accordion size under project row
6. Both expand and collapse buttons should work
7. Close button should work in both modes
