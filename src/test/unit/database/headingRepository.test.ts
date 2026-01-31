import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as Database from 'better-sqlite3';
import { HeadingRepository } from '../../../database/headingRepository';
import { SchemaManager } from '../../../database/schemaManager';
import { OrgHeading } from '../../../database/types';

describe('HeadingRepository', () => {
    let db: Database.Database;
    let repo: HeadingRepository;
    let testDbPath: string;

    beforeEach(() => {
        // 创建临时测试数据库
        testDbPath = path.join(__dirname, `test-headings-${Date.now()}.db`);
        db = new Database(testDbPath);

        // 初始化 schema
        const schemaManager = new SchemaManager(db);
        schemaManager.initialize();

        repo = new HeadingRepository(db);

        // 预先插入常用的测试文件 (满足外键约束)
        const testFiles = [
            '/test/file.org',
            '/test/file1.org',
            '/test/file2.org'
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO files (uri, hash, updated_at)
            VALUES (?, ?, ?)
        `);

        for (const uri of testFiles) {
            stmt.run(uri, 'test-hash', Math.floor(Date.now() / 1000));
        }
    });

    afterEach(() => {
        // 清理
        db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('insert', () => {
        it('should insert a new heading', () => {
            const heading: OrgHeading = {
                id: 'test-id-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Test Heading',
                tags: ['tag1', 'tag2'],
                properties: { 'ID': 'test-id-1' },
                timestamps: [],
                startLine: 0,
                endLine: 5,
                childrenIds: [],
                content: 'Test content',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repo.insert(heading);

            const found = repo.findById('test-id-1');
            assert.ok(found, 'heading should be found');
            assert.strictEqual(found!.id, 'test-id-1');
            assert.strictEqual(found!.title, 'Test Heading');
            assert.strictEqual(found!.level, 1);
            assert.deepStrictEqual(found!.tags, ['tag1', 'tag2']);
        });

        it('should insert heading with no ID (generated ID on read)', () => {
            const heading: OrgHeading = {
                id: 'generated-id',
                fileUri: '/test/file.org',
                level: 1,
                title: 'No ID Heading',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 10,
                endLine: 12,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repo.insert(heading);

            // Should NOT be found by the ignored 'generated-id'
            const foundById = repo.findById('generated-id');
            assert.strictEqual(foundById, null);

            // Should be found by File URI
            const headings = repo.findByFileUri('/test/file.org');
            const found = headings.find(h => h.startLine === 10);
            assert.ok(found);
            assert.strictEqual(found!.title, 'No ID Heading');
            // Check if ID was generated on read
            assert.strictEqual(found!.id, '/test/file.org:10');
        });

        it('should insert heading with TODO state', () => {
            const heading: OrgHeading = {
                id: 'test-id-2',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Task',
                todoState: 'TODO',
                todoCategory: 'todo',
                tags: [],
                properties: { 'ID': 'test-id-2' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repo.insert(heading);

            const found = repo.findById('test-id-2');
            assert.strictEqual(found!.todoState, 'TODO');
            assert.strictEqual(found!.todoCategory, 'todo');
        });

        it('should insert heading with priority', () => {
            const heading: OrgHeading = {
                id: 'test-id-3',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Important Task',
                priority: 'A',
                tags: [],
                properties: { 'ID': 'test-id-3' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repo.insert(heading);

            const found = repo.findById('test-id-3');
            assert.strictEqual(found!.priority, 'A');
        });

        it('should insert heading with timestamps', () => {
            const scheduled = new Date('2024-01-28');
            const deadline = new Date('2024-01-30');

            const heading: OrgHeading = {
                id: 'test-id-4',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Scheduled Task',
                scheduled,
                deadline,
                tags: [],
                properties: { 'ID': 'test-id-4' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repo.insert(heading);

            const found = repo.findById('test-id-4');
            assert.strictEqual(found!.scheduled!.getTime(), scheduled.getTime());
        });
    });

    describe('insertBatch', () => {
        it('should insert multiple headings', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'batch-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Batch 1',
                    tags: ['tag1'],
                    properties: { 'ID': 'batch-1' },
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'batch-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Batch 2',
                    tags: ['tag2'],
                    properties: { 'ID': 'batch-2' },
                    timestamps: [],
                    startLine: 5,
                    endLine: 6,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found1 = repo.findById('batch-1');
            assert.ok(found1);
            assert.strictEqual(found1!.title, 'Batch 1');

            const found2 = repo.findById('batch-2');
            assert.ok(found2);
            assert.strictEqual(found2!.title, 'Batch 2');
        });

        it('should handle empty array', () => {
            repo.insertBatch([]);
            assert.strictEqual(repo.countByFileUri('/test/file.org'), 0);
        });
    });

    describe('findById', () => {
        it('should return null for non-existent ID', () => {
            const found = repo.findById('non-existent');
            assert.strictEqual(found, null);
        });

        it('should find heading by ID', () => {
            const heading: OrgHeading = {
                id: 'find-id',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Find Me',
                tags: [],
                properties: { 'ID': 'find-id' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const found = repo.findById('find-id');
            assert.ok(found);
            assert.strictEqual(found!.title, 'Find Me');
        });
    });

    describe('findByFileUri', () => {
        it('should return empty array for non-existent file', () => {
            const headings = repo.findByFileUri('/non/existent');
            assert.deepStrictEqual(headings, []);
        });

        it('should find all headings in a file', () => {
            const heading: OrgHeading = {
                id: 'file-1',
                fileUri: '/test/file1.org',
                level: 1,
                title: 'File Heading',
                tags: [],
                properties: { 'ID': 'file-1' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const headings = repo.findByFileUri('/test/file1.org');
            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].id, 'file-1');
        });

        it('should return headings in order by start_line', () => {
            const h1: OrgHeading = {
                id: 'order-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'First',
                tags: [],
                properties: { 'ID': 'order-1' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const h2: OrgHeading = {
                id: 'order-2',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Second',
                tags: [],
                properties: { 'ID': 'order-2' },
                timestamps: [],
                startLine: 10,
                endLine: 11,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(h2); // Insert out of order
            repo.insert(h1);

            const headings = repo.findByFileUri('/test/file.org');
            assert.strictEqual(headings.length, 2);
            assert.strictEqual(headings[0].id, 'order-1');
            assert.strictEqual(headings[1].id, 'order-2');
        });
    });

    describe('findByTodoState', () => {
        it('should find headings by TODO state', () => {
            const heading: OrgHeading = {
                id: 'todo-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Todo Item',
                todoState: 'TODO',
                todoCategory: 'todo',
                properties: { 'ID': 'todo-1' },
                tags: [],
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const headings = repo.findByTodoState('TODO');
            assert.ok(headings.length >= 1);
            const found = headings.find(h => h.id === 'todo-1');
            assert.ok(found);
        });
    });

    describe('findByTag', () => {
        it('should find headings by tag', () => {
            const heading: OrgHeading = {
                id: 'tag-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Tagged Item',
                tags: ['my-tag'],
                properties: { 'ID': 'tag-1' },
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const headings = repo.findByTag('my-tag');
            assert.strictEqual(headings.length, 1);
            assert.strictEqual(headings[0].id, 'tag-1');
        });
    });

    describe('findScheduledBetween', () => {
        it('should find headings scheduled in date range', () => {
            const d1 = new Date('2024-02-01');
            const d2 = new Date('2024-02-05');
            const rangeStart = new Date('2024-02-01');
            const rangeEnd = new Date('2024-02-10');

            const heading: OrgHeading = {
                id: 'sched-2',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Scheduled Item',
                scheduled: d1,
                tags: [],
                properties: { 'ID': 'sched-2' },
                timestamps: [],
                startLine: 2,
                endLine: 3,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const headings = repo.findScheduledBetween(rangeStart, rangeEnd);
            const found = headings.find(h => h.id === 'sched-2');
            assert.ok(found);
        });
    });

    describe('findDeadlineBetween', () => {
        it('should find headings with deadline in date range', () => {
            const d1 = new Date('2024-03-01');
            const rangeStart = new Date('2024-03-01');
            const rangeEnd = new Date('2024-03-10');

            const heading: OrgHeading = {
                id: 'dead-2',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Deadline Item',
                deadline: d1,
                tags: [],
                properties: { 'ID': 'dead-2' },
                timestamps: [],
                startLine: 2,
                endLine: 3,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const headings = repo.findDeadlineBetween(rangeStart, rangeEnd);
            const found = headings.find(h => h.id === 'dead-2');
            assert.ok(found);
        });
    });

    describe('deleteByFileUri', () => {
        it('should delete all headings for a file', () => {
            const heading: OrgHeading = {
                id: 'del-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Delete Me',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            repo.deleteByFileUri('/test/file.org');
            const count = repo.countByFileUri('/test/file.org');
            assert.strictEqual(count, 0);
        });

        it('should also delete associated tags', () => {
            const heading: OrgHeading = {
                id: 'del-tag-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Delete Tags',
                tags: ['tag-to-delete'],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            repo.deleteByFileUri('/test/file.org');

            const headings = repo.findByTag('tag-to-delete');
            assert.strictEqual(headings.length, 0);
        });
    });

    describe('countByFileUri', () => {
        it('should count headings in a file', () => {
            const heading: OrgHeading = {
                id: 'count-1',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Count Me',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 1,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            repo.insert(heading);

            const count = repo.countByFileUri('/test/file.org');
            assert.strictEqual(count, 1);
        });

        it('should return 0 for non-existent file', () => {
            const count = repo.countByFileUri('/non/existent');
            assert.strictEqual(count, 0);
        });
    });
});
