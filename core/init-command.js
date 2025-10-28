#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ConfigLoader from './config-loader.js';
import VersionManager from './version-manager.js';
import HooksInstaller from './hooks-installer.js';
import CIGenerator from './ci-generator.js';

/**
 * Init 命令
 * 交互式初始化 version-up
 */
class InitCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.configLoader = new ConfigLoader(cwd);
    this.versionManager = new VersionManager(cwd);
    this.hooksInstaller = new HooksInstaller(cwd);
    this.ciGenerator = new CIGenerator(cwd);
  }

  /**
   * 执行初始化
   */
  async run(options = {}) {
    console.log(chalk.bold.cyan('\n🚀 初始化 version-up\n'));

    try {
      // 1. 检查 Git 仓库
      await this.checkGitRepo();

      // 2. 创建版本文件
      await this.createVersionFile();

      // 3. 创建配置文件
      await this.createConfigFile();

      // 4. 安装 Git Hooks (可选)
      if (!options.noHooks) {
        await this.installHooks();
      }

      // 5. 生成 CI 模板 (可选)
      if (!options.noCi) {
        await this.generateCI();
      }

      console.log(chalk.bold.green('\n✅ 初始化完成!\n'));
      console.log(chalk.gray('💡 运行 "version-up patch" 开始版本管理\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ 初始化失败: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * 检查 Git 仓库
   */
  async checkGitRepo() {
    const gitDir = path.join(this.cwd, '.git');

    if (fs.existsSync(gitDir)) {
      console.log(chalk.green('✅ 检测到 Git 仓库\n'));
      return;
    }

    // 询问是否初始化 Git
    const { initGit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'initGit',
        message: '未检测到 Git 仓库,是否初始化?',
        default: true,
      },
    ]);

    if (initGit) {
      execSync('git init', { cwd: this.cwd, stdio: 'inherit' });
      console.log(chalk.green('✅ Git 仓库初始化成功\n'));
    } else {
      throw new Error('version-up 需要 Git 仓库');
    }
  }

  /**
   * 创建版本文件
   */
  async createVersionFile() {
    const versionFilePath = path.join(this.cwd, 'version.json');

    if (fs.existsSync(versionFilePath)) {
      console.log(chalk.yellow('⚠️  version.json 已存在,跳过创建\n'));
      return;
    }

    this.versionManager.create('0.0.0');
    console.log(chalk.green('✅ 已创建 version.json (v0.0.0)\n'));
  }

  /**
   * 创建配置文件
   */
  async createConfigFile() {
    const configPath = path.join(this.cwd, '.versionrc');

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow('⚠️  .versionrc 已存在,跳过创建\n'));
      return;
    }

    // 智能检测 package.json
    const config = this.configLoader.getDefaultConfig();
    const packageJsonPath = path.join(this.cwd, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const { syncPackageJson } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'syncPackageJson',
          message: '检测到 package.json,是否同步版本?',
          default: true,
        },
      ]);

      if (syncPackageJson) {
        config.syncTargets.push({
          file: 'package.json',
          path: 'version',
          adapter: 'package-json',
          required: true,
        });
      }
    }

    this.configLoader.save(config, configPath);
    console.log(chalk.green('✅ 已创建 .versionrc\n'));
  }

  /**
   * 检测包管理器
   */
  detectPackageManager() {
    if (fs.existsSync(path.join(this.cwd, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(this.cwd, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(this.cwd, 'package-lock.json'))) {
      return 'npm';
    }
    return null;
  }

  /**
   * 询问包管理器
   */
  async askPackageManager() {
    const detected = this.detectPackageManager();

    if (detected) {
      console.log(chalk.gray(`   检测到 ${detected},将使用 ${detected} 安装\n`));
      return detected;
    }

    const { pm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'pm',
        message: '选择包管理器:',
        choices: [
          { name: 'pnpm (推荐)', value: 'pnpm' },
          { name: 'npm', value: 'npm' },
          { name: 'yarn', value: 'yarn' },
        ],
        default: 'pnpm',
      },
    ]);

    return pm;
  }

  /**
   * 安装 Git Hooks
   */
  async installHooks() {
    // 检测是否有 Husky
    const hasHusky = this.hooksInstaller.hasHusky();
    const hasPackageJson = fs.existsSync(path.join(this.cwd, 'package.json'));

    // 如果没有 Husky 且有 package.json,询问是否安装
    if (!hasHusky && hasPackageJson) {
      const { installHusky } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installHusky',
          message: '检测到未安装 Husky,是否安装? (推荐,便于团队共享 hooks)',
          default: true,
        },
      ]);

      if (installHusky) {
        console.log(chalk.cyan('\n📦 安装 Husky...\n'));

        // 询问包管理器
        const pm = await this.askPackageManager();

        try {
          execSync(`${pm} install husky --save-dev`, {
            cwd: this.cwd,
            stdio: 'inherit',
          });
          execSync(`${pm === 'npm' ? 'npx' : pm} husky init`, {
            cwd: this.cwd,
            stdio: 'inherit',
          });
          console.log(chalk.green('\n✅ Husky 安装成功!\n'));
        } catch (error) {
          console.log(chalk.yellow('\n⚠️  Husky 安装失败,将使用原生 Git Hooks\n'));
        }
      }
    }

    // 询问是否安装 Git Hooks
    const { installHooks } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installHooks',
        message: '是否安装 Git Hooks 以自动管理版本?',
        default: true,
      },
    ]);

    if (installHooks) {
      await this.hooksInstaller.install();
    } else {
      console.log(chalk.gray('⏭️  跳过 Git Hooks 安装\n'));
    }
  }

  /**
   * 生成 CI 模板
   */
  async generateCI() {
    if (!this.ciGenerator.isGitHubRepo()) {
      console.log(chalk.gray('ℹ️  未检测到 GitHub 仓库,跳过 CI 配置\n'));
      return;
    }

    const { generateCI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generateCI',
        message: '检测到 GitHub 仓库,是否生成 GitHub Actions 工作流?',
        default: true,
      },
    ]);

    if (!generateCI) {
      console.log(chalk.gray('⏭️  跳过 CI 配置\n'));
      return;
    }

    const { workflowType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'workflowType',
        message: '选择工作流类型:',
        choices: [
          { name: '分离工作流 (推荐)', value: 'separated' },
          { name: '单一工作流', value: 'single' },
        ],
        default: 'separated',
      },
    ]);

    this.ciGenerator.generateGitHubActions(workflowType);
  }
}

export default InitCommand;

