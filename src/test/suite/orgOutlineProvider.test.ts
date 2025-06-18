import * as assert from 'assert';
import * as vscode from 'vscode';
import { OrgOutlineProvider } from '../../outline/orgOutlineProvider';

suite('OrgOutlineProvider Test Suite', () => {
    let provider: OrgOutlineProvider;

    setup(() => {
        provider = new OrgOutlineProvider();
    });

    test('OrgOutlineProvider 应该能够创建实例', () => {
        assert.ok(provider);
        assert.ok(typeof provider.provideDocumentSymbols === 'function');
    });

    test('空文档应该返回空符号列表', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: '',
            language: 'org'
        });

        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);
        assert.strictEqual(symbols!.length, 0);
    });

    test('基本标题解析', async () => {
        const content = `* 第一级标题
** 第二级标题
*** 第三级标题`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });

        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);

        assert.ok(symbols);
        assert.strictEqual(symbols!.length, 1);
        assert.strictEqual(symbols![0].name, '第一级标题');
        assert.strictEqual(symbols![0].kind, vscode.SymbolKind.Module);
        
        // 检查子标题
        assert.strictEqual(symbols![0].children.length, 1);
        const secondLevel = symbols![0].children[0];
        assert.strictEqual(secondLevel.name, '第二级标题');
        assert.strictEqual(secondLevel.kind, vscode.SymbolKind.Class);
        
        assert.strictEqual(secondLevel.children.length, 1);
        const thirdLevel = secondLevel.children[0];
        assert.strictEqual(thirdLevel.name, '第三级标题');
        assert.strictEqual(thirdLevel.kind, vscode.SymbolKind.Method);
    });

    test('文档属性解析', async () => {
        const content = `#+TITLE: 测试文档
#+AUTHOR: 测试作者

* 内容标题`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });

        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);

        assert.ok(symbols);
        assert.strictEqual(symbols!.length, 3); // 2个属性 + 1个标题
        
        // 检查文档属性
        assert.strictEqual(symbols![0].name, 'TITLE: 测试文档');
        assert.strictEqual(symbols![0].kind, vscode.SymbolKind.Constant);
        assert.strictEqual(symbols![1].name, 'AUTHOR: 测试作者');
        assert.strictEqual(symbols![1].kind, vscode.SymbolKind.Constant);
        
        // 检查内容标题
        assert.strictEqual(symbols![2].name, '内容标题');
        assert.strictEqual(symbols![2].kind, vscode.SymbolKind.Module);
    });

    test('带标签的标题解析', async () => {
        const content = `* 重要任务 :urgent:important:
** 普通任务`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });

        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);

        assert.ok(symbols);
        assert.strictEqual(symbols!.length, 1);
        assert.strictEqual(symbols![0].name, '重要任务');
        assert.strictEqual(symbols![0].detail, ':urgent:important:');
    });

    test('忽略代码块和表格', async () => {
        const content = `* 章节标题
#+BEGIN_SRC javascript
console.log("Hello World");
#+END_SRC

| 表格 | 数据 |
|------|------|
| 行1  | 值1  |

** 子标题`;

        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });

        const symbols = await provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);

        assert.ok(symbols);
        assert.strictEqual(symbols!.length, 1);
        const mainHeading = symbols![0];
        assert.strictEqual(mainHeading.name, '章节标题');
        
        // 应该只有子标题，不包含代码块和表格
        assert.strictEqual(mainHeading.children.length, 1);
        assert.strictEqual(mainHeading.children[0].name, '子标题');
    });
}); 