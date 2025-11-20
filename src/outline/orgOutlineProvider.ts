import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';
import { HeadingParser } from '../parsers/headingParser';
import { HeadingSymbolUtils } from '../utils/headingSymbolUtils';

/**
 * 大纲提供器
 * 
 * 提供文档大纲和符号导航功能，实现 VS Code 的 DocumentSymbolProvider 接口。
 * 解析 org-mode 文档的标题结构，生成层次化的大纲视图。
 * 
 * 功能包括：
 * - 解析标题层级结构
 * - 识别 TODO 状态
 * - 处理文档元数据（#+TITLE, #+AUTHOR 等）
 * - 生成符号树供 VS Code 大纲视图使用
 * 
 * @class OrgOutlineProvider
 * @implements {vscode.DocumentSymbolProvider}
 */
export class OrgOutlineProvider implements vscode.DocumentSymbolProvider {
  private todoKeywordManager: TodoKeywordManager;

  constructor() {
    this.todoKeywordManager = TodoKeywordManager.getInstance();
  }
  
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    
    const symbols: vscode.DocumentSymbol[] = [];
    const lines = document.getText().split('\n');
    const headingStack: vscode.DocumentSymbol[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 处理文档元数据（#+TITLE, #+AUTHOR, 等）
      const metadataMatch = line.match(/^#\+([A-Z_]+):\s*(.+)$/);
      if (metadataMatch) {
        const key = metadataMatch[1];
        const value = metadataMatch[2];
        
        // 只为重要的元数据创建符号
        if (['TITLE', 'AUTHOR', 'DATE', 'EMAIL', 'DESCRIPTION'].includes(key)) {
          const range = new vscode.Range(i, 0, i, line.length);
          const symbol = new vscode.DocumentSymbol(
            `${key}: ${value}`,
            '',
            vscode.SymbolKind.Property,
            range,
            range
          );
          symbols.push(symbol);
        }
        continue;
      }
      
      // 处理标题行（包含标签解析）
      const headingInfo = HeadingParser.parseHeading(line, true);
      if (headingInfo.level > 0) {
        const level = headingInfo.level;
        const todoStatus = headingInfo.todoKeyword;
        const pureTitle = headingInfo.text || headingInfo.title;
        const tags = headingInfo.tags || [];
        
        // 确定符号类型
        const kind = HeadingSymbolUtils.getSymbolKind(level);
        
        // 构建显示名称
        const displayName = HeadingParser.buildDisplayName(pureTitle, todoStatus, tags);
        
        // 计算标题的范围：从当前行到下一个同级或更高级标题之前
        const headingRange = new vscode.Range(i, 0, i, line.length);
        
        // 查找子树的结束位置
        let endLine = i;
        const currentLevel = level;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLineHeadingInfo = HeadingParser.parseHeading(lines[j]);
          if (nextLineHeadingInfo.level > 0 && nextLineHeadingInfo.level <= currentLevel) {
            endLine = j - 1;
            break;
          }
        }
        // 如果没有找到下一个同级标题，则到文档末尾
        if (endLine === i) {
          endLine = lines.length - 1;
        }
        
        // 创建符号：range 包含整个子树，selectionRange 是标题行
        const fullRange = new vscode.Range(i, 0, endLine, lines[endLine].length);
        const symbol = new vscode.DocumentSymbol(
          displayName,
          todoStatus || '',
          kind,
          fullRange,
          headingRange  // selectionRange 用于面包屑和跳转
        );
        
        // 处理层级关系
        // 移除所有层级大于等于当前层级的标题
        while (headingStack.length > 0) {
          const lastHeading = headingStack[headingStack.length - 1];
          const lastLevel = this.getSymbolLevel(lastHeading);
          
          if (lastLevel >= level) {
            headingStack.pop();
          } else {
            break;
          }
        }
        
        // 如果有父级标题，将当前标题添加为子标题
        if (headingStack.length > 0) {
          const parent = headingStack[headingStack.length - 1];
          parent.children.push(symbol);
        } else {
          // 否则添加为顶级符号
          symbols.push(symbol);
        }
        
        // 将当前标题推入栈中
        headingStack.push(symbol);
        
        // 存储层级信息（用于后续比较）
        (symbol as any).__level = level;
      }
    }
    
    return symbols;
  }
  
  /**
   * 获取符号的层级
   */
  private getSymbolLevel(symbol: vscode.DocumentSymbol): number {
    return (symbol as any).__level || 1;
  }
} 