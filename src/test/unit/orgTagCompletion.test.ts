
import * as assert from 'assert';

/**
 * Org-mode 标签补全逻辑测试
 * 
 * 专门测试标签解析的正则表达式，确保支持多标签补全。
 */
suite('OrgCompletionProvider 标签解析逻辑测试', () => {

    // 模拟 OrgCompletionProvider 中的标签解析正则表达式
    // 允许冒号前面是空格、另一个冒号，或者合法的标签字符（字母、数字、_@#%）
    // 这样在输入第二个标签时（如 :tag1:）也能匹配成功
    const TAG_REGEX = /(?:\s+|:|[\w@#%])(:)([^\s:]*)$/;

    function parseTagInput(textBeforeCursor: string): { query: string, bracketIndex: number } | null {
        const match = textBeforeCursor.match(TAG_REGEX);
        if (match) {
            // 特别处理：我们提取的是第一个捕获组（冒号）之后的位置
            // match[1] 是 (:)，match[2] 是 ([^\s:]*)
            const colonIndex = textBeforeCursor.lastIndexOf(match[1]);
            return {
                query: match[2].toLowerCase(),
                bracketIndex: colonIndex + 1
            };
        }
        return null;
    }

    test('第一个标签补全 (空格后输入冒号)', () => {
        const text = '* Headline :';
        const result = parseTagInput(text);
        assert.ok(result, '应该匹配冒号');
        assert.strictEqual(result!.query, '', '查询应该是空字符串');
    });

    test('第一个标签带前缀 (空格后输入冒号和字符)', () => {
        const text = '* Headline :wo';
        const result = parseTagInput(text);
        assert.ok(result, '应该匹配');
        assert.strictEqual(result!.query, 'wo', '查询应该是 "wo"');
    });

    test('第二个标签补全 (前一个标签末尾输入冒号)', () => {
        const text = '* Headline :tag1:';
        const result = parseTagInput(text);
        assert.ok(result, '第二个标签也应该触发补全');
        assert.strictEqual(result!.query, '', '查询应该是空字符串');
    });

    test('第二个标签带前缀 (前一个标签末尾输入冒号和字符)', () => {
        const text = '* Headline :tag1:p';
        const result = parseTagInput(text);
        assert.ok(result, '带前缀的第二个标签应该匹配');
        assert.strictEqual(result!.query, 'p', '查询应该是 "p"');
    });

    test('多标签中间的冒号补全', () => {
        const text = '* Headline :tag1:tag2:';
        const result = parseTagInput(text);
        assert.ok(result, '中间的标签也应该匹配');
        assert.strictEqual(result!.query, '', '查询应该为空');
    });
});
