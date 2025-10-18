import * as vscode from 'vscode';
import { ContextInfo, HeadingInfo } from '../types/editingTypes';
import { TodoKeywordManager } from '../../utils/todoKeywordManager';

/**
 * 标题相关命令
 */
export class HeadingCommands {
  private static todoKeywordManager = TodoKeywordManager.getInstance();

  /**
   * 插入标题
   */
  static insertHeading(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    context: ContextInfo,
    isAtBeginning: boolean
  ) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const stars = '*'.repeat(context.level || 1);

    if (isAtBeginning) {
      // 在当前行之前插入新标题
      editBuilder.insert(line.range.start, `${stars} \n`);
    } else {
      // 分割当前行，后半部分作为新标题
      const lineEnd = line.range.end;
      const restOfLine = line.text.substring(position.character);
      editBuilder.delete(new vscode.Range(position, lineEnd));
      editBuilder.insert(position, `\n${stars} ${restOfLine}`);
    }
  }

  /**
   * 插入TODO标题
   */
  static async insertTodoHeading(editor: vscode.TextEditor) {
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;
    
    // 获取当前行的缩进级别
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    
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
   */
  static findCurrentHeading(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { line: vscode.TextLine; headingInfo: HeadingInfo } | null {
    // 首先检查当前行是否就是标题行
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = HeadingCommands.parseHeadingLine(currentLine.text);
    if (currentHeadingInfo.level > 0) {
      return {
        line: currentLine,
        headingInfo: currentHeadingInfo
      };
    }

    // 如果当前行不是标题行，向上查找所属的标题
    for (let lineNumber = position.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingCommands.parseHeadingLine(line.text);
      
      if (headingInfo.level > 0) {
        // 找到了一个标题，检查当前位置是否在这个标题的内容范围内
        const nextHeadingLine = HeadingCommands.findNextHeadingLine(document, lineNumber, headingInfo.level);
        
        if (nextHeadingLine === -1 || position.line < nextHeadingLine) {
          // 当前位置在这个标题的内容范围内
          return {
            line: line,
            headingInfo: headingInfo
          };
        }
      }
    }

    return null;
  }

  /**
   * 解析标题行
   */
  static parseHeadingLine(lineText: string): HeadingInfo {
    const allKeywords = HeadingCommands.todoKeywordManager.getAllKeywords();
    const keywordRegex = new RegExp(`^(\\*+)\\s+(?:(${allKeywords.map(k => k.keyword).join('|')})\\s+)?(.*)$`);
    const headingMatch = lineText.match(keywordRegex);
    
    if (!headingMatch) {
      return {
        level: 0,
        stars: '',
        todoState: null,
        title: lineText
      };
    }

    return {
      level: headingMatch[1].length,
      stars: headingMatch[1],
      todoState: headingMatch[2] || null,
      title: headingMatch[3] || ''
    };
  }

  /**
   * 确定标题的星号级别
   */
  static determineStarLevel(editor: vscode.TextEditor, lineNumber: number): string {
    const document = editor.document;
    const line = document.lineAt(lineNumber);
    const lineText = line.text;
    const headingMatch = lineText.match(/^(\*+)\s+(?:(TODO|DONE|NEXT|WAITING|CANCELLED)\s+)?(.*)$/);

    if (headingMatch) {
      return headingMatch[1];
    }
    return '';
  }

  /**
   * 查找下一个同级或更高级标题的行号
   */
  static findNextHeadingLine(
    document: vscode.TextDocument,
    startLine: number,
    currentLevel: number
  ): number {
    for (let lineNumber = startLine + 1; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingCommands.parseHeadingLine(line.text);
      
      if (headingInfo.level > 0 && headingInfo.level <= currentLevel) {
        return lineNumber;
      }
    }
    
    return -1; // 没有找到下一个同级或更高级标题
  }

  /**
   * 查找子树的结束位置
   */
  static findSubtreeEnd(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const currentLine = document.lineAt(position.line);
    const currentHeadingMatch = currentLine.text.match(/^(\*+)/);
    
    if (!currentHeadingMatch) {
      return position;
    }
    
    const currentLevel = currentHeadingMatch[1].length;
    
    // 查找下一个同级或更高级的标题
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const headingMatch = line.text.match(/^(\*+)/);
      
      if (headingMatch && headingMatch[1].length <= currentLevel) {
        return new vscode.Position(i - 1, document.lineAt(i - 1).text.length);
      }
    }
    
    // 如果没找到，返回文档末尾
    return new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
  }
}

