# VOrg 测试指南

## 测试策略

VOrg 的测试分为两类：

### 1. 单元测试 (Unit Tests) ✅

**测试内容**：Org-mode 格式解析的核心逻辑

- ✅ 上下文识别（标题、列表、表格、代码块等）
- ✅ 标题解析（级别、TODO 状态、标题内容）
- ✅ 文档结构分析（子树查找、父子关系）
- ⏳ 列表解析（缩进、嵌套、复选框）
- ⏳ 表格解析（单元格、行列）

**不测试内容**：
- ❌ VS Code 命令的注册和执行
- ❌ 编辑器操作（插入、删除、替换）
- ❌ 用户交互和输入
- ❌ 折叠/展开等 VS Code API

**运行方式**：
```bash
# 运行所有单元测试
pnpm run test:unit

# 或使用脚本
./src/test/unit/run-unit-tests.sh
```

### 3. VOrgQL 真实数据调试工具 (Real Data Debugger) ✅

**测试内容**：直接针对真实的 Org 文件目录运行 VOrgQL 查询，分析索引和分组结果。

**运行方式**：
```bash
npx ts-node -T src/test/unit/debug_vorgql_real.ts \
  --dir "/path/to/your/org/files" \
  --file "query.vorgql" \
  --todo "TODO NEXT | DONE CANCELLED"
```

**功能亮点**：
- **真实环境复现**：自动扫描指定目录下的所有 `.org` 文件。
- **自定义关键字**：支持通过 `--todo` 参数传入与本地配置一致的 TODO 关键字。
- **差异分析**：自动对比数据库索引全量标签与查询结果标签，定位丢失的数据。
- **Unicode 支持验证**：可直接验证中文标签和特殊符号标签的索引情况。

## 当前测试状态

### ✅ 已完成的单元测试

#### Parser 测试（100% 覆盖）

| Parser | 测试文件 | 测试用例 | 状态 |
|--------|---------|---------|------|
| ContextAnalyzer | `contextAnalyzer.test.ts` | 58 | ✅ |
| HeadingParser | `headingParser.test.ts` | 60+ | ✅ |
| ListParser | `listParser.test.ts` | 40+ | ✅ |
| PropertyParser | `propertyParser.test.ts` | 30+ | ✅ |
| TableParser | `tableParser.test.ts` | 25+ | ✅ |
| LinkParser | `linkParser.test.ts` | 35+ | ✅ |

**总计**: 240 个测试用例，100% 通过率 ✅

#### 测试详情

1. **contextAnalyzer.test.ts**
   - 覆盖所有上下文类型的识别
   - 包含边界情况和异常处理

2. **headingParser.test.ts**
   - 标题解析（级别、TODO 状态、标题内容）
   - 标题构建和更新
   - 子树查找和结构分析

3. **listParser.test.ts**
   - 列表项解析（无序、有序、复选框）
   - 列表嵌套和缩进
   - 列表项查找和构建

4. **propertyParser.test.ts**
   - Property 抽屉解析
   - 属性查找和修改
   - ID 生成和查找

5. **tableParser.test.ts**
   - 表格行解析
   - 单元格导航
   - 表格构建

6. **linkParser.test.ts**
   - 方括号链接解析
   - HTTP/文件链接解析
   - 链接目标解析

## 测试文件结构

```
src/test/
├── unit/                          # 单元测试（纯 Node.js 环境）
│   ├── README.md                  # 单元测试说明
│   ├── contextAnalyzer.test.ts    # ✅ 上下文识别测试
│   ├── headingParser.test.ts      # ⏳ 标题解析测试（依赖 TodoKeywordManager）
│   ├── listParser.test.ts         # ✅ 列表解析测试
│   ├── propertyParser.test.ts     # ✅ Property 解析测试
│   ├── tableParser.test.ts        # ✅ 表格解析测试
│   ├── linkParser.test.ts         # ✅ 链接解析测试
│   ├── listRenumber.test.ts       # ✅ 列表重新编号测试
│   ├── listSplit.test.ts          # ✅ 列表分割测试
│   ├── orgCompletionProvider.test.ts        # ⏳ 自动补全测试（依赖 vscode）
│   ├── orgCompletionProviderContent.test.ts # ⏳ 自动补全内容测试（依赖 vscode）
│   ├── orgHeadlineParser.test.ts  # ⏳ 标题解析测试（依赖 vscode）
│   └── run-unit-tests.sh          # 测试运行脚本
├── suite/                         # 集成测试套件（VS Code 环境）
│   ├── orgFoldingProvider.test.ts
│   └── ...
└── runTest.ts                     # 集成测试运行器
```

**架构说明**：
- **✅ 可运行的单元测试**：不依赖 VS Code API，可在纯 Node.js 环境下运行
- **⏳ 待迁移的测试**：当前依赖 VS Code API 或 TodoKeywordManager，需要 VS Code 集成测试环境运行
- **Parser 层重构**：`HeadingParser` 已重构为可接受可选参数，移除了对 TodoKeywordManager 的硬依赖
- **无需 Mock**：解析器层现在完全独立于 VS Code API，单元测试不再需要 vscode-mock

## 编写新测试

### 单元测试模板

```typescript
import * as assert from 'assert';
import { YourClass } from '../../path/to/class';

suite('YourClass 测试套件', () => {
  
  // Mock 辅助函数
  function createMockDocument(content: string) {
    const lines = content.split('\n');
    return {
      lineCount: lines.length,
      lineAt: (line: number) => ({
        text: lines[line] || '',
        lineNumber: line
      })
    } as any;
  }

  suite('功能组1', () => {
    test('应该正确处理场景A', () => {
      const input = 'test input';
      const result = YourClass.parseMethod(input);
      
      assert.strictEqual(result.property, 'expected');
    });

    test('应该处理边界情况', () => {
      const result = YourClass.parseMethod('');
      assert.strictEqual(result, null);
    });
  });

  suite('功能组2', () => {
    // 更多测试...
  });
});
```

### 测试原则

1. **专注于逻辑，不测试交互**
   - ✅ 测试：正则匹配、文本解析、结构分析
   - ❌ 不测试：用户输入、编辑器操作、命令执行

2. **每个测试独立**
   - 不依赖其他测试的状态
   - 使用独立的 mock 数据

3. **覆盖边界情况**
   - 空输入、极限值
   - 特殊字符、中文内容
   - 嵌套和复杂结构

4. **清晰的测试名称**
   - 使用"应该..."格式
   - 明确说明测试内容

## 运行测试的不同方式

### 1. 快速运行（推荐）

```bash
# 只运行单元测试，快速验证解析逻辑
pnpm run test:unit
```

### 2. 完整测试

```bash
# 运行包括集成测试的所有测试
pnpm run test
```

### 3. 开发时持续测试

```bash
# 监听文件变化，自动编译
pnpm run watch

# 在另一个终端运行测试
pnpm run test:unit
```

## 测试覆盖率目标

- [x] ContextAnalyzer: **95%+**
- [x] HeadingCommands 解析: **90%+**
- [ ] ListCommands 解析: 目标 90%
- [ ] TableCommands 解析: 目标 90%
- [ ] TodoKeywordManager: 目标 85%
- [ ] PropertyCommands 解析: 目标 85%

## 下一步计划

1. ✅ 完成 ContextAnalyzer 测试
2. ✅ 完成 HeadingCommands 解析测试
3. ⏳ 实现 ListCommands 的解析方法并完成测试
4. ⏳ 实现 TableCommands 的解析方法并完成测试
5. ⏳ 添加 TodoKeywordManager 测试
6. ⏳ 添加 Property 解析测试

## 贡献指南

如果你要添加新功能：

1. **先写测试**：采用 TDD（测试驱动开发）方法
2. **确保解析逻辑可测试**：将解析逻辑提取为纯函数/静态方法
3. **运行现有测试**：确保没有破坏现有功能
4. **更新测试文档**：记录新增的测试内容

---

**最后更新**: 2025-10-25

