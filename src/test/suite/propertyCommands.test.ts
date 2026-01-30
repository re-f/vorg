import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Property 命令集成测试
 */
suite('PropertyCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start PropertyCommands integration tests.');

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

    test('Meta Return in Property Drawer: 应该在抽屉内插入新属性行', async () => {
        const content = [
            '* Heading 1',
            ':PROPERTIES:',
            ':CATEGORY: work',
            ':END:'
        ].join('\n');
        const { doc, editor } = await setupTest(content, 2, 10); // 光标在 :CATEGORY: work 这一行

        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines.length, 5);
        assert.ok(lines[3].includes(': :'), '应该插入了空属性行');
        assert.strictEqual(editor.selection.active.line, 3);
    });

    test('Meta Return on Drawer Header: 应该在起始标签下方插入新属性行', async () => {
        const content = [
            '* Heading 1',
            ':PROPERTIES:',
            ':END:'
        ].join('\n');
        const { doc, editor } = await setupTest(content, 1, 5); // 光标在 :PROPERTIES: 

        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[2].trim(), ': :');
    });

});
