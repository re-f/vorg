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
  }
};

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
    
    // 动态导入测试文件
    const testFile = path.join(__dirname, '../suite/orgFoldingProvider.test.js');
    
    if (!fs.existsSync(testFile)) {
      console.log('❌ 测试文件不存在，请先编译 TypeScript 代码');
      console.log('运行: npm run compile');
      process.exit(1);
    }
    
    require(testFile);
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