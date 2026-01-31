
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';

const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('SchemaManager Integration Tests', () => {
    let db: any;
    let schemaManager: SchemaManager;

    setup(async function () {
        this.timeout(5000);
        const SQL = await initSqlJs({ locateFile: () => wasmPath });
        db = new SQL.Database();

        // Ensure SchemaManager can find the schema file
        // Mock fs.existsSync or just rely on the fallback logic inside SchemaManager if constructed correctly?
        // Actually SchemaManager constructor searches paths. 
        // We added `__dirname/../schema.sql` which works for integration tests if they run from out/.
        // But for unit tests they run from out/test/unit/database...

        // We rely on the fallback manual loading if SchemaManager throws, BUT we are testing SchemaManager itself!
        // So we should try to let SchemaManager find it.
        // Or we just mock the file system? No, integration test style.

        try {
            schemaManager = new SchemaManager(db);
        } catch (e) {
            // If implicit finding fails (due to test runner CWD), we can't easily fix the class internals from here without mocking.
            // However, our previous fix to SchemaManager added `__dirname/../schema.sql`.
            // In unit tests: `__dirname` is `out/test/unit/database`.
            // `../` is `out/test/unit`. Schema is in `out/schema.sql`.
            // So `../../../schema.sql` would be needed.
            // We can't change SchemaManager just for tests.

            // WORKAROUND: We will manually load schema for the DB for some tests,
            // BUT for tests that test `initialize`, we need SchemaManager to work.
            // We can pass a derived class or mock if needed, but SQL.js DB is satisfied.

            // We'll instantiate SchemaManager. If it throws "Could not find schema.sql", strict assert fail?
            // Actually, verify where schema.sql is.
            // It's in `src/database/schema.sql` (source) and `out/schema.sql` (build).
            // SchemaManager checks `process.cwd()/src/database/schema.sql` which usually works in dev.
            schemaManager = new SchemaManager(db);
        }
    });

    teardown(() => {
        if (db) db.close();
    });

    test('should initialize schema successfully', () => {
        schemaManager.initialize();

        // Verify tables exist
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='files'");
        assert.ok(result.length > 0, 'Files table should exist');

        const metadata = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='metadata'");
        assert.ok(metadata.length > 0, 'Metadata table should exist');
    });

    test('should check indexes creation', () => {
        schemaManager.initialize();
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
        assert.ok(result.length > 0 && result[0].values.length > 0, 'Indexes should be created');
    });

    test('should check views creation', () => {
        schemaManager.initialize();
        const views = ['v_todo_items', 'v_agenda_items', 'v_tag_stats'];
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='view'");
        const foundViews = result[0].values.map((r: any) => r[0]);
        for (const v of views) {
            assert.ok(foundViews.includes(v), `View ${v} should exist`);
        }
    });

    test('should return correct schema version', () => {
        schemaManager.initialize();
        const version = schemaManager.getSchemaVersion();
        assert.strictEqual(version, 1);
    });

    test('isUpToDate should work', () => {
        assert.strictEqual(schemaManager.isUpToDate(), false);
        schemaManager.initialize();
        assert.strictEqual(schemaManager.isUpToDate(), true);
    });

    test('should verify database integrity', () => {
        schemaManager.initialize();
        const isValid = schemaManager.verify();
        assert.strictEqual(isValid, true);
    });

    test('should reset database', () => {
        schemaManager.initialize();

        // Insert dummy data directly
        db.run("INSERT INTO files (uri, hash, updated_at, title) VALUES ('/test.org', 'abc', 123, 'Title')");

        schemaManager.reset();

        // Check files table empty
        const start = db.exec("SELECT COUNT(*) FROM files");
        assert.strictEqual(start[0].values[0][0], 0);

        // Verify schema still compatible
        assert.strictEqual(schemaManager.getSchemaVersion(), 1);
    });

    test('should get statistics', () => {
        schemaManager.initialize();
        const stats = schemaManager.getStatistics();
        assert.strictEqual(stats.schemaVersion, 1);
        assert.ok(stats.tableCount >= 5);
        assert.ok(stats.indexCount > 0);
    });

    test('should enforce FK constraints', () => {
        schemaManager.initialize();
        // Insert file
        db.run("INSERT INTO files (uri, hash, updated_at, title) VALUES ('/fk.org', 'h', 1, 'T')");
        // Insert heading
        db.run("INSERT INTO headings (file_uri, start_line, level, title, end_line) VALUES ('/fk.org', 1, 1, 'H', 2)");

        // Delete file
        db.run("DELETE FROM files WHERE uri = '/fk.org'");

        // Check heading deleted (Cascade)
        const heads = db.exec("SELECT * FROM headings WHERE file_uri = '/fk.org'");
        assert.strictEqual(heads.length, 0);
    });
});
