import * as assert from 'assert';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';

describe('UniorgAstExtractor', () => {
    let extractor: UniorgAstExtractor;

    beforeEach(() => {
        extractor = new UniorgAstExtractor();
    });

    describe('extractHeadings', () => {
        it('should extract a simple heading', () => {
            const content = '* TODO Test Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].title, 'Test Heading');
            assert.strictEqual(headings[0].level, 1);
            assert.strictEqual(headings[0].todoState, 'TODO');
            assert.strictEqual(headings[0].todoCategory, 'todo');
        });

        it('should extract heading with priority', () => {
            const content = '* TODO [#A] Important Task';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].priority, 'A');
            assert.strictEqual(headings[0].title, 'Important Task');
        });

        it('should extract heading with tags', () => {
            const content = '* Heading :work:urgent:';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.deepStrictEqual(headings[0].tags, ['work', 'urgent']);
        });

        it('should extract nested headings with parent-child relationship', () => {
            const content = `* Parent Heading
** Child Heading 1
** Child Heading 2
*** Grandchild Heading`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 4);
            assert.strictEqual(headings[0].level, 1);
            assert.strictEqual(headings[0].title, 'Parent Heading');
            assert.strictEqual(headings[0].parentId, undefined);

            assert.strictEqual(headings[1].level, 2);
            assert.strictEqual(headings[1].title, 'Child Heading 1');
            assert.ok(headings[1].parentId, 'Child should have parentId');
            assert.strictEqual(headings[1].parentId, headings[0].id);

            assert.strictEqual(headings[2].level, 2);
            assert.strictEqual(headings[2].parentId, headings[0].id);

            assert.strictEqual(headings[3].level, 3);
            assert.strictEqual(headings[3].parentId, headings[2].id);
        });

        it('should extract DONE heading', () => {
            const content = '* DONE Completed Task';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].todoState, 'DONE');
            assert.strictEqual(headings[0].todoCategory, 'done');
        });

        it('should handle heading without TODO keyword', () => {
            const content = '* Regular Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].todoState, undefined);
            assert.strictEqual(headings[0].todoCategory, undefined);
        });

        it('should extract heading with properties including ID', () => {
            const content = `* Heading with ID
:PROPERTIES:
:ID: abc-123-def
:CUSTOM: value
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].id, 'abc-123-def');
            assert.strictEqual(headings[0].properties.ID, 'abc-123-def');
            assert.strictEqual(headings[0].properties.CUSTOM, 'value');
        });

        it('should generate ID from file URI and line number if no ID property', () => {
            const content = '* Heading without ID';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].id.startsWith('/test/file.org:'));
        });
    });

    describe('extractLinks', () => {
        it('should extract file link', () => {
            const content = '* Heading\n[[file:other.org][Link to other file]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'file');
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].linkText, 'Link to other file');
        });

        it('should extract ID link', () => {
            const content = '* Heading\n[[id:abc-123][Link to ID]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'id');
            assert.strictEqual(links[0].targetId, 'abc-123');
            assert.strictEqual(links[0].linkText, 'Link to ID');
        });

        it('should extract HTTP link', () => {
            const content = '* Heading\n[[https://example.com][Example]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].linkType, 'http');
            assert.strictEqual(links[0].targetUri, 'https://example.com');
        });

        it('should extract link with heading anchor', () => {
            const content = '* Heading\n[[file:other.org::*Target Heading][Link]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].targetHeadingId, 'Target Heading');
        });

        it('should extract link with custom ID anchor', () => {
            const content = '* Heading\n[[file:other.org::#custom-id][Link]]';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].targetUri, 'other.org');
            assert.strictEqual(links[0].targetId, 'custom-id');
        });

        it('should associate link with source heading', () => {
            const content = `* Heading with ID
:PROPERTIES:
:ID: source-heading-id
:END:
[[file:other.org][Link]]`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0].sourceHeadingId, 'source-heading-id');
        });

        it('should extract multiple links', () => {
            const content = `* Heading
[[file:file1.org][Link 1]]
[[file:file2.org][Link 2]]
[[id:abc-123][Link 3]]`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(links.length, 3);
        });
    });

    describe('extractFileMetadata', () => {
        it('should extract file title', () => {
            const content = '#+TITLE: My Document\n* Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.strictEqual(metadata.title, 'My Document');
        });

        it('should extract file-level tags from first heading', () => {
            const content = '* First Heading :tag1:tag2:\n** Second Heading';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.deepStrictEqual(metadata.tags, ['tag1', 'tag2']);
        });

        it('should return empty metadata if no title or tags', () => {
            const content = '* Heading without tags';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const metadata = extractor.extractFileMetadata(ast);

            assert.strictEqual(metadata.title, undefined);
            assert.deepStrictEqual(metadata.tags, []);
        });
    });

    describe('timestamp extraction', () => {
        it('should extract SCHEDULED timestamp', () => {
            const content = `* TODO Task
:PROPERTIES:
:SCHEDULED: <2024-01-28 Sun>
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].scheduled);
            assert.strictEqual(headings[0].scheduled!.getFullYear(), 2024);
            assert.strictEqual(headings[0].scheduled!.getMonth(), 0); // January
            assert.strictEqual(headings[0].scheduled!.getDate(), 28);
        });

        it('should extract DEADLINE timestamp', () => {
            const content = `* TODO Task
:PROPERTIES:
:DEADLINE: <2024-01-30 Tue>
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].deadline);
            assert.strictEqual(headings[0].deadline!.getDate(), 30);
        });

        it('should extract CLOSED timestamp', () => {
            const content = `* DONE Task
:PROPERTIES:
:CLOSED: [2024-01-27 Sat]
:END:`;

            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 1);
            assert.ok(headings[0].closed);
            assert.strictEqual(headings[0].closed!.getDate(), 27);
        });
    });

    describe('edge cases', () => {
        it('should handle empty document', () => {
            const content = '';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');
            const links = extractor.extractLinks(ast, '/test/file.org');

            assert.strictEqual(headings.length, 0);
            assert.strictEqual(links.length, 0);
        });

        it('should handle document with only text', () => {
            const content = 'Just some text without headings';
            const parser = unified().use(uniorgParse as any);
            const ast = parser.parse(content);

            const headings = extractor.extractHeadings(ast, '/test/file.org');

            assert.strictEqual(headings.length, 0);
        });

        it('should handle complex nested structure', () => {
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

            const headings = extractor.extractHeadings(ast, '/test/file.org');
            const links = extractor.extractLinks(ast, '/test/file.org');
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
    });
});
