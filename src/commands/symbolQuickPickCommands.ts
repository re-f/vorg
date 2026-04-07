import * as vscode from 'vscode';
import { getConfigService } from '../services/configService';
import { OrgSymbolIndexService } from '../services/orgSymbolIndexService';
import {
  buildDocumentSymbolQuickPickEntries,
  buildWorkspaceSymbolQuickPickEntries,
  filterQuickPickSymbolEntries,
  QuickPickSymbolEntry,
  QuickPickPresentationItem,
  toQuickPickPresentationItems,
} from '../services/symbolQuickPickService';
import { Logger } from '../utils/logger';

type SymbolQuickPickItem = vscode.QuickPickItem & QuickPickPresentationItem;

export class SymbolQuickPickCommands {
  static registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('vorg.goToSymbolInEditor', () => this.goToSymbolInEditor()),
      vscode.commands.registerCommand('vorg.goToSymbolInWorkspace', () => this.goToSymbolInWorkspace())
    );
  }

  private static async goToSymbolInEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      vscode.window.showInformationMessage('VOrg: 请先聚焦一个 org 文件编辑器。');
      return;
    }

    const config = getConfigService();
    const entries = buildDocumentSymbolQuickPickEntries(
      editor.document,
      editor.document.uri.toString(),
      config.getAllKeywordStrings()
    );

    if (entries.length === 0) {
      vscode.window.showInformationMessage('VOrg: 当前文件没有可跳转的标题。');
      return;
    }

    const selected = await this.showQuickPick(
      entries,
      'VOrg: Go to Heading in Editor',
      '输入标题、路径或拼音'
    );

    if (selected) {
      await this.revealEntry(selected, editor.viewColumn);
    }
  }

  private static async goToSymbolInWorkspace(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      vscode.window.showInformationMessage('VOrg: 请先聚焦一个 org 文件编辑器。');
      return;
    }

    try {
      const symbols = await OrgSymbolIndexService.getInstance().getAllSymbols();
      const entries = buildWorkspaceSymbolQuickPickEntries(
        symbols.map(symbol => ({
          uri: symbol.uri.toString(),
          line: symbol.line,
          level: symbol.level,
          title: symbol.text,
          displayName: symbol.displayName,
          relativePath: symbol.relativePath,
          pinyinText: symbol.pinyinText,
          pinyinDisplayName: symbol.pinyinDisplayName,
        }))
      );

      if (entries.length === 0) {
        vscode.window.showInformationMessage('VOrg: 工作区索引为空，请先等待索引完成或手动重建索引。');
        return;
      }

      const selected = await this.showQuickPick(
        entries,
        'VOrg: Go to Heading in Workspace',
        '输入标题、文件路径或拼音'
      );

      if (selected) {
        await this.revealEntry(selected);
      }
    } catch (error) {
      Logger.error('Workspace symbol quick pick failed', error);
      vscode.window.showWarningMessage('VOrg: 工作区索引不可用，无法打开工作区标题跳转。');
    }
  }

  private static async showQuickPick(
    entries: QuickPickSymbolEntry[],
    title: string,
    placeholder: string
  ): Promise<QuickPickSymbolEntry | undefined> {
    const quickPick = vscode.window.createQuickPick<SymbolQuickPickItem>();
    quickPick.title = title;
    quickPick.placeholder = placeholder;
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    const updateItems = (query: string) => {
      quickPick.items = toQuickPickPresentationItems(filterQuickPickSymbolEntries(entries, query));
      if (quickPick.items.length > 0) {
        quickPick.activeItems = [quickPick.items[0]];
      }
    };

    updateItems('');

    return await new Promise<QuickPickSymbolEntry | undefined>((resolve) => {
      let resolved = false;

      const finish = (value?: QuickPickSymbolEntry) => {
        if (resolved) {
          return;
        }
        resolved = true;
        quickPick.dispose();
        resolve(value);
      };

      quickPick.onDidChangeValue(value => {
        updateItems(value);
      });

      quickPick.onDidAccept(() => {
        finish((quickPick.selectedItems[0] || quickPick.activeItems[0])?.entry);
      });

      quickPick.onDidHide(() => {
        finish(undefined);
      });

      quickPick.show();
    });
  }

  private static async revealEntry(
    entry: QuickPickSymbolEntry,
    preferredViewColumn?: vscode.ViewColumn
  ): Promise<void> {
    const uri = vscode.Uri.parse(entry.uri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, preferredViewColumn);
    const position = new vscode.Position(entry.line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}
