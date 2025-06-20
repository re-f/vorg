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

    context.subscriptions.push(metaReturnCommand, smartReturnCommand, insertTodoCommand);
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
}

/**
 * 上下文信息接口
 */
interface ContextInfo {
  type: 'heading' | 'list-item' | 'checkbox' | 'table' | 'code-block' | 'text';
  level?: number;
  todoState?: string | null;
  content?: string;
  indent?: number;
  marker?: string;
  checkboxState?: string | null;
} 