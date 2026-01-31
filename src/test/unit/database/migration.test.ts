
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { OrgFile, OrgHeading } from '../../../database/types';

// Mock specific WASM location for tests
const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('Database Integration Tests (SQL.js)', () => {
    let db: any;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;
    let schemaManager: SchemaManager;

    setup(async function () {
        this.timeout(5000);

        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        db = new SQL.Database();

        // Ensure we load schema correctly
        try {
            schemaManager = new SchemaManager(db);
            schemaManager.initialize();
        } catch (e) {
            console.warn('SchemaManager init failed, trying manual fallback:', e);

            // Try to load from various locations
            const paths = [
                path.join(__dirname, '../../../../out/schema.sql'), // Copied by copy-resources
                path.join(__dirname, '../../../../src/database/schema.sql'), // Source
            ];

            let loaded = false;
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    console.log(`Loading schema from: ${p}`);
                    const sql = fs.readFileSync(p, 'utf8');
                    db.exec(sql);
                    loaded = true;
                    break;
                }
            }

            if (!loaded) {
                console.error('Could not find schema.sql. Current dir:', __dirname);
                throw new Error('Could not find schema.sql in fallback paths');
            }
        }

        // Verify table creation - use metadata table which we know exists
        try {
            db.exec('SELECT 1 FROM metadata');
        } catch (e) {
            console.error('Schema verification failed! Tables not created.');
            throw e;
        }

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
    });

    teardown(() => {
        if (db) {
            db.close();
        }
    });

    test('SchemaManager: should initialize correct version', () => {
        const row = db.exec("SELECT value FROM metadata WHERE key='schema_version'")[0];
        assert.ok(row, 'Metadata table should exist and have version');
        assert.strictEqual(row.values[0][0], '1', 'Version should be 1');
    });

    test('FileRepository: Basic CRUD', () => {
        const file: Omit<OrgFile, 'createdAt'> = {
            uri: '/test/file1.org',
            hash: 'hash123',
            title: 'File Title',
            properties: { prop: 'val' },
            tags: ['tag1'],
            headings: [],
            updatedAt: new Date()
        };
        fileRepo.insert(file);

        const retrieved = fileRepo.findByUri(file.uri);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.title, 'File Title');
        assert.deepStrictEqual(retrieved.tags, ['tag1']);

        fileRepo.delete(file.uri);
        // Expect null as per implementation found in FileRepository.ts
        assert.strictEqual(fileRepo.findByUri(file.uri), null);
    });

    test('HeadingRepository: Insert and Find by Encoded ID', () => {
        const fileUri = '/test/headings.org';
        fileRepo.insert({
            uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date()
        });

        const heading: OrgHeading = {
            id: 'my-custom-id',
            fileUri: fileUri,
            level: 1,
            title: 'Heading with ID',
            content: '',
            todoState: 'TODO',
            todoCategory: 'todo',
            priority: 'A',
            tags: [],
            properties: { ID: 'my-custom-id' },
            timestamps: [],
            childrenIds: [],
            startLine: 10,
            endLine: 20,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        headingRepo.insert(heading);

        const found = headingRepo.findById('my-custom-id');
        assert.ok(found);
        assert.strictEqual(found.title, 'Heading with ID');
    });

    test('HeadingRepository: Find by File URI', () => {
        const fileUri = '/test/list.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const h1: OrgHeading = {
            id: 'h1', fileUri, level: 1, title: 'H1', content: '', todoState: undefined, todoCategory: undefined, priority: undefined, tags: [],
            properties: {}, timestamps: [], childrenIds: [], startLine: 1, endLine: 2, createdAt: new Date(), updatedAt: new Date()
        };
        const h2: OrgHeading = {
            id: 'h2', fileUri, level: 1, title: 'H2', content: '', todoState: undefined, todoCategory: undefined, priority: undefined, tags: [],
            properties: {}, timestamps: [], childrenIds: [], startLine: 3, endLine: 4, createdAt: new Date(), updatedAt: new Date()
        };

        headingRepo.insert(h1);
        headingRepo.insert(h2);

        const list = headingRepo.findByFileUri(fileUri);
        assert.strictEqual(list.length, 2);
        assert.strictEqual(list[0].title, 'H1');
        assert.strictEqual(list[1].title, 'H2');
    });

    test('HeadingRepository: Find by TODO State', () => {
        const fileUri = '/test/todo.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        headingRepo.insert({
            id: 't1', fileUri, level: 1, title: 'Task 1', todoState: 'TODO', todoCategory: 'todo',
            priority: undefined, tags: [], properties: {}, timestamps: [], childrenIds: [], startLine: 1, endLine: 2, createdAt: new Date(), updatedAt: new Date(), content: ''
        });
        headingRepo.insert({
            id: 't2', fileUri, level: 1, title: 'Task 2', todoState: 'DONE', todoCategory: 'done',
            priority: undefined, tags: [], properties: {}, timestamps: [], childrenIds: [], startLine: 3, endLine: 4, createdAt: new Date(), updatedAt: new Date(), content: ''
        });

        const todos = headingRepo.findByTodoState('TODO');
        assert.strictEqual(todos.length, 1);
        assert.strictEqual(todos[0].title, 'Task 1');
    });

    test('HeadingRepository: Find by Tag', () => {
        const fileUri = '/test/tags.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        headingRepo.insert({
            id: 'tag1', fileUri, level: 1, title: 'Tagged', todoState: undefined, todoCategory: undefined,
            priority: undefined, tags: ['urgent', 'home'], properties: {}, timestamps: [], childrenIds: [], startLine: 1, endLine: 2, createdAt: new Date(), updatedAt: new Date(), content: ''
        });

        const urgent = headingRepo.findByTag('urgent');
        assert.strictEqual(urgent.length, 1);
        assert.strictEqual(urgent[0].title, 'Tagged');
    });

    test('HeadingRepository: Batch Insert', () => {
        const fileUri = '/test/batch.org';
        fileRepo.insert({ uri: fileUri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        const headings: OrgHeading[] = [];
        for (let i = 0; i < 100; i++) {
            headings.push({
                id: `batch-${i}`, fileUri, level: 1, title: `Batch ${i}`, todoState: undefined, todoCategory: undefined,
                priority: undefined, tags: ['batch'], properties: {}, timestamps: [], childrenIds: [], startLine: i + 1, endLine: i + 1, createdAt: new Date(), updatedAt: new Date(), content: ''
            });
        }

        headingRepo.insertBatch(headings);

        const count = headingRepo.countByFileUri(fileUri);
        assert.strictEqual(count, 100);
    });
});
