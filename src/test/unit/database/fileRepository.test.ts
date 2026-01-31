
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';
import { FileRepository } from '../../../database/fileRepository';
import { OrgFile } from '../../../database/types';

// Mock specific WASM location for tests
const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('FileRepository Integration Tests', () => {
    let db: any;
    let fileRepo: FileRepository;
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
            // Try to load from various locations
            const paths = [
                path.join(__dirname, '../../../../out/schema.sql'), // Copied by copy-resources
                path.join(__dirname, '../../../../src/database/schema.sql'), // Source
            ];

            let loaded = false;
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    const sql = fs.readFileSync(p, 'utf8');
                    db.exec(sql);
                    loaded = true;
                    break;
                }
            }

            if (!loaded) {
                console.error('Could not find schema.sql');
                throw e;
            }
        }

        fileRepo = new FileRepository(db);
    });

    teardown(() => {
        if (db) {
            db.close();
        }
    });

    test('should insert and find file by URI', () => {
        const file: Omit<OrgFile, 'createdAt'> = {
            uri: '/test/file1.org',
            hash: 'hash123',
            title: 'Test File',
            properties: { prop: 'val' },
            tags: ['tag1'],
            headings: [],
            updatedAt: new Date()
        };

        fileRepo.insert(file);

        const retrieved = fileRepo.findByUri(file.uri);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.uri, file.uri);
        assert.strictEqual(retrieved.title, 'Test File');
        assert.strictEqual(retrieved.hash, 'hash123');
        assert.deepStrictEqual(retrieved.properties, { prop: 'val' });
        assert.deepStrictEqual(retrieved.tags, ['tag1']);
    });

    test('should update existing file', () => {
        const uri = '/test/update.org';
        fileRepo.insert({
            uri, hash: 'v1', title: 'V1', properties: {}, tags: [], headings: [], updatedAt: new Date()
        });

        fileRepo.update({
            uri,
            title: 'V2',
            hash: 'v2'
        });

        const updated = fileRepo.findByUri(uri);
        assert.ok(updated);
        assert.strictEqual(updated.title, 'V2');
        assert.strictEqual(updated.hash, 'v2');
    });

    test('should upsert (insert if new)', () => {
        const uri = '/test/upsert.org';

        // First upsert (insert)
        fileRepo.upsert({
            uri, hash: 'v1', title: 'Upsert V1', properties: {}, tags: [], headings: [], updatedAt: new Date()
        });
        let f = fileRepo.findByUri(uri);
        assert.strictEqual(f?.title, 'Upsert V1');

        // Second upsert (update)
        fileRepo.upsert({
            uri, hash: 'v2', title: 'Upsert V2', properties: {}, tags: [], headings: [], updatedAt: new Date()
        });
        f = fileRepo.findByUri(uri);
        assert.strictEqual(f?.title, 'Upsert V2');
    });

    test('should delete file', () => {
        const uri = '/test/delete.org';
        fileRepo.insert({
            uri, hash: 'h', title: 'T', properties: {}, tags: [], headings: [], updatedAt: new Date()
        });

        assert.ok(fileRepo.exists(uri));

        fileRepo.delete(uri);

        assert.strictEqual(fileRepo.findByUri(uri), null);
        assert.strictEqual(fileRepo.exists(uri), false);
    });

    test('should count files', () => {
        assert.strictEqual(fileRepo.count(), 0);

        fileRepo.insert({ uri: '/1', hash: 'h', title: '1', properties: {}, tags: [], headings: [], updatedAt: new Date() });
        fileRepo.insert({ uri: '/2', hash: 'h', title: '2', properties: {}, tags: [], headings: [], updatedAt: new Date() });

        assert.strictEqual(fileRepo.count(), 2);
    });
});
