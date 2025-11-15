/**
 * 编辑命令协调器模块
 * 
 * 提供 org-mode 编辑功能的命令注册和协调，模拟 Emacs org-mode 的编辑行为。
 * 包括智能插入、分割、折叠、TODO 管理、Property 管理等编辑操作。
 * 
 * ## 为什么需要协调器？
 * 
 * 编辑命令需要根据当前编辑位置的上下文（标题、列表、表格、代码块等）智能执行不同的操作。
 * 协调器的作用是：
 * 1. **统一命令注册**：集中注册所有编辑相关的 VS Code 命令
 * 2. **上下文分析**：使用 `ContextAnalyzer` 分析当前编辑位置的上下文
 * 3. **路由分发**：根据上下文类型，将操作路由到对应的子命令模块
 * 4. **统一接口**：为外部提供统一的命令接口，隐藏内部实现细节
 * 
 * ## 具体实现位置
 * 
 * 具体的编辑操作实现在 `editing/` 子目录下的各个命令类中：
 * 
 * 协调器通过 `ContextAnalyzer` 分析上下文后，调用相应子模块的静态方法执行具体操作。
 * 
 * @module commands/editingCommands
 */

import * as vscode from 'vscode';
import { TodoKeywordManager } from '../utils/todoKeywordManager';
import { ContextAnalyzer } from '../parsers/contextAnalyzer';
import { HeadingParser } from '../parsers/headingParser';
import { HeadingCommands } from './editing/headingCommands';
import { TodoStateCommands } from './editing/todoStateCommands';
import { PropertyCommands } from './editing/propertyCommands';
import { ListCommands } from './editing/listCommands';
import { TableCommands } from './editing/tableCommands';
import { CodeBlockCommands } from './editing/codeBlockCommands';

/**
 * 编辑命令协调器
 * 
 * 根据当前编辑位置的上下文（标题、列表、表格、代码块等），
 * 智能执行相应的编辑操作。协调各个子命令模块，实现统一的编辑命令接口。
 * 
 * 主要功能：
 * - org-meta-return (M-RET): 根据上下文智能插入元素
 * - org-ctrl-return (C-RET): 分割当前结构元素
 * - 智能回车 (Ctrl+Meta+Enter): 在子树末尾插入同级元素
 * - 智能 TAB: 根据上下文执行折叠或缩进
 * - 智能 Shift+TAB: 反向缩进或移动到前一个单元格
 * - TODO 状态管理
 * - Property 管理
 * - 子树升级/降级
 * 
 * @class EditingCommands
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

    // org-ctrl-return 命令 (Ctrl+Enter)
    const ctrlReturnCommand = vscode.commands.registerCommand('vorg.ctrlReturn', () => {
      EditingCommands.executeCtrlReturn();
    });

    // 升级子树命令 (org-promote-subtree)
    const promoteSubtreeCommand = vscode.commands.registerCommand('vorg.promoteSubtree', (lineNumber?: number) => {
      EditingCommands.promoteSubtree(lineNumber);
    });

    // 降级子树命令 (org-demote-subtree)
    const demoteSubtreeCommand = vscode.commands.registerCommand('vorg.demoteSubtree', (lineNumber?: number) => {
      EditingCommands.demoteSubtree(lineNumber);
    });

    context.subscriptions.push(
      metaReturnCommand,
      smartReturnCommand,
      insertTodoCommand,
      setTodoStateCommand,
      smartTabCommand,
      smartShiftTabCommand,
      setPropertyCommand,
      ctrlReturnCommand,
      promoteSubtreeCommand,
      demoteSubtreeCommand
    );
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
    const context = ContextAnalyzer.analyzeContext(document, position);
    
    let newCursorPosition: vscode.Position | null = null;
    
    await editor.edit(editBuilder => {
      switch (context.type) {
        case 'heading':
          newCursorPosition = HeadingCommands.insertHeadingAfterSubtree(editBuilder, editor, context);
          break;
        case 'list-item':
          newCursorPosition = ListCommands.insertListItem(editBuilder, editor, context, isAtBeginning);
          break;
        case 'table':
          TableCommands.insertTableRow(editBuilder, editor, context);
          break;
        case 'code-block':
          CodeBlockCommands.insertCodeBlockLine(editBuilder, editor, context);
          break;
        case 'checkbox':
          newCursorPosition = ListCommands.insertCheckboxItem(editBuilder, editor, context);
          break;
        case 'property-drawer':
        case 'property-item':
          PropertyCommands.insertPropertyItem(editBuilder, editor);
          break;
        case 'property-drawer-header':
          PropertyCommands.insertPropertyItem(editBuilder, editor);
          break;
        case 'property-drawer-end':
          EditingCommands.insertDefaultNewline(editBuilder, editor, position, isAtBeginning);
          break;
        default:
          // 普通文本：插入新标题
          EditingCommands.insertHeadingInText(editBuilder, editor, position);
          break;
      }
    });
    
    // 在 edit 完成后设置光标位置
    if (newCursorPosition) {
      editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
    }
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
    const context = ContextAnalyzer.analyzeContext(document, position);

     if (context.type === 'heading') {
       // 在子树末尾插入新标题
      const subtreeEnd = HeadingParser.findSubtreeEnd(document, position);
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

    await HeadingCommands.insertTodoHeading(editor);
  }

  /**
   * 执行 org-ctrl-return 功能 (C-RET)
   * 在光标处分割当前结构元素
   */
  private static async executeCtrlReturn() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;
    const context = ContextAnalyzer.analyzeContext(document, position);
    
    let newCursorPosition: vscode.Position | null = null;
    
    await editor.edit(editBuilder => {
      switch (context.type) {
        case 'heading':
          newCursorPosition = HeadingCommands.splitHeading(editBuilder, editor, context, position);
          break;
        case 'list-item':
          newCursorPosition = ListCommands.splitListItem(editBuilder, editor, context, position);
          break;
        case 'checkbox':
          newCursorPosition = ListCommands.splitCheckboxItem(editBuilder, editor, context, position);
          break;
        case 'table':
          TableCommands.insertTableRow(editBuilder, editor, context);
          break;
        default:
          newCursorPosition = EditingCommands.splitTextIntoHeading(editBuilder, editor, position);
          break;
      }
    });
    
    // 在 edit 完成后设置光标位置
    if (newCursorPosition) {
      editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
    }
  }

  /**
   * 设置Property（模拟org-set-property行为）
   */
  private static async orgSetProperty() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    await PropertyCommands.orgSetProperty(editor);
  }

  /**
   * 设置特定的TODO状态
   */
  private static async setTodoState(targetState?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    await TodoStateCommands.setTodoState(editor, targetState);
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
    const context = ContextAnalyzer.analyzeContext(document, position);
    
    switch (context.type) {
      case 'heading':
        // 在标题上：切换折叠状态
        await HeadingCommands.toggleHeadingFold(editor, position);
        break;
      case 'list-item':
      case 'checkbox':
        // 在列表项上：智能判断 - 有子项时折叠，无子项时缩进
        await ListCommands.toggleListFold(editor, position);
        break;
      case 'table':
        // 在表格中：移动到下一个单元格
        await TableCommands.moveToNextTableCell(editor, position);
        break;
      case 'code-block':
        // 在代码块中：执行正常缩进
        await vscode.commands.executeCommand('tab');
        break;
      case 'code-block-header':
        // 在代码块标题上：切换代码块的折叠状态
        await CodeBlockCommands.toggleCodeBlockFold(editor, position);
        break;
      case 'property-drawer-header':
        // 在 Property 抽屉标题上：切换折叠状态
        await CodeBlockCommands.togglePropertyDrawerFold(editor, position);
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
    const context = ContextAnalyzer.analyzeContext(document, position);
    
    switch (context.type) {
      case 'list-item':
      case 'checkbox':
        // 在列表项上：减少缩进级别（备用功能）
        await ListCommands.decreaseListIndent(editor, position);
        break;
      case 'table':
        // 在表格中：移动到前一个单元格
        await TableCommands.moveToPreviousTableCell(editor, position);
        break;
      default:
        // 其他情况：执行正常反向缩进
        await vscode.commands.executeCommand('outdent');
        break;
    }
  }

  /**
   * 在普通文本中插入新标题
   */
  private static insertHeadingInText(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    position: vscode.Position
  ) {
    const document = editor.document;
    
    // 查找所属标题以确定级别
    const currentHeading = HeadingCommands.findCurrentHeading(document, position);
    const level = currentHeading ? currentHeading.headingInfo.level : 1;
    const stars = '*'.repeat(level);
    
    // 在当前行末尾插入新标题
    const line = document.lineAt(position.line);
    editBuilder.insert(line.range.end, `\n${stars} \n`);
    
    // 移动光标到新标题的标题文本位置（插入换行后，新标题在当前行的下一行）
    const newCursorPosition = new vscode.Position(position.line + 1, stars.length + 1);
    editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
  }

  /**
   * 分割普通文本并创建新标题
   * 返回光标应该移动到的位置
   */
  private static splitTextIntoHeading(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    position: vscode.Position
  ): vscode.Position {
    const document = editor.document;
    const line = document.lineAt(position.line);
    
    // 查找所属标题以确定级别
    const currentHeading = HeadingCommands.findCurrentHeading(document, position);
    const level = currentHeading ? currentHeading.headingInfo.level : 1;
    const stars = '*'.repeat(level);
    
    // 在光标处分割，将后半部分移入新标题
    const restOfLine = line.text.substring(position.character);
    editBuilder.delete(new vscode.Range(position, line.range.end));
    editBuilder.insert(position, `\n${stars} ${restOfLine.trim()}`);
    
    // 返回光标应该移动到的位置（插入换行后，新标题在当前行的下一行）
    return new vscode.Position(position.line + 1, stars.length + 1);
  }

  /**
   * 插入默认换行
   */
  private static insertDefaultNewline(
    editBuilder: vscode.TextEditorEdit,
    editor: vscode.TextEditor,
    position: vscode.Position,
    isAtBeginning: boolean
  ) {
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
   * 升级子树
   */
  private static async promoteSubtree(lineNumber?: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }
    
    // 如果提供了行号，先移动光标到该行
    if (lineNumber !== undefined) {
      const position = new vscode.Position(lineNumber, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
    
    await HeadingCommands.promoteSubtree(editor);
  }

  /**
   * 降级子树
   */
  private static async demoteSubtree(lineNumber?: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }
    
    // 如果提供了行号，先移动光标到该行
    if (lineNumber !== undefined) {
      const position = new vscode.Position(lineNumber, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
    
    await HeadingCommands.demoteSubtree(editor);
  }
}
