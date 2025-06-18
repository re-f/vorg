import * as vscode from 'vscode';
import { HtmlGenerator } from './htmlGenerator';
import { ScrollSync } from './scrollSync';
import { 
  PREVIEW_PANEL_TYPE, 
  SIDE_PANEL_TYPE, 
  PREVIEW_TITLE, 
  DEFAULT_PREVIEW_OPTIONS,
  WEBVIEW_MESSAGES 
} from '../utils/constants';
import { PreviewPanelManager } from '../types';

export class PreviewManager {
  private panelManager: PreviewPanelManager = {
    currentPanel: undefined,
    currentSidePanel: undefined
  };

  constructor(private context: vscode.ExtensionContext) {}

  public openPreview(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found. Please open an Org-mode file first.');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works best with .org files.');
    }

    const columnToShowIn = activeEditor.viewColumn;

    if (this.panelManager.currentPanel) {
      this.panelManager.currentPanel.reveal(columnToShowIn);
    } else {
      this.panelManager.currentPanel = vscode.window.createWebviewPanel(
        PREVIEW_PANEL_TYPE,
        PREVIEW_TITLE,
        columnToShowIn || vscode.ViewColumn.One,
        DEFAULT_PREVIEW_OPTIONS
      );

      this.panelManager.currentPanel.onDidDispose(
        () => {
          this.panelManager.currentPanel = undefined;
        },
        null,
        this.context.subscriptions
      );
    }

    this.updatePreview(this.panelManager.currentPanel);
  }

  public openPreviewToSide(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found. Please open an Org-mode file first.');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works best with .org files.');
    }

    // 确定预览窗口应该显示在哪一列
    const currentColumn = activeEditor.viewColumn || vscode.ViewColumn.One;
    const previewColumn = currentColumn === vscode.ViewColumn.One 
      ? vscode.ViewColumn.Two 
      : vscode.ViewColumn.Beside;

    if (this.panelManager.currentSidePanel) {
      this.panelManager.currentSidePanel.reveal(previewColumn);
    } else {
      this.panelManager.currentSidePanel = vscode.window.createWebviewPanel(
        SIDE_PANEL_TYPE,
        PREVIEW_TITLE,
        previewColumn,
        DEFAULT_PREVIEW_OPTIONS
      );

      this.panelManager.currentSidePanel.onDidDispose(
        () => {
          this.panelManager.currentSidePanel = undefined;
        },
        null,
        this.context.subscriptions
      );

      // 处理来自预览窗口的消息
      this.panelManager.currentSidePanel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case WEBVIEW_MESSAGES.READY:
              // 预览窗口准备就绪，发送初始滚动位置
              ScrollSync.syncScrollToPreview(this.panelManager.currentSidePanel);
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );
    }

    this.updatePreview(this.panelManager.currentSidePanel);
  }

  public updateAllPreviews(): void {
    if (this.panelManager.currentPanel) {
      this.updatePreview(this.panelManager.currentPanel);
    }
    if (this.panelManager.currentSidePanel) {
      this.updatePreview(this.panelManager.currentSidePanel);
    }
  }

  public syncScrollForAllPreviews(): void {
    if (this.panelManager.currentSidePanel) {
      ScrollSync.syncScrollToPreview(this.panelManager.currentSidePanel);
    }
    if (this.panelManager.currentPanel) {
      ScrollSync.syncScrollToPreview(this.panelManager.currentPanel);
    }
  }

  private updatePreview(panel: vscode.WebviewPanel): void {
    if (!panel || !vscode.window.activeTextEditor) {
      return;
    }

    const document = vscode.window.activeTextEditor.document;
    const html = HtmlGenerator.generatePreviewHtml(document);
    panel.webview.html = html;
  }
} 