import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';

/**
 * 表格相关命令
 */
export class TableCommands {
  /**
   * 插入表格行
   */
  static insertTableRow(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 计算列数
    const columns = lineText.split('|').length - 2; // 减去首尾的空字符串
    const newRow = '|' + ' |'.repeat(columns);
    
    const lineEnd = line.range.end;
    editBuilder.insert(lineEnd, `\n${newRow}`);
  }

  /**
   * 移动到表格的下一个单元格
   */
  static async moveToNextTableCell(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 查找当前光标后的下一个 | 符号
    const afterCursor = lineText.substring(position.character);
    const nextPipeIndex = afterCursor.indexOf('|');
    
    if (nextPipeIndex !== -1) {
      // 找到了下一个单元格
      const nextCellStart = position.character + nextPipeIndex + 1;
      // 跳过空格，找到单元格内容开始位置
      let cellContentStart = nextCellStart;
      while (cellContentStart < lineText.length && lineText[cellContentStart] === ' ') {
        cellContentStart++;
      }
      
      const newPosition = new vscode.Position(position.line, cellContentStart);
      editor.selection = new vscode.Selection(newPosition, newPosition);
    } else {
      // 当前行没有更多单元格，尝试移到下一行的第一个单元格
      if (position.line + 1 < document.lineCount) {
        const nextLine = document.lineAt(position.line + 1);
        const nextLineText = nextLine.text;
        
        if (nextLineText.match(/^\s*\|/)) {
          // 下一行也是表格行
          const firstPipeIndex = nextLineText.indexOf('|');
          if (firstPipeIndex !== -1) {
            let cellContentStart = firstPipeIndex + 1;
            while (cellContentStart < nextLineText.length && nextLineText[cellContentStart] === ' ') {
              cellContentStart++;
            }
            
            const newPosition = new vscode.Position(position.line + 1, cellContentStart);
            editor.selection = new vscode.Selection(newPosition, newPosition);
          }
        }
      }
    }
  }

  /**
   * 移动到表格的前一个单元格
   */
  static async moveToPreviousTableCell(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 查找当前光标前的上一个 | 符号
    const beforeCursor = lineText.substring(0, position.character);
    const lastPipeIndex = beforeCursor.lastIndexOf('|');
    
    if (lastPipeIndex !== -1 && lastPipeIndex > 0) {
      // 找到了前一个单元格分隔符，现在找到该单元格的开始位置
      const prevCellEnd = lastPipeIndex;
      const cellStart = beforeCursor.substring(0, lastPipeIndex).lastIndexOf('|');
      
      if (cellStart !== -1) {
        let cellContentStart = cellStart + 1;
        while (cellContentStart < prevCellEnd && lineText[cellContentStart] === ' ') {
          cellContentStart++;
        }
        
        const newPosition = new vscode.Position(position.line, cellContentStart);
        editor.selection = new vscode.Selection(newPosition, newPosition);
      }
    } else {
      // 当前行没有前一个单元格，尝试移到上一行的最后一个单元格
      if (position.line > 0) {
        const prevLine = document.lineAt(position.line - 1);
        const prevLineText = prevLine.text;
        
        if (prevLineText.match(/^\s*\|.*\|\s*$/)) {
          // 上一行也是表格行，找到最后一个单元格
          const lastPipeIndex = prevLineText.lastIndexOf('|');
          if (lastPipeIndex > 0) {
            const secondLastPipeIndex = prevLineText.substring(0, lastPipeIndex).lastIndexOf('|');
            if (secondLastPipeIndex !== -1) {
              let cellContentStart = secondLastPipeIndex + 1;
              while (cellContentStart < lastPipeIndex && prevLineText[cellContentStart] === ' ') {
                cellContentStart++;
              }
              
              const newPosition = new vscode.Position(position.line - 1, cellContentStart);
              editor.selection = new vscode.Selection(newPosition, newPosition);
            }
          }
        }
      }
    }
  }
}

