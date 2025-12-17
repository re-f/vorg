/**
 * Org-mode ID 链接自动补全提供器
 * 
 * ## 核心逻辑
 * 
 * 当用户输入 `[[` 时，提供 ID 链接的自动补全功能。补全格式为 `[[id:UUID][标题]]`。
 * 
 * ## 输入状态识别
 * 
 * 系统识别三种输入状态：
 * 1. **EMPTY**: 用户只输入了 `[[`，没有其他内容
 * 2. **ID_PREFIX**: 用户输入了 `[[id:`，准备输入 ID
 * 3. **OTHER_CONTENT**: 用户输入了 `[[` 后跟其他非 `id:` 开头的文本（如 `[[file:` 或 `[[haasdf`）
 *    - 注意：只处理 `id:` 链接，其他类型（如 `file:`）不触发补全
 * 
 * ## 处理流程
 * 
 * 1. **解析输入** (`parseLinkInput`)
 *    - 匹配 `[[` 模式
 *    - 判断输入状态（EMPTY / ID_PREFIX / OTHER_CONTENT）
 *    - 提取查询文本（去除 `id:` 前缀，用于过滤标题）
 * 
 * 2. **获取符号** (`provideCompletionItems`)
 *    - 从索引服务获取所有 headline 符号
 *    - 根据查询文本过滤符号（如果用户输入了部分标题）
 * 
 * 3. **生成补全项** (`createCompletionItem`)
 *    - 为每个匹配的符号创建补全项
 *    - 获取或生成标题的 ID（如果不存在则生成占位符）
 *    - 根据输入状态生成不同的补全文本：
 *      * `[[id:` → 插入 `UUID][标题`
 *      * `[[` → 插入 `id:UUID][标题`（如果后面有文本则包含 `]]`）
 *    - 计算替换范围（从 `[[` 或 `:` 之后到光标位置）
 *    - 设置命令，在用户选择时检查并插入 ID 到目标文档
 * 
 * ## 补全文本生成规则
 * 
 * - **情况 1**: 用户输入 `[[id:`
 *   - 替换范围：从 `:` 之后到光标位置
 *   - 插入文本：`UUID][标题`
 *   - 结果：`[[id:UUID][标题]]`
 * 
 * - **情况 2**: 用户输入 `[[`（后面没有其他文本）
 *   - 替换范围：从第二个 `[` 之后到光标位置
 *   - 插入文本：`id:UUID][标题`
 *   - 结果：`[[id:UUID][标题]]`（命令执行后自动添加 `]]`）
 * 
 * - **情况 3**: 用户输入 `[[` 后还有其他文本（如 `[[haasdf`）
 *   - 替换范围：从第二个 `[` 之后到光标位置
 *   - 插入文本：`id:UUID][标题]]`
 *   - 结果：`[[id:UUID][标题]]` + 保留后面的文本
 *   - 注意：包含 `]]` 是为了避免 VS Code 自动闭合时包含后面的文本
 * 
 * ## ID 处理
 * 
 * - 如果标题已有 ID，直接使用
 * - 如果标题没有 ID，生成占位符 `PLACEHOLDER_ID`
 * - 用户选择补全项时，通过命令 `vorg.generateAndInsertIdForCompletion` 检查并插入真实 ID
 * 
 * @module orgCompletionProvider
 */

import * as vscode from 'vscode';
import { OrgSymbolIndexService, IndexedHeadingSymbol } from '../services/orgSymbolIndexService';
import { PropertyParser } from '../parsers/propertyParser';
import { Logger } from '../utils/logger';

/**
 * 链接输入状态
 */
enum LinkInputState {
  /** 用户只输入了 [[，没有其他内容 */
  EMPTY = 'empty',
  /** 用户输入了 [[id:，准备输入 ID */
  ID_PREFIX = 'id_prefix',
  /** 用户输入了 [[ 后跟其他非 id: 开头的文本（如 [[file: 或 [[haasdf） */
  OTHER_CONTENT = 'other_content'
}

/**
 * 链接输入信息
 */
interface LinkInputInfo {
  /** 输入状态 */
  state: LinkInputState;
  /** [[ 之后的内容（不包含 [[） */
  linkContent: string;
  /** 查询文本（用于过滤标题，已去除 id: 前缀） */
  query: string;
  /** [[ 在行中的位置 */
  bracketIndex: number;
}

/**
 * Org-mode 自动补全提供器
 * 
 * 提供 ID 链接的自动补全功能，当用户输入 [[ 时：
 * - 检测是否为 id: 链接（如 [[id: 或 [[）
 * - 显示所有可用的 headline
 * - 如果 headline 没有 ID 属性，在用户选择时自动生成并插入
 * - 插入格式为 [[id:UUID][标题]]
 */
export class OrgCompletionProvider implements vscode.CompletionItemProvider {
  private indexService: OrgSymbolIndexService;

  constructor() {
    this.indexService = OrgSymbolIndexService.getInstance();
  }

  /**
   * 解析用户输入的链接状态
   * 
   * @param textBeforeCursor - 光标前的文本
   * @returns 链接输入信息，如果不匹配则返回 undefined
   */
  private parseLinkInput(textBeforeCursor: string): LinkInputInfo | undefined {
    // 匹配 [[ 模式
    const bracketMatch = textBeforeCursor.match(/\[\[([^\]]*)$/);
    if (!bracketMatch) {
      return undefined;
    }

    const linkContent = bracketMatch[1] || '';
    const bracketIndex = textBeforeCursor.lastIndexOf('[[') + 2;

    // 判断输入状态
    let state: LinkInputState;
    let query = '';

    if (linkContent.startsWith('id:')) {
      // 用户输入了 [[id:，提取 id: 后面的查询内容
      state = LinkInputState.ID_PREFIX;
      query = linkContent.substring(3).trim().toLowerCase();
    } else if (linkContent === '') {
      // 用户只输入了 [[
      state = LinkInputState.EMPTY;
      query = '';
    } else if (linkContent.startsWith('file:') || linkContent.startsWith('http')) {
      // 用户输入了其他类型的链接（如 [[file: 或 [[http），不处理
      return undefined;
    } else {
      // 用户输入了 [[ 后直接输入文本（如 [[lqd），将其作为查询文本
      // 这种情况应该被识别为 ID_PREFIX 状态，因为最终会生成 id: 链接
      state = LinkInputState.ID_PREFIX;
      query = linkContent.trim().toLowerCase();
    }

    return {
      state,
      linkContent,
      query,
      bracketIndex
    };
  }

  /**
   * 过滤符号列表，只保留匹配查询的符号
   * 
   * 支持字符串匹配和拼音搜索：
   * - 字符串直接匹配（原有功能）：匹配 text 和 displayName
   * - 拼音匹配：匹配缓存的拼音字段（全拼和首字母）
   */
  private filterSymbolsByQuery(
    symbols: IndexedHeadingSymbol[],
    query: string
  ): IndexedHeadingSymbol[] {
    if (!query) {
      return symbols;
    }

    const queryLower = query.toLowerCase();
    return symbols.filter(symbol => {
      const symbolText = symbol.text.toLowerCase();
      const symbolDisplayName = symbol.displayName.toLowerCase();
      
      // 字符串匹配（原有功能）
      if (symbolText.includes(queryLower) || symbolDisplayName.includes(queryLower)) {
        return true;
      }
      
      // 拼音匹配（使用缓存的拼音字段）
      // 安全检查：确保拼音字段存在且不为空
      const pinyinText = symbol.pinyinText || '';
      const pinyinDisplayName = symbol.pinyinDisplayName || '';
      if (pinyinText || pinyinDisplayName) {
        const symbolPinyinText = pinyinText.toLowerCase();
        const symbolPinyinDisplayName = pinyinDisplayName.toLowerCase();
        if (symbolPinyinText.includes(queryLower) || symbolPinyinDisplayName.includes(queryLower)) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * 获取或生成标题的 ID
   */
  private async getOrGenerateId(
    symbol: IndexedHeadingSymbol
  ): Promise<string> {
    try {
      const targetDocument = await vscode.workspace.openTextDocument(symbol.uri);
      const { id } = PropertyParser.getOrGenerateIdForHeading(targetDocument, symbol.line);
      return id;
    } catch (error) {
      Logger.warn(`[CompletionProvider] 无法读取文件 ${symbol.uri.fsPath}，使用占位符 ID`);
      return 'PLACEHOLDER_ID';
    }
  }

  /**
   * 提供自动补全项
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const textBeforeCursor = document.lineAt(position.line).text.substring(0, position.character);
    
    // 解析输入状态
    const inputInfo = this.parseLinkInput(textBeforeCursor);
    if (!inputInfo) {
      return undefined;
    }


    // 获取所有 headline
    const allSymbols = await this.indexService.getAllSymbols();
    
    if (token.isCancellationRequested) {
      return undefined;
    }

    // 根据查询文本过滤符号
    const filteredSymbols = this.filterSymbolsByQuery(allSymbols, inputInfo.query);

    // 为每个符号创建补全项
    const completionItems: vscode.CompletionItem[] = [];
    for (const symbol of filteredSymbols) {
      if (token.isCancellationRequested) {
        break;
      }

      const idToUse = await this.getOrGenerateId(symbol);
      const completionItem = this.createCompletionItem(
        symbol,
        inputInfo,
        position,
        idToUse,
        document
      );
      completionItems.push(completionItem);
    }

    Logger.info(`[CompletionProvider] 返回 ${completionItems.length} 个补全项`);
    return completionItems;
  }

  /**
   * 生成补全文本
   * 
   * @param inputInfo - 链接输入信息
   * @param id - 标题的 ID
   * @param symbolText - 标题文本
   * @param document - 文档
   * @param position - 光标位置
   * @returns 要插入的文本
   */
  private generateInsertText(
    inputInfo: LinkInputInfo,
    id: string,
    symbolText: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): string {
    if (inputInfo.state === LinkInputState.ID_PREFIX) {
      // 用户已经输入了 [[id:，只替换 id: 后面的部分
      return `${id}][${symbolText}`;
    }

    // 用户只输入了 [[，需要插入完整的链接格式
    // 检查 [[ 后面是否有其他文本（在光标之后，且不是 id: 开头）
    const lineText = document.lineAt(position.line).text;
    const textAfterBrackets = lineText.substring(inputInfo.bracketIndex);
    const hasTextAfterBrackets = textAfterBrackets && !textAfterBrackets.startsWith('id:');

    if (hasTextAfterBrackets) {
      // 如果 [[ 后面有非 id: 开头的文本，需要包含 ]] 以避免 VS Code 自动闭合时包含后面的文本
      return `id:${id}][${symbolText}]]`;
    } else {
      // 不包含 ]] 以避免 VS Code 自动闭合括号时产生多余的 ]]
      // 命令执行后会确保有 ]] 并调整光标位置
      return `id:${id}][${symbolText}`;
    }
  }

  /**
   * 计算替换范围
   * 
   * @param inputInfo - 链接输入信息
   * @param position - 光标位置
   * @param textBeforeCursor - 光标前的文本
   * @returns 替换范围
   */
  private calculateReplaceRange(
    inputInfo: LinkInputInfo,
    position: vscode.Position,
    textBeforeCursor: string
  ): vscode.Range {
    let startPos: vscode.Position;

    // 检查是否真的包含 [[id:
    const hasIdPrefix = textBeforeCursor.includes('[[id:');
    
    if (inputInfo.state === LinkInputState.ID_PREFIX && hasIdPrefix) {
      // 用户真正输入了 [[id:xxx，从 ':' 之后开始替换
      const idColonIndex = textBeforeCursor.lastIndexOf('[[id:') + 5; // '[[id:' 的长度是 5
      startPos = new vscode.Position(position.line, idColonIndex);
    } else {
      // 用户只输入了 [[ 或 [[xxx（直接输入文本），从第二个 '[' 之后开始替换
      startPos = new vscode.Position(position.line, inputInfo.bracketIndex);
    }

    // 替换到光标位置
    const endPos = position;
    return new vscode.Range(startPos, endPos);
  }

  /**
   * 创建单个补全项
   * 
   * @param symbol - 标题符号信息
   * @param inputInfo - 链接输入信息
   * @param position - 光标位置
   * @param id - 标题的 ID（真实 ID 或占位符）
   * @param document - 当前文档
   * @returns 补全项
   */
  private createCompletionItem(
    symbol: IndexedHeadingSymbol,
    inputInfo: LinkInputInfo,
    position: vscode.Position,
    id: string,
    document: vscode.TextDocument
  ): vscode.CompletionItem {
    const completionItem = new vscode.CompletionItem(
      symbol.displayName,
      vscode.CompletionItemKind.Reference
    );

    const textBeforeCursor = document.lineAt(position.line).text.substring(0, position.character);

    // 生成补全文本
    completionItem.insertText = this.generateInsertText(
      inputInfo,
      id,
      symbol.text,
      document,
      position
    );

    // 设置 filterText：用于 VS Code 客户端过滤
    // VS Code 会将 range 范围内的用户输入文本与 filterText 进行模糊匹配
    // 关键：filterText 必须只包含用于匹配的文本，不能包含特殊字符
    // 1. 清理文本：移除 markdown 格式字符（如 *）
    const cleanText = symbol.text.replace(/\*/g, '').trim();
    // 2. 清理拼音：移除拼音信息中可能包含的特殊字符
    const cleanPinyinText = (symbol.pinyinText || '').replace(/[^\w\s]/g, '').trim(); // 只保留字母、数字和空格
    const cleanPinyinDisplayName = (symbol.pinyinDisplayName || '').replace(/[^\w\s]/g, '').trim();
    // 3. 构建 filterText：清理后的文本 + 清理后的拼音
    let filterText = cleanText;
    if (cleanPinyinText || cleanPinyinDisplayName) {
      // 合并拼音信息（去重）
      const pinyinParts = [cleanPinyinText, cleanPinyinDisplayName]
        .filter(p => p && p !== cleanPinyinText) // 如果相同则只保留一个
        .filter((p, i, arr) => arr.indexOf(p) === i); // 去重
      const pinyinInfo = [cleanPinyinText, ...pinyinParts].filter(p => p).join(' ');
      filterText = `${cleanText} ${pinyinInfo}`.trim();
    }
    completionItem.filterText = filterText;
    
    // 设置 sortText：控制排序（按标题字母顺序）
    completionItem.sortText = symbol.text.toLowerCase();
    
    // 设置 label：显示在补全列表中的文本
    completionItem.label = {
      label: symbol.displayName,
      description: `${symbol.relativePath}`
    };
    
    completionItem.detail = `${symbol.relativePath} (Level ${symbol.level})`;
    
    // 设置文档说明
    const idDisplay = id === 'PLACEHOLDER_ID' ? '将在选择时生成' : id;
    completionItem.documentation = new vscode.MarkdownString(
      `**标题**: ${symbol.displayName}\n\n` +
      `**文件**: ${symbol.relativePath}\n\n` +
      `**层级**: Level ${symbol.level}\n\n` +
      `**ID**: ${idDisplay}`
    );

    // 计算替换范围
    const replaceRange = this.calculateReplaceRange(inputInfo, position, textBeforeCursor);
    completionItem.range = replaceRange;

    // 设置命令：在用户选择时检查并插入 ID
    const startPos = replaceRange.start;
    if (id === 'PLACEHOLDER_ID') {
      completionItem.command = {
        title: '检查并插入 ID',
        command: 'vorg.generateAndInsertIdForCompletion',
        arguments: [symbol.uri, symbol.line, startPos, position, symbol.text]
      };
    } else {
      completionItem.command = {
        title: '检查并插入 ID',
        command: 'vorg.generateAndInsertIdForCompletion',
        arguments: [symbol.uri, symbol.line, startPos, position, symbol.text, id]
      };
    }

    return completionItem;
  }
}

