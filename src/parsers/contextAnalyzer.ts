import * as vscode from 'vscode';
import { ContextInfo } from '../commands/types/editingTypes';
import { HeadingParser } from './headingParser';
import { ListParser } from './listParser';

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
  static analyzeContext(document: vscode.TextDocument, position: vscode.Position): ContextInfo {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 检查是否在标题中 - 使用HeadingParser来解析
    const headingInfo = HeadingParser.parseHeading(lineText);
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

    // 检查是否在列表项的子内容中（缩进的文本行）
    // Emacs org-mode 规则：
    // 1. 当前行缩进必须严格大于列表项的缩进
    // 2. 如果遇到2个或更多连续空行，列表项内容结束
    // 3. 如果遇到同级或更高级的列表项、标题，列表项结束
    if (lineText.trim() !== '') {
      const currentIndent = ListParser.getIndentLevel(lineText);
      let consecutiveEmptyLines = 0;
      
      // 向上查找最近的列表项
      for (let i = position.line - 1; i >= 0; i--) {
        const prevLine = document.lineAt(i);
        const prevLineText = prevLine.text;
        
        // 处理空行：记录连续空行数
        if (prevLineText.trim() === '') {
          consecutiveEmptyLines++;
          // 如果遇到2个或更多连续空行，列表项内容结束（Emacs 行为）
          if (consecutiveEmptyLines >= 2) {
            break;
          }
          continue;
        } else {
          // 遇到非空行，重置连续空行计数
          consecutiveEmptyLines = 0;
        }
        
        // 检查是否是标题，如果是标题则停止查找
        if (HeadingParser.parseHeading(prevLineText).level > 0) {
          break;
        }
        
        // 检查是否是列表项
        const prevListMatch = prevLineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
        if (prevListMatch) {
          const prevIndent = prevListMatch[1].length;
          
          // 如果当前行的缩进严格大于列表项的缩进，说明是列表项的子内容
          if (currentIndent > prevIndent) {
            const hasCheckbox = prevListMatch[3].match(/^\[([ X-])\]\s+(.*)$/);
            return {
              type: hasCheckbox ? 'checkbox' : 'list-item',
              indent: prevIndent,
              marker: prevListMatch[2],
              content: hasCheckbox ? hasCheckbox[2] : prevListMatch[3],
              checkboxState: hasCheckbox ? hasCheckbox[1] : null
            };
          } else {
            // 如果遇到同级或更高级的列表项，停止查找
            break;
          }
        } else {
          // 如果遇到非列表项
          const prevIndent = ListParser.getIndentLevel(prevLineText);
          
          // 如果缩进小于等于当前行的缩进，说明不是列表项的子内容，停止查找
          if (prevIndent <= currentIndent) {
            break;
          }
          // 如果缩进大于当前行，可能是其他列表项的子内容，继续向上查找
        }
      }
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

