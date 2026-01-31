import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 优先级命令集成测试
 */
suite('PriorityCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start PriorityCommands integration tests.');

    async function setupTest(content: string, line: number, char: number) {
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(line, char);
        editor.selection = new vscode.Selection(pos, pos);
        return { doc, editor };
    }

    async function wait(ms: number = 200) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    test('Priority Up: None -> [#C] -> [#B] -> [#A] -> None', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        // None -> [#C]
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#C] Heading 1');

        // [#C] -> [#B]
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#B] Heading 1');

        // [#B] -> [#A]
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#A] Heading 1');

        // [#A] -> None
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* Heading 1');
    });

    test('Priority Down: None -> [#A] -> [#B] -> [#C] -> None', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        // None -> [#A]
        await vscode.commands.executeCommand('vorg.setPriorityDown');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#A] Heading 1');

        // [#A] -> [#B]
        await vscode.commands.executeCommand('vorg.setPriorityDown');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#B] Heading 1');

        // [#B] -> [#C]
        await vscode.commands.executeCommand('vorg.setPriorityDown');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#C] Heading 1');

        // [#C] -> None
        await vscode.commands.executeCommand('vorg.setPriorityDown');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* Heading 1');
    });

    test('Priority Cycling with TODO keyword', async () => {
        const { doc } = await setupTest('* TODO Heading 1', 0, 5);

        // TODO -> TODO [#C]
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* TODO [#C] Heading 1');

        // TODO [#C] -> TODO [#B]
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* TODO [#B] Heading 1');
    });

    test('Priority Cycling with Tags', async () => {
        const { doc } = await setupTest('* Heading 1 :tag1:', 0, 5);

        // Heading 1 :tag1: -> [#C] Heading 1 :tag1:
        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        // 注意：HeadingParser.buildHeadingLine 构建时，优先级在标题文本之前
        assert.strictEqual(doc.lineAt(0).text, '* [#C] Heading 1 :tag1:');
    });

    test('Should not affect non-heading lines', async () => {
        const { doc } = await setupTest('Just some text', 0, 5);

        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, 'Just some text');
    });
});
