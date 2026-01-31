import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as Database from 'better-sqlite3';
import { LinkRepository } from '../../../database/linkRepository';
import { SchemaManager } from '../../../database/schemaManager';
import { OrgLink } from '../../../database/types';

describe('LinkRepository', () => {
    let db: Database.Database;
    let repo: LinkRepository;
    let testDbPath: string;

    beforeEach(() => {
        // 创建临时测试数据库
        testDbPath = path.join(__dirname, `test-links-${Date.now()}.db`);
        db = new Database(testDbPath);

        // 初始化 schema
        const schemaManager = new SchemaManager(db);
        schemaManager.initialize();

        repo = new LinkRepository(db);

        // 预先插入常用的测试文件 (满足外键约束)
        const testFiles = [
            '/test/source.org',
            '/test/file.org',
            '/test/file1.org',
            '/test/file2.org',
            '/test/source.org', // Added missing source.org
            '/test/source1.org',
            '/test/source2.org',
            '/test/source3.org',
            '/test/target.org',
            '/test/target1.org',
            '/test/target2.org',
            '/test/target3.org',
            '/test/other.org'
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO files (uri, hash, updated_at)
            VALUES (?, ?, ?)
        `);

        for (const uri of testFiles) {
            stmt.run(uri, 'test-hash', Math.floor(Date.now() / 1000));
        }

        // 预先插入常用的测试 headings (满足外键约束)
        const headingStmt = db.prepare(`
            INSERT OR IGNORE INTO headings (
                id, file_uri, level, title, start_line, end_line, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const testHeadings = [
            ['source-heading-id', '/test/source.org', 1, 'Source Heading', 0, 10],
            ['target-heading-id', '/test/target.org', 1, 'Target Heading', 0, 10],
            ['heading-1', '/test/file.org', 1, 'Heading 1', 0, 10],
            ['heading-2', '/test/file.org', 1, 'Heading 2', 11, 20],
            ['other-heading', '/test/other.org', 1, 'Other Heading', 0, 10],
            ['target-heading', '/test/target.org', 1, 'Target Heading', 0, 10]
        ];

        const now = Math.floor(Date.now() / 1000);
        for (const [id, fileUri, level, title, startLine, endLine] of testHeadings) {
            headingStmt.run(id, fileUri, level, title, startLine, endLine, now);
        }
    });

    afterEach(() => {
        // 清理
        db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    // Helper: 插入测试用的 file 记录 (满足外键约束)
    function insertTestFile(uri: string) {
        db.prepare(`
            INSERT OR IGNORE INTO files (uri, hash, updated_at)
            VALUES (?, ?, ?)
        `).run(uri, 'test-hash', Math.floor(Date.now() / 1000));
    }

    describe('insert', () => {
        it('should insert a new link', () => {
            const link: OrgLink = {
                sourceUri: '/test/source.org',
                lineNumber: 10,
                targetUri: '/test/target.org',
                linkType: 'file',
                linkText: 'Link to target'
            };

            repo.insert(link);

            const found = repo.findBySourceUri('/test/source.org');
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].sourceUri, '/test/source.org');
            assert.strictEqual(found[0].targetUri, '/test/target.org');
            assert.strictEqual(found[0].linkType, 'file');
        });

        it('should insert link with heading IDs', () => {
            const link: OrgLink = {
                sourceUri: '/test/source.org',
                sourceHeadingId: 'source-heading-id',
                targetHeadingId: 'target-heading-id',
                linkType: 'id',
                linkText: 'Link to heading'
            };

            repo.insert(link);

            const found = repo.findBySourceHeadingId('source-heading-id');
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].targetHeadingId, 'target-heading-id');
        });

        it('should insert link with target ID', () => {
            const link: OrgLink = {
                sourceUri: '/test/source.org',
                targetId: 'abc-123',
                linkType: 'id'
            };

            repo.insert(link);

            const found = repo.findByTargetId('abc-123');
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].targetId, 'abc-123');
        });
    });

    describe('insertBatch', () => {
        it('should insert multiple links', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 1,
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 5,
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 10,
                    targetId: 'some-id',
                    linkType: 'id'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceUri('/test/file.org');
            assert.strictEqual(found.length, 3);
            assert.strictEqual(found[0].lineNumber, 1);
            assert.strictEqual(found[1].lineNumber, 5);
            assert.strictEqual(found[2].lineNumber, 10);
        });

        it('should handle empty array', () => {
            repo.insertBatch([]);
            // Should not throw
        });
    });

    describe('findBySourceUri', () => {
        it('should return empty array for non-existent file', () => {
            const found = repo.findBySourceUri('/non-existent.org');
            assert.strictEqual(found.length, 0);
        });

        it('should find all links from a source file', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source.org',
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source.org',
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/other.org',
                    targetUri: '/test/target3.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceUri('/test/source.org');
            assert.strictEqual(found.length, 2);
        });

        it('should return links ordered by lineNumber', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 20,
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 5,
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    lineNumber: 10,
                    targetUri: '/test/target3.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceUri('/test/file.org');
            assert.strictEqual(found[0].lineNumber, 5);
            assert.strictEqual(found[1].lineNumber, 10);
            assert.strictEqual(found[2].lineNumber, 20);
        });
    });

    describe('findByTargetUri', () => {
        it('should find all backlinks to a target file', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetUri: '/test/target.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetUri: '/test/target.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetUri: '/test/other.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const backlinks = repo.findByTargetUri('/test/target.org');
            assert.strictEqual(backlinks.length, 2);
            assert.strictEqual(backlinks[0].sourceUri, '/test/source1.org');
            assert.strictEqual(backlinks[1].sourceUri, '/test/source2.org');
        });

        it('should return empty array if no backlinks', () => {
            const backlinks = repo.findByTargetUri('/test/no-backlinks.org');
            assert.strictEqual(backlinks.length, 0);
        });
    });

    describe('findByTargetId', () => {
        it('should find all links to a target ID', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetId: 'target-id',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetId: 'target-id',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetId: 'other-id',
                    linkType: 'id'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findByTargetId('target-id');
            assert.strictEqual(found.length, 2);
        });
    });

    describe('findBySourceHeadingId', () => {
        it('should find links from a specific heading', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingId: 'heading-1',
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingId: 'heading-1',
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingId: 'heading-2',
                    targetUri: '/test/target3.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceHeadingId('heading-1');
            assert.strictEqual(found.length, 2);
        });
    });

    describe('findByTargetHeadingId', () => {
        it('should find backlinks to a specific heading', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetHeadingId: 'target-heading',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetHeadingId: 'target-heading',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetHeadingId: 'other-heading',
                    linkType: 'id'
                }
            ];

            repo.insertBatch(links);

            const backlinks = repo.findByTargetHeadingId('target-heading');
            assert.strictEqual(backlinks.length, 2);
        });
    });

    describe('deleteByFileUri', () => {
        it('should delete all links from a file', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file1.org',
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file1.org',
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file2.org',
                    targetUri: '/test/target3.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            repo.deleteByFileUri('/test/file1.org');

            const file1Links = repo.findBySourceUri('/test/file1.org');
            assert.strictEqual(file1Links.length, 0);

            const file2Links = repo.findBySourceUri('/test/file2.org');
            assert.strictEqual(file2Links.length, 1);
        });
    });

    describe('countBySourceUri', () => {
        it('should count links from a file', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file.org',
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const count = repo.countBySourceUri('/test/file.org');
            assert.strictEqual(count, 2);
        });

        it('should return 0 for non-existent file', () => {
            const count = repo.countBySourceUri('/non-existent.org');
            assert.strictEqual(count, 0);
        });
    });

    describe('countByTargetUri', () => {
        it('should count backlinks to a file', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetUri: '/test/target.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetUri: '/test/target.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetUri: '/test/target.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const count = repo.countByTargetUri('/test/target.org');
            assert.strictEqual(count, 3);
        });
    });
});
