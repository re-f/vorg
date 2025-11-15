import * as vscode from 'vscode';
import { WEBVIEW_MESSAGES } from '../utils/constants';

/**
 * 滚动同步功能模块
 * 
 * 处理编辑器和预览窗口之间的滚动同步。
 * 当编辑器滚动时，同步更新预览窗口的滚动位置。
 * 
 * @class ScrollSync
 */
export class ScrollSync {
  
  public static syncScrollToPreview(panel: vscode.WebviewPanel | undefined): void {
    if (!panel || !vscode.window.activeTextEditor) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const visibleRanges = editor.visibleRanges;
    
    if (visibleRanges.length > 0) {
      const firstVisibleLine = visibleRanges[0].start.line;
      const lastVisibleLine = visibleRanges[visibleRanges.length - 1].end.line;
      const totalLines = editor.document.lineCount;
      
      // 计算可见范围的中心行，用于更准确的定位
      const centerVisibleLine = Math.floor((firstVisibleLine + lastVisibleLine) / 2);
      
      // 改进的百分比计算：考虑可见范围
      // 使用可见范围的中心位置来计算百分比，更准确
      const scrollPercentage = totalLines > 1 
        ? Math.min(centerVisibleLine / (totalLines - 1), 1)
        : 0;
      
      // 发送滚动位置到预览窗口
      panel.webview.postMessage({
        command: WEBVIEW_MESSAGES.UPDATE_SCROLL,
        scrollPercentage: scrollPercentage,
        lineNumber: firstVisibleLine,
        centerLine: centerVisibleLine,
        lastVisibleLine: lastVisibleLine,
        totalLines: totalLines
      });
    }
  }
} 