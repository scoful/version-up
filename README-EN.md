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
- 💡 **Smart Commit ID** - Accurate Git commit tracking with post-commit hooks

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
- Install Git hooks (pre-commit, post-commit)
- Generate GitHub Actions workflows (optional)

### 2. Make Changes & Commit

```bash
git add .
git commit -m "feat: add new feature"
```

The pre-commit hook will automatically:
- Increment patch version (0.0.1 → 0.0.2)
- Update `version.json` with build metadata

The post-commit hook will:
- Update Git commit ID in `version.json`
- Amend the commit with accurate metadata

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
version-up hooks install    # Install hooks
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
version-up refresh  # Update Git info without changing version
version-up sync     # Sync version to other files
```

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
version-up patch --skip-git-info
git add version.json
# Automatically adds all files in syncTargets (e.g., package.json, Cargo.toml)
```

### post-commit

Updates Git commit ID after commit completes:

```bash
version-up refresh
git add version.json
git commit --amend --no-edit --no-verify
```

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
  "gitCommit": "a1b2c3d",
  "gitBranch": "master",
  "environment": "development"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [scoful](https://github.com/scoful)

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/@scoful/version-up)
- [GitHub Repository](https://github.com/scoful/version-up)
- [Issue Tracker](https://github.com/scoful/version-up/issues)

