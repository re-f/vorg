/**
 * Unit tests for DatabaseConnection
 * 
 * Tests connection management, singleton pattern, transactions, and error handling
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from '../../../database/connection';

describe('DatabaseConnection', () => {
    let testDbPath: string;
    let backupPath: string;

    beforeEach(() => {
        // Reset singleton before each test
        DatabaseConnection.resetInstance();

        // Create temporary database path
        testDbPath = path.join(__dirname, '..', '..', '..', '..', 'test-connection.sqlite');
        backupPath = path.join(__dirname, '..', '..', '..', '..', 'test-backup.sqlite');

        // Clean up existing files
        [testDbPath, backupPath].forEach(p => {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        });
    });

    afterEach(() => {
        // Clean up
        DatabaseConnection.resetInstance();

        [testDbPath, backupPath].forEach(p => {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        });

        // Clean up WAL files
        [testDbPath + '-wal', testDbPath + '-shm', backupPath + '-wal', backupPath + '-shm'].forEach(p => {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance', () => {
            const instance1 = DatabaseConnection.getInstance();
            const instance2 = DatabaseConnection.getInstance();

            assert.strictEqual(instance1, instance2, 'should return same instance');
        });

        it('should create new instance after reset', () => {
            const instance1 = DatabaseConnection.getInstance();
            DatabaseConnection.resetInstance();
            const instance2 = DatabaseConnection.getInstance();

            assert.notStrictEqual(instance1, instance2, 'should create new instance');
        });
    });

    describe('initialize', () => {
        it('should initialize database successfully', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            assert.strictEqual(conn.isReady(), true, 'should be ready');
            assert.ok(fs.existsSync(testDbPath), 'database file should exist');
        });

        it('should create directory if not exists', async () => {
            const nestedPath = path.join(__dirname, '..', '..', '..', '..', 'nested', 'test.sqlite');

            try {
                const conn = DatabaseConnection.getInstance();
                await conn.initialize(nestedPath);

                assert.ok(fs.existsSync(nestedPath), 'database file should exist');
            } finally {
                // Clean up
                DatabaseConnection.resetInstance();
                if (fs.existsSync(nestedPath)) {
                    fs.unlinkSync(nestedPath);
                }
                // Clean up WAL files
                [nestedPath + '-wal', nestedPath + '-shm'].forEach(p => {
                    if (fs.existsSync(p)) {
                        fs.unlinkSync(p);
                    }
                });
                // Remove nested directory
                const nestedDir = path.dirname(nestedPath);
                if (fs.existsSync(nestedDir)) {
                    fs.rmdirSync(nestedDir);
                }
            }
        });

        it('should not reinitialize if already initialized', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            // Try to initialize again
            await conn.initialize(testDbPath);

            assert.strictEqual(conn.isReady(), true);
        });

        it('should configure database settings', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            const db = conn.getDatabase();

            // Check WAL mode
            const journalMode = db.pragma('journal_mode', { simple: true });
            assert.strictEqual(journalMode, 'wal', 'should use WAL mode');

            // Check foreign keys
            const foreignKeys = db.pragma('foreign_keys', { simple: true });
            assert.strictEqual(foreignKeys, 1, 'foreign keys should be enabled');
        });
    });

    describe('getDatabase', () => {
        it('should throw error if not initialized', () => {
            const conn = DatabaseConnection.getInstance();

            assert.throws(() => {
                conn.getDatabase();
            }, /Database not initialized/);
        });

        it('should return database instance when initialized', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            const db = conn.getDatabase();
            assert.ok(db, 'should return database instance');
            assert.strictEqual(db.open, true, 'database should be open');
        });
    });

    describe('transaction', () => {
        it('should execute transaction successfully', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            const result = conn.transaction((db) => {
                db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test', 'value');
                return db.prepare('SELECT * FROM metadata WHERE key = ?').get('test') as { key: string; value: string };
            });

            assert.strictEqual(result.key, 'test');
            assert.strictEqual(result.value, 'value');
        });

        it('should rollback on error', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            try {
                conn.transaction((db) => {
                    db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test', 'value');
                    throw new Error('Test error');
                });
            } catch (error) {
                // Expected error
            }

            // Check that data was not inserted
            const db = conn.getDatabase();
            const result = db.prepare('SELECT * FROM metadata WHERE key = ?').get('test');
            assert.strictEqual(result, undefined, 'data should not be inserted');
        });
    });

    describe('close', () => {
        it('should close database connection', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            conn.close();

            assert.strictEqual(conn.isReady(), false, 'should not be ready');
        });

        it('should handle multiple close calls', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            conn.close();
            conn.close(); // Should not throw

            assert.strictEqual(conn.isReady(), false);
        });
    });

    describe('reconnect', () => {
        it('should reconnect to database', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            // Insert some data
            const db = conn.getDatabase();
            db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test', 'value');

            // Reconnect
            await conn.reconnect();

            // Check data persists
            const db2 = conn.getDatabase();
            const result = db2.prepare('SELECT * FROM metadata WHERE key = ?').get('test') as { key: string; value: string };
            assert.strictEqual(result.value, 'value');
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            const stats = conn.getStatistics();

            assert.strictEqual(stats.path, testDbPath);
            assert.strictEqual(stats.isOpen, true);
            assert.strictEqual(stats.isInitialized, true);
            assert.strictEqual(stats.inTransaction, false);
            assert.strictEqual(stats.schemaVersion, 1);
        });
    });

    describe('backup and restore', () => {
        it('should backup database', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            // Insert test data
            const db = conn.getDatabase();
            db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test', 'backup');

            // Backup
            await conn.backup(backupPath);

            assert.ok(fs.existsSync(backupPath), 'backup file should exist');
        });

        it('should restore database from backup', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            // Insert test data
            const db = conn.getDatabase();
            db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test', 'original');

            // Backup
            await conn.backup(backupPath);

            // Modify data
            db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run('modified', 'test');

            // Restore
            await conn.restore(backupPath);

            // Check data is restored
            const db2 = conn.getDatabase();
            const result = db2.prepare('SELECT * FROM metadata WHERE key = ?').get('test') as { key: string; value: string };
            assert.strictEqual(result.value, 'original', 'data should be restored');
        });

        it('should throw error if backup file not found', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            await assert.rejects(
                async () => await conn.restore('/nonexistent/backup.sqlite'),
                /Backup file not found/
            );
        });
    });

    describe('verify', () => {
        it('should verify database integrity', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            const result = conn.verify();
            assert.strictEqual(result, true, 'verification should pass');
        });
    });

    describe('optimize', () => {
        it('should optimize database', async () => {
            const conn = DatabaseConnection.getInstance();
            await conn.initialize(testDbPath);

            // Should not throw
            assert.doesNotThrow(() => {
                conn.optimize();
            });
        });
    });
});
