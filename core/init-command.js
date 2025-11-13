#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ConfigLoader from './config-loader.js';
import VersionManager from './version-manager.js';
import HooksInstaller from './hooks-installer.js';
import CIGenerator from './ci-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Init 命令
 * 交互式初始化 version-up
 */
class InitCommand {
  constructor(cwd = process.cwd(), debug = false) {
    this.cwd = cwd;
    this.debug = debug;
    this.configLoader = new ConfigLoader(cwd);
    this.versionManager = new VersionManager(cwd);
    this.hooksInstaller = new HooksInstaller(cwd, debug);
    this.ciGenerator = new CIGenerator(cwd);
  }

  /**
   * 执行初始化
   */
  async run(options = {}) {
    console.log(chalk.bold.cyan('\n🚀 初始化 Version-UP\n'));

    try {
      // 1. 检查 Git 仓库
      await this.checkGitRepo();

      // 2. 创建版本文件
      await this.createVersionFile();

      // 3. 创建配置文件（包含 hooks 安装）
      await this.createConfigFile(options);

      // 4. 生成 CI 模板 (可选)
      if (!options.noCi) {
        await this.generateCI();
      }

      console.log(chalk.bold.green('\n✅ 初始化完成!\n'));
      console.log(chalk.yellow('💡 运行 "version-up patch" 开始版本管理\n'));
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

      // 创建 .gitignore
      await this.createGitignore();
    } else {
      throw new Error('version-up 需要 Git 仓库');
    }
  }

  /**
   * 创建 .gitignore 文件
   */
  async createGitignore() {
    const gitignorePath = path.join(this.cwd, '.gitignore');

    // 如果 .gitignore 已存在，跳过创建
    if (fs.existsSync(gitignorePath)) {
      if (this.debug) {
        console.log(chalk.yellow('⚠️  .gitignore 已存在,跳过创建\n'));
      }
      return;
    }

    try {
      // 读取模板文件
      const templatePath = path.join(__dirname, '..', 'templates', '.gitignore.template');
      const templateContent = fs.readFileSync(templatePath, 'utf-8');

      // 写入 .gitignore
      fs.writeFileSync(gitignorePath, templateContent, 'utf-8');
      console.log(chalk.green('✅ 已创建 .gitignore\n'));
    } catch (error) {
      if (this.debug) {
        console.error(chalk.yellow(`⚠️  创建 .gitignore 失败: ${error.message}\n`));
      }
      // 不中断流程，继续执行
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
  async createConfigFile(options = {}) {
    const configPath = path.join(this.cwd, '.versionrc');

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow('⚠️  .versionrc 已存在,跳过创建\n'));
      return;
    }

    const config = this.configLoader.getDefaultConfig();
    const packageJsonPath = path.join(this.cwd, 'package.json');

    // 1. 询问 Hooks 配置（包含版本同步）
    console.log(chalk.cyan('\n📝 配置 Git Hooks:\n'));

    const questions = [
      {
        type: 'confirm',
        name: 'enableHooks',
        message: '是否启用 Git Hooks 自动版本管理?',
        default: true,
      },
      {
        type: 'list',
        name: 'preCommitType',
        message: '每次 commit 时自动递增哪种版本?',
        choices: [
          { name: 'patch (0.0.1 → 0.0.2) - 推荐', value: 'patch' },
          { name: 'minor (0.0.1 → 0.1.0)', value: 'minor' },
          { name: 'major (0.0.1 → 1.0.0)', value: 'major' },
        ],
        default: 'patch',
        when: (answers) => answers.enableHooks,
      },
    ];

    // 如果检测到 package.json，添加同步询问
    if (fs.existsSync(packageJsonPath)) {
      questions.push({
        type: 'confirm',
        name: 'syncPackageJson',
        message: '检测到 package.json，是否同步版本?',
        default: true,
      });
    }

    const { enableHooks, preCommitType, syncPackageJson } = await inquirer.prompt(questions);

    config.hooks.enabled = enableHooks;
    if (preCommitType) config.hooks.preCommit = preCommitType;

    // 配置版本同步
    if (syncPackageJson) {
      config.syncTargets.push({
        file: 'package.json',
        path: 'version',
        adapter: 'package-json',
        required: true,
      });
    }

    this.configLoader.save(config, configPath);
    console.log(chalk.green('\n✅ 已创建 .versionrc\n'));

    // 如果启用 hooks 且没有 --no-hooks 参数，立即安装
    if (enableHooks && !options.noHooks) {
      await this.hooksInstaller.install();
    }
  }



  /**
   * 安装 Git Hooks
   */
  async installHooks() {
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
      console.log(chalk.yellow('⏭️  跳过 Git Hooks 安装\n'));
    }
  }

  /**
   * 生成 CI 模板
   */
  async generateCI() {
    const { generateCI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generateCI',
        message: '是否生成 GitHub Actions 工作流?',
        default: true,
      },
    ]);

    if (!generateCI) {
      console.log(chalk.yellow('⏭️  跳过 CI 配置\n'));
      return;
    }

    const { onPushType, workflowType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'onPushType',
        message: '每次 push 时自动递增哪种版本?',
        choices: [
          { name: 'patch (0.0.1 → 0.0.2)', value: 'patch' },
          { name: 'minor (0.0.1 → 0.1.0) - 推荐', value: 'minor' },
          { name: 'major (0.0.1 → 1.0.0)', value: 'major' },
        ],
        default: 'minor',
      },
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

    // 更新配置文件中的 ci.onPush
    const configPath = path.join(this.cwd, '.versionrc');
    const config = this.configLoader.load();
    config.ci = config.ci || {};
    config.ci.onPush = onPushType;
    this.configLoader.save(config, configPath);

    this.ciGenerator.generateGitHubActions(workflowType);
  }
}

export default InitCommand;

