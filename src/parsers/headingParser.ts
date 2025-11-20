import * as vscode from 'vscode';
import { HeadingInfo } from '../commands/types/editingTypes';
import { TodoKeywordManager } from '../utils/todoKeywordManager';

/**
 * 标题解析器
 * 纯解析逻辑，负责解析 Org-mode 标题格式
 */
export class HeadingParser {
  private static todoKeywordManager = TodoKeywordManager.getInstance();

  /**
   * 解析标题行
   * 
   * @param lineText - 标题行文本
   * @param includeTags - 是否解析标签（默认为 true）
   * @returns 标题信息，包含层级、TODO 状态、标题和标签
   */
  static parseHeading(lineText: string, includeTags: boolean = true): HeadingInfo {
    const allKeywords = HeadingParser.todoKeywordManager.getAllKeywords();
    const keywordRegex = new RegExp(`^(\\*+)\\s+(?:(${allKeywords.map(k => k.keyword).join('|')})\\s+)?(.*)$`);
    const headingMatch = lineText.match(keywordRegex);
    
    if (!headingMatch) {
      return {
        level: 0,
        stars: '',
        todoKeyword: null,
        title: lineText
      };
    }

    const titleText = headingMatch[3] || '';
    const result: HeadingInfo = {
      level: headingMatch[1].length,
      stars: headingMatch[1],
      todoKeyword: headingMatch[2] || null,
      title: titleText
    };

    // 如果需要解析标签
    if (includeTags) {
      const { pureTitle, tags } = this.parseHeadingTags(titleText);
      result.text = pureTitle;
      result.tags = tags;
    }

    return result;
  }

  /**
   * 解析标题文本，提取标签
   * 
   * @param titleText - 标题文本（可能包含标签）
   * @returns 纯净标题和标签数组
   */
  static parseHeadingTags(titleText: string): {
    pureTitle: string;
    tags: string[];
  } {
    let pureTitle = titleText.trim();
    let tags: string[] = [];
    
    // 提取标签（格式：:tag1:tag2:）
    const tagMatch = pureTitle.match(/^(.+?)\s+(:[\w_@]+(?::[\w_@]+)*:)\s*$/);
    if (tagMatch) {
      pureTitle = tagMatch[1].trim();
      const tagString = tagMatch[2];
      tags = tagString.slice(1, -1).split(':').filter(tag => tag.length > 0);
    }
    
    return { pureTitle, tags };
  }

  /**
   * 构建标题的显示名称
   * 
   * 包含 TODO 状态和标签信息，用于在符号列表中显示。
   * 
   * @param pureTitle - 纯净的标题文本（不含标签）
   * @param todoStatus - TODO 状态（可选）
   * @param tags - 标签数组（可选）
   * @returns 完整的显示名称
   */
  static buildDisplayName(
    pureTitle: string,
    todoStatus?: string | null,
    tags?: string[]
  ): string {
    let displayName = pureTitle;
    
    if (todoStatus) {
      displayName = `${todoStatus} ${displayName}`;
    }
    
    if (tags && tags.length > 0) {
      displayName += ` :${tags.join(':')}:`;
    }
    
    return displayName;
  }

  /**
   * 查找下一个同级或更高级标题的行号
   */
  static findNextHeading(
    document: vscode.TextDocument,
    startLine: number,
    currentLevel: number
  ): number {
    for (let lineNumber = startLine + 1; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text);
      
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

  /**
   * 查找当前位置所属的标题
   */
  static findCurrentHeading(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { line: vscode.TextLine; headingInfo: HeadingInfo } | null {
    // 首先检查当前行是否就是标题行
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = HeadingParser.parseHeading(currentLine.text);
    if (currentHeadingInfo.level > 0) {
      return {
        line: currentLine,
        headingInfo: currentHeadingInfo
      };
    }

    // 如果当前行不是标题行，向上查找所属的标题
    for (let lineNumber = position.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text);
      
      if (headingInfo.level > 0) {
        // 找到了一个标题，检查当前位置是否在这个标题的内容范围内
        const nextHeadingLine = HeadingParser.findNextHeading(document, lineNumber, headingInfo.level);
        
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
   * 构建标题行文本
   */
  static buildHeadingLine(
    level: number,
    title: string,
    todoState?: string | null
  ): string {
    const stars = '*'.repeat(level);
    if (todoState) {
      return `${stars} ${todoState} ${title}`;
    }
    return `${stars} ${title}`;
  }

  /**
   * 更新标题的TODO状态
   * 返回新的标题行文本
   */
  static updateTodoState(
    lineText: string,
    newState: string | null
  ): string {
    const headingInfo = this.parseHeading(lineText);
    if (headingInfo.level === 0) {
      return lineText; // 不是标题行，返回原文本
    }

    return this.buildHeadingLine(
      headingInfo.level,
      headingInfo.title,
      newState || null
    );
  }

  /**
   * 检查是否是标题行
   */
  static isHeadingLine(lineText: string): boolean {
    const headingInfo = this.parseHeading(lineText);
    return headingInfo.level > 0;
  }
}


