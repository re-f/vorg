import * as vscode from 'vscode';
import { LinkParser } from '../parsers/linkParser';
import { LinkUtils } from '../utils/linkUtils';
import { Logger } from '../utils/logger';

export type ResolvedLinkTarget =
  | { kind: 'http'; url: string }
  | { kind: 'external-file'; uri: vscode.Uri }
  | { kind: 'heading'; location: vscode.Location }
  | { kind: 'not-found'; message: string };

/**
 * 统一的链接导航服务
 *
 * 供 followLink、DefinitionProvider、DocumentLinkProvider 共用。
 */
export class LinkNavigationService {
  static findLinkAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { linkTarget: string; range: vscode.Range } | null {
    const line = document.lineAt(position);
    const lineText = line.text;
    const link = LinkParser.isPositionInLink(lineText, position.character);

    if (!link) {
      return null;
    }

    let linkTarget = link.target;
    if (link.type === 'file') {
      linkTarget = `file:${link.target}`;
    }

    return {
      linkTarget,
      range: new vscode.Range(
        new vscode.Position(position.line, link.startCol),
        new vscode.Position(position.line, link.endCol)
      )
    };
  }

  static getTargetViewColumnForIdLink(): vscode.ViewColumn | undefined {
    const activeColumn = vscode.window.activeTextEditor?.viewColumn;
    const otherEditor = vscode.window.visibleTextEditors.find(
      editor => editor.viewColumn !== undefined && editor.viewColumn !== activeColumn
    );
    return otherEditor?.viewColumn;
  }

  static async resolveLinkTarget(
    document: vscode.TextDocument,
    linkTarget: string
  ): Promise<ResolvedLinkTarget> {
    try {
      if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
        return { kind: 'http', url: linkTarget };
      }

      if (linkTarget.startsWith('id:')) {
        const id = linkTarget.substring(3);
        const location = await LinkUtils.findHeadlineById(document, id);
        if (location) {
          return { kind: 'heading', location };
        }
        return { kind: 'not-found', message: `Headline with ID "${id}" not found` };
      }

      if (linkTarget.startsWith('file:')) {
        return this.resolveFileLinkTarget(document, linkTarget);
      }

      let headingText = linkTarget;
      if (linkTarget.startsWith('*')) {
        headingText = linkTarget.substring(1);
      }

      let location = LinkUtils.findHeadlineByTitle(document, headingText);
      if (!location && !linkTarget.startsWith('*')) {
        location = await LinkUtils.findHeadlineById(document, linkTarget);
      }

      if (location) {
        return { kind: 'heading', location };
      }

      return { kind: 'not-found', message: `Headline or ID "${linkTarget}" not found` };
    } catch (error) {
      Logger.error('Error resolving link target', error);
      return { kind: 'not-found', message: `Failed to resolve link: ${error}` };
    }
  }

  private static async resolveFileLinkTarget(
    document: vscode.TextDocument,
    linkTarget: string
  ): Promise<ResolvedLinkTarget> {
    const pathWithAnchor = linkTarget.substring(5);

    if (pathWithAnchor.includes('::')) {
      const parts = pathWithAnchor.split('::');
      const filePath = parts[0];
      const anchor = parts[1];
      const uri = LinkUtils.resolveFilePath(document, filePath);

      if (!uri) {
        return { kind: 'not-found', message: `File not found: ${filePath}` };
      }

      try {
        const targetDocument = await vscode.workspace.openTextDocument(uri);

        if (anchor.startsWith('*')) {
          const location = LinkUtils.findHeadlineByTitle(targetDocument, anchor.substring(1));
          if (location) {
            return { kind: 'heading', location };
          }
        } else if (anchor.startsWith('#')) {
          const location = LinkUtils.findIdInDocument(targetDocument, anchor.substring(1));
          if (location) {
            return { kind: 'heading', location };
          }
        } else if (/^\d+$/.test(anchor)) {
          const lineNumber = Math.max(0, parseInt(anchor, 10) - 1);
          return {
            kind: 'heading',
            location: new vscode.Location(uri, new vscode.Position(lineNumber, 0))
          };
        } else {
          const location = LinkUtils.findHeadlineByTitle(targetDocument, anchor);
          if (location) {
            return { kind: 'heading', location };
          }
        }

        return { kind: 'external-file', uri };
      } catch {
        return { kind: 'not-found', message: `Unable to open file: ${filePath}` };
      }
    }

    const uri = LinkUtils.resolveFilePath(document, pathWithAnchor);
    if (!uri) {
      return { kind: 'not-found', message: `File not found: ${pathWithAnchor}` };
    }

    return { kind: 'external-file', uri };
  }

  static async navigateToResolved(
    sourceDocument: vscode.TextDocument,
    resolved: ResolvedLinkTarget
  ): Promise<boolean> {
    switch (resolved.kind) {
      case 'http':
        await vscode.env.openExternal(vscode.Uri.parse(resolved.url));
        return true;

      case 'external-file':
        await vscode.window.showTextDocument(resolved.uri);
        return true;

      case 'heading': {
        const location = resolved.location;
        const editor = vscode.window.activeTextEditor;

        if (editor && editor.document.uri.toString() === location.uri.toString()) {
          editor.selection = new vscode.Selection(location.range.start, location.range.start);
          editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
          return true;
        }

        const targetViewColumn = this.getTargetViewColumnForIdLink();
        await vscode.window.showTextDocument(location.uri, {
          viewColumn: targetViewColumn ?? vscode.ViewColumn.Beside,
          selection: new vscode.Range(location.range.start, location.range.start)
        });
        return true;
      }

      case 'not-found':
        vscode.window.showWarningMessage(resolved.message);
        return false;
    }
  }

  static locationToDocumentUri(location: vscode.Location): vscode.Uri {
    return vscode.Uri.parse(`${location.uri.toString()}#L${location.range.start.line + 1}`);
  }
}
