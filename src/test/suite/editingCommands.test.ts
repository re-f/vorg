import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

/**
 * 编辑命令集成测试
 * 
 * 验证 EditingCommands.ts 中的各种协调操作在真实 VS Code 环境下的行为。
 */
suite('EditingCommands Integration Test Suite', () => {
    suiteSetup(async () => {
        await ensureTestReady();
    });
    vscode.window.showInformationMessage('Start EditingCommands integration tests.');

    /**
     * 设置测试文档和编辑器
     */
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

    /**
     * 等待编辑器更新
     */
    async function wait(ms: number = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Meta Return (Alt+Enter) ---

    test('Meta Return: 在标题行尾插入同级标题', async () => {
        const { doc, editor } = await setupTest('* Heading 1', 0, 11);
        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        assert.strictEqual(doc.getText(), '* Heading 1\n* ');
        assert.strictEqual(editor.selection.active.line, 1);
        assert.strictEqual(editor.selection.active.character, 2);
    });

    test('Meta Return: 在标题行中分割标题', async () => {
        const { doc, editor } = await setupTest('* Hello World', 0, 8);
        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        assert.strictEqual(doc.getText(), '* Hello\n* World');
        assert.strictEqual(editor.selection.active.line, 1);
        assert.strictEqual(editor.selection.active.character, 2);
    });

    test('Meta Return: 在列表项行尾插入新列表项', async () => {
        const { doc, editor } = await setupTest('- Item 1', 0, 8);
        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        assert.strictEqual(doc.getText(), '- Item 1\n- ');
        assert.strictEqual(editor.selection.active.line, 1);
        assert.strictEqual(editor.selection.active.character, 2);
    });

    test('Meta Return: 在表格中插入新行', async () => {
        const { doc, editor } = await setupTest('| col 1 | col 2 |\n|---|---|', 0, 5);
        await vscode.commands.executeCommand('vorg.metaReturn');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines.length, 3);
        assert.ok(lines[1].includes('|'), '应该插入了新行');
    });

    // --- Ctrl Return (Ctrl+Enter) ---

    test('Ctrl Return: 在标题内（有子树内容）插入同级标题', async () => {
        const { doc, editor } = await setupTest('* Heading 1\nInside content', 0, 5);
        await vscode.commands.executeCommand('vorg.ctrlReturn');
        await wait();

        const text = doc.getText();
        const lines = text.split('\n');
        assert.strictEqual(lines.length, 3);
        assert.strictEqual(lines[0], '* Heading 1');
        assert.strictEqual(lines[1], 'Inside content');
        assert.strictEqual(lines[2], '* ');
        assert.strictEqual(editor.selection.active.line, 2);
    });

    // --- Smart Return (Ctrl+Alt+Enter) ---

    test('Smart Return: 在子树末尾插入标题', async () => {
        const { doc, editor } = await setupTest('* Heading 1\n** Sub 1\nSub content\n* Heading 2', 1, 5);
        // 光标在 ** Sub 1 上
        await vscode.commands.executeCommand('vorg.smartReturn');
        await wait();

        const lines = doc.getText().split('\n');
        // 应该在 "Sub content" 之后插入 "** "
        assert.strictEqual(lines[3], '** ');
        assert.strictEqual(lines[4], '* Heading 2');
    });

});
