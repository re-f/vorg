import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';
import { LinkUtils } from '../utils/linkUtils';
import { Logger } from '../utils/logger';

/**
 * 链接提供器
 * 
 * 提供链接识别和跳转功能，实现 VS Code 的 DocumentLinkProvider 和 DefinitionProvider 接口。
 * 
 * 支持的链接类型：
 * - 文件链接：file:path/to/file
 * - ID 链接：id:UUID
 * - URL 链接：http:// 或 https://
 * - 内部标题链接：[[*heading]]
 * 
 * 功能包括：
 * - 识别文档中的各种链接
 * - 提供链接跳转功能（Ctrl+Click、F12）
 * - 解析链接目标并导航
 * 
 * @class OrgLinkProvider
 * @implements {vscode.DocumentLinkProvider}
 * @implements {vscode.DefinitionProvider}
 */
export class OrgLinkProvider implements vscode.DocumentLinkProvider, vscode.DefinitionProvider {
  private todoKeywordManager: TodoKeywordManager;

  constructor() {
    this.todoKeywordManager = TodoKeywordManager.getInstance();
  }
  
  // 各种链接的正则表达式
  private static readonly LINK_PATTERNS = {
    // [[link][description]] 或 [[link]]
    BRACKET_LINK: /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g,
    // file:path/to/file
    FILE_LINK: /file:([^\s\]]+)/g,
    // http://example.com 或 https://example.com
    HTTP_LINK: /(https?:\/\/[^\s\]]+)/g,
    // id: links [[id:A4F1CD57-FE6E-478F-AACB-3660B4E68069][description]]
    ID_LINK: /id:([A-Fa-f0-9-]+)/g,
    // 内部标题链接 (heading)
    HEADING_PATTERN: /^\*+\s+(.+?)(?:\s+:[a-zA-Z0-9_@:]+:)?\s*$/gm,
    // 属性中的ID
    PROPERTY_ID: /:ID:\s+([A-Fa-f0-9-]+)/gm
  };

  /**
   * 提供定义跳转功能（用于Ctrl+Click和F12）
   */
  async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location | vscode.Location[] | undefined> {
    const linkInfo = this.findLinkAtPosition(document, position);
    if (!linkInfo) {
      return undefined;
    }

    const location = await this.resolveLinkTarget(document, linkInfo.linkTarget, position);
    return location || undefined;
  }

  /**
   * 在指定位置查找链接
   */
  private findLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): { linkTarget: string; range: vscode.Range } | null {
    const line = document.lineAt(position);
    const lineText = line.text;
    
    // 检查方括号链接 [[link][description]] 或 [[link]]
    const bracketRegex = /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g;
    let match;
    
    while ((match = bracketRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = match.index + match[0].length;
      
      if (position.character >= startCol && position.character <= endCol) {
        return { 
          linkTarget: match[1], 
          range: new vscode.Range(
            new vscode.Position(position.line, startCol),
            new vscode.Position(position.line, endCol)
          )
        };
      }
    }

    // 检查HTTP链接
    const httpRegex = /(https?:\/\/[^\s\]]+)/g;
    while ((match = httpRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = match.index + match[1].length;
      
      if (position.character >= startCol && position.character <= endCol) {
        return { 
          linkTarget: match[1], 
          range: new vscode.Range(
            new vscode.Position(position.line, startCol),
            new vscode.Position(position.line, endCol)
          )
        };
      }
    }

    // 检查文件链接
    const fileRegex = /file:([^\s\]]+)/g;
    while ((match = fileRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = match.index + match[0].length;
      
      if (position.character >= startCol && position.character <= endCol) {
        return { 
          linkTarget: match[0], 
          range: new vscode.Range(
            new vscode.Position(position.line, startCol),
            new vscode.Position(position.line, endCol)
          )
        };
      }
    }
    
    return null;
  }

  /**
   * 提供文档链接功能
   */
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // 处理方括号链接 [[link][description]] 或 [[link]]
    this.addBracketLinks(document, text, links);
    
    // 处理HTTP链接
    this.addHttpLinks(document, text, links);
    
    // 处理文件链接
    this.addFileLinks(document, text, links);

    return links;
  }

  /**
   * 添加方括号链接
   */
  private addBracketLinks(document: vscode.TextDocument, text: string, links: vscode.DocumentLink[]) {
    let match;
    const regex = new RegExp(OrgLinkProvider.LINK_PATTERNS.BRACKET_LINK);
    
    while ((match = regex.exec(text)) !== null) {
      const linkTarget = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      
      const uri = this.createUriFromLink(document, linkTarget);
      if (uri) {
        links.push(new vscode.DocumentLink(range, uri));
      }
    }
  }

  /**
   * 添加HTTP链接
   */
  private addHttpLinks(document: vscode.TextDocument, text: string, links: vscode.DocumentLink[]) {
    let match;
    const regex = new RegExp(OrgLinkProvider.LINK_PATTERNS.HTTP_LINK);
    
    while ((match = regex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      
      try {
        const uri = vscode.Uri.parse(match[1]);
        links.push(new vscode.DocumentLink(range, uri));
      } catch (error) {
        // 忽略无效的URI
      }
    }
  }

  /**
   * 添加文件链接
   */
  private addFileLinks(document: vscode.TextDocument, text: string, links: vscode.DocumentLink[]) {
    let match;
    const regex = new RegExp(OrgLinkProvider.LINK_PATTERNS.FILE_LINK);
    
    while ((match = regex.exec(text)) !== null) {
      const filePath = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      
      const uri = LinkUtils.resolveFilePath(document, filePath);
      if (uri) {
        links.push(new vscode.DocumentLink(range, uri));
      }
    }
  }

  /**
   * 从链接文本创建URI
   */
  private createUriFromLink(document: vscode.TextDocument, linkTarget: string): vscode.Uri | null {
    // 处理HTTP链接
    if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
      try {
        return vscode.Uri.parse(linkTarget);
      } catch (error) {
        return null;
      }
    }

    // 处理文件链接
    if (linkTarget.startsWith('file:')) {
      const filePath = linkTarget.substring(5); // 移除 'file:' 前缀
      return LinkUtils.resolveFilePath(document, filePath);
    }

    // 处理ID链接
    if (linkTarget.startsWith('id:')) {
      return null;
    }

    // 处理内部标题链接
    if (!linkTarget.includes('/') && !linkTarget.includes('\\')) {
      const location = LinkUtils.findHeadlineByTitle(document, linkTarget);
      if (location) {
        return vscode.Uri.parse(`${location.uri.toString()}#L${location.range.start.line + 1}`);
      }
      return null;
    }

    return null;
  }


  /**
   * 找到距离给定位置最近的标题
   */
  private findNearestHeadline(document: vscode.TextDocument, position: vscode.Position): vscode.Position | null {
    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i);
      if (line.text.match(/^\*+\s+/)) {
        return new vscode.Position(i, 0);
      }
    }
    return null;
  }

  /**
   * 解析链接目标
   */
  private async resolveLinkTarget(document: vscode.TextDocument, linkTarget: string, position: vscode.Position): Promise<vscode.Location | null> {
    try {
      // 处理HTTP/HTTPS 链接
      if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
        // 对于外部URL，返回null让默认处理器处理
        return null;
      }

      // 处理文件链接
      if (linkTarget.startsWith('file:')) {
        const filePath = linkTarget.substring(5); // 移除 'file:' 前缀
        const uri = LinkUtils.resolveFilePath(document, filePath);
        if (uri) {
          try {
            const targetDocument = await vscode.workspace.openTextDocument(uri);
            return new vscode.Location(uri, new vscode.Position(0, 0));
          } catch (error) {
            return null;
          }
        }
        return null;
      }

      // 处理ID链接
      if (linkTarget.startsWith('id:')) {
        const id = linkTarget.substring(3);
        const location = await LinkUtils.findHeadlineById(document, id);
        return location;
      }

      // 处理内部标题链接 [[*heading]] 格式（org-mode标准）
      if (linkTarget.startsWith('*')) {
        const headingText = linkTarget.substring(1);
        const location = LinkUtils.findHeadlineByTitle(document, headingText);
        return location;
      }

      return null;
    } catch (error) {
      Logger.error('Error resolving link target', error);
      return null;
    }
  }

} 