import * as vscode from 'vscode';
import { OrgSymbolIndexService, IndexedHeadingSymbol } from './orgSymbolIndexService';
import { PropertyParser } from '../parsers/propertyParser';
import { PropertyService } from './propertyService';
import { Logger } from '../utils/logger';
import {
  filterSymbolsByQuery,
  buildIdLinkText,
  toHeadingQuickPickItems
} from '../utils/linkInsertionUtils';

export type { IndexedHeadingSymbol };

export interface HeadingQuickPickItem extends vscode.QuickPickItem {
  symbol: IndexedHeadingSymbol;
}

export interface EnsureHeadingIdResult {
  id: string;
  needsInsert: boolean;
  edit?: vscode.WorkspaceEdit;
  targetDocument: vscode.TextDocument;
}

export { filterSymbolsByQuery, buildIdLinkText };

/**
 * 统一的本地标题链接插入服务
 */
export class LinkInsertionService {
  private static instance: LinkInsertionService | null = null;
  private indexService: OrgSymbolIndexService;

  private constructor() {
    this.indexService = OrgSymbolIndexService.getInstance();
  }

  static getInstance(): LinkInsertionService {
    if (!LinkInsertionService.instance) {
      LinkInsertionService.instance = new LinkInsertionService();
    }
    return LinkInsertionService.instance;
  }

  async getHeadingCandidates(query?: string): Promise<IndexedHeadingSymbol[]> {
    const allSymbols = await this.indexService.getAllSymbols();
    return filterSymbolsByQuery(allSymbols, query?.toLowerCase() || '');
  }

  toQuickPickItems(symbols: IndexedHeadingSymbol[]): HeadingQuickPickItem[] {
    return toHeadingQuickPickItems(symbols);
  }

  async peekHeadingId(symbol: IndexedHeadingSymbol): Promise<string> {
    try {
      const targetDocument = await vscode.workspace.openTextDocument(symbol.uri);
      const { id } = PropertyParser.getOrGenerateIdForHeading(targetDocument, symbol.line);
      return id;
    } catch (error) {
      Logger.warn(`[LinkInsertionService] 无法读取文件 ${symbol.uri.fsPath}，使用占位符 ID`);
      return 'PLACEHOLDER_ID';
    }
  }

  async ensureHeadingId(symbolUri: vscode.Uri, symbolLine: number): Promise<EnsureHeadingIdResult> {
    const targetDocument = await vscode.workspace.openTextDocument(symbolUri);
    const { id, needsInsert } = PropertyParser.getOrGenerateIdForHeading(targetDocument, symbolLine);

    let edit: vscode.WorkspaceEdit | undefined;
    if (needsInsert) {
      edit = PropertyService.prepareIdInsertionEdit(symbolUri, targetDocument, symbolLine, id);
    }

    return { id, needsInsert, edit, targetDocument };
  }

  buildIdLinkText(id: string, title: string, description?: string): string {
    return buildIdLinkText(id, title, description);
  }

  async applyIdInsertionToTarget(
    symbolUri: vscode.Uri,
    targetDocument: vscode.TextDocument,
    symbolLine: number,
    idToUse: string
  ): Promise<void> {
    const workspaceEdit = PropertyService.prepareIdInsertionEdit(
      symbolUri,
      targetDocument,
      symbolLine,
      idToUse
    );

    const success = await vscode.workspace.applyEdit(workspaceEdit);
    if (!success) {
      Logger.error('[LinkInsertionService] 应用 ID 插入编辑失败');
      return;
    }

    const targetEditor = vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.toString() === symbolUri.toString()
    );

    if (targetEditor) {
      await targetEditor.document.save();
    } else {
      const doc = await vscode.workspace.openTextDocument(symbolUri);
      await doc.save();
    }
  }
}
