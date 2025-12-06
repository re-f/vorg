import * as assert from 'assert';
import { OrgCompletionProvider } from '../../completion/orgCompletionProvider';
import { OrgSymbolIndexService, IndexedHeadingSymbol } from '../../services/orgSymbolIndexService';
import { PropertyParser } from '../../parsers/propertyParser';
import { Logger } from '../../utils/logger';

/**
 * OrgCompletionProvider 补全插入内容测试
 * 测试用户输入不同内容时，补全后插入的内容是否正确
 */
suite('OrgCompletionProvider 补全插入内容测试', () => {
  
  // Mock 对象
  let mockIndexService: any;
  let mockSymbols: IndexedHeadingSymbol[];
  let provider: OrgCompletionProvider;
  
  // 创建 mock document
  function createMockDocument(content: string, line: number = 0): any {
    const lines = content.split('\n');
    return {
      lineCount: lines.length,
      lineAt: (lineNum: number) => ({
        text: lines[lineNum] || '',
        lineNumber: lineNum,
        range: {
          start: { line: lineNum, character: 0 },
          end: { line: lineNum, character: (lines[lineNum] || '').length }
        }
      }),
      getText: () => content,
      uri: { fsPath: '/test/test.org', toString: () => 'file:///test/test.org' }
    };
  }
  
  // 创建 mock position
  function createPosition(line: number, character: number): any {
    return { line, character };
  }
  
  // 创建 mock cancellation token
  function createCancellationToken(): any {
    return {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} })
    };
  }
  
  // 创建 mock completion context
  function createCompletionContext(triggerKind: number = 1): any {
    return {
      triggerKind,
      triggerCharacter: '['
    };
  }
  
  setup(() => {
    // 初始化 Logger（避免日志错误）
    try {
      Logger.initialize({
        subscriptions: [],
        extensionPath: '/test',
        extensionUri: { fsPath: '/test', toString: () => 'file:///test' }
      } as any);
    } catch (e) {
      // Logger 可能已经初始化，忽略错误
    }
    
    // 创建 mock symbols
    mockSymbols = [
      {
        displayName: 'Test Headline',
        text: 'Test Headline',
        level: 1,
        todoKeyword: null,
        tags: [],
        uri: { fsPath: '/test/test.org', toString: () => 'file:///test/test.org' } as any,
        line: 0,
        symbolKind: 12, // SymbolKind.Class
        relativePath: 'test.org'
      },
      {
        displayName: 'Project Task',
        text: 'Project Task',
        level: 2,
        todoKeyword: 'TODO',
        tags: ['work'],
        uri: { fsPath: '/test/test.org', toString: () => 'file:///test/test.org' } as any,
        line: 5,
        symbolKind: 12,
        relativePath: 'test.org'
      },
      {
        displayName: '重要任务',
        text: '重要任务',
        level: 1,
        todoKeyword: null,
        tags: [],
        uri: { fsPath: '/test/notes.org', toString: () => 'file:///test/notes.org' } as any,
        line: 10,
        symbolKind: 12,
        relativePath: 'notes.org'
      }
    ];
    
    // 创建 mock index service
    mockIndexService = {
      getAllSymbols: async () => mockSymbols
    };
    
    // Mock OrgSymbolIndexService.getInstance
    (OrgSymbolIndexService as any).getInstance = function() {
      return mockIndexService;
    };
    
    // 为每个 symbol 生成一个固定的 UUID（用于测试）
    const idMap = new Map<string, string>();
    mockSymbols.forEach((symbol, index) => {
      // 为每个标题生成一个固定的 UUID（用于测试）
      const uuid = `00000000-0000-0000-0000-00000000000${index + 1}`.padEnd(36, '0');
      idMap.set(`${symbol.uri.fsPath}:${symbol.line}`, uuid);
    });
    
    // Mock vscode.workspace.openTextDocument
    const mockVscode = require('vscode');
    if (mockVscode.workspace) {
      // 保存原始方法
      mockVscode.workspace._originalOpenTextDocument = mockVscode.workspace.openTextDocument;
      mockVscode.workspace.openTextDocument = async (uri: any) => {
        // 根据 URI 返回对应的 mock document
        const uriString = typeof uri === 'string' ? uri : (uri?.fsPath || uri?.toString() || '/test/test.org');
        const content = uriString.includes('notes.org') 
          ? '* 重要任务\n'
          : '* Test Headline\n** Project Task\n';
        const mockDoc = createMockDocument(content, 0);
        // 设置正确的 URI
        mockDoc.uri = typeof uri === 'string' 
          ? { fsPath: uri, toString: () => uri } 
          : uri;
        return mockDoc;
      };
    }
    
    // Mock PropertyParser.getOrGenerateIdForHeading
    const originalGetOrGenerateIdForHeading = PropertyParser.getOrGenerateIdForHeading;
    (PropertyParser as any).getOrGenerateIdForHeading = function(document: any, line: number) {
      // 根据文档 URI 和行号查找对应的 ID
      const uri = document.uri || { fsPath: '/test/test.org' };
      const uriString = typeof uri === 'string' ? uri : (uri.fsPath || uri.toString());
      const key = `${uriString}:${line}`;
      const id = idMap.get(key) || PropertyParser.generateUniqueId();
      return { id, needsInsert: !idMap.has(key) };
    };
    
    provider = new OrgCompletionProvider();
  });
  
  teardown(() => {
    // 清理
  });
  
  suite('用户输入 [[ 时的插入内容', () => {
    
    test('insertText 应该包含 id:UUID][标题（真实 ID）', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      assert.ok(items!.length > 0, '应该至少返回 1 个补全项');
      
      const firstItem = items![0];
      
      // 检查 insertText 格式
      assert.ok(firstItem.insertText, 'insertText 应该存在');
      assert.strictEqual(
        typeof firstItem.insertText,
        'string',
        'insertText 应该是字符串'
      );
      
      const insertText = firstItem.insertText as string;
      
      // 应该以 id: 开头，后面跟着 UUID 格式的 ID
      assert.ok(
        insertText.startsWith('id:'),
        `insertText 应该以 "id:" 开头，实际: ${insertText}`
      );
      
      // 应该包含 ][ 分隔符
      assert.ok(
        insertText.includes(']['),
        'insertText 应该包含 ][ 分隔符'
      );
      
      // 应该包含标题文本
      assert.ok(
        insertText.includes('Test Headline'),
        'insertText 应该包含标题文本'
      );
      
      // 提取 ID 部分（id: 和 ][ 之间的内容）
      const idMatch = insertText.match(/^id:([^\]\[]+)\]/);
      assert.ok(idMatch, 'insertText 应该包含有效的 ID');
      const id = idMatch[1];
      
      // ID 应该是 UUID 格式（36 个字符，包含连字符）
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
    });
    
    test('不同标题的 insertText 应该包含对应的标题文本', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      
      // 检查每个补全项的 insertText 都包含对应的标题
      for (const item of items!) {
        const insertText = item.insertText as string;
        const label = typeof item.label === 'string' ? item.label : item.label.label;
        
        // 找到对应的 symbol
        const symbol = mockSymbols.find(s => s.displayName === label);
        assert.ok(symbol, `应该找到对应的 symbol: ${label}`);
        
        // insertText 应该包含标题文本（不含 TODO 状态和标签）
        assert.ok(
          insertText.includes(symbol.text),
          `insertText 应该包含标题文本 "${symbol.text}"，实际: ${insertText}`
        );
      }
    });
  });
  
  suite('用户输入 [[id: 时的插入内容', () => {
    
    test('insertText 应该只包含 UUID][标题（不包含 id: 前缀）', async () => {
      const document = createMockDocument('[[id:', 0);
      const position = createPosition(0, 5);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      assert.ok(items!.length > 0, '应该至少返回 1 个补全项');
      
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // 检查 insertText 格式（不应该包含 id: 前缀）
      assert.ok(insertText, 'insertText 应该存在');
      assert.ok(
        !insertText.includes('id:'),
        'insertText 不应该包含 id: 前缀（因为用户已经输入了）'
      );
      
      // 应该以 UUID 开头，后面跟着 ][
      assert.ok(
        insertText.includes(']['),
        'insertText 应该包含 ][ 分隔符'
      );
      
      // 提取 ID 部分（开头到 ][ 之间的内容）
      const idMatch = insertText.match(/^([^\]\[]+)\]/);
      assert.ok(idMatch, 'insertText 应该包含有效的 ID');
      const id = idMatch[1];
      
      // ID 应该是 UUID 格式
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
      
      assert.ok(
        insertText.includes('Test Headline'),
        'insertText 应该包含标题文本'
      );
    });
  });
  
  suite('用户输入 [[id:部分查询 时的插入内容', () => {
    
    test('匹配项的 insertText 应该正确', async () => {
      const document = createMockDocument('[[id:test', 0);
      const position = createPosition(0, 9);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      
      // 检查所有返回项的 insertText 格式
      for (const item of items!) {
        const insertText = item.insertText as string;
        
        // 不应该包含 id: 前缀（因为用户已经输入了 [[id:）
        assert.ok(
          !insertText.includes('id:'),
          `insertText 不应该包含 id: 前缀，实际: ${insertText}`
        );
        
        // 应该包含 ][ 分隔符
        assert.ok(
          insertText.includes(']['),
          'insertText 应该包含 ][ 分隔符'
        );
        
        // 应该包含标题文本
        const label = typeof item.label === 'string' ? item.label : item.label.label;
        const symbol = mockSymbols.find(s => s.displayName === label);
        if (symbol) {
          assert.ok(
            insertText.includes(symbol.text),
            `insertText 应该包含标题文本 "${symbol.text}"`
          );
        }
        
        // 应该包含有效的 ID（UUID 格式）
        const idMatch = insertText.match(/^([^\]\[]+)\]/);
        if (idMatch) {
          const id = idMatch[1];
          assert.ok(
            id.length >= 32,
            `ID 应该是有效的 UUID 格式，实际: ${id}`
          );
        }
      }
    });
    
    test('中文标题的 insertText 应该正确', async () => {
      const document = createMockDocument('[[id:重要', 0);
      const position = createPosition(0, 8);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      assert.ok(items!.length > 0, '应该至少返回 1 个补全项');
      
      const item = items![0];
      const insertText = item.insertText as string;
      
      // 应该包含中文标题
      assert.ok(
        insertText.includes('重要任务'),
        `insertText 应该包含中文标题 "重要任务"，实际: ${insertText}`
      );
    });
  });
  
  suite('用户输入 [[id: id:test 时的插入内容（多余前缀）', () => {
    
    test('insertText 应该正确（自动移除多余的 id: 前缀）', async () => {
      const document = createMockDocument('[[id: id:test', 0);
      const position = createPosition(0, 13);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      
      // 检查所有返回项的 insertText 格式
      for (const item of items!) {
        const insertText = item.insertText as string;
        
        // 不应该包含 id: 前缀（因为用户已经输入了 [[id:）
        assert.ok(
          !insertText.includes('id:'),
          'insertText 不应该包含 id: 前缀'
        );
        
        // 应该包含 ][ 分隔符
        assert.ok(
          insertText.includes(']['),
          'insertText 应该包含 ][ 分隔符'
        );
        
        // 应该包含有效的 ID（UUID 格式）
        const idMatch = insertText.match(/^([^\]\[]+)\]/);
        if (idMatch) {
          const id = idMatch[1];
          assert.ok(
            id.length >= 32,
            `ID 应该是有效的 UUID 格式，实际: ${id}`
          );
        }
      }
    });
  });
  
  suite('用户输入 [[file: 时的插入内容', () => {
    
    test('不应该返回补全项（只处理 id: 链接）', async () => {
      const document = createMockDocument('[[file:', 0);
      const position = createPosition(0, 7);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.strictEqual(items, undefined, '不应该返回补全项（只处理 id: 链接）');
    });
  });
  
  suite('插入内容格式验证', () => {
    
    test('所有补全项的 insertText 都应该包含有效的 ID（UUID 格式）', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      
      for (const item of items!) {
        const insertText = item.insertText as string;
        
        // 应该以 id: 开头
        assert.ok(
          insertText.startsWith('id:'),
          `每个补全项的 insertText 都应该以 "id:" 开头，实际: ${insertText}`
        );
        
        // 提取 ID 部分
        const idMatch = insertText.match(/^id:([^\]\[]+)\]/);
        assert.ok(idMatch, `insertText 应该包含有效的 ID，实际: ${insertText}`);
        const id = idMatch[1];
        
        // ID 应该是 UUID 格式（至少 32 个字符）
        assert.ok(
          id.length >= 32,
          `ID 应该是有效的 UUID 格式（至少 32 个字符），实际: ${id}`
        );
      }
    });
    
    test('所有补全项的 insertText 都应该包含 ][ 分隔符', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      
      for (const item of items!) {
        const insertText = item.insertText as string;
        assert.ok(
          insertText.includes(']['),
          `每个补全项的 insertText 都应该包含 ][ 分隔符，实际: ${insertText}`
        );
      }
    });
    
    test('insertText 应该包含正确的标题文本（不含 TODO 状态和标签）', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      
      // 检查 "Project Task" 的 insertText（这个标题有 TODO 状态）
      const projectTaskItem = items!.find(item => {
        const label = typeof item.label === 'string' ? item.label : item.label.label;
        return label === 'Project Task';
      });
      
      if (projectTaskItem) {
        const insertText = projectTaskItem.insertText as string;
        // 应该包含 "Project Task"（不含 "TODO"）
        assert.ok(
          insertText.includes('Project Task'),
          'insertText 应该包含标题文本 "Project Task"'
        );
        assert.ok(
          !insertText.includes('TODO'),
          'insertText 不应该包含 TODO 状态'
        );
        assert.ok(
          !insertText.includes('work'),
          'insertText 不应该包含标签'
        );
      }
    });
  });
  
  suite('边界情况', () => {
    
    test('空文档不应该返回补全项', async () => {
      const document = createMockDocument('', 0);
      const position = createPosition(0, 0);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.strictEqual(items, undefined, '空文档不应该返回补全项');
    });
    
    test('没有匹配的标题时应该返回空数组', async () => {
      // 设置空的 symbols
      mockIndexService.getAllSymbols = async () => [];
      
      const document = createMockDocument('[[id:test', 0);
      const position = createPosition(0, 9);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回数组（即使是空的）');
      assert.strictEqual(items!.length, 0, '应该返回空数组');
    });
    
    test('光标在已有 [ 之后输入 [ 触发补全', async () => {
      // 场景：用户已经输入了 [rand_text，光标在第一个 [ 之后
      // 然后输入第二个 [，变成 [[rand_text，光标在第二个 [ 之后
      const document = createMockDocument('[rand_text', 0);
      const position = createPosition(0, 1); // 光标在第一个 [ 之后
      
      // 模拟用户输入第二个 [，文本变成 [[rand_text，光标移动到第二个 [ 之后
      const documentWithDoubleBracket = createMockDocument('[[rand_text', 0);
      const positionAfterSecondBracket = createPosition(0, 2); // 光标在第二个 [ 之后
      
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(documentWithDoubleBracket, positionAfterSecondBracket, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      assert.ok(items!.length > 0, '应该至少返回 1 个补全项');
      
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // insertText 应该以 id: 开头（因为用户只输入了 [[，没有输入 id:）
      assert.ok(
        insertText.startsWith('id:'),
        `insertText 应该以 "id:" 开头，实际: ${insertText}`
      );
      
      // 因为 [[ 后面有非 id: 的文本（rand_text），insertText 应该包含结尾的 ]]
      // 以避免 VS Code 自动闭合时包含后面的文本
      assert.ok(
        insertText.endsWith(']]'),
        `insertText 应该包含结尾的 "]]"，实际: ${insertText}`
      );
      
      // 应该包含 ][ 分隔符
      assert.ok(
        insertText.includes(']['),
        'insertText 应该包含 ][ 分隔符'
      );
      
      // 应该包含有效的 ID（UUID 格式）
      const idMatch = insertText.match(/^id:([^\]\[]+)\]/);
      assert.ok(idMatch, `insertText 应该包含有效的 ID，实际: ${insertText}`);
      const id = idMatch[1];
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式（至少 32 个字符），实际: ${id}`
      );
      
      // 应该包含标题文本
      assert.ok(
        insertText.includes('Test Headline') || insertText.includes('Project Task') || insertText.includes('重要任务'),
        'insertText 应该包含标题文本'
      );
    });
    
    test('光标在已有 [rand_text 之后输入 [ 然后选择补全项', async () => {
      // 场景：用户已经输入了 [rand_text，光标在末尾
      // 然后输入第二个 [，变成 [[rand_text，光标在第二个 [ 之后
      // 选择补全项后，应该插入链接，rand_text 保留在链接外面
      const document = createMockDocument('[[rand_text', 0);
      const position = createPosition(0, 2); // 光标在第二个 [ 之后
      
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined, '应该返回补全项');
      assert.ok(items!.length > 0, '应该至少返回 1 个补全项');
      
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // insertText 应该以 id: 开头
      assert.ok(
        insertText.startsWith('id:'),
        `insertText 应该以 "id:" 开头，实际: ${insertText}`
      );
      
      // 因为 [[ 后面有非 id: 的文本，insertText 应该包含结尾的 ]]
      // 以避免 VS Code 自动闭合时包含后面的文本
      assert.ok(
        insertText.endsWith(']]'),
        `insertText 应该包含结尾的 "]]"，实际: ${insertText}`
      );
      
      // 检查 range：应该从第二个 [ 之后开始替换
      assert.ok(firstItem.range, 'range 应该存在');
      const range = (firstItem.range as any).start !== undefined 
        ? firstItem.range as any
        : (firstItem.range as any).replacing || (firstItem.range as any).inserting;
      
      assert.ok(range, 'range 应该存在');
      assert.strictEqual(range.start.character, 2, 'range 应该从第二个 [ 之后开始（位置 2）');
      assert.strictEqual(range.end.character, 2, 'range 应该到光标位置结束（保留 rand_text）');
      
      // 模拟选择补全项后的结果
      // 原始文本: [[rand_text
      // 选择补全项后，应该变成: [[id:UUID][标题]]rand_text
      // rand_text 应该保留在链接外面
      const originalText = '[[rand_text';
      const beforeInsert = originalText.substring(0, range.start.character);
      const afterInsert = originalText.substring(range.end.character);
      const finalText = beforeInsert + insertText + afterInsert;
      
      // 验证最终文本格式
      assert.ok(
        finalText.startsWith('[[id:'),
        `最终文本应该以 "[[id:" 开头，实际: ${finalText}`
      );
      
      // 验证链接格式正确（包含 ]]
      assert.ok(
        finalText.includes(']]'),
        `最终文本应该包含 "]]"，实际: ${finalText}`
      );
      
      // 验证 rand_text 保留在链接外面
      const linkEndIndex = finalText.indexOf(']]');
      assert.ok(linkEndIndex !== -1, '应该找到链接的结束位置');
      const textAfterLink = finalText.substring(linkEndIndex + 2);
      assert.ok(
        textAfterLink.includes('rand_text'),
        `rand_text 应该保留在链接外面，实际: ${finalText}`
      );
      
      // 验证 rand_text 不在链接标题中
      const linkMatch = finalText.match(/\[\[id:[^\]]+\]\[([^\]]+)\]\](.*)$/);
      if (linkMatch) {
        const linkTitle = linkMatch[1];
        const textAfterLink2 = linkMatch[2];
        assert.ok(
          !linkTitle.includes('rand_text'),
          `链接标题不应该包含 "rand_text"，实际标题: ${linkTitle}`
        );
        assert.ok(
          textAfterLink2.includes('rand_text'),
          `rand_text 应该在链接外面，实际: ${textAfterLink2}`
        );
      }
    });
  });
  
  suite('补全后插入的完整文本验证', () => {
    
    test('用户输入 [[ 选择补全项后，应该插入完整的链接格式', async () => {
      const document = createMockDocument('[[', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // 模拟补全后的完整文本
      // 原始: [[
      // 插入后: [[id:UUID][标题]
      const originalText = '[[';
      const range = (firstItem.range as any).start !== undefined 
        ? firstItem.range as any
        : (firstItem.range as any).replacing || (firstItem.range as any).inserting;
      
      const beforeInsert = originalText.substring(0, range.start.character);
      const afterInsert = originalText.substring(range.end.character);
      const finalText = beforeInsert + insertText + afterInsert;
      
      // 验证最终文本格式
      assert.ok(
        finalText.startsWith('[[id:'),
        `最终文本应该以 "[[id:" 开头，实际: ${finalText}`
      );
      
      // 验证包含 ][ 分隔符
      assert.ok(
        finalText.includes(']['),
        `最终文本应该包含 "][" 分隔符，实际: ${finalText}`
      );
      
      // 验证 ID 格式
      const idMatch = finalText.match(/\[\[id:([^\]\[]+)\]/);
      assert.ok(idMatch, `最终文本应该包含有效的 ID，实际: ${finalText}`);
      const id = idMatch[1];
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
      
      // 验证标题文本
      const label = typeof firstItem.label === 'string' ? firstItem.label : firstItem.label.label;
      const symbol = mockSymbols.find(s => s.displayName === label);
      if (symbol) {
        assert.ok(
          finalText.includes(symbol.text),
          `最终文本应该包含标题文本 "${symbol.text}"，实际: ${finalText}`
        );
      }
    });
    
    test('用户输入 [[id: 选择补全项后，应该插入正确的链接格式', async () => {
      const document = createMockDocument('[[id:', 0);
      const position = createPosition(0, 5);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // 模拟补全后的完整文本
      // 原始: [[id:
      // 插入后: [[id:UUID][标题]
      const originalText = '[[id:';
      const range = (firstItem.range as any).start !== undefined 
        ? firstItem.range as any
        : (firstItem.range as any).replacing || (firstItem.range as any).inserting;
      
      const beforeInsert = originalText.substring(0, range.start.character);
      const afterInsert = originalText.substring(range.end.character);
      const finalText = beforeInsert + insertText + afterInsert;
      
      // 验证最终文本格式
      assert.ok(
        finalText.startsWith('[[id:'),
        `最终文本应该以 "[[id:" 开头，实际: ${finalText}`
      );
      
      // 验证不包含重复的 id:
      const idCount = (finalText.match(/id:/g) || []).length;
      assert.strictEqual(
        idCount,
        1,
        `最终文本应该只包含一个 "id:"，实际: ${finalText}`
      );
      
      // 验证包含 ][ 分隔符
      assert.ok(
        finalText.includes(']['),
        `最终文本应该包含 "][" 分隔符，实际: ${finalText}`
      );
      
      // 验证 ID 格式
      const idMatch = finalText.match(/\[\[id:([^\]\[]+)\]/);
      assert.ok(idMatch, `最终文本应该包含有效的 ID，实际: ${finalText}`);
      const id = idMatch[1];
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
    });
    
    test('用户输入 [[rand_text 选择补全项后，应该正确插入链接且 rand_text 保留在外面', async () => {
      const document = createMockDocument('[[rand_text', 0);
      const position = createPosition(0, 2);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // 因为 [[ 后面有非 id: 的文本，insertText 应该包含结尾的 ]]
      assert.ok(
        insertText.endsWith(']]'),
        `insertText 应该包含结尾的 "]]"，实际: ${insertText}`
      );
      
      // 模拟补全后的完整文本
      // 原始: [[rand_text
      // 插入后: [[id:UUID][标题]]rand_text
      // rand_text 应该保留在链接外面，不在链接标题中
      const originalText = '[[rand_text';
      const range = (firstItem.range as any).start !== undefined 
        ? firstItem.range as any
        : (firstItem.range as any).replacing || (firstItem.range as any).inserting;
      
      const beforeInsert = originalText.substring(0, range.start.character);
      const afterInsert = originalText.substring(range.end.character);
      const finalText = beforeInsert + insertText + afterInsert;
      
      // 验证最终文本格式
      assert.ok(
        finalText.startsWith('[[id:'),
        `最终文本应该以 "[[id:" 开头，实际: ${finalText}`
      );
      
      // 验证链接格式正确（包含 ]]
      assert.ok(
        finalText.includes(']]'),
        `最终文本应该包含 "]]"，实际: ${finalText}`
      );
      
      // 验证保留了 rand_text，且在链接外面
      assert.ok(
        finalText.includes('rand_text'),
        `最终文本应该保留原有的 "rand_text"，实际: ${finalText}`
      );
      
      // 验证 rand_text 不在链接标题中
      const linkMatch = finalText.match(/\[\[id:([^\]]+)\]\[([^\]]+)\]\](.*)$/);
      assert.ok(linkMatch, `最终文本应该匹配链接格式，实际: ${finalText}`);
      const linkTitle = linkMatch[2];
      const textAfterLink = linkMatch[3];
      
      assert.ok(
        !linkTitle.includes('rand_text'),
        `链接标题不应该包含 "rand_text"，实际标题: ${linkTitle}`
      );
      assert.ok(
        textAfterLink.includes('rand_text'),
        `rand_text 应该在链接外面，实际: ${textAfterLink}`
      );
      
      // 验证 ID 格式
      const id = linkMatch[1];
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
      
      // 验证最终格式：[[id:UUID][标题]]rand_text
      const expectedPattern = /^\[\[id:[^\]]+\]\[[^\]]+\]\]rand_text$/;
      assert.ok(
        expectedPattern.test(finalText),
        `最终文本格式应该是 [[id:UUID][标题]]rand_text，实际: ${finalText}`
      );
    });
    
    test('用户输入 [[id:test 选择补全项后，应该替换查询文本', async () => {
      const document = createMockDocument('[[id:test', 0);
      const position = createPosition(0, 9);
      const token = createCancellationToken();
      const context = createCompletionContext();
      
      const items = await provider.provideCompletionItems(document, position, token, context);
      
      assert.ok(items !== undefined);
      assert.ok(items!.length > 0, '应该至少返回 1 个匹配的补全项');
      
      const firstItem = items![0];
      const insertText = firstItem.insertText as string;
      
      // 模拟补全后的完整文本
      // 原始: [[id:test
      // 插入后: [[id:UUID][标题]
      const originalText = '[[id:test';
      const range = (firstItem.range as any).start !== undefined 
        ? firstItem.range as any
        : (firstItem.range as any).replacing || (firstItem.range as any).inserting;
      
      const beforeInsert = originalText.substring(0, range.start.character);
      const afterInsert = originalText.substring(range.end.character);
      const finalText = beforeInsert + insertText + afterInsert;
      
      // 验证最终文本格式
      assert.ok(
        finalText.startsWith('[[id:'),
        `最终文本应该以 "[[id:" 开头，实际: ${finalText}`
      );
      
      // 验证不包含 "test"（查询文本应该被替换）
      assert.ok(
        !finalText.includes('test') || finalText.includes('Test Headline'),
        `最终文本不应该包含查询文本 "test"（除非标题包含它），实际: ${finalText}`
      );
      
      // 验证包含 ][ 分隔符
      assert.ok(
        finalText.includes(']['),
        `最终文本应该包含 "][" 分隔符，实际: ${finalText}`
      );
      
      // 验证 ID 格式
      const idMatch = finalText.match(/\[\[id:([^\]\[]+)\]/);
      assert.ok(idMatch, `最终文本应该包含有效的 ID，实际: ${finalText}`);
      const id = idMatch[1];
      assert.ok(
        id.length >= 32,
        `ID 应该是有效的 UUID 格式，实际: ${id}`
      );
    });
  });
});
