/**
 * VOrg 扩展主入口文件
 * 
 * 负责激活扩展和注册所有功能模块，包括：
 * - 大纲视图提供器（DocumentSymbolProvider）
 * - 工作区符号提供器（WorkspaceSymbolProvider）
 * - 链接提供器（DocumentLinkProvider、DefinitionProvider）
 * - 代码折叠提供器（FoldingRangeProvider）
 * - CodeLens 提供器（标题行的 Promote/Demote 按钮）
 * - 预览管理器
 * - 各种命令（编辑、预览、链接、调试）
 * - 语法高亮器
 * 
 * 设计原则：
 * - 保持简洁，主要逻辑委托给各个模块
 * - 单一职责：每个模块只负责特定的功能领域
 * - 模块化：功能按照逻辑关系分组，便于维护和扩展
 * 
 * @module extension
 */

import * as vscode from 'vscode';
import { OrgOutlineProvider } from './outline/orgOutlineProvider';
import { OrgWorkspaceSymbolProvider } from './outline/orgWorkspaceSymbolProvider';
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

/**
 * 激活扩展
 * 
 * 当 VS Code 加载扩展时调用此函数，注册所有功能提供器和命令。
 * 
 * @param context - VS Code 扩展上下文，用于注册订阅和命令
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('VOrg extension is now active!');

  // 初始化TODO关键字管理器
  const todoKeywordManager = TodoKeywordManager.getInstance();
  
  // 初始化语法高亮器
  const syntaxHighlighter = new SyntaxHighlighter();

  // 注册大纲提供者（单个文档的符号导航）
  const outlineProvider = new OrgOutlineProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider('org', outlineProvider)
  );

  // 注册工作区符号提供者（整个工作区的符号搜索）
  const workspaceSymbolProvider = new OrgWorkspaceSymbolProvider();
  context.subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider)
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

  // 面包屑功能由 VS Code 基于 DocumentSymbolProvider 自动提供
  // 通过 OrgOutlineProvider 已经实现了正确的符号层次结构
  // 确保在 VS Code 设置中启用了面包屑功能：
  // "breadcrumbs.enabled": true

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

/**
 * 停用扩展
 * 
 * 当 VS Code 卸载扩展时调用此函数，执行清理操作。
 */
export function deactivate() {
  console.log('VOrg extension is deactivated');
} 