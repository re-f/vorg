import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConnection } from '../../../database/connection';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { LinkRepository } from '../../../database/linkRepository';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';
import { FileIndexer } from '../../../database/fileIndexer';
import { WorkspaceIndexer, FileProvider } from '../../../database/workspaceIndexer';

class MockFileProvider implements FileProvider {
    constructor(private files: Record<string, string>) { }

    async findFiles(pattern: string): Promise<string[]> {
        // Simple glob-like match for test
        if (pattern === '**/*.{org,org_archive}') {
            return Object.keys(this.files).filter(f => f.endsWith('.org') || f.endsWith('.org_archive'));
        }
        return [];
    }

    async readFile(uri: string): Promise<string> {
        const content = this.files[uri];
        if (content === undefined) {
            throw new Error(`File not found: ${uri}`);
        }
        return content;
    }
}

describe('WorkspaceIndexer', () => {
    let connection: DatabaseConnection;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository; // Needed for FileIndexer
    let linkRepo: LinkRepository; // Needed for FileIndexer
    let extractor: UniorgAstExtractor; // Needed for FileIndexer
    let fileIndexer: FileIndexer;
    let workspaceIndexer: WorkspaceIndexer;
    let dbPath: string;

    beforeEach(async () => {
        dbPath = path.join(__dirname, 'test-workspace-indexer.sqlite');
        connection = DatabaseConnection.getInstance();
        await connection.initialize(dbPath);
        connection.getSchemaManager().reset();
        connection.getSchemaManager().initialize();

        const db = connection.getDatabase();
        fileRepo = new FileRepository(db);
        headingRepo = new HeadingRepository(db);
        linkRepo = new LinkRepository(db);
        extractor = new UniorgAstExtractor();

        fileIndexer = new FileIndexer(
            connection,
            fileRepo,
            headingRepo,
            linkRepo,
            extractor
        );
    });

    afterEach(() => {
        connection.close();
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
        DatabaseConnection.resetInstance();
    });

    it('should index all files found by provider', async () => {
        const files = {
            '/root/a.org': '* Task A',
            '/root/b.org': '* Task B',
            '/root/subdir/c.org': '* Task C'
        };
        const provider = new MockFileProvider(files);
        workspaceIndexer = new WorkspaceIndexer(fileIndexer, provider);

        await workspaceIndexer.indexWorkspace();

        assert.strictEqual(fileRepo.count(), 3);

        const fileA = fileRepo.findByUri('/root/a.org');
        assert.ok(fileA);
        assert.strictEqual(fileA!.title, null); // No title prop, DB returns null
    });

    it('should handle file read errors gracefully', async () => {
        const files = {
            '/root/good.org': '* Good',
            '/root/bad.org': 'SHOULD FAIL'
        };

        const provider = new MockFileProvider(files);

        // Mock readFile to throw for bad.org
        const originalRead = provider.readFile.bind(provider);
        provider.readFile = async (uri) => {
            if (uri.includes('bad')) throw new Error('Read error');
            return originalRead(uri);
        };

        workspaceIndexer = new WorkspaceIndexer(fileIndexer, provider);

        await workspaceIndexer.indexWorkspace();

        assert.strictEqual(fileRepo.count(), 1, 'Should index only good file');
        assert.ok(fileRepo.findByUri('/root/good.org'));
    });

    it('should force re-index when requested', async () => {
        const uri = '/root/test.org';
        const files = { [uri]: '* Content' };
        const provider = new MockFileProvider(files);
        workspaceIndexer = new WorkspaceIndexer(fileIndexer, provider);

        // First index
        await workspaceIndexer.indexWorkspace();
        const firstUpdate = fileRepo.findByUri(uri)!.updatedAt;

        // Manual hack time back
        const past = new Date(Date.now() - 5000);
        fileRepo.update({ uri, updatedAt: past });

        // Second index (default force=false) -> should skip
        await workspaceIndexer.indexWorkspace(false);
        const secondUpdate = fileRepo.findByUri(uri)!.updatedAt;
        assert.strictEqual(Math.floor(secondUpdate.getTime() / 1000), Math.floor(past.getTime() / 1000));

        // Third index (force=true) -> should update
        await workspaceIndexer.indexWorkspace(true);
        const thirdUpdate = fileRepo.findByUri(uri)!.updatedAt;
        assert.ok(thirdUpdate.getTime() > past.getTime() + 1000);
    });
});
