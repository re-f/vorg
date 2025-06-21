import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';

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
      
      // 处理标题行
      const headingMatch = line.match(/^(\*+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const titleText = headingMatch[2];
        
        // 解析标题文本，提取 TODO 状态和标签
        const { cleanTitle, todoStatus, tags } = this.parseHeadingText(titleText);
        
        // 确定符号类型
        let kind = vscode.SymbolKind.Module;
        if (level === 1) kind = vscode.SymbolKind.Module;
        else if (level === 2) kind = vscode.SymbolKind.Class;
        else if (level === 3) kind = vscode.SymbolKind.Method;
        else if (level === 4) kind = vscode.SymbolKind.Function;
        else if (level === 5) kind = vscode.SymbolKind.Variable;
        else kind = vscode.SymbolKind.Constant;
        
        // 构建显示名称
        let displayName = cleanTitle;
        if (todoStatus) {
          displayName = `${todoStatus} ${displayName}`;
        }
        if (tags.length > 0) {
          displayName += ` :${tags.join(':')}:`;
        }
        
        const range = new vscode.Range(i, 0, i, line.length);
        const symbol = new vscode.DocumentSymbol(
          displayName,
          todoStatus || '',
          kind,
          range,
          range
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
   * 解析标题文本，提取 TODO 状态和标签
   */
  private parseHeadingText(titleText: string): {
    cleanTitle: string;
    todoStatus: string | null;
    tags: string[];
  } {
    let cleanTitle = titleText.trim();
    let todoStatus: string | null = null;
    let tags: string[] = [];
    
    // 提取 TODO 状态
    const allKeywords = this.todoKeywordManager.getAllKeywords();
    const todoRegex = new RegExp(`^(${allKeywords.map(k => k.keyword).join('|')})\\s+(.+)$`);
    const todoMatch = cleanTitle.match(todoRegex);
    if (todoMatch) {
      todoStatus = todoMatch[1];
      cleanTitle = todoMatch[2];
    }
    
    // 提取标签
    const tagMatch = cleanTitle.match(/^(.+?)\s+(:[\w_@]+(?::[\w_@]+)*:)\s*$/);
    if (tagMatch) {
      cleanTitle = tagMatch[1].trim();
      const tagString = tagMatch[2];
      tags = tagString.slice(1, -1).split(':').filter(tag => tag.length > 0);
    }
    
    return { cleanTitle, todoStatus, tags };
  }
  
  /**
   * 获取符号的层级
   */
  private getSymbolLevel(symbol: vscode.DocumentSymbol): number {
    return (symbol as any).__level || 1;
  }
} 