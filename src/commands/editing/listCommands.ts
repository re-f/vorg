import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';
import { ListParser, ListItemInfo } from '../../parsers/listParser';

/**
 * 列表项重新编号结果
 */
interface RenumberedItem {
  /** 原始行号（在插入新项之前） */
  originalLine: number;
  /** 新的标记（如 "1.", "2."） */
  newMarker: string;
  /** 列表项信息 */
  listInfo: ListItemInfo;
}

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
  ): vscode.Position {
    const position = editor.selection.active;
    const document = editor.document;
    const indent = ' '.repeat(context.indent || 0);
    const currentIndent = context.indent || 0;
    
    // 查找同一级别的第一个列表项，确定列表类型
    const firstListItem = ListParser.findFirstListItemAtLevel(document, position.line, currentIndent);
    
    // 确定列表标记
    let marker = '';
    let shouldRenumber = false;
    let firstItemLine = -1;
    let newItemLine = -1;
    
    if (firstListItem && firstListItem.isOrdered) {
      // 如果第一个项是有序列表，新项也应该是有序列表
      // 找到第一个列表项的行号
      firstItemLine = ListParser.findFirstListItemLineAtLevel(document, position.line, currentIndent);
      
      // M-RET: 在当前列表项（包括其子内容）之后插入新项
      // 无论光标在列表项的哪个位置，都应该在当前项之后插入新项
      const itemEnd = ListParser.findListItemEnd(document, position, currentIndent);
      newItemLine = itemEnd.line + 1;
      
      // 计算当前应该使用的编号（统计到当前项为止有多少个同级项）
      // 注意：这里统计的是插入前的项数，新项将是第 itemCount + 1 项
      const itemCount = ListParser.countItemsAtLevel(document, position.line, currentIndent);
      marker = this.calculateNewItemNumber(itemCount);
      shouldRenumber = true;
      
      // 先插入新项（使用临时编号，稍后会重新编号）
      editBuilder.insert(itemEnd, `\n${indent}${marker} `);
      
      // 然后重新编号所有同级项（包括新插入的行）
      // 使用纯函数计算重新编号结果
      const itemsToRenumber = ListParser.findItemsAtLevel(document, firstItemLine, currentIndent);
      // 计算新项应该插入的位置（有多少项的行号小于 newItemLine）
      const itemsBeforeNew = itemsToRenumber.filter(item => item.line < newItemLine).length;
      const renumberedItems = this.renumberOrderedListItems(
        itemsToRenumber,
        itemsBeforeNew
      );
      
      // 应用重新编号结果
      renumberedItems.forEach(renumbered => {
        const item = itemsToRenumber.find(i => i.line === renumbered.originalLine);
        if (item) {
          const line = document.lineAt(item.line);
          const newLine = ListParser.buildListItemLine(
            renumbered.listInfo.indent,
            renumbered.newMarker,
            renumbered.listInfo.content,
            renumbered.listInfo.hasCheckbox,
            renumbered.listInfo.checkboxState || ' '
          );
          editBuilder.replace(line.range, newLine);
        }
      });
      
      // 返回光标应该移动到的位置（新列表项的内容开始位置）
      return new vscode.Position(newItemLine, indent.length + marker.length + 1);
    } else {
      // 使用当前项的标记类型
      if (typeof context.marker === 'string') {
        marker = ListParser.getNextMarker(context.marker);
      } else {
        marker = '-'; // 默认使用无序列表
      }
      
      // M-RET: 在当前列表项（包括其子内容）之后插入新项
      const itemEnd = ListParser.findListItemEnd(document, position, currentIndent);
      editBuilder.insert(itemEnd, `\n${indent}${marker} `);
      
      // 返回光标应该移动到的位置（新列表项的内容开始位置）
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

  /**
   * 重新编号列表项（纯函数）
   * 
   * 给定一组列表项和插入位置，计算每个项应该使用的新编号
   * 
   * @param items 需要重新编号的列表项（按行号排序）
   * @param newItemInsertIndex 新项插入的位置（在 items 数组中的索引，-1 表示不插入新项）
   * @returns 重新编号后的项列表
   */
  private static renumberOrderedListItems(
    items: Array<{ line: number; listInfo: ListItemInfo }>,
    newItemInsertIndex: number = -1
  ): RenumberedItem[] {
    const result: RenumberedItem[] = [];
    
    // 如果没有新项插入，直接按顺序重新编号
    if (newItemInsertIndex === -1) {
      items.forEach((item, index) => {
        result.push({
          originalLine: item.line,
          newMarker: `${index + 1}.`,
          listInfo: item.listInfo
        });
      });
      return result;
    }
    
    // 将项分为两部分：新插入项之前的项和新插入项之后的项
    const itemsBeforeNew = items.slice(0, newItemInsertIndex);
    const itemsAfterNew = items.slice(newItemInsertIndex);
    
    // 重新编号新插入项之前的项（编号从1开始）
    itemsBeforeNew.forEach((item, index) => {
      result.push({
        originalLine: item.line,
        newMarker: `${index + 1}.`,
        listInfo: item.listInfo
      });
    });
    
    // 新插入的项编号是 itemsBeforeNew.length + 1
    // 注意：新插入的项不在 items 数组中，所以这里不处理
    
    // 重新编号新插入项之后的项（编号从 itemsBeforeNew.length + 2 开始）
    itemsAfterNew.forEach((item, index) => {
      result.push({
        originalLine: item.line,
        newMarker: `${itemsBeforeNew.length + 2 + index}.`,
        listInfo: item.listInfo
      });
    });
    
    return result;
  }

  /**
   * 计算新插入项应该使用的编号
   * 
   * @param itemsBeforeNew 新插入项之前的项数量
   * @returns 新项应该使用的编号（如 "3."）
   */
  private static calculateNewItemNumber(itemsBeforeNew: number): string {
    return `${itemsBeforeNew + 1}.`;
  }
}

