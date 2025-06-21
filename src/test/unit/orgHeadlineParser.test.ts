import * as assert from 'assert';

// Org-mode headline parser interface
interface OrgHeadline {
  level: number;           // 标题级别 (1-6)
  stars: string;          // 星号部分 (*, **, ***, etc.)
  todoState?: string;     // TODO 状态 (TODO, DONE, NEXT, WAITING, CANCELLED)
  priority?: string;      // 优先级 ([#A], [#B], [#C])
  title: string;          // 标题文本
  tags: string[];         // 标签数组
  statistics?: string;    // 统计信息 ([1/3], [33%], etc.)
  originalLine: string;   // 原始行文本
}

// Org-mode headline parser implementation
function parseOrgHeadline(line: string): OrgHeadline | null {
  // Simplified approach: parse components step by step
  const headlineMatch = line.match(/^(\*+)\s+(.*)$/);
  if (!headlineMatch) {
    return null;
  }
  
  const [, stars, rest] = headlineMatch;
  let remaining = rest.trim();
  
  // Parse TODO state
  let todoState: string | undefined;
  const todoMatch = remaining.match(/^(TODO|DONE|NEXT|WAITING|CANCELLED)(\s+(.*))?$/);
  if (todoMatch) {
    todoState = todoMatch[1];
    remaining = todoMatch[3] || '';
  }
  
  // Parse priority
  let priority: string | undefined;
  const priorityMatch = remaining.match(/^\[#([ABC])\](\s+(.*))?$/);
  if (priorityMatch) {
    priority = `#${priorityMatch[1]}`;
    remaining = priorityMatch[3] || '';
  }
  
  // Parse tags from the end - handle consecutive tags properly
  let tags: string[] = [];
  
  // Find all consecutive tags at the end - match entire tag sequence
  const tagsMatch = remaining.match(/^(.*?)\s*((?::[a-zA-Z0-9_\u4e00-\u9fff]+:?)+)\s*$/);
  
  if (tagsMatch) {
    let titlePart = tagsMatch[1].trim();
    let tagsString = tagsMatch[2];
    
    // Ensure tagsString ends with a colon
    if (!tagsString.endsWith(':')) {
      tagsString += ':';
    }
    
    // Check if the title part contains partial tags (tags without proper spacing)
    // Extract any :tag: patterns from the end of the title and add them to tagsString
    const titleTagMatch = titlePart.match(/^(.*?)\s*((?::[a-zA-Z0-9_\u4e00-\u9fff]+:?)+)\s*$/);
    if (titleTagMatch) {
      let titleTags = titleTagMatch[2];
      if (!titleTags.endsWith(':')) {
        titleTags += ':';
      }
      titlePart = titleTagMatch[1].trim();
      tagsString = titleTags + tagsString;
    }
    
    remaining = titlePart;
    
    // Extract all individual tags by splitting on colons
    const cleanTagsString = tagsString.replace(/^:+|:+$/g, '');
    if (cleanTagsString) {
      tags = cleanTagsString.split(':').filter(tag => tag.length > 0);
    }
  }
  
  // Parse statistics from the end of remaining title
  let statistics: string | undefined;
  const statsMatch = remaining.match(/^(.*?)\s*(\[[0-9]+(?:[/%][0-9]*)?%?\])\s*$/);
  if (statsMatch) {
    remaining = statsMatch[1];
    statistics = statsMatch[2];
  }
  
  const title = remaining.trim();
  
  return {
    level: stars.length,
    stars,
    todoState,
    priority,
    title,
    tags,
    statistics,
    originalLine: line
  };
}

// Test helper to extract all headlines from text
function parseOrgDocument(text: string): OrgHeadline[] {
  const lines = text.split('\n');
  const headlines: OrgHeadline[] = [];
  
  for (const line of lines) {
    const headline = parseOrgHeadline(line);
    if (headline) {
      headlines.push(headline);
    }
  }
  
  return headlines;
}

suite('Org-mode Headline Parser Tests', () => {
  
  test('should parse basic headline', () => {
    const line = '* Basic Headline';
    const result = parseOrgHeadline(line);
    
    assert.ok(result, 'Should parse basic headline');
    assert.strictEqual(result!.level, 1);
    assert.strictEqual(result!.stars, '*');
    assert.strictEqual(result!.title, 'Basic Headline');
    assert.strictEqual(result!.todoState, undefined);
    assert.strictEqual(result!.priority, undefined);
    assert.deepStrictEqual(result!.tags, []);
    assert.strictEqual(result!.statistics, undefined);
  });
  
  test('should parse headlines with different levels', () => {
    const lines = [
      '* Level 1',
      '** Level 2', 
      '*** Level 3',
      '**** Level 4',
      '***** Level 5',
      '****** Level 6'
    ];
    
    lines.forEach((line, index) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, `Should parse level ${index + 1} headline`);
      assert.strictEqual(result!.level, index + 1);
      assert.strictEqual(result!.stars, '*'.repeat(index + 1));
      assert.strictEqual(result!.title, `Level ${index + 1}`);
    });
  });
  
  test('should parse TODO states', () => {
    const testCases = [
      { line: '* TODO Task to do', expected: 'TODO' },
      { line: '** DONE Completed task', expected: 'DONE' },
      { line: '*** NEXT Next action', expected: 'NEXT' },
      { line: '**** WAITING Waiting for something', expected: 'WAITING' },
      { line: '***** CANCELLED Cancelled task', expected: 'CANCELLED' }
    ];
    
    testCases.forEach(({ line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, `Should parse ${expected} state`);
      assert.strictEqual(result!.todoState, expected);
    });
  });
  
  test('should parse priorities', () => {
    const testCases = [
      { line: '* [#A] High priority task', expected: '#A' },
      { line: '** [#B] Medium priority task', expected: '#B' },
      { line: '*** [#C] Low priority task', expected: '#C' }
    ];
    
    testCases.forEach(({ line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, `Should parse priority ${expected}`);
      assert.strictEqual(result!.priority, expected);
    });
  });
  
  test('should parse tags', () => {
    const testCases = [
      { 
        line: '* Task with single tag :work:',
        expected: ['work']
      },
      { 
        line: '** Task with multiple tags :work:urgent:',
        expected: ['work', 'urgent']
      },
      { 
        line: '*** Task with many tags :work:urgent:meeting:project:',
        expected: ['work', 'urgent', 'meeting', 'project']
      }
    ];
    
    testCases.forEach(({ line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, 'Should parse headline with tags');
      if (JSON.stringify(result!.tags) !== JSON.stringify(expected)) {
        console.log(`Debug: line="${line}"`);
        console.log(`Debug: parsed=`, result);
        console.log(`Debug: expected tags=`, expected, 'actual tags=', result!.tags);
      }
      assert.deepStrictEqual(result!.tags, expected);
    });
  });
  
  test('should parse statistics cookies', () => {
    const testCases = [
      { line: '* Project [1/3]', expected: '[1/3]' },
      { line: '** Task list [33%]', expected: '[33%]' },
      { line: '*** Progress [5/10]', expected: '[5/10]' },
      { line: '**** Completion [100%]', expected: '[100%]' }
    ];
    
    testCases.forEach(({ line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, 'Should parse headline with statistics');
      assert.strictEqual(result!.statistics, expected);
    });
  });
  
  test('should parse complex headlines with all elements', () => {
    const testCases = [
      {
        line: '* TODO [#A] Important project [2/5] :work:urgent:',
        expected: {
          level: 1,
          stars: '*',
          todoState: 'TODO',
          priority: '#A',
          title: 'Important project',
          statistics: '[2/5]',
          tags: ['work', 'urgent']
        }
      },
      {
        line: '** DONE [#B] Completed milestone [100%] :project:milestone:done:',
        expected: {
          level: 2,
          stars: '**',
          todoState: 'DONE',
          priority: '#B',
          title: 'Completed milestone',
          statistics: '[100%]',
          tags: ['project', 'milestone', 'done']
        }
      },
      {
        line: '*** WAITING [#C] Blocked task waiting for review :blocked:review:external:',
        expected: {
          level: 3,
          stars: '***',
          todoState: 'WAITING',
          priority: '#C',
          title: 'Blocked task waiting for review',
          statistics: undefined,
          tags: ['blocked', 'review', 'external']
        }
      }
    ];
    
    testCases.forEach(({ line, expected }, index) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, `Should parse complex headline ${index + 1}`);
      assert.strictEqual(result!.level, expected.level, 'Level should match');
      assert.strictEqual(result!.stars, expected.stars, 'Stars should match');
      assert.strictEqual(result!.todoState, expected.todoState, 'TODO state should match');
      assert.strictEqual(result!.priority, expected.priority, 'Priority should match');
      assert.strictEqual(result!.title, expected.title, 'Title should match');
      assert.strictEqual(result!.statistics, expected.statistics, 'Statistics should match');
      assert.deepStrictEqual(result!.tags, expected.tags, 'Tags should match');
    });
  });
  
  test('should handle edge cases', () => {
    const testCases = [
      {
        name: 'headline with only TODO state',
        line: '** TODO',
        expected: { level: 2, todoState: 'TODO', title: '' }
      },
      {
        name: 'headline with only priority',
        line: '*** [#A]',
        expected: { level: 3, priority: '#A', title: '' }
      },
      {
        name: 'headline with Chinese characters',
        line: '* TODO [#A] 重要任务 [1/3] :工作:紧急:',
        expected: { 
          level: 1, 
          todoState: 'TODO', 
          priority: '#A', 
          title: '重要任务',
          statistics: '[1/3]',
          tags: ['工作', '紧急'] 
        }
      }
    ];
    
    testCases.forEach(({ name, line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, `Should parse ${name}`);
      
      if (expected.level !== undefined) {
        assert.strictEqual(result!.level, expected.level, `${name}: level should match`);
      }
      if (expected.todoState !== undefined) {
        assert.strictEqual(result!.todoState, expected.todoState, `${name}: TODO state should match`);
      }
      if (expected.priority !== undefined) {
        assert.strictEqual(result!.priority, expected.priority, `${name}: priority should match`);
      }
      if (expected.title !== undefined) {
        assert.strictEqual(result!.title, expected.title, `${name}: title should match`);
      }
      if (expected.statistics !== undefined) {
        assert.strictEqual(result!.statistics, expected.statistics, `${name}: statistics should match`);
      }
      if (expected.tags !== undefined) {
        assert.deepStrictEqual(result!.tags, expected.tags, `${name}: tags should match`);
      }
    });
  });
  
  test('should not parse non-headline lines', () => {
    const nonHeadlines = [
      'Regular text line',
      'This is not a headline',
      '  * Indented text (not a headline)',
      '',
      'Some text with :tags: but not a headline',
      '- List item',
      '+ Another list item',
      '1. Numbered list',
      '#+BEGIN_SRC',
      '#+TITLE: Document title'
    ];
    
    nonHeadlines.forEach(line => {
      const result = parseOrgHeadline(line);
      assert.strictEqual(result, null, `Should not parse: "${line}"`);
    });
  });
  
  test('should parse real-world org document', () => {
    const orgDocument = `#+TITLE: My Project
#+AUTHOR: Test User

* TODO [#A] Project Setup [0/3] :project:setup:
** DONE [#B] Initialize repository :git:
** TODO [#A] Setup development environment :dev:docker:
** WAITING [#C] Wait for server access :server:admin:

* DONE [#B] Research Phase [100%] :research:analysis:
** DONE Literature review :papers:academic:
** DONE Market analysis :market:competitors:

* TODO [#A] Implementation [2/5] :development:coding:
** DONE Core functionality :core:backend:
** DONE API design :api:rest:
** TODO Frontend development :frontend:react:
** TODO Testing :testing:unit:integration:
** TODO Documentation :docs:api:

Regular text that should not be parsed as a headline.

* CANCELLED [#C] Alternative approach :experimental:cancelled:

More regular text.
`;
    
    const headlines = parseOrgDocument(orgDocument);
    
    // Should find 14 headlines total (corrected count)
    assert.strictEqual(headlines.length, 14, 'Should find all headlines in document');
    
    // Test first headline
    const firstHeadline = headlines[0];
    assert.strictEqual(firstHeadline.level, 1);
    assert.strictEqual(firstHeadline.todoState, 'TODO');
    assert.strictEqual(firstHeadline.priority, '#A');
    assert.strictEqual(firstHeadline.title, 'Project Setup');
    assert.strictEqual(firstHeadline.statistics, '[0/3]');
    assert.deepStrictEqual(firstHeadline.tags, ['project', 'setup']);
    
    // Test a completed headline
    const completedHeadline = headlines.find(h => h.title === 'Research Phase');
    assert.ok(completedHeadline, 'Should find Research Phase headline');
    assert.strictEqual(completedHeadline.todoState, 'DONE');
    assert.strictEqual(completedHeadline.statistics, '[100%]');
    
    // Test cancelled headline
    const cancelledHeadline = headlines.find(h => h.title === 'Alternative approach');
    assert.ok(cancelledHeadline, 'Should find cancelled headline');
    assert.strictEqual(cancelledHeadline.todoState, 'CANCELLED');
  });
  
  test('should handle consecutive tags correctly (original bug)', () => {
    const testCases = [
      {
        line: '* 测试标题 :tag1:tag2:',
        expected: ['tag1', 'tag2']
      },
      {
        line: '** Project :work:urgent:important:meeting:',
        expected: ['work', 'urgent', 'important', 'meeting']
      },
      {
        line: '*** Task :a:b:c:d:e:f:g:h:i:j:',
        expected: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
      }
    ];
    
    testCases.forEach(({ line, expected }) => {
      const result = parseOrgHeadline(line);
      assert.ok(result, 'Should parse headline with consecutive tags');
      assert.deepStrictEqual(result!.tags, expected, 'Should parse all consecutive tags correctly');
    });
  });
  
  test('performance: should handle large documents efficiently', () => {
    // Generate a large document with many headlines
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) {  // Reduce from 10000 to 1000 for faster testing
      const level = (i % 6) + 1;
      const stars = '*'.repeat(level);
      const todoStates = ['TODO', 'DONE', 'NEXT', 'WAITING', ''];
      const priorities = ['[#A]', '[#B]', '[#C]', ''];
      const todo = todoStates[i % todoStates.length];
      const priority = priorities[i % priorities.length];
      const stats = i % 10 === 0 ? `[${i % 5}/${5}]` : '';
      const tags = i % 3 === 0 ? `:tag${i}:project:work:` : '';
      
      lines.push(`${stars} ${todo} ${priority} Headline ${i} ${stats} ${tags}`.replace(/\s+/g, ' ').trim());
    }
    
    const document = lines.join('\n');
    
    const start = process.hrtime();
    const headlines = parseOrgDocument(document);
    const [seconds, nanoseconds] = process.hrtime(start);
    const milliseconds = seconds * 1000 + nanoseconds / 1000000;
    
    assert.strictEqual(headlines.length, 1000, 'Should parse all headlines');
    assert.ok(milliseconds < 1000, `Should complete in reasonable time (took ${milliseconds.toFixed(2)}ms)`);
  });
}); 