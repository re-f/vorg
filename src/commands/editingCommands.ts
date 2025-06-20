import * as vscode from 'vscode';

/**
 * Org-mode 编辑命令，模拟 Emacs 中的 org-meta-return 等功能
 */
export class EditingCommands {
  
  /**
   * 注册编辑相关命令
   */
  static registerCommands(context: vscode.ExtensionContext) {
    // org-meta-return 命令 (Meta+Enter)
    const metaReturnCommand = vscode.commands.registerCommand('vorg.metaReturn', () => {
      EditingCommands.executeMetaReturn();
    });

    // 智能回车命令 (Ctrl+Meta+Enter)
    const smartReturnCommand = vscode.commands.registerCommand('vorg.smartReturn', () => {
      EditingCommands.executeSmartReturn();
    });

    // 插入TODO标题命令
    const insertTodoCommand = vscode.commands.registerCommand('vorg.insertTodoHeading', () => {
      EditingCommands.insertTodoHeading();
    });

    // TAB 键智能缩进命令
    const smartTabCommand = vscode.commands.registerCommand('vorg.smartTab', () => {
      EditingCommands.executeSmartTab();
    });

    // Shift+TAB 键反向缩进命令
    const smartShiftTabCommand = vscode.commands.registerCommand('vorg.smartShiftTab', () => {
      EditingCommands.executeSmartShiftTab();
    });

    context.subscriptions.push(metaReturnCommand, smartReturnCommand, insertTodoCommand, smartTabCommand, smartShiftTabCommand);
  }

  /**
   * 执行 org-meta-return 功能
   * 根据当前上下文智能插入相应的元素
   */
  private static async executeMetaReturn() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    const isAtBeginning = position.character === 0 || lineText.slice(0, position.character).trim() === '';
    
         // 检查当前位置的上下文
     const context = EditingCommands.analyzeContext(document, position);
    
    await editor.edit(editBuilder => {
             switch (context.type) {
         case 'heading':
           EditingCommands.insertHeading(editBuilder, editor, context, isAtBeginning);
           break;
         case 'list-item':
           EditingCommands.insertListItem(editBuilder, editor, context, isAtBeginning);
           break;
         case 'table':
           EditingCommands.insertTableRow(editBuilder, editor, context);
           break;
         case 'code-block':
           EditingCommands.insertCodeBlockLine(editBuilder, editor, context);
           break;
         case 'checkbox':
           EditingCommands.insertCheckboxItem(editBuilder, editor, context);
           break;
         default:
           EditingCommands.insertDefaultNewline(editBuilder, editor, position, isAtBeginning);
           break;
       }
    });
  }

  /**
   * 执行智能回车功能 (Ctrl+Meta+Enter)
   * 总是在当前子树末尾插入新的同级元素
   */
  private static async executeSmartReturn() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

         const position = editor.selection.active;
     const document = editor.document;
     const context = EditingCommands.analyzeContext(document, position);

     if (context.type === 'heading') {
       // 在子树末尾插入新标题
       const subtreeEnd = EditingCommands.findSubtreeEnd(document, position);
      const newPosition = new vscode.Position(subtreeEnd.line + 1, 0);
      
      await editor.edit(editBuilder => {
        const stars = '*'.repeat(context.level || 1);
        editBuilder.insert(newPosition, `${stars} \n`);
      });
      
      // 移动光标到新标题位置
      const newCursorPos = new vscode.Position(subtreeEnd.line + 1, (context.level || 1) + 1);
      editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
         } else {
       // 对于非标题元素，执行常规 meta-return
       await EditingCommands.executeMetaReturn();
     }
  }

  /**
   * 插入TODO标题
   */
  private static async insertTodoHeading() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

         const position = editor.selection.active;
     const document = editor.document;
     const context = EditingCommands.analyzeContext(document, position);

    const level = context.type === 'heading' ? (context.level || 1) : 1;
    const stars = '*'.repeat(level);
    
    await editor.edit(editBuilder => {
      if (context.type === 'heading') {
        // 在标题后插入
        const lineEnd = document.lineAt(position.line).range.end;
        editBuilder.insert(lineEnd, `\n${stars} TODO `);
      } else {
        // 在当前位置插入
        editBuilder.insert(position, `${stars} TODO `);
      }
    });
  }

  /**
   * 分析当前位置的上下文
   */
  private static analyzeContext(document: vscode.TextDocument, position: vscode.Position): ContextInfo {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 检查是否在标题中
    const headingMatch = lineText.match(/^(\*+)\s+(?:(TODO|DONE|NEXT|WAITING|CANCELLED)\s+)?(.*)$/);
    if (headingMatch) {
      return {
        type: 'heading',
        level: headingMatch[1].length,
        todoState: headingMatch[2] || null,
        content: headingMatch[3] || ''
      };
    }

    // 检查是否在代码块标题中
    const codeBlockHeaderMatch = lineText.match(/^(\s*)#\+(BEGIN_SRC|BEGIN_EXAMPLE|BEGIN_QUOTE|BEGIN_VERSE|BEGIN_CENTER)/i);
    if (codeBlockHeaderMatch) {
      return { type: 'code-block-header' };
    }

    // 检查是否在列表项中
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const hasCheckbox = listMatch[3].match(/^\[([ X-])\]\s+(.*)$/);
      return {
        type: hasCheckbox ? 'checkbox' : 'list-item',
        indent: listMatch[1].length,
        marker: listMatch[2],
        content: hasCheckbox ? hasCheckbox[2] : listMatch[3],
        checkboxState: hasCheckbox ? hasCheckbox[1] : null
      };
    }

    // 检查是否在表格中
    if (lineText.match(/^\s*\|.*\|\s*$/)) {
      return { type: 'table' };
    }

         // 检查是否在代码块中
     if (EditingCommands.isInCodeBlock(document, position)) {
       return { type: 'code-block' };
     }

    return { type: 'text' };
  }

  /**
   * 插入标题
   */
  private static insertHeading(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo, isAtBeginning: boolean) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const stars = '*'.repeat(context.level || 1);

    if (isAtBeginning) {
      // 在当前行之前插入新标题
      editBuilder.insert(line.range.start, `${stars} \n`);
    } else {
      // 分割当前行，后半部分作为新标题
      const lineEnd = line.range.end;
      const restOfLine = line.text.substring(position.character);
      editBuilder.delete(new vscode.Range(position, lineEnd));
      editBuilder.insert(position, `\n${stars} ${restOfLine}`);
    }
  }

  /**
   * 插入列表项
   */
  private static insertListItem(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo, isAtBeginning: boolean) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    // 确定列表标记
    let marker = '';
    if (typeof context.marker === 'string') {
      if (context.marker.match(/^\d+\.$/)) {
        // 有序列表，递增数字
        const num = parseInt(context.marker) + 1;
        marker = `${num}.`;
      } else {
        // 无序列表，保持相同标记
        marker = context.marker;
      }
    }

    if (isAtBeginning && line.text.trim() === '') {
      // 空行，删除当前行的列表标记
      editBuilder.delete(line.range);
      editBuilder.insert(line.range.start, '\n');
    } else {
      // 插入新列表项
      const lineEnd = line.range.end;
      editBuilder.insert(lineEnd, `\n${indent}${marker} `);
    }
  }

  /**
   * 插入复选框项
   */
  private static insertCheckboxItem(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const indent = ' '.repeat(context.indent || 0);
    
    let marker = '';
    if (typeof context.marker === 'string') {
      if (context.marker.match(/^\d+\.$/)) {
        const num = parseInt(context.marker) + 1;
        marker = `${num}.`;
      } else {
        marker = context.marker;
      }
    }

    const lineEnd = line.range.end;
    editBuilder.insert(lineEnd, `\n${indent}${marker} [ ] `);
  }

  /**
   * 插入表格行
   */
  private static insertTableRow(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 计算列数
    const columns = lineText.split('|').length - 2; // 减去首尾的空字符串
    const newRow = '|' + ' |'.repeat(columns);
    
    const lineEnd = line.range.end;
    editBuilder.insert(lineEnd, `\n${newRow}`);
  }

  /**
   * 在代码块中插入行
   */
  private static insertCodeBlockLine(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo) {
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const lineEnd = line.range.end;
    
    // 保持代码块的缩进
    const indent = line.text.match(/^(\s*)/)?.[1] || '';
    editBuilder.insert(lineEnd, `\n${indent}`);
  }

  /**
   * 插入默认换行
   */
  private static insertDefaultNewline(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, position: vscode.Position, isAtBeginning: boolean) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    
    if (isAtBeginning && line.text.trim() === '') {
      // 空行，转换为标题
      editBuilder.insert(position, '* ');
    } else {
      // 普通换行
      editBuilder.insert(position, '\n');
    }
  }

  /**
   * 检查是否在代码块中
   */
  private static isInCodeBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
    let inCodeBlock = false;
    
    for (let i = 0; i < position.line; i++) {
      const line = document.lineAt(i).text;
      if (line.match(/^\s*#\+BEGIN_SRC/i)) {
        inCodeBlock = true;
      } else if (line.match(/^\s*#\+END_SRC/i)) {
        inCodeBlock = false;
      }
    }
    
    return inCodeBlock;
  }

  /**
   * 查找子树的结束位置
   */
  private static findSubtreeEnd(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const currentLine = document.lineAt(position.line);
    const currentHeadingMatch = currentLine.text.match(/^(\*+)/);
    
    if (!currentHeadingMatch) {
      return position;
    }
    
    const currentLevel = currentHeadingMatch[1].length;
    
    // 查找下一个同级或更高级的标题
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const headingMatch = line.text.match(/^(\*+)/);
      
      if (headingMatch && headingMatch[1].length <= currentLevel) {
        return new vscode.Position(i - 1, document.lineAt(i - 1).text.length);
      }
    }
    
    // 如果没找到，返回文档末尾
    return new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
  }

  /**
   * 执行智能 TAB 功能
   * 根据当前上下文执行不同的缩进操作
   */
  private static async executeSmartTab() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      // 不是 org 文件，执行默认 TAB 行为
      await vscode.commands.executeCommand('tab');
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    const context = EditingCommands.analyzeContext(document, position);
    
    switch (context.type) {
      case 'heading':
        // 在标题上：切换折叠状态
        await EditingCommands.toggleHeadingFold(editor, position);
        break;
      case 'list-item':
      case 'checkbox':
        // 在列表项上：切换折叠状态（如果有子项）
        await EditingCommands.toggleListFold(editor, position);
        break;
      case 'table':
        // 在表格中：移动到下一个单元格
        await EditingCommands.moveToNextTableCell(editor, position);
        break;
      case 'code-block':
        // 在代码块中：执行正常缩进
        await vscode.commands.executeCommand('tab');
        break;
      case 'code-block-header':
        // 在代码块标题上：切换代码块的折叠状态
        await EditingCommands.toggleCodeBlockFold(editor, position);
        break;
      default:
        // 在普通文本中：执行正常缩进
        await vscode.commands.executeCommand('tab');
        break;
    }
  }

  /**
   * 执行智能 Shift+TAB 功能
   * 反向操作：减少缩进或移动到前一个单元格
   */
  private static async executeSmartShiftTab() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      // 不是 org 文件，执行默认 Shift+TAB 行为
      await vscode.commands.executeCommand('outdent');
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    const context = EditingCommands.analyzeContext(document, position);
    
    switch (context.type) {
      case 'list-item':
      case 'checkbox':
        // 在列表项上：减少缩进级别（备用功能）
        await EditingCommands.decreaseListIndent(editor, position);
        break;
      case 'table':
        // 在表格中：移动到前一个单元格
        await EditingCommands.moveToPreviousTableCell(editor, position);
        break;
      default:
        // 其他情况：执行正常反向缩进
        await vscode.commands.executeCommand('outdent');
        break;
    }
  }

  /**
   * 切换标题折叠状态
   */
  private static async toggleHeadingFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 使用 VS Code 的折叠命令
    await vscode.commands.executeCommand('editor.toggleFold');
  }

  /**
   * 切换列表折叠状态
   */
  private static async toggleListFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 首先尝试使用 VS Code 的折叠命令
    // 如果当前位置有可折叠的内容，这个命令会生效
    try {
      await vscode.commands.executeCommand('editor.toggleFold');
      
      // 检查折叠命令是否生效
      // 如果光标位置没有发生变化且没有错误，说明折叠命令执行了
      // VS Code 会自动处理折叠范围的切换
      return;
    } catch (error) {
      // 如果折叠命令失败，说明没有可折叠的内容
      console.log('折叠命令失败，执行缩进操作:', error);
    }
    
    // 检查当前列表项是否有子项的逻辑作为备用
    const document = editor.document;
    const currentLine = document.lineAt(position.line);
    const currentLineText = currentLine.text;
    const currentIndentMatch = currentLineText.match(/^(\s*)/);
    const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
    
    // 查找是否有子项
    let hasSubItems = false;
    for (let i = position.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 如果是空行，跳过
      if (lineText === '') {
        continue;
      }
      
      // 检查缩进
      const lineIndentMatch = line.text.match(/^(\s*)/);
      const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
      
      // 如果缩进大于当前级别，说明有子内容
      if (lineIndent > currentIndent && lineText !== '') {
        hasSubItems = true;
        break;
      }
      
      // 如果遇到同级或更高级的结构，停止查找
      const listMatch = line.text.match(/^(\s*)([-+*]|\d+\.)\s+/);
      const headingMatch = line.text.match(/^(\*+)\s+/);
      
      if ((listMatch && lineIndent <= currentIndent) || headingMatch || (lineIndent <= currentIndent && lineText !== '')) {
        break;
      }
    }
    
    // 如果确实有子项但折叠命令没有生效，可能是折叠范围还没有注册
    // 这时我们再次尝试折叠命令
    if (hasSubItems) {
      try {
        await vscode.commands.executeCommand('editor.toggleFold');
      } catch (error) {
        // 如果还是失败，说明 VS Code 还没有识别到这个折叠范围
        // 执行增加缩进作为备用行为
        await EditingCommands.increaseListIndent(editor, position);
      }
    } else {
      // 没有子项时，增加缩进
      await EditingCommands.increaseListIndent(editor, position);
    }
  }

  /**
   * 切换代码块折叠状态
   */
  private static async toggleCodeBlockFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 使用 VS Code 的折叠命令切换代码块折叠状态
    await vscode.commands.executeCommand('editor.toggleFold');
  }

  /**
   * 增加列表项缩进级别
   */
  private static async increaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 检查是否是列表项
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!listMatch) {
      return;
    }

    const currentIndent = listMatch[1];
    const marker = listMatch[2];
    const content = listMatch[3];
    const newIndent = currentIndent + '  '; // 增加 2 个空格缩进

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
    });
  }

  /**
   * 减少列表项缩进级别
   */
  private static async decreaseListIndent(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 检查是否是列表项
    const listMatch = lineText.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!listMatch) {
      return;
    }

    const currentIndent = listMatch[1];
    const marker = listMatch[2];
    const content = listMatch[3];
    
    // 减少 2 个空格缩进，但不能少于 0
    const newIndentLength = Math.max(0, currentIndent.length - 2);
    const newIndent = ' '.repeat(newIndentLength);

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
    });
  }

  /**
   * 移动到表格的下一个单元格
   */
  private static async moveToNextTableCell(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 查找当前光标后的下一个 | 符号
    const afterCursor = lineText.substring(position.character);
    const nextPipeIndex = afterCursor.indexOf('|');
    
    if (nextPipeIndex !== -1) {
      // 找到了下一个单元格
      const nextCellStart = position.character + nextPipeIndex + 1;
      // 跳过空格，找到单元格内容开始位置
      let cellContentStart = nextCellStart;
      while (cellContentStart < lineText.length && lineText[cellContentStart] === ' ') {
        cellContentStart++;
      }
      
      const newPosition = new vscode.Position(position.line, cellContentStart);
      editor.selection = new vscode.Selection(newPosition, newPosition);
    } else {
      // 当前行没有更多单元格，尝试移到下一行的第一个单元格
      if (position.line + 1 < document.lineCount) {
        const nextLine = document.lineAt(position.line + 1);
        const nextLineText = nextLine.text;
        
        if (nextLineText.match(/^\s*\|/)) {
          // 下一行也是表格行
          const firstPipeIndex = nextLineText.indexOf('|');
          if (firstPipeIndex !== -1) {
            let cellContentStart = firstPipeIndex + 1;
            while (cellContentStart < nextLineText.length && nextLineText[cellContentStart] === ' ') {
              cellContentStart++;
            }
            
            const newPosition = new vscode.Position(position.line + 1, cellContentStart);
            editor.selection = new vscode.Selection(newPosition, newPosition);
          }
        }
      }
    }
  }

  /**
   * 移动到表格的前一个单元格
   */
  private static async moveToPreviousTableCell(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // 查找当前光标前的上一个 | 符号
    const beforeCursor = lineText.substring(0, position.character);
    const lastPipeIndex = beforeCursor.lastIndexOf('|');
    
    if (lastPipeIndex !== -1 && lastPipeIndex > 0) {
      // 找到了前一个单元格分隔符，现在找到该单元格的开始位置
      const prevCellEnd = lastPipeIndex;
      const cellStart = beforeCursor.substring(0, lastPipeIndex).lastIndexOf('|');
      
      if (cellStart !== -1) {
        let cellContentStart = cellStart + 1;
        while (cellContentStart < prevCellEnd && lineText[cellContentStart] === ' ') {
          cellContentStart++;
        }
        
        const newPosition = new vscode.Position(position.line, cellContentStart);
        editor.selection = new vscode.Selection(newPosition, newPosition);
      }
    } else {
      // 当前行没有前一个单元格，尝试移到上一行的最后一个单元格
      if (position.line > 0) {
        const prevLine = document.lineAt(position.line - 1);
        const prevLineText = prevLine.text;
        
        if (prevLineText.match(/^\s*\|.*\|\s*$/)) {
          // 上一行也是表格行，找到最后一个单元格
          const lastPipeIndex = prevLineText.lastIndexOf('|');
          if (lastPipeIndex > 0) {
            const secondLastPipeIndex = prevLineText.substring(0, lastPipeIndex).lastIndexOf('|');
            if (secondLastPipeIndex !== -1) {
              let cellContentStart = secondLastPipeIndex + 1;
              while (cellContentStart < lastPipeIndex && prevLineText[cellContentStart] === ' ') {
                cellContentStart++;
              }
              
              const newPosition = new vscode.Position(position.line - 1, cellContentStart);
              editor.selection = new vscode.Selection(newPosition, newPosition);
            }
          }
        }
      }
    }
  }
}

/**
 * 上下文信息接口
 */
interface ContextInfo {
  type: 'heading' | 'list-item' | 'checkbox' | 'table' | 'code-block' | 'text' | 'code-block-header';
  level?: number;
  todoState?: string | null;
  content?: string;
  indent?: number;
  marker?: string;
  checkboxState?: string | null;
} 