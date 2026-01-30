import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 链接命令集成测试
 */
suite('LinkCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start LinkCommands integration tests.');

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

    test('Follow Link: 应该能跳转到内部标题链接', async () => {
        const content = [
            '* Target Heading',
            'Some content',
            '[[Target Heading]]'
        ].join('\n');
        const { doc, editor } = await setupTest(content, 2, 5); // 光标在 [[Target Heading]] 上

        await vscode.commands.executeCommand('vorg.followLink');
        await wait();

        // 光标应该移动到第 0 行的标题处
        assert.strictEqual(editor.selection.active.line, 0);
    });

    test('Follow Link: 应该能通过 ID 跳转', async () => {
        const content = [
            '* Target',
            ':PROPERTIES:',
            ':ID: 12345',
            ':END:',
            '[[id:12345]]'
        ].join('\n');
        const { doc, editor } = await setupTest(content, 4, 5); // 光标在 [[id:12345]]

        await vscode.commands.executeCommand('vorg.followLink');
        await wait();

        // 光标应该移动到第 0 行
        assert.strictEqual(editor.selection.active.line, 0);
    });

});
