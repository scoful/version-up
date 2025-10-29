#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CI 模板生成器
 * 支持 GitHub Actions
 */
class CIGenerator {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.githubDir = path.join(cwd, '.github', 'workflows');
    this.templatesDir = path.join(__dirname, '..', 'templates', 'github-actions');
  }

  /**
   * 检测是否是 GitHub 仓库
   */
  isGitHubRepo() {
    try {
      const gitConfig = path.join(this.cwd, '.git', 'config');
      if (!fs.existsSync(gitConfig)) {
        return false;
      }

      const content = fs.readFileSync(gitConfig, 'utf-8');
      return content.includes('github.com');
    } catch {
      return false;
    }
  }

  /**
   * 生成 GitHub Actions 工作流
   */
  generateGitHubActions(workflowType = 'separated') {
    console.log(chalk.cyan('\n📝 生成 GitHub Actions 工作流...\n'));

    // 确保目录存在
    if (!fs.existsSync(this.githubDir)) {
      fs.mkdirSync(this.githubDir, { recursive: true });
      console.log(chalk.cyan(`   创建目录: .github/workflows`));
    }

    if (workflowType === 'single') {
      this.generateSingleWorkflow();
    } else {
      this.generateSeparatedWorkflows();
    }

    console.log(chalk.green('\n✅ GitHub Actions 工作流生成成功!\n'));
  }

  /**
   * 生成单一工作流
   */
  generateSingleWorkflow() {
    const targetPath = path.join(this.githubDir, 'version-and-deploy.yml');

    if (fs.existsSync(targetPath)) {
      console.log(chalk.yellow(`   ⚠️  version-and-deploy.yml 已存在,跳过`));
      return;
    }

    // 合并两个模板
    const versionBump = fs.readFileSync(
      path.join(this.templatesDir, 'version-bump.yml'),
      'utf-8'
    );
    const buildDeploy = fs.readFileSync(
      path.join(this.templatesDir, 'build-deploy.yml'),
      'utf-8'
    );

    // 简单合并 (实际应该更智能地合并)
    const merged = versionBump + '\n\n' + buildDeploy;
    fs.writeFileSync(targetPath, merged, 'utf-8');

    console.log(chalk.green(`   ✅ version-and-deploy.yml`));
  }

  /**
   * 生成分离工作流 (推荐)
   */
  generateSeparatedWorkflows() {
    this.copyWorkflow('version-bump.yml');
    this.copyWorkflow('build-deploy.yml');
  }

  /**
   * 复制工作流模板
   */
  copyWorkflow(filename) {
    const sourcePath = path.join(this.templatesDir, filename);
    const targetPath = path.join(this.githubDir, filename);

    if (fs.existsSync(targetPath)) {
      console.log(chalk.yellow(`   ⚠️  ${filename} 已存在,跳过`));
      return;
    }

    const content = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(targetPath, content, 'utf-8');

    console.log(chalk.green(`   ✅ ${filename}`));
  }

  /**
   * 输出模板内容 (不写入文件)
   */
  printTemplate(provider = 'github') {
    if (provider !== 'github') {
      console.log(chalk.yellow(`⚠️  暂不支持 ${provider}`));
      return;
    }

    console.log(chalk.cyan('\n📄 GitHub Actions 模板:\n'));
    console.log(chalk.gray('='.repeat(60)));

    const versionBump = fs.readFileSync(
      path.join(this.templatesDir, 'version-bump.yml'),
      'utf-8'
    );
    const buildDeploy = fs.readFileSync(
      path.join(this.templatesDir, 'build-deploy.yml'),
      'utf-8'
    );

    console.log(chalk.bold('\n📝 version-bump.yml:\n'));
    console.log(versionBump);

    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.bold('\n📝 build-deploy.yml:\n'));
    console.log(buildDeploy);

    console.log(chalk.gray('='.repeat(60)));
  }

  /**
   * 删除生成的工作流
   */
  remove() {
    console.log(chalk.cyan('\n🗑️  删除 GitHub Actions 工作流...\n'));

    this.removeWorkflow('version-bump.yml');
    this.removeWorkflow('build-deploy.yml');
    this.removeWorkflow('version-and-deploy.yml');

    console.log(chalk.green('\n✅ 工作流删除成功!\n'));
  }

  /**
   * 删除单个工作流
   */
  removeWorkflow(filename) {
    const targetPath = path.join(this.githubDir, filename);

    if (!fs.existsSync(targetPath)) {
      console.log(chalk.gray(`   ℹ️  ${filename} 不存在,跳过`));
      return;
    }

    fs.unlinkSync(targetPath);
    console.log(chalk.green(`   ✅ ${filename} 已删除`));
  }
}

export default CIGenerator;

