#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// 简单的测试框架实现
class SimpleTestFramework {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private setupFn: (() => void) | null = null;
  private teardownFn: (() => void) | null = null;
  private currentSuite = '';
  
  suite(name: string, fn: () => void) {
    this.currentSuite = name;
    console.log(`\n📋 ${name}`);
    fn();
  }
  
  setup(fn: () => void) {
    this.setupFn = fn;
  }
  
  teardown(fn: () => void) {
    this.teardownFn = fn;
  }
  
  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    let passed = 0;
    let failed = 0;
    
    console.log('🚀 开始运行单元测试\n');
    
    for (const test of this.tests) {
      try {
        if (this.setupFn) {
          this.setupFn();
        }
        
        await test.fn();
        
        if (this.teardownFn) {
          this.teardownFn();
        }
        
        console.log(`✅ ${test.name}`);
        passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }
    
    console.log(`\n📊 测试结果:`);
    console.log(`   ✅ 通过: ${passed}`);
    console.log(`   ❌ 失败: ${failed}`);
    console.log(`   📈 总计: ${passed + failed}`);
    
    if (failed > 0) {
      process.exit(1);
    }
  }
}

// 简单的断言库
const assert = {
  ok(value: any, message?: string) {
    if (!value) {
      throw new Error(message || `Expected ${value} to be truthy`);
    }
  },
  
  strictEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${actual} to equal ${expected}`);
    }
  },
  
  deepStrictEqual(actual: any, expected: any, message?: string) {
    if (!deepEqual(actual, expected)) {
      throw new Error(message || `Expected ${JSON.stringify(actual)} to deep equal ${JSON.stringify(expected)}`);
    }
  }
};

// 深度比较函数
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

// 全局设置
const framework = new SimpleTestFramework();
(global as any).suite = framework.suite.bind(framework);
(global as any).test = framework.test.bind(framework);
(global as any).setup = framework.setup.bind(framework);
(global as any).teardown = framework.teardown.bind(framework);
(global as any).assert = assert;

// 运行测试
async function runTests() {
  try {
    // 设置Mock模块
    const mockVscode = require('./vscode-mock');
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    // 拦截require('vscode')调用
    Module.prototype.require = function(id: string) {
      if (id === 'vscode') {
        return mockVscode;
      }
      return originalRequire.apply(this, arguments);
    };
    
    // 动态导入所有测试文件
    const testFiles = [
      // 已有的测试
      path.join(__dirname, '../suite/orgFoldingProvider.test.js'),
      path.join(__dirname, 'orgHeadlineParser.test.js'),
      
      // 解析器测试（✅ 已实现）
      path.join(__dirname, 'contextAnalyzer.test.js'),
      path.join(__dirname, 'headingParser.test.js'),
      path.join(__dirname, 'listParser.test.js'),
      path.join(__dirname, 'propertyParser.test.js'),
      path.join(__dirname, 'tableParser.test.js'),
      path.join(__dirname, 'linkParser.test.js'),
      
      // 工具函数测试
      path.join(__dirname, 'listRenumber.test.js'),
      
      // 自动补全提供器测试
      path.join(__dirname, 'orgCompletionProvider.test.js'),
      path.join(__dirname, 'orgCompletionProviderContent.test.js')
    ];
    
    for (const testFile of testFiles) {
      if (fs.existsSync(testFile)) {
        console.log(`📁 加载测试文件: ${path.basename(testFile)}`);
        require(testFile);
      } else {
        console.log(`⚠️  跳过不存在的测试文件: ${path.basename(testFile)}`);
      }
    }
    await framework.run();
    
    // 恢复原始require
    Module.prototype.require = originalRequire;
    
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  }
}

// 如果是直接运行此文件
if (require.main === module) {
  runTests();
}

export { runTests }; 