/**
 * Unit tests for SchemaManager
 * 
 * Tests database initialization, version management, and schema verification
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';

describe('SchemaManager', () => {
    let db: Database.Database;
    let schemaManager: SchemaManager;
    let testDbPath: string;

    beforeEach(() => {
        // Create temporary database for testing
        testDbPath = path.join(__dirname, '..', '..', '..', '..', 'test-db.sqlite');

        // Remove existing test database if it exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        db = new Database(testDbPath);
        schemaManager = new SchemaManager(db);
    });

    afterEach(() => {
        // Clean up
        if (db) {
            db.close();
        }

        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialize', () => {
        it('should create all required tables', () => {
            schemaManager.initialize();

            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
            const tableNames = tables.map(t => t.name);

            assert.ok(tableNames.includes('files'), 'files table should exist');
            assert.ok(tableNames.includes('headings'), 'headings table should exist');
            assert.ok(tableNames.includes('heading_tags'), 'heading_tags table should exist');
            assert.ok(tableNames.includes('links'), 'links table should exist');
            assert.ok(tableNames.includes('timestamps'), 'timestamps table should exist');
            assert.ok(tableNames.includes('metadata'), 'metadata table should exist');
        });

        it('should create indexes', () => {
            schemaManager.initialize();

            const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[];

            assert.ok(indexes.length > 0, 'should create indexes');
            assert.ok(indexes.some(i => i.name.includes('idx_')), 'should have idx_ prefixed indexes');
        });

        it('should create views', () => {
            schemaManager.initialize();

            const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all() as { name: string }[];
            const viewNames = views.map(v => v.name);

            assert.ok(viewNames.includes('v_todo_items'), 'v_todo_items view should exist');
            assert.ok(viewNames.includes('v_agenda_items'), 'v_agenda_items view should exist');
            assert.ok(viewNames.includes('v_tag_stats'), 'v_tag_stats view should exist');
        });

        it('should set schema version', () => {
            schemaManager.initialize();

            const version = schemaManager.getSchemaVersion();
            assert.strictEqual(version, 1, 'schema version should be 1');
        });

        it('should enable foreign keys', () => {
            schemaManager.initialize();

            const foreignKeys = db.pragma('foreign_keys', { simple: true });
            assert.strictEqual(foreignKeys, 1, 'foreign keys should be enabled');
        });
    });

    describe('getSchemaVersion', () => {
        it('should return 0 for uninitialized database', () => {
            const version = schemaManager.getSchemaVersion();
            assert.strictEqual(version, 0);
        });

        it('should return correct version after initialization', () => {
            schemaManager.initialize();
            const version = schemaManager.getSchemaVersion();
            assert.strictEqual(version, 1);
        });
    });

    describe('isUpToDate', () => {
        it('should return false for uninitialized database', () => {
            assert.strictEqual(schemaManager.isUpToDate(), false);
        });

        it('should return true after initialization', () => {
            schemaManager.initialize();
            assert.strictEqual(schemaManager.isUpToDate(), true);
        });
    });

    describe('verify', () => {
        it('should fail for uninitialized database', () => {
            const result = schemaManager.verify();
            assert.strictEqual(result, false);
        });

        it('should pass for initialized database', () => {
            schemaManager.initialize();
            const result = schemaManager.verify();
            assert.strictEqual(result, true);
        });

        it('should check integrity', () => {
            schemaManager.initialize();

            // Integrity check should pass
            const integrityCheck = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
            assert.strictEqual(integrityCheck[0].integrity_check, 'ok');
        });
    });

    describe('getStatistics', () => {
        it('should return database statistics', () => {
            schemaManager.initialize();

            const stats = schemaManager.getStatistics();

            assert.strictEqual(stats.schemaVersion, 1);
            assert.ok(stats.tableCount >= 6, 'should have at least 6 tables');
            assert.ok(stats.indexCount > 0, 'should have indexes');
            assert.ok(stats.viewCount >= 3, 'should have at least 3 views');
            assert.ok(stats.pageSize > 0, 'should have page size');
            assert.ok(stats.databaseSize > 0, 'should have database size');
        });
    });

    describe('reset', () => {
        it('should drop all tables and recreate', () => {
            schemaManager.initialize();

            // Insert some test data
            db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('test_key', 'test_value');

            // Reset database
            schemaManager.reset();

            // Check that tables still exist
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
            assert.ok(tables.length > 0, 'tables should exist after reset');

            // Check that test data is gone
            const result = db.prepare('SELECT * FROM metadata WHERE key = ?').get('test_key');
            assert.strictEqual(result, undefined, 'test data should be removed');
        });
    });

    describe('optimize', () => {
        it('should run without errors', () => {
            schemaManager.initialize();

            // Should not throw
            assert.doesNotThrow(() => {
                schemaManager.optimize();
            });
        });
    });

    describe('foreign key constraints', () => {
        it('should enforce file_uri foreign key in headings', () => {
            schemaManager.initialize();

            // Try to insert heading without corresponding file
            const stmt = db.prepare(`
        INSERT INTO headings (id, file_uri, level, title, tags, properties, start_line, end_line, content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            assert.throws(() => {
                stmt.run('test-id', '/nonexistent.org', 1, 'Test', '[]', '{}', 0, 1, '');
            }, /FOREIGN KEY constraint failed/);
        });

        it('should cascade delete headings when file is deleted', () => {
            schemaManager.initialize();

            // Insert file
            db.prepare('INSERT INTO files (uri, properties, tags, updated_at, hash) VALUES (?, ?, ?, ?, ?)').run(
                '/test.org', '{}', '[]', Date.now(), 'abc123'
            );

            // Insert heading
            db.prepare(`
        INSERT INTO headings (id, file_uri, level, title, tags, properties, start_line, end_line, content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('heading-1', '/test.org', 1, 'Test', '[]', '{}', 0, 1, '');

            // Delete file
            db.prepare('DELETE FROM files WHERE uri = ?').run('/test.org');

            // Check that heading is also deleted
            const heading = db.prepare('SELECT * FROM headings WHERE id = ?').get('heading-1');
            assert.strictEqual(heading, undefined, 'heading should be deleted');
        });
    });
});
