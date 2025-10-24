import * as vscode from 'vscode';
import { ContextInfo, HeadingInfo } from '../types/editingTypes';
import { TodoKeywordManager } from '../../utils/todoKeywordManager';
import { HeadingParser } from '../../parsers/headingParser';

/**
 * 标题相关命令
 */
export class HeadingCommands {
  private static todoKeywordManager = TodoKeywordManager.getInstance();

  /**
   * 在标题子树之后插入同级标题 (M-RET 语义)
   * 返回光标应该移动到的位置
   */
  static insertHeadingAfterSubtree(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ): vscode.Position {
    const position = editor.selection.active;
    const document = editor.document;
    const stars = '*'.repeat(context.level || 1);
    
    // 找到子树结束位置
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, position);
    
    // 在子树末尾插入新标题
    editBuilder.insert(subtreeEnd, `\n${stars} `);
    
    // 返回光标应该移动到的位置
    return new vscode.Position(subtreeEnd.line + 1, stars.length + 1);
  }

  /**
   * 分割标题 (C-RET 语义)
   * 返回光标应该移动到的位置
   */
  static splitHeading(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo,
    position: vscode.Position
  ): vscode.Position {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const stars = '*'.repeat(context.level || 1);
    
    // 获取光标后的内容
    const restOfLine = line.text.substring(position.character).trim();
    
    // 删除光标后的内容
    editBuilder.delete(new vscode.Range(position, line.range.end));
    
    // 找到子树结束位置
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, position);
    
    // 在子树末尾插入新标题
    editBuilder.insert(subtreeEnd, `\n${stars} ${restOfLine}`);
    
    // 返回光标应该移动到的位置（新标题的内容开始位置）
    return new vscode.Position(subtreeEnd.line + 1, stars.length + 1);
  }

  /**
   * 插入TODO标题
   */
  static async insertTodoHeading(editor: vscode.TextEditor) {
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;
    
    // 确定星号数量
    const stars = HeadingCommands.determineStarLevel(editor, position.line);
    
    // 获取默认TODO关键字
    const defaultTodoKeyword = HeadingCommands.todoKeywordManager.getDefaultTodoKeyword();
    
    await editor.edit(editBuilder => {
      if (lineText.trim() === '') {
        // 当前行为空，直接插入
        editBuilder.insert(position, `${stars} ${defaultTodoKeyword} `);
      } else {
        // 当前行有内容，在行末插入新行
        const lineEnd = line.range.end;
        editBuilder.insert(lineEnd, `\n${stars} ${defaultTodoKeyword} `);
      }
    });
  }

  /**
   * 切换标题折叠状态
   */
  static async toggleHeadingFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
  }

  /**
   * 查找当前位置所属的标题
   * @deprecated Use HeadingParser.findCurrentHeading instead
   */
  static findCurrentHeading(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { line: vscode.TextLine; headingInfo: HeadingInfo } | null {
    return HeadingParser.findCurrentHeading(document, position);
  }

  /**
   * 确定标题的星号级别
   */
  static determineStarLevel(editor: vscode.TextEditor, lineNumber: number): string {
    const document = editor.document;
    const line = document.lineAt(lineNumber);
    const lineText = line.text;
    const headingInfo = HeadingParser.parseHeading(lineText);

    if (headingInfo.level > 0) {
      return headingInfo.stars;
    }
    return '';
  }

}

