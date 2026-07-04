import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

/**
 * 强调标记命令（org-emphasize 等价功能）集成测试
 */
suite('EmphasisCommands Integration Test Suite', function () {
    this.timeout(10000);
    suiteSetup(async () => {
        await ensureTestReady();
    });
    vscode.window.showInformationMessage('Start EmphasisCommands integration tests.');

    async function setupTest(content: string, startLine: number, startChar: number, endLine?: number, endChar?: number) {
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        const editor = await vscode.window.showTextDocument(doc);
        const start = new vscode.Position(startLine, startChar);
        const end = endLine !== undefined && endChar !== undefined
            ? new vscode.Position(endLine, endChar)
            : start;
        editor.selection = new vscode.Selection(start, end);
        return { doc, editor };
    }

    async function wait(ms: number = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    test('应该用 * 包裹选中文本得到粗体', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '*hello* world');
    });

    test('应该用 / 包裹选中文本得到斜体', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '/');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '/hello/ world');
    });

    test('应该用 _ 包裹选中文本得到下划线', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '_');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '_hello_ world');
    });

    test('应该用 + 包裹选中文本得到删除线', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '+');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '+hello+ world');
    });

    test('应该用 = 包裹选中文本得到逐字文本', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '=');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '=hello= world');
    });

    test('应该用 ~ 包裹选中文本得到代码', async () => {
        const { doc } = await setupTest('* Heading 1\nhello world', 1, 0, 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '~');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '~hello~ world');
    });

    test('对已完整包裹的选区再次执行应去除标记（toggle off）', async () => {
        const { doc } = await setupTest('* Heading 1\n*hello* world', 1, 0, 1, 7);

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, 'hello world');
    });

    test('选区首尾带空白时应把空白挪到标记外面', async () => {
        const { doc } = await setupTest('* Heading 1\n  hello  world', 1, 0, 1, 9);

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '  *hello*  world');
    });

    test('选区为空时应在光标处插入一对标记字符', async () => {
        const { doc, editor } = await setupTest('* Heading 1\nhello', 1, 5);

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, 'hello**');
        // 光标应定位到两个标记字符中间
        assert.strictEqual(editor.selection.active.character, 6);
    });

    test('中文选区应可以正常包裹', async () => {
        const { doc } = await setupTest('* Heading 1\n这是突出的文字', 1, 2, 1, 4);

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(1).text, '这是*突出*的文字');
    });

    test('对非 org 文件不应生效', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'hello world',
            language: 'plaintext'
        });
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 5)
        );

        await vscode.commands.executeCommand('vorg.emphasize', '*');
        await wait();

        assert.strictEqual(doc.lineAt(0).text, 'hello world');
    });
});
