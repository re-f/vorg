import * as vscode from 'vscode';
import { OrgOutlineProvider } from './outline/orgOutlineProvider';
import { OrgLinkProvider } from './links/orgLinkProvider';
import { OrgFoldingProvider } from './folding/orgFoldingProvider';
import { PreviewManager } from './preview/previewManager';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { TodoKeywordManager } from './utils/todoKeywordManager';
import { PreviewCommands } from './commands/previewCommands';
import { LinkCommands } from './commands/linkCommands';
import { EditingCommands } from './commands/editingCommands';
import { DebugCommands } from './commands/debugCommands';
import { HeadingCodeLensProvider } from './codelens/headingCodeLensProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('VOrg extension is now active!');

  // 初始化TODO关键字管理器
  const todoKeywordManager = TodoKeywordManager.getInstance();
  
  // 初始化语法高亮器
  const syntaxHighlighter = new SyntaxHighlighter();

  // 注册大纲提供者
  const outlineProvider = new OrgOutlineProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider('org', outlineProvider)
  );

  // 注册链接提供者
  const linkProvider = new OrgLinkProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider('org', linkProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider('org', linkProvider)
  );

  // 注册折叠提供者
  const foldingProvider = new OrgFoldingProvider();
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider('org', foldingProvider)
  );

  // 注册 CodeLens 提供者（标题行的 Promote/Demote 按钮）
  const codeLensProvider = new HeadingCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'org', scheme: 'file' },
      codeLensProvider
    ),
    codeLensProvider
  );

  // 注册预览管理器
  const previewManager = new PreviewManager(context);

  // 注册各种命令
  const previewCommands = new PreviewCommands(context);
  previewCommands.registerCommands(context);
  previewCommands.registerEventListeners(context); // 注册预览事件监听器
  LinkCommands.registerCommands(context);
  EditingCommands.registerCommands(context);
  DebugCommands.registerCommands(context);

  // 监听文档变化，应用语法高亮
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'org') {
        syntaxHighlighter.refreshHighlighting();
        syntaxHighlighter.applyHighlighting(editor);
      }
    })
  );

  // 监听文档内容变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'org') {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          syntaxHighlighter.applyHighlighting(editor);
        }
      }
    })
  );

  // 监听主题变化
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => {
      syntaxHighlighter.refreshHighlighting();
    })
  );

  // 应用到当前活动的编辑器
  if (vscode.window.activeTextEditor?.document.languageId === 'org') {
    syntaxHighlighter.applyHighlighting(vscode.window.activeTextEditor);
  }
}

export function deactivate() {
  console.log('VOrg extension is deactivated');
} 