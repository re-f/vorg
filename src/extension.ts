import * as vscode from 'vscode';
import { PreviewCommands } from './commands/previewCommands';

export function activate(context: vscode.ExtensionContext) {
  // 创建预览命令管理器
  const previewCommands = new PreviewCommands(context);
  
  // 注册命令
  previewCommands.registerCommands(context);
  
  // 注册事件监听器
  previewCommands.registerEventListeners(context);
}

export function deactivate() {} 