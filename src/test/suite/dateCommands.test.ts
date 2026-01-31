import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * 日期命令集成测试
 */
suite('DateCommands Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start DateCommands integration tests.');

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

    test('Set Scheduled: 应该能在标题下插入 SCHEDULED', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        await vscode.commands.executeCommand('vorg.setScheduled', '2023-10-20');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[0], '* Heading 1');
        assert.ok(lines[1].includes('SCHEDULED: <2023-10-20 Fri>'));
    });

    test('Set Deadline: 应该能在标题下插入 DEADLINE', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        await vscode.commands.executeCommand('vorg.setDeadline', '2023-10-21');
        await wait();

        const lines = doc.getText().split('\n');
        assert.ok(lines[1].includes('DEADLINE: <2023-10-21 Sat>'));
    });

    test('Update Date: 应该能更新现有的计划日期', async () => {
        const content = '* Heading 1\n  SCHEDULED: <2023-10-20 Fri>';
        const { doc } = await setupTest(content, 0, 5);

        await vscode.commands.executeCommand('vorg.setScheduled', '2023-10-25');
        await wait();

        assert.ok(doc.getText().includes('SCHEDULED: <2023-10-25 Wed>'));
    });

    test('Combined Dates: 应该能在同一行中管理多个日期', async () => {
        const content = '* Heading 1\n  SCHEDULED: <2023-10-20 Fri>';
        const { doc } = await setupTest(content, 0, 5);

        await vscode.commands.executeCommand('vorg.setDeadline', '2023-10-25');
        await wait();

        const lines = doc.getText().split('\n');
        assert.ok(lines[1].includes('SCHEDULED: <2023-10-20 Fri>'));
        assert.ok(lines[1].includes('DEADLINE: <2023-10-25 Wed>'));
    });
});
