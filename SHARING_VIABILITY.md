# Project Sharing Viability Analysis

This document analyzes whether Ouijit can successfully run shared projects on a fresh Mac with no pre-installed dependencies.

## How It Works

When a project is exported as a `.ouijit` file and imported on another machine:

1. **Mise auto-installation** - If mise isn't present, it downloads via `curl https://mise.run | sh` (curl comes with macOS)
2. **Runtime auto-installation** - Mise installs the required runtime (Node, Go, Rust, Python) based on detected version files (`.nvmrc`, `go.mod`, `Cargo.toml`, etc.)
3. **Dependency auto-installation** - Checks for `node_modules`, `venv`, `target/`, etc. and runs the appropriate install command
4. **Isolated execution** - Commands run via `mise exec -- <command>` ensuring correct runtime versions

## What Works Well

- **Zero-config runtime management** - Users don't need to manually install Node, Python, Go, or Rust
- **Version pinning** - Respects `.nvmrc`, `.node-version`, `engines` in package.json, `go.mod` versions, etc.
- **Package manager flexibility** - Detects and uses npm, pnpm, yarn, bun, pip, cargo as appropriate
- **Import isolation** - Imported projects live in `~/Ouijit/imports/` with metadata tracking

## Potential Gaps

### 1. Xcode Command Line Tools

Some native Node modules require compilation (e.g., `node-pty`, `sharp`, `bcrypt`). A fresh Mac won't have Xcode CLI tools installed.

**Impact:** Projects with native dependencies may fail to install.

**Possible solutions:**
- Detect native modules in package.json and prompt user to install Xcode CLI tools
- Add a pre-flight check that runs `xcode-select --install` if needed
- Document this requirement clearly

### 2. System-Level Dependencies

Projects requiring system services or libraries aren't handled:
- Databases: PostgreSQL, MySQL, Redis, MongoDB
- Libraries: ImageMagick, FFmpeg, libvips
- Services: Elasticsearch, RabbitMQ

**Impact:** Projects depending on these will fail at runtime even if they install successfully.

**Possible solutions:**
- Allow manifest to declare system dependencies
- Integrate with Homebrew for system package installation
- Add warnings in the import preview if common system deps are detected

### 3. Version Detection Reliability

Runtime version detection depends on convention files existing:
- Node: `.nvmrc`, `.node-version`, or `engines` in package.json
- Python: `.python-version`, `pyproject.toml`, or `setup.py`
- Go: `go.mod` with go directive
- Rust: `rust-toolchain.toml` or `rust-toolchain`

**Impact:** Projects without these files will use mise's default version, which may not match what the project needs.

**Possible solutions:**
- Prompt exporter to specify version if not auto-detected
- Store detected/specified version in the `.ouijit` manifest
- Use manifest version as source of truth during import

### 4. Docker Projects

Docker Compose projects are detected but require Docker Desktop to be installed separately.

**Impact:** Docker-based projects won't run without manual Docker installation.

**Possible solutions:**
- Detect Docker projects and show clear messaging about the requirement
- Link to Docker Desktop download in the UI
- Consider alternative containerization (Podman, Colima)

### 5. Windows Support

The mise installation script (`curl https://mise.run | sh`) is macOS/Linux only.

**Impact:** Windows users cannot use the dependency management features.

**Possible solutions:**
- Use mise's Windows installer when available
- Consider alternative tooling for Windows (scoop, chocolatey, winget)
- Document platform limitations clearly

### 6. Network Requirements

Mise downloads runtimes from the internet. First-run on a new machine requires network access.

**Impact:** Offline usage not possible for first import.

**Possible solutions:**
- Pre-bundle common runtimes (increases app size significantly)
- Allow "fat" exports that include the runtime binary
- Cache runtimes locally after first download

## Validation Checklist

To validate this use case works end-to-end:

- [ ] Test on a fresh macOS user account (not just a new machine)
- [ ] Test with a Node project that has native dependencies
- [ ] Test with projects using each supported runtime (Node, Go, Rust, Python)
- [ ] Test with a project that has no version files (relies on defaults)
- [ ] Test the error experience when system dependencies are missing
- [ ] Verify Electron app's own native modules are pre-built (not requiring compilation on user's machine)

## Architecture Notes

Key files involved in dependency management:

| File | Purpose |
|------|---------|
| `src/main/ouijit/mise.ts` | Runtime detection, mise installation, command wrapping |
| `src/main/ouijit/dependencies.ts` | Checks if project is imported |
| `src/main/ptyManager.ts` | Integrates mise wrapper when spawning terminals |
| `src/main/ouijit/export.ts` | Creates `.ouijit` packages with manifest |
| `src/main/ouijit/import.ts` | Extracts and sets up imported projects |

## Recommendations

### Short-term (for validation)
1. Add Xcode CLI tools detection and prompting
2. Improve version detection to fall back to manifest values
3. Add clear error messaging for common failure cases

### Medium-term (for robustness)
1. Allow manifest to declare system dependencies
2. Add pre-flight checks before running imported projects
3. Implement a "health check" command that validates environment

### Long-term (for completeness)
1. Homebrew integration for system dependencies
2. Windows support via alternative tooling
3. Offline/cached runtime support
