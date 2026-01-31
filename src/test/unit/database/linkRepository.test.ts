
import * as assert from 'assert';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaManager } from '../../../database/schemaManager';
import { LinkRepository } from '../../../database/linkRepository';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { OrgLink } from '../../../database/types';

const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

suite('LinkRepository Integration Tests', () => {
    let db: any;
    let repo: LinkRepository;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;

    setup(async function () {
        this.timeout(5000);
        const SQL = await initSqlJs({ locateFile: () => wasmPath });
        db = new SQL.Database();

        // Init schema compatible with sql.js (loading schema.sql)
        const schemaManager = new SchemaManager(db);
        try {
            schemaManager.initialize();
        } catch (e) {
            const paths = [
                path.join(__dirname, '../../../../src/database/schema.sql'),
                path.join(__dirname, '../../../../out/schema.sql')
            ];
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    db.exec(fs.readFileSync(p, 'utf8'));
                    break;
                }
            }
        }

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
        repo = new LinkRepository(db);

        // Helper to create dummy files
        const createDummyFile = (uri: string) => {
            fileRepo.insert({
                uri,
                hash: 'hash',
                title: 'Test File',
                properties: {},
                tags: [],
                headings: [],
                updatedAt: new Date()
            });
        };

        // Helper to create dummy headings
        const createDummyHeading = (uri: string, line: number, id?: string) => {
            headingRepo.insert({
                fileUri: uri,
                startLine: line,
                endLine: line + 1,
                level: 1,
                title: 'Heading',
                content: '',
                tags: [],
                properties: id ? { ID: id } : {},
                headings: [],
                todoState: undefined,
                priority: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                category: undefined
            } as any);
        };

        // Insert ALL source files used in tests
        createDummyFile('/test/source.org');
        createDummyFile('/test/source1.org');
        createDummyFile('/test/source2.org');
        createDummyFile('/test/source3.org');
        createDummyFile('/test/file.org');
        createDummyFile('/test/file1.org');
        createDummyFile('/test/file2.org');
        createDummyFile('/test/target.org');
        createDummyFile('/test/target1.org');
        createDummyFile('/test/target2.org');
        createDummyFile('/test/target3.org');
        createDummyFile('/test/other.org');
        createDummyFile('/test/no-backlinks.org');

        // Insert REQUIRED headings for FK constraints
        createDummyHeading('/test/source.org', 10, 'source-id');
        createDummyHeading('/test/target.org', 5, 'target-id');
        createDummyHeading('/test/file.org', 0);
        createDummyHeading('/test/file.org', 11);
        createDummyHeading('/test/target.org', 20);
        createDummyHeading('/test/other.org', 0);
    });

    teardown(() => {
        if (db) db.close();
    });

    suite('insert', () => {
        test('should insert and retrieve a link', () => {
            const link: OrgLink = {
                sourceUri: '/test/source.org',
                sourceHeadingLine: 10,
                sourceHeadingId: 'source-id',
                lineNumber: 12,
                targetUri: '/test/target.org',
                targetHeadingLine: 5,
                targetId: 'target-id',
                linkType: 'file',
                linkText: 'My Link'
            };

            repo.insert(link);

            const found = repo.findBySourceUri('/test/source.org');
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].linkText, 'My Link');
            assert.strictEqual(found[0].targetUri, '/test/target.org');
        });

        test('should handle minimal link data', () => {
            const link: OrgLink = {
                sourceUri: '/test/source.org',
                targetUri: '/test/target.org',
                linkType: 'file',
                lineNumber: 0
            };

            repo.insert(link);

            const found = repo.findBySourceUri('/test/source.org');
            assert.strictEqual(found.length, 1);
            assert.strictEqual(found[0].targetUri, '/test/target.org');
        });
    });

    suite('insertBatch', () => {
        test('should insert multiple links', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetUri: '/test/target1.org',
                    lineNumber: 1,
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/source1.org',
                    targetUri: '/test/target2.org',
                    lineNumber: 2,
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceUri('/test/source1.org');
            assert.strictEqual(found.length, 2);
        });

        test('should return links ordered by lineNumber', () => {
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

    suite('findByTargetUri', () => {
        test('should find all backlinks to a target file', () => {
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

        test('should return empty array if no backlinks', () => {
            const backlinks = repo.findByTargetUri('/test/no-backlinks.org');
            assert.strictEqual(backlinks.length, 0);
        });
    });

    suite('findByTargetId', () => {
        test('should find all links to a target ID', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetId: 'target-id-uuid',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetId: 'target-id-uuid',
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetId: 'other-id',
                    linkType: 'id'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findByTargetId('target-id-uuid');
            assert.strictEqual(found.length, 2);
        });
    });

    suite('findBySourceHeading', () => {
        test('should find links from a specific heading', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingLine: 0, // heading-1
                    targetUri: '/test/target1.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingLine: 0,
                    targetUri: '/test/target2.org',
                    linkType: 'file'
                },
                {
                    sourceUri: '/test/file.org',
                    sourceHeadingLine: 11, // heading-2
                    targetUri: '/test/target3.org',
                    linkType: 'file'
                }
            ];

            repo.insertBatch(links);

            const found = repo.findBySourceHeading('/test/file.org', 0);
            assert.strictEqual(found.length, 2);
        });
    });

    suite('findByTargetHeading', () => {
        test('should find backlinks to a specific heading', () => {
            const links: OrgLink[] = [
                {
                    sourceUri: '/test/source1.org',
                    targetUri: '/test/target.org',
                    targetHeadingLine: 20, // target-heading
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source2.org',
                    targetUri: '/test/target.org',
                    targetHeadingLine: 20,
                    linkType: 'id'
                },
                {
                    sourceUri: '/test/source3.org',
                    targetUri: '/test/other.org',
                    targetHeadingLine: 0, // other-heading
                    linkType: 'id'
                }
            ];

            repo.insertBatch(links);

            const backlinks = repo.findByTargetHeading('/test/target.org', 20);
            assert.strictEqual(backlinks.length, 2);
        });
    });

    suite('deleteByFileUri', () => {
        test('should delete all links from a file', () => {
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

    suite('countBySourceUri', () => {
        test('should count links from a file', () => {
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

        test('should return 0 for non-existent file', () => {
            const count = repo.countBySourceUri('/non-existent.org');
            assert.strictEqual(count, 0);
        });
    });

    suite('countByTargetUri', () => {
        test('should count backlinks to a file', () => {
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
