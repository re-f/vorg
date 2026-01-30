import * as vscode from 'vscode';
import { HeadingParser } from '../parsers/headingParser';
import { HeadingSymbolUtils } from '../utils/headingSymbolUtils';
import { Logger } from '../utils/logger';
import { getPinyinString } from '../utils/pinyinUtils';
import { getConfigService } from './configService';

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
 * 使用内存缓存 + FileWatcher 机制，确保高性能和实时更新。
 * 
 * 功能包括：
 * - 自动索引工作区中的所有 .org 文件
 * - 实时监听文件变化并更新索引
 * - 提供快速的标题搜索功能
 * - 供多个功能模块共享使用（符号导航、链接插入等）
 * 
 * @class OrgSymbolIndexService
 */
export class OrgSymbolIndexService implements vscode.Disposable {
  private static instance: OrgSymbolIndexService | null = null;

  /** 符号索引缓存：文件路径 -> 标题符号列表 */
  private symbolCache = new Map<string, IndexedHeadingSymbol[]>();

  /** 文件监听器 */
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  /** 是否已初始化索引 */
  private isIndexed = false;

  /** 索引任务的 Promise，用于避免重复索引 */
  private indexingPromise: Promise<void> | null = null;

  private constructor() {
    this.setupFileWatcher();
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
   * 设置文件监听器
   * 
   * 监听 .org 文件的创建、修改和删除，自动更新索引
   */
  private setupFileWatcher(): void {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.org');

    // 文件创建时，索引该文件
    this.fileWatcher.onDidCreate(uri => {
      this.indexFile(uri).catch(error => {
        Logger.error(`索引文件失败 ${uri.fsPath}`, error);
      });
    });

    // 文件修改时，重新索引该文件
    this.fileWatcher.onDidChange(uri => {
      this.indexFile(uri).catch(error => {
        Logger.error(`重新索引文件失败 ${uri.fsPath}`, error);
      });
    });

    // 文件删除时，从缓存中移除
    this.fileWatcher.onDidDelete(uri => {
      this.removeFromCache(uri);
    });
  }

  /**
   * 确保索引已构建
   * 
   * 如果尚未索引，会自动构建；否则直接返回
   */
  async ensureIndexed(): Promise<void> {
    if (this.isIndexed) {
      return;
    }
    await this.buildIndex();
  }

  /**
   * 构建完整的工作区索引
   * 
   * 扫描所有 .org 文件并建立符号索引
   */
  private async buildIndex(): Promise<void> {
    // 如果已经在索引中，返回现有的 Promise
    if (this.indexingPromise) {
      return this.indexingPromise;
    }

    this.indexingPromise = (async () => {
      try {
        Logger.info('[OrgSymbolIndex] 开始构建索引...');
        const startTime = Date.now();

        // 查找所有 .org 文件
        const orgFiles = await vscode.workspace.findFiles('**/*.org', null, 10000);

        Logger.info(`[OrgSymbolIndex] 找到 ${orgFiles.length} 个 .org 文件`);

        // 并行索引所有文件
        await Promise.all(orgFiles.map(uri => this.indexFile(uri)));

        this.isIndexed = true;

        const duration = Date.now() - startTime;
        const totalSymbols = this.getTotalSymbolCount();
        Logger.info(`[OrgSymbolIndex] 索引构建完成，耗时 ${duration}ms，共 ${totalSymbols} 个标题`);
      } finally {
        this.indexingPromise = null;
      }
    })();

    return this.indexingPromise;
  }

  /**
   * 索引单个文件
   * 
   * @param uri - 文件 URI
   */
  private async indexFile(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const symbols = this.extractSymbolsFromDocument(document);

      // 更新缓存
      this.symbolCache.set(uri.toString(), symbols);
    } catch (error) {
      Logger.warn(`[OrgSymbolIndex] 无法索引文件 ${uri.fsPath}`);
      Logger.error(`[OrgSymbolIndex] 索引错误详情`, error);
    }
  }

  /**
   * 从文档中提取符号
   * 
   * @param document - 文档对象
   * @returns 符号信息数组
   */
  private extractSymbolsFromDocument(document: vscode.TextDocument): IndexedHeadingSymbol[] {
    const symbols: IndexedHeadingSymbol[] = [];
    const lines = document.getText().split('\n');
    const uri = document.uri;
    const relativePath = this.getRelativePath(uri);

    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 解析标题（包含标签解析）
      const headingInfo = HeadingParser.parseHeading(line, true, todoKeywords);

      if (headingInfo.level > 0) {
        const text = headingInfo.text || headingInfo.title;
        const tags = headingInfo.tags || [];
        const todoKeyword = headingInfo.todoKeyword;

        // 构建显示名称
        const displayName = HeadingParser.buildDisplayName(text, todoKeyword, tags);

        // 计算拼音（用于拼音搜索）
        const pinyinText = getPinyinString(text);
        const pinyinDisplayName = getPinyinString(displayName);

        // 确定符号类型
        const symbolKind = HeadingSymbolUtils.getSymbolKind(headingInfo.level);

        symbols.push({
          displayName,
          text,
          pinyinText,
          pinyinDisplayName,
          level: headingInfo.level,
          todoKeyword,
          tags,
          uri,
          line: i,
          symbolKind,
          relativePath
        });
      }
    }

    return symbols;
  }

  /**
   * 从缓存中移除文件
   * 
   * @param uri - 文件 URI
   */
  private removeFromCache(uri: vscode.Uri): void {
    this.symbolCache.delete(uri.toString());
  }

  /**
   * 搜索标题符号
   * 
   * 支持模糊匹配和多关键词搜索
   * 
   * @param query - 搜索查询字符串（可选，为空则返回所有）
   * @param options - 搜索选项
   * @returns 匹配的符号数组
   */
  async searchSymbols(
    query?: string,
    options?: {
      /** 最大结果数 */
      maxResults?: number;
      /** 取消令牌 */
      token?: vscode.CancellationToken;
    }
  ): Promise<IndexedHeadingSymbol[]> {
    // 确保索引已构建
    await this.ensureIndexed();

    // 检查缓存中的符号是否包含拼音字段（兼容旧版本缓存）
    // 如果发现缺少拼音字段，重建索引
    if (this.symbolCache.size > 0) {
      const firstSymbols = this.symbolCache.values().next().value;
      if (firstSymbols && firstSymbols.length > 0) {
        const firstSymbol = firstSymbols[0];
        // 检查是否缺少拼音字段（旧版本缓存）
        if (firstSymbol.pinyinText === undefined || firstSymbol.pinyinDisplayName === undefined) {
          Logger.info('[OrgSymbolIndex] 检测到旧版本缓存，重建索引以支持拼音搜索...');
          await this.rebuildIndex();
        } else if (query && query.length > 0) {
          // 调试：检查拼音匹配（仅当有查询时）
          const testSymbol = firstSymbols.find((s: IndexedHeadingSymbol) =>
            s.pinyinText && s.pinyinText.length > 0
          );
          if (testSymbol) {
            const lowerQuery = query.toLowerCase();
            const lowerPinyinText = (testSymbol.pinyinText || '').toLowerCase();
            const lowerPinyinDisplayName = (testSymbol.pinyinDisplayName || '').toLowerCase();
            const matches = lowerPinyinText.includes(lowerQuery) || lowerPinyinDisplayName.includes(lowerQuery);
            Logger.info(`[OrgSymbolIndex] 搜索测试: 查询="${query}", 示例符号="${testSymbol.text}", 拼音="${testSymbol.pinyinText}", 匹配=${matches}`);
          }
        }
      }
    }

    const results: IndexedHeadingSymbol[] = [];
    const maxResults = options?.maxResults || Number.MAX_SAFE_INTEGER;

    // 遍历所有缓存的符号
    for (const symbols of this.symbolCache.values()) {
      if (options?.token?.isCancellationRequested) {
        break;
      }

      for (const symbol of symbols) {
        // 如果达到最大结果数，退出
        if (results.length >= maxResults) {
          return results;
        }

        // 如果没有查询或符号匹配查询，添加到结果
        if (!query || this.matchesQuery(symbol, query)) {
          results.push(symbol);
        }
      }
    }

    return results;
  }

  /**
   * 获取指定文件的所有标题符号
   * 
   * @param uri - 文件 URI
   * @returns 符号数组，如果文件未索引则返回空数组
   */
  async getSymbolsForFile(uri: vscode.Uri): Promise<IndexedHeadingSymbol[]> {
    await this.ensureIndexed();
    return this.symbolCache.get(uri.toString()) || [];
  }

  /**
   * 获取所有已索引的标题符号
   * 
   * @returns 所有符号数组
   */
  async getAllSymbols(): Promise<IndexedHeadingSymbol[]> {
    await this.ensureIndexed();

    // 检查缓存中的符号是否包含拼音字段（兼容旧版本缓存）
    if (this.symbolCache.size > 0) {
      const firstSymbols = this.symbolCache.values().next().value;
      if (firstSymbols && firstSymbols.length > 0) {
        const firstSymbol = firstSymbols[0];
        // 检查是否缺少拼音字段（旧版本缓存）
        if (firstSymbol.pinyinText === undefined || firstSymbol.pinyinDisplayName === undefined) {
          Logger.info('[OrgSymbolIndex] 检测到旧版本缓存，重建索引以支持拼音搜索...');
          await this.rebuildIndex();
        }
      }
    }

    const allSymbols: IndexedHeadingSymbol[] = [];
    for (const symbols of this.symbolCache.values()) {
      allSymbols.push(...symbols);
    }
    return allSymbols;
  }

  /**
   * 检查符号是否匹配查询
   * 
   * 支持不区分大小写的模糊匹配、多关键词搜索和拼音搜索
   * - 字符串直接匹配（原有功能）：匹配 text 和 displayName
   * - 拼音匹配：匹配缓存的拼音字段（全拼和首字母）
   */
  private matchesQuery(symbol: IndexedHeadingSymbol, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const lowerText = symbol.text.toLowerCase();
    const lowerDisplayName = symbol.displayName.toLowerCase();

    // 简单包含匹配（原有功能，优先检查）
    if (lowerText.includes(lowerQuery) || lowerDisplayName.includes(lowerQuery)) {
      return true;
    }

    // 拼音匹配（如果查询文本匹配拼音字段）
    // 安全检查：确保拼音字段存在且不为空
    const pinyinText = symbol.pinyinText || '';
    const pinyinDisplayName = symbol.pinyinDisplayName || '';
    if (pinyinText || pinyinDisplayName) {
      const lowerPinyinText = pinyinText.toLowerCase();
      const lowerPinyinDisplayName = pinyinDisplayName.toLowerCase();

      // 拼音字段格式是 "全拼 首字母"，例如 "ceshi cs" 或 "gongzuojilu gzjl"
      // 需要检查查询是否匹配全拼或首字母部分
      // 例如："gz" 应该匹配 "gongzuojilu gzjl" 中的 "gzjl" 部分
      if (lowerPinyinText.includes(lowerQuery) || lowerPinyinDisplayName.includes(lowerQuery)) {
        Logger.info(`[拼音匹配成功] 查询: "${query}" 匹配符号: "${symbol.text}", 拼音: "${pinyinText}"`);
        return true;
      }
    }

    // 支持空格分隔的多个关键词匹配
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length > 1) {
      // 每个关键词都要匹配（可以是文本匹配或拼音匹配）
      return queryWords.every(word => {
        if (lowerText.includes(word) || lowerDisplayName.includes(word)) {
          return true;
        }
        // 如果拼音字段存在，也检查拼音匹配
        if (pinyinText || pinyinDisplayName) {
          const lowerPinyinText = pinyinText.toLowerCase();
          const lowerPinyinDisplayName = pinyinDisplayName.toLowerCase();
          if (lowerPinyinText.includes(word) || lowerPinyinDisplayName.includes(word)) {
            return true;
          }
        }
        return false;
      });
    }

    return false;
  }

  /**
   * 获取相对于工作区的文件路径
   */
  private getRelativePath(uri: vscode.Uri): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return uri.fsPath;
    }

    // 使用第一个工作区文件夹作为基准
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const filePath = uri.fsPath;

    if (filePath.startsWith(workspaceRoot)) {
      return filePath.substring(workspaceRoot.length + 1); // +1 是为了去掉路径分隔符
    }

    return uri.fsPath;
  }

  /**
   * 获取索引的统计信息
   */
  getStats(): { fileCount: number; symbolCount: number; isIndexed: boolean } {
    return {
      fileCount: this.symbolCache.size,
      symbolCount: this.getTotalSymbolCount(),
      isIndexed: this.isIndexed
    };
  }

  /**
   * 获取总符号数量
   */
  private getTotalSymbolCount(): number {
    let count = 0;
    for (const symbols of this.symbolCache.values()) {
      count += symbols.length;
    }
    return count;
  }

  /**
   * 强制重建索引
   * 
   * 清空缓存并重新扫描所有文件
   */
  async rebuildIndex(): Promise<void> {
    this.symbolCache.clear();
    this.isIndexed = false;
    await this.buildIndex();
  }

  /**
   * 清理资源
   * 
   * 释放文件监听器和清空缓存
   */
  dispose(): void {
    // 释放文件监听器
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }

    // 清空缓存
    this.symbolCache.clear();
    this.isIndexed = false;

    // 清空单例
    OrgSymbolIndexService.instance = null;
  }
}

