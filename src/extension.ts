import * as vscode from 'vscode';
import { PreviewCommands } from './commands/previewCommands';
import { OrgOutlineProvider } from './outline/orgOutlineProvider';
import { OrgSyntaxHighlighter } from './syntaxHighlighter';

export function activate(context: vscode.ExtensionContext) {
  // 创建预览命令管理器
  const previewCommands = new PreviewCommands(context);
  
  // 注册命令
  previewCommands.registerCommands(context);
  
  // 注册事件监听器
  previewCommands.registerEventListeners(context);
  
  // 注册 Outline Provider
  const outlineProvider = new OrgOutlineProvider();
  const outlineProviderDisposable = vscode.languages.registerDocumentSymbolProvider(
    { scheme: 'file', language: 'org' },
    outlineProvider
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
    outlineProviderDisposable,
    onDidChangeActiveTextEditor,
    onDidChangeTextDocument
  );
}

export function deactivate() {
  // 清理语法高亮器
  const syntaxHighlighter = OrgSyntaxHighlighter.getInstance();
  syntaxHighlighter.dispose();
} 