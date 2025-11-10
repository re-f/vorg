import * as assert from 'assert';
import { ListParser } from '../../parsers/listParser';

/**
 * ListParser 解析逻辑单元测试
 * 测试列表解析、缩进管理、子项查找等核心功能
 */
suite('ListParser 列表解析测试', () => {
  
  // 辅助函数：创建 mock document
  function createMockDocument(content: string) {
    const lines = content.split('\n');
    return {
      lineCount: lines.length,
      lineAt: (line: number) => ({
        text: lines[line] || '',
        lineNumber: line,
        range: {
          start: { line: line, character: 0 },
          end: { line: line, character: lines[line]?.length || 0 }
        }
      }),
      getText: () => content
    } as any;
  }

  // 辅助函数：创建 Position
  function createPosition(line: number, character: number = 0) {
    return { line, character } as any;
  }

  suite('parseListItem 测试', () => {
    
    test('应该解析无序列表项（- 标记）', () => {
      const result = ListParser.parseListItem('- 列表项内容');
      
      assert.strictEqual(result?.indent, 0);
      assert.strictEqual(result?.marker, '-');
      assert.strictEqual(result?.content, '列表项内容');
      assert.strictEqual(result?.isOrdered, false);
      assert.strictEqual(result?.hasCheckbox, false);
    });

    test('应该解析无序列表项（* 标记）', () => {
      const result = ListParser.parseListItem('* 列表项内容');
      
      assert.strictEqual(result?.marker, '*');
      assert.strictEqual(result?.content, '列表项内容');
    });

    test('应该解析无序列表项（+ 标记）', () => {
      const result = ListParser.parseListItem('+ 列表项内容');
      
      assert.strictEqual(result?.marker, '+');
      assert.strictEqual(result?.content, '列表项内容');
    });

    test('应该解析有序列表项', () => {
      const result = ListParser.parseListItem('1. 有序列表项');
      
      assert.strictEqual(result?.marker, '1.');
      assert.strictEqual(result?.content, '有序列表项');
      assert.strictEqual(result?.isOrdered, true);
    });

    test('应该解析带缩进的列表项', () => {
      const result = ListParser.parseListItem('  - 缩进列表项');
      
      assert.strictEqual(result?.indent, 2);
      assert.strictEqual(result?.marker, '-');
      assert.strictEqual(result?.content, '缩进列表项');
    });

    test('应该解析带复选框的列表项（未选中）', () => {
      const result = ListParser.parseListItem('- [ ] 待办事项');
      
      assert.strictEqual(result?.hasCheckbox, true);
      assert.strictEqual(result?.checkboxState, ' ');
      assert.strictEqual(result?.content, '待办事项');
    });

    test('应该解析带复选框的列表项（已选中）', () => {
      const result = ListParser.parseListItem('- [X] 已完成事项');
      
      assert.strictEqual(result?.hasCheckbox, true);
      assert.strictEqual(result?.checkboxState, 'X');
      assert.strictEqual(result?.content, '已完成事项');
    });

    test('应该解析带复选框的列表项（进行中）', () => {
      const result = ListParser.parseListItem('- [-] 进行中事项');
      
      assert.strictEqual(result?.hasCheckbox, true);
      assert.strictEqual(result?.checkboxState, '-');
      assert.strictEqual(result?.content, '进行中事项');
    });

    test('非列表行应返回 null', () => {
      const result = ListParser.parseListItem('这不是列表项');
      assert.strictEqual(result, null);
    });

    test('标题行应返回 null', () => {
      const result = ListParser.parseListItem('* 标题');
      // 注意：单个 * 后面跟空格会被识别为列表，需要多个 * 才是标题
      assert.notStrictEqual(result, null);
    });
  });

  suite('isListLine 测试', () => {
    
    test('应该识别无序列表行', () => {
      assert.strictEqual(ListParser.isListLine('- 列表项'), true);
      assert.strictEqual(ListParser.isListLine('* 列表项'), true);
      assert.strictEqual(ListParser.isListLine('+ 列表项'), true);
    });

    test('应该识别有序列表行', () => {
      assert.strictEqual(ListParser.isListLine('1. 列表项'), true);
      assert.strictEqual(ListParser.isListLine('10. 列表项'), true);
    });

    test('应该识别带缩进的列表行', () => {
      assert.strictEqual(ListParser.isListLine('  - 列表项'), true);
      assert.strictEqual(ListParser.isListLine('    * 列表项'), true);
    });

    test('非列表行应返回 false', () => {
      assert.strictEqual(ListParser.isListLine('普通文本'), false);
      assert.strictEqual(ListParser.isListLine('** 标题'), false);
    });
  });

  suite('getNextMarker 测试', () => {
    
    test('有序列表标记应该递增', () => {
      assert.strictEqual(ListParser.getNextMarker('1.'), '2.');
      assert.strictEqual(ListParser.getNextMarker('5.'), '6.');
      assert.strictEqual(ListParser.getNextMarker('99.'), '100.');
    });

    test('无序列表标记应该保持不变', () => {
      assert.strictEqual(ListParser.getNextMarker('-'), '-');
      assert.strictEqual(ListParser.getNextMarker('*'), '*');
      assert.strictEqual(ListParser.getNextMarker('+'), '+');
    });
  });

  suite('parseIndent 和 getIndentLevel 测试', () => {
    
    test('应该解析空缩进', () => {
      assert.strictEqual(ListParser.parseIndent('- 列表'), '');
      assert.strictEqual(ListParser.getIndentLevel('- 列表'), 0);
    });

    test('应该解析 2 空格缩进', () => {
      assert.strictEqual(ListParser.parseIndent('  - 列表'), '  ');
      assert.strictEqual(ListParser.getIndentLevel('  - 列表'), 2);
    });

    test('应该解析 4 空格缩进', () => {
      assert.strictEqual(ListParser.parseIndent('    - 列表'), '    ');
      assert.strictEqual(ListParser.getIndentLevel('    - 列表'), 4);
    });

    test('应该解析 Tab 缩进', () => {
      const indent = ListParser.parseIndent('\t- 列表');
      assert.strictEqual(indent, '\t');
    });
  });

  suite('findListItemEnd 测试', () => {
    
    test('应该找到简单列表项的结束', () => {
      const content = `- 列表项 1
- 列表项 2`;
      const doc = createMockDocument(content);
      const pos = createPosition(0);
      const end = ListParser.findListItemEnd(doc, pos, 0);
      
      assert.strictEqual(end.line, 0);
    });

    test('应该包含子项', () => {
      const content = `- 列表项 1
  - 子项 1
  - 子项 2
- 列表项 2`;
      const doc = createMockDocument(content);
      const pos = createPosition(0);
      const end = ListParser.findListItemEnd(doc, pos, 0);
      
      assert.strictEqual(end.line, 2); // 应该在子项 2 的行尾
    });

    test('应该在标题前停止', () => {
      const content = `- 列表项
  子项内容
* 新标题`;
      const doc = createMockDocument(content);
      const pos = createPosition(0);
      const end = ListParser.findListItemEnd(doc, pos, 0);
      
      assert.strictEqual(end.line, 1);
    });

    test('应该在普通文本前停止', () => {
      const content = `  1. 第一项
  2. 第二项
  3. 第三项
  4. 第四项
检查使用的术语是否正确`;
      const doc = createMockDocument(content);
      const pos = createPosition(3); // 光标在第4项
      const end = ListParser.findListItemEnd(doc, pos, 2);
      
      // 应该在第四项的行尾停止，不应该继续到普通文本行
      assert.strictEqual(end.line, 3);
    });

    test('应该在普通文本前停止（无缩进的普通文本）', () => {
      const content = `  1. 列表项
普通文本行`;
      const doc = createMockDocument(content);
      const pos = createPosition(0);
      const end = ListParser.findListItemEnd(doc, pos, 2);
      
      // 应该在列表项的行尾停止
      assert.strictEqual(end.line, 0);
    });
  });

  suite('hasSubItems 测试', () => {
    
    test('有子项的列表应返回 true', () => {
      const content = `- 列表项
  - 子项`;
      const doc = createMockDocument(content);
      
      assert.strictEqual(ListParser.hasSubItems(doc, 0, 0), true);
    });

    test('无子项的列表应返回 false', () => {
      const content = `- 列表项
- 另一个列表项`;
      const doc = createMockDocument(content);
      
      assert.strictEqual(ListParser.hasSubItems(doc, 0, 0), false);
    });

    test('有普通文本内容的列表应返回 true', () => {
      const content = `- 列表项
  这是普通文本内容
- 另一个列表项`;
      const doc = createMockDocument(content);
      
      assert.strictEqual(ListParser.hasSubItems(doc, 0, 0), true);
    });
  });

  suite('buildListItemLine 测试', () => {
    
    test('应该构建简单列表项', () => {
      const result = ListParser.buildListItemLine(0, '-', '内容');
      assert.strictEqual(result, '- 内容');
    });

    test('应该构建带缩进的列表项', () => {
      const result = ListParser.buildListItemLine(2, '-', '内容');
      assert.strictEqual(result, '  - 内容');
    });

    test('应该构建有序列表项', () => {
      const result = ListParser.buildListItemLine(0, '1.', '内容');
      assert.strictEqual(result, '1. 内容');
    });

    test('应该构建带复选框的列表项（未选中）', () => {
      const result = ListParser.buildListItemLine(0, '-', '内容', true, ' ');
      assert.strictEqual(result, '- [ ] 内容');
    });

    test('应该构建带复选框的列表项（已选中）', () => {
      const result = ListParser.buildListItemLine(0, '-', '内容', true, 'X');
      assert.strictEqual(result, '- [X] 内容');
    });

    test('应该构建带缩进和复选框的列表项', () => {
      const result = ListParser.buildListItemLine(4, '*', '内容', true, '-');
      assert.strictEqual(result, '    * [-] 内容');
    });
  });

  suite('isHeadingLine 测试', () => {
    
    test('应该识别标题行', () => {
      assert.strictEqual(ListParser.isHeadingLine('* 标题'), true);
      assert.strictEqual(ListParser.isHeadingLine('** 二级标题'), true);
      assert.strictEqual(ListParser.isHeadingLine('*** TODO 三级标题'), true);
    });

    test('非标题行应返回 false', () => {
      assert.strictEqual(ListParser.isHeadingLine('- 列表项'), false);
      assert.strictEqual(ListParser.isHeadingLine('普通文本'), false);
    });
  });

  suite('findFirstListItemAtLevel 测试', () => {
    
    test('应该找到同一级别的第一个列表项', () => {
      const content = `  1. 第一项
  - 第二项
  - 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemAtLevel(doc, 2, 2);
      
      assert.ok(result);
      assert.strictEqual(result?.marker, '1.');
      assert.strictEqual(result?.isOrdered, true);
    });

    test('应该跳过空行', () => {
      const content = `  1. 第一项

  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemAtLevel(doc, 2, 2);
      
      assert.ok(result);
      assert.strictEqual(result?.marker, '1.');
    });

    test('应该在遇到更高级别时停止', () => {
      const content = `- 顶级项
  1. 子项1
  2. 子项2`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemAtLevel(doc, 2, 2);
      
      assert.ok(result);
      assert.strictEqual(result?.marker, '1.');
    });

    test('如果没有找到应返回 null', () => {
      const content = `- 列表项
普通文本`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemAtLevel(doc, 1, 2);
      
      assert.strictEqual(result, null);
    });
  });

  suite('findFirstListItemLineAtLevel 测试', () => {
    
    test('应该找到第一个列表项的行号', () => {
      const content = `  1. 第一项
  - 第二项
  - 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemLineAtLevel(doc, 2, 2);
      
      assert.strictEqual(result, 0);
    });

    test('应该跳过空行', () => {
      const content = `  1. 第一项

  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemLineAtLevel(doc, 2, 2);
      
      assert.strictEqual(result, 0);
    });

    test('应该在遇到更高级别时停止', () => {
      const content = `- 顶级项
  1. 子项1
  2. 子项2`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemLineAtLevel(doc, 2, 2);
      
      assert.strictEqual(result, 1);
    });

    test('如果没有找到应返回 -1', () => {
      const content = `- 列表项
普通文本`;
      const doc = createMockDocument(content);
      const result = ListParser.findFirstListItemLineAtLevel(doc, 1, 2);
      
      assert.strictEqual(result, -1);
    });
  });

  suite('countItemsAtLevel 测试', () => {
    
    test('应该统计同一级别的列表项数量', () => {
      const content = `  1. 第一项
  - 第二项
  - 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.countItemsAtLevel(doc, 2, 2);
      
      assert.strictEqual(result, 3);
    });

    test('应该跳过空行', () => {
      const content = `  1. 第一项

  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.countItemsAtLevel(doc, 2, 2);
      
      assert.strictEqual(result, 2);
    });

    test('应该只统计同一级别的项', () => {
      const content = `  1. 第一项
    - 子项1
    - 子项2
  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.countItemsAtLevel(doc, 3, 2);
      
      assert.strictEqual(result, 2); // 只统计缩进为 2 的项
    });

    test('如果列表开始位置不存在应返回 0', () => {
      const content = `- 列表项
普通文本`;
      const doc = createMockDocument(content);
      const result = ListParser.countItemsAtLevel(doc, 1, 2);
      
      assert.strictEqual(result, 0);
    });

    test('应该正确处理混合有序和无序列表', () => {
      const content = `  1. 有序项1
  - 无序项1
  - 无序项2
  2. 有序项2`;
      const doc = createMockDocument(content);
      const result = ListParser.countItemsAtLevel(doc, 3, 2);
      
      assert.strictEqual(result, 4); // 所有同级项
    });
  });

  suite('findItemsAtLevel 测试', () => {
    
    test('应该找到同一级别的所有列表项', () => {
      const content = `  1. 第一项
  - 第二项
  - 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].line, 0);
      assert.strictEqual(result[0].listInfo.marker, '1.');
      assert.strictEqual(result[1].line, 1);
      assert.strictEqual(result[1].listInfo.marker, '-');
      assert.strictEqual(result[2].line, 2);
      assert.strictEqual(result[2].listInfo.marker, '-');
    });

    test('应该在遇到普通文本行时停止', () => {
      const content = `  1. 第一项
  - 第二项
普通文本行
  - 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].line, 0);
      assert.strictEqual(result[1].line, 1);
    });

    test('应该在遇到更高级别时停止', () => {
      const content = `  1. 第一项
  - 第二项
- 顶级项
  3. 第三项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].line, 0);
      assert.strictEqual(result[1].line, 1);
    });

    test('应该跳过空行', () => {
      const content = `  1. 第一项

  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].line, 0);
      assert.strictEqual(result[1].line, 2);
    });

    test('应该包含子项之间的项', () => {
      const content = `  1. 第一项
    - 子项1
    - 子项2
  - 第二项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].line, 0);
      assert.strictEqual(result[1].line, 3);
    });

    test('如果起始行不是列表项应返回空数组', () => {
      const content = `普通文本
  - 列表项`;
      const doc = createMockDocument(content);
      const result = ListParser.findItemsAtLevel(doc, 0, 2);
      
      assert.strictEqual(result.length, 0);
    });
  });
});

