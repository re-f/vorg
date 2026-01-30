import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 标题命令集成测试
 * 
 * 验证 HeadingCommands.ts 中的标题操作在真实 VS Code 环境下的行为。
 */
suite('HeadingCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start HeadingCommands integration tests.');

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

    async function wait(ms: number = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Subtree Promotion (升级子树) ---

    test('Promote Subtree: 应该升级标题及其子节点', async () => {
        const content = [
            '* Heading 1',
            '** Sub 1',
            'Content 1',
            '*** Sub 2',
            '* Heading 2'
        ].join('\n');
        const { doc } = await setupTest(content, 1, 0); // 光标在 ** Sub 1

        await vscode.commands.executeCommand('vorg.promoteSubtree');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[1], '* Sub 1');
        assert.strictEqual(lines[3], '** Sub 2');
        assert.strictEqual(lines[4], '* Heading 2');
    });

    // --- Subtree Demotion (降级子树) ---

    test('Demote Subtree: 应该降级标题及其子节点', async () => {
        const content = [
            '* Heading 1',
            '** Sub 1',
            'Content 1',
            '** Sub 2',
            '* Heading 2'
        ].join('\n');
        const { doc } = await setupTest(content, 0, 0); // 光标在 * Heading 1

        await vscode.commands.executeCommand('vorg.demoteSubtree');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[0], '** Heading 1');
        assert.strictEqual(lines[1], '*** Sub 1');
        assert.strictEqual(lines[3], '*** Sub 2');
        assert.strictEqual(lines[4], '* Heading 2');
    });

    // --- TODO Heading Insertion ---

    test('Insert TODO Heading: 应该在下方插入新的 TODO 标题', async () => {
        const { doc, editor } = await setupTest('* Heading 1', 0, 0);
        await vscode.commands.executeCommand('vorg.insertTodoHeading');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines.length, 2);
        assert.ok(lines[1].startsWith('* TODO '), '应该插入了 TODO 标题');
        assert.strictEqual(editor.selection.active.line, 1);
    });

});
