import * as vscode from 'vscode';
import * as path from 'path';
import { HeadingParser } from '../parsers/headingParser';
import { PropertyParser } from '../parsers/propertyParser';
import { TodoKeywordManager } from './todoKeywordManager';
import { Logger } from './logger';

/**
 * 链接工具类
 * 统一处理链接相关的查找和解析功能
 */
export class LinkUtils {
  private static todoKeywordManager = TodoKeywordManager.getInstance();

  /**
   * 解析文件路径
   * 支持绝对路径和相对路径（相对于当前文档）
   */
  static resolveFilePath(document: vscode.TextDocument, filePath: string): vscode.Uri | null {
    try {
      if (path.isAbsolute(filePath)) {
        return vscode.Uri.file(filePath);
      }

      const currentDir = path.dirname(document.uri.fsPath);
      const resolvedPath = path.resolve(currentDir, filePath);
      return vscode.Uri.file(resolvedPath);
    } catch (error) {
      return null;
    }
  }

  /**
   * 在指定文档中查找ID
   * 返回包含该ID的位置（优先返回所属的headline位置，如果是文件级别property则返回ID所在行）
   */
  static findIdInDocument(document: vscode.TextDocument, id: string): vscode.Location | null {
    // 使用 PropertyParser 查找 ID
    const idLine = PropertyParser.findIdInDocument(document, id);
    
    if (idLine === null) {
      return null;
    }
    
    // 向上查找最近的标题 - 使用 HeadingParser
    for (let i = idLine; i >= 0; i--) {
      const line = document.lineAt(i);
      if (HeadingParser.isHeadingLine(line.text)) {
        return new vscode.Location(document.uri, new vscode.Position(i, 0));
      }
    }

    // 如果没有找到标题，说明这是文件级别的 property，返回 ID 所在行的位置
    return new vscode.Location(document.uri, new vscode.Position(idLine, 0));
  }

  /**
   * 通过ID查找标题位置（支持跨文件搜索）
   * 首先在当前文档中查找，如果没找到则在整个工作区的所有.org文件中查找
   */
  static async findHeadlineById(document: vscode.TextDocument, id: string): Promise<vscode.Location | null> {
    // 首先在当前文档中查找
    const currentFileLocation = LinkUtils.findIdInDocument(document, id);
    if (currentFileLocation) {
      return currentFileLocation;
    }

    // 如果在当前文档中没找到，则在整个工作区的所有.org文件中查找
    try {
      const orgFiles = await vscode.workspace.findFiles('**/*.org', '**/node_modules/**', 100);
      
      for (const fileUri of orgFiles) {
        // 跳过当前文档，因为已经搜索过了
        if (fileUri.toString() === document.uri.toString()) {
          continue;
        }

        try {
          const fileDocument = await vscode.workspace.openTextDocument(fileUri);
          const location = LinkUtils.findIdInDocument(fileDocument, id);
          if (location) {
            return location;
          }
        } catch (error) {
          // 忽略无法打开的文件
          Logger.warn(`Failed to open document ${fileUri.toString()}`);
        }
      }
    } catch (error) {
      Logger.warn('Failed to search for ID in workspace');
      Logger.error('ID search error details', error);
    }

    return null;
  }

  /**
   * 通过标题文本查找标题位置
   * 支持匹配标题文本（带或不带 TODO 状态）
   */
  static findHeadlineByTitle(document: vscode.TextDocument, title: string): vscode.Location | null {
    const text = document.getText();
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 使用 HeadingParser 解析标题
      const headingInfo = HeadingParser.parseHeading(line);
      
      if (headingInfo.level > 0) {
        // 获取完整标题（包含 TODO 状态）
        const fullTitle = headingInfo.todoKeyword 
          ? `${headingInfo.todoKeyword} ${headingInfo.title}`
          : headingInfo.title;
        
        // 匹配标题文本（带或不带 TODO 状态）
        if (headingInfo.title === title || fullTitle === title) {
          return new vscode.Location(document.uri, new vscode.Position(i, 0));
        }
      }
    }

    return null;
  }
}

