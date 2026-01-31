import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { OrgSymbolIndexService } from '../../services/orgSymbolIndexService';
import { DatabaseConnection } from '../../database/connection';
import { FileIndexer } from '../../database/fileIndexer';
import { FileRepository } from '../../database/fileRepository';
import { HeadingRepository } from '../../database/headingRepository';
import { LinkRepository } from '../../database/linkRepository';
import { UniorgAstExtractor } from '../../database/uniorgAstExtractor';

suite('OrgSymbolIndexService Integration Tests', () => {
    let indexService: OrgSymbolIndexService;
    let testTempDir: string;

    suiteSetup(async () => {
        testTempDir = os.tmpdir();
        indexService = OrgSymbolIndexService.getInstance();
    });

    test('should find headings using pinyin search', async () => {
        const testFileContent = `* 测试标题 :work:\n** TODO [#A] 另一个任务 :urgent:`;
        const testFilePath = path.join(testTempDir, 'pinyin_test.org');
        fs.writeFileSync(testFilePath, testFileContent);

        const db = DatabaseConnection.getInstance().getDatabase();
        const fileRepo = new FileRepository(db);
        const headingRepo = new HeadingRepository(db);
        const linkRepo = new LinkRepository(db);
        const extractor = new UniorgAstExtractor();
        const fileIndexer = new FileIndexer(DatabaseConnection.getInstance(), fileRepo, headingRepo, linkRepo, extractor);

        await fileIndexer.indexFile(testFilePath, testFileContent);

        // Now test the search through indexService
        const results = await indexService.searchSymbols('csbt'); // '测试标题' -> csbt
        assert.ok(results.length > 0, 'Should find at least one result for "csbt"');
        assert.strictEqual(results[0].text, '测试标题');

        // Test with pinyin initials 'cs'
        const results2 = await indexService.searchSymbols('cs');
        assert.ok(results2.length > 0);

        // Cleanup
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    test('getAllTags should return all tags from index', async () => {
        const testFileContent = `* Heading :testtag1:\n* Another :testtag2:`;
        const testFilePath = path.join(testTempDir, 'tags_test.org');
        fs.writeFileSync(testFilePath, testFileContent);

        const db = DatabaseConnection.getInstance().getDatabase();
        const fileRepo = new FileRepository(db);
        const headingRepo = new HeadingRepository(db);
        const linkRepo = new LinkRepository(db);
        const extractor = new UniorgAstExtractor();
        const fileIndexer = new FileIndexer(DatabaseConnection.getInstance(), fileRepo, headingRepo, linkRepo, extractor);

        await fileIndexer.indexFile(testFilePath, testFileContent);

        const tags = indexService.getAllTags();
        assert.ok(tags.has('testtag1'));
        assert.ok(tags.has('testtag2'));

        // Cleanup
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});
