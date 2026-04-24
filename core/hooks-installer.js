#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ConfigLoader from './config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Git Hooks 安装器
 * 使用原生 Git Hooks
 */
class HooksInstaller {
  constructor(cwd = process.cwd(), debug = false) {
    this.cwd = cwd;
    this.debug = debug;
    this.gitDir = path.join(cwd, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  /**
   * 检测是否在 Git 仓库中
   */
  isGitRepo() {
    return fs.existsSync(this.gitDir);
  }

  /**
   * 确保 hooks 目录存在
   */
  ensureHooksDir() {
    if (!fs.existsSync(this.hooksDir)) {
      fs.mkdirSync(this.hooksDir, { recursive: true });
    }
  }

  /**
   * 获取当前版本支持的 hooks
   */
  getManagedHooks() {
    return ['pre-commit'];
  }

  /**
   * 识别旧版遗留 hooks
   */
  getLegacyHooks() {
    return ['post-commit'];
  }

  /**
   * 判断是否为 version-up 管理的 hook
   */
  isVersionUpHook(content, hookName = null) {
    const normalized = content.replace(/\r\n/g, '\n');
    const markers = hookName
      ? [`# version-up hook: ${hookName}`, `# version-up ${hookName} hook`]
      : [
          '# version-up hook:',
          '# version-up pre-commit hook',
          '# version-up post-commit hook',
        ];

    return markers.some(marker => normalized.includes(marker));
  }

  /**
   * 获取 hook 模板内容
   */
  getTemplateContent(hookName, config) {
    const templatePath = path.join(this.templatesDir, `${hookName}.template`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Hook template not found: ${hookName}.template`);
    }

    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    if (hookName === 'pre-commit') {
      const bumpType = config.hooks.preCommit || 'patch';
      templateContent = templateContent.replace(/\{\{BUMP_TYPE\}\}/g, bumpType);
    }

    return templateContent;
  }

  /**
   * 写入 hook 文件
   */
  writeHook(hookPath, content) {
    fs.writeFileSync(hookPath, content, { mode: 0o755 });
  }

  /**
   * 生成禁用的 legacy hook 内容
   */
  getDisabledLegacyHookContent(hookName) {
    return `#!/bin/sh
# version-up legacy ${hookName} disabled
exit 0
`;
  }

  /**
   * 判断是否为已失效化的 legacy hook
   */
  isDisabledLegacyHook(content, hookName) {
    return content.includes(`# version-up legacy ${hookName} disabled`);
  }

  /**
   * 安装或升级单个受管理 hook
   */
  async installManagedHook(hookName, desiredContent) {
    const hookPath = path.join(this.hooksDir, hookName);

    if (!fs.existsSync(hookPath)) {
      this.writeHook(hookPath, desiredContent);
      return 'installed';
    }

    const existingContent = fs.readFileSync(hookPath, 'utf-8');

    if (existingContent === desiredContent) {
      return 'current';
    }

    if (this.isVersionUpHook(existingContent, hookName)) {
      this.writeHook(hookPath, desiredContent);
      return 'updated';
    }

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `${hookName} 已存在,是否覆盖?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      return 'skipped';
    }

    this.writeHook(hookPath, desiredContent);
    return 'overwritten';
  }

  /**
   * 删除旧版 version-up post-commit hook
   */
  removeLegacyManagedHook(hookName) {
    const hookPath = path.join(this.hooksDir, hookName);

    if (!fs.existsSync(hookPath)) {
      return 'missing';
    }

    const existingContent = fs.readFileSync(hookPath, 'utf-8');
    if (this.isDisabledLegacyHook(existingContent, hookName)) {
      return 'disabled';
    }

    if (!this.isVersionUpHook(existingContent, hookName)) {
      return 'external';
    }

    try {
      fs.unlinkSync(hookPath);
      return 'removed';
    } catch (error) {
      if (error.code === 'EPERM') {
        this.writeHook(hookPath, this.getDisabledLegacyHookContent(hookName));
        return 'neutralized';
      }
      throw error;
    }
  }

  /**
   * 迁移旧版 version-up hooks
   */
  migrateManagedHooks(options = {}) {
    const { silent = false } = options;

    if (!this.isGitRepo() || !fs.existsSync(this.hooksDir)) {
      return { changed: false, messages: [] };
    }

    const configLoader = new ConfigLoader(this.cwd);
    const config = configLoader.load();
    const messages = [];
    let changed = false;

    if (config.hooks.enabled !== false) {
      const preCommitPath = path.join(this.hooksDir, 'pre-commit');
      if (fs.existsSync(preCommitPath)) {
        const desiredContent = this.getTemplateContent('pre-commit', config);
        const existingContent = fs.readFileSync(preCommitPath, 'utf-8');

        if (this.isVersionUpHook(existingContent, 'pre-commit') && existingContent !== desiredContent) {
          this.writeHook(preCommitPath, desiredContent);
          changed = true;
          messages.push('已升级 pre-commit hook 到最新模板');
        }
      }
    }

    const legacyResult = this.removeLegacyManagedHook('post-commit');
    if (legacyResult === 'removed' || legacyResult === 'neutralized') {
      changed = true;
      messages.push(
        legacyResult === 'removed'
          ? '已移除旧版 post-commit hook'
          : '已失效化旧版 post-commit hook'
      );
    }

    if (!silent && changed) {
      console.log(chalk.yellow('\n⚠️  检测到旧版 version-up hooks,已自动完成迁移\n'));
      for (const message of messages) {
        console.log(chalk.cyan(`   • ${message}`));
      }
      console.log('');
    }

    return { changed, messages };
  }

  /**
   * 安装 Git Hooks
   */
  async install() {
    if (!this.isGitRepo()) {
      throw new Error('Not a git repository. Please run "git init" first.');
    }

    // 读取配置检查 hooks.enabled
    const configLoader = new ConfigLoader(this.cwd);
    const config = configLoader.load();

    if (config.hooks.enabled === false) {
      console.log(chalk.yellow('\n⚠️  Hooks 已在配置中禁用 (hooks.enabled: false)\n'));
      console.log(chalk.cyan('   💡 请修改 .versionrc 中的 hooks.enabled 为 true\n'));
      return;
    }

    console.log(chalk.cyan('\n🔧 安装/升级 Git Hooks (原生方式)...\n'));

    this.ensureHooksDir();
    const desiredPreCommit = this.getTemplateContent('pre-commit', config);
    const preCommitResult = await this.installManagedHook('pre-commit', desiredPreCommit);
    const legacyPostCommitResult = this.removeLegacyManagedHook('post-commit');

    if (preCommitResult === 'installed') {
      console.log(chalk.green('   ✅ 已安装 pre-commit\n'));
    } else if (preCommitResult === 'updated') {
      console.log(chalk.green('   ✅ 已升级 pre-commit 到最新模板\n'));
    } else if (preCommitResult === 'overwritten') {
      console.log(chalk.green('   ✅ 已覆盖并安装 pre-commit\n'));
    } else if (preCommitResult === 'current') {
      console.log(chalk.cyan('   ℹ️  pre-commit 已是最新版本\n'));
    } else {
      console.log(chalk.yellow('   ⏭️  跳过 pre-commit\n'));
    }

    if (legacyPostCommitResult === 'removed') {
      console.log(chalk.green('   ✅ 已移除旧版 post-commit\n'));
    } else if (legacyPostCommitResult === 'neutralized') {
      console.log(chalk.green('   ✅ 已停用旧版 post-commit\n'));
    } else if (legacyPostCommitResult === 'external') {
      console.log(chalk.cyan('   ℹ️  保留现有 post-commit (非 version-up 管理)\n'));
    }

    if (
      preCommitResult === 'skipped'
      && legacyPostCommitResult !== 'removed'
      && legacyPostCommitResult !== 'neutralized'
    ) {
      console.log(chalk.yellow('\n⚠️  没有安装任何新的 version-up hooks\n'));
      return;
    }

    console.log(chalk.green('\n✅ Git Hooks 已同步到当前策略!\n'));
    console.log(chalk.yellow('   💡 现在每次 commit 时会在 pre-commit 阶段自动递增版本号\n'));
  }



  /**
   * 卸载 Git Hooks
   */
  async uninstall() {
    console.log(chalk.cyan('\n🗑️  卸载 Git Hooks...\n'));

    const hooks = [...this.getManagedHooks(), ...this.getLegacyHooks()];
    const removedHooks = [];

    for (const hookName of hooks) {
      const hookPath = path.join(this.hooksDir, hookName);

      if (!fs.existsSync(hookPath)) {
        continue;
      }

      // 检查是否是 version-up 创建的 hook
      const content = fs.readFileSync(hookPath, 'utf-8');
      if (!this.isVersionUpHook(content, hookName) && !this.isDisabledLegacyHook(content, hookName)) {
        console.log(chalk.yellow(`   ⚠️  ${hookName} 不是 version-up 创建的,跳过删除\n`));
        continue;
      }

      // 删除 hook
      fs.unlinkSync(hookPath);
      console.log(chalk.green(`   ✅ 已删除 ${hookName}\n`));
      removedHooks.push(hookName);
    }

    if (removedHooks.length > 0) {
      console.log(chalk.green(`\n✅ Git Hooks 卸载完成! (${removedHooks.join(', ')})\n`));
    } else {
      console.log(chalk.cyan('\n   ℹ️  没有找到 version-up 创建的 hooks\n'));
    }
  }

  /**
   * 检查 Hooks 状态
   */
  status() {
    console.log(chalk.cyan('\n📋 Git Hooks 状态:\n'));

    const configLoader = new ConfigLoader(this.cwd);
    const config = configLoader.load();
    const expectedPreCommit = this.getTemplateContent('pre-commit', config);
    const preCommitPath = path.join(this.hooksDir, 'pre-commit');
    const postCommitPath = path.join(this.hooksDir, 'post-commit');
    let needsInstall = false;
    let needsMigration = false;

    if (fs.existsSync(preCommitPath)) {
      const content = fs.readFileSync(preCommitPath, 'utf-8');
      if (!this.isVersionUpHook(content, 'pre-commit')) {
        console.log(chalk.yellow('   ⚠️  pre-commit (非 version-up)'));
      } else if (content === expectedPreCommit) {
        console.log(chalk.green('   ✅ pre-commit (version-up, 最新)'));
      } else {
        console.log(chalk.yellow('   ⚠️  pre-commit (旧版 version-up, 可升级)'));
        needsMigration = true;
      }
    } else {
      console.log(chalk.red('   ❌ pre-commit (未安装)'));
      needsInstall = true;
    }

    if (fs.existsSync(postCommitPath)) {
      const content = fs.readFileSync(postCommitPath, 'utf-8');
      if (this.isDisabledLegacyHook(content, 'post-commit')) {
        console.log(chalk.gray('   ℹ️  post-commit (legacy hook 已停用)'));
      } else if (this.isVersionUpHook(content, 'post-commit')) {
        console.log(chalk.yellow('   ⚠️  post-commit (旧版 version-up, 建议移除)'));
        needsMigration = true;
      } else {
        console.log(chalk.cyan('   ℹ️  post-commit (非 version-up, 保留)'));
      }
    } else {
      console.log(chalk.gray('   ℹ️  post-commit (当前策略未使用)'));
    }

    console.log('');

    if (needsInstall || needsMigration) {
      console.log(chalk.yellow('   💡 请运行 version-up hooks install 安装或升级 hooks\n'));
      return;
    }

    console.log(chalk.green('   ✅ version-up hooks 已是当前版本\n'));
  }
}

export default HooksInstaller;
