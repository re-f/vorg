import * as vscode from 'vscode';
import { PreviewManager } from '../preview/previewManager';
import { COMMANDS } from '../utils/constants';

export class PreviewCommands {
  private previewManager: PreviewManager;

  constructor(context: vscode.ExtensionContext) {
    this.previewManager = new PreviewManager(context);
  }

  public registerCommands(context: vscode.ExtensionContext): void {
    // 普通预览命令（在当前标签页中打开）
    const previewDisposable = vscode.commands.registerCommand(
      COMMANDS.PREVIEW, 
      () => this.previewManager.openPreview()
    );

    // 并排预览命令（在侧边打开）
    const previewToSideDisposable = vscode.commands.registerCommand(
      COMMANDS.PREVIEW_TO_SIDE, 
      () => this.previewManager.openPreviewToSide()
    );

    context.subscriptions.push(previewDisposable, previewToSideDisposable);
  }

  public registerEventListeners(context: vscode.ExtensionContext): void {
    // 监听文档变化，实时更新预览
    vscode.workspace.onDidChangeTextDocument(
      event => {
        // 只处理当前活动的org文档
        if (event.document === vscode.window.activeTextEditor?.document && 
            event.document.languageId === 'org') {
          // 更新所有打开的预览窗口
          this.previewManager.updateAllPreviews();
        }
      },
      null,
      context.subscriptions
    );

    // 监听活动编辑器变化
    vscode.window.onDidChangeActiveTextEditor(
      editor => {
        if (editor && editor.document.languageId === 'org') {
          // 当切换到org编辑器时，更新预览
          this.previewManager.updateAllPreviews();
        }
      },
      null,
      context.subscriptions
    );

    // 监听编辑器滚动事件
    vscode.window.onDidChangeTextEditorVisibleRanges(
      event => {
        if (event.textEditor === vscode.window.activeTextEditor &&
            event.textEditor.document.languageId === 'org') {
          // 同步滚动到预览窗口
          this.previewManager.syncScrollForAllPreviews();
        }
      },
      null,
      context.subscriptions
    );
  }
} 