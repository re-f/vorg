/**
 * 上下文命令类
 * 
 * 实现类似 org-mode 的 Ctrl+C Ctrl+C 功能，根据当前上下文执行相应的操作。
 * 
 * 当前支持的功能：
 * - checkbox 切换：在 checkbox 列表项上切换完成/未完成状态
 * 
 * 设计为可扩展架构，后续可以轻松添加：
 * - TODO 状态切换
 * - 时间戳更新/删除
 * - 链接打开
 * - 表格对齐
 * - 代码块执行
 * - 等等...
 * 
 * @class ContextCommands
 */

import * as vscode from 'vscode';
import { ContextAnalyzer } from '../../parsers/contextAnalyzer';
import { ListParser } from '../../parsers/listParser';
import { getConfigService } from '../../services/configService';

/**
 * 上下文命令处理器接口
 * 用于定义不同上下文类型的处理逻辑
 */
interface ContextHandler {
  /**
   * 检查是否可以处理当前上下文
   */
  canHandle(context: ReturnType<typeof ContextAnalyzer.analyzeContext>): boolean;

  /**
   * 执行处理逻辑
   */
  handle(editor: vscode.TextEditor, position: vscode.Position, context: ReturnType<typeof ContextAnalyzer.analyzeContext>): Promise<void>;
}

/**
 * Checkbox 切换处理器
 */
class CheckboxToggleHandler implements ContextHandler {
  canHandle(context: ReturnType<typeof ContextAnalyzer.analyzeContext>): boolean {
    return context.type === 'checkbox';
  }

  async handle(editor: vscode.TextEditor, position: vscode.Position, context: ReturnType<typeof ContextAnalyzer.analyzeContext>): Promise<void> {
    const document = editor.document;
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 解析列表项信息
    const listInfo = ListParser.parseListItem(lineText);
    if (!listInfo || !listInfo.hasCheckbox) {
      return;
    }

    // 切换 checkbox 状态
    // 状态转换：' ' (未完成) -> 'X' (完成) -> '-' (部分完成) -> ' ' (未完成)
    const currentState = listInfo.checkboxState || ' ';
    let newState: string;

    switch (currentState) {
      case ' ':
        newState = 'X'; // 未完成 -> 完成
        break;
      case 'X':
        newState = '-'; // 完成 -> 部分完成
        break;
      case '-':
        newState = ' '; // 部分完成 -> 未完成
        break;
      default:
        newState = 'X'; // 默认切换到完成状态
    }

    // 构建新的行文本
    const newLine = ListParser.buildListItemLine(
      listInfo.indent,
      listInfo.marker,
      listInfo.content,
      true,
      newState
    );

    // 应用更改
    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, newLine);
    });
  }
}

/**
 * TODO 状态切换处理器（预留，待实现）
 */
class TodoStateToggleHandler implements ContextHandler {
  canHandle(context: ReturnType<typeof ContextAnalyzer.analyzeContext>): boolean {
    // TODO: 实现 TODO 状态切换逻辑
    // 当光标在标题的 TODO 关键字上时返回 true
    return false; // 暂时禁用
  }

  async handle(editor: vscode.TextEditor, position: vscode.Position, context: ReturnType<typeof ContextAnalyzer.analyzeContext>): Promise<void> {
    // TODO: 实现 TODO 状态切换逻辑
    // 在标题的 TODO 关键字上按 Ctrl+C Ctrl+C 时，循环切换 TODO 状态
  }
}

/**
 * 时间戳处理器（预留，待实现）
 */
class TimestampHandler implements ContextHandler {
  canHandle(context: ReturnType<typeof ContextAnalyzer.analyzeContext>): boolean {
    // TODO: 检测光标是否在时间戳上
    return false; // 暂时禁用
  }

  async handle(editor: vscode.TextEditor, position: vscode.Position, context: ReturnType<typeof ContextAnalyzer.analyzeContext>): Promise<void> {
    // TODO: 实现时间戳更新/删除逻辑
  }
}

/**
 * 链接处理器（预留，待实现）
 */
class LinkHandler implements ContextHandler {
  canHandle(context: ReturnType<typeof ContextAnalyzer.analyzeContext>): boolean {
    // TODO: 检测光标是否在链接上
    return false; // 暂时禁用
  }

  async handle(editor: vscode.TextEditor, position: vscode.Position, context: ReturnType<typeof ContextAnalyzer.analyzeContext>): Promise<void> {
    // TODO: 实现链接打开逻辑
  }
}

/**
 * 上下文命令类
 * 
 * 实现 org-mode 的 Ctrl+C Ctrl+C 功能，根据当前上下文智能执行相应操作。
 */
export class ContextCommands {
  /**
   * 所有可用的上下文处理器
   * 按优先级排序，第一个匹配的处理器将被使用
   */
  private static handlers: ContextHandler[] = [
    new CheckboxToggleHandler(),
    new TodoStateToggleHandler(),
    new TimestampHandler(),
    new LinkHandler(),
  ];

  /**
   * 执行 Ctrl+C Ctrl+C 功能
   * 
   * 根据当前光标位置的上下文，执行相应的操作：
   * - 在 checkbox 上：切换完成/未完成状态
   * - 在 TODO 关键字上：切换 TODO 状态（待实现）
   * - 在时间戳上：更新/删除时间戳（待实现）
   * - 在链接上：打开链接（待实现）
   * - 等等...
   */
  static async executeCtrlCtrl(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'org') {
      return;
    }

    const position = editor.selection.active;
    const document = editor.document;

    // 获取关键词配置
    const config = getConfigService();
    const todoKeywords = config.getAllKeywordStrings();

    // 分析当前上下文
    const context = ContextAnalyzer.analyzeContext(document, position, todoKeywords);

    // 查找第一个可以处理当前上下文的处理器
    const handler = this.handlers.find(h => h.canHandle(context));

    if (handler) {
      await handler.handle(editor, position, context);
    } else {
      // 如果没有找到合适的处理器，可以显示提示信息（可选）
      // vscode.window.showInformationMessage('当前上下文不支持 Ctrl+C Ctrl+C 操作');
    }
  }
}

