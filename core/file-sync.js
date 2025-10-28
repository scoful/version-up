#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import toml from '@iarna/toml';

/**
 * 文件同步器
 * 负责将版本同步到其他文件 (package.json, pyproject.toml, Cargo.toml 等)
 */
class FileSync {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.adapters = {
      'package-json': this.syncPackageJson.bind(this),
      'pyproject-toml': this.syncPyprojectToml.bind(this),
      'cargo-toml': this.syncCargoToml.bind(this),
    };
  }

  /**
   * 同步版本到所有配置的目标文件
   */
  syncAll(version, syncTargets) {
    const results = [];

    for (const target of syncTargets) {
      try {
        const result = this.syncOne(version, target);
        results.push({ ...result, success: true });
      } catch (error) {
        if (target.required) {
          // 必需文件同步失败,抛出错误
          throw error;
        } else {
          // 可选文件同步失败,记录警告
          results.push({
            file: target.file,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * 同步版本到单个文件
   */
  syncOne(version, target) {
    const { file, adapter } = target;
    const filePath = path.join(this.cwd, file);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${file}`);
    }

    // 检查 adapter 是否支持
    if (!this.adapters[adapter]) {
      throw new Error(`Unsupported adapter: ${adapter}`);
    }

    // 调用对应的 adapter
    this.adapters[adapter](filePath, version, target);

    return { file, adapter };
  }

  /**
   * Adapter: package.json
   */
  syncPackageJson(filePath, version, target) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 更新版本
    this.setNestedValue(data, target.path, version);

    // 写回文件 (保持格式)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  /**
   * Adapter: pyproject.toml
   */
  syncPyprojectToml(filePath, version, target) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = toml.parse(content);

    // 更新版本
    this.setNestedValue(data, target.path, version);

    // 写回文件
    fs.writeFileSync(filePath, toml.stringify(data), 'utf-8');
  }

  /**
   * Adapter: Cargo.toml
   */
  syncCargoToml(filePath, version, target) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = toml.parse(content);

    // 更新版本
    this.setNestedValue(data, target.path, version);

    // 写回文件
    fs.writeFileSync(filePath, toml.stringify(data), 'utf-8');
  }

  /**
   * 设置嵌套对象的值
   * 例如: setNestedValue(obj, 'tool.poetry.version', '1.0.0')
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取嵌套对象的值
   */
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || !current[key]) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 打印同步结果
   */
  printResults(results) {
    console.log(chalk.cyan('\n🔄 同步版本到其他文件...'));

    let hasError = false;

    for (const result of results) {
      if (result.success) {
        console.log(chalk.green(`   ✅ ${result.file}`));
      } else {
        console.log(chalk.yellow(`   ⚠️  ${result.file} (${result.error})`));
        hasError = true;
      }
    }

    if (hasError) {
      console.log(chalk.yellow('\n⚠️  部分文件同步失败 (查看上方详情)'));
    }
  }
}

export default FileSync;

