import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 标签命令集成测试
 */
suite('TagCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start TagCommands integration tests.');

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

    test('Set Tags: 应该能设置新标签', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        // 使用可选参数跳过 UI 提示
        await vscode.commands.executeCommand('vorg.setTags', ['tag1', 'tag2']);
        await wait();

        assert.strictEqual(doc.lineAt(0).text, '* Heading 1 :tag1:tag2:');
    });

    test('Set Tags: 应该能更新现有标签', async () => {
        const { doc } = await setupTest('* Heading 1 :oldtag:', 0, 5);

        await vscode.commands.executeCommand('vorg.setTags', ['newtag']);
        await wait();

        assert.strictEqual(doc.lineAt(0).text, '* Heading 1 :newtag:');
    });

    test('Set Tags: 应该能清空标签', async () => {
        const { doc } = await setupTest('* Heading 1 :tag1:', 0, 5);

        await vscode.commands.executeCommand('vorg.setTags', []);
        await wait();

        assert.strictEqual(doc.lineAt(0).text, '* Heading 1');
    });

    test('Set Tags: 应该保留 TODO 关键字和优先级', async () => {
        const { doc } = await setupTest('* TODO [#A] Heading 1', 0, 5);

        await vscode.commands.executeCommand('vorg.setTags', ['urgent']);
        await wait();

        assert.strictEqual(doc.lineAt(0).text, '* TODO [#A] Heading 1 :urgent:');
    });
    test('Set Tags from content: 应该能找到父级标题并设置标签', async () => {
        const content = '* Heading 1\nSome content';
        const { doc } = await setupTest(content, 1, 5); // 光标在 "Some content"

        await vscode.commands.executeCommand('vorg.setTags', ['contenttag']);
        await wait();

        assert.strictEqual(doc.lineAt(0).text, '* Heading 1 :contenttag:');
    });
});
