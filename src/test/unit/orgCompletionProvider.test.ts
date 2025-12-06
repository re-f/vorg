import * as assert from 'assert';

/**
 * OrgCompletionProvider 单元测试
 * 测试 ID 链接自动补全的查询提取逻辑
 */
suite('OrgCompletionProvider 查询提取测试', () => {
  
  /**
   * 提取查询文本的辅助函数（模拟 CompletionProvider 的逻辑）
   */
  function extractQueryFromIdLink(textBeforeCursor: string): string | null {
    // 匹配 [[id: 模式（可能后面有部分输入）
    const idLinkMatch = textBeforeCursor.match(/\[\[id:([^\]]*)$/);
    if (!idLinkMatch) {
      return null;
    }
    
    // 提取用户输入的部分（去除首尾空格）
    const rawQuery = idLinkMatch[1] || '';
    let query = rawQuery.trim().toLowerCase();
    
    // 关键修复：如果查询文本以 "id:" 开头，说明用户可能误输入了 "id:" 前缀
    // 我们应该移除这个前缀，只保留后面的实际查询内容
    if (query.startsWith('id:')) {
      query = query.substring(3).trim(); // 移除 "id:" 前缀（3个字符）
    }
    
    return query || null;
  }

  suite('基本查询提取', () => {
    
    test('应该正确提取空查询（只有 [[id:）', () => {
      const text = '[[id:';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, null, '空查询应该返回 null');
    });

    test('应该正确提取简单查询', () => {
      const text = '[[id:test';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'test', '应该提取 "test"');
    });

    test('应该正确提取带空格的查询', () => {
      const text = '[[id: test query';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'test query', '应该提取 "test query"');
    });

    test('应该去除首尾空格', () => {
      const text = '[[id:  test  ';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'test', '应该去除首尾空格');
    });

    test('应该转换为小写', () => {
      const text = '[[id:TEST';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'test', '应该转换为小写');
    });

    test('应该处理中文字符', () => {
      const text = '[[id:测试标题';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, '测试标题', '应该正确处理中文');
    });
  });

  suite('边界情况', () => {
    
    test('不应该匹配不完整的链接', () => {
      const text = '[[id';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, null, '不完整的链接应该返回 null');
    });

    test('不应该匹配其他类型的链接', () => {
      const text = '[[file:test.org';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, null, '非 id: 链接应该返回 null');
    });

    test('应该处理包含 ] 的查询（在结束前）', () => {
      // 注意：在实际使用中，当用户输入 [[id:test] 时，光标通常在 ] 之前
      // 所以 textBeforeCursor 应该是 [[id:test，而不是 [[id:test]
      // 但如果光标在 ] 之后，textBeforeCursor 是 [[id:test]，正则会匹配失败（因为要求行尾）
      // 这个测试验证的是：如果光标在 ] 之前，应该能正确提取
      const text = '[[id:test'; // 光标在 ] 之前的情况
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'test', '应该提取 ] 之前的内容');
    });

    test('应该处理光标在 ] 之后的情况（不匹配）', () => {
      // 如果光标在 ] 之后，textBeforeCursor 是 [[id:test]，正则会匹配失败
      // 因为 $ 要求行尾，但 ] 后面可能还有内容（如 [描述]）
      // 这是预期的行为，因为此时链接已经完成，不应该触发补全
      const text = '[[id:test]'; // 光标在 ] 之后的情况
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, null, '光标在 ] 之后时不应该匹配（链接已完成）');
    });

    test('应该处理多个 [[id: 的情况', () => {
      const text = '[[id:first]][[id:second';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'second', '应该匹配最后一个 [[id:');
    });
  });

  suite('关键测试：不应该匹配 "id:" 前缀', () => {
    
    test('查询文本不应该包含 "id:" 本身', () => {
      const text = '[[id:';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, null, '只有 [[id: 时查询应该为空');
    });

    test('应该自动移除查询文本中的 "id:" 前缀', () => {
      const text = '[[id: id: test';
      const query = extractQueryFromIdLink(text);
      // 修复后：应该自动移除 "id:" 前缀，只保留 "test"
      assert.strictEqual(query, 'test', '应该自动移除 "id:" 前缀，只保留 "test"');
    });

    test('应该处理查询文本以 "id:" 开头的情况', () => {
      const text = '[[id:id:something';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'something', '应该移除开头的 "id:" 前缀');
    });

    test('应该只提取 id: 后面的内容', () => {
      const text = '[[id:my-headline';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'my-headline', '应该只提取 id: 后面的内容');
      assert.ok(!query?.includes('id:'), '查询不应该包含 "id:"');
    });

    test('应该正确处理 id: 后面有空格的情况', () => {
      const text = '[[id: my-headline';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'my-headline', '应该去除前导空格');
      assert.ok(!query?.includes('id:'), '查询不应该包含 "id:"');
    });
  });

  suite('实际使用场景', () => {
    
    test('场景1: 用户输入 [[id: 然后开始输入标题', () => {
      const text = '[[id:project';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'project', '应该提取 "project"');
    });

    test('场景2: 用户输入 [[id: 然后输入部分标题', () => {
      const text = '[[id:重要';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, '重要', '应该提取 "重要"');
    });

    test('场景3: 用户输入 [[id: 然后输入带空格的标题', () => {
      const text = '[[id: 重要任务';
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, '重要任务', '应该提取 "重要任务"');
    });

    test('场景4: 用户输入完整的链接格式', () => {
      // 实际场景：用户输入 [[id:abc-123][描述]
      // 当光标在 id: 后面时，textBeforeCursor 是 [[id:abc-123
      // 当光标在 ] 后面时，textBeforeCursor 是 [[id:abc-123]，正则会匹配失败（因为要求行尾）
      // 当光标在 [描述 时，textBeforeCursor 是 [[id:abc-123][描述，正则会匹配到 "abc-123][描述"
      // 这个测试验证的是：如果光标在第一个 ] 之前，应该能正确提取 ID 部分
      const text = '[[id:abc-123'; // 光标在第一个 ] 之前
      const query = extractQueryFromIdLink(text);
      assert.strictEqual(query, 'abc-123', '应该提取 ID 部分');
    });
  });

  suite('过滤逻辑测试', () => {
    
    test('应该正确过滤匹配的标题', () => {
      const query = 'test';
      const headlines = [
        { text: 'Test Headline', displayName: 'Test Headline' },
        { text: 'Another Headline', displayName: 'Another Headline' },
        { text: 'Testing Something', displayName: 'Testing Something' },
        { text: 'id: test', displayName: 'id: test' } // 这个不应该被匹配（除非标题真的包含 "test"）
      ];

      const filtered = headlines.filter(h => {
        const symbolText = h.text.toLowerCase();
        const symbolDisplayName = h.displayName.toLowerCase();
        return symbolText.includes(query) || symbolDisplayName.includes(query);
      });

      // "Test Headline" 包含 "test"
      // "Testing Something" 包含 "test"
      // "id: test" 包含 "test"（虽然这不是我们想要的，但如果标题真的叫 "id: test"，应该匹配）
      assert.ok(filtered.length >= 2, '应该匹配包含 "test" 的标题');
      assert.ok(filtered.some(h => h.text === 'Test Headline'), '应该匹配 "Test Headline"');
      assert.ok(filtered.some(h => h.text === 'Testing Something'), '应该匹配 "Testing Something"');
    });

    test('不应该匹配标题中包含 "id:" 但不包含查询的标题', () => {
      const query = 'project';
      const headlines = [
        { text: 'id: something', displayName: 'id: something' },
        { text: 'My Project', displayName: 'My Project' }
      ];

      const filtered = headlines.filter(h => {
        const symbolText = h.text.toLowerCase();
        const symbolDisplayName = h.displayName.toLowerCase();
        return symbolText.includes(query) || symbolDisplayName.includes(query);
      });

      assert.strictEqual(filtered.length, 1, '应该只匹配 "My Project"');
      assert.strictEqual(filtered[0].text, 'My Project', '应该匹配 "My Project"');
    });
  });
});

