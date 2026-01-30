import * as vscode from 'vscode';
import { ContextInfo, HeadingInfo } from '../types/editingTypes';
import { HeadingParser } from '../../parsers/headingParser';
import { getConfigService } from '../../services/configService';

/**
 * 标题操作命令类
 * 
 * 提供 org-mode 标题的插入、解析、折叠等操作，包括：
 * - 在标题子树之后插入同级标题（M-RET 语义）
 * - 分割标题（C-RET 语义）
 * - 插入 TODO 标题
 * - 切换标题折叠状态
 * - 升级/降级子树（org-promote-subtree / org-demote-subtree）
 * 
 * @class HeadingCommands
 */
export class HeadingCommands {

  /**
   * 在当前标题下方立即插入同级标题（不分割内容）
   * 用于 M-RET 在行首/行尾
   */
  static insertHeadingImmediate(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo
  ): vscode.Position {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const stars = '*'.repeat(context.level || 1);

    // 在当前行之后插入新标题
    editBuilder.insert(line.range.end, `\n${stars} `);

    // 返回光标位置
    return new vscode.Position(position.line + 1, stars.length + 1);
  }

  /**
   * 在当前标题所属子树之后插入同级标题（不分割内容）
   * 对应 C-RET (respect-content)
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
    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, position, todoKeywords);
    const vscodeSubtreeEnd = new vscode.Position(subtreeEnd.line, subtreeEnd.character);

    // 在子树末尾插入新标题
    editBuilder.insert(vscodeSubtreeEnd, `\n${stars} `);

    // 返回光标应该移动到的位置
    return new vscode.Position(subtreeEnd.line + 1, stars.length + 1);
  }

  /**
   * 在当前位置分割标题并立即在下方创建新标题
   * 对应 M-RET (在标题行中间按下)
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

    // 获取光标前的内容（去掉尾部空格）
    const prefix = line.text.substring(0, position.character).trimEnd();

    // 替换整行为前缀
    editBuilder.replace(line.range, prefix);

    // 在当前行之后插入新标题
    editBuilder.insert(line.range.end, `\n${stars} ${restOfLine}`);

    // 返回光标应该移动到的位置（新标题的内容开始位置）
    return new vscode.Position(position.line + 1, stars.length + 1);
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
    const config = getConfigService();
    const defaultTodoKeyword = config.getDefaultTodoKeyword();

    let newPosition: vscode.Position;
    await editor.edit(editBuilder => {
      if (lineText.trim() === '') {
        // 当前行为空，直接插入
        editBuilder.insert(position, `${stars} ${defaultTodoKeyword} `);
        newPosition = new vscode.Position(position.line, stars.length + defaultTodoKeyword.length + 2);
      } else {
        // 当前行有内容，在行末插入新行
        const lineEnd = line.range.end;
        editBuilder.insert(lineEnd, `\n${stars} ${defaultTodoKeyword} `);
        newPosition = new vscode.Position(position.line + 1, stars.length + defaultTodoKeyword.length + 2);
      }
    });

    // 移动光标
    editor.selection = new vscode.Selection(newPosition!, newPosition!);
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
    position: vscode.Position,
    todoKeywords?: string[]
  ): { line: any; headingInfo: HeadingInfo } | null {
    return HeadingParser.findCurrentHeading(document, position, todoKeywords);
  }

  /**
   * 确定标题的星号级别
   */
  static determineStarLevel(editor: vscode.TextEditor, lineNumber: number): string {
    const document = editor.document;
    const line = document.lineAt(lineNumber);
    const lineText = line.text;
    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();
    const headingInfo = HeadingParser.parseHeading(lineText, true, todoKeywords);

    if (headingInfo.level > 0) {
      return headingInfo.stars;
    }
    return '';
  }

  /**
   * 升级子树（减少标题级别，org-promote-subtree）
   * 将整个子树的所有标题级别减少1，但不能小于1
   */
  static async promoteSubtree(editor: vscode.TextEditor): Promise<void> {
    const position = editor.selection.active;
    const document = editor.document;

    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();

    // 检查当前行是否就是标题行（只在 headline 行本身时生效）
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = HeadingParser.parseHeading(currentLine.text, true, todoKeywords);
    if (currentHeadingInfo.level === 0) {
      // 如果当前行不是标题行，不执行任何操作
      return;
    }

    // 查找当前标题（用于获取完整的标题信息）
    const currentHeading = HeadingParser.findCurrentHeading(document, position, todoKeywords);
    if (!currentHeading) {
      return;
    }

    const startLine = currentHeading.line.lineNumber;
    const startLevel = currentHeading.headingInfo.level;

    // 如果已经是1级标题，不能再升级
    if (startLevel <= 1) {
      return;
    }

    // 找到子树结束行
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, currentHeading.line.range.start, todoKeywords);
    const endLine = subtreeEnd.line;

    // 收集所有需要修改的标题行及其新级别
    const edits: Array<{ line: number; newLevel: number; headingInfo: HeadingInfo }> = [];

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text, true, todoKeywords);

      if (headingInfo.level > 0) {
        // 计算相对级别差
        const levelDiff = headingInfo.level - startLevel;
        const newLevel = Math.max(1, startLevel - 1 + levelDiff);

        if (newLevel !== headingInfo.level) {
          edits.push({ line: lineNumber, newLevel, headingInfo });
        }
      }
    }

    // 如果没有任何需要修改的行，直接返回
    if (edits.length === 0) {
      return;
    }

    // 执行编辑（从后向前编辑，避免行号偏移问题）
    await editor.edit(editBuilder => {
      for (let i = edits.length - 1; i >= 0; i--) {
        const edit = edits[i];
        const line = document.lineAt(edit.line);
        const newLineText = HeadingParser.buildHeadingLine(
          edit.newLevel,
          edit.headingInfo.title,
          edit.headingInfo.todoKeyword
        );
        editBuilder.replace(line.range, newLineText);
      }
    });
  }

  /**
   * 降级子树（增加标题级别，org-demote-subtree）
   * 将整个子树的所有标题级别增加1
   */
  static async demoteSubtree(editor: vscode.TextEditor): Promise<void> {
    const position = editor.selection.active;
    const document = editor.document;

    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();

    // 检查当前行是否就是标题行（只在 headline 行本身时生效）
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = HeadingParser.parseHeading(currentLine.text, true, todoKeywords);
    if (currentHeadingInfo.level === 0) {
      // 如果当前行不是标题行，不执行任何操作
      return;
    }

    // 查找当前标题（用于获取完整的标题信息）
    const currentHeading = HeadingParser.findCurrentHeading(document, position, todoKeywords);
    if (!currentHeading) {
      return;
    }

    const startLine = currentHeading.line.lineNumber;
    const startLevel = currentHeading.headingInfo.level;

    // 找到子树结束行
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, currentHeading.line.range.start, todoKeywords);
    const endLine = subtreeEnd.line;

    // 收集所有需要修改的标题行及其新级别
    const edits: Array<{ line: number; newLevel: number; headingInfo: HeadingInfo }> = [];

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text, true, todoKeywords);

      if (headingInfo.level > 0) {
        // 计算相对级别差
        const levelDiff = headingInfo.level - startLevel;
        const newLevel = startLevel + 1 + levelDiff;

        edits.push({ line: lineNumber, newLevel, headingInfo });
      }
    }

    // 如果没有任何需要修改的行，直接返回
    if (edits.length === 0) {
      return;
    }

    // 执行编辑（从后向前编辑，避免行号偏移问题）
    await editor.edit(editBuilder => {
      for (let i = edits.length - 1; i >= 0; i--) {
        const edit = edits[i];
        const line = document.lineAt(edit.line);
        const newLineText = HeadingParser.buildHeadingLine(
          edit.newLevel,
          edit.headingInfo.title,
          edit.headingInfo.todoKeyword
        );
        editBuilder.replace(line.range, newLineText);
      }
    });
  }

}

