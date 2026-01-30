import * as assert from 'assert';
import { PropertyParser } from '../../parsers/propertyParser';
import * as core from '../../types/core';

/**
 * PropertyParser 解析逻辑单元测试
 * 测试 Property 抽屉解析、属性查找等核心功能
 */
suite('PropertyParser Property解析测试', () => {

  // 辅助函数：创建 mock document
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
      getText: () => content,
      // @ts-ignore - positionAt is not in core.TextDocument but used locally in some tests
      positionAt: (offset: number) => {
        let currentOffset = 0;
        for (let i = 0; i < lines.length; i++) {
          if (currentOffset + lines[i].length >= offset) {
            return { line: i, character: offset - currentOffset };
          }
          currentOffset += lines[i].length + 1; // +1 for newline
        }
        return { line: lines.length - 1, character: 0 };
      }
    } as any;
  }

  suite('parseProperty 测试', () => {

    test('应该解析标准 Property 行', () => {
      const result = PropertyParser.parseProperty('  :ID: abc-123');

      assert.strictEqual(result?.indent, '  ');
      assert.strictEqual(result?.key, 'ID');
      assert.strictEqual(result?.value, 'abc-123');
    });

    test('应该解析无缩进的 Property', () => {
      const result = PropertyParser.parseProperty(':CATEGORY: work');

      assert.strictEqual(result?.indent, '');
      assert.strictEqual(result?.key, 'CATEGORY');
      assert.strictEqual(result?.value, 'work');
    });

    test('应该解析空值 Property', () => {
      const result = PropertyParser.parseProperty('  :CUSTOM:');

      assert.strictEqual(result?.key, 'CUSTOM');
      assert.strictEqual(result?.value, '');
    });

    test('非 Property 行应返回 null', () => {
      const result = PropertyParser.parseProperty('普通文本');
      assert.strictEqual(result, null);
    });

    test('应该解析带空格值的 Property', () => {
      const result = PropertyParser.parseProperty('  :TITLE: My Title');

      assert.strictEqual(result?.key, 'TITLE');
      assert.strictEqual(result?.value, 'My Title');
    });
  });

  suite('isPropertyDrawerStart/End 测试', () => {

    test('应该识别 :PROPERTIES: 标记', () => {
      assert.strictEqual(PropertyParser.isPropertyDrawerStart('  :PROPERTIES:'), true);
      assert.strictEqual(PropertyParser.isPropertyDrawerStart(':PROPERTIES:'), true);
      assert.strictEqual(PropertyParser.isPropertyDrawerStart('  :PROPERTIES:  '), true);
    });

    test('应该识别 :END: 标记', () => {
      assert.strictEqual(PropertyParser.isPropertyDrawerEnd('  :END:'), true);
      assert.strictEqual(PropertyParser.isPropertyDrawerEnd(':END:'), true);
    });

    test('非标记行应返回 false', () => {
      assert.strictEqual(PropertyParser.isPropertyDrawerStart(':ID: 123'), false);
      assert.strictEqual(PropertyParser.isPropertyDrawerEnd(':CATEGORY: work'), false);
    });
  });

  suite('isPropertyLine 测试', () => {

    test('应该识别 Property 行', () => {
      assert.strictEqual(PropertyParser.isPropertyLine(':ID: 123'), true);
      assert.strictEqual(PropertyParser.isPropertyLine('  :CATEGORY: work'), true);
      assert.strictEqual(PropertyParser.isPropertyLine(':CUSTOM:'), true);
    });

    test('非 Property 行应返回 false', () => {
      assert.strictEqual(PropertyParser.isPropertyLine('普通文本'), false);
      assert.strictEqual(PropertyParser.isPropertyLine('- 列表项'), false);
    });
  });

  suite('findPropertyDrawer 测试', () => {

    test('应该找到完整的 Property 抽屉', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc-123
  :CATEGORY: work
  :END:
内容`;
      const doc = createMockDocument(content);
      const result = PropertyParser.findPropertyDrawer(doc, 0);

      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.startLine, 1);
      assert.strictEqual(result?.endLine, 4);
    });

    test('没有 Property 抽屉应返回 null', () => {
      const content = `* 标题
内容`;
      const doc = createMockDocument(content);
      const result = PropertyParser.findPropertyDrawer(doc, 0);

      assert.strictEqual(result, null);
    });

    test('未关闭的 Property 抽屉应返回 null', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc-123
* 另一个标题`;
      const doc = createMockDocument(content);
      const result = PropertyParser.findPropertyDrawer(doc, 0);

      assert.strictEqual(result, null);
    });

    test('应该在遇到新标题时停止查找', () => {
      const content = `* 标题 1
内容
* 标题 2
  :PROPERTIES:
  :ID: abc
  :END:`;
      const doc = createMockDocument(content);
      const result = PropertyParser.findPropertyDrawer(doc, 0);

      assert.strictEqual(result, null);
    });
  });

  suite('findPropertyInDrawer 测试', () => {

    test('应该找到存在的属性', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc-123
  :CATEGORY: work
  :END:`;
      const doc = createMockDocument(content);
      const drawerInfo = { startLine: 1, endLine: 4 };

      const idLine = PropertyParser.findPropertyInDrawer(doc, drawerInfo, 'ID');
      assert.strictEqual(idLine, 2);

      const categoryLine = PropertyParser.findPropertyInDrawer(doc, drawerInfo, 'CATEGORY');
      assert.strictEqual(categoryLine, 3);
    });

    test('不存在的属性应返回 null', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc-123
  :END:`;
      const doc = createMockDocument(content);
      const drawerInfo = { startLine: 1, endLine: 3 };

      const result = PropertyParser.findPropertyInDrawer(doc, drawerInfo, 'CATEGORY');
      assert.strictEqual(result, null);
    });

    test('属性名应该大小写不敏感', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc-123
  :END:`;
      const doc = createMockDocument(content);
      const drawerInfo = { startLine: 1, endLine: 3 };

      const result = PropertyParser.findPropertyInDrawer(doc, drawerInfo, 'id');
      assert.strictEqual(result, 2);
    });
  });

  suite('getPropertyIndent 测试', () => {

    test('应该获取现有属性的缩进', () => {
      const content = `  :PROPERTIES:
  :ID: abc
  :END:`;
      const doc = createMockDocument(content);
      const drawerInfo = { startLine: 0, endLine: 2 };

      const indent = PropertyParser.getPropertyIndent(doc, drawerInfo);
      assert.strictEqual(indent, '  ');
    });

    test('空抽屉应返回默认缩进', () => {
      const content = `  :PROPERTIES:
  :END:`;
      const doc = createMockDocument(content);
      const drawerInfo = { startLine: 0, endLine: 1 };

      const indent = PropertyParser.getPropertyIndent(doc, drawerInfo, '    ');
      assert.strictEqual(indent, '    ');
    });
  });

  suite('buildPropertyLine 测试', () => {

    test('应该构建标准 Property 行', () => {
      const result = PropertyParser.buildPropertyLine('ID', 'abc-123', '  ');
      assert.strictEqual(result, '  :ID: abc-123');
    });

    test('应该将 key 转为大写', () => {
      const result = PropertyParser.buildPropertyLine('category', 'work');
      assert.strictEqual(result, '  :CATEGORY: work');
    });

    test('应该支持自定义缩进', () => {
      const result = PropertyParser.buildPropertyLine('ID', '123', '    ');
      assert.strictEqual(result, '    :ID: 123');
    });

    test('应该支持空值', () => {
      const result = PropertyParser.buildPropertyLine('CUSTOM', '');
      assert.strictEqual(result, '  :CUSTOM: ');
    });
  });

  suite('buildPropertyDrawer 测试', () => {

    test('应该构建完整的 Property 抽屉', () => {
      const properties = [
        { key: 'ID', value: 'abc-123' },
        { key: 'CATEGORY', value: 'work' }
      ];
      const result = PropertyParser.buildPropertyDrawer(properties, '  ');

      const expected = `  :PROPERTIES:
  :ID: abc-123
  :CATEGORY: work
  :END:
`;
      assert.strictEqual(result, expected);
    });

    test('应该构建空 Property 抽屉', () => {
      const result = PropertyParser.buildPropertyDrawer([], '  ');

      const expected = `  :PROPERTIES:
  :END:
`;
      assert.strictEqual(result, expected);
    });
  });

  suite('generateUniqueId 测试', () => {

    test('应该生成 UUID 格式的 ID', () => {
      const id = PropertyParser.generateUniqueId();

      // UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      assert.match(id, uuidRegex);
    });

    test('连续生成的 ID 应该不同', () => {
      const id1 = PropertyParser.generateUniqueId();
      const id2 = PropertyParser.generateUniqueId();

      assert.notStrictEqual(id1, id2);
    });
  });

  suite('hasPropertyDrawer 测试', () => {

    test('存在 Property 抽屉应返回 true', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: abc
  :END:`;
      const doc = createMockDocument(content);

      assert.strictEqual(PropertyParser.hasPropertyDrawer(doc, 0), true);
    });

    test('不存在 Property 抽屉应返回 false', () => {
      const content = `* 标题
内容`;
      const doc = createMockDocument(content);

      assert.strictEqual(PropertyParser.hasPropertyDrawer(doc, 0), false);
    });
  });

  suite('findIdInDocument 测试', () => {

    test('应该找到文档中的 ID', () => {
      const content = `* 标题 1
  :PROPERTIES:
  :ID: target-id
  :END:
* 标题 2`;
      const doc = createMockDocument(content);

      const line = PropertyParser.findIdInDocument(doc, 'target-id');
      assert.strictEqual(line, 2);
    });

    test('不存在的 ID 应返回 null', () => {
      const content = `* 标题
  :PROPERTIES:
  :ID: other-id
  :END:`;
      const doc = createMockDocument(content);

      const line = PropertyParser.findIdInDocument(doc, 'not-found');
      assert.strictEqual(line, null);
    });

    test('应该转义特殊字符', () => {
      const content = `:ID: id-with.special$chars`;
      const doc = createMockDocument(content);

      const line = PropertyParser.findIdInDocument(doc, 'id-with.special$chars');
      assert.strictEqual(line, 0);
    });
  });
});

