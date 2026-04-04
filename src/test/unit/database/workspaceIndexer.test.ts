
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { DatabaseConnection } from '../../../database/connection';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { LinkRepository } from '../../../database/linkRepository';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';
import { FileIndexer } from '../../../database/fileIndexer';
import { SchemaManager } from '../../../database/schemaManager';
import { WorkspaceIndexer, FileProvider } from '../../../database/workspaceIndexer';
import { ConfigService } from '../../../services/configService';

const wasmPath = path.join(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm');

/** Mutable mock: simulate workspace scan returning different file sets between runs */
class MutableMockFileProvider implements FileProvider {
    uris: string[] = [];

    async findFiles(_pattern: string): Promise<string[]> {
        return this.uris;
    }

    async readFile(_uri: string): Promise<string> {
        return '* Indexed heading\n';
    }
}

suite('WorkspaceIndexer Tests', () => {
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;
    let linkRepo: LinkRepository;
    let extractor: UniorgAstExtractor;
    let indexer: FileIndexer;
    let db: any;
    let mockProvider: MutableMockFileProvider;
    let workspaceIndexer: WorkspaceIndexer;

    setup(async function () {
        this.timeout(10000);

        const SQL = await initSqlJs({ locateFile: () => wasmPath });
        db = new SQL.Database();

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

        const mockConn = {
            getDatabase: () => db,
            transaction: (fn: (db: any) => any) => fn(db)
        } as unknown as DatabaseConnection;

        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
        linkRepo = new LinkRepository(db);
        extractor = new UniorgAstExtractor();

        indexer = new FileIndexer(
            mockConn,
            fileRepo,
            headingRepo,
            linkRepo,
            extractor,
            ConfigService.default()
        );

        mockProvider = new MutableMockFileProvider();
        workspaceIndexer = new WorkspaceIndexer(indexer, mockProvider);
    });

    teardown(() => {
        if (db) db.close();
    });

    test('indexWorkspace removes stale files when scan returns fewer URIs than DB', async () => {
        const a = '/ws/stale-a.org';
        const b = '/ws/stale-b.org';
        mockProvider.uris = [a, b];

        await workspaceIndexer.indexWorkspace(false);

        assert.strictEqual(fileRepo.count(), 2);
        assert.ok(fileRepo.findByUri(a));
        assert.ok(fileRepo.findByUri(b));

        mockProvider.uris = [a];
        await workspaceIndexer.indexWorkspace(false);

        assert.strictEqual(fileRepo.count(), 1);
        assert.ok(fileRepo.findByUri(a));
        assert.strictEqual(fileRepo.findByUri(b), null);
        assert.strictEqual(headingRepo.findByFileUri(b).length, 0);
    });
});
