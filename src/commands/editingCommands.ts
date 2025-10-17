import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';

/**
 * Org-mode 编辑命令，模拟 Emacs 中的 org-meta-return 等功能
 */
export class EditingCommands {
  private static todoKeywordManager = TodoKeywordManager.getInstance();
  
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

    // 切换到特定TODO状态的命令
    const setTodoStateCommand = vscode.commands.registerCommand('vorg.setTodoState', (state?: string) => {
      EditingCommands.setTodoState(state);
    });

    // TAB 键智能缩进命令
    const smartTabCommand = vscode.commands.registerCommand('vorg.smartTab', () => {
      EditingCommands.executeSmartTab();
    });

    // Shift+TAB 键反向缩进命令
    const smartShiftTabCommand = vscode.commands.registerCommand('vorg.smartShiftTab', () => {
      EditingCommands.executeSmartShiftTab();
    });

    // 设置Property命令（类似org-set-property）
    const setPropertyCommand = vscode.commands.registerCommand('vorg.setProperty', () => {
      EditingCommands.orgSetProperty();
    });

    context.subscriptions.push(metaReturnCommand, smartReturnCommand, insertTodoCommand, setTodoStateCommand, smartTabCommand, smartShiftTabCommand, setPropertyCommand);
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
        case 'property-drawer':
        case 'property-item':
          EditingCommands.insertPropertyItem(editBuilder, editor, context);
          break;
        case 'property-drawer-header':
          EditingCommands.insertPropertyItem(editBuilder, editor, context);
          break;
        case 'property-drawer-end':
          EditingCommands.insertDefaultNewline(editBuilder, editor, position, isAtBeginning);
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
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;
    
    // 获取当前行的缩进级别
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    
    // 确定星号数量
    const stars = this.determineStarLevel(editor, position.line);
    
    // 获取默认TODO关键字
    const defaultTodoKeyword = this.todoKeywordManager.getDefaultTodoKeyword();
    
    await editor.edit(editBuilder => {
      if (lineText.trim() === '') {
        // 当前行为空，直接插入
        editBuilder.insert(position, `${stars} ${defaultTodoKeyword} `);
      } else {
        // 当前行有内容，在行末插入新行
        const lineEnd = line.range.end;
        editBuilder.insert(lineEnd, `\n${stars} ${defaultTodoKeyword} `);
      }
    });
  }



  /**
   * 设置Property（模拟org-set-property行为）
   * 在当前标题下设置或更新属性
   */
  private static async orgSetProperty() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    
    // 查找当前位置所属的标题
    const headingLineInfo = this.findCurrentHeading(document, position);
    if (!headingLineInfo) {
      vscode.window.showInformationMessage('请将光标放在标题或其内容区域内');
      return;
    }

    const { line } = headingLineInfo;
    const headingLineNumber = line.lineNumber;

    // 提示用户输入属性名
    const propertyKey = await vscode.window.showInputBox({
      prompt: '请输入属性名',
      placeHolder: '例如：CATEGORY, PRIORITY, CREATED 等'
    });

    if (!propertyKey) {
      return;
    }

    const propertyKeyUpper = propertyKey.toUpperCase();

    // 提示用户输入属性值
    const propertyValue = await vscode.window.showInputBox({
      prompt: `请输入属性 "${propertyKeyUpper}" 的值`,
      placeHolder: '例如：work, high, [2023-10-20] 等'
    });

    if (propertyValue === undefined) {  // 允许空值
      return;
    }

    // 检查标题下是否已经存在Property抽屉
    const drawerInfo = this.findPropertyDrawer(document, headingLineNumber);
    
    if (drawerInfo) {
      // 已存在property抽屉，检查属性是否存在
      const existingPropertyLine = this.findPropertyInDrawer(document, drawerInfo, propertyKeyUpper);
      
      if (existingPropertyLine !== null) {
        // 属性已存在，更新其值
        const line = document.lineAt(existingPropertyLine);
        const lineText = line.text;
        const propertyMatch = lineText.match(/^(\s*:\w+:)\s*(.*)$/);
        
        if (propertyMatch) {
          const indent = lineText.match(/^(\s*)/)?.[1] || '  ';
          const newLineText = `${indent}:${propertyKeyUpper}: ${propertyValue}`;
          
          await editor.edit(editBuilder => {
            editBuilder.replace(line.range, newLineText);
          });
          
          vscode.window.showInformationMessage(`已更新属性 ${propertyKeyUpper}`);
        }
      } else {
        // 属性不存在，在:END:之前添加新属性
        // 首先找到现有属性的缩进作为参考
        let referenceIndent = '  '; // 默认缩进
        for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
          const line = document.lineAt(i);
          const lineText = line.text;
          const propertyMatch = lineText.match(/^(\s*):\w+:/);
          if (propertyMatch) {
            referenceIndent = propertyMatch[1];
            break;
          }
        }
        
        const insertLine = drawerInfo.endLine;
        const insertPosition = new vscode.Position(insertLine, 0);
        
        await editor.edit(editBuilder => {
          editBuilder.insert(insertPosition, `${referenceIndent}:${propertyKeyUpper}: ${propertyValue}\n`);
        });
        
        vscode.window.showInformationMessage(`已添加属性 ${propertyKeyUpper}`);
      }
    } else {
      // 不存在property抽屉，创建新的
      const insertPosition = new vscode.Position(headingLineNumber + 1, 0);
      
      // 生成唯一的 ID
      const uniqueId = this.generateUniqueId();
      
      // 创建包含 ID 和用户输入属性的 Property 抽屉
      const propertyDrawer = `  :PROPERTIES:
  :ID: ${uniqueId}
  :${propertyKeyUpper}: ${propertyValue}
  :END:
`;

      await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, propertyDrawer);
      });
      
      vscode.window.showInformationMessage(`已创建Property抽屉并添加属性 ${propertyKeyUpper}`);
    }
  }

  /**
   * 查找指定标题下的Property抽屉
   * 返回抽屉的起始行和结束行，如果不存在则返回null
   */
  private static findPropertyDrawer(document: vscode.TextDocument, headingLineNumber: number): { startLine: number; endLine: number } | null {
    let startLine: number | null = null;
    let endLine: number | null = null;
    
    // 查看标题下的几行，查找 :PROPERTIES: 和 :END: 标记
    for (let i = headingLineNumber + 1; i < Math.min(headingLineNumber + 50, document.lineCount); i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 如果遇到了另一个标题，停止查找
      if (lineText.match(/^\*+\s+/)) {
        break;
      }
      
      // 如果找到了 :PROPERTIES: 标记
      if (lineText === ':PROPERTIES:') {
        startLine = i;
        continue;
      }
      
      // 如果找到了 :END: 标记
      if (lineText === ':END:' && startLine !== null) {
        endLine = i;
        break;
      }
    }
    
    if (startLine !== null && endLine !== null) {
      return { startLine, endLine };
    }
    
    return null;
  }

  /**
   * 在Property抽屉中查找指定的属性
   * 返回属性所在的行号，如果不存在则返回null
   */
  private static findPropertyInDrawer(document: vscode.TextDocument, drawerInfo: { startLine: number; endLine: number }, propertyKey: string): number | null {
    const propertyKeyUpper = propertyKey.toUpperCase();
    
    for (let i = drawerInfo.startLine + 1; i < drawerInfo.endLine; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 匹配属性行 :KEY: value
      const match = lineText.match(/^:(\w+):/);
      if (match && match[1].toUpperCase() === propertyKeyUpper) {
        return i;
      }
    }
    
    return null;
  }

  /**
   * 检查指定标题下是否已经存在Property抽屉（兼容性方法）
   */
  private static hasPropertyDrawer(document: vscode.TextDocument, headingLineNumber: number): boolean {
    return this.findPropertyDrawer(document, headingLineNumber) !== null;
  }

  /**
   * 设置特定的TODO状态
   */
  private static async setTodoState(targetState?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    
    // 查找当前位置所属的标题
    const headingLineInfo = this.findCurrentHeading(editor.document, position);
    if (!headingLineInfo) {
      vscode.window.showInformationMessage('请将光标放在标题或其内容区域内');
      return;
    }

    const { line, headingInfo } = headingLineInfo;

    // 如果没有指定目标状态，显示选择列表
    if (!targetState) {
      const allKeywords = this.todoKeywordManager.getAllKeywords();
      const items = [
        { label: '(无状态)', value: '' },
        ...allKeywords.map(k => ({
          label: k.keyword,
          value: k.keyword,
          description: k.isDone ? '已完成状态' : '未完成状态'
        }))
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '选择TODO状态'
      });

      if (!selected) {
        return;
      }

      targetState = selected.value;
    }

    // 验证目标状态是否有效
    if (targetState && !this.todoKeywordManager.isValidKeyword(targetState)) {
      vscode.window.showErrorMessage(`无效的TODO状态: ${targetState}`);
      return;
    }

    // 应用状态变更
    await this.applyTodoStateChange(editor, line, headingInfo, targetState);
  }

  /**
   * 应用TODO状态变更
   */
  private static async applyTodoStateChange(
    editor: vscode.TextEditor,
    line: vscode.TextLine,
    headingInfo: HeadingInfo,
    newState: string
  ) {
    const lineText = line.text;
    let newLineText: string;

    if (!newState) {
      // 移除状态
      if (headingInfo.todoState) {
        newLineText = lineText.replace(
          new RegExp(`^(\\*+)\\s+${headingInfo.todoState}\\s+(.*)$`),
          '$1 $2'
        );
      } else {
        return; // 已经没有状态了
      }
    } else {
      // 设置新状态
      if (headingInfo.todoState) {
        // 替换现有状态
        newLineText = lineText.replace(
          new RegExp(`^(\\*+)\\s+${headingInfo.todoState}\\s+(.*)$`),
          `$1 ${newState} $2`
        );
      } else {
        // 添加新状态
        newLineText = lineText.replace(
          /^(\*+)\s+(.*)$/,
          `$1 ${newState} $2`
        );
      }
    }

    // 应用文本变更
    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, newLineText);
    });

    // 检查是否需要添加时间戳和备注
    const keywordConfig = this.todoKeywordManager.getKeywordConfig(newState);
    if (keywordConfig) {
      await this.handleStateTransitionLogging(editor, line.lineNumber, keywordConfig, headingInfo.todoState, newState);
    }
  }

  /**
   * 处理状态转换日志记录（时间戳和备注）
   */
  private static async handleStateTransitionLogging(
    editor: vscode.TextEditor,
    lineNumber: number,
    keywordConfig: any,
    oldState: string | null,
    newState: string
  ) {
    const needsTimestamp = keywordConfig.needsTimestamp;
    const needsNote = keywordConfig.needsNote;

    if (!needsTimestamp && !needsNote) {
      return;
    }

    const insertPosition = new vscode.Position(lineNumber + 1, 0);
    let logText = '';

    // 添加时间戳
    if (needsTimestamp) {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
      
      if (keywordConfig.isDone) {
        logText += `   CLOSED: [${timestamp}]\n`;
      } else {
        logText += `   STATE: [${timestamp}] ${oldState || '(无)'} -> ${newState}\n`;
      }
    }

    // 添加备注
    if (needsNote) {
      const note = await vscode.window.showInputBox({
        prompt: `为状态变更添加备注 (${oldState || '无'} -> ${newState})`,
        placeHolder: '输入备注内容...'
      });

      if (note) {
        logText += `   - 备注：${note}\n`;
      }
    }

    if (logText) {
      await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, logText);
      });
    }
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

    // 检查是否在property抽屉中
    if (lineText.match(/^\s*:PROPERTIES:\s*$/)) {
      return { type: 'property-drawer-header' };
    }
    
    if (lineText.match(/^\s*:END:\s*$/)) {
      return { type: 'property-drawer-end' };
    }
    
    if (lineText.match(/^\s*:\w+:\s*.*$/)) {
      const propertyMatch = lineText.match(/^\s*:(\w+):\s*(.*)$/);
      return { 
        type: 'property-item',
        propertyKey: propertyMatch ? propertyMatch[1] : '',
        propertyValue: propertyMatch ? propertyMatch[2] : ''
      };
    }

    // 检查是否在property抽屉内部
    if (EditingCommands.isInPropertyDrawer(document, position)) {
      return { type: 'property-drawer' };
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
   * 插入property项
   */
  private static insertPropertyItem(editBuilder: vscode.TextEditorEdit, editor: vscode.TextEditor, context: ContextInfo) {
    const position = editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineEnd = line.range.end;
    const lineText = line.text;
    
    // 检测当前行的缩进
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '  ';
    
    editBuilder.insert(lineEnd, `\n${indent}:`);
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
   * 检查是否在property抽屉中
   */
  private static isInPropertyDrawer(document: vscode.TextDocument, position: vscode.Position): boolean {
    let inPropertyDrawer = false;
    
    for (let i = 0; i <= position.line; i++) {
      const line = document.lineAt(i).text.trim();
      if (line === ':PROPERTIES:') {
        inPropertyDrawer = true;
      } else if (line === ':END:' && inPropertyDrawer) {
        inPropertyDrawer = false;
      }
    }
    
    return inPropertyDrawer;
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

    // 如果有文字被选中，执行缩进操作而不是智能折叠
    if (!editor.selection.isEmpty) {
      await vscode.commands.executeCommand('editor.action.indentLines');
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
        // 在列表项上：智能判断 - 有子项时折叠，无子项时缩进
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
      case 'property-drawer-header':
        // 在 Property 抽屉标题上：切换折叠状态
        await EditingCommands.togglePropertyDrawerFold(editor, position);
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

    // 如果有文字被选中，执行反向缩进操作而不是智能折叠
    if (!editor.selection.isEmpty) {
      await vscode.commands.executeCommand('editor.action.outdentLines');
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
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
  }

  /**
   * 切换列表折叠状态
   * 智能判断：有子项时折叠，无子项时缩进
   */
  private static async toggleListFold(editor: vscode.TextEditor, position: vscode.Position) {
    const document = editor.document;
    const currentLine = document.lineAt(position.line);
    const currentLineText = currentLine.text;
    const currentIndentMatch = currentLineText.match(/^(\s*)/);
    const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
    
    // 先检查当前列表项是否有子项
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
    
    // 根据是否有子项决定行为
    if (hasSubItems) {
      // 有子项：执行折叠操作
      // 保存当前光标位置，确保折叠后光标不会跳转
      const savedPosition = editor.selection.active;
      
      try {
        await vscode.commands.executeCommand('editor.toggleFold');
        
        // 恢复光标位置
        editor.selection = new vscode.Selection(savedPosition, savedPosition);
      } catch (error) {
        // 如果折叠失败（例如VS Code还没识别到折叠范围），不做任何操作
        console.log('折叠命令失败:', error);
      }
    } else {
      // 没有子项：执行默认TAB行为（插入TAB字符）
      // 注意：整行缩进只在选中文字时执行（已在executeSmartTab中处理）
      await vscode.commands.executeCommand('tab');
    }
  }

  /**
   * 切换代码块折叠状态
   */
  private static async toggleCodeBlockFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令切换代码块折叠状态
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
  }

  /**
   * 切换 Property 抽屉折叠状态
   */
  private static async togglePropertyDrawerFold(editor: vscode.TextEditor, position: vscode.Position) {
    // 保存当前光标位置，确保折叠后光标不会跳转
    const savedPosition = editor.selection.active;
    
    // 使用 VS Code 的折叠命令切换 Property 抽屉折叠状态
    await vscode.commands.executeCommand('editor.toggleFold');
    
    // 恢复光标位置
    editor.selection = new vscode.Selection(savedPosition, savedPosition);
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
    
    // 计算光标的相对位置，缩进后需要相应调整
    const cursorCharInLine = position.character;
    const newCursorChar = cursorCharInLine + 2; // 增加了2个空格的缩进

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
    });
    
    // 重新设置光标位置，保持在相对位置
    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
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
    
    // 计算光标的相对位置，反向缩进后需要相应调整
    const cursorCharInLine  = position.character;
    const indentReduction = currentIndent.length - newIndentLength;
    const newCursorChar = Math.max(0, cursorCharInLine - indentReduction);

    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, `${newIndent}${marker} ${content}`);
    });
    
    // 重新设置光标位置，保持在相对位置
    const newPosition = new vscode.Position(position.line, newCursorChar);
    editor.selection = new vscode.Selection(newPosition, newPosition);
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

  /**
   * 解析标题行
   */
  private static parseHeadingLine(lineText: string): HeadingInfo {
    const allKeywords = this.todoKeywordManager.getAllKeywords();
    const keywordRegex = new RegExp(`^(\\*+)\\s+(?:(${allKeywords.map(k => k.keyword).join('|')})\\s+)?(.*)$`);
    const headingMatch = lineText.match(keywordRegex);
    
    if (!headingMatch) {
      return {
        level: 0,
        stars: '',
        todoState: null,
        title: lineText
      };
    }

    return {
      level: headingMatch[1].length,
      stars: headingMatch[1],
      todoState: headingMatch[2] || null,
      title: headingMatch[3] || ''
    };
  }

  /**
   * 确定标题的星号级别
   */
  private static determineStarLevel(editor: vscode.TextEditor, lineNumber: number): string {
    const document = editor.document;
    const line = document.lineAt(lineNumber);
    const lineText = line.text;
    const headingMatch = lineText.match(/^(\*+)\s+(?:(TODO|DONE|NEXT|WAITING|CANCELLED)\s+)?(.*)$/);

    if (headingMatch) {
      return headingMatch[1];
    }
    return '';
  }

  /**
   * 查找当前位置所属的标题
   */
  private static findCurrentHeading(document: vscode.TextDocument, position: vscode.Position): { line: vscode.TextLine, headingInfo: HeadingInfo } | null {
    // 首先检查当前行是否就是标题行
    const currentLine = document.lineAt(position.line);
    const currentHeadingInfo = this.parseHeadingLine(currentLine.text);
    if (currentHeadingInfo.level > 0) {
      return {
        line: currentLine,
        headingInfo: currentHeadingInfo
      };
    }

    // 如果当前行不是标题行，向上查找所属的标题
    for (let lineNumber = position.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      const headingInfo = this.parseHeadingLine(line.text);
      
      if (headingInfo.level > 0) {
        // 找到了一个标题，检查当前位置是否在这个标题的内容范围内
        const nextHeadingLine = this.findNextHeadingLine(document, lineNumber, headingInfo.level);
        
        if (nextHeadingLine === -1 || position.line < nextHeadingLine) {
          // 当前位置在这个标题的内容范围内
          return {
            line: line,
            headingInfo: headingInfo
          };
        }
      }
    }

    return null;
  }

  /**
   * 查找下一个同级或更高级标题的行号
   */
  private static findNextHeadingLine(document: vscode.TextDocument, startLine: number, currentLevel: number): number {
    for (let lineNumber = startLine + 1; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const headingInfo = this.parseHeadingLine(line.text);
      
      if (headingInfo.level > 0 && headingInfo.level <= currentLevel) {
        return lineNumber;
      }
    }
    
    return -1; // 没有找到下一个同级或更高级标题
  }

  /**
   * 生成唯一的 ID（UUID v4 格式）
   */
  private static generateUniqueId(): string {
    // 生成符合 UUID v4 格式的随机 ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * 上下文信息接口
 */
interface ContextInfo {
  type: 'heading' | 'list-item' | 'checkbox' | 'table' | 'code-block' | 'text' | 'code-block-header' | 'property-drawer' | 'property-drawer-header' | 'property-drawer-end' | 'property-item';
  level?: number;
  todoState?: string | null;
  content?: string;
  indent?: number;
  marker?: string;
  checkboxState?: string | null;
  propertyKey?: string;
  propertyValue?: string;
} 

/**
 * 标题信息接口
 */
interface HeadingInfo {
  level: number;
  stars: string;
  todoState: string | null;
  title: string;
} 