import * as vscode from 'vscode';

export class LinkCommands {
  
  /**
   * 注册链接相关命令
   */
  static registerCommands(context: vscode.ExtensionContext) {
    // 跟随链接命令
    const followLinkCommand = vscode.commands.registerCommand('vorg.followLink', () => {
      this.followLinkAtCursor();
    });

    // 插入链接命令
    const insertLinkCommand = vscode.commands.registerCommand('vorg.insertLink', () => {
      this.insertLink();
    });

    context.subscriptions.push(followLinkCommand, insertLinkCommand);
  }

  /**
   * 跟随光标处的链接
   */
  private static async followLinkAtCursor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    
    // 查找当前位置的链接
    const linkMatch = this.findLinkAtPosition(document, position);
    if (!linkMatch) {
      vscode.window.showInformationMessage('No link found at cursor position');
      return;
    }

    await this.processLinkTarget(document, linkMatch.linkTarget);
  }

  /**
   * 查找指定位置的链接
   */
  private static findLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): { linkTarget: string; range: vscode.Range } | null {
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
   * 处理链接目标
   */
  private static async processLinkTarget(document: vscode.TextDocument, linkTarget: string) {

    try {
      // HTTP/HTTPS 链接
      if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
        await vscode.env.openExternal(vscode.Uri.parse(linkTarget));
        return;
      }

      // 文件链接
      if (linkTarget.startsWith('file:')) {
        const filePath = linkTarget.substring(5);
        const uri = this.resolveFilePath(document, filePath);
        if (uri) {
          await vscode.window.showTextDocument(uri);
        }
        return;
      }

      // ID链接
      if (linkTarget.startsWith('id:')) {
        const id = linkTarget.substring(3);
        const location = await this.findHeadlineById(document, id);
        if (location) {
          await vscode.window.showTextDocument(location.uri, {
            selection: new vscode.Range(location.range.start, location.range.start)
          });
        } else {
          vscode.window.showWarningMessage(`Headline with ID "${id}" not found`);
        }
        return;
      }

      // 内部标题链接（仅支持 [[*heading]] 格式）
      if (linkTarget.startsWith('*')) {
        const headingText = linkTarget.substring(1);
        const location = this.findHeadlineByTitle(document, headingText);
        if (location) {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.uri.toString() === document.uri.toString()) {
            // 在同一文档中跳转
            editor.selection = new vscode.Selection(location.range.start, location.range.start);
            editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
          } else {
            await vscode.window.showTextDocument(location.uri, {
              selection: location.range
            });
          }
        } else {
          vscode.window.showWarningMessage(`Headline "${headingText}" not found`);
        }
      } else {
        vscode.window.showWarningMessage(`Invalid internal link format. Use [[*heading]] for internal links.`);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to follow link: ${error}`);
    }
  }

  /**
   * 插入链接
   */
  private static async insertLink() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    // 获取用户输入
    const linkType = await vscode.window.showQuickPick([
      { label: 'URL', description: 'Insert web link (http/https)' },
      { label: 'File', description: 'Link to file' },
      { label: 'Heading', description: 'Link to heading in current file' },
      { label: 'Custom', description: 'Custom link format' }
    ], {
      placeHolder: 'Select link type'
    });

    if (!linkType) {
      return;
    }

    let linkText = '';
    let description = '';

    switch (linkType.label) {
      case 'URL':
        const url = await vscode.window.showInputBox({
          prompt: 'Enter URL',
          placeHolder: 'https://example.com'
        });
        if (!url) return;
        
                 description = await vscode.window.showInputBox({
           prompt: 'Enter link description (optional)',
           placeHolder: 'Link description'
         }) || '';
         
         linkText = description ? `[[${url}][${description}]]` : `[[${url}]]`;
        break;

      case 'File':
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Select file'
        });
        
        if (!fileUri || fileUri.length === 0) return;
        
        const filePath = `file:${fileUri[0].fsPath}`;
                 description = await vscode.window.showInputBox({
           prompt: 'Enter link description (optional)',
           placeHolder: 'File description'
         }) || '';
         
         linkText = description ? `[[${filePath}][${description}]]` : `[[${filePath}]]`;
        break;

      case 'Heading':
        const headings = this.extractHeadings(editor.document);
        const selectedHeading = await vscode.window.showQuickPick(headings, {
          placeHolder: 'Select heading to link to'
        });
        
        if (!selectedHeading) return;
        
                 description = await vscode.window.showInputBox({
           prompt: 'Enter link description (optional)',
           placeHolder: selectedHeading.label
         }) || '';
         
         linkText = description ? `[[${selectedHeading.label}][${description}]]` : `[[${selectedHeading.label}]]`;
        break;

      case 'Custom':
        const customLink = await vscode.window.showInputBox({
          prompt: 'Enter link target',
          placeHolder: 'link-target'
        });
        if (!customLink) return;
        
                 description = await vscode.window.showInputBox({
           prompt: 'Enter link description (optional)',
           placeHolder: 'Link description'
         }) || '';
         
         linkText = description ? `[[${customLink}][${description}]]` : `[[${customLink}]]`;
        break;
    }

    if (linkText) {
      await editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, linkText);
      });
    }
  }

  /**
   * 提取文档中的标题
   */
  private static extractHeadings(document: vscode.TextDocument): Array<{ label: string; description: string }> {
    const headings: Array<{ label: string; description: string }> = [];
    const text = document.getText();
    const headingPattern = /^(\*+)\s+(.+?)(?:\s+:[a-zA-Z0-9_@:]+:)?\s*$/gm;
    let match;

    while ((match = headingPattern.exec(text)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const cleanTitle = title.replace(/^(TODO|DONE|NEXT|WAITING|CANCELLED)\s+/, '');
      
      headings.push({
        label: cleanTitle,
        description: `${'  '.repeat(level - 1)}${title}`
      });
    }

    return headings;
  }

  /**
   * 解析文件路径
   */
  private static resolveFilePath(document: vscode.TextDocument, filePath: string): vscode.Uri | null {
    try {
      const path = require('path');
      
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
   * 通过ID查找标题（支持跨文件搜索）
   */
  private static async findHeadlineById(document: vscode.TextDocument, id: string): Promise<vscode.Location | null> {
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
  private static async findIdInDocument(document: vscode.TextDocument, id: string): Promise<vscode.Location | null> {
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
   * 通过标题文本查找标题
   */
  private static findHeadlineByTitle(document: vscode.TextDocument, title: string): vscode.Location | null {
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