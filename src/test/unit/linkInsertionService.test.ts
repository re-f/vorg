import * as assert from 'assert';
import {
  filterSymbolsByQuery,
  buildIdLinkText,
  toHeadingQuickPickItems
} from '../../utils/linkInsertionUtils';
import { IndexedHeadingSymbol } from '../../services/orgSymbolIndexService';

suite('linkInsertionUtils 单元测试', () => {
  const sampleSymbols: IndexedHeadingSymbol[] = [
    {
      displayName: 'TODO 重要任务',
      text: '重要任务',
      pinyinText: 'zhongyaorenwu zyrw',
      pinyinDisplayName: 'todo zhongyaorenwu',
      level: 2,
      todoKeyword: 'TODO',
      tags: [],
      uri: { fsPath: '/tmp/a.org', toString: () => 'file:///tmp/a.org' } as any,
      line: 0,
      symbolKind: 12,
      relativePath: 'a.org'
    },
    {
      displayName: 'Project Notes',
      text: 'Project Notes',
      pinyinText: 'project notes',
      pinyinDisplayName: 'project notes',
      level: 1,
      todoKeyword: null,
      tags: [],
      uri: { fsPath: '/tmp/b.org', toString: () => 'file:///tmp/b.org' } as any,
      line: 3,
      symbolKind: 12,
      relativePath: 'notes/b.org'
    }
  ];

  suite('filterSymbolsByQuery', () => {
    test('空查询应返回全部候选', () => {
      const result = filterSymbolsByQuery(sampleSymbols, '');
      assert.strictEqual(result.length, 2);
    });

    test('应按标题文本过滤', () => {
      const result = filterSymbolsByQuery(sampleSymbols, '重要');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].text, '重要任务');
    });

    test('应按拼音过滤', () => {
      const result = filterSymbolsByQuery(sampleSymbols, 'zyrw');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].text, '重要任务');
    });
  });

  suite('buildIdLinkText', () => {
    test('应生成标准 id 链接格式', () => {
      const text = buildIdLinkText('abc-123', '重要任务');
      assert.strictEqual(text, '[[id:abc-123][重要任务]]');
    });

    test('应使用自定义描述', () => {
      const text = buildIdLinkText('abc-123', '重要任务', '跳转任务');
      assert.strictEqual(text, '[[id:abc-123][跳转任务]]');
    });
  });

  suite('toHeadingQuickPickItems', () => {
    test('应包含 symbol 引用与展示信息', () => {
      const items = toHeadingQuickPickItems(sampleSymbols);
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items[0].label, 'TODO 重要任务');
      assert.strictEqual(items[0].description, 'a.org');
      assert.strictEqual(items[0].symbol.text, '重要任务');
    });
  });
});
