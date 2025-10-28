#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * 配置加载器
 * 负责加载和验证 .versionrc 配置文件
 */
class ConfigLoader {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.configPath = null;
    this.config = null;
  }

  /**
   * 查找配置文件
   * 支持 .versionrc 和 .versionrc.json
   */
  findConfigFile() {
    const possiblePaths = [
      path.join(this.cwd, '.versionrc'),
      path.join(this.cwd, '.versionrc.json'),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * 加载配置文件
   * @returns {Object} 配置对象
   */
  load() {
    this.configPath = this.findConfigFile();

    if (!this.configPath) {
      // 返回默认配置
      return this.getDefaultConfig();
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      return this.mergeWithDefaults(this.config);
    } catch (error) {
      throw new Error(`Failed to load config file: ${error.message}`);
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      versionFile: 'version.json',
      syncTargets: [],
      hooks: {
        enabled: false,
        preCommit: 'patch',
        prePush: 'check',
      },
      git: {
        commitMessage: 'chore: bump version to {{version}} [skip ci]',
        tagFormat: 'v{{version}}',
        autoTag: false,
      },
      ci: {
        provider: 'none',
        onPush: 'minor',
      },
      strictMode: false,
    };
  }

  /**
   * 合并用户配置和默认配置
   */
  mergeWithDefaults(userConfig) {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...userConfig,
      hooks: { ...defaults.hooks, ...userConfig.hooks },
      git: { ...defaults.git, ...userConfig.git },
      ci: { ...defaults.ci, ...userConfig.ci },
    };
  }

  /**
   * 验证配置
   */
  validate(config) {
    // 验证 versionFile
    if (!config.versionFile || typeof config.versionFile !== 'string') {
      throw new Error('Invalid config: versionFile must be a string');
    }

    // 验证 syncTargets
    if (!Array.isArray(config.syncTargets)) {
      throw new Error('Invalid config: syncTargets must be an array');
    }

    // 验证每个 syncTarget
    for (const target of config.syncTargets) {
      if (!target.file || !target.path || !target.adapter) {
        throw new Error('Invalid syncTarget: must have file, path, and adapter');
      }
    }

    return true;
  }

  /**
   * 保存配置文件
   */
  save(config, filePath = null) {
    const targetPath = filePath || this.configPath || path.join(this.cwd, '.versionrc');
    
    try {
      fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
      return targetPath;
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }
}

export default ConfigLoader;

