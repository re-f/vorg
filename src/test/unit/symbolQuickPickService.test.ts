import * as assert from 'assert';
import * as core from '../../types/core';
import {
  buildDocumentSymbolQuickPickEntries,
  buildWorkspaceSymbolQuickPickEntries,
  filterQuickPickSymbolEntries,
  toQuickPickPresentationItems,
  WorkspaceQuickPickHeadingInput,
} from '../../services/symbolQuickPickService';

function createMockDocument(content: string): core.TextDocument {
  const lines = content.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
      range: {
        start: { line, character: 0 },
        end: { line, character: lines[line]?.length || 0 },
      },
    }),
    getText: () => content,
  };
}

suite('SymbolQuickPickService Tests', () => {
  test('buildDocumentSymbolQuickPickEntries should keep display clean and include outline path', () => {
    const document = createMockDocument(`* 项目
** TODO 测试标题 :work:
*** 子任务`);

    const entries = buildDocumentSymbolQuickPickEntries(
      document,
      'file:///test.org',
      ['TODO', 'DONE']
    );

    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries[1].label, 'TODO 测试标题 :work:');
    assert.strictEqual(entries[1].description, '项目');
    assert.ok(!entries[1].label.includes('ceshibiaoti'));
    assert.ok(!entries[1].label.includes('csbt'));
  });

  test('filterQuickPickSymbolEntries should match pinyin for document entries', () => {
    const document = createMockDocument(`* 测试标题
* 英文 heading`);

    const entries = buildDocumentSymbolQuickPickEntries(
      document,
      'file:///test.org',
      ['TODO', 'DONE']
    );

    const filtered = filterQuickPickSymbolEntries(entries, 'csbt');
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].label, '测试标题');
  });

  test('buildWorkspaceSymbolQuickPickEntries should include file path and clean display text', () => {
    const headings: WorkspaceQuickPickHeadingInput[] = [
      {
        uri: '/workspace/a.org',
        line: 0,
        level: 1,
        title: '项目',
        displayName: '项目',
        relativePath: 'a.org',
        pinyinText: 'xiangmu xm',
        pinyinDisplayName: 'xiangmu xm',
      },
      {
        uri: '/workspace/a.org',
        line: 4,
        level: 2,
        title: '测试标题',
        displayName: 'TODO 测试标题 :work:',
        relativePath: 'a.org',
        pinyinText: 'ceshibiaoti csbt',
        pinyinDisplayName: 'todo ceshibiaoti csbt work',
      },
    ];

    const entries = buildWorkspaceSymbolQuickPickEntries(headings);

    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[1].description, 'a.org');
    assert.ok(entries[1].detail?.includes('项目'));
    assert.ok(!entries[1].label.includes('ceshibiaoti'));
  });

  test('filterQuickPickSymbolEntries should match pinyin for workspace entries', () => {
    const headings: WorkspaceQuickPickHeadingInput[] = [
      {
        uri: '/workspace/a.org',
        line: 0,
        level: 1,
        title: '测试标题',
        displayName: '测试标题',
        relativePath: 'a.org',
        pinyinText: 'ceshibiaoti csbt',
        pinyinDisplayName: 'ceshibiaoti csbt',
      },
    ];

    const entries = buildWorkspaceSymbolQuickPickEntries(headings);
    const filtered = filterQuickPickSymbolEntries(entries, 'csbt a.org');

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].label, '测试标题');
  });

  test('toQuickPickPresentationItems should mark items alwaysShow for custom filtering', () => {
    const items = toQuickPickPresentationItems([{
      label: '测试标题',
      description: 'a.org',
      detail: 'L1',
      searchText: '测试标题 ceshibiaoti csbt',
      uri: 'file:///a.org',
      line: 0,
    }]);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].label, '测试标题');
    assert.strictEqual(items[0].alwaysShow, true);
  });
});
