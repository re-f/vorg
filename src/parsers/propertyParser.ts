import * as core from '../types/core';
import { HeadingParser } from './headingParser';

/**
 * Property信息接口
 */
export interface PropertyInfo {
  indent: string;
  key: string;
  value: string;
}

/**
 * Property抽屉信息接口
 */
export interface PropertyDrawerInfo {
  startLine: number;
  endLine: number;
}

/**
 * Property解析器
 * 纯解析逻辑，负责解析 Org-mode Property 抽屉格式
 */
export class PropertyParser {
  /**
   * 解析Property行
   */
  static parseProperty(lineText: string): PropertyInfo | null {
    const propertyMatch = lineText.match(/^(\s*):(\w+):\s*(.*)$/);
    if (!propertyMatch) {
      return null;
    }

    return {
      indent: propertyMatch[1],
      key: propertyMatch[2],
      value: propertyMatch[3]
    };
  }

  /**
   * 检查是否是Property抽屉开始标记
   */
  static isPropertyDrawerStart(lineText: string): boolean {
    return lineText.trim() === ':PROPERTIES:';
  }

  /**
   * 检查是否是Property抽屉结束标记
   */
  static isPropertyDrawerEnd(lineText: string): boolean {
    return lineText.trim() === ':END:';
  }

  /**
   * 检查是否是Property行
   */
  static isPropertyLine(lineText: string): boolean {
    return /^\s*:\w+:\s*/.test(lineText);
  }

  /**
   * 查找指定标题下的Property抽屉
   * 返回抽屉的起始行和结束行，如果不存在则返回null
   */
  static findPropertyDrawer(
    document: core.TextDocument,
    headingLineNumber: number
  ): PropertyDrawerInfo | null {
    let startLine: number | null = null;
    let endLine: number | null = null;

    // 查看标题下的几行，查找 :PROPERTIES: 和 :END: 标记
    for (let i = headingLineNumber + 1; i < Math.min(headingLineNumber + 50, document.lineCount); i++) {
      const line = document.lineAt(i);
      const lineText = line.text;

      // 如果遇到了另一个标题，停止查找
      const headingInfo = HeadingParser.parseHeading(lineText);
      if (headingInfo.level > 0) {
        break;
      }

      // 如果找到了 :PROPERTIES: 标记
      if (this.isPropertyDrawerStart(lineText)) {
        startLine = i;
        continue;
      }

      // 如果找到了 :END: 标记
      if (this.isPropertyDrawerEnd(lineText) && startLine !== null) {
        endLine = i;
        break;
      }
    }

    if (startLine !== null && endLine !== null) {
      return { startLine, endLine };
    }

    return null;
  }

  /**
   * 在Property抽屉中查找指定的属性
   * 返回属性所在的行号，如果不存在则返回null
   */
  static findPropertyInDrawer(
    document: core.TextDocument,
    drawerInfo: PropertyDrawerInfo,
    propertyKey: string
  ): number | null {
    const propertyKeyUpper = propertyKey.toUpperCase();

    for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
      const line = document.lineAt(i);
      const propertyInfo = this.parseProperty(line.text);

      if (propertyInfo && propertyInfo.key.toUpperCase() === propertyKeyUpper) {
        return i;
      }
    }

    return null;
  }

  /**
   * 获取Property抽屉中的缩进（参考现有属性的缩进）
   */
  static getPropertyIndent(
    document: core.TextDocument,
    drawerInfo: PropertyDrawerInfo,
    defaultIndent: string = '  '
  ): string {
    for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
      const line = document.lineAt(i);
      const propertyInfo = this.parseProperty(line.text);
      if (propertyInfo) {
        return propertyInfo.indent;
      }
    }

    return defaultIndent;
  }

  /**
   * 解析行的缩进
   */
  static parseIndent(lineText: string): string {
    const indentMatch = lineText.match(/^(\s*)/);
    return indentMatch ? indentMatch[1] : '';
  }

  /**
   * 构建Property行文本
   */
  static buildPropertyLine(
    key: string,
    value: string,
    indent: string = '  '
  ): string {
    const keyUpper = key.toUpperCase();
    return `${indent}:${keyUpper}: ${value}`;
  }

  /**
   * 构建Property抽屉文本
   */
  static buildPropertyDrawer(
    properties: Array<{ key: string; value: string }>,
    indent: string = '  '
  ): string {
    const lines = [`${indent}:PROPERTIES:`];

    for (const prop of properties) {
      lines.push(this.buildPropertyLine(prop.key, prop.value, indent));
    }

    lines.push(`${indent}:END:`);

    return lines.join('\n') + '\n';
  }

  /**
   * 生成唯一的 ID（UUID v4 格式）
   */
  static generateUniqueId(): string {
    // 生成符合 UUID v4 格式的随机 ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 检查指定标题下是否存在Property抽屉
   */
  static hasPropertyDrawer(
    document: core.TextDocument,
    headingLineNumber: number
  ): boolean {
    return this.findPropertyDrawer(document, headingLineNumber) !== null;
  }

  /**
   * 在文档中查找指定的 ID
   * 返回包含该 ID 的 Property 行的位置
   */
  static findIdInDocument(document: core.TextDocument, id: string): number | null {
    const text = document.getText();
    // 转义特殊字符
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idPattern = new RegExp(`:ID:\\s+${escapedId}`, 'gm');
    const match = idPattern.exec(text);

    if (!match) {
      return null;
    }

    // 返回匹配位置的行号
    // 注意：match.index 获取的是字符偏移量，需要转换为行号
    // 为了简单，我们只返回匹配行的 lineNumber。
    // 在 core.TextDocument 中，可以通过 getText().substring(0, index).split('\n').length - 1 简单估算
    const prefix = text.substring(0, match.index);
    return prefix.split('\n').length - 1;
  }

  /**
   * 获取指定标题的 ID，如果不存在则生成新 ID
   * 
   * @param document - 文档对象
   * @param headingLine - 标题所在行号
   * @returns 包含 ID 和是否需要插入的标记
   */
  static getOrGenerateIdForHeading(
    document: core.TextDocument,
    headingLine: number
  ): { id: string; needsInsert: boolean } {
    // 查找 Property 抽屉
    const drawer = this.findPropertyDrawer(document, headingLine);

    if (drawer) {
      // 在抽屉中查找 ID 属性
      const idLine = this.findPropertyInDrawer(document, drawer, 'ID');
      if (idLine !== null) {
        const lineObj = document.lineAt(idLine);
        const property = this.parseProperty(lineObj.text);
        if (property && property.key.toUpperCase() === 'ID') {
          const existingId = property.value.trim();
          return { id: existingId, needsInsert: false };
        }
      }
    }

    // 生成新 ID
    const newId = this.generateUniqueId();
    return { id: newId, needsInsert: true };
  }
}

