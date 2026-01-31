import * as vscode from 'vscode';
import { HeadingParser } from '../parsers/headingParser';
import { HeadingSymbolUtils } from '../utils/headingSymbolUtils';
import { Logger } from '../utils/logger';
import { DatabaseConnection } from '../database/connection';
import { HeadingRepository } from '../database/headingRepository';
import { OrgHeading } from '../database/types';

/**
 * 标题符号信息
 * 
 * 存储在索引中的标题信息，用于快速搜索和导航
 */
export interface IndexedHeadingSymbol {
  /** 标题显示名称（包含 TODO 状态和标签） */
  displayName: string;
  /** 纯净的标题文本（不含 TODO 状态和标签） */
  text: string;
  /** 标题的拼音字符串（全拼和首字母，用于拼音搜索） */
  pinyinText: string;
  /** 显示名称的拼音字符串（用于拼音搜索） */
  pinyinDisplayName: string;
  /** 标题层级 */
  level: number;
  /** TODO 状态 */
  todoKeyword: string | null;
  /** 标签 */
  tags: string[];
  /** 所在文件的 URI */
  uri: vscode.Uri;
  /** 所在行号 */
  line: number;
  /** 符号类型（用于显示图标） */
  symbolKind: vscode.SymbolKind;
  /** 相对于工作区的文件路径 */
  relativePath: string;
}

/**
 * Org-mode 符号索引服务
 * 
 * 提供工作区级别的 Org-mode 标题索引和搜索功能。
 * 现已重构为基于 SQLite 数据库的持久化索引，内存缓存已被移除。
 * 
 * 功能包括：
 * - 提供快速的标题搜索功能（支持拼音）
 * - 供多个功能模块共享使用（符号导航、链接插入等）
 * 
 * @class OrgSymbolIndexService
 */
export class OrgSymbolIndexService implements vscode.Disposable {
  private static instance: OrgSymbolIndexService | null = null;

  private constructor() {
    // 构造函数现在不执行任何操作，因为生命周期由 IncrementalUpdateService 管理
  }

  /**
   * 获取服务单例
   */
  static getInstance(): OrgSymbolIndexService {
    if (!OrgSymbolIndexService.instance) {
      OrgSymbolIndexService.instance = new OrgSymbolIndexService();
    }
    return OrgSymbolIndexService.instance;
  }

  /**
   * 确保索引已构建 (Legacy)
   * 
   * 现在是一个空操作，因为 IncrementalUpdateService 在扩展激活时会自动启动索引
   */
  async ensureIndexed(): Promise<void> {
    // No-op
  }

  /**
   * 从 OrgHeading 映射到 IndexedHeadingSymbol
   */
  private mapHeadingToSymbol(heading: OrgHeading): IndexedHeadingSymbol {
    const uri = vscode.Uri.file(heading.fileUri);
    const displayName = HeadingParser.buildDisplayName(heading.title, heading.todoState, heading.tags);

    return {
      displayName,
      text: heading.title,
      pinyinText: heading.pinyinTitle || '',
      pinyinDisplayName: heading.pinyinDisplayName || '',
      level: heading.level,
      todoKeyword: heading.todoState || null,
      tags: heading.tags,
      uri: uri,
      line: heading.startLine,
      symbolKind: HeadingSymbolUtils.getSymbolKind(heading.level),
      relativePath: this.getRelativePath(uri)
    };
  }

  /**
   * 搜索标题符号
   * 
   * 支持模糊匹配和多关键词搜索（基于数据库 LIKE 查询）
   * 
   * @param query - 搜索查询字符串
   * @param options - 搜索选项
   * @returns 匹配的符号数组
   */
  async searchSymbols(
    query?: string,
    options?: {
      maxResults?: number;
      token?: vscode.CancellationToken;
    }
  ): Promise<IndexedHeadingSymbol[]> {
    const db = DatabaseConnection.getInstance().getDatabase();
    if (!db) {
      Logger.warn('[OrgSymbolIndex] 数据库未连接，无法搜索符号');
      return [];
    }

    const repo = new HeadingRepository(db);
    const maxResults = options?.maxResults || 100;

    let headings: OrgHeading[];
    if (!query) {
      headings = repo.findAll();
    } else {
      headings = repo.search(query, maxResults);
    }

    return headings.map(h => this.mapHeadingToSymbol(h));
  }

  /**
   * 获取指定文件的所有标题符号
   */
  async getSymbolsForFile(uri: vscode.Uri): Promise<IndexedHeadingSymbol[]> {
    const db = DatabaseConnection.getInstance().getDatabase();
    if (!db) {
      return [];
    }

    const repo = new HeadingRepository(db);
    const headings = repo.findByFileUri(uri.fsPath);
    return headings.map(h => this.mapHeadingToSymbol(h));
  }

  /**
   * 获取所有已索引的标题符号
   */
  async getAllSymbols(): Promise<IndexedHeadingSymbol[]> {
    const db = DatabaseConnection.getInstance().getDatabase();
    if (!db) {
      return [];
    }

    const repo = new HeadingRepository(db);
    const headings = repo.findAll();
    return headings.map(h => this.mapHeadingToSymbol(h));
  }

  /**
   * 获取相对于工作区的文件路径
   */
  private getRelativePath(uri: vscode.Uri): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return uri.fsPath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const filePath = uri.fsPath;

    if (filePath.startsWith(workspaceRoot)) {
      return filePath.substring(workspaceRoot.length + 1);
    }

    return uri.fsPath;
  }

  /**
   * 获取所有唯一的标签及其出现次数
   */
  getAllTags(): Map<string, number> {
    const db = DatabaseConnection.getInstance().getDatabase();
    if (!db) {
      return new Map();
    }

    const repo = new HeadingRepository(db);
    return repo.getAllTags();
  }

  /**
   * 获取索引的统计信息
   */
  getStats(): { fileCount: number; symbolCount: number; isIndexed: boolean } {
    const db = DatabaseConnection.getInstance().getDatabase();
    if (!db) {
      return { fileCount: 0, symbolCount: 0, isIndexed: false };
    }

    const stmt = db.prepare('SELECT COUNT(DISTINCT file_uri) as fileCount, COUNT(*) as symbolCount FROM headings');
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        fileCount: (row.fileCount as number) || 0,
        symbolCount: (row.symbolCount as number) || 0,
        isIndexed: true
      };
    }
    stmt.free();
    return { fileCount: 0, symbolCount: 0, isIndexed: false };
  }

  /**
   * 强制重建索引 (Legacy)
   * 现在由 IncrementalUpdateService 管理
   */
  async rebuildIndex(): Promise<void> {
    // IncrementalUpdateService should handle this
    Logger.info('[OrgSymbolIndex] rebuildIndex 应当调用 IncrementalUpdateService 的全量索引');
  }

  dispose(): void {
    OrgSymbolIndexService.instance = null;
  }
}
