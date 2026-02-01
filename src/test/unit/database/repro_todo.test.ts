
import * as assert from 'assert';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';
import { ConfigService } from '../../../services/configService';

suite('Reproduction: Custom TODO Keywords Extraction', () => {
    let extractor: UniorgAstExtractor;

    setup(() => {
        extractor = new UniorgAstExtractor();
    });

    test('should NOT recognize NEXT if not configured', () => {
        const content = '* NEXT Task';
        const processor = unified().use(uniorgParse as any);
        const ast = processor.parse(content);
        const headings = extractor.extractHeadings(ast, 'test.org', content);

        assert.strictEqual(headings.length, 1);
        assert.strictEqual(headings[0].todoState, undefined);
    });

    test('should recognize NEXT with correct todoKeywords config', () => {
        const content = '* NEXT Task';
        const processor = unified().use(uniorgParse as any, {
            todoKeywords: ['TODO', 'NEXT', 'DONE']
        });

        const ast = processor.parse(content);
        const headings = extractor.extractHeadings(ast, 'test.org', content, ['DONE']);

        assert.strictEqual(headings.length, 1);
        assert.strictEqual(headings[0].todoState, 'NEXT');
        assert.strictEqual(headings[0].todoCategory, 'todo');
        assert.strictEqual(headings[0].title, 'Task');
    });

    test('should recognize custom DONE status', () => {
        const content = '* FINISHED Task';
        const processor = unified().use(uniorgParse as any, {
            todoKeywords: ['TODO', 'FINISHED']
        });

        const ast = processor.parse(content);
        const headings = extractor.extractHeadings(ast, 'test.org', content, ['FINISHED']);

        assert.strictEqual(headings.length, 1);
        assert.strictEqual(headings[0].todoState, 'FINISHED');
        assert.strictEqual(headings[0].todoCategory, 'done');
    });

    test('should work with ConfigService', () => {
        // Mock config: TODO NEXT | DONE FINISHED
        const config = new ConfigService('TODO NEXT | DONE FINISHED', 'TODO');
        const content = '* NEXT Task 1\n* FINISHED Task 2';

        const processor = unified().use(uniorgParse as any, {
            todoKeywords: config.getAllKeywordStrings()
        });

        const ast = processor.parse(content);
        const doneKeywords = config.getDoneKeywords().map(k => k.keyword);
        const headings = extractor.extractHeadings(ast, 'test.org', content, doneKeywords);

        assert.strictEqual(headings.length, 2);

        assert.strictEqual(headings[0].todoState, 'NEXT');
        assert.strictEqual(headings[0].todoCategory, 'todo');

        assert.strictEqual(headings[1].todoState, 'FINISHED');
        assert.strictEqual(headings[1].todoCategory, 'done');
    });
});
