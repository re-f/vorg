import * as vscode from 'vscode';
import { ContextInfo } from '../commands/types/editingTypes';
import { HeadingParser } from './headingParser';

/**
 * 上下文分析器
 * 负责分析当前编辑位置的上下文环境
 */
export class ContextAnalyzer {
  /**
   * 分析当前位置的上下文
   */
  static analyzeContext(document: vscode.TextDocument, position: vscode.Position): ContextInfo {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 检查是否在标题中 - 使用HeadingParser来解析
    const headingInfo = HeadingParser.parseHeading(lineText);
    if (headingInfo.level > 0) {
      return {
        type: 'heading',
        level: headingInfo.level,
        todoState: headingInfo.todoState,
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

    return { type: 'text' };
  }

  /**
   * 检查是否在property抽屉中
   */
  static isInPropertyDrawer(document: vscode.TextDocument, position: vscode.Position): boolean {
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
  static isInCodeBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
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
}

