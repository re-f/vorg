/**
 * Unit tests for FileRepository
 * 
 * Tests CRUD operations for OrgFile entities
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from '../../../database/connection';
import { FileRepository } from '../../../database/fileRepository';
import { OrgFile } from '../../../database/types';

describe('FileRepository', () => {
    let db: Database.Database;
    let repo: FileRepository;
    let testDbPath: string;

    beforeEach(async () => {
        // Reset singleton and create test database
        DatabaseConnection.resetInstance();
        testDbPath = path.join(__dirname, '..', '..', '..', '..', 'test-file-repo.sqlite');

        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        const conn = DatabaseConnection.getInstance();
        await conn.initialize(testDbPath);
        db = conn.getDatabase();
        repo = new FileRepository(db);
    });

    afterEach(() => {
        DatabaseConnection.resetInstance();

        [testDbPath, testDbPath + '-wal', testDbPath + '-shm'].forEach(p => {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        });
    });

    describe('insert', () => {
        it('should insert a new file', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Test File',
                properties: { author: 'Test' },
                tags: ['tag1', 'tag2'],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            const found = repo.findByUri(file.uri);
            assert.ok(found, 'file should be found');
            assert.strictEqual(found!.uri, file.uri);
            assert.strictEqual(found!.title, file.title);
            assert.deepStrictEqual(found!.properties, file.properties);
            assert.deepStrictEqual(found!.tags, file.tags);
        });

        it('should insert file with null title', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: undefined,
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            const found = repo.findByUri(file.uri);
            assert.ok(found);
            assert.strictEqual(found!.title, null);
        });
    });

    describe('update', () => {
        it('should update existing file', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Original',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            repo.update({
                uri: file.uri,
                title: 'Updated',
                hash: 'def456'
            });

            const found = repo.findByUri(file.uri);
            assert.strictEqual(found!.title, 'Updated');
            assert.strictEqual(found!.hash, 'def456');
        });

        it('should handle partial updates', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Original',
                properties: { key: 'value' },
                tags: ['tag1'],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            repo.update({
                uri: file.uri,
                title: 'Updated'
            });

            const found = repo.findByUri(file.uri);
            assert.strictEqual(found!.title, 'Updated');
            assert.strictEqual(found!.hash, 'abc123'); // Unchanged
            assert.deepStrictEqual(found!.properties, { key: 'value' }); // Unchanged
        });
    });

    describe('upsert', () => {
        it('should insert if file does not exist', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Test',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.upsert(file);

            const found = repo.findByUri(file.uri);
            assert.ok(found);
            assert.strictEqual(found!.title, 'Test');
        });

        it('should update if file exists', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Original',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            file.title = 'Updated';
            file.hash = 'def456';
            repo.upsert(file);

            const found = repo.findByUri(file.uri);
            assert.strictEqual(found!.title, 'Updated');
            assert.strictEqual(found!.hash, 'def456');
        });
    });

    describe('findByUri', () => {
        it('should return null for non-existent file', () => {
            const found = repo.findByUri('/nonexistent.org');
            assert.strictEqual(found, null);
        });

        it('should find file by URI', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Test',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);

            const found = repo.findByUri(file.uri);
            assert.ok(found);
            assert.strictEqual(found!.uri, file.uri);
        });
    });

    describe('findAll', () => {
        it('should return empty array when no files', () => {
            const files = repo.findAll();
            assert.strictEqual(files.length, 0);
        });

        it('should return all files', () => {
            const file1: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file1.org',
                title: 'File 1',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            const file2: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file2.org',
                title: 'File 2',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'def456'
            };

            repo.insert(file1);
            repo.insert(file2);

            const files = repo.findAll();
            assert.strictEqual(files.length, 2);
        });
    });

    describe('findByHash', () => {
        it('should find files by hash', () => {
            const file1: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file1.org',
                title: 'File 1',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'same-hash'
            };

            const file2: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file2.org',
                title: 'File 2',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'same-hash'
            };

            repo.insert(file1);
            repo.insert(file2);

            const files = repo.findByHash('same-hash');
            assert.strictEqual(files.length, 2);
        });
    });

    describe('findUpdatedAfter', () => {
        it('should find files updated after date', () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const oldFile: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/old.org',
                title: 'Old',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: yesterday,
                hash: 'old'
            };

            const newFile: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/new.org',
                title: 'New',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: tomorrow,
                hash: 'new'
            };

            repo.insert(oldFile);
            repo.insert(newFile);

            const files = repo.findUpdatedAfter(now);
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0].uri, '/test/new.org');
        });
    });

    describe('delete', () => {
        it('should delete file by URI', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Test',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);
            assert.strictEqual(repo.count(), 1);

            repo.delete(file.uri);
            assert.strictEqual(repo.count(), 0);
        });
    });

    describe('deleteAll', () => {
        it('should delete all files', () => {
            repo.insert({
                uri: '/test/file1.org',
                title: 'File 1',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc'
            });

            repo.insert({
                uri: '/test/file2.org',
                title: 'File 2',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'def'
            });

            assert.strictEqual(repo.count(), 2);

            repo.deleteAll();
            assert.strictEqual(repo.count(), 0);
        });
    });

    describe('count', () => {
        it('should return 0 for empty database', () => {
            assert.strictEqual(repo.count(), 0);
        });

        it('should return correct count', () => {
            repo.insert({
                uri: '/test/file1.org',
                title: 'File 1',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc'
            });

            assert.strictEqual(repo.count(), 1);

            repo.insert({
                uri: '/test/file2.org',
                title: 'File 2',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'def'
            });

            assert.strictEqual(repo.count(), 2);
        });
    });

    describe('exists', () => {
        it('should return false for non-existent file', () => {
            assert.strictEqual(repo.exists('/nonexistent.org'), false);
        });

        it('should return true for existing file', () => {
            const file: Omit<OrgFile, 'createdAt'> = {
                uri: '/test/file.org',
                title: 'Test',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123'
            };

            repo.insert(file);
            assert.strictEqual(repo.exists(file.uri), true);
        });
    });
});
