import * as vscode from 'vscode';
import { HeadingInfo } from '../types/editingTypes';
import { HeadingCommands } from './headingCommands';
import { HeadingParser } from '../../parsers/headingParser';
import { getConfigService } from '../../services/configService';

/**
 * TODO 状态管理命令类
 * 
 * 提供 TODO 状态的设置和转换日志管理功能，包括：
 * - 设置标题的 TODO 状态
 * - 在状态转换时记录时间戳和日志
 * - 支持自定义 TODO 关键字配置
 * 
 * @class TodoStateCommands
 */
export class TodoStateCommands {

  /**
   * 设置特定的TODO状态
   */
  static async setTodoState(editor: vscode.TextEditor, targetState?: string) {
    const position = editor.selection.active;

    const config = getConfigService();
    const todoKeywordsStrArr = config.getAllKeywordStrings();
    const allKeywordConfigs = config.getAllKeywords();

    // 查找当前位置所属的标题
    const headingLineInfo = HeadingCommands.findCurrentHeading(editor.document, position, todoKeywordsStrArr);
    if (!headingLineInfo) {
      vscode.window.showInformationMessage('请将光标放在标题或其内容区域内');
      return;
    }

    const { line, headingInfo } = headingLineInfo;

    // 如果没有指定目标状态，显示选择列表
    if (targetState === undefined) {
      const items = [
        { label: '(无状态)', value: '' },
        ...allKeywordConfigs.map(k => ({
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
    if (targetState && !config.isValidKeyword(targetState)) {
      vscode.window.showErrorMessage(`无效的TODO状态: ${targetState}`);
      return;
    }

    // 应用状态变更
    await TodoStateCommands.applyTodoStateChange(editor, line, headingInfo, targetState);
  }

  /**
   * 应用TODO状态变更
   */
  static async applyTodoStateChange(
    editor: vscode.TextEditor,
    line: vscode.TextLine,
    headingInfo: HeadingInfo,
    newState: string
  ) {
    const lineText = line.text;

    const config = getConfigService();
    const todoKeywordsStrArr = config.getAllKeywordStrings();

    // 使用HeadingParser重建标题行
    const newLineText = HeadingParser.updateTodoState(
      lineText,
      newState || null,
      todoKeywordsStrArr
    );

    // 应用文本变更
    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, newLineText);
    });

    // 检查是否需要添加时间戳和备注
    const keywordConfig = config.getKeywordConfig(newState);
    if (keywordConfig) {
      await TodoStateCommands.handleStateTransitionLogging(
        editor,
        line.lineNumber,
        keywordConfig,
        headingInfo.todoKeyword,
        newState
      );
    }
  }

  /**
   * 处理状态转换日志记录（时间戳和备注）
   */
  static async handleStateTransitionLogging(
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
}

