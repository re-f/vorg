import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';

suite('Extension Test Suite', () => {
    suiteSetup(async () => {
        await ensureTestReady();
    });
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('vorg.vorg'));
    });

    test('Should register org language', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: '* Test Heading\n** Sub Heading',
            language: 'org'
        });

        assert.strictEqual(doc.languageId, 'org');
    });

    test('Should provide document symbols for org files', async () => {
        // 创建一个简单的 org 文档
        const content = `#+TITLE: Test Document
* First Heading
** Second Heading
*** Third Heading`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });

        // 等待一小段时间确保 provider 已注册
        await new Promise(resolve => setTimeout(resolve, 100));

        // 获取文档符号
        const symbols = await vscode.commands.executeCommand(
            'vscode.executeDocumentSymbolProvider',
            doc.uri
        ) as vscode.DocumentSymbol[];

        // 验证符号数量和结构
        assert.ok(symbols, 'Should return symbols');
        assert.ok(symbols.length > 0, 'Should have at least one symbol');

        // 辅助函数：提取纯显示名称（去除拼音信息）
        const getDisplayName = (name: string): string => {
            return name.split('\u200B')[0];
        };

        // 查找标题符号（使用新的符号映射：Namespace, Class, Interface）
        const headingSymbols = symbols.filter(s =>
            s.kind === vscode.SymbolKind.Namespace ||
            s.kind === vscode.SymbolKind.Class ||
            s.kind === vscode.SymbolKind.Interface
        );

        assert.ok(headingSymbols.length > 0, 'Should have heading symbols');

        // 验证能找到第一个标题
        const firstHeading = headingSymbols.find(s => getDisplayName(s.name).includes('First Heading'));
        assert.ok(firstHeading, 'Should find First Heading');
    });
}); 