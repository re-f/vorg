import * as assert from 'assert';
import { HeadingParser } from '../../parsers/headingParser';

/**
 * HeadingParser 解析逻辑单元测试
 * 测试标题解析、子树查找等核心功能
 */
suite('HeadingParser 标题解析测试', () => {
  
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

  suite('parseHeading 测试', () => {
    
    test('应该解析简单的一级标题', () => {
      const result = HeadingParser.parseHeading('* 标题');
      
      assert.strictEqual(result.level, 1);
      assert.strictEqual(result.stars, '*');
      assert.strictEqual(result.title, '标题');
      assert.strictEqual(result.todoState, null);
    });

    test('应该解析二级标题', () => {
      const result = HeadingParser.parseHeading('** 二级标题');
      
      assert.strictEqual(result.level, 2);
      assert.strictEqual(result.stars, '**');
      assert.strictEqual(result.title, '二级标题');
    });

    test('应该解析多级标题', () => {
      const result = HeadingParser.parseHeading('***** 五级标题');
      
      assert.strictEqual(result.level, 5);
      assert.strictEqual(result.stars, '*****');
      assert.strictEqual(result.title, '五级标题');
    });

    test('应该解析带 TODO 状态的标题', () => {
      const result = HeadingParser.parseHeading('** TODO 完成任务');
      
      assert.strictEqual(result.level, 2);
      assert.strictEqual(result.todoState, 'TODO');
      assert.strictEqual(result.title, '完成任务');
    });

    test('应该解析带 DONE 状态的标题', () => {
      const result = HeadingParser.parseHeading('* DONE 已完成任务');
      
      assert.strictEqual(result.level, 1);
      assert.strictEqual(result.todoState, 'DONE');
      assert.strictEqual(result.title, '已完成任务');
    });

    test('应该解析带 NEXT 状态的标题', () => {
      const result = HeadingParser.parseHeading('*** NEXT 下一步');
      
      assert.strictEqual(result.todoState, 'NEXT');
      assert.strictEqual(result.title, '下一步');
    });

    test('应该解析带 WAITING 状态的标题', () => {
      const result = HeadingParser.parseHeading('* WAITING 等待回复');
      
      assert.strictEqual(result.todoState, 'WAITING');
    });

    test('应该解析带 CANCELLED 状态的标题', () => {
      const result = HeadingParser.parseHeading('** CANCELLED 已取消');
      
      assert.strictEqual(result.todoState, 'CANCELLED');
    });

    test('应该解析空标题', () => {
      const result = HeadingParser.parseHeading('* ');
      
      assert.strictEqual(result.level, 1);
      assert.strictEqual(result.title, '');
    });

    test('应该解析只有 TODO 状态的标题', () => {
      const result = HeadingParser.parseHeading('* TODO');
      
      assert.strictEqual(result.level, 1);
      // 注意：如果标题后面没有内容，TODO 可能被当作标题文本
      // 根据实际实现调整断言
      if (result.todoState === null) {
        // TODO 被当作标题内容
        assert.strictEqual(result.title, 'TODO');
      } else {
        // TODO 被识别为状态
        assert.strictEqual(result.todoState, 'TODO');
        assert.strictEqual(result.title, '');
      }
    });

    test('非标题行应返回 level 0', () => {
      const result = HeadingParser.parseHeading('这不是标题');
      
      assert.strictEqual(result.level, 0);
      assert.strictEqual(result.stars, '');
      assert.strictEqual(result.title, '这不是标题');
      assert.strictEqual(result.todoState, null);
    });

    test('星号后没有空格不应识别为标题', () => {
      const result = HeadingParser.parseHeading('*这不是标题');
      
      assert.strictEqual(result.level, 0);
    });

    test('应该解析带特殊字符的标题', () => {
      const result = HeadingParser.parseHeading('* 标题：包含【特殊】字符！@#￥%');
      
      assert.strictEqual(result.level, 1);
      assert.strictEqual(result.title, '标题：包含【特殊】字符！@#￥%');
    });

    test('应该解析带 tags 的标题', () => {
      const result = HeadingParser.parseHeading('* TODO 任务 :tag1:tag2:');
      
      assert.strictEqual(result.level, 1);
      assert.strictEqual(result.todoState, 'TODO');
      assert.strictEqual(result.title, '任务 :tag1:tag2:');
    });
  });

  suite('findSubtreeEnd 测试', () => {
    
    test('应该找到简单子树的结束位置', () => {
      const content = [
        '* 标题1',      // line 0
        '内容1',        // line 1
        '内容2',        // line 2
        '* 标题2'       // line 3
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 2);  // 应该在"内容2"结束
    });

    test('应该找到嵌套子树的结束位置', () => {
      const content = [
        '* 一级标题',    // line 0
        '一级内容',      // line 1
        '** 二级标题',   // line 2
        '二级内容',      // line 3
        '*** 三级标题',  // line 4
        '三级内容',      // line 5
        '* 下一个一级'   // line 6
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 5);  // 应该在"三级内容"结束
    });

    test('应该找到二级标题的子树结束', () => {
      const content = [
        '* 一级标题',
        '** 二级标题',   // line 1 - 测试这个
        '二级内容',      // line 2
        '*** 三级标题',  // line 3
        '三级内容',      // line 4
        '** 另一个二级'  // line 5
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 4);  // 应该在"三级内容"结束
    });

    test('文档末尾的标题应返回文档末尾', () => {
      const content = [
        '* 唯一的标题',  // line 0
        '内容1',        // line 1
        '内容2'         // line 2
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 2);  // 文档最后一行
    });

    test('应该处理没有内容的标题', () => {
      const content = [
        '* 标题1',
        '* 标题2'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 0);  // 应该返回标题1自己的行
    });

    test('应该处理连续的同级标题', () => {
      const content = [
        '* 标题1',     // line 0
        '内容',       // line 1
        '* 标题2',    // line 2
        '* 标题3'     // line 3
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 1);
    });

    test('应该正确处理多级嵌套后的同级标题', () => {
      const content = [
        '* 一级A',       // line 0
        '** 二级A1',     // line 1
        '*** 三级A1a',   // line 2
        '*** 三级A1b',   // line 3
        '** 二级A2',     // line 4
        '内容',         // line 5
        '* 一级B'       // line 6
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 5);
    });

    test('非标题行应返回原位置', () => {
      const content = [
        '这不是标题',
        '普通文本'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 5);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, pos.line);
      assert.strictEqual(end.character, pos.character);
    });
  });

  suite('findNextHeading 测试', () => {
    
    test('应该找到下一个同级标题', () => {
      const content = [
        '* 标题1',     // line 0
        '内容',       // line 1
        '* 标题2'     // line 2
      ].join('\n');
      
      const doc = createMockDocument(content);
      const nextLine = HeadingParser.findNextHeading(doc, 0, 1);
      
      assert.strictEqual(nextLine, 2);
    });

    test('应该跳过更低级的标题', () => {
      const content = [
        '* 标题1',      // line 0
        '** 二级标题',  // line 1
        '*** 三级标题', // line 2
        '* 标题2'      // line 3
      ].join('\n');
      
      const doc = createMockDocument(content);
      const nextLine = HeadingParser.findNextHeading(doc, 0, 1);
      
      assert.strictEqual(nextLine, 3);  // 应该跳过二级和三级
    });

    test('应该找到更高级的标题', () => {
      const content = [
        '*** 三级标题',  // line 0
        '内容',         // line 1
        '* 一级标题'    // line 2
      ].join('\n');
      
      const doc = createMockDocument(content);
      const nextLine = HeadingParser.findNextHeading(doc, 0, 3);
      
      assert.strictEqual(nextLine, 2);  // 一级标题比三级高
    });

    test('没有下一个标题应返回 -1', () => {
      const content = [
        '* 唯一标题',
        '内容'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const nextLine = HeadingParser.findNextHeading(doc, 0, 1);
      
      assert.strictEqual(nextLine, -1);
    });

    test('应该正确处理二级标题查找', () => {
      const content = [
        '* 一级',
        '** 二级A',    // line 1
        '*** 三级',
        '** 二级B'    // line 3
      ].join('\n');
      
      const doc = createMockDocument(content);
      const nextLine = HeadingParser.findNextHeading(doc, 1, 2);
      
      assert.strictEqual(nextLine, 3);  // 找到同级的二级B
    });
  });

  suite('findCurrentHeading 测试', () => {
    
    test('光标在标题行应返回该标题', () => {
      const content = [
        '* 标题',
        '内容'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 5);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.ok(result);
      assert.strictEqual(result!.headingInfo.level, 1);
      assert.strictEqual(result!.headingInfo.title, '标题');
    });

    test('光标在内容行应返回所属标题', () => {
      const content = [
        '* 标题',     // line 0
        '这是内容',   // line 1
        '更多内容'    // line 2
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.ok(result);
      assert.strictEqual(result!.headingInfo.level, 1);
      assert.strictEqual(result!.headingInfo.title, '标题');
      assert.strictEqual(result!.line.lineNumber, 0);
    });

    test('应该找到正确的父标题', () => {
      const content = [
        '* 一级标题',   // line 0
        '** 二级标题',  // line 1
        '这是内容'     // line 2 - 测试这一行
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(2, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.ok(result);
      assert.strictEqual(result!.headingInfo.level, 2);
      assert.strictEqual(result!.headingInfo.title, '二级标题');
    });

    test('文档开头无标题应返回 null', () => {
      const content = [
        '普通文本',
        '更多文本'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.strictEqual(result, null);
    });

    test('应该处理多个标题的情况', () => {
      const content = [
        '* 标题1',
        '内容1',
        '* 标题2',
        '内容2',      // line 3 - 测试这一行
        '* 标题3'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(3, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.ok(result);
      assert.strictEqual(result!.headingInfo.title, '标题2');
    });

    test('应该正确识别带 TODO 状态的标题', () => {
      const content = [
        '* TODO 任务',
        '内容'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(1, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.ok(result);
      assert.strictEqual(result!.headingInfo.todoState, 'TODO');
      assert.strictEqual(result!.headingInfo.title, '任务');
    });
  });

  suite('边界情况测试', () => {
    
    test('应该处理空文档', () => {
      const doc = createMockDocument('');
      const pos = createPosition(0, 0);
      const result = HeadingParser.findCurrentHeading(doc, pos);
      
      assert.strictEqual(result, null);
    });

    test('应该处理只有标题的文档', () => {
      const content = [
        '* 标题1',
        '* 标题2',
        '* 标题3'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      // 标题后立即是另一个标题，应该返回标题1自己
      assert.strictEqual(end.line, 0);
    });

    test('应该处理深度嵌套的标题', () => {
      const content = [
        '* L1',
        '** L2',
        '*** L3',
        '**** L4',
        '***** L5',
        '****** L6',
        '内容',
        '* Next'
      ].join('\n');
      
      const doc = createMockDocument(content);
      const pos = createPosition(0, 0);
      const end = HeadingParser.findSubtreeEnd(doc, pos);
      
      assert.strictEqual(end.line, 6);  // 应该包含所有子标题
    });
  });

  suite('buildHeadingLine 测试', () => {
    
    test('应该构建简单标题', () => {
      const result = HeadingParser.buildHeadingLine(1, '标题');
      assert.strictEqual(result, '* 标题');
    });

    test('应该构建多级标题', () => {
      let result = HeadingParser.buildHeadingLine(2, '二级标题');
      assert.strictEqual(result, '** 二级标题');
      
      result = HeadingParser.buildHeadingLine(3, '三级标题');
      assert.strictEqual(result, '*** 三级标题');
    });

    test('应该构建带 TODO 状态的标题', () => {
      const result = HeadingParser.buildHeadingLine(1, '任务', 'TODO');
      assert.strictEqual(result, '* TODO 任务');
    });

    test('应该构建带 DONE 状态的标题', () => {
      const result = HeadingParser.buildHeadingLine(2, '完成的任务', 'DONE');
      assert.strictEqual(result, '** DONE 完成的任务');
    });

    test('null 状态应该被忽略', () => {
      const result = HeadingParser.buildHeadingLine(1, '标题', null);
      assert.strictEqual(result, '* 标题');
    });
  });

  suite('updateTodoState 测试', () => {
    
    test('应该更新标题的 TODO 状态', () => {
      const result = HeadingParser.updateTodoState('* 标题', 'TODO');
      assert.strictEqual(result, '* TODO 标题');
    });

    test('应该替换现有的 TODO 状态', () => {
      const result = HeadingParser.updateTodoState('* TODO 标题', 'DONE');
      assert.strictEqual(result, '* DONE 标题');
    });

    test('应该移除 TODO 状态', () => {
      const result = HeadingParser.updateTodoState('* TODO 标题', null);
      assert.strictEqual(result, '* 标题');
    });

    test('应该处理多级标题', () => {
      let result = HeadingParser.updateTodoState('** TODO 二级标题', 'DONE');
      assert.strictEqual(result, '** DONE 二级标题');
      
      result = HeadingParser.updateTodoState('*** DONE 三级标题', null);
      assert.strictEqual(result, '*** 三级标题');
    });

    test('非标题行应保持不变', () => {
      const text = '普通文本';
      const result = HeadingParser.updateTodoState(text, 'TODO');
      assert.strictEqual(result, text);
    });

    test('应该处理自定义 TODO 关键字', () => {
      // 假设已配置了 NEXT, WAITING 等关键字
      const result = HeadingParser.updateTodoState('* NEXT 标题', 'WAITING');
      assert.strictEqual(result, '* WAITING 标题');
    });
  });

  suite('isHeadingLine 测试', () => {
    
    test('应该识别标题行', () => {
      assert.strictEqual(HeadingParser.isHeadingLine('* 标题'), true);
      assert.strictEqual(HeadingParser.isHeadingLine('** 二级标题'), true);
      assert.strictEqual(HeadingParser.isHeadingLine('*** TODO 三级标题'), true);
    });

    test('应该识别多级标题', () => {
      assert.strictEqual(HeadingParser.isHeadingLine('**** 四级标题'), true);
      assert.strictEqual(HeadingParser.isHeadingLine('***** 五级标题'), true);
    });

    test('非标题行应返回 false', () => {
      assert.strictEqual(HeadingParser.isHeadingLine('普通文本'), false);
      assert.strictEqual(HeadingParser.isHeadingLine('- 列表项'), false);
      assert.strictEqual(HeadingParser.isHeadingLine('*斜体*'), false);
    });

    test('应该识别带 TODO 状态的标题', () => {
      assert.strictEqual(HeadingParser.isHeadingLine('* TODO 任务'), true);
      assert.strictEqual(HeadingParser.isHeadingLine('** DONE 完成'), true);
    });
  });
});

