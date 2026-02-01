import * as core from '../types/core';
import { HeadingInfo } from '../commands/types/editingTypes';
import { DEFAULT_TODO_KEYWORDS, parseTodoKeywords } from '../utils/constants';

/**
 * 标题解析器
 * 纯解析逻辑，负责解析 Org-mode 标题格式
 */
export class HeadingParser {
  // 默认关键字列表，用于在没有提供关键字时使用
  private static defaultKeywords: string[] | null = null;

  /**
   * 获取默认关键字列表
   */
  private static getDefaultKeywords(): string[] {
    if (!HeadingParser.defaultKeywords) {
      const parsed = parseTodoKeywords(DEFAULT_TODO_KEYWORDS);
      HeadingParser.defaultKeywords = parsed.allKeywords.map(k => k.keyword);
    }
    return HeadingParser.defaultKeywords;
  }

  /**
   * 解析标题行
   * 
   * @param lineText - 标题行文本
   * @param includeTags - 是否解析标签（默认为 true）
   * @param todoKeywords - TODO 关键字列表（可选，如果不提供则使用默认值）
   * @returns 标题信息，包含层级、TODO 状态、标题和标签
   */
  static parseHeading(lineText: string, includeTags: boolean = true, todoKeywords?: string[]): HeadingInfo {
    const keywords = todoKeywords || HeadingParser.getDefaultKeywords();
    // 匹配星号、TODO 关键字（可选）、优先级（可选，格式如 [#A]）和标题文本
    const keywordRegex = new RegExp(`^(\\*+)\\s+(?:(${keywords.join('|')})\\s+)?(?:\\[#([A-C])\\]\\s+)?(.*)$`);
    const headingMatch = lineText.match(keywordRegex);

    if (!headingMatch) {
      return {
        level: 0,
        stars: '',
        todoKeyword: null,
        priority: null,
        title: lineText
      };
    }

    const titleText = headingMatch[4] || '';
    const result: HeadingInfo = {
      level: headingMatch[1].length,
      stars: headingMatch[1],
      todoKeyword: headingMatch[2] || null,
      priority: headingMatch[3] ? `[#${headingMatch[3]}]` : null,
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
    // 使用更宽松的字符匹配以支持 Unicode (如中文标签)
    const tagMatch = pureTitle.match(/^(.+?)\s+(:[^\s:]+(?::[^\s:]+)*:)\s*$/);
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
    document: core.TextDocument,
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
  static findSubtreeEnd(
    document: core.TextDocument,
    position: core.Position,
    todoKeywords?: string[]
  ): { line: number; character: number } {
    const currentLine = document.lineAt(position.line);
    const headingInfo = HeadingParser.parseHeading(currentLine.text, false, todoKeywords);

    if (headingInfo.level === 0) {
      return position;
    }

    const currentLevel = headingInfo.level;

    // 查找下一个同级或更高级的标题
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const nextHeadingInfo = HeadingParser.parseHeading(line.text, false, todoKeywords);

      if (nextHeadingInfo.level > 0 && nextHeadingInfo.level <= currentLevel) {
        return { line: i - 1, character: document.lineAt(i - 1).text.length };
      }
    }

    // 如果没找到，返回文档末尾
    return { line: document.lineCount - 1, character: document.lineAt(document.lineCount - 1).text.length };
  }

  /**
   * 查找当前位置所属的标题
   */
  static findCurrentHeading(
    document: core.TextDocument,
    position: core.Position,
    todoKeywords?: string[]
  ): { line: core.TextLine; headingInfo: HeadingInfo } | null {
    // 首先检查当前行是否就是标题行
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = HeadingParser.parseHeading(currentLine.text, true, todoKeywords);
    if (currentHeadingInfo.level > 0) {
      return {
        line: currentLine,
        headingInfo: currentHeadingInfo
      };
    }

    // 如果当前行不是标题行，向上查找所属的标题
    for (let lineNumber = position.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      const headingInfo = HeadingParser.parseHeading(line.text, true, todoKeywords);

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
    pureTitle: string,
    todoState?: string | null,
    priority?: string | null,
    tags?: string[]
  ): string {
    const stars = '*'.repeat(level);
    let line = stars;
    if (todoState) {
      line += ` ${todoState}`;
    }
    if (priority) {
      line += ` ${priority}`;
    }
    line += ` ${pureTitle}`;
    if (tags && tags.length > 0) {
      line += ` :${tags.join(':')}:`;
    }
    return line;
  }

  /**
   * 更新标题的TODO状态
   * 返回新的标题行文本
   */
  static updateTodoState(
    lineText: string,
    newState: string | null,
    todoKeywords?: string[]
  ): string {
    const headingInfo = this.parseHeading(lineText, true, todoKeywords);
    if (headingInfo.level === 0) {
      return lineText; // 不是标题行，返回原文本
    }

    return this.buildHeadingLine(
      headingInfo.level,
      headingInfo.text || headingInfo.title, // 优先使用纯文本
      newState || null,
      headingInfo.priority,
      headingInfo.tags
    );
  }

  /**
   * 更新标题的标签
   * 返回新的标题行文本
   */
  static updateTags(
    lineText: string,
    newTags: string[],
    todoKeywords?: string[]
  ): string {
    const headingInfo = this.parseHeading(lineText, true, todoKeywords);
    if (headingInfo.level === 0) {
      return lineText;
    }

    return this.buildHeadingLine(
      headingInfo.level,
      headingInfo.text || headingInfo.title,
      headingInfo.todoKeyword,
      headingInfo.priority,
      newTags
    );
  }

  /**
   * 检查是否是标题行
   */
  static isHeadingLine(lineText: string, todoKeywords?: string[]): boolean {
    const headingInfo = this.parseHeading(lineText, false, todoKeywords);
    return headingInfo.level > 0;
  }
}


