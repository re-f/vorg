import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewManager } from '../preview/previewManager';
import { HtmlGenerator } from '../preview/htmlGenerator';
import { COMMANDS } from '../utils/constants';

export class PreviewCommands {
  private previewManager: PreviewManager;
  private updateTimeout: NodeJS.Timeout | undefined;
  private readonly DEBOUNCE_DELAY = 300; // 300ms 防抖延迟

  constructor(context: vscode.ExtensionContext) {
    this.previewManager = new PreviewManager(context);
    this.previewManager.setExportCallback((document) => this.exportPreviewToSameDirectory(document));
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

    // 导出预览命令
    const exportPreviewDisposable = vscode.commands.registerCommand(
      COMMANDS.EXPORT_PREVIEW,
      () => this.exportPreview()
    );

    context.subscriptions.push(previewDisposable, previewToSideDisposable, exportPreviewDisposable);
  }

  /**
   * 导出预览为 HTML 文件（显示保存对话框）
   */
  private async exportPreview(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('没有活动的编辑器。请先打开一个 Org-mode 文件。');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('当前文件不是 Org-mode 文件。VOrg 最适合处理 .org 文件。');
    }

    const document = activeEditor.document;
    const documentPath = document.uri.fsPath;
    const documentDir = path.dirname(documentPath);
    const documentName = path.basename(documentPath, path.extname(documentPath));
    const defaultFileName = `${documentName}.html`;
    const defaultUri = vscode.Uri.file(path.join(documentDir, defaultFileName));

    // 显示保存对话框
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: defaultUri,
      filters: {
        'HTML': ['html'],
        'All Files': ['*']
      },
      saveLabel: '导出预览'
    });

    if (!saveUri) {
      // 用户取消了保存
      return;
    }

    await this.savePreviewToFile(document, saveUri);
  }

  /**
   * 直接导出预览到同一目录（不显示对话框）
   */
  public async exportPreviewToSameDirectory(document?: vscode.TextDocument): Promise<void> {
    // 如果传入了文档，使用传入的文档；否则尝试从活动编辑器获取
    let targetDocument = document;
    
    if (!targetDocument) {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage('没有活动的编辑器。请先打开一个 Org-mode 文件。');
        return;
      }
      targetDocument = activeEditor.document;
    }

    if (targetDocument.languageId !== 'org') {
      vscode.window.showWarningMessage('当前文件不是 Org-mode 文件。VOrg 最适合处理 .org 文件。');
      return;
    }

    const documentPath = targetDocument.uri.fsPath;
    const documentDir = path.dirname(documentPath);
    const documentName = path.basename(documentPath, path.extname(documentPath));
    const fileName = `${documentName}.html`;
    const saveUri = vscode.Uri.file(path.join(documentDir, fileName));

    await this.savePreviewToFile(targetDocument, saveUri);
  }

  /**
   * 保存预览到文件
   */
  private async savePreviewToFile(document: vscode.TextDocument, saveUri: vscode.Uri): Promise<void> {
    try {
      // 生成可导出的 HTML
      const html = HtmlGenerator.generateExportableHtml(document);
      
      // 写入文件（使用 Buffer 编码为 UTF-8）
      const data = Buffer.from(html, 'utf-8');
      await vscode.workspace.fs.writeFile(saveUri, data);

      // 显示成功消息
      const fileName = path.basename(saveUri.fsPath);
      vscode.window.showInformationMessage(`预览已成功导出到: ${fileName}`);
    } catch (error) {
      vscode.window.showErrorMessage(`导出预览时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public registerEventListeners(context: vscode.ExtensionContext): void {
    // 监听文档变化，实时更新预览 - 添加防抖避免频繁更新
    vscode.workspace.onDidChangeTextDocument(
      event => {
        // 只处理当前活动的org文档
        if (event.document === vscode.window.activeTextEditor?.document && 
            event.document.languageId === 'org') {
          // 清除之前的定时器
          if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
          }
          
          // 设置新的防抖定时器
          this.updateTimeout = setTimeout(() => {
            this.previewManager.updateAllPreviews();
            this.updateTimeout = undefined;
          }, this.DEBOUNCE_DELAY);
        }
      },
      null,
      context.subscriptions
    );

    // 监听活动编辑器变化
    vscode.window.onDidChangeActiveTextEditor(
      editor => {
        if (editor && editor.document.languageId === 'org') {
          // 当切换到org编辑器时，立即更新预览（不需要防抖）
          if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = undefined;
          }
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