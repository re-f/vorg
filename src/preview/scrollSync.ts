import * as vscode from 'vscode';
import { WEBVIEW_MESSAGES } from '../utils/constants';

export class ScrollSync {
  
  public static syncScrollToPreview(panel: vscode.WebviewPanel | undefined): void {
    if (!panel || !vscode.window.activeTextEditor) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const visibleRanges = editor.visibleRanges;
    
    if (visibleRanges.length > 0) {
      const firstVisibleLine = visibleRanges[0].start.line;
      const totalLines = editor.document.lineCount;
      const scrollPercentage = firstVisibleLine / Math.max(totalLines - 1, 1);
      
      // 发送滚动位置到预览窗口
      panel.webview.postMessage({
        command: WEBVIEW_MESSAGES.UPDATE_SCROLL,
        scrollPercentage: scrollPercentage
      });
    }
  }
} 