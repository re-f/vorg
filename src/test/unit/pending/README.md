# 待实现的测试

这个目录包含已经编写但等待实现对应功能的测试文件。

## 文件列表

### listParser.test.ts
列表解析测试，需要在 `ListCommands` 类中实现以下静态方法：

```typescript
// 解析列表项
static parseListItem(line: string): {
  indent: number;
  marker: string;
  content: string;
  hasCheckbox: boolean;
  checkboxState?: string;
} | null;

// 查找列表的结束位置
static findListEnd(document: vscode.TextDocument, position: vscode.Position): number;

// 查找父列表项
static findParentListItem(document: vscode.TextDocument, position: vscode.Position): {
  lineNumber: number;
  indent: number;
} | null;

// 查找子列表项
static findChildListItems(document: vscode.TextDocument, position: vscode.Position): number[];

// 计算列表缩进
static calculateListIndent(baseIndent: number): number;

// 判断列表项是否为空
static isListItemEmpty(line: string): boolean;
```

### tableParser.test.ts
表格解析测试，需要在 `TableCommands` 类中实现以下静态方法：

```typescript
// 判断是否为表格行
static isTableRow(line: string): boolean;

// 解析表格单元格
static parseTableCells(line: string): string[];

// 查找当前单元格索引
static findCurrentCell(line: string, character: number): number;

// 查找下一个单元格位置
static findNextCell(line: string, currentCell: number): { character: number } | null;

// 查找上一个单元格位置
static findPreviousCell(line: string, currentCell: number): { character: number } | null;

// 查找表格边界
static findTableBounds(document: vscode.TextDocument, position: vscode.Position): {
  start: number;
  end: number;
} | null;
```

## 如何启用这些测试

1. 实现上述方法
2. 将测试文件移回 `src/test/unit/` 目录
3. 在 `unitTestRunner.ts` 中取消注释对应的测试文件
4. 运行 `pnpm run test:unit`

## 实现建议

这些方法应该是**纯函数**或**静态方法**，专注于解析逻辑：

- ✅ 输入：字符串或文档对象
- ✅ 输出：解析结果对象
- ❌ 不依赖：VS Code 编辑器状态
- ❌ 不执行：编辑操作

这样的设计使得测试简单可靠，也更容易维护和重构。

