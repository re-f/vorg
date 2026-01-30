import * as core from '../types/core';
import { ContextInfo } from '../commands/types/editingTypes';
import { HeadingParser } from './headingParser';

/**
 * 上下文分析器
 * 
 * 负责分析当前编辑位置的上下文环境，识别当前位置处于：
 * - 标题（heading）
 * - 列表项（list-item）
 * - 复选框（checkbox）
 * - 表格（table）
 * - 代码块（code-block）
 * - Property 抽屉（property-drawer）
 * - 普通文本
 * 
 * 为编辑命令提供上下文信息，以便执行相应的智能操作。
 * 
 * @class ContextAnalyzer
 */
export class ContextAnalyzer {
  /**
   * 分析当前位置的上下文
   */
  static analyzeContext(document: core.TextDocument, position: core.Position, todoKeywords?: string[]): ContextInfo {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 检查是否在标题中 - 使用HeadingParser来解析
    const headingInfo = HeadingParser.parseHeading(lineText, true, todoKeywords);
    if (headingInfo.level > 0) {
      return {
        type: 'heading',
        level: headingInfo.level,
        todoState: headingInfo.todoKeyword,
        content: headingInfo.title
      };
    }

    // 检查是否在代码块标题中
    const codeBlockHeaderMatch = lineText.match(/^(\s*)#\+(BEGIN_SRC|BEGIN_EXAMPLE|BEGIN_QUOTE|BEGIN_VERSE|BEGIN_CENTER)/i);
    if (codeBlockHeaderMatch) {
      return { type: 'code-block-header' };
    }

    // 检查是否在列表项中
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const hasCheckbox = listMatch[3].match(/^\[([ X-])\]\s+(.*)$/);
      return {
        type: hasCheckbox ? 'checkbox' : 'list-item',
        indent: listMatch[1].length,
        marker: listMatch[2],
        content: hasCheckbox ? hasCheckbox[2] : listMatch[3],
        checkboxState: hasCheckbox ? hasCheckbox[1] : null
      };
    }

    // 检查是否在表格中
    if (lineText.match(/^\s*\|.*\|\s*$/)) {
      return { type: 'table' };
    }

    // 检查是否在property抽屉中
    if (lineText.match(/^\s*:PROPERTIES:\s*$/)) {
      return { type: 'property-drawer-header' };
    }

    if (lineText.match(/^\s*:END:\s*$/)) {
      return { type: 'property-drawer-end' };
    }

    if (lineText.match(/^\s*:\w+:\s*.*$/)) {
      const propertyMatch = lineText.match(/^\s*:(\w+):\s*(.*)$/);
      return {
        type: 'property-item',
        propertyKey: propertyMatch ? propertyMatch[1] : '',
        propertyValue: propertyMatch ? propertyMatch[2] : ''
      };
    }

    // 检查是否在property抽屉内部
    if (ContextAnalyzer.isInPropertyDrawer(document, position)) {
      return { type: 'property-drawer' };
    }

    // 检查是否在代码块中
    if (ContextAnalyzer.isInCodeBlock(document, position)) {
      return { type: 'code-block' };
    }

    // 检查是否在列表项的延续行中（缩进超过父列表项）
    const listContext = ContextAnalyzer.findParentListItem(document, position);
    if (listContext) {
      return listContext;
    }

    return { type: 'text' };
  }

  /**
   * 检查是否在property抽屉中
   */
  static isInPropertyDrawer(document: core.TextDocument, position: core.Position): boolean {
    let inPropertyDrawer = false;

    for (let i = 0; i <= position.line; i++) {
      const line = document.lineAt(i).text.trim();
      if (line === ':PROPERTIES:') {
        inPropertyDrawer = true;
      } else if (line === ':END:' && inPropertyDrawer) {
        inPropertyDrawer = false;
      }
    }

    return inPropertyDrawer;
  }

  /**
   * 检查是否在代码块中
   */
  static isInCodeBlock(document: core.TextDocument, position: core.Position): boolean {
    let inCodeBlock = false;

    for (let i = 0; i < position.line; i++) {
      const line = document.lineAt(i).text;
      if (line.match(/^\s*#\+BEGIN_SRC/i)) {
        inCodeBlock = true;
      } else if (line.match(/^\s*#\+END_SRC/i)) {
        inCodeBlock = false;
      }
    }

    return inCodeBlock;
  }

  /**
   * 向上查找父列表项，确定当前行是否属于某个列表项的延续行
   */
  private static findParentListItem(document: core.TextDocument, position: core.Position): ContextInfo | null {
    const currentLine = document.lineAt(position.line);
    const currentLineTrimmed = currentLine.text.trim();

    // 如果是标题行，不可能是列表延续
    if (HeadingParser.parseHeading(currentLine.text).level > 0) {
      return null;
    }

    // 获取当前行的起始缩进
    const indentMatch = currentLine.text.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1].length : 0;

    // 向上查找
    for (let i = position.line - 1; i >= 0; i--) {
      const line = document.lineAt(i);
      const lineText = line.text;
      const trimmed = lineText.trim();

      if (trimmed === '') {
        continue;
      }

      // 如果遇到标题，停止查找
      if (HeadingParser.parseHeading(lineText).level > 0) {
        break;
      }

      // 检查是否是列表行
      const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const markerIndent = listMatch[1].length;
        // 如果当前行的缩进大于列表项标记的缩进，说明当前行属于该列表项的延续
        // 注意：如果是空行，通常不适合这种简单的缩进判断，但在 analyzeContext 中已经排除了空行由其他逻辑处理的情况
        if (currentIndent > markerIndent) {
          const content = listMatch[3];
          const hasCheckbox = content.match(/^\[([ X-])\]\s+(.*)$/);
          return {
            type: hasCheckbox ? 'checkbox' : 'list-item',
            indent: markerIndent,
            marker: listMatch[2],
            content: hasCheckbox ? hasCheckbox[2] : content,
            checkboxState: hasCheckbox ? hasCheckbox[1] : null
          };
        } else if (currentIndent <= markerIndent && trimmed !== '') {
          // 遇到更低或同级缩进且带内容的行，如果是列表项则继续向上，如果不是则可能中断？
          // 在 Org-mode 中，如果遇到非列表项且缩进不大于 markerIndent，则列表结束
          if (!lineText.match(/^(\s*)([-+*]|\d+\.)\s+/)) {
            break;
          }
        }
      } else {
        // 非列表行，检查其缩进
        const lineIndentMatch = lineText.match(/^(\s*)/);
        const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
        if (lineIndent < currentIndent) {
          // 遇到了缩进更小的非列表行，可能已经离开了列表上下文
          // 但在 Org 中，这种情况比较复杂。简单处理：如果不是标题，继续向上找直到找到标题或列表
        }
      }
    }

    return null;
  }
}

