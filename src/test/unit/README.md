# Org-mode 解析单元测试

## 测试文件说明

这个目录包含针对 Org-mode 核心解析逻辑的单元测试。

### 已创建的测试文件

1. **contextAnalyzer.test.ts** - ✅ 可运行
   - 测试 `ContextAnalyzer.analyzeContext()` 方法
   - 测试各种 Org 元素的识别（标题、列表、表格、代码块等）
   - 测试 `isInCodeBlock()` 和 `isInPropertyDrawer()` 方法

2. **headingParser.test.ts** - ✅ 可运行
   - 测试 `HeadingCommands.parseHeadingLine()` 方法
   - 测试 `HeadingCommands.findSubtreeEnd()` 方法
   - 测试 `HeadingCommands.findCurrentHeading()` 方法
   - 测试 `HeadingCommands.findNextHeadingLine()` 方法

3. **listParser.test.ts** - ⚠️ 需要实现解析方法
   - 测试列表项解析逻辑
   - **注意**: 这些测试假设 `ListCommands` 有以下静态方法需要实现：
     - `parseListItem(line: string)`
     - `findListEnd(doc, pos)`
     - `findParentListItem(doc, pos)`
     - `findChildListItems(doc, pos)`
     - `calculateListIndent(baseIndent)`
     - `isListItemEmpty(line)`

4. **tableParser.test.ts** - ⚠️ 需要实现解析方法
   - 测试表格解析逻辑
   - **注意**: 这些测试假设 `TableCommands` 有以下静态方法需要实现：
     - `isTableRow(line: string)`
     - `parseTableCells(line: string)`
     - `findCurrentCell(line, character)`
     - `findNextCell(line, currentCell)`
     - `findPreviousCell(line, currentCell)`
     - `findTableBounds(doc, pos)`

## 运行测试

### 运行所有单元测试

```bash
pnpm run test:unit
```

### 只运行特定测试

编辑 `unitTestRunner.ts`，注释掉不需要运行的测试文件。

## 测试策略

### ✅ 应该测试的内容（纯解析逻辑）

- **正则表达式匹配**：标题、列表、表格、代码块等的识别
- **文档结构分析**：子树查找、父子关系、边界检测
- **状态解析**：TODO 状态、复选框状态
- **文本解析**：提取内容、缩进级别、标记符号

### ❌ 不应该测试的内容（VS Code 交互）

- 命令注册和执行
- 编辑器操作（insert、delete、replace）
- 光标移动和选择
- 用户输入和交互
- 折叠/展开等 VS Code API 调用

## 添加新测试

1. 在 `src/test/unit/` 目录创建新的测试文件
2. 使用相同的测试框架结构（suite、test、assert）
3. 创建必要的 mock 函数（createMockDocument、createPosition）
4. 在 `unitTestRunner.ts` 中注册新的测试文件
5. 确保测试的方法是存在的静态方法

## Mock 辅助函数

所有测试文件都使用相同的 mock 辅助函数：

```typescript
// 创建 mock document
function createMockDocument(content: string) {
  const lines = content.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
      range: { ... }
    }),
    getText: () => content
  } as any;
}

// 创建 Position
function createPosition(line: number, character: number = 0) {
  return { line, character } as any;
}
```

## 测试覆盖率目标

- ✅ ContextAnalyzer: 95%+
- ✅ HeadingCommands 解析方法: 90%+
- ⏳ ListCommands 解析方法: 待实现
- ⏳ TableCommands 解析方法: 待实现
- ⏳ TodoKeywordManager: 待测试

## 注意事项

1. 测试使用简化的 mock 对象，不依赖真实的 VS Code API
2. 测试关注**输入输出**，不关注内部实现
3. 每个测试应该独立，不依赖其他测试的状态
4. 使用描述性的测试名称，清楚说明测试内容
5. 包含边界情况和异常情况的测试

