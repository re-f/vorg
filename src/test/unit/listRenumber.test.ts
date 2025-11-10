import * as assert from 'assert';
import { ListCommands } from '../../commands/editing/listCommands';
import { ListItemInfo } from '../../parsers/listParser';

/**
 * 列表重新编号工具函数单元测试
 * 测试纯函数逻辑，不依赖 VS Code API
 */
suite('列表重新编号工具函数测试', () => {
  
  // 辅助函数：创建列表项信息
  function createListItemInfo(
    indent: number,
    marker: string,
    content: string,
    hasCheckbox: boolean = false,
    checkboxState?: string
  ): ListItemInfo {
    return {
      indent,
      marker,
      content,
      isOrdered: /^\d+\.$/.test(marker),
      hasCheckbox,
      checkboxState
    };
  }

  suite('calculateNewItemNumber 测试', () => {
    
    test('应该计算第一个项的编号', () => {
      const result = (ListCommands as any).calculateNewItemNumber(0);
      assert.strictEqual(result, '1.');
    });

    test('应该计算第二个项的编号', () => {
      const result = (ListCommands as any).calculateNewItemNumber(1);
      assert.strictEqual(result, '2.');
    });

    test('应该计算第十个项的编号', () => {
      const result = (ListCommands as any).calculateNewItemNumber(9);
      assert.strictEqual(result, '10.');
    });
  });

  suite('renumberOrderedListItems 测试', () => {
    
    test('应该重新编号所有项（无新项插入）', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项') },
        { line: 1, listInfo: createListItemInfo(2, '2.', '第二项') },
        { line: 2, listInfo: createListItemInfo(2, '3.', '第三项') }
      ];
      
      const result = (ListCommands as any).renumberOrderedListItems(items, -1);
      
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].newMarker, '1.');
      assert.strictEqual(result[0].originalLine, 0);
      assert.strictEqual(result[1].newMarker, '2.');
      assert.strictEqual(result[1].originalLine, 1);
      assert.strictEqual(result[2].newMarker, '3.');
      assert.strictEqual(result[2].originalLine, 2);
    });

    test('应该在最后插入新项并重新编号', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项') },
        { line: 1, listInfo: createListItemInfo(2, '2.', '第二项') },
        { line: 2, listInfo: createListItemInfo(2, '3.', '第三项') }
      ];
      
      // 在最后插入新项（索引 3）
      const result = (ListCommands as any).renumberOrderedListItems(items, 3);
      
      assert.strictEqual(result.length, 3);
      // 前面的项编号不变
      assert.strictEqual(result[0].newMarker, '1.');
      assert.strictEqual(result[1].newMarker, '2.');
      assert.strictEqual(result[2].newMarker, '3.');
      // 新项应该是 4，但不在结果中（因为新项不在 items 数组中）
    });

    test('应该在中间插入新项并重新编号后面的项', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项') },
        { line: 1, listInfo: createListItemInfo(2, '2.', '第二项') },
        { line: 2, listInfo: createListItemInfo(2, '3.', '第三项') },
        { line: 3, listInfo: createListItemInfo(2, '4.', '第四项') }
      ];
      
      // 在第2项后插入新项（索引 2）
      const result = (ListCommands as any).renumberOrderedListItems(items, 2);
      
      assert.strictEqual(result.length, 4);
      // 前面的项编号不变
      assert.strictEqual(result[0].newMarker, '1.');
      assert.strictEqual(result[0].originalLine, 0);
      assert.strictEqual(result[1].newMarker, '2.');
      assert.strictEqual(result[1].originalLine, 1);
      // 新项应该是 3，但不在结果中
      // 后面的项应该重新编号
      assert.strictEqual(result[2].newMarker, '4.');
      assert.strictEqual(result[2].originalLine, 2);
      assert.strictEqual(result[3].newMarker, '5.');
      assert.strictEqual(result[3].originalLine, 3);
    });

    test('应该在开头插入新项并重新编号所有项', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项') },
        { line: 1, listInfo: createListItemInfo(2, '2.', '第二项') }
      ];
      
      // 在开头插入新项（索引 0）
      const result = (ListCommands as any).renumberOrderedListItems(items, 0);
      
      assert.strictEqual(result.length, 2);
      // 新项应该是 1，但不在结果中
      // 所有原有项都应该重新编号
      assert.strictEqual(result[0].newMarker, '2.');
      assert.strictEqual(result[0].originalLine, 0);
      assert.strictEqual(result[1].newMarker, '3.');
      assert.strictEqual(result[1].originalLine, 1);
    });

    test('应该处理空列表', () => {
      const items: Array<{ line: number; listInfo: ListItemInfo }> = [];
      
      const result = (ListCommands as any).renumberOrderedListItems(items, -1);
      
      assert.strictEqual(result.length, 0);
    });

    test('应该处理只有一个项的列表', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项') }
      ];
      
      const result = (ListCommands as any).renumberOrderedListItems(items, -1);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].newMarker, '1.');
      assert.strictEqual(result[0].originalLine, 0);
    });

    test('应该保持列表项的其他属性不变', () => {
      const items = [
        { line: 0, listInfo: createListItemInfo(2, '1.', '第一项', true, 'X') },
        { line: 1, listInfo: createListItemInfo(2, '2.', '第二项') }
      ];
      
      const result = (ListCommands as any).renumberOrderedListItems(items, -1);
      
      assert.strictEqual(result.length, 2);
      // 验证复选框状态被保留
      assert.strictEqual(result[0].listInfo.hasCheckbox, true);
      assert.strictEqual(result[0].listInfo.checkboxState, 'X');
      assert.strictEqual(result[0].listInfo.content, '第一项');
      assert.strictEqual(result[0].listInfo.indent, 2);
      // 只有标记被改变
      assert.strictEqual(result[0].newMarker, '1.');
      assert.strictEqual(result[1].newMarker, '2.');
    });
  });
});

