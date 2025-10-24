import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';
import { ListParser } from '../../parsers/listParser';

/**
 * 列表相关命令
 */
export class ListCommands {
  /**
   * 插入列表项 (M-RET 语义)
   * 返回光标应该移动到的位置
   */
  static insertListItem(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo,
    isAtBeginning: boolean
  ): vscode.Position | null {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    // 确定列表标记 - 使用ListParser
    let marker = '';
    if (typeof context.marker === 'string') {
      marker = ListParser.getNextMarker(context.marker);
    }

    if (isAtBeginning && line.text.trim() === '') {
      // 空行，删除当前行的列表标记
      editBuilder.delete(line.range);
      editBuilder.insert(line.range.start, '\n');
      return null;
    } else {
      // M-RET: 在当前列表项（包括其子内容）之后插入新项
      const itemEnd = ListParser.findListItemEnd(document, position, context.indent || 0);
      editBuilder.insert(itemEnd, `\n${indent}${marker} `);
      
      // 返回光标应该移动到的位置
      return new vscode.Position(itemEnd.line + 1, indent.length + marker.length + 1);
    }
  }

  /**
   * 插入复选框项
   * 返回光标应该移动到的位置
   */
  static insertCheckboxItem(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ): vscode.Position {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    // 确定列表标记 - 使用ListParser
    let marker = '';
    if (typeof context.marker === 'string') {
      marker = ListParser.getNextMarker(context.marker);
    }

    // M-RET: 在当前列表项（包括其子内容）之后插入新项
    const itemEnd = ListParser.findListItemEnd(document, position, context.indent || 0);
    editBuilder.insert(itemEnd, `\n${indent}${marker} [ ] `);
    
    // 返回光标应该移动到的位置
    return new vscode.Position(itemEnd.line + 1, indent.length + marker.length + 5);
  }

  /**
   * 分割列表项 (C-RET 语义)
   * 返回光标应该移动到的位置
   */
  static splitListItem(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo,
    position: vscode.Position
  ): vscode.Position {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    // 确定列表标记 - 使用ListParser
    let marker = context.marker || '-';
    marker = ListParser.getNextMarker(marker);
    
    // 获取光标后的内容
    const restOfLine = line.text.substring(position.character).trim();
    
    // 删除光标后的内容
    editBuilder.delete(new vscode.Range(position, line.range.end));
    
    // 在当前行末尾插入新列表项
    editBuilder.insert(line.range.end, `\n${indent}${marker} ${restOfLine}`);
    
    // 返回光标应该移动到的位置（新列表项的内容开始位置）
    return new vscode.Position(position.line + 1, indent.length + marker.length + 1);
  }

  /**
   * 分割复选框项 (C-RET 语义)
   * 返回光标应该移动到的位置
   */
  static splitCheckboxItem(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo,
    position: vscode.Position
  ): vscode.Position {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    // 确定列表标记 - 使用ListParser
    let marker = context.marker || '-';
    marker = ListParser.getNextMarker(marker);
    
    const restOfLine = line.text.substring(position.character).trim();
    editBuilder.delete(new vscode.Range(position, line.range.end));
    editBuilder.insert(line.range.end, `\n${indent}${marker} [ ] ${restOfLine}`);
    
    // 返回光标应该移动到的位置（插入换行后，新项在当前行的下一行）
    return new vscode.Position(position.line + 1, indent.length + marker.length + 5);
  }

  /**
   * 切换列表折叠状态
   * 智能判断：有子项时折叠，无子项时缩进
   */
  static async toggleListFold(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const currentLine = document.lineAt(position.line);
    const currentIndent = ListParser.getIndentLevel(currentLine.text);
    
    // 先检查当前列表项是否有子项 - 使用ListParser
    const hasSubItems = ListParser.hasSubItems(document, position.line, currentIndent);
    
    // 根据是否有子项决定行为
    if (hasSubItems) {
      // 有子项：执行折叠操作
      // 保存当前光标位置，确保折叠后光标不会跳转
      const savedPosition = editor.selection.active;
      
      try {
        await vscode.commands.executeCommand('editor.toggleFold');
        
        // 恢复光标位置
        editor.selection = new vscode.Selection(savedPosition, savedPosition);
      } catch (error) {
        // 如果折叠失败（例如VS Code还没识别到折叠范围），不做任何操作
        console.log('折叠命令失败:', error);
      }
    } else {
      // 没有子项：执行默认TAB行为（插入TAB字符）
      // 注意：整行缩进只在选中文字时执行（已在executeSmartTab中处理）
      await vscode.commands.executeCommand('tab');
    }
  }

  /**
   * 增加列表项缩进级别
   */
  static async increaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 检查是否是列表项 - 使用ListParser
    const listInfo = ListParser.parseListItem(lineText);
    if (!listInfo) {
      return;
    }

    const currentIndent = ' '.repeat(listInfo.indent);
    const newIndent = currentIndent + '  '; // 增加 2 个空格缩进
    
    // 计算光标的相对位置，缩进后需要相应调整
    const cursorCharInLine = position.character;
    const newCursorChar = cursorCharInLine + 2; // 增加了2个空格的缩进

    await editor.edit(editBuilder => {
      const newLine = ListParser.buildListItemLine(
        listInfo.indent + 2,
        listInfo.marker,
        listInfo.content,
        listInfo.hasCheckbox,
        listInfo.checkboxState
      );
      editBuilder.replace(line.range, newLine);
    });
    
    // 重新设置光标位置，保持在相对位置
    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

  /**
   * 减少列表项缩进级别
   */
  static async decreaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 检查是否是列表项 - 使用ListParser
    const listInfo = ListParser.parseListItem(lineText);
    if (!listInfo) {
      return;
    }

    // 减少 2 个空格缩进，但不能少于 0
    const newIndentLength = Math.max(0, listInfo.indent - 2);
    
    // 计算光标的相对位置，反向缩进后需要相应调整
    const cursorCharInLine  = position.character;
    const indentReduction = listInfo.indent - newIndentLength;
    const newCursorChar = Math.max(0, cursorCharInLine - indentReduction);

    await editor.edit(editBuilder => {
      const newLine = ListParser.buildListItemLine(
        newIndentLength,
        listInfo.marker,
        listInfo.content,
        listInfo.hasCheckbox,
        listInfo.checkboxState
      );
      editBuilder.replace(line.range, newLine);
    });
    
    // 重新设置光标位置，保持在相对位置
    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

}

