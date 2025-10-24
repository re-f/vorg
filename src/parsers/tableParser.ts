/**
 * 表格行信息接口
 */
export interface TableRowInfo {
  cells: string[];
  columnCount: number;
}

/**
 * 表格解析器
 * 纯解析逻辑，负责解析 Org-mode 表格格式
 */
export class TableParser {
  /**
   * 检查是否是表格行
   */
  static isTableLine(lineText: string): boolean {
    return /^\s*\|.*\|\s*$/.test(lineText);
  }

  /**
   * 检查是否是表格分隔行（如 |---+---|）
   */
  static isTableSeparatorLine(lineText: string): boolean {
    return /^\s*\|[-+|]+\|\s*$/.test(lineText);
  }

  /**
   * 解析表格行
   */
  static parseTableRow(lineText: string): TableRowInfo | null {
    if (!this.isTableLine(lineText)) {
      return null;
    }

    const trimmed = lineText.trim();
    const cells = trimmed
      .split('|')
      .slice(1, -1) // 移除首尾空字符串
      .map(cell => cell.trim());

    return {
      cells,
      columnCount: cells.length
    };
  }

  /**
   * 创建空表格行
   */
  static createEmptyRow(columnCount: number): string {
    return '|' + ' |'.repeat(columnCount);
  }

  /**
   * 创建表格行（带内容）
   */
  static buildTableRow(cells: string[]): string {
    return '| ' + cells.join(' | ') + ' |';
  }

  /**
   * 创建表格分隔行
   */
  static createSeparatorRow(columnCount: number): string {
    return '|' + '---|'.repeat(columnCount);
  }

  /**
   * 获取表格的列数
   */
  static getColumnCount(lineText: string): number {
    const rowInfo = this.parseTableRow(lineText);
    return rowInfo ? rowInfo.columnCount : 0;
  }

  /**
   * 解析表格中光标所在的单元格位置
   */
  static findCellPosition(lineText: string, cursorCharacter: number): {
    cellIndex: number;
    cellStart: number;
    cellEnd: number;
  } | null {
    if (!this.isTableLine(lineText)) {
      return null;
    }

    let currentPos = 0;
    let cellIndex = -1;
    let cellStart = 0;
    let cellEnd = 0;
    let inCell = false;

    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === '|') {
        if (inCell) {
          // 单元格结束
          cellEnd = i;
          if (cursorCharacter >= cellStart && cursorCharacter < cellEnd) {
            return { cellIndex, cellStart, cellEnd };
          }
        }
        // 新单元格开始
        cellIndex++;
        cellStart = i + 1;
        inCell = true;
      }
    }

    return null;
  }

  /**
   * 查找指定位置的下一个单元格
   */
  static findNextCell(lineText: string, currentPosition: number): number | null {
    const afterCursor = lineText.substring(currentPosition);
    const nextPipeIndex = afterCursor.indexOf('|');
    
    if (nextPipeIndex !== -1) {
      // 找到了下一个单元格分隔符
      let nextCellStart = currentPosition + nextPipeIndex + 1;
      // 跳过空格，找到单元格内容开始位置
      while (nextCellStart < lineText.length && lineText[nextCellStart] === ' ') {
        nextCellStart++;
      }
      
      // 检查是否还有有效的单元格内容（必须有下一个 | 才算有效单元格）
      if (nextCellStart >= lineText.length) {
        return null;
      }
      
      const remainingText = lineText.substring(nextCellStart);
      if (remainingText.indexOf('|') === -1) {
        return null;
      }
      
      return nextCellStart;
    }
    
    return null;
  }

  /**
   * 查找指定位置的前一个单元格
   */
  static findPreviousCell(lineText: string, currentPosition: number): number | null {
    const beforeCursor = lineText.substring(0, currentPosition);
    const lastPipeIndex = beforeCursor.lastIndexOf('|');
    
    if (lastPipeIndex !== -1 && lastPipeIndex > 0) {
      // 找到了前一个单元格分隔符
      const prevCellEnd = lastPipeIndex;
      const cellStart = beforeCursor.substring(0, lastPipeIndex).lastIndexOf('|');
      
      if (cellStart !== -1) {
        let cellContentStart = cellStart + 1;
        while (cellContentStart < prevCellEnd && lineText[cellContentStart] === ' ') {
          cellContentStart++;
        }
        return cellContentStart;
      }
    }
    
    return null;
  }
}

