#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Git Hooks 安装器
 * 支持 Husky 和原生 Git Hooks
 */
class HooksInstaller {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.gitDir = path.join(cwd, '.git');
    this.huskyDir = path.join(cwd, '.husky');
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  /**
   * 检测是否在 Git 仓库中
   */
  isGitRepo() {
    return fs.existsSync(this.gitDir);
  }

  /**
   * 检测是否使用 Husky
   */
  hasHusky() {
    return fs.existsSync(this.huskyDir);
  }

  /**
   * 安装 Git Hooks
   */
  async install() {
    if (!this.isGitRepo()) {
      throw new Error('Not a git repository. Please run "git init" first.');
    }

    const useHusky = this.hasHusky();

    console.log(chalk.cyan('\n🔧 安装 Git Hooks...'));

    if (useHusky) {
      console.log(chalk.gray('   检测到 Husky,使用 Husky 模式'));
      console.log(chalk.gray('   Hooks 将写入 .husky/ 目录 (可提交到 Git)\n'));
      await this.installHuskyHooks();
    } else {
      console.log(chalk.gray('   使用原生 Git Hooks'));
      console.log(chalk.yellow('   ⚠️  Hooks 将写入 .git/hooks/ (不会提交到 Git)'));
      console.log(chalk.gray('   💡 建议安装 Husky 以便团队共享 hooks\n'));
      await this.installNativeHooks();
    }

    console.log(chalk.green('✅ Git Hooks 安装成功!\n'));
  }

  /**
   * 安装 Husky Hooks
   */
  async installHuskyHooks() {
    await this.installHook('pre-commit', this.huskyDir);
    await this.installHook('pre-push', this.huskyDir);
  }

  /**
   * 安装原生 Git Hooks
   */
  async installNativeHooks() {
    const hooksDir = path.join(this.gitDir, 'hooks');

    // 确保 hooks 目录存在
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    await this.installHook('pre-commit', hooksDir);
    await this.installHook('pre-push', hooksDir);
  }

  /**
   * 安装单个 Hook
   */
  async installHook(hookName, targetDir) {
    const templatePath = path.join(this.templatesDir, `${hookName}.template`);
    const targetPath = path.join(targetDir, hookName);

    // 检查模板是否存在
    if (!fs.existsSync(templatePath)) {
      console.log(chalk.yellow(`   ⚠️  模板不存在: ${hookName}.template`));
      return;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // 检查是否已存在 hook
    if (fs.existsSync(targetPath)) {
      const existingContent = fs.readFileSync(targetPath, 'utf-8');

      // 如果已包含 version-up,跳过
      if (existingContent.includes('version-up')) {
        console.log(chalk.gray(`   ℹ️  ${hookName} 已安装,跳过`));
        return;
      }

      // 询问用户是否追加
      const { append } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'append',
          message: `${hookName} 已存在,是否追加 version-up 逻辑?`,
          default: true,
        },
      ]);

      if (append) {
        // 追加到现有 hook
        const newContent = existingContent + '\n\n' + templateContent;
        fs.writeFileSync(targetPath, newContent, { mode: 0o755 });
        console.log(chalk.green(`   ✅ ${hookName} (已追加)`));
      } else {
        console.log(chalk.gray(`   ⏭️  ${hookName} (跳过)`));
      }
      return;
    }

    // 复制模板
    fs.writeFileSync(targetPath, templateContent, { mode: 0o755 });
    console.log(chalk.green(`   ✅ ${hookName}`));
  }

  /**
   * 卸载 Git Hooks
   */
  uninstall() {
    console.log(chalk.cyan('\n🗑️  卸载 Git Hooks...'));

    const useHusky = this.hasHusky();
    const hooksDir = useHusky ? this.huskyDir : path.join(this.gitDir, 'hooks');

    this.removeHook('pre-commit', hooksDir);
    this.removeHook('pre-push', hooksDir);

    console.log(chalk.green('✅ Git Hooks 卸载成功!\n'));
  }

  /**
   * 删除单个 Hook
   */
  removeHook(hookName, targetDir) {
    const targetPath = path.join(targetDir, hookName);

    if (!fs.existsSync(targetPath)) {
      console.log(chalk.gray(`   ℹ️  ${hookName} 不存在,跳过`));
      return;
    }

    // 检查是否是 version-up 创建的 hook
    const content = fs.readFileSync(targetPath, 'utf-8');
    if (!content.includes('version-up')) {
      console.log(chalk.yellow(`   ⚠️  ${hookName} 不是 version-up 创建的,跳过删除`));
      return;
    }

    fs.unlinkSync(targetPath);
    console.log(chalk.green(`   ✅ ${hookName} 已删除`));
  }

  /**
   * 检查 Hooks 状态
   */
  status() {
    console.log(chalk.cyan('\n📋 Git Hooks 状态:\n'));

    const useHusky = this.hasHusky();
    const hooksDir = useHusky ? this.huskyDir : path.join(this.gitDir, 'hooks');

    console.log(chalk.gray(`   模式: ${useHusky ? 'Husky' : '原生 Git Hooks'}`));
    console.log(chalk.gray(`   目录: ${hooksDir}\n`));

    this.checkHook('pre-commit', hooksDir);
    this.checkHook('pre-push', hooksDir);

    console.log();
  }

  /**
   * 检查单个 Hook 状态
   */
  checkHook(hookName, targetDir) {
    const targetPath = path.join(targetDir, hookName);

    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf-8');
      const isVersionUp = content.includes('version-up');
      
      if (isVersionUp) {
        console.log(chalk.green(`   ✅ ${hookName} (已安装)`));
      } else {
        console.log(chalk.yellow(`   ⚠️  ${hookName} (存在但非 version-up)`));
      }
    } else {
      console.log(chalk.gray(`   ❌ ${hookName} (未安装)`));
    }
  }
}

export default HooksInstaller;

