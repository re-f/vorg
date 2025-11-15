import * as vscode from 'vscode';
import { ContextInfo } from '../types/editingTypes';
import { ListParser } from '../../parsers/listParser';

/**
 * 代码块操作命令类
 * 
 * 提供代码块的插入和折叠操作，包括：
 * - 在代码块中插入行（保持缩进）
 * - 切换代码块折叠状态
 * - 切换 Property 抽屉折叠状态
 * 
 * @class CodeBlockCommands
 */
export class CodeBlockCommands {
  /**
   * 在代码块中插入行
   */
  static insertCodeBlockLine(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ) {
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const lineEnd = line.range.end;
    
    // 保持代码块的缩进 - 使用ListParser的缩进解析
    const indent = ListParser.parseIndent(line.text);
    editBuilder.insert(lineEnd, `\n${indent}`);
  }

  /**
   * 切换代码块折叠状态
   */
  static async toggleCodeBlockFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令切换代码块折叠状态
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
  }

  /**
   * 切换 Property 抽屉折叠状态
   */
  static async togglePropertyDrawerFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令切换 Property 抽屉折叠状态
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
  }
}

