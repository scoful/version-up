#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * 版本管理器
 * 负责版本的 CRUD 操作
 */
class VersionManager {
  constructor(cwd = process.cwd(), versionFile = 'version.json') {
    this.cwd = cwd;
    this.versionFilePath = path.join(cwd, versionFile);
    this.versionData = null;
  }

  /**
   * 读取版本文件
   */
  read() {
    if (!fs.existsSync(this.versionFilePath)) {
      throw new Error(`Version file not found: ${this.versionFilePath}`);
    }

    try {
      const content = fs.readFileSync(this.versionFilePath, 'utf-8');
      this.versionData = this.normalizeVersionData(JSON.parse(content));
      return this.versionData;
    } catch (error) {
      throw new Error(`Failed to read version file: ${error.message}`);
    }
  }

  /**
   * 写入版本文件
   */
  write(data) {
    try {
      const normalized = this.normalizeVersionData(data);
      const content = JSON.stringify(normalized, null, 2);
      fs.writeFileSync(this.versionFilePath, content, 'utf-8');
      this.versionData = normalized;
      return normalized;
    } catch (error) {
      throw new Error(`Failed to write version file: ${error.message}`);
    }
  }

  /**
   * 规范化版本文件结构
   * 兼容旧版 version.json，并在写入时收敛为稳定字段
   */
  normalizeVersionData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid version file content');
    }

    if (!data.version || typeof data.version !== 'string') {
      throw new Error('Invalid version file: missing version');
    }

    return {
      version: data.version,
      buildTime: data.buildTime ?? null,
      environment: data.environment ?? (process.env.NODE_ENV || 'development'),
    };
  }

  /**
   * 创建初始版本文件
   */
  create(initialVersion = '0.0.0') {
    if (fs.existsSync(this.versionFilePath)) {
      throw new Error(`Version file already exists: ${this.versionFilePath}`);
    }

    const versionData = this.buildVersionData(initialVersion);
    return this.write(versionData);
  }

  /**
   * 构建版本数据对象
   */
  buildVersionData(version, _skipGitInfo = false) {
    return {
      version,
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * 获取当前 Git 运行时信息
   */
  getGitInfo() {
    return {
      gitCommit: this.getGitCommit(),
      gitBranch: this.getGitBranch(),
    };
  }

  /**
   * 获取 Git commit hash
   */
  getGitCommit() {
    try {
      return execSync('git rev-parse --short HEAD', {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      })
        .toString()
        .trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取 Git branch
   */
  getGitBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      })
        .toString()
        .trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 解析版本字符串
   */
  parseVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
  }

  /**
   * Patch 版本 +1
   */
  patch(skipGitInfo = false) {
    const current = this.read();
    const { major, minor, patch } = this.parseVersion(current.version);
    const newVersion = `${major}.${minor}.${patch + 1}`;
    return this.set(newVersion, skipGitInfo);
  }

  /**
   * Minor 版本 +1
   */
  minor(skipGitInfo = false) {
    const current = this.read();
    const { major, minor } = this.parseVersion(current.version);
    const newVersion = `${major}.${minor + 1}.0`;
    return this.set(newVersion, skipGitInfo);
  }

  /**
   * Major 版本 +1
   */
  major(skipGitInfo = false) {
    const current = this.read();
    const { major } = this.parseVersion(current.version);
    const newVersion = `${major + 1}.0.0`;
    return this.set(newVersion, skipGitInfo);
  }

  /**
   * 设置指定版本
   */
  set(version, skipGitInfo = false) {
    // 验证版本格式
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    const current = this.read();
    const newData = this.buildVersionData(version, skipGitInfo);

    this.write(newData);

    return {
      old: current.version,
      new: newData.version,
      data: newData,
    };
  }

  /**
   * 刷新 Git 信息 (不改变版本号)
   */
  refresh() {
    const current = this.read();
    return {
      ...current,
      ...this.getGitInfo(),
    };
  }

  /**
   * 显示当前版本
   */
  show() {
    const data = this.read();
    return {
      ...data,
      ...this.getGitInfo(),
    };
  }

  /**
   * 验证版本格式 (Semantic Versioning)
   */
  isValidVersion(version) {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(version);
  }

  /**
   * 比较两个版本
   * @returns {number} -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
   */
  compareVersions(v1, v2) {
    const [major1, minor1, patch1] = v1.split('.').map(Number);
    const [major2, minor2, patch2] = v2.split('.').map(Number);

    if (major1 !== major2) return major1 > major2 ? 1 : -1;
    if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1;
    if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1;
    return 0;
  }
}

export default VersionManager;
