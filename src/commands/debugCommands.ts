/**
 * 调试命令模块
 * 
 * 提供开发和调试辅助命令，用于开发和测试阶段。
 * 
 * @module commands/debugCommands
 */

import * as vscode from 'vscode';
import { SyntaxHighlighter } from '../syntaxHighlighter';

/**
 * 调试命令类
 * 
 * 提供调试和开发辅助命令的实现。
 * 
 * 当前功能：
 * - 刷新语法高亮：手动刷新当前文档的语法高亮
 * 
 * @class DebugCommands
 */
export class DebugCommands {
    private static syntaxHighlighter: SyntaxHighlighter;

    static registerCommands(context: vscode.ExtensionContext): void {
        this.syntaxHighlighter = new SyntaxHighlighter();

        // 注册刷新语法高亮命令
        const refreshHighlightingCommand = vscode.commands.registerCommand('vorg.debug.refreshHighlighting', () => {
            DebugCommands.refreshHighlighting();
        });

        context.subscriptions.push(refreshHighlightingCommand);
    }

    /**
     * 刷新语法高亮
     */
    private static refreshHighlighting(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'org') {
            vscode.window.showWarningMessage('请打开一个 .org 文件');
            return;
        }

        this.syntaxHighlighter.refreshHighlighting();
        this.syntaxHighlighter.applyHighlighting(editor);
        vscode.window.showInformationMessage('语法高亮已刷新');
    }
} 