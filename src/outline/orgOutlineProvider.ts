import * as vscode from 'vscode';

export class OrgOutlineProvider implements vscode.DocumentSymbolProvider {
  
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    
    const symbols: vscode.DocumentSymbol[] = [];
    const lines = document.getText().split('\n');
    
    // 用于跟踪标题层级的栈
    const headingStack: Array<{ symbol: vscode.DocumentSymbol; level: number }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 处理标题
      const headingMatch = line.match(/^(\*+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length; // 星号的数量表示层级
        const title = headingMatch[2].trim();
        
        // 提取标签
        const tagMatch = title.match(/^(.+?)\s+(:.+:)\s*$/);
        let cleanTitle = title;
        let tags = '';
        
        if (tagMatch) {
          cleanTitle = tagMatch[1].trim();
          tags = tagMatch[2];
        }
        
        // 确定符号类型
        let symbolKind = vscode.SymbolKind.String;
        if (level === 1) {
          symbolKind = vscode.SymbolKind.Module;
        } else if (level === 2) {
          symbolKind = vscode.SymbolKind.Class;
        } else if (level === 3) {
          symbolKind = vscode.SymbolKind.Method;
        } else {
          symbolKind = vscode.SymbolKind.Property;
        }
        
        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, line.length)
        );
        
        const symbol = new vscode.DocumentSymbol(
          cleanTitle,
          tags, // 将标签作为详细信息显示
          symbolKind,
          range,
          range
        );
        
        // 找到当前标题的父级
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }
        
        if (headingStack.length === 0) {
          // 顶级标题
          symbols.push(symbol);
        } else {
          // 添加到父级标题的子项中
          const parent = headingStack[headingStack.length - 1].symbol;
          parent.children.push(symbol);
        }
        
        // 将当前标题添加到栈中
        headingStack.push({ symbol, level });
        continue;
      }
      

      
      // 属性关键字（如 #+TITLE, #+AUTHOR 等）
      const keywordMatch = line.match(/^#\+(\w+):\s*(.+)$/);
      if (keywordMatch) {
        const keyword = keywordMatch[1].toUpperCase();
        const value = keywordMatch[2].trim();
        
        // 只显示重要的关键字
        if (['TITLE', 'AUTHOR', 'DATE', 'EMAIL'].includes(keyword)) {
          const range = new vscode.Range(
            new vscode.Position(i, 0),
            new vscode.Position(i, line.length)
          );
          
          const symbol = new vscode.DocumentSymbol(
            `${keyword}: ${value}`,
            '',
            vscode.SymbolKind.Constant,
            range,
            range
          );
          
          symbols.unshift(symbol); // 添加到开头
        }
        continue;
      }
    }
    
    return symbols;
  }
} 