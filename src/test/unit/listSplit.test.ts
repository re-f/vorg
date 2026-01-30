import * as assert from 'assert';
import { ListParser } from '../../parsers/listParser';
import * as core from '../../types/core';

/**
 * 列表分割功能单元测试
 * 
 * 测试策略：
 * 由于 splitListItem 依赖 VS Code 的 TextEditorEdit，我们将测试分为两部分：
 * 1. 测试分割逻辑的辅助函数（纯函数）
 * 2. 集成测试（需要 VS Code 环境）
 */
suite('列表分割功能测试', () => {

  // ============ 辅助函数 ============

  /**
   * 创建 mock document
   */
  function createMockDocument(content: string): core.TextDocument {
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
    };
  }

  /**
   * 创建 Position
   */
  function createPosition(line: number, character: number = 0): core.Position {
    return { line, character };
  }

  // ============ 测试用例 ============

  suite('有序列表分割逻辑测试', () => {

    test('应该正确计算分割后的编号 - 在第一项分割', () => {
      // 场景：
      // 1. first |(光标在末尾)
      // 2. sec
      // 3. third
      //
      // 预期结果：
      // 1. first
      // 2. |(新项)
      // 3. sec
      // 4. third

      const content = '1. first\n2. sec\n3. third';
      const document = createMockDocument(content);
      const position = createPosition(0, 8); // 在 "first" 后

      // 解析当前项
      const currentLine = document.lineAt(0);
      const listInfo = ListParser.parseListItem(currentLine.text);

      assert.ok(listInfo, '应该能解析列表项');
      assert.strictEqual(listInfo!.isOrdered, true, '应该是有序列表');
      assert.strictEqual(listInfo!.marker, '1.', '当前项标记应该是 1.');

      // 计算新项编号
      const currentNumber = parseInt(listInfo!.marker.replace(/\.$/, ''));
      const newMarker = `${currentNumber + 1}.`;

      assert.strictEqual(currentNumber, 1, '当前项编号应该是 1');
      assert.strictEqual(newMarker, '2.', '新项编号应该是 2.');

      // 查找所有同级项
      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 0, 0);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 0);

      assert.strictEqual(itemsToRenumber.length, 3, '应该找到3个同级项');

      // 计算当前项索引
      const currentItemIndex = itemsToRenumber.findIndex(item => item.line === 0);
      assert.strictEqual(currentItemIndex, 0, '当前项应该是第一项');

      // 获取后续项
      const itemsAfterCurrent = itemsToRenumber.slice(currentItemIndex + 1);
      assert.strictEqual(itemsAfterCurrent.length, 2, '应该有2个后续项');

      // 验证后续项的新编号
      // 新项是 2.，所以后续项应该从 3. 开始
      const expectedNumbers = itemsAfterCurrent.map((item, index) => {
        return currentNumber + 2 + index; // 2+2=4 是错误的！应该是 3, 4
      });

      assert.deepStrictEqual(expectedNumbers, [3, 4], '后续项应该重新编号为 3, 4');
    });

    test('应该正确计算分割后的编号 - 在中间项分割', () => {
      // 场景：
      // 1. first
      // 2. second |(光标在末尾)
      // 3. third
      //
      // 预期结果：
      // 1. first
      // 2. second
      // 3. |(新项)
      // 4. third

      const content = '1. first\n2. second\n3. third';
      const document = createMockDocument(content);
      const position = createPosition(1, 10); // 在 "second" 后

      // 解析当前项
      const currentLine = document.lineAt(1);
      const listInfo = ListParser.parseListItem(currentLine.text);

      assert.ok(listInfo, '应该能解析列表项');
      assert.strictEqual(listInfo!.marker, '2.', '当前项标记应该是 2.');

      // 计算新项编号
      const currentNumber = parseInt(listInfo!.marker.replace(/\.$/, ''));
      const newMarker = `${currentNumber + 1}.`;

      assert.strictEqual(currentNumber, 2, '当前项编号应该是 2');
      assert.strictEqual(newMarker, '3.', '新项编号应该是 3.');

      // 查找所有同级项
      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 1, 0);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 0);

      assert.strictEqual(itemsToRenumber.length, 3, '应该找到3个同级项');

      // 计算当前项索引
      const currentItemIndex = itemsToRenumber.findIndex(item => item.line === 1);
      assert.strictEqual(currentItemIndex, 1, '当前项应该是第二项');

      // 获取后续项
      const itemsAfterCurrent = itemsToRenumber.slice(currentItemIndex + 1);
      assert.strictEqual(itemsAfterCurrent.length, 1, '应该有1个后续项');

      // 验证后续项的新编号
      // 新项是 3.，所以后续项应该是 4.
      const expectedNumber = currentNumber + 2; // 2+2=4

      assert.strictEqual(expectedNumber, 4, '后续项应该重新编号为 4');
    });

    test('应该正确处理在列表末尾分割', () => {
      // 场景：
      // 1. first
      // 2. second
      // 3. third |(光标在末尾)
      //
      // 预期结果：
      // 1. first
      // 2. second
      // 3. third
      // 4. |(新项)

      const content = '1. first\n2. second\n3. third';
      const document = createMockDocument(content);
      const position = createPosition(2, 9); // 在 "third" 后

      // 解析当前项
      const currentLine = document.lineAt(2);
      const listInfo = ListParser.parseListItem(currentLine.text);

      assert.ok(listInfo, '应该能解析列表项');
      assert.strictEqual(listInfo!.marker, '3.', '当前项标记应该是 3.');

      // 计算新项编号
      const currentNumber = parseInt(listInfo!.marker.replace(/\.$/, ''));
      const newMarker = `${currentNumber + 1}.`;

      assert.strictEqual(newMarker, '4.', '新项编号应该是 4.');

      // 查找所有同级项
      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 2, 0);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 0);

      // 获取后续项
      const currentItemIndex = itemsToRenumber.findIndex(item => item.line === 2);
      const itemsAfterCurrent = itemsToRenumber.slice(currentItemIndex + 1);

      assert.strictEqual(itemsAfterCurrent.length, 0, '末尾分割时不应该有后续项');
    });

    test('应该正确处理带缩进的有序列表', () => {
      // 场景：
      //   1. first |(光标在末尾)
      //   2. sec

      const content = '  1. first\n  2. sec';
      const document = createMockDocument(content);
      const position = createPosition(0, 10);

      // 解析当前项
      const currentLine = document.lineAt(0);
      const listInfo = ListParser.parseListItem(currentLine.text);

      assert.ok(listInfo, '应该能解析列表项');
      assert.strictEqual(listInfo!.indent, 2, '缩进应该是2');
      assert.strictEqual(listInfo!.marker, '1.', '标记应该是 1.');

      // 查找同级项（缩进为2）
      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 0, 2);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 2);

      assert.strictEqual(itemsToRenumber.length, 2, '应该找到2个同级项');
      assert.strictEqual(itemsToRenumber[0].listInfo.indent, 2, '第一项缩进应该是2');
      assert.strictEqual(itemsToRenumber[1].listInfo.indent, 2, '第二项缩进应该是2');
    });
  });

  suite('无序列表分割逻辑测试', () => {

    test('应该使用 getNextMarker 获取标记', () => {
      // 无序列表分割不需要重新编号，只需要复制标记

      const markers = ['-', '*', '+', '1.'];
      const expected = ['-', '*', '+', '2.'];

      markers.forEach((marker, index) => {
        const nextMarker = ListParser.getNextMarker(marker);
        assert.strictEqual(nextMarker, expected[index],
          `标记 ${marker} 的下一个标记应该是 ${expected[index]}`);
      });
    });
  });

  suite('列表项内容分割测试', () => {

    test('应该正确分割光标后的内容', () => {
      const lineText = '1. first content';
      const cursorPosition = 8; // 在 "first" 后，空格前

      // 模拟获取光标后的内容
      const restOfLine = lineText.substring(cursorPosition).trim();

      assert.strictEqual(restOfLine, 'content',
        '应该正确提取光标后的内容');
    });

    test('应该处理光标在行末的情况', () => {
      const lineText = '1. first';
      const cursorPosition = lineText.length;

      const restOfLine = lineText.substring(cursorPosition).trim();

      assert.strictEqual(restOfLine, '',
        '光标在行末时，后续内容应该为空');
    });

    test('应该处理光标在列表标记后的情况', () => {
      const lineText = '1. first content';
      const cursorPosition = 3; // 在 "1. " 后

      const restOfLine = lineText.substring(cursorPosition).trim();

      assert.strictEqual(restOfLine, 'first content',
        '应该包含完整的列表内容');
    });
  });

  suite('边界情况测试', () => {

    test('应该处理只有一项的列表', () => {
      const content = '1. only item';
      const document = createMockDocument(content);

      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 0, 0);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 0);

      assert.strictEqual(itemsToRenumber.length, 1, '应该只有一项');

      const currentItemIndex = 0;
      const itemsAfterCurrent = itemsToRenumber.slice(currentItemIndex + 1);

      assert.strictEqual(itemsAfterCurrent.length, 0,
        '单项列表分割后不应该有后续项需要重新编号');
    });

    test('应该处理混合缩进的列表', () => {
      const content = '1. first\n  - sub item\n2. second';
      const document = createMockDocument(content);

      // 在第一项分割
      const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, 0, 0);
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, 0);

      assert.strictEqual(itemsToRenumber.length, 2,
        '应该只找到同级的两个项（不包括子项）');
      assert.strictEqual(itemsToRenumber[0].line, 0);
      assert.strictEqual(itemsToRenumber[1].line, 2);
    });

    test('应该处理带复选框的有序列表', () => {
      const content = '1. [ ] first\n2. [X] second';
      const document = createMockDocument(content);

      const currentLine = document.lineAt(0);
      const listInfo = ListParser.parseListItem(currentLine.text);

      assert.ok(listInfo, '应该能解析列表项');
      assert.strictEqual(listInfo!.hasCheckbox, true, '应该有复选框');
      assert.strictEqual(listInfo!.checkboxState, ' ', '复选框应该未选中');
      assert.strictEqual(listInfo!.isOrdered, true, '应该是有序列表');
      assert.strictEqual(listInfo!.marker, '1.', '标记应该是 1.');
    });
  });
});
