import * as vscode from 'vscode';

export class OrgFoldingProvider implements vscode.FoldingRangeProvider {
  
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    
    const ranges: vscode.FoldingRange[] = [];
    const lines = document.getText().split('\n');
    const headingStack: Array<{ level: number; startLine: number }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 匹配标题行，识别不同层级的标题
      const headingMatch = line.match(/^(\*+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length; // 星号的数量表示层级
        
        // 在添加新标题之前，关闭所有更高或相等层级的标题折叠
        while (headingStack.length > 0) {
          const currentHeading = headingStack[headingStack.length - 1];
          
          if (currentHeading.level >= level) {
            // 为当前标题创建折叠范围
            const endLine = i - 1;
            if (endLine > currentHeading.startLine) {
              // 确保内容存在且有意义的折叠区域
              const hasContent = this.hasContentBetweenLines(lines, currentHeading.startLine, endLine);
              if (hasContent) {
                ranges.push(new vscode.FoldingRange(
                  currentHeading.startLine,
                  endLine,
                  vscode.FoldingRangeKind.Region
                ));
              }
            }
            headingStack.pop();
          } else {
            break; // 如果层级更低，停止弹出
          }
        }
        
        // 将当前标题添加到栈中
        headingStack.push({ level, startLine: i });
      }
    }
    
    // 处理剩余的标题（到文档末尾）
    while (headingStack.length > 0) {
      const currentHeading = headingStack.pop()!;
      const endLine = lines.length - 1;
      
      if (endLine > currentHeading.startLine) {
        // 确保内容存在且有意义的折叠区域
        const hasContent = this.hasContentBetweenLines(lines, currentHeading.startLine, endLine);
        if (hasContent) {
          ranges.push(new vscode.FoldingRange(
            currentHeading.startLine,
            endLine,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }

    // 为代码块和其他块元素添加折叠
    this.addBlockFolding(lines, ranges);
    
    // 为列表项添加折叠
    this.addListFolding(lines, ranges);
    
    return ranges;
  }
  
  private addBlockFolding(lines: string[], ranges: vscode.FoldingRange[]): void {
    let blockStart = -1;
    let blockType = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检测代码块开始
      const blockStartMatch = line.match(/^#\+BEGIN_(\w+)/i);
      if (blockStartMatch && blockStart === -1) {
        blockStart = i;
        blockType = blockStartMatch[1].toUpperCase();
        continue;
      }
      
      // 检测代码块结束
      const blockEndMatch = line.match(/^#\+END_(\w+)/i);
      if (blockEndMatch && blockStart !== -1 && blockEndMatch[1].toUpperCase() === blockType) {
        if (i > blockStart) {
          ranges.push(new vscode.FoldingRange(
            blockStart,
            i,
            vscode.FoldingRangeKind.Region
          ));
        }
        blockStart = -1;
        blockType = '';
      }
    }
  }

  /**
   * 为列表项添加折叠功能
   */
  private addListFolding(lines: string[], ranges: vscode.FoldingRange[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
      
      if (listMatch) {
        const currentIndent = listMatch[1].length;
        const endLine = this.findListItemEnd(lines, i, currentIndent);
        
        // 只有当列表项有子内容时才创建折叠范围
        if (endLine > i) {
          ranges.push(new vscode.FoldingRange(
            i,
            endLine,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }
  }

  /**
   * 查找列表项的结束位置
   */
  private findListItemEnd(lines: string[], startLine: number, parentIndent: number): number {
    let endLine = startLine;
    
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 空行跳过
      if (trimmedLine === '') {
        continue;
      }
      
      // 检查缩进
      const indentMatch = line.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1].length : 0;
      
      // 如果缩进大于父级，说明是子内容
      if (currentIndent > parentIndent) {
        endLine = i;
        continue;
      }
      
      // 如果缩进小于等于父级，检查是否是同级或更高级的列表项
      const listMatch = line.match(/^(\s*)([-+*]|\d+\.)\s+/);
      const headingMatch = line.match(/^(\*+)\s+/);
      
      if (listMatch && currentIndent <= parentIndent) {
        // 遇到同级或更高级的列表项，停止
        break;
      } else if (headingMatch) {
        // 遇到标题，停止
        break;
      } else if (currentIndent <= parentIndent) {
        // 遇到其他同级或更高级的内容，停止
        break;
      } else {
        // 其他情况下，如果缩进更多，视为子内容
        endLine = i;
      }
    }
    
    return endLine;
  }
  
  private hasContentBetweenLines(lines: string[], startLine: number, endLine: number): boolean {
    // 检查标题行和结束行之间是否有实际内容
    for (let i = startLine + 1; i <= endLine; i++) {
      const line = lines[i];
      if (line && line.trim().length > 0) {
        return true;
      }
    }
    return false;
  }
} 