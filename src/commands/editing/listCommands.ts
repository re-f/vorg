import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';

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
    
    // 确定列表标记
    let marker = '';
    if (typeof context.marker === 'string') {
      if (context.marker.match(/^\d+\.$/)) {
        // 有序列表，递增数字
        const num = parseInt(context.marker) + 1;
        marker = `${num}.`;
      } else {
        // 无序列表，保持相同标记
        marker = context.marker;
      }
    }

    if (isAtBeginning && line.text.trim() === '') {
      // 空行，删除当前行的列表标记
      editBuilder.delete(line.range);
      editBuilder.insert(line.range.start, '\n');
      return null;
    } else {
      // M-RET: 在当前列表项（包括其子内容）之后插入新项
      const itemEnd = ListCommands.findListItemEnd(document, position, context.indent || 0);
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
    
    let marker = '';
    if (typeof context.marker === 'string') {
      if (context.marker.match(/^\d+\.$/)) {
        const num = parseInt(context.marker) + 1;
        marker = `${num}.`;
      } else {
        marker = context.marker;
      }
    }

    // M-RET: 在当前列表项（包括其子内容）之后插入新项
    const itemEnd = ListCommands.findListItemEnd(document, position, context.indent || 0);
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
    
    // 确定列表标记
    let marker = context.marker || '-';
    if (marker.match(/^\d+\.$/)) {
      const num = parseInt(marker) + 1;
      marker = `${num}.`;
    }
    
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
    
    let marker = context.marker || '-';
    if (marker.match(/^\d+\.$/)) {
      const num = parseInt(marker) + 1;
      marker = `${num}.`;
    }
    
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
    const currentLineText = currentLine.text;
    const currentIndentMatch = currentLineText.match(/^(\s*)/);
    const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
    
    // 先检查当前列表项是否有子项
    let hasSubItems = false;
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 如果是空行，跳过
      if (lineText === '') {
        continue;
      }
      
      // 检查缩进
      const lineIndentMatch = line.text.match(/^(\s*)/);
      const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
      
      // 如果缩进大于当前级别，说明有子内容
      if (lineIndent > currentIndent && lineText !== '') {
        hasSubItems = true;
        break;
      }
      
      // 如果遇到同级或更高级的结构，停止查找
      const listMatch = line.text.match(/^(\s*)([-+*]|\d+\.)\s+/);
      const headingMatch = line.text.match(/^(\*+)\s+/);
      
      if ((listMatch && lineIndent <= currentIndent) || headingMatch || (lineIndent <= currentIndent && lineText !== '')) {
        break;
      }
    }
    
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
    
    // 检查是否是列表项
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!listMatch) {
      return;
    }

    const currentIndent = listMatch[1];
    const marker = listMatch[2];
    const content = listMatch[3];
    const newIndent = currentIndent + '  '; // 增加 2 个空格缩进
    
    // 计算光标的相对位置，缩进后需要相应调整
    const cursorCharInLine = position.character;
    const newCursorChar = cursorCharInLine + 2; // 增加了2个空格的缩进

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
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
    
    // 检查是否是列表项
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!listMatch) {
      return;
    }

    const currentIndent = listMatch[1];
    const marker = listMatch[2];
    const content = listMatch[3];
    
    // 减少 2 个空格缩进，但不能少于 0
    const newIndentLength = Math.max(0, currentIndent.length - 2);
    const newIndent = ' '.repeat(newIndentLength);
    
    // 计算光标的相对位置，反向缩进后需要相应调整
    const cursorCharInLine  = position.character;
    const indentReduction = currentIndent.length - newIndentLength;
    const newCursorChar = Math.max(0, cursorCharInLine - indentReduction);

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
    });
    
    // 重新设置光标位置，保持在相对位置
    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

  /**
   * 查找列表项的结束位置（包括其所有子内容）
   */
  static findListItemEnd(
    document: vscode.TextDocument,
    position: vscode.Position,
    currentIndent: number
  ): vscode.Position {
    let lastNonEmptyLine = position.line;
    
    // 从当前行的下一行开始查找
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      
      // 跳过空行，但记录上一个非空行
      if (lineText.trim() === '') {
        continue;
      }
      
      // 检查缩进
      const lineIndentMatch = lineText.match(/^(\s*)/);
      const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
      
      // 检查是否是列表项
      const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+/);
      // 检查是否是标题
      const headingMatch = lineText.match(/^(\*+)\s+/);
      
      // 如果遇到同级或更高级的列表项，或者遇到标题，说明当前列表项结束
      if ((listMatch && lineIndent <= currentIndent) || headingMatch) {
        return new vscode.Position(lastNonEmptyLine, document.lineAt(lastNonEmptyLine).text.length);
      }
      
      // 更新最后一个非空行
      lastNonEmptyLine = i;
    }
    
    // 如果没找到，返回文档末尾
    return new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
  }
}

