# Windows Support Requirements

Based on codebase analysis, here's what would need to change to add Windows support.

## Critical Changes

### 1. Terminal Launch (`src/ipc.ts:24-48`)

Currently uses AppleScript to launch Terminal.app. Need to implement Windows equivalent using `cmd.exe` or PowerShell.

```typescript
// Current: osascript with AppleScript
// Windows alternative:
spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', `cd /d "${path}" && ${command}`])
// Or PowerShell:
spawn('powershell.exe', ['-Command', `Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "${path}"; ${command}'`])
```

### 2. Window Styling (`src/main.ts:14-15`)

macOS-only Electron options that should be conditional:

```typescript
// These are ignored on Windows but should be wrapped for clarity
titleBarStyle: 'hiddenInset'        // macOS only
trafficLightPosition: { x: 16, y: 16 }  // macOS only
```

Consider using a custom titlebar on Windows or platform-specific styling.

### 3. Mise Installation (`src/ouijit/mise.ts:89-93`)

Currently returns an error on Windows. Options:
- Download prebuilt Windows binary from mise releases
- Use winget: `winget install jdx.mise`
- Use Scoop: `scoop install mise`

### 4. Import Directory (`src/ouijit/import.ts:12`)

Uses `~/Ouijit/imports`. Should use platform-appropriate location:

```typescript
// Instead of:
path.join(os.homedir(), 'Ouijit', 'imports')

// Use Electron's app data path:
import { app } from 'electron';
path.join(app.getPath('appData'), 'ouijit', 'imports')
// Windows: C:\Users\<user>\AppData\Roaming\ouijit\imports
// macOS: ~/Library/Application Support/ouijit/imports
```

### 5. Project Directories (`src/scanner.ts:10-18`)

Hardcoded Unix-style paths. Add Windows-typical locations:

```typescript
const PROJECT_DIRECTORIES = [
  '~/Projects',
  '~/Developer',
  '~/dev',
  '~/code',
  '~/repos',
  '~/workspace',
  '~/Ouijit/imports',
  // Windows additions:
  '~/Documents/Projects',
  '~/Documents/GitHub',
  '~/source/repos',  // Visual Studio default
];
```

## Already Handled

These are properly implemented for cross-platform:

| Feature | File | Implementation |
|---------|------|----------------|
| PTY shell selection | `ptyManager.ts:19-22` | Uses `cmd.exe` on Windows, `/bin/bash` on Unix |
| Shell arguments | `ptyManager.ts:41` | Uses `/c` for Windows, `-c` for Unix |
| Command detection | `mise.ts:23` | Uses `where` on Windows, `which` on Unix |
| App quit behavior | `main.ts:59-66` | macOS stays in dock, Windows quits on window close |
| Build config | `forge.config.ts` | Has MakerSquirrel for Windows .exe installer |

## Build Requirements

### Native Dependencies

**node-pty** requires native compilation:
- Install Visual Studio Build Tools on Windows
- Run `npm rebuild` after setup on Windows machine
- May need `windows-build-tools` npm package

### Forge Config Update

Remove darwin restriction from MakerZIP in `forge.config.ts`:

```typescript
// Current:
new MakerZIP({}, ['darwin']),

// Updated:
new MakerZIP({}, ['darwin', 'win32']),
```

## Implementation Priority

1. **Terminal launch** - Core functionality, blocks Windows usability
2. **Import directory** - Affects where user data is stored
3. **Project directories** - Affects project discovery
4. **Window styling** - Cosmetic but improves native feel
5. **Mise installation** - Nice to have, users can install manually

## Testing Considerations

- Test terminal launch with various commands and paths containing spaces
- Verify PTY works correctly with PowerShell and cmd.exe
- Test file path handling (forward vs backward slashes)
- Verify environment variable compatibility (`PATH` vs `Path`)
- Test with Windows Subsystem for Linux (WSL) if applicable
