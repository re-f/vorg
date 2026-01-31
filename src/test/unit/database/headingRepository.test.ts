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
                properties: {},
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

        it('should insert heading with TODO state', () => {
            const heading: OrgHeading = {
                id: 'test-id-2',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Task',
                todoState: 'TODO',
                todoCategory: 'todo',
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

            const found = repo.findById('test-id-4');
            assert.ok(found!.scheduled);
            assert.ok(found!.deadline);
            assert.strictEqual(found!.scheduled!.getTime(), scheduled.getTime());
            assert.strictEqual(found!.deadline!.getTime(), deadline.getTime());
        });
    });

    describe('insertBatch', () => {
        it('should insert multiple headings', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'batch-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Heading 1',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'batch-2',
                    fileUri: '/test/file.org',
                    level: 2,
                    title: 'Heading 2',
                    tags: ['tag1'],
                    properties: {},
                    timestamps: [],
                    startLine: 6,
                    endLine: 10,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'batch-3',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Heading 3',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 11,
                    endLine: 15,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found = repo.findByFileUri('/test/file.org');
            assert.strictEqual(found.length, 3);
            assert.strictEqual(found[0].id, 'batch-1');
            assert.strictEqual(found[1].id, 'batch-2');
            assert.strictEqual(found[2].id, 'batch-3');
        });

        it('should handle empty array', () => {
            repo.insertBatch([]);
            // Should not throw
        });
    });

    describe('findById', () => {
        it('should return null for non-existent ID', () => {
            const found = repo.findById('non-existent');
            assert.strictEqual(found, null);
        });

        it('should find heading by ID', () => {
            const heading: OrgHeading = {
                id: 'find-test',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Find Me',
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

            const found = repo.findById('find-test');
            assert.ok(found);
            assert.strictEqual(found!.title, 'Find Me');
        });
    });

    describe('findByFileUri', () => {
        it('should return empty array for non-existent file', () => {
            const found = repo.findByFileUri('/non-existent.org');
            assert.strictEqual(found.length, 0);
        });

        it('should find all headings in a file', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'file-1',
                    fileUri: '/test/file1.org',
                    level: 1,
                    title: 'Heading 1',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'file-2',
                    fileUri: '/test/file1.org',
                    level: 2,
                    title: 'Heading 2',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 6,
                    endLine: 10,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'file-3',
                    fileUri: '/test/file2.org',
                    level: 1,
                    title: 'Other File',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found = repo.findByFileUri('/test/file1.org');
            assert.strictEqual(found.length, 2);
            assert.strictEqual(found[0].id, 'file-1');
            assert.strictEqual(found[1].id, 'file-2');
        });

        it('should return headings in order by start_line', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'order-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Second',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 10,
                    endLine: 15,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'order-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'First',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found = repo.findByFileUri('/test/file.org');
            assert.strictEqual(found[0].id, 'order-1');
            assert.strictEqual(found[1].id, 'order-2');
        });
    });

    describe('findByTodoState', () => {
        it('should find headings by TODO state', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'todo-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 1',
                    todoState: 'TODO',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'todo-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 2',
                    todoState: 'DONE',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'todo-3',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 3',
                    todoState: 'TODO',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 4,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const todos = repo.findByTodoState('TODO');
            assert.strictEqual(todos.length, 2);
            assert.strictEqual(todos[0].id, 'todo-1');
            assert.strictEqual(todos[1].id, 'todo-3');

            const dones = repo.findByTodoState('DONE');
            assert.strictEqual(dones.length, 1);
            assert.strictEqual(dones[0].id, 'todo-2');
        });
    });

    describe('findByTag', () => {
        it('should find headings by tag', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'tag-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Work Task',
                    tags: ['work', 'urgent'],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'tag-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Personal Task',
                    tags: ['personal'],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'tag-3',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Another Work Task',
                    tags: ['work'],
                    properties: {},
                    timestamps: [],
                    startLine: 4,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const workTasks = repo.findByTag('work');
            assert.strictEqual(workTasks.length, 2);
            assert.strictEqual(workTasks[0].id, 'tag-1');
            assert.strictEqual(workTasks[1].id, 'tag-3');

            const urgentTasks = repo.findByTag('urgent');
            assert.strictEqual(urgentTasks.length, 1);
            assert.strictEqual(urgentTasks[0].id, 'tag-1');
        });
    });

    describe('findScheduledBetween', () => {
        it('should find headings scheduled in date range', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'sched-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 1',
                    scheduled: new Date('2024-01-25'),
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'sched-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 2',
                    scheduled: new Date('2024-01-28'),
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'sched-3',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 3',
                    scheduled: new Date('2024-02-01'),
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 4,
                    endLine: 5,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found = repo.findScheduledBetween(
                new Date('2024-01-26'),
                new Date('2024-01-31')
            );

            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].id, 'sched-2');
        });
    });

    describe('findDeadlineBetween', () => {
        it('should find headings with deadline in date range', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'dead-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 1',
                    deadline: new Date('2024-01-25'),
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'dead-2',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Task 2',
                    deadline: new Date('2024-01-30'),
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const found = repo.findDeadlineBetween(
                new Date('2024-01-28'),
                new Date('2024-01-31')
            );

            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].id, 'dead-2');
        });
    });

    describe('deleteByFileUri', () => {
        it('should delete all headings for a file', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'del-1',
                    fileUri: '/test/file1.org',
                    level: 1,
                    title: 'Heading 1',
                    tags: ['tag1'],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'del-2',
                    fileUri: '/test/file1.org',
                    level: 2,
                    title: 'Heading 2',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'del-3',
                    fileUri: '/test/file2.org',
                    level: 1,
                    title: 'Other File',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            repo.deleteByFileUri('/test/file1.org');

            const file1Headings = repo.findByFileUri('/test/file1.org');
            assert.strictEqual(file1Headings.length, 0);

            const file2Headings = repo.findByFileUri('/test/file2.org');
            assert.strictEqual(file2Headings.length, 1);
        });

        it('should also delete associated tags', () => {
            const heading: OrgHeading = {
                id: 'tag-del',
                fileUri: '/test/file.org',
                level: 1,
                title: 'Tagged Heading',
                tags: ['tag1', 'tag2'],
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

            // Verify tags exist
            const found = repo.findByTag('tag1');
            assert.strictEqual(found.length, 1);

            repo.deleteByFileUri('/test/file.org');

            // Tags should be gone
            const foundAfter = repo.findByTag('tag1');
            assert.strictEqual(foundAfter.length, 0);
        });
    });

    describe('countByFileUri', () => {
        it('should count headings in a file', () => {
            const headings: OrgHeading[] = [
                {
                    id: 'count-1',
                    fileUri: '/test/file.org',
                    level: 1,
                    title: 'Heading 1',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 0,
                    endLine: 1,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'count-2',
                    fileUri: '/test/file.org',
                    level: 2,
                    title: 'Heading 2',
                    tags: [],
                    properties: {},
                    timestamps: [],
                    startLine: 2,
                    endLine: 3,
                    childrenIds: [],
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            repo.insertBatch(headings);

            const count = repo.countByFileUri('/test/file.org');
            assert.strictEqual(count, 2);
        });

        it('should return 0 for non-existent file', () => {
            const count = repo.countByFileUri('/non-existent.org');
            assert.strictEqual(count, 0);
        });
    });
});
