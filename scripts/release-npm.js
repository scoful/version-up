#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import chalk from 'chalk';

const OFFICIAL_REGISTRY = 'https://registry.npmjs.org/';
const [mode = 'publish', ...extraArgs] = process.argv.slice(2);

function getNpmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    path.resolve(process.execPath, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(process.execPath, '..', '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(candidate => candidate && candidate.toLowerCase().endsWith('.js'));

  const npmCliPath = candidates.find(candidate => fs.existsSync(candidate));
  if (!npmCliPath) {
    throw new Error('无法定位 npm-cli.js，请确认 Node.js 自带 npm 已正确安装');
  }

  return npmCliPath;
}

function runNpm(args, options = {}) {
  const { stdio = 'inherit', check = true } = options;
  const result = spawnSync(process.execPath, [getNpmCliPath(), ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      npm_config_registry: OFFICIAL_REGISTRY,
    },
    stdio,
  });

  if (result.error) {
    throw result.error;
  }

  if (check && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

if (mode === 'help' || mode === '--help' || mode === '-h') {
  console.log(chalk.cyan('\n用法:\n'));
  console.log('  node scripts/release-npm.js login');
  console.log('  node scripts/release-npm.js publish [npm publish 的附加参数]\n');
  console.log(chalk.cyan('示例:\n'));
  console.log('  node scripts/release-npm.js login');
  console.log('  node scripts/release-npm.js publish --dry-run');
  console.log('  node scripts/release-npm.js publish --tag next\n');
  process.exit(0);
}

if (mode !== 'login' && mode !== 'publish') {
  console.error(chalk.red(`\n❌ 不支持的命令: ${mode}\n`));
  process.exit(1);
}

console.log(chalk.cyan('\n📦 npm 官方源发布脚本\n'));
console.log(chalk.gray(`   registry: ${OFFICIAL_REGISTRY}`));
console.log(chalk.gray('   不会修改当前默认的 npm 镜像配置\n'));

if (mode === 'login') {
  console.log(chalk.cyan('🔐 启动 npm 官方源登录...\n'));
  console.log(chalk.gray('如果浏览器、OTP、指纹或安全密钥弹出，请按提示完成。\n'));
  runNpm(['login', '--registry', OFFICIAL_REGISTRY]);
  console.log(chalk.green('\n✅ npm 官方源登录流程已结束\n'));
  process.exit(0);
}

const isDryRun = extraArgs.includes('--dry-run');

if (!isDryRun) {
  const whoami = runNpm(['whoami', '--registry', OFFICIAL_REGISTRY], {
    stdio: 'pipe',
    check: false,
  });

  let username = whoami.stdout?.toString().trim();

  if (whoami.status !== 0 || !username) {
    console.log(chalk.yellow('⚠️  未检测到 npm 官方源登录态，开始交互式登录...\n'));
    console.log(chalk.gray('如果浏览器、OTP、指纹或安全密钥弹出，请按提示完成。\n'));
    runNpm(['login', '--registry', OFFICIAL_REGISTRY]);

    const loginCheck = runNpm(['whoami', '--registry', OFFICIAL_REGISTRY], {
      stdio: 'pipe',
      check: false,
    });

    username = loginCheck.stdout?.toString().trim();
    if (loginCheck.status !== 0 || !username) {
      console.error(chalk.red('\n❌ 登录后仍未检测到 npm 官方源身份，请手动执行 npm run release:login\n'));
      process.exit(loginCheck.status ?? 1);
    }
  }

  console.log(chalk.green(`✅ 当前 npm 官方账号: ${username}\n`));
} else {
  console.log(chalk.gray('ℹ️  dry-run 模式跳过登录检查\n'));
}

const publishArgs = ['publish', '--registry', OFFICIAL_REGISTRY, '--access', 'public', ...extraArgs];

console.log(chalk.cyan(`🚀 执行: npm ${publishArgs.join(' ')}\n`));
console.log(chalk.gray('如果账号启用了 write 级 2FA，发布过程中仍需手动确认。\n'));
runNpm(publishArgs);
console.log(chalk.green('\n✅ 发布流程已完成\n'));
