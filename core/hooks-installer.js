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
      console.log(chalk.cyan('   💡 请修改 .versionrc.json 中的 hooks.enabled 为 true\n'));
      return;
    }

    console.log(chalk.cyan('\n🔧 安装 Git Hooks (原生方式)...\n'));

    this.ensureHooksDir();

    const hooks = ['pre-commit', 'post-commit'];
    const installedHooks = [];

    for (const hookName of hooks) {
      const templatePath = path.join(this.templatesDir, `${hookName}.template`);
      const hookPath = path.join(this.hooksDir, hookName);

      // 检查模板是否存在
      if (!fs.existsSync(templatePath)) {
        console.log(chalk.yellow(`   ⚠️  模板不存在: ${hookName}.template\n`));
        continue;
      }

      // 检查 hook 是否已存在
      if (fs.existsSync(hookPath)) {
        const existingContent = fs.readFileSync(hookPath, 'utf-8');

        // 如果已包含 version-up,跳过
        if (existingContent.includes('version-up')) {
          console.log(chalk.cyan(`   ℹ️  ${hookName} 已存在且包含 version-up,跳过\n`));
          installedHooks.push(hookName);
          continue;
        }

        // 询问用户是否覆盖
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `${hookName} 已存在,是否覆盖?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.yellow(`   ⏭️  跳过 ${hookName}\n`));
          continue;
        }
      }

      // 复制模板并设置可执行权限
      let templateContent = fs.readFileSync(templatePath, 'utf-8');

      // 替换占位符 (pre-commit hook)
      if (hookName === 'pre-commit') {
        const bumpType = config.hooks.preCommit || 'patch';
        templateContent = templateContent.replace(/\{\{BUMP_TYPE\}\}/g, bumpType);
      }

      fs.writeFileSync(hookPath, templateContent, { mode: 0o755 });
      console.log(chalk.green(`   ✅ 已安装 ${hookName}\n`));
      installedHooks.push(hookName);
    }

    if (installedHooks.length > 0) {
      console.log(chalk.green(`\n✅ Git Hooks 安装完成! (${installedHooks.join(', ')})\n`));
      console.log(chalk.yellow('   💡 现在每次 commit 时会自动递增版本号\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  没有安装任何 hooks\n'));
    }
  }



  /**
   * 卸载 Git Hooks
   */
  async uninstall() {
    console.log(chalk.cyan('\n🗑️  卸载 Git Hooks...\n'));

    const hooks = ['pre-commit', 'post-commit'];
    const removedHooks = [];

    for (const hookName of hooks) {
      const hookPath = path.join(this.hooksDir, hookName);

      if (!fs.existsSync(hookPath)) {
        continue;
      }

      // 检查是否是 version-up 创建的 hook
      const content = fs.readFileSync(hookPath, 'utf-8');
      if (!content.includes('version-up')) {
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

    const hooks = ['pre-commit', 'post-commit'];
    const installedHooks = [];
    const missingHooks = [];

    for (const hookName of hooks) {
      const hookPath = path.join(this.hooksDir, hookName);

      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf-8');
        const isVersionUp = content.includes('version-up');

        if (isVersionUp) {
          console.log(chalk.green(`   ✅ ${hookName} (version-up)`));
          installedHooks.push(hookName);
        } else {
          console.log(chalk.yellow(`   ⚠️  ${hookName} (非 version-up)`));
        }
      } else {
        console.log(chalk.red(`   ❌ ${hookName} (未安装)`));
        missingHooks.push(hookName);
      }
    }

    console.log('');

    if (installedHooks.length === hooks.length) {
      console.log(chalk.green('   ✅ 所有 hooks 已安装并激活\n'));
    } else if (missingHooks.length > 0) {
      console.log(chalk.yellow(`   💡 请运行 version-up hooks install 安装 hooks\n`));
    }
  }
}

export default HooksInstaller;

