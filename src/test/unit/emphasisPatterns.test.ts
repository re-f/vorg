import * as assert from 'assert';
import {
  EMPHASIS_MARKERS,
  findEmphasisMatches,
  buildEmphasisRegex,
  trimForWrap,
  wrapWithMarker,
  isFullyWrapped,
  unwrap,
  applyEmphasis,
} from '../../utils/emphasisPatterns';

/**
 * emphasisPatterns 共享正则与纯逻辑单元测试
 * 覆盖 test-data/syntax-test.org 中列出的六种标记及边界情况
 */
suite('emphasisPatterns 强调标记测试', () => {

  suite('findEmphasisMatches 匹配测试', () => {
    test('应该匹配粗体 *text*', () => {
      const matches = findEmphasisMatches('这是*粗体文本*的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'bold');
      assert.strictEqual(matches[0].content, '粗体文本');
    });

    test('应该匹配斜体 /text/', () => {
      const matches = findEmphasisMatches('这是/斜体文本/的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'italic');
    });

    test('应该匹配下划线 _text_', () => {
      const matches = findEmphasisMatches('这是_下划线文本_的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'underline');
    });

    test('应该匹配删除线 +text+', () => {
      const matches = findEmphasisMatches('这是+删除线文本+的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'strikethrough');
    });

    test('应该匹配逐字 =text=', () => {
      const matches = findEmphasisMatches('这是=行内代码=的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'verbatim');
    });

    test('应该匹配代码 ~text~', () => {
      const matches = findEmphasisMatches('这是~等宽字体~的示例');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'code');
    });

    test('应该在一行内匹配多个不重叠的标记', () => {
      const matches = findEmphasisMatches('*粗体* 和 /斜体/ 和 _下划线_');
      assert.strictEqual(matches.length, 3);
      assert.deepStrictEqual(matches.map(m => m.type), ['bold', 'italic', 'underline']);
    });

    test('内容首尾为空白时不应匹配', () => {
      const matches = findEmphasisMatches('这是* 粗体文本 *的示例');
      assert.strictEqual(matches.length, 0);
    });

    test('标记字符紧邻单词字符时不应匹配', () => {
      const matches = findEmphasisMatches('foo*bar*baz');
      assert.strictEqual(matches.length, 0);
    });

    test('汉字紧邻标记字符时应可以匹配（非 \\w 边界）', () => {
      const matches = findEmphasisMatches('汉字*突出*问题');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].content, '突出');
    });

    test('重叠匹配时应保留优先级更高（先出现）的类型', () => {
      // *粗体和/粗体斜体/* 组合：整体是 bold，内部的 / / 会被当作重叠而跳过
      const matches = findEmphasisMatches('*粗体和/粗体斜体/*');
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'bold');
    });

    test('无标记的普通文本应返回空数组', () => {
      const matches = findEmphasisMatches('这是普通文本，没有任何标记');
      assert.strictEqual(matches.length, 0);
    });

    test('EMPHASIS_MARKERS 应包含六种标记且字符互不相同', () => {
      assert.strictEqual(EMPHASIS_MARKERS.length, 6);
      const chars = new Set(EMPHASIS_MARKERS.map(m => m.char));
      assert.strictEqual(chars.size, 6);
    });
  });

  suite('buildEmphasisRegex 测试', () => {
    test('应该正确转义正则特殊字符（如 +）', () => {
      const regex = buildEmphasisRegex('+');
      assert.strictEqual(regex.test('+text+'), true);
    });
  });

  suite('trimForWrap 测试', () => {
    test('应该拆分首尾空白', () => {
      const result = trimForWrap('  hello world  ');
      assert.strictEqual(result.leading, '  ');
      assert.strictEqual(result.trimmed, 'hello world');
      assert.strictEqual(result.trailing, '  ');
    });

    test('无首尾空白时应原样返回', () => {
      const result = trimForWrap('hello');
      assert.strictEqual(result.leading, '');
      assert.strictEqual(result.trimmed, 'hello');
      assert.strictEqual(result.trailing, '');
    });

    test('全空白文本应 trimmed 为空字符串', () => {
      const result = trimForWrap('   ');
      assert.strictEqual(result.trimmed, '');
    });
  });

  suite('wrapWithMarker / isFullyWrapped / unwrap 测试', () => {
    test('wrapWithMarker 应正确包裹文本', () => {
      assert.strictEqual(wrapWithMarker('hello', '*'), '*hello*');
    });

    test('isFullyWrapped 应识别已完整包裹的文本', () => {
      assert.strictEqual(isFullyWrapped('*hello*', '*'), true);
    });

    test('isFullyWrapped 应拒绝标记不匹配的文本', () => {
      assert.strictEqual(isFullyWrapped('*hello*', '/'), false);
    });

    test('isFullyWrapped 应拒绝内容首尾为空白的文本', () => {
      assert.strictEqual(isFullyWrapped('* hello *', '*'), false);
    });

    test('isFullyWrapped 应拒绝内容中还包含同一标记字符的文本', () => {
      assert.strictEqual(isFullyWrapped('*hel*lo*', '*'), false);
    });

    test('isFullyWrapped 应拒绝过短文本', () => {
      assert.strictEqual(isFullyWrapped('**', '*'), false);
    });

    test('unwrap 应去除首尾标记字符', () => {
      assert.strictEqual(unwrap('*hello*'), 'hello');
    });
  });

  suite('applyEmphasis 测试（org-emphasize 核心逻辑）', () => {
    test('未包裹文本应被包裹', () => {
      const result = applyEmphasis('hello', '*');
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.text, '*hello*');
      assert.strictEqual(result!.toggledOff, false);
    });

    test('已完整包裹的文本应被去除标记（toggle off）', () => {
      const result = applyEmphasis('*hello*', '*');
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.text, 'hello');
      assert.strictEqual(result!.toggledOff, true);
    });

    test('选区首尾带空白时应把空白挪到标记外面', () => {
      const result = applyEmphasis('  hello  ', '*');
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.text, '  *hello*  ');
      assert.strictEqual(result!.toggledOff, false);
    });

    test('全空白选区应返回 null（无法包裹）', () => {
      const result = applyEmphasis('   ', '*');
      assert.strictEqual(result, null);
    });

    test('用不同标记包裹已被其他标记包裹的文本，应新增标记而不是误判为去除', () => {
      const result = applyEmphasis('*hello*', '/');
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.text, '/*hello*/');
      assert.strictEqual(result!.toggledOff, false);
    });

    test('中文文本应可以正常包裹与去除', () => {
      const wrapped = applyEmphasis('突出', '*');
      assert.strictEqual(wrapped!.text, '*突出*');

      const unwrapped = applyEmphasis('*突出*', '*');
      assert.strictEqual(unwrapped!.text, '突出');
      assert.strictEqual(unwrapped!.toggledOff, true);
    });
  });
});
