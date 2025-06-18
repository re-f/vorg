import * as assert from 'assert';
import { OrgFoldingProvider } from '../../folding/orgFoldingProvider';

// Mock VS Code types for unit testing
interface MockTextDocument {
  getText(): string;
}

interface MockFoldingRange {
  start: number;
  end: number;
  kind?: number;
}

const FoldingRangeKind = {
  Region: 3
};

suite('OrgFoldingProvider Unit Tests', () => {
  let provider: OrgFoldingProvider;
  
  setup(() => {
    provider = new OrgFoldingProvider();
  });
  
  test('应该为简单标题创建折叠范围', () => {
    const content = [
      '* 第一级标题',
      '这是内容1',
      '这是内容2',
      '* 另一个第一级标题',
      '更多内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 2);
    
    // 第一个折叠范围
    assert.strictEqual(ranges[0].start, 0);
    assert.strictEqual(ranges[0].end, 2);
    assert.strictEqual(ranges[0].kind, FoldingRangeKind.Region);
    
    // 第二个折叠范围
    assert.strictEqual(ranges[1].start, 3);
    assert.strictEqual(ranges[1].end, 4);
    assert.strictEqual(ranges[1].kind, FoldingRangeKind.Region);
  });
  
  test('应该为嵌套标题创建正确的折叠范围', () => {
    const content = [
      '* 第一级标题',
      '这是第一级内容',
      '** 第二级标题',
      '这是第二级内容',
      '*** 第三级标题',
      '这是第三级内容',
      '** 另一个第二级标题', 
      '更多第二级内容',
      '* 另一个第一级标题',
      '最后的内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 5);
    
    // 验证层级结构
    const sortedRanges = ranges.sort((a: MockFoldingRange, b: MockFoldingRange) => a.start - b.start);
    
    // 验证范围的结构 - 基于实际文档分析
    // 文档结构:
    // 0: * 第一级标题
    // 1: 这是第一级内容  
    // 2: ** 第二级标题
    // 3: 这是第二级内容
    // 4: *** 第三级标题
    // 5: 这是第三级内容
    // 6: ** 另一个第二级标题
    // 7: 更多第二级内容
    // 8: * 另一个第一级标题
    // 9: 最后的内容
    
    const ranges0To7 = sortedRanges.filter(r => r.start === 0 && r.end === 7);
    const ranges2To5 = sortedRanges.filter(r => r.start === 2 && r.end === 5);  
    const ranges4To5 = sortedRanges.filter(r => r.start === 4 && r.end === 5);
    const ranges6To7 = sortedRanges.filter(r => r.start === 6 && r.end === 7);
    const ranges8To9 = sortedRanges.filter(r => r.start === 8 && r.end === 9);
    
    // 验证各个层级的折叠都存在
    assert.strictEqual(ranges0To7.length, 1, '应该有一个0-7的折叠范围');
    assert.strictEqual(ranges2To5.length, 1, '应该有一个2-5的折叠范围');  
    assert.strictEqual(ranges4To5.length, 1, '应该有一个4-5的折叠范围');
    assert.strictEqual(ranges6To7.length, 1, '应该有一个6-7的折叠范围');
    assert.strictEqual(ranges8To9.length, 1, '应该有一个8-9的折叠范围');
  });
  
  test('应该为代码块创建折叠范围', () => {
    const content = [
      '* 标题',
      '一些内容',
      '#+BEGIN_SRC javascript',
      'function test() {',
      '  console.log("test");',
      '}',
      '#+END_SRC',
      '更多内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 2); // 一个标题折叠 + 一个代码块折叠
    
    // 找到代码块折叠
    const codeBlockRange = ranges.find((r: MockFoldingRange) => r.start === 2 && r.end === 6);
    assert.ok(codeBlockRange);
    assert.strictEqual(codeBlockRange.kind, FoldingRangeKind.Region);
  });
  
  test('应该忽略空标题（没有内容的标题）', () => {
    const content = [
      '* 标题1',
      '* 标题2', // 紧接着另一个标题，没有内容
      '一些内容',
      '* 标题3'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    // 标题2有内容"一些内容"，所以应该有折叠范围
    // 但标题3没有内容，所以不应该有折叠范围  
    // 因此只应该有一个折叠范围（标题2的）
    assert.strictEqual(ranges.length, 1);
  });
  
  test('应该为引用块创建折叠范围', () => {
    const content = [
      '* 标题',
      '一些内容',
      '#+BEGIN_QUOTE',
      '这是引用内容',
      '多行引用',
      '#+END_QUOTE',
      '更多内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 2); // 一个标题折叠 + 一个引用块折叠
    
    // 找到引用块折叠
    const quoteBlockRange = ranges.find((r: MockFoldingRange) => r.start === 2 && r.end === 5);
    assert.ok(quoteBlockRange);
    assert.strictEqual(quoteBlockRange.kind, FoldingRangeKind.Region);
  });
  
  test('应该为示例块创建折叠范围', () => {
    const content = [
      '* 标题',
      '一些内容',
      '#+BEGIN_EXAMPLE',
      '这是示例内容',
      '保持原格式',
      '#+END_EXAMPLE',
      '更多内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 2); // 一个标题折叠 + 一个示例块折叠
    
    // 找到示例块折叠
    const exampleBlockRange = ranges.find((r: MockFoldingRange) => r.start === 2 && r.end === 5);
    assert.ok(exampleBlockRange);
    assert.strictEqual(exampleBlockRange.kind, FoldingRangeKind.Region);
  });
  
  test('应该处理混合的多级标题和代码块', () => {
    const content = [
      '* 第一级标题',
      '第一级内容',
      '** 第二级标题',
      '第二级内容',
      '#+BEGIN_SRC python',
      'def hello():',
      '    print("Hello")',
      '#+END_SRC',
      '** 另一个第二级标题',
      '更多内容',
      '* 另一个第一级标题',
      '最后内容'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 5); // 4个标题折叠 + 1个代码块折叠
    
    // 验证代码块折叠存在
    const codeBlockRange = ranges.find((r: MockFoldingRange) => r.start === 4 && r.end === 7);
    assert.ok(codeBlockRange, '应该为代码块创建折叠范围');
  });
  
  test('应该处理只有标题没有内容的文档', () => {
    const content = [
      '* 标题1',
      '* 标题2',
      '* 标题3'
    ].join('\n');
    
    const document = createMockDocument(content);
    const ranges = provider.provideFoldingRanges(document as any, {} as any, {} as any) as MockFoldingRange[];
    
    assert.ok(ranges);
    assert.strictEqual(ranges.length, 0); // 没有内容，不应该有折叠范围
  });
  
  function createMockDocument(content: string): MockTextDocument {
    return {
      getText: () => content
    };
  }
}); 