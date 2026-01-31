
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

suite('HeadingRepository Integration Tests', () => {
    let db: any;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;

    setup(async function () {
        this.timeout(5000);

        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        db = new SQL.Database();

        // Load Schema
        try {
            const schemaManager = new SchemaManager(db);
            schemaManager.initialize();
        } catch (e) {
            const paths = [
                path.join(__dirname, '../../../../out/schema.sql'),
                path.join(__dirname, '../../../../src/database/schema.sql'),
            ];
            let loaded = false;
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    db.exec(fs.readFileSync(p, 'utf8'));
                    loaded = true;
                    break;
                }
            }
            if (!loaded) throw e;
        }

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
    });

    teardown(() => {
        if (db) {
            db.close();
        }
    });

    test('should insert and find heading by ID', () => {
        const fileUri = '/test/heading.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const heading: OrgHeading = {
            id: 'uuid-1',
            fileUri,
            level: 1,
            title: 'My Heading',
            content: 'Body',
            todoState: 'TODO',
            todoCategory: 'todo',
            priority: 'A',
            tags: ['work', 'urgent'],
            properties: { ID: 'uuid-1', CUSTOM: 'value' },
            timestamps: [],
            childrenIds: [],
            startLine: 1,
            endLine: 10,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        headingRepo.insert(heading);

        const found = headingRepo.findById('uuid-1');
        assert.ok(found);
        assert.strictEqual(found.title, 'My Heading');
        assert.strictEqual(found.todoState, 'TODO');
        assert.deepStrictEqual(found.tags, ['urgent', 'work']);
        assert.strictEqual(found.properties.CUSTOM, 'value');
    });

    test('should find headings by File URI', () => {
        const fileUri = '/test/list.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        headingRepo.insert({
            id: 'h1', fileUri, level: 1, title: 'Item 1', startLine: 1, endLine: 2,
            properties: {}, tags: [], timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(),
            todoState: undefined, todoCategory: undefined, priority: undefined, content: ''
        });
        headingRepo.insert({
            id: 'h2', fileUri, level: 1, title: 'Item 2', startLine: 3, endLine: 4,
            properties: {}, tags: [], timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(),
            todoState: undefined, todoCategory: undefined, priority: undefined, content: ''
        });

        const list = headingRepo.findByFileUri(fileUri);
        assert.strictEqual(list.length, 2);
        // Sorted by start_line
        assert.strictEqual(list[0].title, 'Item 1');
        assert.strictEqual(list[1].title, 'Item 2');
    });

    test('should batch insert headings', () => {
        const fileUri = '/test/batch.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const headings: OrgHeading[] = [];
        for (let i = 0; i < 50; i++) {
            headings.push({
                id: `batch-${i}`, fileUri, level: 1, title: `Batch ${i}`,
                startLine: i + 1, endLine: i + 1,
                properties: {}, tags: [], timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(),
                todoState: undefined, todoCategory: undefined, priority: undefined, content: ''
            });
        }

        headingRepo.insertBatch(headings);

        const count = headingRepo.countByFileUri(fileUri);
        assert.strictEqual(count, 50);
    });

    test('should search by TODO state', () => {
        const fileUri = '/test/todo.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        headingRepo.insert({
            id: 't1', fileUri, level: 1, title: 'T1', todoState: 'TODO', todoCategory: 'todo', startLine: 1, endLine: 1,
            properties: {}, tags: [], timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), priority: undefined, content: ''
        });
        headingRepo.insert({
            id: 't2', fileUri, level: 1, title: 'T2', todoState: 'DONE', todoCategory: 'done', startLine: 2, endLine: 2,
            properties: {}, tags: [], timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(), priority: undefined, content: ''
        });

        const todos = headingRepo.findByTodoState('TODO');
        assert.strictEqual(todos.length, 1);
        assert.strictEqual(todos[0].title, 'T1');
    });

    test('should search by tag', () => {
        const fileUri = '/test/tags.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        headingRepo.insert({
            id: 'tag1', fileUri, level: 1, title: 'Tagged', tags: ['foo', 'bar'], startLine: 1, endLine: 1,
            properties: {}, timestamps: [], childrenIds: [], createdAt: new Date(), updatedAt: new Date(),
            todoState: undefined, todoCategory: undefined, priority: undefined, content: ''
        });

        const results = headingRepo.findByTag('foo');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].title, 'Tagged');
    });
});
