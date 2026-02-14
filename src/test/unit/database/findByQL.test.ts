
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { OrgHeading } from '../../../database/types';
import { VOrgQLParser } from '../../../services/vorgQLParser';
import { VOrgQLTranslator } from '../../../services/vorgQLTranslator';

const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('HeadingRepository.findByQL Tests', () => {
    let db: any;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;

    setup(async function () {
        this.timeout(5000);

        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        db = new SQL.Database();
        new SchemaManager(db).initialize();

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);

        const fileUri = '/test/ql.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const testHeadings: OrgHeading[] = [
            {
                id: 'h1', fileUri, level: 1, title: 'Fix bug A', todoState: 'NEXT', todoCategory: 'todo',
                priority: 'A', tags: ['work'], startLine: 1, endLine: 2,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            },
            {
                id: 'h2', fileUri, level: 1, title: 'Document system', todoState: 'TODO', todoCategory: 'todo',
                priority: 'B', tags: ['work', 'docs'], startLine: 3, endLine: 4,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            },
            {
                id: 'h3', fileUri, level: 2, title: 'Release plan', todoState: 'DONE', todoCategory: 'done',
                priority: 'A', tags: ['work', 'management'], startLine: 5, endLine: 6,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            }
        ];

        for (const h of testHeadings) {
            headingRepo.insert(h);
        }
    });

    teardown(() => {
        if (db) db.close();
    });

    function executeQL(ql: string) {
        const ast = VOrgQLParser.parse(ql);
        const { where, params } = new VOrgQLTranslator().translate(ast);
        return headingRepo.findByQL(where, params);
    }

    test('should handle simple AND query', () => {
        const results = executeQL('(and (todo "NEXT") (prio "A"))');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Fix bug A');
    });

    test('should handle OR query', () => {
        const results = executeQL('(or (todo "DONE") (prio "B"))');
        assert.strictEqual(results.length, 2);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Document system', 'Release plan']);
    });

    test('should handle NOT query', () => {
        const results = executeQL('(and (tag "work") (not (todo "DONE")))');
        assert.strictEqual(results.length, 2);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Document system', 'Fix bug A']);
    });

    test('should handle nested logic', () => {
        const results = executeQL('(and (tag "work") (or (prio "A") (todo "TODO")))');
        assert.strictEqual(results.length, 3);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Document system', 'Fix bug A', 'Release plan']);
    });

    test('should handle multiple tags', () => {
        const results = executeQL('(tag "docs" "management")');
        assert.strictEqual(results.length, 2);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Document system', 'Release plan']);
    });

    test('should handle text search', () => {
        const results = executeQL('"system"');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Document system');
    });
});
