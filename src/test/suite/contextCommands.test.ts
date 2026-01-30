import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 上下文命令集成测试
 */
suite('ContextCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start ContextCommands integration tests.');

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

    test('Ctrl+C Ctrl+C: 应该在未完成复选框上切换到完成状态', async () => {
        const { doc } = await setupTest('- [ ] Item 1', 0, 5);

        await vscode.commands.executeCommand('vorg.ctrlCtrl');
        await wait();

        assert.strictEqual(doc.getText(), '- [X] Item 1');
    });

    test('Ctrl+C Ctrl+C: 应该从完成状态切换到部分完成状态', async () => {
        const { doc } = await setupTest('- [X] Item 1', 0, 5);

        await vscode.commands.executeCommand('vorg.ctrlCtrl');
        await wait();

        assert.strictEqual(doc.getText(), '- [-] Item 1');
    });

    test('Ctrl+C Ctrl+C: 应该从部分完成状态切换回未完成状态', async () => {
        const { doc } = await setupTest('- [-] Item 1', 0, 5);

        await vscode.commands.executeCommand('vorg.ctrlCtrl');
        await wait();

        assert.strictEqual(doc.getText(), '- [ ] Item 1');
    });

});
