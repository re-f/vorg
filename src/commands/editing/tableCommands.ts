import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';
import { TableParser } from '../../parsers/tableParser';

/**
 * 表格操作命令类
 * 
 * 提供表格行插入和单元格导航功能，包括：
 * - 插入表格行（M-RET 语义）
 * - 移动到下一个单元格（TAB）
 * - 移动到上一个单元格（Shift+TAB）
 * 
 * @class TableCommands
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
    
    // 计算列数 - 使用TableParser
    const columnCount = TableParser.getColumnCount(lineText);
    const newRow = TableParser.createEmptyRow(columnCount);
    
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
    
    // 查找当前光标后的下一个单元格 - 使用TableParser
    const nextCellPos = TableParser.findNextCell(lineText, position.character);
    
    if (nextCellPos !== null) {
      // 找到了下一个单元格
      const newPosition = new vscode.Position(position.line, nextCellPos);
      editor.selection = new vscode.Selection(newPosition, newPosition);
    } else {
      // 当前行没有更多单元格，尝试移到下一行的第一个单元格
      if (position.line + 1 < document.lineCount) {
        const nextLine = document.lineAt(position.line + 1);
        const nextLineText = nextLine.text;
        
        if (TableParser.isTableLine(nextLineText)) {
          // 下一行也是表格行
          const firstCellPos = TableParser.findNextCell(nextLineText, -1);
          if (firstCellPos !== null) {
            const newPosition = new vscode.Position(position.line + 1, firstCellPos);
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
    
    // 查找当前光标前的上一个单元格 - 使用TableParser
    const prevCellPos = TableParser.findPreviousCell(lineText, position.character);
    
    if (prevCellPos !== null) {
      // 找到了前一个单元格
      const newPosition = new vscode.Position(position.line, prevCellPos);
      editor.selection = new vscode.Selection(newPosition, newPosition);
    } else {
      // 当前行没有前一个单元格，尝试移到上一行的最后一个单元格
      if (position.line > 0) {
        const prevLine = document.lineAt(position.line - 1);
        const prevLineText = prevLine.text;
        
        if (TableParser.isTableLine(prevLineText)) {
          // 上一行也是表格行，找到最后一个单元格
          const lastCellPos = TableParser.findPreviousCell(prevLineText, prevLineText.length);
          if (lastCellPos !== null) {
            const newPosition = new vscode.Position(position.line - 1, lastCellPos);
            editor.selection = new vscode.Selection(newPosition, newPosition);
          }
        }
      }
    }
  }
}

