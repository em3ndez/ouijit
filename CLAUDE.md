# Ouijit

Native macOS desktop app for project management.

## Design Rules

- No `cursor: pointer` - this is a desktop app, not web
- Use hover/active states for visual feedback, not cursor changes
- Follow macOS HIG patterns
- Respect system light/dark mode

## Code Rules

- Don't replace `innerHTML` on elements with event listeners (destroys handlers)
- Use targeted DOM updates instead of full rebuilds
- Clear intervals/timeouts on cleanup
