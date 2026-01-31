
import * as assert from 'assert';
import { DatabaseConnection } from '../../../database/connection';
import * as fs from 'fs';
import * as path from 'path';

suite('DatabaseConnection Tests', () => {
    const testDbPath = path.join(__dirname, 'test-connection.db');
    const backupDbPath = path.join(__dirname, 'test-backup.db');

    teardown(() => {
        const conn = DatabaseConnection.getInstance();
        if (conn.isReady()) {
            conn.close();
        }

        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        if (fs.existsSync(backupDbPath)) fs.unlinkSync(backupDbPath);
    });

    test('should provide singleton instance', () => {
        const conn1 = DatabaseConnection.getInstance();
        const conn2 = DatabaseConnection.getInstance();
        assert.strictEqual(conn1, conn2);
    });

    test('should initialize successfully', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);

        assert.strictEqual(conn.isReady(), true);
        assert.ok(fs.existsSync(testDbPath) || conn.getDatabase(), 'DB should exist in memory or file');
    });

    test('should not reinitialize if already initialized', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);

        // Second init shoud log warning but not throw
        await conn.initialize(testDbPath);
        assert.strictEqual(conn.isReady(), true);
    });

    test('getDatabase should return db instance', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        const db = conn.getDatabase();
        assert.ok(db);
        // sql.js db doesn't have 'open' property same as better-sqlite3 but is object
        assert.strictEqual(typeof db.exec, 'function');
    });

    test('should execute transaction successfully', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);

        // Setup table
        const db = conn.getDatabase();
        db.run('CREATE TABLE IF NOT EXISTS test (key TEXT, value TEXT)');

        const result = conn.transaction((db) => {
            db.run('INSERT INTO test (key, value) VALUES (?, ?)', ['k', 'v']);
            return db.exec('SELECT * FROM test WHERE key="k"')[0].values[0];
        });

        assert.strictEqual(result[1], 'v'); // value
    });

    test('should rollback transaction on error', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        const db = conn.getDatabase();
        db.run('CREATE TABLE IF NOT EXISTS test (key TEXT, value TEXT)');

        try {
            conn.transaction((db) => {
                db.run('INSERT INTO test (key, value) VALUES (?, ?)', ['k', 'v2']);
                throw new Error('Fail');
            });
        } catch (e) {
            // Expected
        }

        const res = db.exec('SELECT * FROM test WHERE value="v2"');
        assert.strictEqual(res.length, 0);
    });

    test('should close connection', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        conn.close();
        assert.strictEqual(conn.isReady(), false);
    });

    test('should backup database', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        const db = conn.getDatabase();
        db.run('CREATE TABLE IF NOT EXISTS test (key TEXT)');

        await conn.backup(backupDbPath);
        assert.ok(fs.existsSync(backupDbPath));
    });

    test('should restore database', async () => {
        // Create a backup first
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        conn.getDatabase().run("CREATE TABLE IF NOT EXISTS t (v TEXT)");
        conn.getDatabase().run("INSERT INTO t VALUES ('orig')");
        await conn.backup(backupDbPath);
        conn.close();

        // New Test DB
        const conn2 = DatabaseConnection.getInstance();
        await conn2.initialize(testDbPath);
        conn2.getDatabase().run("DELETE FROM t"); // Empty it

        await conn2.restore(backupDbPath);

        // Check data
        const res = conn2.getDatabase().exec("SELECT * FROM t");
        assert.strictEqual(res[0].values[0][0], 'orig');
    });
    test('should support nested transactions', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        const db = conn.getDatabase();
        db.run('CREATE TABLE IF NOT EXISTS test (key TEXT, value TEXT)');

        conn.transaction((outerDb) => {
            outerDb.run('INSERT INTO test (key, value) VALUES (?, ?)', ['outer', '1']);

            conn.transaction((innerDb) => {
                innerDb.run('INSERT INTO test (key, value) VALUES (?, ?)', ['inner', '2']);
            });

            return true;
        });

        const res1 = db.exec('SELECT * FROM test WHERE key="outer"');
        const res2 = db.exec('SELECT * FROM test WHERE key="inner"');
        assert.strictEqual(res1[0].values[0][1], '1');
        assert.strictEqual(res2[0].values[0][1], '2');
    });

    test('should rollback both nested transactions if inner fails', async () => {
        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        const db = conn.getDatabase();
        db.run('CREATE TABLE IF NOT EXISTS test (key TEXT, value TEXT)');

        try {
            conn.transaction((outerDb) => {
                outerDb.run('INSERT INTO test (key, value) VALUES (?, ?)', ['outer', 'fail']);

                conn.transaction(() => {
                    throw new Error('Inner failure');
                });
            });
        } catch (e) {
            // Expected
        }

        const res = db.exec('SELECT * FROM test WHERE key="outer"');
        assert.strictEqual(res.length, 0);
    });
});
