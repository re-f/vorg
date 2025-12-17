import * as vscode from 'vscode';
import { OrgSymbolIndexService } from '../services/orgSymbolIndexService';

/**
 * 工作区符号提供器
 * 
 * 提供工作区级别的符号导航功能，实现 VS Code 的 WorkspaceSymbolProvider 接口。
 * 允许用户在整个工作区的所有 org-mode 文件中搜索标题。
 * 
 * 使用共享的 OrgSymbolIndexService 提供高性能的搜索功能。
 * 
 * 功能包括：
 * - 搜索工作区中所有 .org 文件的标题
 * - 支持模糊搜索和过滤
 * - 显示标题的层级和 TODO 状态
 * - 提供快速跳转到标题的功能
 * 
 * @class OrgWorkspaceSymbolProvider
 * @implements {vscode.WorkspaceSymbolProvider}
 */
export class OrgWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  private indexService: OrgSymbolIndexService;

  constructor() {
    this.indexService = OrgSymbolIndexService.getInstance();
  }

  /**
   * 提供工作区符号
   * 
   * 使用共享的索引服务进行搜索。
   * 
   * @param query - 搜索查询字符串
   * @param token - 取消令牌
   * @returns 符号信息数组
   */
  async provideWorkspaceSymbols(
    query: string,
    token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[]> {
    // 从索引服务搜索符号
    // 注意：VS Code 的搜索会在客户端再次过滤，所以我们需要在服务端就完成所有匹配
    // 如果传入空查询，VS Code 会显示所有符号，然后用户在输入框中输入时进行客户端过滤
    // 为了支持拼音搜索，我们需要将拼音信息也包含在 name 中（类似 DocumentSymbol 的做法）
    const indexedSymbols = await this.indexService.searchSymbols(query, { token });
    
    // 转换为 VS Code 的 SymbolInformation 格式
    return indexedSymbols.map(symbol => {
      const range = new vscode.Range(symbol.line, 0, symbol.line, 0);
      const location = new vscode.Location(symbol.uri, range);
      const containerName = `${symbol.relativePath} (Level ${symbol.level})`;
      
      // 将拼音信息添加到 name 中，使用零宽空格分隔（不影响显示但能被搜索）
      // VS Code 的客户端过滤会搜索 name 字段
      const ZERO_WIDTH_SPACE = '\u200B';
      let searchableName = symbol.displayName;
      if (symbol.pinyinText || symbol.pinyinDisplayName) {
        const pinyinInfo = [symbol.pinyinText, symbol.pinyinDisplayName].filter(p => p).join(' ');
        searchableName = `${symbol.displayName}${ZERO_WIDTH_SPACE}${pinyinInfo}`;
      }
      
      return new vscode.SymbolInformation(
        searchableName,
        symbol.symbolKind,
        containerName,
        location
      );
    });
  }
}

