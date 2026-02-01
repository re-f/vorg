
import * as assert from 'assert';
// ESM imports moved to dynamic imports in setup to support CJS environment
// import { unified } from 'unified';
// import uniorgParse from 'uniorg-parse';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';

suite('UniorgAstExtractor Tests', () => {
    let extractor: UniorgAstExtractor;

    let unified: any;
    let uniorgParse: any;

    setup(async () => {
        extractor = new UniorgAstExtractor();
        const unifiedMod = await (eval('import("unified")') as Promise<any>);
        unified = unifiedMod.unified;
        uniorgParse = (await (eval('import("uniorg-parse")') as Promise<any>)).default;
    });

    suite('extractHeadings', () => {
        test('should extract simple headings', () => {
            const content = '* Heading 1\n** Heading 2';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 2);
            assert.strictEqual(headings[0].title, 'Heading 1');
            assert.strictEqual(headings[0].level, 1);
            assert.strictEqual(headings[1].title, 'Heading 2');
            assert.strictEqual(headings[1].level, 2);
        });

        test('should extract TODO keywords and priority', () => {
            const content = '* TODO [#A] Important Task';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].todoState, 'TODO');
            assert.strictEqual(headings[0].priority, 'A');
            assert.strictEqual(headings[0].title, 'Important Task');
        });

        test('should extract tags', () => {
            const content = '* Task :work:urgent:';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.deepStrictEqual(headings[0].tags, ['work', 'urgent']);
        });

        test('should extract properties including ID', () => {
            const content = `* Task with Properties
:PROPERTIES:
:ID: my-uuid-123
:CUSTOM_PROP: custom value
:END:`;
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].id, 'my-uuid-123');
            assert.strictEqual(headings[0].properties['CUSTOM_PROP'], 'custom value');
        });

        test('should generate ID if not present', () => {
            const content = '* Task without ID';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].id.includes('/test/file.org'));
        });

        test('should handle nested hierarchy', () => {
            const content = '* Parent\n** Child 1\n** Child 2';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 3);

            const parent = headings[0];
            const child1 = headings[1];
            const child2 = headings[2];

            assert.strictEqual(child1.parentId, parent.id);
            assert.strictEqual(child2.parentId, parent.id);
        });

        test('should extract correct line numbers', () => {
            const content = '# Title\n\n* Heading 1\nContent\n* Heading 2';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            // Line numbers are 0-indexed
            // # Title (Line 0)
            // (Empty) (Line 1)
            // * Heading 1 (Line 2)
            // Content (Line 3)
            // * Heading 2 (Line 4)
            assert.strictEqual(headings.length, 2);
            assert.strictEqual(headings[0].title, 'Heading 1');
            assert.strictEqual(headings[0].startLine, 2);
            assert.strictEqual(headings[1].title, 'Heading 2');
            assert.strictEqual(headings[1].startLine, 4);
        });
    });

    suite('extractLinks', () => {
        test('should extract file links', () => {
            const content = '* Heading\n[[file:other.org][Link to Other]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'file');
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].linkText, 'Link to Other');
        });

        test('should extract ID links', () => {
            const content = '* Heading\n[[id:abc-123][Link to ID]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'id');
            assert.strictEqual(links[0].targetId, 'abc-123');
            assert.strictEqual(links[0].linkText, 'Link to ID');
        });

        test('should extract HTTP link', () => {
            const content = '* Heading\n[[https://example.com][Example]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'http');
            assert.strictEqual(links[0].targetUri, 'https://example.com');
        });

        test('should extract link with heading anchor', () => {
            const content = '* Heading\n[[file:other.org::*Target Heading][Link]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].targetHeadingId, 'Target Heading');
        });

        test('should extract link with custom ID anchor', () => {
            const content = '* Heading\n[[file:other.org::#custom-id][Link]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].targetId, 'custom-id');
        });

        test('should associate link with source heading', () => {
            const content = `* Heading with ID
:PROPERTIES:
:ID: source-heading-id
:END:
[[file:other.org][Link]]`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].sourceHeadingId, 'source-heading-id');
        });

        test('should extract multiple links', () => {
            const content = `* Heading
[[file:file1.org][Link 1]]
[[file:file2.org][Link 2]]
[[id:abc-123][Link 3]]`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(links.length, 3);
        });
    });

    suite('extractFileMetadata', () => {
        test('should extract file title', () => {
            const content = '#+TITLE: My Document\n* Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.strictEqual(metadata.title, 'My Document');
        });

        test('should extract file-level tags from first heading', () => {
            const content = '* First Heading :tag1:tag2:\n** Second Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.deepStrictEqual(metadata.tags, ['tag1', 'tag2']);
        });

        test('should return empty metadata if no title or tags', () => {
            const content = '* Heading without tags';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.strictEqual(metadata.title, undefined);
            assert.deepStrictEqual(metadata.tags, []);
        });
    });

    suite('timestamp extraction', () => {
        test('should extract SCHEDULED timestamp', () => {
            const content = `* TODO Task
:PROPERTIES:
:SCHEDULED: <2024-01-28 Sun>
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].scheduled);
            assert.strictEqual(headings[0].scheduled!.getFullYear(), 2024);
            assert.strictEqual(headings[0].scheduled!.getMonth(), 0); // January
            assert.strictEqual(headings[0].scheduled!.getDate(), 28);
        });

        test('should extract DEADLINE timestamp', () => {
            const content = `* TODO Task
:PROPERTIES:
:DEADLINE: <2024-01-30 Tue>
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].deadline);
            assert.strictEqual(headings[0].deadline!.getDate(), 30);
        });

        test('should extract CLOSED timestamp', () => {
            const content = `* DONE Task
:PROPERTIES:
:CLOSED: [2024-01-27 Sat]
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].closed);
            assert.strictEqual(headings[0].closed!.getDate(), 27);
        });
    });

    suite('edge cases', () => {
        test('should handle empty document', () => {
            const content = '';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);
            const links = extractor.extractLinks(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 0);
            assert.strictEqual(links.length, 0);
        });

        test('should handle document with only text', () => {
            const content = 'Just some text without headings';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 0);
        });

        test('should handle complex nested structure', () => {
            const content = `#+TITLE: Complex Document

* Level 1 Heading :tag1:
** TODO [#A] Level 2 Task :tag2:
:PROPERTIES:
:ID: task-id-123
:SCHEDULED: <2024-01-28 Sun>
:END:

Some content with [[file:other.org][a link]].

*** DONE Level 3 Subtask
:PROPERTIES:
:CLOSED: [2024-01-27 Sat]
:END:

** Another Level 2
* Another Level 1`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);
            const links = extractor.extractLinks(ast, '/test/file.org', content);
            const metadata = extractor.extractFileMetadata(ast);

            assert.strictEqual(metadata.title, 'Complex Document');
            assert.strictEqual(headings.length, 5);
            assert.strictEqual(links.length, 1);

            // Verify hierarchy
            const level2Task = headings.find(h => h.title === 'Level 2 Task');
            assert.ok(level2Task, 'Level 2 Task should be found');
            if (level2Task) {
                assert.strictEqual(level2Task.id, 'task-id-123');
                assert.strictEqual(level2Task.priority, 'A');
                assert.ok(level2Task.scheduled, 'should have scheduled date');
            }
        });

        test('should extract pinyin for Chinese headings', () => {
            const content = '* 测试标题 :work:';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org', content);

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].title, '测试标题');
            assert.ok(headings[0].pinyinTitle, 'should have pinyin title');
            assert.strictEqual(headings[0].pinyinTitle, 'ceshibiaoti csbt');
            assert.ok(headings[0].pinyinDisplayName, 'should have pinyin display name');
        });
    });
});
