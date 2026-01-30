import * as assert from 'assert';
import { ContextAnalyzer } from '../../parsers/contextAnalyzer';
import * as core from '../../types/core';

/**
 * ContextAnalyzer 单元测试
 * 测试 Org-mode 各种上下文的识别逻辑
 */
suite('ContextAnalyzer 上下文识别测试', () => {

  // 辅助函数：创建 mock document
  function createMockDocument(content: string, lineNumber: number = 0): core.TextDocument {
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

  // 辅助函数：创建 Position
  function createPosition(line: number, character: number): core.Position {
    return { line, character };
  }

  suite('标题识别测试', () => {

    test('应该正确识别一级标题', () => {
      const doc = createMockDocument('* 这是一级标题');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.level, 1);
      assert.strictEqual(context.todoState, null);
      assert.strictEqual(context.content, '这是一级标题');
    });

    test('应该正确识别二级标题', () => {
      const doc = createMockDocument('** 这是二级标题');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.level, 2);
    });

    test('应该正确识别五级标题', () => {
      const doc = createMockDocument('***** 这是五级标题');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.level, 5);
    });

    test('应该正确识别带 TODO 状态的标题', () => {
      const doc = createMockDocument('** TODO 完成这个任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.level, 2);
      assert.strictEqual(context.todoState, 'TODO');
      assert.strictEqual(context.content, '完成这个任务');
    });

    test('应该正确识别带 DONE 状态的标题', () => {
      const doc = createMockDocument('* DONE 已完成的任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.todoState, 'DONE');
      assert.strictEqual(context.content, '已完成的任务');
    });

    test('应该正确识别带 NEXT 状态的标题', () => {
      const doc = createMockDocument('*** NEXT 下一步要做的');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.todoState, 'NEXT');
    });

    test('应该正确识别带 WAITING 状态的标题', () => {
      const doc = createMockDocument('* WAITING 等待中的任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.todoState, 'WAITING');
    });

    test('应该正确识别带 CANCELLED 状态的标题', () => {
      const doc = createMockDocument('** CANCELLED 已取消的任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.todoState, 'CANCELLED');
    });

    test('应该识别空标题', () => {
      const doc = createMockDocument('* ');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'heading');
      assert.strictEqual(context.content, '');
    });

    test('星号后没有空格不应识别为标题', () => {
      const doc = createMockDocument('*这不是标题');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.notStrictEqual(context.type, 'heading');
    });

    test('星号前有空格不应识别为标题', () => {
      const doc = createMockDocument(' *这不是标题');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.notStrictEqual(context.type, 'heading');
    });
  });

  suite('列表项识别测试', () => {

    test('应该正确识别无序列表项（-）', () => {
      const doc = createMockDocument('- 列表项内容');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'list-item');
      assert.strictEqual(context.marker, '-');
      assert.strictEqual(context.indent, 0);
      assert.strictEqual(context.content, '列表项内容');
    });

    test('应该正确识别无序列表项（+）', () => {
      const doc = createMockDocument('+ 列表项内容');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'list-item');
      assert.strictEqual(context.marker, '+');
    });

    test('应该正确识别无序列表项（*）', () => {
      const doc = createMockDocument('* 列表项内容');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      // 注意：单个 * 会被识别为标题，不是列表
      assert.strictEqual(context.type, 'heading');
    });

    test('应该正确识别有序列表项', () => {
      const doc = createMockDocument('1. 第一项');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'list-item');
      assert.strictEqual(context.marker, '1.');
      assert.strictEqual(context.content, '第一项');
    });

    test('应该正确识别多位数有序列表项', () => {
      const doc = createMockDocument('123. 第123项');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'list-item');
      assert.strictEqual(context.marker, '123.');
    });

    test('应该正确识别缩进的列表项', () => {
      const doc = createMockDocument('  - 缩进的列表项');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'list-item');
      assert.strictEqual(context.indent, 2);
      assert.strictEqual(context.marker, '-');
    });

    test('应该正确识别多级缩进的列表项', () => {
      const doc = createMockDocument('    - 四个空格缩进');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.indent, 4);
    });
  });

  suite('复选框识别测试', () => {

    test('应该正确识别未完成的复选框', () => {
      const doc = createMockDocument('- [ ] 未完成任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'checkbox');
      assert.strictEqual(context.checkboxState, ' ');
      assert.strictEqual(context.content, '未完成任务');
    });

    test('应该正确识别已完成的复选框（X）', () => {
      const doc = createMockDocument('- [X] 已完成任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'checkbox');
      assert.strictEqual(context.checkboxState, 'X');
      assert.strictEqual(context.content, '已完成任务');
    });

    test('应该正确识别部分完成的复选框（-）', () => {
      const doc = createMockDocument('- [-] 部分完成任务');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'checkbox');
      assert.strictEqual(context.checkboxState, '-');
    });

    test('应该正确识别缩进的复选框', () => {
      const doc = createMockDocument('  - [ ] 缩进的复选框');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'checkbox');
      assert.strictEqual(context.indent, 2);
    });

    test('应该正确识别有序列表的复选框', () => {
      const doc = createMockDocument('1. [ ] 有序列表复选框');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'checkbox');
      assert.strictEqual(context.marker, '1.');
    });
  });

  suite('表格识别测试', () => {

    test('应该正确识别表格行', () => {
      const doc = createMockDocument('| 列1 | 列2 | 列3 |');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'table');
    });

    test('应该正确识别表格分隔符', () => {
      const doc = createMockDocument('|---+---+---|');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'table');
    });

    test('应该正确识别缩进的表格', () => {
      const doc = createMockDocument('  | 列1 | 列2 |');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'table');
    });

    test('应该正确识别单列表格', () => {
      const doc = createMockDocument('| 单列 |');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'table');
    });
  });

  suite('代码块识别测试', () => {

    test('应该正确识别代码块开始标记（大写）', () => {
      const doc = createMockDocument('#+BEGIN_SRC javascript');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该正确识别代码块开始标记（小写）', () => {
      const doc = createMockDocument('#+begin_src python');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该正确识别示例块', () => {
      const doc = createMockDocument('#+BEGIN_EXAMPLE');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该正确识别引用块', () => {
      const doc = createMockDocument('#+BEGIN_QUOTE');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该正确识别诗歌块', () => {
      const doc = createMockDocument('#+BEGIN_VERSE');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该正确识别居中块', () => {
      const doc = createMockDocument('#+BEGIN_CENTER');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该识别在代码块内部', () => {
      const content = [
        '#+BEGIN_SRC javascript',
        'console.log("test");',  // 测试这一行
        '#+END_SRC'
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'code-block');
    });

    test('代码块结束后应识别为普通文本', () => {
      const content = [
        '#+BEGIN_SRC javascript',
        'console.log("test");',
        '#+END_SRC',
        '这是普通文本'  // 测试这一行
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(3, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'text');
    });
  });

  suite('Property 抽屉识别测试', () => {

    test('应该正确识别 PROPERTIES 标记', () => {
      const doc = createMockDocument(':PROPERTIES:');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-drawer-header');
    });

    test('应该正确识别 END 标记', () => {
      const doc = createMockDocument(':END:');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-drawer-end');
    });

    test('应该正确识别 Property 项', () => {
      const doc = createMockDocument(':ID: 12345');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-item');
      assert.strictEqual(context.propertyKey, 'ID');
      assert.strictEqual(context.propertyValue, '12345');
    });

    test('应该正确识别带空格的 Property 值', () => {
      const doc = createMockDocument(':CUSTOM_ID: my-custom-id');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-item');
      assert.strictEqual(context.propertyKey, 'CUSTOM_ID');
      assert.strictEqual(context.propertyValue, 'my-custom-id');
    });

    test('应该正确识别空值的 Property', () => {
      const doc = createMockDocument(':CREATED:');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-item');
      assert.strictEqual(context.propertyKey, 'CREATED');
      assert.strictEqual(context.propertyValue, '');
    });

    test('应该识别在 Property 抽屉内部', () => {
      const content = [
        ':PROPERTIES:',
        '',  // 空行，测试这一行
        ':END:'
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-drawer');
    });

    test('Property 抽屉结束后应识别为普通文本', () => {
      const content = [
        ':PROPERTIES:',
        ':ID: 123',
        ':END:',
        '这是普通文本'  // 测试这一行
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(3, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'text');
    });
  });

  suite('普通文本识别测试', () => {

    test('应该正确识别普通文本', () => {
      const doc = createMockDocument('这是普通文本');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'text');
    });

    test('应该正确识别空行', () => {
      const doc = createMockDocument('');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'text');
    });

    test('应该正确识别只有空格的行', () => {
      const doc = createMockDocument('    ');
      const pos = createPosition(0, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'text');
    });
  });

  suite('边界情况测试', () => {

    test('应该处理嵌套的代码块检测', () => {
      const content = [
        '#+BEGIN_SRC',
        '#+BEGIN_SRC',  // 嵌套的开始（会被识别为代码块标题，因为是当前行）
        '#+END_SRC'
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      // 当前行匹配 code-block-header 正则，会被识别为 code-block-header
      assert.strictEqual(context.type, 'code-block-header');
    });

    test('应该处理多个 Property 抽屉', () => {
      const content = [
        '* 标题1',
        ':PROPERTIES:',
        ':ID: 1',
        ':END:',
        '* 标题2',
        ':PROPERTIES:',
        ':ID: 2',  // 测试这一行
        ':END:'
      ].join('\n');

      const doc = createMockDocument(content);
      const pos = createPosition(6, 0);
      const context = ContextAnalyzer.analyzeContext(doc, pos);

      assert.strictEqual(context.type, 'property-item');
      assert.strictEqual(context.propertyValue, '2');
    });
  });
});

