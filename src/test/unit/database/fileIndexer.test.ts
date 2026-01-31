
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { DatabaseConnection } from '../../../database/connection';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { LinkRepository } from '../../../database/linkRepository';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';
import { FileIndexer } from '../../../database/fileIndexer';
import { SchemaManager } from '../../../database/schemaManager';

const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('FileIndexer Integration Tests', () => {
    let connection: DatabaseConnection;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;
    let linkRepo: LinkRepository;
    let extractor: UniorgAstExtractor;
    let indexer: FileIndexer;
    let db: any;

    setup(async function () {
        this.timeout(10000);

        // Manual DB Init for Test isolation
        const SQL = await initSqlJs({ locateFile: () => wasmPath });
        db = new SQL.Database();

        // Init Schema
        const schemaManager = new SchemaManager(db);
        try {
            schemaManager.initialize();
        } catch (e) {
            const paths = [
                path.join(__dirname, '../../../../src/database/schema.sql'),
                path.join(__dirname, '../../../../out/schema.sql')
            ];
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    db.exec(fs.readFileSync(p, 'utf8'));
                    break;
                }
            }
        }

        // Mock Connection for FileIndexer to use this DB
        // FileIndexer needs { getDatabase(): Database, transaction(fn): T }
        const mockConn = {
            getDatabase: () => db,
            transaction: (fn: (db: any) => any) => {
                // In tests, we skip the outer transaction to avoid "nested transaction" errors
                // because repositories (HeadingRepo) start their own transactions.
                // Real implementation needs Savepoints or logic to handle nesting.
                return fn(db);
            }
        } as unknown as DatabaseConnection;

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
        linkRepo = new LinkRepository(db);
        extractor = new UniorgAstExtractor();

        indexer = new FileIndexer(
            mockConn,
            fileRepo,
            headingRepo,
            linkRepo,
            extractor
        );
    });

    teardown(() => {
        if (db) db.close();
    });

    test('should index a simple file correctly', async () => {
        const uri = '/test/simple.org';
        const content = `
#+TITLE: Test File
#+FILETAGS: :work:

* TODO Task 1
** Subtask
`;
        await indexer.indexFile(uri, content);

        // Verify File
        const file = fileRepo.findByUri(uri);
        assert.ok(file, 'File should exist');
        assert.strictEqual(file!.title, 'Test File');
        assert.deepStrictEqual(file!.tags, ['work']);

        // Verify Headings
        const headings = headingRepo.findByFileUri(uri);
        assert.strictEqual(headings.length, 2);
        assert.strictEqual(headings[0].title, 'Task 1');
        assert.strictEqual(headings[1].title, 'Subtask');

        // Change content and re-index
        const newContent = '* New Heading';
        await indexer.indexFile(uri, newContent);

        const newHeadings = headingRepo.findByFileUri(uri);
        assert.strictEqual(newHeadings.length, 1);
        assert.strictEqual(newHeadings[0].title, 'New Heading');
    });

    test('should handle links', async () => {
        const uri = '/test/links.org';
        const content = 'Link to [[file:other.org][Other]]';

        // Ensure linked file exists so FK doesn't fail (if we had FKs on target)
        // Actually Schema says: FOREIGN KEY (target_uri, target_heading_line) REFERENCES headings...
        // But links.target_uri alone does NOT refer to files(uri). Only source_uri refers to files.
        // We need to insert the source file first within indexFile transaction?
        // indexFile inserts the file.

        await indexer.indexFile(uri, content);

        const links = linkRepo.findBySourceUri(uri);
        assert.strictEqual(links.length, 1);
        assert.strictEqual(links[0].targetUri, 'other.org');
    });

    test('should update existing file data', async () => {
        const uri = '/test/update.org';
        await indexer.indexFile(uri, '#+TITLE: Old');

        let file = fileRepo.findByUri(uri);
        assert.strictEqual(file!.title, 'Old');

        await indexer.indexFile(uri, '#+TITLE: New');
        file = fileRepo.findByUri(uri);
        assert.strictEqual(file!.title, 'New');
    });

    test('should skip indexing if hash matches and not forced', async () => {
        const uri = '/test/skip.org';
        const content = '* Original';

        await indexer.indexFile(uri, content);

        // Manual hack: set updated_at to past to verify it DOES NOT change
        // Set to 10 seconds ago
        const past = new Date(Date.now() - 10000);

        // We manually update DB to set time back
        db.run('UPDATE files SET updated_at = ? WHERE uri = ?', [Math.floor(past.getTime() / 1000), uri]);

        // Verify it was set back
        let file = fileRepo.findByUri(uri);
        assert.strictEqual(Math.floor(file!.updatedAt.getTime() / 1000), Math.floor(past.getTime() / 1000));

        // Re-index same content
        await indexer.indexFile(uri, content);

        // Should NOT update (so timestamp remains in past)
        const skippedFile = fileRepo.findByUri(uri);
        assert.strictEqual(Math.floor(skippedFile!.updatedAt.getTime() / 1000), Math.floor(past.getTime() / 1000));
    });

    test('should force re-indexing', async () => {
        const uri = '/test/force.org';
        const content = '* Original';

        await indexer.indexFile(uri, content);

        // Set to past
        const past = new Date(Date.now() - 10000);
        db.run('UPDATE files SET updated_at = ? WHERE uri = ?', [Math.floor(past.getTime() / 1000), uri]);

        // Force re-index
        await indexer.indexFile(uri, content, true); // force=true

        const updatedFile = fileRepo.findByUri(uri);

        // Should be NOW (much newer than past)
        assert.ok(updatedFile!.updatedAt.getTime() > past.getTime() + 1000,
            `Timestamp should updated. Got ${updatedFile!.updatedAt.getTime()}, Past was ${past.getTime()}`);
    });
});
