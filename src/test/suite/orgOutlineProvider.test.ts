import * as assert from 'assert';
import * as vscode from 'vscode';
import { OrgOutlineProvider } from '../../outline/orgOutlineProvider';

suite('OrgOutlineProvider Test Suite', () => {
    
    test('Should handle org files with metadata headers', async () => {
        const content = `#+glossary_sources:  Glossary

#+title: 2025 年记录

#+FILETAGS:  GTD
#+STARTUP: content showstars indent

#+HTML_HEAD: <link rel="stylesheet" type="text/css" href="https://rgb-24bit.github.io/org-html-theme-list/org-guidao/style/main.css"/>
#+OPTIONS:    H:3 num:nil toc:t \\n:nil ::t |:t ^:t -:t f:t *:t tex:t d:(HIDE) tags:not-in-toc

* 第一个标题

这是第一个标题下的内容。

** 子标题一

子标题一的内容。

** 子标题二

子标题二的内容。

* 第二个标题

这是第二个标题下的内容。

*** 深层标题

深层标题的内容。`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        
        const provider = new OrgOutlineProvider();
        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[];
        
        // 验证符号被正确提取
        assert.ok(symbols);
        assert.ok(symbols.length > 0);
        
        // 查找 TITLE 元数据
        const titleSymbol = symbols.find(s => s.name.includes('TITLE: 2025 年记录'));
        assert.ok(titleSymbol, 'Should find TITLE metadata');
        assert.strictEqual(titleSymbol.kind, vscode.SymbolKind.Property);
        
        // 查找第一个标题（Level 1 应为 Namespace）
        const firstHeading = symbols.find(s => s.name === '第一个标题');
        assert.ok(firstHeading, 'Should find first heading');
        assert.strictEqual(firstHeading.kind, vscode.SymbolKind.Namespace);
        
        // 验证子标题被正确嵌套
        assert.ok(firstHeading.children.length > 0, 'First heading should have children');
        const subHeading = firstHeading.children.find(child => child.name === '子标题一');
        assert.ok(subHeading, 'Should find sub heading');
        assert.strictEqual(subHeading.kind, vscode.SymbolKind.Class);
    });
    
    test('Should handle org files without metadata headers', async () => {
        const content = `* 第一个标题

这是第一个标题下的内容。

** 子标题一

子标题一的内容。

** 子标题二

子标题二的内容。

* 第二个标题

这是第二个标题下的内容。

*** 深层标题

深层标题的内容。`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        
        const provider = new OrgOutlineProvider();
        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[];
        
        // 验证符号被正确提取
        assert.ok(symbols);
        assert.ok(symbols.length > 0);
        
        // 查找第一个标题（Level 1 应为 Namespace）
        const firstHeading = symbols.find(s => s.name === '第一个标题');
        assert.ok(firstHeading, 'Should find first heading');
        assert.strictEqual(firstHeading.kind, vscode.SymbolKind.Namespace);
        
        // 验证子标题被正确嵌套
        assert.ok(firstHeading.children.length > 0, 'First heading should have children');
        const subHeading = firstHeading.children.find(child => child.name === '子标题一');
        assert.ok(subHeading, 'Should find sub heading');
        assert.strictEqual(subHeading.kind, vscode.SymbolKind.Class);
    });
    
    test('Should handle TODO headings with tags', async () => {
        const content = `* TODO 待完成任务 :urgent:work:

这是一个待完成的任务。

* DONE 已完成任务 :completed:

这是一个已完成的任务。

** TODO 子任务 :delegated:

这是一个子任务。`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        
        const provider = new OrgOutlineProvider();
        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[];
        
        // 验证符号被正确提取
        assert.ok(symbols);
        assert.ok(symbols.length > 0);
        
        // 查找 TODO 标题
        const todoHeading = symbols.find(s => s.name.includes('TODO 待完成任务'));
        assert.ok(todoHeading, 'Should find TODO heading');
        assert.ok(todoHeading.name.includes(':urgent:work:'), 'Should include tags');
        assert.strictEqual(todoHeading.detail, 'TODO');
        
        // 查找 DONE 标题
        const doneHeading = symbols.find(s => s.name.includes('DONE 已完成任务'));
        assert.ok(doneHeading, 'Should find DONE heading');
        assert.ok(doneHeading.name.includes(':completed:'), 'Should include tags');
        assert.strictEqual(doneHeading.detail, 'DONE');
    });
    
    test('Should handle empty org file', async () => {
        const content = '';

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        
        const provider = new OrgOutlineProvider();
        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[];
        
        // 验证返回空数组
        assert.ok(symbols);
        assert.strictEqual(symbols.length, 0);
    });
    
    test('Should handle org file with only metadata', async () => {
        const content = `#+TITLE: 测试文档
#+AUTHOR: 测试作者
#+DATE: 2024-01-01
#+EMAIL: test@example.com
#+DESCRIPTION: 这是一个测试文档`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        
        const provider = new OrgOutlineProvider();
        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[];
        
        // 验证只有元数据符号
        assert.ok(symbols);
        assert.ok(symbols.length > 0);
        
        // 验证所有符号都是属性类型
        symbols.forEach(symbol => {
            assert.strictEqual(symbol.kind, vscode.SymbolKind.Property);
        });
        
        // 验证包含所有重要元数据
        const titleSymbol = symbols.find(s => s.name.includes('TITLE: 测试文档'));
        assert.ok(titleSymbol, 'Should find TITLE metadata');
        
        const authorSymbol = symbols.find(s => s.name.includes('AUTHOR: 测试作者'));
        assert.ok(authorSymbol, 'Should find AUTHOR metadata');
    });
}); 