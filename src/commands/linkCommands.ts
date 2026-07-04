/**
 * 链接命令处理模块
 * 
 * 提供 org-mode 链接的跳转和插入功能，支持文件链接、URL、ID 链接和内部标题链接。
 * 
 * @module commands/linkCommands
 */

import * as vscode from 'vscode';
import { LinkInsertionService, HeadingQuickPickItem } from '../services/linkInsertionService';
import { LinkNavigationService } from '../services/linkNavigationService';

/**
 * 链接命令处理类
 * 
 * 处理链接跳转和导航相关命令，实现链接的解析和导航功能。
 * 
 * 主要功能：
 * - 跟随链接：跳转到链接目标（文件、URL、ID、标题等）
 * - 插入链接：交互式插入各种类型的链接
 * 
 * @class LinkCommands
 */
export class LinkCommands {

  private static linkInsertionService = LinkInsertionService.getInstance();

  /**
   * 注册链接相关命令
   */
  static registerCommands(context: vscode.ExtensionContext) {
    const followLinkCommand = vscode.commands.registerCommand('vorg.followLink', () => {
      return this.followLinkAtCursor();
    });

    const insertLinkCommand = vscode.commands.registerCommand('vorg.insertLink', () => {
      return this.insertLink();
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

    const linkMatch = LinkNavigationService.findLinkAtPosition(document, position);
    if (!linkMatch) {
      vscode.window.showInformationMessage('No link found at cursor position');
      return;
    }

    const resolved = await LinkNavigationService.resolveLinkTarget(document, linkMatch.linkTarget);
    await LinkNavigationService.navigateToResolved(document, resolved);
  }

  /**
   * 插入链接
   */
  private static async insertLink() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const linkType = await vscode.window.showQuickPick([
      { label: 'URL', description: 'Insert web link (http/https)' },
      { label: 'File', description: 'Link to file' },
      { label: 'Heading', description: 'Link to heading across workspace' },
      { label: 'Custom', description: 'Custom link format' }
    ], {
      placeHolder: 'Select link type'
    });

    if (!linkType) {
      return;
    }

    let linkText = '';

    switch (linkType.label) {
      case 'URL': {
        const url = await vscode.window.showInputBox({
          prompt: 'Enter URL',
          placeHolder: 'https://example.com'
        });
        if (!url) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: 'Enter link description (optional)',
          placeHolder: 'Link description'
        }) || '';

        linkText = description ? `[[${url}][${description}]]` : `[[${url}]]`;
        break;
      }

      case 'File': {
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Select file'
        });

        if (!fileUri || fileUri.length === 0) {
          return;
        }

        const filePath = `file:${fileUri[0].fsPath}`;
        const description = await vscode.window.showInputBox({
          prompt: 'Enter link description (optional)',
          placeHolder: 'File description'
        }) || '';

        linkText = description ? `[[${filePath}][${description}]]` : `[[${filePath}]]`;
        break;
      }

      case 'Heading': {
        const headingLinkText = await this.insertHeadingLink(editor);
        if (!headingLinkText) {
          return;
        }
        linkText = headingLinkText;
        break;
      }

      case 'Custom': {
        const customLink = await vscode.window.showInputBox({
          prompt: 'Enter link target',
          placeHolder: 'link-target'
        });
        if (!customLink) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: 'Enter link description (optional)',
          placeHolder: 'Link description'
        }) || '';

        linkText = description ? `[[${customLink}][${description}]]` : `[[${customLink}]]`;
        break;
      }
    }

    if (linkText) {
      await editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, linkText);
      });
    }
  }

  /**
   * 通过统一插入服务生成跨文件 id: 标题链接
   */
  private static async insertHeadingLink(editor: vscode.TextEditor): Promise<string | undefined> {
    const candidates = await this.linkInsertionService.getHeadingCandidates();
    if (candidates.length === 0) {
      vscode.window.showInformationMessage('No headings found in workspace');
      return undefined;
    }

    const quickPickItems = this.linkInsertionService.toQuickPickItems(candidates);
    const selectedHeading = await vscode.window.showQuickPick<HeadingQuickPickItem>(quickPickItems, {
      placeHolder: 'Select heading to link to',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedHeading) {
      return undefined;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter link description (optional)',
      placeHolder: selectedHeading.symbol.text
    });

    if (description === undefined) {
      return undefined;
    }

    const { symbol } = selectedHeading;
    const { id, needsInsert, edit, targetDocument } = await this.linkInsertionService.ensureHeadingId(
      symbol.uri,
      symbol.line
    );

    const linkText = this.linkInsertionService.buildIdLinkText(
      id,
      symbol.text,
      description || undefined
    );

    const currentDocument = editor.document;
    const isSameDocument = currentDocument.uri.toString() === symbol.uri.toString();

    if (needsInsert && edit) {
      if (isSameDocument) {
        const success = await vscode.workspace.applyEdit(edit);
        if (!success) {
          vscode.window.showErrorMessage('Failed to insert ID property for heading link');
          return undefined;
        }
        await currentDocument.save();
      } else {
        await this.linkInsertionService.applyIdInsertionToTarget(
          symbol.uri,
          targetDocument,
          symbol.line,
          id
        );
      }
    }

    return linkText;
  }
}
