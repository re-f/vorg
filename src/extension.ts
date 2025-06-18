import * as vscode from 'vscode';
import { PreviewCommands } from './commands/previewCommands';
import { LinkCommands } from './commands/linkCommands';
import { DebugCommands } from './commands/debugCommands';

import { OrgFoldingProvider } from './folding/orgFoldingProvider';
import { OrgLinkProvider } from './links/orgLinkProvider';
import { OrgSyntaxHighlighter } from './syntaxHighlighter';

export function activate(context: vscode.ExtensionContext) {
  // 创建预览命令管理器
  const previewCommands = new PreviewCommands(context);
  
  // 注册命令
  previewCommands.registerCommands(context);
  LinkCommands.registerCommands(context);
  DebugCommands.registerCommands(context);
  
  // 注册事件监听器
  previewCommands.registerEventListeners(context);
  
  // 注意：我们不注册DocumentSymbolProvider，因为VS Code内置功能已经能够处理org文件的符号
  // 这避免了重复符号的问题
  
  // 注册 Folding Provider
  const foldingProvider = new OrgFoldingProvider();
  const foldingProviderDisposable = vscode.languages.registerFoldingRangeProvider(
    { scheme: 'file', language: 'org' },
    foldingProvider
  );
  
  // 注册 Link Provider
  const linkProvider = new OrgLinkProvider();
  const linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
    { scheme: 'file', language: 'org' },
    linkProvider
  );
  
  // 注册 Definition Provider (用于 Ctrl+Click 跳转)
  const definitionProviderDisposable = vscode.languages.registerDefinitionProvider(
    { scheme: 'file', language: 'org' },
    linkProvider
  );
  
  // 初始化语法高亮器
  const syntaxHighlighter = OrgSyntaxHighlighter.getInstance();
  
  // 监听编辑器变化以应用语法高亮
  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.languageId === 'org') {
      syntaxHighlighter.applySyntaxHighlighting(editor);
    }
  });
  
  // 监听文档内容变化以更新语法高亮
  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === event.document && event.document.languageId === 'org') {
      // 使用防抖来避免过于频繁的更新
      setTimeout(() => {
        syntaxHighlighter.applySyntaxHighlighting(editor);
      }, 100);
    }
  });
  
  // 对当前活动编辑器应用语法高亮
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'org') {
    syntaxHighlighter.applySyntaxHighlighting(vscode.window.activeTextEditor);
  }
  
  // 添加到订阅列表
  context.subscriptions.push(
    foldingProviderDisposable,
    linkProviderDisposable,
    definitionProviderDisposable,
    onDidChangeActiveTextEditor,
    onDidChangeTextDocument
  );
}

export function deactivate() {
  // 清理语法高亮器
  const syntaxHighlighter = OrgSyntaxHighlighter.getInstance();
  syntaxHighlighter.dispose();
} 