# version-up 设计文档

> 独立版本管理工具 - 完整设计方案
> 
> 创建时间：2025-10-27
> 状态：设计完成，待实施

---

## 📋 项目概述

**项目名称**：`version-up`

**目标**：提取现有版本管理系统为独立工具，支持多语言项目（Node.js, Python, Rust, Go 等）

**核心特性**：
- ✅ 语义化版本控制（Semantic Versioning）
- ✅ 零 npm 依赖（仅需 Node.js 运行时）
- ✅ Git Hooks 自动化
- ✅ CI/CD 集成（GitHub Actions）
- ✅ 多语言项目支持
- ✅ 配置化、可扩展

---

## ✅ 8 个核心决策

### 决策 1：工具名称
**选择**：`version-up`

**理由**：
- 简短易记（10 字符）
- 动作导向（"up" 暗示升级）
- 积极正面
- 独特性强

**影响**：
- 命令行：`version-up <command>`
- npm 包名：`version-up`
- GitHub 仓库：`version-up`
- 脚本文件：`version-up.sh`, `version-up.bat`, `version-up.ps1`

---

### 决策 2：安装方式
**选择**：npm 全局安装为主

**安装命令**：
```bash
npm install -g version-up
```

**备用方式**：
```bash
# 手动下载
git clone https://github.com/your-org/version-up.git
cd version-up
npm link
```

**影响**：
- 需要 Node.js 环境
- 更新方便（`npm update -g version-up`）
- 全局可用

---

### 决策 3：配置文件格式
**选择**：JSON

**配置文件名**：`.versionrc`

**示例配置**：
```json
{
  "versionFile": "version.json",

  "syncTargets": [
    {
      "file": "package.json",
      "path": "version",
      "adapter": "package-json",
      "required": true
    },
    {
      "file": "pyproject.toml",
      "path": "tool.poetry.version",
      "adapter": "pyproject-toml",
      "required": false
    }
  ],

  "hooks": {
    "enabled": true,
    "preCommit": "patch"
  },

  "ci": {
    "onPush": "minor"
  }
}
```

**影响**：
- 使用标准 JSON 格式
- 无需额外解析器
- 简单可靠

---

### 决策 4：Git Hooks 安装策略
**选择**：询问用户 + 原生 Git Hooks

**安装流程**：
```bash
version-up init

# 输出：
# ✅ 已创建 version.json (v0.0.0)
# ✅ 已创建 .versionrc
#
# ❓ 是否启用 Git Hooks 自动版本管理？
#    • pre-commit: 每次提交前自动递增版本
#    • show/refresh: 实时读取 Git 信息，不改写提交历史
#
# [Y/n]: _
```

**原生 Git Hooks 安装逻辑**：
1. 直接在 `.git/hooks/` 目录创建 hook 脚本
2. 无需额外依赖（Husky、Lefthook 等）
3. 自动设置可执行权限
4. 如果 hook 已存在，询问是否覆盖

**命令**：
```bash
version-up init              # 交互式
version-up init --no-hooks   # 跳过 hooks
version-up hooks install     # 手动安装
version-up hooks uninstall   # 卸载
version-up hooks status      # 查看状态
```

**影响**：
- 用户有选择权
- 避免意外覆盖现有 hooks
- 使用原生 Git Hooks，轻量级无依赖

---

### 决策 5：GitHub Actions 模板生成
**选择**：交互式生成

**生成流程**：
```bash
version-up init

# ❓ 是否生成 GitHub Actions 工作流？
# [Y/n]: _
```

**用户选择 Y**：
```bash
# ❓ 选择工作流类型：
# 1. 单一工作流（简单）
# 2. 分离工作流（推荐）
# 选择 [1/2]: _
```

**生成的工作流**：
- `version-bump.yml`：版本更新工作流
- `build-deploy.yml`：构建部署工作流（依赖版本更新）

**命令**：
```bash
version-up init              # 交互式（包括 CI 询问）
version-up init --no-ci      # 跳过 CI 配置
version-up init --ci=github  # 直接生成 GitHub Actions
version-up templates github  # 只输出模板
```

**影响**：
- 用户友好
- 避免覆盖现有工作流
- 提供清晰的选项

---

### 决策 6：版本文件位置
**选择**：项目根目录

**文件结构**：
```
project/
├── version.json          # 版本信息（SSOT）
├── .versionrc            # 配置文件
├── package.json          # 同步目标
├── pyproject.toml        # 同步目标（如果有）
└── .git/
```

**影响**：
- 符合惯例（类似 `package.json`）
- 易于访问
- 前端可以直接 `import version from '../version.json'`

---

### 决策 7：错误处理策略
**选择**：基于 `required` 字段的灵活控制

**行为说明**：
- `required: true` - 文件必须存在，同步失败则中断操作
- `required: false` - 文件可选，同步失败则跳过并显示警告

**示例输出**：
```bash
version-up patch

# 输出：
# ✅ 版本已更新: 1.0.0 → 1.0.1
# 🔄 同步版本到其他文件...
#    ✅ package.json
#    ⚠️  pyproject.toml (文件不存在，已跳过)
#
# ✅ 版本更新完成！
# ⚠️  1 个文件同步失败（查看上方详情）
```

**配置示例**：
```json
{
  "syncTargets": [
    {
      "file": "package.json",
      "required": true
    },
    {
      "file": "pyproject.toml",
      "required": false
    }
  ]
}
```

**命令**：
```bash
version-up patch           # 宽松模式
version-up patch --strict  # 严格模式（临时）
```

**影响**：
- 灵活（适合多语言项目）
- 用户体验好
- 可配置关键文件

---

### 决策 8：初始版本号
**选择**：固定初始值 `0.0.0`

**首次运行**：
```bash
version-up init

# 输出：
# ✅ 已创建 version.json (v0.0.0)
# ✅ 已创建 .versionrc.json5
# 💡 提示：运行 'version-up patch' 开始版本管理
```

**version.json 结构**：
```json
{
  "version": "0.0.0",
  "buildTime": "2025-10-27T10:00:00.000Z",
  "environment": "development"
}
```

**影响**：
- 最简单（零配置）
- 语义清晰（0.0.0 = 未发布）
- 用户可以通过 `version-up set 1.0.0` 手动修改

---

## 🏗️ 核心架构设计

### 文件结构
```
version-up/
├── bin/
│   ├── version-up.sh       # Unix 入口
│   ├── version-up.bat      # Windows 入口
│   └── version-up.ps1      # PowerShell 入口
├── core/
│   └── version-up-core.js  # 单文件核心逻辑
├── templates/
│   ├── github-actions/
│   │   ├── version-bump.yml
│   │   └── build-deploy.yml
│   └── .versionrc.template
├── package.json
├── README.md
└── LICENSE
```

### 核心命令
```bash
version-up init              # 初始化（交互式）
version-up patch             # patch+1
version-up minor             # minor+1
version-up major             # major+1
version-up set <version>     # 设置版本
version-up show              # 显示当前版本
version-up sync              # 手动同步
version-up hooks install     # 安装 hooks
version-up hooks uninstall   # 卸载 hooks
version-up templates github  # 输出 GitHub Actions 模板
```

### 技术栈
- **语言**：JavaScript（Node.js）
- **依赖**：chalk, inquirer, @iarna/toml
- **运行时**：Node.js 16+
- **跨平台**：Shell（Unix）+ Batch（Windows）+ PowerShell

---

## 📦 Adapter 系统

支持多种项目文件格式：

### 1. package.json（Node.js）
```javascript
{
  "file": "package.json",
  "path": "version",
  "adapter": "package-json"
}
```

### 2. pyproject.toml（Python）
```javascript
{
  "file": "pyproject.toml",
  "path": "tool.poetry.version",
  "adapter": "pyproject-toml"
}
```

### 3. Cargo.toml（Rust）
```javascript
{
  "file": "Cargo.toml",
  "path": "package.version",
  "adapter": "cargo-toml"
}
```

### 4. go.mod（Go）
```javascript
{
  "file": "go.mod",
  "path": "module",
  "adapter": "go-mod"
}
```

---

## 🔄 工作流设计

### 本地开发流程
```
git commit
  ↓
pre-commit hook
  ↓
version-up patch
  ↓
version.json: 1.0.0 → 1.0.1
  ↓
同步到 package.json, pyproject.toml 等
  ↓
git add version.json package.json
  ↓
commit 完成
```

### CI/CD 流程（分离工作流）
```
git push
  ↓
GitHub Actions: Version Bump
  ↓
version-up minor
  ↓
version.json: 1.0.1 → 1.1.0
  ↓
git commit & push [skip ci]
  ↓
GitHub Actions: Build & Deploy
  ↓
读取 version.json
  ↓
构建 Docker 镜像（tag: v1.1.0）
  ↓
部署
```

---

## 📝 GitHub Actions 模板

### version-bump.yml
```yaml
name: Version Bump

on:
  push:
    branches: [main]
    paths-ignore:
      - '.github/**'
      - '**.md'

jobs:
  bump:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install version-up
        run: npm install -g version-up
      
      - name: Bump version (读取配置 ci.onPush)
        run: |
          # 模板会根据 .versionrc 中的 ci.onPush 配置自动替换
          version-up {{ON_PUSH}}
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add version.json

          # 动态添加所有 syncTargets 中的文件
          if [ -f .versionrc ]; then
            SYNC_FILES=$(node -e "
              try {
                const fs = require('fs');
                const config = JSON.parse(fs.readFileSync('.versionrc', 'utf-8'));
                if (config.syncTargets && config.syncTargets.length > 0) {
                  console.log(config.syncTargets.map(t => t.file).join(' '));
                }
              } catch (e) {}
            ")
            if [ -n \"$SYNC_FILES\" ]; then
              git add $SYNC_FILES 2>/dev/null || true
            fi
          fi

          NEW_VERSION=$(version-up show --format=version)
          git commit -m "chore: bump version to $NEW_VERSION [skip ci]"
          git push origin main
```

### build-deploy.yml
```yaml
name: Build and Deploy

on:
  workflow_run:
    workflows: ["Version Bump"]
    types: [completed]
    branches: [main]

jobs:
  build:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
      
      - name: Get version
        id: version
        run: |
          npm install -g version-up
          VERSION=$(version-up show --format=version)
          echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Build
        run: echo "Building v${{ steps.version.outputs.VERSION }}"
      
      # 用户自定义构建步骤...
```

---

## 🚀 实施计划

### 阶段 1：核心功能（1-2 天）
- [ ] 创建项目结构
- [ ] 实现 `version-up-core.js`（核心逻辑）
- [ ] 实现 Shell 入口脚本（`version-up.sh`, `.bat`, `.ps1`）
- [ ] 实现基础命令（`patch`, `minor`, `major`, `show`, `set`）

### 阶段 2：配置与同步（1 天）
- [x] 实现 JSON 配置解析
- [x] 实现 Adapter 系统（`package.json`, `pyproject.toml` 等）
- [x] 实现同步逻辑（基于 `required` 字段）

### 阶段 3：自动化（1 天）
- [x] 实现 `init` 命令（交互式）
- [x] 实现 Git Hooks 安装（原生 Git Hooks）
- [x] 实现 GitHub Actions 模板生成（支持 ci.onPush 配置）

### 阶段 4：发布（0.5 天）
- [ ] 创建 `package.json`（npm 发布配置）
- [ ] 编写 README（简洁版）
- [ ] 发布到 npm

---

## 🎯 核心原则

- **YAGNI**：只实现必要功能
- **DRY**：避免重复代码
- **KISS**：保持简单
- **SSOT**：`version.json` 作为单一数据源
- **Fail Fast**：错误及时暴露

---

## 📚 参考资料

- 语义化版本规范：https://semver.org/
- Git Hooks：https://git-scm.com/docs/githooks
- GitHub Actions：https://docs.github.com/en/actions

---

## 📄 许可证

MIT License

---

**文档版本**：1.0.0  
**最后更新**：2025-10-27  
**状态**：设计完成，待实施
