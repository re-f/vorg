import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

/**
 * TODO 状态命令集成测试
 */
suite('TodoStateCommands Integration Test Suite', () => {
    suiteSetup(async () => {
        await ensureTestReady();
    });
    vscode.window.showInformationMessage('Start TodoStateCommands integration tests.');

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

    test('Set Todo State: 应该将无状态标题更改为 TODO', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        // 执行命令并传递状态 'TODO'
        await vscode.commands.executeCommand('vorg.setTodoState', 'TODO');
        await wait();

        assert.strictEqual(doc.getText(), '* TODO Heading 1');
    });

    test('Set Todo State: 应该将 TODO 更改为 DONE', async () => {
        const { doc } = await setupTest('* TODO Heading 1', 0, 5);

        await vscode.commands.executeCommand('vorg.setTodoState', 'DONE');
        await wait();

        assert.strictEqual(doc.getText(), '* DONE Heading 1');
    });

    test('Set Todo State: 应该移除状态', async () => {
        const { doc } = await setupTest('* TODO Heading 1', 0, 5);

        await vscode.commands.executeCommand('vorg.setTodoState', '');
        await wait();

        assert.strictEqual(doc.getText(), '* Heading 1');
    });

    test('Set Todo State: 应该在子内容中也能正确找到标题并更改状态', async () => {
        const content = [
            '* TODO Heading 1',
            'Some content',
            'More content'
        ].join('\n');
        const { doc } = await setupTest(content, 1, 5); // 光标在 "Some content"

        await vscode.commands.executeCommand('vorg.setTodoState', 'DONE');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[0], '* DONE Heading 1');
    });

});
