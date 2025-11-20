import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';
import { HeadingParser } from '../parsers/headingParser';
import { HeadingSymbolUtils } from '../utils/headingSymbolUtils';

/**
 * 工作区符号提供器
 * 
 * 提供工作区级别的符号导航功能，实现 VS Code 的 WorkspaceSymbolProvider 接口。
 * 允许用户在整个工作区的所有 org-mode 文件中搜索标题。
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
  private todoKeywordManager: TodoKeywordManager;

  constructor() {
    this.todoKeywordManager = TodoKeywordManager.getInstance();
  }

  /**
   * 提供工作区符号
   * 
   * 搜索工作区中所有 org 文件的标题，返回匹配的符号信息。
   * 
   * @param query - 搜索查询字符串
   * @param token - 取消令牌
   * @returns 符号信息数组
   */
  async provideWorkspaceSymbols(
    query: string,
    token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[]> {
    const symbols: vscode.SymbolInformation[] = [];
    
    // 查找工作区中所有 .org 文件
    const orgFiles = await vscode.workspace.findFiles(
      '**/*.org',
      null, // 排除模式
      1000, // 最大结果数
      token
    );

    // 并行处理所有文件
    const filePromises = orgFiles.map(async (uri) => {
      try {
        // 读取文件内容
        const document = await vscode.workspace.openTextDocument(uri);
        const lines = document.getText().split('\n');
        
        // 解析文件中的所有标题
        for (let i = 0; i < lines.length; i++) {
          if (token.isCancellationRequested) {
            break;
          }

          const line = lines[i];
          // 解析标题（包含标签解析）
          const headingInfo = HeadingParser.parseHeading(line, true);
          
          if (headingInfo.level > 0) {
            const level = headingInfo.level;
            const todoStatus = headingInfo.todoKeyword;
            const pureTitle = headingInfo.text || headingInfo.title;
            const tags = headingInfo.tags || [];
            
            // 构建显示名称
            const displayName = HeadingParser.buildDisplayName(pureTitle, todoStatus, tags);
            
            // 检查是否匹配查询（如果不为空）
            if (query && !this.matchesQuery(displayName, query)) {
              continue;
            }
            
            // 确定符号类型
            const kind = HeadingSymbolUtils.getSymbolKind(level);
            
            // 创建符号信息
            const range = new vscode.Range(i, 0, i, line.length);
            const location = new vscode.Location(uri, range);
            
            // 构建容器名称（显示文件路径和层级信息）
            const containerName = `${this.getRelativePath(uri)} (Level ${level})`;
            
            const symbol = new vscode.SymbolInformation(
              displayName,
              kind,
              containerName,
              location
            );
            
            symbols.push(symbol);
          }
        }
      } catch (error) {
        // 忽略无法读取的文件（可能已被删除或权限不足）
        console.warn(`无法读取文件 ${uri.fsPath}:`, error);
      }
    });

    await Promise.all(filePromises);
    
    return symbols;
  }

  /**
   * 检查标题是否匹配查询
   * 
   * 支持不区分大小写的模糊匹配
   */
  private matchesQuery(text: string, query: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // 简单包含匹配
    if (lowerText.includes(lowerQuery)) {
      return true;
    }
    
    // 支持空格分隔的多个关键词匹配
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length > 1) {
      return queryWords.every(word => lowerText.includes(word));
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
}

