# Version-UP

[English](./README-EN.md) | 简体中文

> 基于原生 Git Hooks 的自动化语义版本管理工具，支持多语言项目

[![npm version](https://img.shields.io/npm/v/@scoful/version-up.svg)](https://www.npmjs.com/package/@scoful/version-up)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 🚀 **零配置** - 开箱即用，默认配置合理
- 🪝 **原生 Git Hooks** - 轻量级，无臃肿依赖（Husky/Lefthook）
- 🔄 **自动版本递增** - 每次提交自动递增版本号
- 📦 **多语言支持** - 同步版本到 package.json、Cargo.toml、pyproject.toml 等
- 🎯 **语义化版本** - 完整支持 semver (major.minor.patch)
- 🔧 **GitHub Actions** - 内置 CI/CD 工作流模板
- 💡 **智能 Commit ID** - 通过 post-commit hook 准确追踪 Git commit

## 📦 安装

### 全局安装（推荐）

```bash
npm install -g @scoful/version-up
```

### 本地安装（单项目）

```bash
npm install --save-dev @scoful/version-up
```

## 🚀 快速开始

### 1. 初始化

```bash
version-up init
```

这将会：
- 创建 `version.json` 初始版本文件
- 安装 Git hooks (pre-commit, post-commit)
- 生成 GitHub Actions 工作流（可选）

### 2. 修改代码并提交

```bash
git add .
git commit -m "feat: 添加新功能"
```

pre-commit hook 会自动：
- 递增 patch 版本 (0.0.1 → 0.0.2)
- 更新 `version.json` 构建元数据

post-commit hook 会：
- 更新 `version.json` 中的 Git commit ID
- 使用准确的元数据修正提交

### 3. 查看版本

```bash
version-up show
```

输出：
```
📦 当前版本信息:

   版本: 0.0.2
   构建时间 (UTC): 2025-10-29T08:30:45.123Z
   Git Commit: a1b2c3d
   Git Branch: master
   环境: development
```

## 📖 命令

### 版本管理

```bash
version-up patch    # 0.0.1 → 0.0.2
version-up minor    # 0.0.1 → 0.1.0
version-up major    # 0.0.1 → 1.0.0
version-up set 2.0.0  # 设置指定版本
```

### 显示

```bash
version-up show                  # 完整版本信息
version-up show --format=version # 仅显示版本号
version-up show --format=json    # JSON 格式
```

### Git Hooks

```bash
version-up hooks install    # 安装 hooks
version-up hooks uninstall  # 卸载 hooks
version-up hooks status     # 检查 hook 状态
```

### CI/CD

```bash
version-up ci generate   # 生成 GitHub Actions 工作流
version-up ci template   # 显示可用模板
version-up ci remove     # 删除工作流
```

### 工具

```bash
version-up refresh  # 更新 Git 信息而不改变版本号
version-up sync     # 同步版本到其他文件
```

## ⚙️ 配置

在项目根目录创建 `.versionrc`：

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

### 支持的文件类型

- **JSON** - package.json, manifest.json
- **TOML** - Cargo.toml, pyproject.toml

> 🚧 **即将支持:** YAML (pubspec.yaml, Chart.yaml), XML (pom.xml, build.gradle)

## 🔧 Git Hooks

### pre-commit

每次提交时自动递增 patch 版本，并添加所有同步的文件：

```bash
version-up patch --skip-git-info
git add version.json
# 自动添加所有 syncTargets 中的文件（如 package.json, Cargo.toml 等）
```

### post-commit

提交完成后更新 Git commit ID：

```bash
version-up refresh
git add version.json
git commit --amend --no-edit --no-verify
```

## 🎯 GitHub Actions

使用 `version-up ci generate` 生成工作流：

### version-bump.yml

每次推送到 main/master 分支时自动递增版本。

在 `init` 时可以选择递增类型（`patch`、`minor` 或 `major`），配置会保存到 `.versionrc` 的 `ci.onPush` 字段。

### build-deploy.yml

在版本递增后触发，处理构建和部署。

## 📝 version.json 结构

```json
{
  "version": "0.1.0",
  "buildTime": "2025-10-29T08:30:45.123Z",
  "gitCommit": "a1b2c3d",
  "gitBranch": "master",
  "environment": "development"
}
```

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

MIT © [scoful](https://github.com/scoful)

## 🔗 链接

- [npm 包](https://www.npmjs.com/package/@scoful/version-up)
- [GitHub 仓库](https://github.com/scoful/version-up)
- [问题追踪](https://github.com/scoful/version-up/issues)

