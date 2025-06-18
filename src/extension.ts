import * as vscode from 'vscode';
import { PreviewCommands } from './commands/previewCommands';
import { OrgOutlineProvider } from './outline/orgOutlineProvider';

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
  
  context.subscriptions.push(outlineProviderDisposable);
}

export function deactivate() {} 