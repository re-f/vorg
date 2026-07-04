import * as vscode from 'vscode';
import { LinkUtils } from '../utils/linkUtils';
import { HeadingParser } from '../parsers/headingParser';
import { getConfigService } from '../services/configService';
import { LinkNavigationService } from '../services/linkNavigationService';

/**
 * 链接提供器
 *
 * 提供链接识别和跳转功能，实现 VS Code 的 DocumentLinkProvider 和 DefinitionProvider 接口。
 */
export class OrgLinkProvider implements vscode.DocumentLinkProvider, vscode.DefinitionProvider {
  constructor() { }

  private static readonly LINK_PATTERNS = {
    BRACKET_LINK: /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g,
    FILE_LINK: /file:([^\s\]]+)/g,
    HTTP_LINK: /(https?:\/\/[^\s\]]+)/g,
  };

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Location | vscode.Location[] | undefined> {
    const linkInfo = LinkNavigationService.findLinkAtPosition(document, position);
    if (!linkInfo) {
      return undefined;
    }

    const resolved = await LinkNavigationService.resolveLinkTarget(document, linkInfo.linkTarget);
    if (resolved.kind === 'heading') {
      return resolved.location;
    }
    if (resolved.kind === 'external-file') {
      return new vscode.Location(resolved.uri, new vscode.Position(0, 0));
    }
    return undefined;
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    this.addBracketLinks(document, text, links);
    this.addHttpLinks(document, text, links);
    this.addFileLinks(document, text, links);
    this.addTagLinks(document, links);

    return links;
  }

  async resolveDocumentLink(
    link: vscode.DocumentLink,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentLink> {
    if (token.isCancellationRequested || link.target) {
      return link;
    }

    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId !== 'org') {
        continue;
      }

      const linkTarget = this.extractBracketLinkTarget(editor.document, link.range);
      if (!linkTarget) {
        continue;
      }

      const resolved = await LinkNavigationService.resolveLinkTarget(editor.document, linkTarget);
      if (resolved.kind === 'heading') {
        link.target = LinkNavigationService.locationToDocumentUri(resolved.location);
      } else if (resolved.kind === 'external-file') {
        link.target = resolved.uri;
      } else if (resolved.kind === 'http') {
        link.target = vscode.Uri.parse(resolved.url);
      }
      break;
    }

    return link;
  }

  private extractBracketLinkTarget(document: vscode.TextDocument, range: vscode.Range): string | null {
    const text = document.getText(range);
    const match = text.match(/\[\[([^\]]+)\]/);
    return match ? match[1] : null;
  }

  private addTagLinks(document: vscode.TextDocument, links: vscode.DocumentLink[]) {
    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;

      if (HeadingParser.isHeadingLine(lineText, todoKeywords)) {
        const tagMatch = lineText.match(/:[^\s:]+(?::[^\s:]+)*:\s*$/);
        if (tagMatch) {
          const startCol = tagMatch.index!;
          const endCol = startCol + tagMatch[0].trim().length;
          const range = new vscode.Range(
            new vscode.Position(i, startCol),
            new vscode.Position(i, endCol)
          );

          const uri = vscode.Uri.parse('command:vorg.setTags');
          const docLink = new vscode.DocumentLink(range, uri);
          docLink.tooltip = 'Click to edit tags';
          links.push(docLink);
        }
      }
    }
  }

  private addBracketLinks(document: vscode.TextDocument, text: string, links: vscode.DocumentLink[]) {
    let match;
    const regex = new RegExp(OrgLinkProvider.LINK_PATTERNS.BRACKET_LINK);

    while ((match = regex.exec(text)) !== null) {
      const linkTarget = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      const uri = this.createUriFromLink(document, linkTarget);
      const docLink = new vscode.DocumentLink(range, uri ?? undefined);
      links.push(docLink);
    }
  }

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
      } catch {
        // 忽略无效的 URI
      }
    }
  }

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

  private createUriFromLink(document: vscode.TextDocument, linkTarget: string): vscode.Uri | null {
    if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
      try {
        return vscode.Uri.parse(linkTarget);
      } catch {
        return null;
      }
    }

    if (linkTarget.startsWith('file:')) {
      const filePath = linkTarget.substring(5).split('::')[0];
      return LinkUtils.resolveFilePath(document, filePath);
    }

    if (linkTarget.startsWith('id:')) {
      return null;
    }

    let headingText = linkTarget;
    if (linkTarget.startsWith('*')) {
      headingText = linkTarget.substring(1);
    }

    if (!headingText.includes('/') && !headingText.includes('\\')) {
      const location = LinkUtils.findHeadlineByTitle(document, headingText);
      if (location) {
        return LinkNavigationService.locationToDocumentUri(location);
      }
    }

    return null;
  }
}
