
import * as assert from 'assert';
import { OrgHeading, OrgFile, SearchFilters, Priority, OrgStatistics } from '../../../database/types';

suite('Database Types Tests', () => {

    suite('OrgHeading', () => {
        test('should have required fields', () => {
            const heading: OrgHeading = {
                id: 'test-id-123',
                fileUri: '/test.org',
                level: 1,
                title: 'Test Heading',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 10,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            assert.strictEqual(heading.id, 'test-id-123');
            assert.strictEqual(heading.level, 1);
            assert.strictEqual(heading.title, 'Test Heading');
        });

        test('should support TODO state and priority', () => {
            const heading: OrgHeading = {
                id: 'todo-heading',
                fileUri: '/test.org',
                level: 2,
                title: 'Important Task',
                todoState: 'TODO',
                todoCategory: 'todo',
                priority: 'A',
                tags: ['work', 'urgent'],
                properties: {},
                timestamps: [],
                startLine: 10,
                endLine: 15,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            assert.strictEqual(heading.todoState, 'TODO');
            assert.strictEqual(heading.priority, 'A');
            assert.deepStrictEqual(heading.tags, ['work', 'urgent']);
        });

        test('should support all priority levels', () => {
            const priorities: Priority[] = ['A', 'B', 'C'];
            for (const p of priorities) {
                const h: OrgHeading = {
                    id: 'p', fileUri: 'f', level: 1, title: 't', priority: p, tags: [], properties: {}, timestamps: [], startLine: 0, endLine: 1, childrenIds: [], content: '', createdAt: new Date(), updatedAt: new Date()
                };
                assert.strictEqual(h.priority, p);
            }
        });

        test('should support scheduled and deadline dates', () => {
            const scheduled = new Date('2026-01-28');
            const deadline = new Date('2026-02-01');

            const heading: OrgHeading = {
                id: 'dated-heading',
                fileUri: '/test.org',
                level: 1,
                title: 'Task with dates',
                scheduled,
                deadline,
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 3,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            assert.deepStrictEqual(heading.scheduled, scheduled);
            assert.deepStrictEqual(heading.deadline, deadline);
        });
    });

    suite('OrgFile', () => {
        test('should have required fields', () => {
            const file: OrgFile = {
                uri: '/path/to/file.org',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date(),
                hash: 'abc123',
                createdAt: new Date()
            };

            assert.strictEqual(file.uri, '/path/to/file.org');
            assert.strictEqual(file.hash, 'abc123');
            assert.strictEqual(file.headings.length, 0);
            assert.ok(file.createdAt instanceof Date);
        });

        test('should support optional properties', () => {
            const file: OrgFile = {
                uri: '/path/to/file.org',
                title: 'My Document',
                properties: { 'AUTHOR': 'John Doe' },
                tags: ['project'],
                headings: [],
                updatedAt: new Date(),
                hash: 'def456',
                createdAt: new Date()
            };
            assert.strictEqual(file.title, 'My Document');
            assert.strictEqual(file.properties['AUTHOR'], 'John Doe');
        });
    });

    suite('SearchFilters', () => {
        test('should support all filter types', () => {
            const filter: SearchFilters = {
                todoStates: ['TODO', 'NEXT'],
                tags: ['work'],
                priorities: ['A', 'B'],
                dateRange: {
                    start: new Date('2026-01-01'),
                    end: new Date('2026-12-31')
                },
                fileUris: ['/project.org'],
                levels: [1, 2]
            };
            assert.strictEqual(filter.todoStates?.length, 2);
            assert.strictEqual(filter.priorities?.length, 2);
        });
    });

    suite('OrgStatistics', () => {
        test('should create valid statistics', () => {
            const stats: OrgStatistics = {
                totalFiles: 10,
                totalHeadings: 100,
                todoCount: new Map([['TODO', 30], ['DONE', 70]]),
                tagCount: new Map([['work', 50]]),
                priorityCount: new Map([['A', 10]])
            };
            assert.strictEqual(stats.totalFiles, 10);
            assert.strictEqual(stats.todoCount.get('TODO'), 30);
        });
    });
});
