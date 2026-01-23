import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';
import { ListParser, ListItemInfo } from '../../parsers/listParser';
import { Logger } from '../../utils/logger';

/**
 * 列表项同步结果
 */
interface SyncItem {
  originalLine: number;
  newMarker: string;
  listInfo: ListItemInfo;
}

/**
 * 列表操作命令类
 * 
 * 提供列表和复选框的插入、缩进、折叠操作，包括：
 * - 插入列表项（M-RET 语义）
 * - 分割列表项（C-RET 语义）
 * - 插入复选框项
 * - 智能缩进和折叠
 * - 基于首项样式的自动同步和重新编号
 * 
 * @class ListCommands
 */
export class ListCommands {
  /**
   * 在当前列表项之后立即插入同级列表项（不分割内容）
   * 用于 M-RET 在行首/行尾
   */
  static insertListItemImmediate(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ): vscode.Position {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    const currentIndent = context.indent || 0;

    // 确定列表块的起始行和样式（以第一项为准）
    const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, position.line, currentIndent);
    const firstItem = firstItemLine !== -1 ? ListParser.parseListItem(document.lineAt(firstItemLine).text) : null;
    const isOrderedContext = !!(firstItem && firstItem.isOrdered);
    const leaderMarker = firstItem ? firstItem.marker : (context.marker || '-');

    // 确定初步标记
    let marker = leaderMarker;
    if (isOrderedContext) {
      const itemsAtLevel = ListParser.findItemsAtLevel(document, firstItemLine, currentIndent);
      const itemsUpToCurrent = itemsAtLevel.filter(item => item.line <= position.line).length;
      marker = `${itemsUpToCurrent + 1}.`;
    } else {
      marker = ListParser.getNextMarker(leaderMarker);
    }

    // 在当前行之后插入新项
    editBuilder.insert(line.range.end, `\n${indent}${marker} `);

    // 同步整个列表块的标记
    const newItemLine = position.line + 1;
    this.syncListMarkers(editBuilder, document, firstItemLine, newItemLine, currentIndent, isOrderedContext, leaderMarker);

    // 返回光标位置
    return new vscode.Position(position.line + 1, indent.length + marker.length + 1);
  }

  /**
   * 在当前列表项（包括其子内容）之后插入新项
   * 对应 C-RET (respect-content)
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

    // 确定列表块的起始行和样式
    const firstItemLine = ListParser.findFirstListItemLineAtLevel(document, position.line, currentIndent);
    const firstItem = firstItemLine !== -1 ? ListParser.parseListItem(document.lineAt(firstItemLine).text) : null;
    const isOrderedContext = !!(firstItem && firstItem.isOrdered);
    const leaderMarker = firstItem ? firstItem.marker : (context.marker || '-');

    // 找到插入位置
    const itemEnd = ListParser.findListItemEnd(document, position, currentIndent);
    const newItemLine = itemEnd.line + 1;

    // 确定初步标记
    let marker = '';
    if (isOrderedContext) {
      const itemCount = ListParser.countItemsAtLevel(document, position.line, currentIndent);
      marker = `${itemCount + 1}.`;
    } else {
      marker = ListParser.getNextMarker(leaderMarker);
    }

    // 插入新项
    editBuilder.insert(itemEnd, `\n${indent}${marker} `);

    // 同步整个列表块
    this.syncListMarkers(editBuilder, document, firstItemLine, newItemLine, currentIndent, isOrderedContext, leaderMarker);

    return new vscode.Position(newItemLine, indent.length + marker.length + 1);
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
    const indent = ' '.repeat(context.indent || 0);
    const currentIndent = context.indent || 0;

    let marker = context.marker || '-';
    marker = ListParser.getNextMarker(marker);

    const itemEnd = ListParser.findListItemEnd(document, position, currentIndent);
    editBuilder.insert(itemEnd, `\n${indent}${marker} [ ] `);

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

    let marker = context.marker || '-';
    marker = ListParser.getNextMarker(marker);

    const restOfLine = line.text.substring(position.character).trim();
    editBuilder.delete(new vscode.Range(position, line.range.end));
    editBuilder.insert(line.range.end, `\n${indent}${marker} ${restOfLine}`);

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
    marker = ListParser.getNextMarker(marker);

    const restOfLine = line.text.substring(position.character).trim();
    editBuilder.delete(new vscode.Range(position, line.range.end));
    editBuilder.insert(line.range.end, `\n${indent}${marker} [ ] ${restOfLine}`);

    return new vscode.Position(position.line + 1, indent.length + marker.length + 5);
  }

  /**
   * 切换列表折叠状态
   */
  static async toggleListFold(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const currentLine = document.lineAt(position.line);
    const currentIndent = ListParser.getIndentLevel(currentLine.text);

    const hasSubItems = ListParser.hasSubItems(document, position.line, currentIndent);

    if (hasSubItems) {
      const savedPosition = editor.selection.active;
      try {
        await vscode.commands.executeCommand('editor.toggleFold');
        editor.selection = new vscode.Selection(savedPosition, savedPosition);
      } catch (error) {
        Logger.warn('折叠命令失败');
      }
    } else {
      await vscode.commands.executeCommand('tab');
    }
  }

  /**
   * 增加列表项缩进级别
   */
  static async increaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const listInfo = ListParser.parseListItem(line.text);
    if (!listInfo) return;

    const newCursorChar = position.character + 2;

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

    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

  /**
   * 减少列表项缩进级别
   */
  static async decreaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const listInfo = ListParser.parseListItem(line.text);
    if (!listInfo) return;

    const newIndentLength = Math.max(0, listInfo.indent - 2);
    const indentReduction = listInfo.indent - newIndentLength;
    const newCursorChar = Math.max(0, position.character - indentReduction);

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

    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

  /**
   * 同步或修复整个列表块的标记
   */
  private static syncListMarkers(
    editBuilder: vscode.TextEditorEdit,
    document: vscode.TextDocument,
    firstItemLine: number,
    newItemLine: number,
    indent: number,
    isOrdered: boolean,
    leaderMarker: string
  ) {
    const itemsInBlock = ListParser.findItemsAtLevel(document, firstItemLine, indent);
    // 统计新项插入位置之前的项数
    const itemsBeforeNew = itemsInBlock.filter(item => item.line < newItemLine).length;

    itemsInBlock.forEach((item, index) => {
      let expectedMarker = '';
      if (isOrdered) {
        // 计算正确序号：如果是新行之后的项，索引要加 2
        const posInList = item.line < newItemLine ? (index + 1) : (index + 2);
        expectedMarker = `${posInList}.`;
      } else {
        expectedMarker = leaderMarker;
      }

      if (item.listInfo.marker !== expectedMarker) {
        const line = document.lineAt(item.line);
        const newLine = ListParser.buildListItemLine(
          item.listInfo.indent,
          expectedMarker,
          item.listInfo.content,
          item.listInfo.hasCheckbox,
          item.listInfo.checkboxState || ' '
        );
        editBuilder.replace(line.range, newLine);
      }
    });
  }
}
