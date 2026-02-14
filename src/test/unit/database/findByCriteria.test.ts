
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { OrgHeading } from '../../../database/types';

// Mock specific WASM location for tests
const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('HeadingRepository.findByCriteria Tests', () => {
    let db: any;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;

    setup(async function () {
        this.timeout(5000);

        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        db = new SQL.Database();

        const schemaManager = new SchemaManager(db);
        schemaManager.initialize();

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);

        // Prepare test data
        const fileUri = '/test/query.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const testHeadings: OrgHeading[] = [
            {
                id: 'h1', fileUri, level: 1, title: 'Project A - Next Task', todoState: 'NEXT', todoCategory: 'todo',
                priority: 'A', tags: ['work', 'project'], startLine: 1, endLine: 2,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            },
            {
                id: 'h2', fileUri, level: 1, title: 'Project A - Done Task', todoState: 'DONE', todoCategory: 'done',
                priority: 'B', tags: ['work'], startLine: 3, endLine: 4,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            },
            {
                id: 'h3', fileUri, level: 2, title: 'Meeting Notes', todoState: 'TODO', todoCategory: 'todo',
                priority: 'C', tags: ['meeting'], startLine: 5, endLine: 6,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            },
            {
                id: 'h4', fileUri, level: 1, title: 'Personal Idea', todoState: undefined, todoCategory: undefined,
                priority: undefined, tags: ['personal'], startLine: 7, endLine: 8,
                properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), content: ''
            }
        ];

        for (const h of testHeadings) {
            headingRepo.insert(h);
        }
    });

    teardown(() => {
        if (db) {
            db.close();
        }
    });

    test('should filter by single TODO state', () => {
        const results = headingRepo.findByCriteria({ todo: 'NEXT' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Project A - Next Task');
    });

    test('should filter by multiple TODO states', () => {
        const results = headingRepo.findByCriteria({ todo: ['NEXT', 'TODO'] });
        assert.strictEqual(results.length, 2);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Meeting Notes', 'Project A - Next Task']);
    });

    test('should filter by priority', () => {
        const results = headingRepo.findByCriteria({ priority: 'A' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Project A - Next Task');
    });

    test('should filter by tags (single)', () => {
        const results = headingRepo.findByCriteria({ tags: 'project' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Project A - Next Task');
    });

    test('should filter by tags (multiple OR)', () => {
        const results = headingRepo.findByCriteria({ tags: ['project', 'meeting'] });
        assert.strictEqual(results.length, 2);
        const titles = results.map(r => r.title).sort();
        assert.deepStrictEqual(titles, ['Meeting Notes', 'Project A - Next Task']);
    });

    test('should filter by searchTerm', () => {
        const results = headingRepo.findByCriteria({ searchTerm: 'Notes' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Meeting Notes');
    });

    test('should combine multiple filters (AND)', () => {
        const results = headingRepo.findByCriteria({
            todo: 'DONE',
            priority: 'B',
            tags: ['work']
        });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Project A - Done Task');
    });

    test('should respect limit', () => {
        const results = headingRepo.findByCriteria({ limit: 2 });
        assert.strictEqual(results.length, 2);
    });

    test('should handle empty results', () => {
        const results = headingRepo.findByCriteria({ todo: 'WAITING' });
        assert.strictEqual(results.length, 0);
    });
});
