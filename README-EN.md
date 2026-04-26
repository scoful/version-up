# version-up

English | [简体中文](./README.md)

> Automated semantic versioning with native Git hooks for multi-language projects

[![npm version](https://img.shields.io/npm/v/@scoful/version-up.svg)](https://www.npmjs.com/package/@scoful/version-up)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Zero Config** - Works out of the box with sensible defaults
- 🪝 **Native Git Hooks** - Lightweight, no bloated dependencies (Husky/Lefthook)
- 🔄 **Auto Version Bump** - Automatically increment version on every commit
- 📦 **Multi-Language** - Sync versions across package.json, Cargo.toml, pyproject.toml, etc.
- 🎯 **Semantic Versioning** - Full semver support (major.minor.patch)
- 🔧 **GitHub Actions** - Built-in CI/CD workflow templates
- 🧭 **Live Git Info** - Read current Git state in `show`/`refresh` without rewriting history

## 📦 Installation

### Global (Recommended)

```bash
npm install -g @scoful/version-up
```

### Local (Per Project)

```bash
npm install --save-dev @scoful/version-up
```

## 🚀 Quick Start

### 1. Initialize

```bash
version-up init
```

This will:
- Create `version.json` with initial version
- Install Git hooks (`pre-commit`)
- Generate GitHub Actions workflows (optional)

### 2. Make Changes & Commit

```bash
git add .
git commit -m "feat: add new feature"
```

The pre-commit hook will automatically:
- Increment patch version (0.0.1 → 0.0.2)
- Sync `version.json` and other version files
- Finalize version changes before the commit object is created

### 3. Check Version

```bash
version-up show
```

Output:
```
📦 Current Version Info:

   Version: 0.0.2
   Build Time (UTC): 2025-10-29T08:30:45.123Z
   Git Commit: a1b2c3d
   Git Branch: master
   Environment: development
```

## 📦 Publishing This Package

Maintainers should use the repo script when publishing to the official npm registry:

```bash
npm run release:login    # First-time official registry login with browser/OTP/security key
npm run release:dry-run  # Local package dry run without changing your default mirror
npm run release          # Publish the current version
npm run release:minor    # minor + publish
npm run release:major    # major + publish
```

- The release script always targets `https://registry.npmjs.org/`
- It does not modify your global `registry`
- If your account uses write-level 2FA, `npm publish` still requires manual confirmation

## 📖 Commands

### Version Management

```bash
version-up patch    # 0.0.1 → 0.0.2
version-up minor    # 0.0.1 → 0.1.0
version-up major    # 0.0.1 → 1.0.0
version-up set 2.0.0  # Set specific version
```

### Display

```bash
version-up show                  # Full version info
version-up show --format=version # Version number only
version-up show --format=json    # JSON format
```

### Git Hooks

```bash
version-up hooks install    # Install or upgrade hooks (recommended after upgrading)
version-up hooks uninstall  # Remove hooks
version-up hooks status     # Check hook status
```

### CI/CD

```bash
version-up ci generate   # Generate GitHub Actions workflows
version-up ci template   # Show available templates
version-up ci remove     # Remove workflows
```

### Utilities

```bash
version-up refresh  # Show current Git info without modifying files
version-up sync     # Sync version to other files
```

### Incremental Upgrade For Initialized Projects

After upgrading `@scoful/version-up`, run this once in the project root:

```bash
version-up hooks install
```

This will:
- Upgrade the version-up managed `pre-commit` hook to the latest template
- Remove the legacy `post-commit` hook installed by older versions
- Keep your own non-version-up `post-commit` hook untouched

If you forget to run it first, the next version-up managed bump command will also auto-migrate legacy hooks.

## ⚙️ Configuration

Create `.versionrc` in your project root:

```json
{
  "syncTargets": [
    {
      "file": "package.json",
      "adapter": "package-json",
      "path": "version"
    },
    {
      "file": "Cargo.toml",
      "adapter": "cargo-toml",
      "path": "package.version"
    }
  ]
}
```

### Supported File Types

- **JSON** - package.json, manifest.json
- **TOML** - Cargo.toml, pyproject.toml

> 🚧 **Coming Soon:** YAML (pubspec.yaml, Chart.yaml), XML (pom.xml, build.gradle)

## 🔧 Git Hooks

### pre-commit

Automatically increments patch version and adds all synced files on every commit:

```bash
version-up patch
git add version.json
# Automatically adds all files in syncTargets (e.g., package.json, Cargo.toml)
```

### post-commit

The current strategy no longer installs `post-commit`.

`Git Commit` and `Git Branch` are read live by `version-up show` / `version-up refresh`, so the project does not amend history after the commit completes.

## 🎯 GitHub Actions

Generate workflows with `version-up ci generate`:

### version-bump.yml

Automatically bumps version on every push to main/master branch.

During `init`, you can choose the bump type (`patch`, `minor`, or `major`), which is saved to the `ci.onPush` field in `.versionrc`.

### build-deploy.yml

Triggered after version bump, handles build and deployment.

## 📝 version.json Structure

```json
{
  "version": "0.1.0",
  "buildTime": "2025-10-29T08:30:45.123Z",
  "environment": "development"
}
```

`gitCommit` / `gitBranch` are runtime Git metadata and are no longer persisted into the tracked `version.json` file.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [scoful](https://github.com/scoful)

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/@scoful/version-up)
- [GitHub Repository](https://github.com/scoful/version-up)
- [Issue Tracker](https://github.com/scoful/version-up/issues)
