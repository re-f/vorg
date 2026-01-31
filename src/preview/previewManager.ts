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

/**
 * 预览窗口管理模块
 * 
 * 管理预览窗口的生命周期，包括创建、更新、销毁。
 * 支持两种预览模式：
 * - 当前标签页预览
 * - 侧边预览（并排显示）
 * 
 * 功能包括：
 * - 创建和管理预览 WebView 面板
 * - 实时更新预览内容
 * - 处理滚动同步
 * - 支持导出预览为 HTML 文件
 * - 处理 WebView 恢复（VS Code reload 后）
 * 
 * @class PreviewManager
 */
export class PreviewManager {
  private panelManager: PreviewPanelManager = {
    currentPanel: undefined,
    currentSidePanel: undefined
  };
  private exportCallback: ((document: vscode.TextDocument) => Promise<void>) | undefined;
  private currentDocument: vscode.TextDocument | undefined;

  constructor(private context: vscode.ExtensionContext) {
    // 监听所有 WebView 面板的恢复
    // 当 VS Code reload 后，已打开的 WebView 会被恢复，但我们的引用会丢失
    // 通过监听消息来重新连接恢复的面板
    this.setupWebviewRestoreHandler();
  }

  /**
   * 设置 WebView 恢复处理器
   * 当 WebView 恢复后发送 ready 消息时，重新连接面板
   */
  private setupWebviewRestoreHandler(): void {
    // 监听活动编辑器变化，当编辑器变化时检查是否有恢复的面板需要更新
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === 'org') {
          // 延迟检查，确保所有 WebView 都已恢复
          setTimeout(() => {
            this.updateAllPreviews();
          }, 500);
        }
      })
    );

    // 延迟检查，确保所有 WebView 都已恢复
    setTimeout(() => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.languageId === 'org') {
        // 如果有活动的 org 文件，尝试更新所有预览
        this.updateAllPreviews();
      }
    }, 1000);
  }

  public setExportCallback(callback: (document: vscode.TextDocument) => Promise<void>): void {
    this.exportCallback = callback;
  }

  public openPreview(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found. Please open an Org-mode file first.');
      return;
    }

    if (activeEditor.document.languageId !== 'org') {
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works with .org and .org_archive files.');
    }

    const columnToShowIn = activeEditor.viewColumn;

    if (this.panelManager.currentPanel) {
      this.panelManager.currentPanel.reveal(columnToShowIn);
      // 确保内容已更新
      this.updatePreview(this.panelManager.currentPanel);
    } else {
      this.panelManager.currentPanel = vscode.window.createWebviewPanel(
        PREVIEW_PANEL_TYPE,
        PREVIEW_TITLE,
        columnToShowIn || vscode.ViewColumn.One,
        DEFAULT_PREVIEW_OPTIONS
      );

      this.setupPanel(this.panelManager.currentPanel, 'currentPanel');
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
      vscode.window.showWarningMessage('Current file is not an Org-mode file. VOrg works with .org and .org_archive files.');
    }

    // 确定预览窗口应该显示在哪一列
    const currentColumn = activeEditor.viewColumn || vscode.ViewColumn.One;
    const previewColumn = currentColumn === vscode.ViewColumn.One
      ? vscode.ViewColumn.Two
      : vscode.ViewColumn.Beside;

    if (this.panelManager.currentSidePanel) {
      this.panelManager.currentSidePanel.reveal(previewColumn);
      // 确保内容已更新
      this.updatePreview(this.panelManager.currentSidePanel);
    } else {
      this.panelManager.currentSidePanel = vscode.window.createWebviewPanel(
        SIDE_PANEL_TYPE,
        PREVIEW_TITLE,
        previewColumn,
        DEFAULT_PREVIEW_OPTIONS
      );

      this.setupPanel(this.panelManager.currentSidePanel, 'currentSidePanel');
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

  /**
   * 设置面板的事件处理器
   */
  private setupPanel(panel: vscode.WebviewPanel, panelType: 'currentPanel' | 'currentSidePanel'): void {
    // 设置面板关闭事件
    panel.onDidDispose(
      () => {
        if (panelType === 'currentPanel') {
          this.panelManager.currentPanel = undefined;
        } else {
          this.panelManager.currentSidePanel = undefined;
        }
      },
      null,
      this.context.subscriptions
    );

    // 处理来自预览窗口的消息
    panel.webview.onDidReceiveMessage(
      message => {
        this.handleWebviewMessage(message, panel, panelType);
      },
      undefined,
      this.context.subscriptions
    );

    // 监听面板可见性变化，当面板变为可见时更新内容
    // 这对于恢复的面板特别重要
    panel.onDidChangeViewState(
      () => {
        if (panel.visible) {
          // 确保面板引用已设置
          if (panelType === 'currentPanel') {
            this.panelManager.currentPanel = panel;
          } else {
            this.panelManager.currentSidePanel = panel;
          }
          // 更新预览内容
          this.updatePreview(panel);
        }
      },
      null,
      this.context.subscriptions
    );
  }

  private updatePreview(panel: vscode.WebviewPanel): void {
    if (!panel || !vscode.window.activeTextEditor) {
      return;
    }

    const document = vscode.window.activeTextEditor.document;
    this.currentDocument = document; // 保存当前文档引用
    const html = HtmlGenerator.generatePreviewHtml(document, panel.webview);
    panel.webview.html = html;
  }

  private handleWebviewMessage(
    message: any,
    panel: vscode.WebviewPanel | undefined,
    panelType?: 'currentPanel' | 'currentSidePanel'
  ): void {
    if (!panel) {
      return;
    }

    switch (message.command) {
      case WEBVIEW_MESSAGES.READY:
        // 预览窗口准备就绪（包括恢复后的情况）
        // 如果面板引用丢失，说明是恢复的情况，需要重新连接
        if (panelType) {
          // 这是新创建的面板，已经设置了引用
          if (panelType === 'currentPanel') {
            this.panelManager.currentPanel = panel;
          } else {
            this.panelManager.currentSidePanel = panel;
          }
        } else {
          // 这是恢复的面板，需要重新连接
          // 通过检查哪个面板引用为空来确定类型
          if (!this.panelManager.currentPanel && panel.viewType === PREVIEW_PANEL_TYPE) {
            this.panelManager.currentPanel = panel;
            this.setupPanel(panel, 'currentPanel');
          } else if (!this.panelManager.currentSidePanel && panel.viewType === SIDE_PANEL_TYPE) {
            this.panelManager.currentSidePanel = panel;
            this.setupPanel(panel, 'currentSidePanel');
          }
        }

        // 更新预览内容（恢复后需要重新设置 HTML）
        this.updatePreview(panel);

        // 发送初始滚动位置
        ScrollSync.syncScrollToPreview(panel);
        break;
      case WEBVIEW_MESSAGES.EXPORT_HTML:
        // 处理导出请求
        if (this.exportCallback && this.currentDocument) {
          this.exportCallback(this.currentDocument);
        } else {
          // 如果没有保存的文档，尝试从活动编辑器获取
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor && activeEditor.document.languageId === 'org') {
            this.currentDocument = activeEditor.document;
            if (this.exportCallback) {
              this.exportCallback(this.currentDocument);
            }
          } else {
            vscode.window.showErrorMessage('无法找到 Org-mode 文件。请确保已打开一个 .org 或 .org_archive 文件。');
          }
        }
        break;
    }
  }
} 