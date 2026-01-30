/**
 * Unit tests for database type definitions
 * 
 * Tests type constraints, required fields, and default values
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';
import {
    OrgHeading,
    OrgFile,
    OrgLink,
    Timestamp,
    Priority,
    TimestampType,
    LinkType,
    SearchFilters,
    OrgStatistics
} from '../../../database/types';

describe('Database Types', () => {
    describe('Timestamp', () => {
        it('should create valid timestamp with required fields', () => {
            const timestamp: Timestamp = {
                date: new Date('2026-01-28'),
                type: 'scheduled'
            };

            assert.strictEqual(timestamp.type, 'scheduled');
            assert.ok(timestamp.date instanceof Date);
        });

        it('should support optional repeater and warning', () => {
            const timestamp: Timestamp = {
                date: new Date('2026-01-28'),
                type: 'deadline',
                repeater: '+1w',
                warning: '-3d'
            };

            assert.strictEqual(timestamp.repeater, '+1w');
            assert.strictEqual(timestamp.warning, '-3d');
        });

        it('should accept all timestamp types', () => {
            const types: TimestampType[] = ['active', 'inactive', 'scheduled', 'deadline', 'closed'];

            types.forEach(type => {
                const ts: Timestamp = {
                    date: new Date(),
                    type
                };
                assert.strictEqual(ts.type, type);
            });
        });
    });

    describe('OrgLink', () => {
        it('should create valid link with required fields', () => {
            const link: OrgLink = {
                sourceUri: '/path/to/file.org',
                linkType: 'file',
                linkText: 'Link to file'
            };

            assert.strictEqual(link.sourceUri, '/path/to/file.org');
            assert.strictEqual(link.linkType, 'file');
        });

        it('should support all link types', () => {
            const types: LinkType[] = ['file', 'id', 'heading', 'http', 'https'];

            types.forEach(type => {
                const link: OrgLink = {
                    sourceUri: '/test.org',
                    linkType: type,
                    linkText: 'test'
                };
                assert.strictEqual(link.linkType, type);
            });
        });

        it('should support optional target fields', () => {
            const link: OrgLink = {
                sourceUri: '/source.org',
                sourceHeadingId: 'heading-123',
                targetUri: '/target.org',
                targetHeadingId: 'heading-456',
                linkType: 'id',
                linkText: 'Cross-file link'
            };

            assert.strictEqual(link.sourceHeadingId, 'heading-123');
            assert.strictEqual(link.targetHeadingId, 'heading-456');
        });
    });

    describe('OrgHeading', () => {
        it('should create valid heading with required fields', () => {
            const heading: OrgHeading = {
                id: 'test-id-123',
                fileUri: '/test.org',
                level: 1,
                title: 'Test Heading',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 5,
                childrenIds: [],
                content: 'Test content',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            assert.strictEqual(heading.id, 'test-id-123');
            assert.strictEqual(heading.level, 1);
            assert.strictEqual(heading.title, 'Test Heading');
        });

        it('should support TODO state and priority', () => {
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

        it('should support all priority levels', () => {
            const priorities: Priority[] = ['A', 'B', 'C'];

            priorities.forEach(priority => {
                const heading: OrgHeading = {
                    id: `heading-${priority}`,
                    fileUri: '/test.org',
                    level: 1,
                    title: 'Test',
                    priority,
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
                assert.strictEqual(heading.priority, priority);
            });
        });

        it('should support scheduled and deadline dates', () => {
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

        it('should support parent-child relationships', () => {
            const parent: OrgHeading = {
                id: 'parent-id',
                fileUri: '/test.org',
                level: 1,
                title: 'Parent',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 0,
                endLine: 10,
                childrenIds: ['child-1', 'child-2'],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const child: OrgHeading = {
                id: 'child-1',
                fileUri: '/test.org',
                level: 2,
                title: 'Child',
                parentId: 'parent-id',
                tags: [],
                properties: {},
                timestamps: [],
                startLine: 2,
                endLine: 5,
                childrenIds: [],
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            assert.deepStrictEqual(parent.childrenIds, ['child-1', 'child-2']);
            assert.strictEqual(child.parentId, 'parent-id');
        });
    });

    describe('OrgFile', () => {
        it('should have required fields', () => {
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

        it('should support optional properties', () => {
            const file: OrgFile = {
                uri: '/path/to/file.org',
                title: 'My Document',
                properties: {
                    'AUTHOR': 'John Doe',
                    'DATE': '2024-01-01'
                },
                tags: ['project', 'important'],
                headings: [],
                updatedAt: new Date(),
                hash: 'def456',
                createdAt: new Date()
            };

            assert.strictEqual(file.title, 'My Document');
            assert.strictEqual(file.properties['AUTHOR'], 'John Doe');
            assert.deepStrictEqual(file.tags, ['project', 'important']);
            assert.ok(file.createdAt instanceof Date);
        });
    });

    describe('SearchFilters', () => {
        it('should create empty filter', () => {
            const filter: SearchFilters = {};

            assert.strictEqual(filter.todoStates, undefined);
            assert.strictEqual(filter.tags, undefined);
        });

        it('should support all filter types', () => {
            const filter: SearchFilters = {
                todoStates: ['TODO', 'NEXT'],
                tags: ['work', 'urgent'],
                priorities: ['A', 'B'],
                dateRange: {
                    start: new Date('2026-01-01'),
                    end: new Date('2026-12-31')
                },
                fileUris: ['/project.org'],
                levels: [1, 2]
            };

            assert.deepStrictEqual(filter.todoStates, ['TODO', 'NEXT']);
            assert.deepStrictEqual(filter.priorities, ['A', 'B']);
            assert.ok(filter.dateRange);
            assert.strictEqual(filter.levels?.length, 2);
        });
    });

    describe('OrgStatistics', () => {
        it('should create valid statistics', () => {
            const stats: OrgStatistics = {
                totalFiles: 10,
                totalHeadings: 100,
                todoCount: new Map([['TODO', 30], ['DONE', 70]]),
                tagCount: new Map([['work', 50], ['personal', 25]]),
                priorityCount: new Map([['A', 10], ['B', 20], ['C', 15]])
            };

            assert.strictEqual(stats.totalFiles, 10);
            assert.strictEqual(stats.todoCount.get('TODO'), 30);
            assert.strictEqual(stats.tagCount.get('work'), 50);
        });

        it('should support optional fields', () => {
            const stats: OrgStatistics = {
                totalFiles: 5,
                totalHeadings: 50,
                todoCount: new Map(),
                tagCount: new Map(),
                priorityCount: new Map(),
                databaseSize: 1024000,
                lastIndexTime: new Date()
            };

            assert.strictEqual(stats.databaseSize, 1024000);
            assert.ok(stats.lastIndexTime instanceof Date);
        });
    });
});
