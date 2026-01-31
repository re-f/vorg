import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

/**
 * 优先级命令集成测试
 */
suite('PriorityCommands Integration Test Suite', function () {
    this.timeout(10000);
    suiteSetup(async () => {
        await ensureTestReady();
    });
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

    async function wait(ms: number = 50) {
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
    });

    test('Priority Cycling with Tags', async () => {
        const { doc } = await setupTest('* Heading 1 :tag1:', 0, 5);

        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, '* [#C] Heading 1 :tag1:');
    });

    test('Should not affect non-heading lines', async () => {
        const { doc } = await setupTest('Just some text', 0, 5);

        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();
        assert.strictEqual(doc.lineAt(0).text, 'Just some text');
    });

    test('Priority Cycling from content: 应该触发 VS Code 默认选择行为', async () => {
        const content = '* Heading 1\nLine 1\nLine 2';
        const { editor } = await setupTest(content, 2, 0); // 光标在 "Line 2" 开头

        await vscode.commands.executeCommand('vorg.setPriorityUp');
        await wait();

        // 验证光标是否向上选中了一行
        const selection = editor.selection;
        assert.strictEqual(selection.active.line, 1);
        assert.strictEqual(selection.anchor.line, 2);
    });
});
