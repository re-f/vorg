import * as assert from 'assert';
import { ListParser } from '../../parsers/listParser';
import * as core from '../../types/core';

/**
 * 有序列表 Alt+Enter / Ctrl+Enter 编号逻辑单元测试
 *
 * 验证 ListParser 辅助函数在分割、插入场景下的编号行为。
 */
suite('有序列表编辑编号逻辑测试', () => {

  function createMockDocument(content: string): core.TextDocument {
    const lines = content.split('\n');
    return {
      lineCount: lines.length,
      lineAt: (line: number) => ({
        text: lines[line] || '',
        lineNumber: line,
        range: {
          start: { line, character: 0 },
          end: { line, character: lines[line]?.length || 0 }
        }
      }),
      getText: () => content
    };
  }

  function expectRenumberAfterInsert(
    document: core.TextDocument,
    insertLine: number,
    indent: number,
    expected: Array<{ line: number; marker: string }>
  ) {
    const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, insertLine, indent);
    const items = ListParser.findItemsAtLevel(document, firstItemLine, indent);
    const renumbered = ListParser.renumberOrderedListItems(items, insertLine + 1);

    for (const { line, marker } of expected) {
      const syncItem = renumbered.find(item => item.originalLine === line);
      assert.ok(syncItem, `行 ${line} 应在重编号结果中`);
      assert.strictEqual(syncItem!.newMarker, marker, `行 ${line} 的标记应为 ${marker}`);
    }
  }

  suite('Meta Return (insertListItemImmediate) 编号', () => {

    test('在第一项末尾插入应得到 2. 并顺延后续项', () => {
      const content = '1. first\n2. sec\n3. third';
      const doc = createMockDocument(content);

      const newMarker = ListParser.getNextMarkerForInsert(doc, 0, 0, '1.');
      assert.strictEqual(newMarker, '2.');

      expectRenumberAfterInsert(doc, 0, 0, [
        { line: 0, marker: '1.' },
        { line: 1, marker: '3.' },
        { line: 2, marker: '4.' },
      ]);
    });

    test('在中间项末尾插入应得到 3. 并只顺延其后项', () => {
      const content = '1. first\n2. second\n3. third';
      const doc = createMockDocument(content);

      const newMarker = ListParser.getNextMarkerForInsert(doc, 1, 0, '2.');
      assert.strictEqual(newMarker, '3.');

      expectRenumberAfterInsert(doc, 1, 0, [
        { line: 0, marker: '1.' },
        { line: 1, marker: '2.' },
        { line: 2, marker: '4.' },
      ]);
    });

    test('在末尾项插入应得到下一编号且不改变已有项', () => {
      const content = '1. first\n2. second\n3. third';
      const doc = createMockDocument(content);

      const newMarker = ListParser.getNextMarkerForInsert(doc, 2, 0, '3.');
      assert.strictEqual(newMarker, '4.');

      const firstItemLine = ListParser.findFirstListItemLineAtLevel(doc, 2, 0);
      const items = ListParser.findItemsAtLevel(doc, firstItemLine, 0);
      const renumbered = ListParser.renumberOrderedListItems(items, 3);

      assert.strictEqual(renumbered[0].newMarker, '1.');
      assert.strictEqual(renumbered[1].newMarker, '2.');
      assert.strictEqual(renumbered[2].newMarker, '3.');
    });
  });

  suite('多层次有序列表', () => {

    test('子层级编号独立于父层级', () => {
      const content = `1. top
   1. sub1
   2. sub2
2. top2`;
      const doc = createMockDocument(content);

      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 1, 3, '1.'), '2.');
      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 2, 3, '2.'), '3.');
      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 0, 0, '1.'), '2.');
      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 3, 0, '2.'), '3.');
    });

    test('在子项末尾插入后只重编号同级子项', () => {
      const content = `1. top
   1. sub1
   2. sub2
2. top2`;
      const doc = createMockDocument(content);

      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 1, 3, '1.'), '2.');

      expectRenumberAfterInsert(doc, 1, 3, [
        { line: 1, marker: '1.' },
        { line: 2, marker: '3.' },
      ]);
    });
  });

  suite('混合有序与无序列表', () => {

    test('插入有序项时只统计同级有序项', () => {
      const content = `  1. ordered1
  - bullet
  2. ordered2`;
      const doc = createMockDocument(content);

      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 0, 2, '1.'), '2.');
      assert.strictEqual(ListParser.getNextMarkerForInsert(doc, 2, 2, '2.'), '3.');
    });

    test('重编号时不修改无序项标记', () => {
      const content = `  1. ordered1
  - bullet
  2. ordered2`;
      const doc = createMockDocument(content);

      const firstItemLine = ListParser.findFirstListItemLineAtLevel(doc, 0, 2);
      const items = ListParser.findItemsAtLevel(doc, firstItemLine, 2);
      const renumbered = ListParser.renumberOrderedListItems(items, 1);

      assert.strictEqual(renumbered.length, 2);
      assert.strictEqual(renumbered[0].newMarker, '1.');
      assert.strictEqual(renumbered[1].newMarker, '3.');
      assert.strictEqual(items[1].listInfo.marker, '-');
    });
  });

  suite('isOrderedMarker', () => {

    test('应识别有序与无序标记', () => {
      assert.strictEqual(ListParser.isOrderedMarker('1.'), true);
      assert.strictEqual(ListParser.isOrderedMarker('12.'), true);
      assert.strictEqual(ListParser.isOrderedMarker('-'), false);
      assert.strictEqual(ListParser.isOrderedMarker('*'), false);
      assert.strictEqual(ListParser.isOrderedMarker('a.'), false);
    });
  });
});
