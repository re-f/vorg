import * as vscode from 'vscode';
import { OrgSyntaxHighlighter } from '../syntaxHighlighter';

export class DebugCommands {
    public static registerCommands(context: vscode.ExtensionContext) {
        // 手动触发语法高亮的命令
        const refreshHighlightingCommand = vscode.commands.registerCommand(
            'vorg.debug.refreshHighlighting',
            () => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.languageId === 'org') {
                    console.log('Debug: Manual refresh highlighting triggered');
                    const highlighter = OrgSyntaxHighlighter.getInstance();
                    highlighter.applySyntaxHighlighting(editor);
                    vscode.window.showInformationMessage('Org语法高亮已刷新');
                } else {
                    vscode.window.showWarningMessage('请在Org文件中使用此命令');
                }
            }
        );

        context.subscriptions.push(refreshHighlightingCommand);
    }
} 