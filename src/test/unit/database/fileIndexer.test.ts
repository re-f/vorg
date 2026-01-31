import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConnection } from '../../../database/connection';
import { FileRepository } from '../../../database/fileRepository';
import { HeadingRepository } from '../../../database/headingRepository';
import { LinkRepository } from '../../../database/linkRepository';
import { UniorgAstExtractor } from '../../../database/uniorgAstExtractor';
import { FileIndexer } from '../../../database/fileIndexer';
import { OrgFile } from '../../../database/types';

describe('FileIndexer', () => {
    let connection: DatabaseConnection;
    let fileRepo: FileRepository;
    let headingRepo: HeadingRepository;
    let linkRepo: LinkRepository;
    let extractor: UniorgAstExtractor;
    let indexer: FileIndexer;
    let dbPath: string;

    beforeEach(async () => {
        // Setup in-memory database or temp file
        dbPath = path.join(__dirname, 'test-indexer.sqlite');
        connection = DatabaseConnection.getInstance();
        await connection.initialize(dbPath);

        // Reset DB
        connection.getSchemaManager().reset();
        connection.getSchemaManager().initialize();

        fileRepo = new FileRepository(connection.getDatabase());
        headingRepo = new HeadingRepository(connection.getDatabase());
        linkRepo = new LinkRepository(connection.getDatabase());
        extractor = new UniorgAstExtractor();

        indexer = new FileIndexer(
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

    it('should index a simple file correctly', async () => {
        const uri = '/test/simple.org';
        const content = `
#+TITLE: Test File
#+FILETAGS: :work:

* TODO Task 1
** Subtask
`;
        await indexer.indexFile(uri, content);

        // Verify File
        const file = fileRepo.findByUri(uri);
        assert.ok(file, 'File should exist');
        assert.strictEqual(file!.title, 'Test File');
        assert.deepStrictEqual(file!.tags, ['work']);

        // Verify Headings
        const headings = headingRepo.findByFileUri(uri);
        assert.strictEqual(headings.length, 2);
        assert.strictEqual(headings[0].title, 'Task 1');
        assert.strictEqual(headings[1].title, 'Subtask'); // Note: extractor logic might trim title

        // Verify Hash (index again same content should skip)

        // Change content and re-index
        const newContent = '* New Heading';
        await indexer.indexFile(uri, newContent);

        const newHeadings = headingRepo.findByFileUri(uri);
        assert.strictEqual(newHeadings.length, 1);
        assert.strictEqual(newHeadings[0].title, 'New Heading');
    });

    it('should handle links', async () => {
        const uri = '/test/links.org';
        const content = 'Link to [[file:other.org][Other]]';

        await indexer.indexFile(uri, content);

        const links = linkRepo.findBySourceUri(uri);
        assert.strictEqual(links.length, 1);
        // Expect path without 'file:' prefix because extractLinks logic returns node.path
        // and uniorg parses [[file:path]] as path='path'.
        assert.strictEqual(links[0].targetUri, 'other.org');
    });

    it('should update existing file data', async () => {
        const uri = '/test/update.org';
        await indexer.indexFile(uri, '#+TITLE: Old');

        let file = fileRepo.findByUri(uri);
        assert.strictEqual(file!.title, 'Old');

        await indexer.indexFile(uri, '#+TITLE: New');
        file = fileRepo.findByUri(uri);
        assert.strictEqual(file!.title, 'New');
    });

    it('should skip indexing if hash matches and not forced', async () => {
        const uri = '/test/skip.org';
        const content = '* Original';

        await indexer.indexFile(uri, content);

        // Manual hack: set updated_at to past to verify it DOES NOT change
        // We use raw SQL or repo update to set time back (5 seconds ago)
        const past = new Date(Date.now() - 5000);

        // We need to fetch the file to get other properties for update
        // because update() takes Partial<OrgFile> but implementation might behave specific ways
        // But FileRepository.update logic:
        // if (file.updatedAt !== undefined) { values.push(Math.floor(file.updatedAt.getTime() / 1000)); }
        // So we can partial update.
        fileRepo.update({
            uri,
            updatedAt: past
        });

        // Verify it was set back
        let file = fileRepo.findByUri(uri);
        // Note: SQLite INTEGER stores seconds. Math.floor comparison.
        assert.strictEqual(Math.floor(file!.updatedAt.getTime() / 1000), Math.floor(past.getTime() / 1000));

        // Re-index same content
        await indexer.indexFile(uri, content);

        // Should NOT update (so timestamp remains in past)
        const skippedFile = fileRepo.findByUri(uri);
        assert.strictEqual(skippedFile!.updatedAt.getTime(), file!.updatedAt.getTime());
    });

    it('should force re-indexing', async () => {
        const uri = '/test/force.org';
        const content = '* Original';

        await indexer.indexFile(uri, content);

        // Manual hack: set updated_at to past
        const past = new Date(Date.now() - 5000);
        fileRepo.update({
            uri,
            updatedAt: past
        });

        // Force re-index
        await indexer.indexFile(uri, content, true); // force=true

        const updatedFile = fileRepo.findByUri(uri);

        // Should be NOW (much newer than past)
        // Check if updatedFile time is roughly now (greater than past + 1s)
        assert.ok(updatedFile!.updatedAt.getTime() > past.getTime() + 1000,
            `Timestamp should updated. Got ${updatedFile!.updatedAt.getTime()}, Past was ${past.getTime()}`);
    });
});
