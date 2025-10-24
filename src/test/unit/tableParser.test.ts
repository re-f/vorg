import * as assert from 'assert';
import { TableParser } from '../../parsers/tableParser';

/**
 * TableParser 解析逻辑单元测试
 * 测试表格解析、单元格导航等核心功能
 */
suite('TableParser 表格解析测试', () => {
  
  suite('isTableLine 测试', () => {
    
    test('应该识别标准表格行', () => {
      assert.strictEqual(TableParser.isTableLine('| 单元格1 | 单元格2 |'), true);
      assert.strictEqual(TableParser.isTableLine('|cell1|cell2|'), true);
    });

    test('应该识别带空格的表格行', () => {
      assert.strictEqual(TableParser.isTableLine('  | 单元格 |  '), true);
    });

    test('应该识别空单元格', () => {
      assert.strictEqual(TableParser.isTableLine('| | |'), true);
    });

    test('非表格行应返回 false', () => {
      assert.strictEqual(TableParser.isTableLine('普通文本'), false);
      assert.strictEqual(TableParser.isTableLine('| 只有一个管道符'), false);
      assert.strictEqual(TableParser.isTableLine('管道符在中间 |'), false);
    });
  });

  suite('isTableSeparatorLine 测试', () => {
    
    test('应该识别表格分隔行', () => {
      assert.strictEqual(TableParser.isTableSeparatorLine('|---|---|'), true);
      assert.strictEqual(TableParser.isTableSeparatorLine('|----+----+---|'), true);
    });

    test('非分隔行应返回 false', () => {
      assert.strictEqual(TableParser.isTableSeparatorLine('| 单元格 |'), false);
    });
  });

  suite('parseTableRow 测试', () => {
    
    test('应该解析标准表格行', () => {
      const result = TableParser.parseTableRow('| 单元格1 | 单元格2 | 单元格3 |');
      
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.columnCount, 3);
      assert.deepStrictEqual(result?.cells, ['单元格1', '单元格2', '单元格3']);
    });

    test('应该解析带空格的单元格', () => {
      const result = TableParser.parseTableRow('|  cell1  |  cell2  |');
      
      assert.strictEqual(result?.columnCount, 2);
      assert.deepStrictEqual(result?.cells, ['cell1', 'cell2']);
    });

    test('应该解析空单元格', () => {
      const result = TableParser.parseTableRow('| | empty | |');
      
      assert.strictEqual(result?.columnCount, 3);
      assert.deepStrictEqual(result?.cells, ['', 'empty', '']);
    });

    test('非表格行应返回 null', () => {
      const result = TableParser.parseTableRow('普通文本');
      assert.strictEqual(result, null);
    });
  });

  suite('getColumnCount 测试', () => {
    
    test('应该获取列数', () => {
      assert.strictEqual(TableParser.getColumnCount('| A | B | C |'), 3);
      assert.strictEqual(TableParser.getColumnCount('| 1 | 2 |'), 2);
    });

    test('非表格行应返回 0', () => {
      assert.strictEqual(TableParser.getColumnCount('普通文本'), 0);
    });
  });

  suite('createEmptyRow 测试', () => {
    
    test('应该创建指定列数的空行', () => {
      assert.strictEqual(TableParser.createEmptyRow(3), '| | | |');
      assert.strictEqual(TableParser.createEmptyRow(2), '| | |');
      assert.strictEqual(TableParser.createEmptyRow(1), '| |');
    });
  });

  suite('buildTableRow 测试', () => {
    
    test('应该构建表格行', () => {
      const cells = ['A', 'B', 'C'];
      assert.strictEqual(TableParser.buildTableRow(cells), '| A | B | C |');
    });

    test('应该处理空单元格', () => {
      const cells = ['', 'B', ''];
      assert.strictEqual(TableParser.buildTableRow(cells), '|  | B |  |');
    });

    test('应该处理单个单元格', () => {
      const cells = ['单元格'];
      assert.strictEqual(TableParser.buildTableRow(cells), '| 单元格 |');
    });
  });

  suite('createSeparatorRow 测试', () => {
    
    test('应该创建指定列数的分隔行', () => {
      assert.strictEqual(TableParser.createSeparatorRow(3), '|---|---|---|');
      assert.strictEqual(TableParser.createSeparatorRow(2), '|---|---|');
    });
  });

  suite('findCellPosition 测试', () => {
    
    test('应该找到光标所在的单元格', () => {
      const line = '| Cell1 | Cell2 | Cell3 |';
      
      // 在第一个单元格内
      let result = TableParser.findCellPosition(line, 3);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.cellIndex, 0);
      
      // 在第二个单元格内
      result = TableParser.findCellPosition(line, 11);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.cellIndex, 1);
      
      // 在第三个单元格内
      result = TableParser.findCellPosition(line, 20);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result?.cellIndex, 2);
    });

    test('非表格行应返回 null', () => {
      const result = TableParser.findCellPosition('普通文本', 5);
      assert.strictEqual(result, null);
    });
  });

  suite('findNextCell 测试', () => {
    
    test('应该找到下一个单元格的位置', () => {
      const line = '| Cell1 | Cell2 | Cell3 |';
      
      // 从第一个单元格到第二个
      let nextPos = TableParser.findNextCell(line, 3);
      assert.notStrictEqual(nextPos, null);
      assert.ok(nextPos! > 3 && nextPos! < 15);
      
      // 从第二个单元格到第三个
      nextPos = TableParser.findNextCell(line, 11);
      assert.notStrictEqual(nextPos, null);
      assert.ok(nextPos! > 11);
    });

    test('最后一个单元格后应返回 null', () => {
      const line = '| Cell1 | Cell2 |';
      const nextPos = TableParser.findNextCell(line, 15);
      
      assert.strictEqual(nextPos, null);
    });
  });

  suite('findPreviousCell 测试', () => {
    
    test('应该找到前一个单元格的位置', () => {
      const line = '| Cell1 | Cell2 | Cell3 |';
      
      // 从第三个单元格到第二个
      let prevPos = TableParser.findPreviousCell(line, 20);
      assert.notStrictEqual(prevPos, null);
      assert.ok(prevPos! < 20 && prevPos! > 0);
      
      // 从第二个单元格到第一个
      prevPos = TableParser.findPreviousCell(line, 11);
      assert.notStrictEqual(prevPos, null);
      assert.ok(prevPos! < 11);
    });

    test('第一个单元格前应返回 null', () => {
      const line = '| Cell1 | Cell2 |';
      const prevPos = TableParser.findPreviousCell(line, 3);
      
      assert.strictEqual(prevPos, null);
    });
  });

  suite('综合测试 - 表格操作流程', () => {
    
    test('应该正确处理完整的表格', () => {
      const tableLines = [
        '| Name | Age | City |',
        '|------|-----|------|',
        '| Alice | 30 | NYC |',
        '| Bob | 25 | LA |'
      ];
      
      // 检查所有行都是表格行
      assert.strictEqual(TableParser.isTableLine(tableLines[0]), true);
      assert.strictEqual(TableParser.isTableSeparatorLine(tableLines[1]), true);
      assert.strictEqual(TableParser.isTableLine(tableLines[2]), true);
      
      // 解析表头
      const header = TableParser.parseTableRow(tableLines[0]);
      assert.strictEqual(header?.columnCount, 3);
      assert.deepStrictEqual(header?.cells, ['Name', 'Age', 'City']);
      
      // 解析数据行
      const row1 = TableParser.parseTableRow(tableLines[2]);
      assert.strictEqual(row1?.columnCount, 3);
      assert.deepStrictEqual(row1?.cells, ['Alice', '30', 'NYC']);
      
      // 创建新行
      const newRow = TableParser.createEmptyRow(3);
      assert.strictEqual(newRow, '| | | |');
    });
  });
});

