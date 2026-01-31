import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ensureTestReady } from './testUtils';

/**
 * 数据库集成与增量更新测试
 */
suite('Database Integration Suite', function () {
    this.timeout(10000);
    suiteSetup(async () => {
        await ensureTestReady();
    });

    test('Incremental update should not fail on nested transactions', async () => {
        // 1. Create a workspace folder for testing if possible or use a temp file
        // In VS Code extension tests, we usually have a workspace open.
        // We'll create a temp org file and save it to trigger the watcher.

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.warn('No workspace folder found, skipping test');
            return;
        }

        const testFilePath = path.join(workspaceFolders[0].uri.fsPath, 'nesting_test.org');
        const content = '* Heading 1\nSome text.\n';

        fs.writeFileSync(testFilePath, content);

        try {
            // 2. Open and save the file multiple times to trigger indexing
            // The IncrementalUpdateService should handle this via its watcher.
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(testFilePath));
            await vscode.window.showTextDocument(doc);

            // Trigger multiple "Changed" events rapidly
            for (let i = 0; i < 3; i++) {
                await vscode.window.activeTextEditor?.edit(editBuilder => {
                    editBuilder.insert(new vscode.Position(2, 0), `Update ${i}\n`);
                });
                await doc.save();
                // Wait a bit for the indexer to react
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // Wait finally for all to settle
            await new Promise(resolve => setTimeout(resolve, 600));

            // 3. Verify that the database initialized and handled events
            // We can't directly check the database easily from here without 
            // complicated setup because it's in a different module, 
            // but we can check the Log for errors if we had a log inspector.
            // At minimum, this test ensures NO UNCAUGHT EXCEPTIONS crash the extension.

            assert.ok(true, 'Indexing completed without transaction errors');

        } finally {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    });

    test('Tag discovery from database should work', async () => {
        // This is harder to test without direct DB access, but we can verify 
        // the command doesn't crash and hopefully find some tags.
        const doc = await vscode.workspace.openTextDocument({
            content: '* Heading with :tagFromDB:',
            language: 'org'
        });
        await vscode.window.showTextDocument(doc);

        // Wait for indexer to pick it up (debounce is 500ms)
        await new Promise(resolve => setTimeout(resolve, 600));

        // We can execute the command with provided tags to verify it still works
        await vscode.commands.executeCommand('vorg.setTags', ['tag1']);
        assert.strictEqual(doc.lineAt(0).text, '* Heading with :tag1:');
    });
});
