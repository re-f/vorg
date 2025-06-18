import * as vscode from 'vscode';
import * as path from 'path';

export class OrgLinkProvider implements vscode.DefinitionProvider, vscode.DocumentLinkProvider {
  
  // 各种链接的正则表达式
  private static readonly LINK_PATTERNS = {
    // [[link][description]] 或 [[link]]
    BRACKET_LINK: /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g,
    // file:path/to/file
    FILE_LINK: /file:([^\s\]]+)/g,
    // http://example.com 或 https://example.com
    HTTP_LINK: /(https?:\/\/[^\s\]]+)/g,
    // id: links [[id:A4F1CD57-FE6E-478F-AACB-3660B4E68069][description]]
    ID_LINK: /id:([A-F0-9-]+)/g,
    // 内部标题链接 (heading)
    HEADING_PATTERN: /^\*+\s+(.+?)(?:\s+:[a-zA-Z0-9_@:]+:)?\s*$/gm,
    // 属性中的ID
    PROPERTY_ID: /:ID:\s+([A-F0-9-]+)/gm
  };

  /**
   * 提供定义跳转功能 (Ctrl+Click)
   */
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | null> {
    const line = document.lineAt(position);
    
    // 查找光标位置的链接
    const linkMatch = this.findLinkAtPosition(document, position);
    if (!linkMatch) {
      return null;
    }

    return this.resolveLinkTarget(document, linkMatch.linkTarget, linkMatch.range.start);
  }

  /**
   * 查找指定位置的链接
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
        const range = new vscode.Range(
          new vscode.Position(position.line, startCol),
          new vscode.Position(position.line, endCol)
        );
        return { linkTarget: match[1], range };
      }
    }
    
    // 检查HTTP链接
    const httpRegex = /(https?:\/\/[^\s\]]+)/g;
    while ((match = httpRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = match.index + match[0].length;
      
      if (position.character >= startCol && position.character <= endCol) {
        const range = new vscode.Range(
          new vscode.Position(position.line, startCol),
          new vscode.Position(position.line, endCol)
        );
        return { linkTarget: match[1], range };
      }
    }
    
    // 检查文件链接
    const fileRegex = /file:([^\s\]]+)/g;
    while ((match = fileRegex.exec(lineText)) !== null) {
      const startCol = match.index;
      const endCol = match.index + match[0].length;
      
      if (position.character >= startCol && position.character <= endCol) {
        const range = new vscode.Range(
          new vscode.Position(position.line, startCol),
          new vscode.Position(position.line, endCol)
        );
        return { linkTarget: match[0], range }; // 包含 'file:' 前缀
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
      
      const uri = this.resolveFilePath(document, filePath);
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
      return this.resolveFilePath(document, filePath);
    }

    // 处理ID链接
    if (linkTarget.startsWith('id:')) {
      const id = linkTarget.substring(3);
      // 对于DocumentLinkProvider，我们不能返回异步结果，所以只能返回null
      // 实际的跳转由DefinitionProvider处理
      return null;
    }

    // 处理内部标题链接
    if (!linkTarget.includes('/') && !linkTarget.includes('\\')) {
      return this.findHeadlineByTitle(document, linkTarget);
    }

    return null;
  }

  /**
   * 解析文件路径
   */
  private resolveFilePath(document: vscode.TextDocument, filePath: string): vscode.Uri | null {
    try {
      // 如果是绝对路径
      if (path.isAbsolute(filePath)) {
        return vscode.Uri.file(filePath);
      }

      // 相对于当前文档的路径
      const currentDir = path.dirname(document.uri.fsPath);
      const resolvedPath = path.resolve(currentDir, filePath);
      return vscode.Uri.file(resolvedPath);
    } catch (error) {
      return null;
    }
  }



  /**
   * 通过标题文本查找标题
   */
  private findHeadlineByTitle(document: vscode.TextDocument, title: string): vscode.Uri | null {
    const text = document.getText();
    const regex = new RegExp(OrgLinkProvider.LINK_PATTERNS.HEADING_PATTERN);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const headlineTitle = match[1].trim();
      // 移除状态关键字 (TODO, DONE, etc.)
      const cleanTitle = headlineTitle.replace(/^(TODO|DONE|NEXT|WAITING|CANCELLED)\s+/, '');
      
      if (cleanTitle === title || headlineTitle === title) {
        const position = document.positionAt(match.index);
        return vscode.Uri.parse(`${document.uri.toString()}#L${position.line + 1}`);
      }
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
        const uri = this.resolveFilePath(document, filePath);
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
        const location = await this.findHeadlineByIdLocation(document, id);
        return location;
      }

      // 处理内部标题链接 [[*heading]] 格式（org-mode标准）
      if (linkTarget.startsWith('*')) {
        const headingText = linkTarget.substring(1);
        const location = this.findHeadlineByTitleLocation(document, headingText);
        return location;
      }

      return null;
    } catch (error) {
      console.error('Error resolving link target:', error);
      return null;
    }
  }

  /**
   * 通过ID查找标题位置（支持跨文件搜索）
   */
  private async findHeadlineByIdLocation(document: vscode.TextDocument, id: string): Promise<vscode.Location | null> {
    // 首先在当前文档中查找
    const currentFileLocation = await this.findIdInDocument(document, id);
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
          const location = await this.findIdInDocument(fileDocument, id);
          if (location) {
            return location;
          }
        } catch (error) {
          // 忽略无法打开的文件
          console.warn(`Failed to open document ${fileUri.toString()}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to search for ID in workspace:', error);
    }

    return null;
  }

  /**
   * 在指定文档中查找ID
   */
  private async findIdInDocument(document: vscode.TextDocument, id: string): Promise<vscode.Location | null> {
    const text = document.getText();
    const idPattern = new RegExp(`:ID:\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gm');
    const match = idPattern.exec(text);
    
    if (!match) {
      return null;
    }

    const idPosition = document.positionAt(match.index);
    
    // 向上查找最近的标题
    for (let i = idPosition.line; i >= 0; i--) {
      const line = document.lineAt(i);
      if (line.text.match(/^\*+\s+/)) {
        return new vscode.Location(document.uri, new vscode.Position(i, 0));
      }
    }

    return null;
  }

  /**
   * 通过标题文本查找标题位置
   */
  private findHeadlineByTitleLocation(document: vscode.TextDocument, title: string): vscode.Location | null {
    const text = document.getText();
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 匹配标题行：以一个或多个*开头，后跟空格，然后是标题文本
      const headingMatch = line.match(/^(\*+)\s+(.+?)(?:\s+:[a-zA-Z0-9_@:]+:)?\s*$/);
      
      if (headingMatch) {
        let headlineTitle = headingMatch[2].trim();
        // 移除状态关键字 (TODO, DONE, etc.)
        const cleanTitle = headlineTitle.replace(/^(TODO|DONE|NEXT|WAITING|CANCELLED)\s+/, '');
        
        
        
        if (cleanTitle === title || headlineTitle === title) {
          return new vscode.Location(document.uri, new vscode.Position(i, 0));
        }
      }
    }

    return null;
  }
} 