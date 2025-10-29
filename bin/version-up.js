#!/usr/bin/env node

import chalk from 'chalk';
import VersionManager from '../core/version-manager.js';
import ConfigLoader from '../core/config-loader.js';
import FileSync from '../core/file-sync.js';
import HooksInstaller from '../core/hooks-installer.js';
import CIGenerator from '../core/ci-generator.js';
import InitCommand from '../core/init-command.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * version-up CLI
 */
class CLI {
  constructor() {
    this.cwd = process.cwd();
    this.versionManager = null;
    this.configLoader = null;
    this.fileSync = null;
    this.config = null;
    // 检测调试模式
    this.debug = process.argv.includes('--debug') || process.argv.includes('--verbose');
  }

  /**
   * 初始化
   */
  init() {
    this.configLoader = new ConfigLoader(this.cwd);
    this.config = this.configLoader.load();
    this.versionManager = new VersionManager(this.cwd, this.config.versionFile);
    this.fileSync = new FileSync(this.cwd);
  }

  /**
   * 运行 CLI
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      // init 命令不需要初始化
      if (command === 'init') {
        await this.handleInit(args);
        return;
      }

      // hooks 和 ci 命令不需要版本文件
      if (command === 'hooks' || command === 'ci') {
        await this.handleSpecialCommands(command, args);
        return;
      }

      // 其他命令需要初始化
      this.init();

      switch (command) {
        case 'patch':
          await this.handlePatch(args);
          break;
        case 'minor':
          await this.handleMinor(args);
          break;
        case 'major':
          await this.handleMajor(args);
          break;
        case 'set':
          await this.handleSet(args[1], args);
          break;
        case 'show':
          await this.handleShow(args);
          break;
        case 'sync':
          await this.handleSync();
          break;
        case 'refresh':
          await this.handleRefresh();
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        case 'version':
        case '--version':
        case '-v':
          this.showVersion();
          break;
        default:
          console.log(chalk.red(`\n❌ 未知命令: ${command}\n`));
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
      process.exit(1);
    }
  }

  /**
   * 处理 init 命令
   */
  async handleInit(args) {
    const options = {
      noHooks: args.includes('--no-hooks'),
      noCi: args.includes('--no-ci'),
    };

    const initCommand = new InitCommand(this.cwd, this.debug);
    await initCommand.run(options);
  }

  /**
   * 处理特殊命令 (hooks, ci)
   */
  async handleSpecialCommands(command, args) {
    if (command === 'hooks') {
      const hooksInstaller = new HooksInstaller(this.cwd, this.debug);
      const subCommand = args[1];

      if (subCommand === 'install') {
        await hooksInstaller.install();
      } else if (subCommand === 'uninstall') {
        hooksInstaller.uninstall();
      } else if (subCommand === 'status') {
        hooksInstaller.status();
      } else {
        console.log(chalk.red('\n❌ 用法: version-up hooks <install|uninstall|status>\n'));
        process.exit(1);
      }
      return;
    }

    if (command === 'ci') {
      const ciGenerator = new CIGenerator(this.cwd);
      const subCommand = args[1];

      if (subCommand === 'generate') {
        const type = args[2] || 'separated';
        ciGenerator.generateGitHubActions(type);
      } else if (subCommand === 'template') {
        ciGenerator.printTemplate('github');
      } else if (subCommand === 'remove') {
        ciGenerator.remove();
      } else {
        console.log(chalk.red('\n❌ 用法: version-up ci <generate|template|remove>\n'));
        process.exit(1);
      }
      return;
    }
  }

  /**
   * 处理 patch 命令
   */
  async handlePatch(args) {
    const skipGitInfo = args.includes('--skip-git-info');
    const result = this.versionManager.patch(skipGitInfo);
    console.log(chalk.green(`\n✅ 版本已更新: ${result.old} → ${result.new}\n`));
    await this.syncFiles(result.new);
  }

  /**
   * 处理 minor 命令
   */
  async handleMinor(args) {
    const skipGitInfo = args.includes('--skip-git-info');
    const result = this.versionManager.minor(skipGitInfo);
    console.log(chalk.green(`\n✅ 版本已更新: ${result.old} → ${result.new}\n`));
    await this.syncFiles(result.new);
  }

  /**
   * 处理 major 命令
   */
  async handleMajor(args) {
    const skipGitInfo = args.includes('--skip-git-info');
    const result = this.versionManager.major(skipGitInfo);
    console.log(chalk.green(`\n✅ 版本已更新: ${result.old} → ${result.new}\n`));
    await this.syncFiles(result.new);
  }

  /**
   * 处理 set 命令
   */
  async handleSet(version, args) {
    if (!version) {
      console.log(chalk.red('\n❌ 用法: version-up set <version>\n'));
      process.exit(1);
    }

    const skipGitInfo = args.includes('--skip-git-info');
    const result = this.versionManager.set(version, skipGitInfo);
    console.log(chalk.green(`\n✅ 版本已设置: ${result.old} → ${result.new}\n`));
    await this.syncFiles(result.new);
  }

  /**
   * 处理 refresh 命令
   */
  async handleRefresh() {
    const result = this.versionManager.refresh();
    console.log(chalk.green(`\n✅ Git 信息已更新\n`));
    console.log(chalk.cyan(`   Git Commit: ${result.gitCommit}`));
    console.log(chalk.cyan(`   Git Branch: ${result.gitBranch}\n`));
  }

  /**
   * 处理 show 命令
   */
  async handleShow(args) {
    const data = this.versionManager.show();
    const format = this.getArgValue(args, '--format') || 'full';

    if (format === 'version') {
      console.log(data.version);
    } else if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.cyan('\n📦 当前版本信息:\n'));
      console.log(chalk.bold.white(`   版本: ${data.version}`));
      console.log(chalk.cyan(`   构建时间 (UTC): ${data.buildTime}`));
      console.log(chalk.cyan(`   Git Commit: ${data.gitCommit}`));
      console.log(chalk.cyan(`   Git Branch: ${data.gitBranch}`));
      console.log(chalk.cyan(`   环境: ${data.environment}\n`));
    }
  }

  /**
   * 处理 sync 命令
   */
  async handleSync() {
    const data = this.versionManager.show();
    await this.syncFiles(data.version);
  }

  /**
   * 同步版本到其他文件
   */
  async syncFiles(version) {
    if (!this.config.syncTargets || this.config.syncTargets.length === 0) {
      return;
    }

    const results = this.fileSync.syncAll(version, this.config.syncTargets);
    this.fileSync.printResults(results);
  }

  /**
   * 获取参数值
   * 支持两种格式: --flag=value 或 --flag value
   */
  getArgValue(args, flag) {
    // 方式 1: --flag=value
    const withEquals = args.find(arg => arg.startsWith(`${flag}=`));
    if (withEquals) {
      return withEquals.split('=')[1];
    }

    // 方式 2: --flag value
    const index = args.indexOf(flag);
    if (index === -1 || index === args.length - 1) {
      return null;
    }
    return args[index + 1];
  }

  /**
   * 显示帮助
   */
  showHelp() {
    console.log(chalk.bold.cyan('\n📚 version-up - 轻量级版本管理工具\n'));
    console.log(chalk.bold('用法:'));
    console.log('  version-up <command> [options]\n');
    console.log(chalk.bold('命令:'));
    console.log('  init                 初始化 Version-UP');
    console.log('  patch                patch 版本 +1');
    console.log('  minor                minor 版本 +1');
    console.log('  major                major 版本 +1');
    console.log('  set <version>        设置指定版本');
    console.log('  show                 显示当前版本');
    console.log('  refresh              刷新 Git 信息 (不改变版本号)');
    console.log('  sync                 手动同步版本到其他文件');
    console.log('  hooks <sub>          管理 Git Hooks (install|uninstall|status)');
    console.log('  ci <sub>             管理 CI 模板 (generate|template|remove)');
    console.log('  help                 显示帮助信息');
    console.log('  version              显示版本号\n');
    console.log(chalk.bold('选项:'));
    console.log('  --no-hooks           跳过 Git Hooks 安装 (init)');
    console.log('  --no-ci              跳过 CI 配置 (init)');
    console.log('  --skip-git-info      跳过 Git 信息获取 (patch|minor|major|set)');
    console.log('  --format=<type>      输出格式 (show): version|json|full');
    console.log('  --debug, --verbose   显示详细调试信息\n');
    console.log(chalk.bold('示例:'));
    console.log('  version-up init');
    console.log('  version-up patch');
    console.log('  version-up set 1.0.0');
    console.log('  version-up show --format=version');
    console.log('  version-up hooks install\n');
  }

  /**
   * 显示版本号
   */
  showVersion() {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    console.log(chalk.cyan(`\nversion-up v${pkg.version}\n`));
  }
}

// 运行 CLI
const cli = new CLI();
cli.run().catch((error) => {
  console.error(chalk.red(`\n❌ 未知错误: ${error.message}\n`));
  process.exit(1);
});

