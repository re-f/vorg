import * as vscode from 'vscode';
import { HeadingParser } from './headingParser';

/**
 * 列表项信息接口
 */
export interface ListItemInfo {
  indent: number;
  marker: string;
  content: string;
  isOrdered: boolean;
  hasCheckbox: boolean;
  checkboxState?: string;
}

/**
 * 列表解析器
 * 纯解析逻辑，负责解析 Org-mode 列表格式
 */
export class ListParser {
  /**
   * 解析列表项
   */
  static parseListItem(lineText: string): ListItemInfo | null {
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!listMatch) {
      return null;
    }

    const indent = listMatch[1].length;
    const marker = listMatch[2];
    const content = listMatch[3];
    const isOrdered = /^\d+\.$/.test(marker);
    
    // 检查是否有复选框
    const checkboxMatch = content.match(/^\[([ X-])\]\s+(.*)$/);
    
    return {
      indent,
      marker,
      content: checkboxMatch ? checkboxMatch[2] : content,
      isOrdered,
      hasCheckbox: !!checkboxMatch,
      checkboxState: checkboxMatch ? checkboxMatch[1] : undefined
    };
  }

  /**
   * 检查是否是列表行
   */
  static isListLine(lineText: string): boolean {
    return /^(\s*)([-+*]|\d+\.)\s+/.test(lineText);
  }

  /**
   * 检查是否是标题行
   */
  static isHeadingLine(lineText: string): boolean {
    return /^(\*+)\s+/.test(lineText);
  }

  /**
   * 获取下一个列表标记（用于有序列表递增）
   */
  static getNextMarker(currentMarker: string): string {
    if (/^\d+\.$/.test(currentMarker)) {
      const num = parseInt(currentMarker) + 1;
      return `${num}.`;
    }
    return currentMarker;
  }

  /**
   * 解析行的缩进
   */
  static parseIndent(lineText: string): string {
    const indentMatch = lineText.match(/^(\s*)/);
    return indentMatch ? indentMatch[1] : '';
  }

  /**
   * 获取缩进级别（空格数）
   */
  static getIndentLevel(lineText: string): number {
    const indent = this.parseIndent(lineText);
    return indent.length;
  }

  /**
   * 查找列表项的结束位置（包括其所有子内容）
   */
  static findListItemEnd(
    document: vscode.TextDocument,
    position: vscode.Position,
    currentIndent: number
  ): vscode.Position {
    let lastNonEmptyLine = position.line;
    
    // 从当前行的下一行开始查找
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      
      // 跳过空行，但记录上一个非空行
      if (lineText.trim() === '') {
        continue;
      }
      
      // 检查缩进
      const lineIndent = this.getIndentLevel(lineText);
      
      // 检查是否是列表项
      const isListItem = this.isListLine(lineText);
      // 检查是否是标题
      const isHeading = this.isHeadingLine(lineText);
      
      // 如果遇到同级或更高级的列表项，或者遇到标题，说明当前列表项结束
      if ((isListItem && lineIndent <= currentIndent) || isHeading) {
        return new vscode.Position(lastNonEmptyLine, document.lineAt(lastNonEmptyLine).text.length);
      }
      
      // 更新最后一个非空行
      lastNonEmptyLine = i;
    }
    
    // 如果没找到，返回文档末尾
    return new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
  }

  /**
   * 检查列表项是否有子项
   */
  static hasSubItems(
    document: vscode.TextDocument,
    lineNumber: number,
    currentIndent: number
  ): boolean {
    for (let i = lineNumber + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 如果是空行，跳过
      if (lineText === '') {
        continue;
      }
      
      // 检查缩进
      const lineIndent = this.getIndentLevel(line.text);
      
      // 如果缩进大于当前级别，说明有子内容
      if (lineIndent > currentIndent && lineText !== '') {
        return true;
      }
      
      // 如果遇到同级或更高级的结构，停止查找
      const isListItem = this.isListLine(line.text);
      const isHeading = this.isHeadingLine(line.text);
      
      if ((isListItem && lineIndent <= currentIndent) || isHeading || (lineIndent <= currentIndent && lineText !== '')) {
        break;
      }
    }
    
    return false;
  }

  /**
   * 构建列表项行文本
   */
  static buildListItemLine(
    indent: number,
    marker: string,
    content: string,
    hasCheckbox: boolean = false,
    checkboxState: string = ' '
  ): string {
    const indentStr = ' '.repeat(indent);
    if (hasCheckbox) {
      return `${indentStr}${marker} [${checkboxState}] ${content}`;
    }
    return `${indentStr}${marker} ${content}`;
  }
}

