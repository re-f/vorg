import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

/**
 * 日期命令集成测试
 */
suite('DateCommands Integration Test Suite', () => {
    suiteSetup(async () => {
        await ensureTestReady();
    });
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

    async function wait(ms: number = 50) {
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
    test('Set Date when cursor is in content: 应该能找到父级标题并插入日期', async () => {
        const content = '* Heading 1\nSome content\nMore content';
        const { doc } = await setupTest(content, 1, 5); // 光标在 "Some content"

        await vscode.commands.executeCommand('vorg.setScheduled', '2023-11-01');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[0], '* Heading 1');
        assert.ok(lines[1].includes('SCHEDULED: <2023-11-01 Wed>'));
        assert.strictEqual(lines[2], 'Some content');
    });

    test('Set Date with existing CLOSED: 应该能在同一行合并', async () => {
        const content = '* Heading 1\n  CLOSED: [2023-10-19 Thu 10:00]';
        const { doc } = await setupTest(content, 0, 5);

        await vscode.commands.executeCommand('vorg.setScheduled', '2023-11-02');
        await wait();

        const lines = doc.getText().split('\n');
        assert.ok(lines[1].includes('CLOSED: [2023-10-19 Thu 10:00]'));
        assert.ok(lines[1].includes('SCHEDULED: <2023-11-02 Thu>'));
    });

    test('Set Date on sub-heading: 应该只影响当前子标题', async () => {
        const content = '* Heading 1\n** Sub Heading\n   Content';
        const { doc } = await setupTest(content, 1, 5); // 光标在 Sub Heading

        await vscode.commands.executeCommand('vorg.setDeadline', '2023-11-05');
        await wait();

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[1], '** Sub Heading');
        assert.ok(lines[2].includes('DEADLINE: <2023-11-05 Sun>'));
        assert.strictEqual(lines[3], '   Content');
    });

    test('Set Date: 无效日期格式应该报错但不崩溃 (测试命令行路径)', async () => {
        const { doc } = await setupTest('* Heading 1', 0, 5);

        // 传递非法格式
        await vscode.commands.executeCommand('vorg.setScheduled', 'invalid-date');
        await wait();

        // 内容应该保持不变
        assert.strictEqual(doc.getText(), '* Heading 1');
    });
});
