import * as vscode from 'vscode';
import { HeadingParser } from '../../parsers/headingParser';
import { Logger } from '../../utils/logger';

/**
 * 优先级命令处理类
 * 
 * 负责 Org-mode 标题优先级的循环切换
 */
export class PriorityCommands {

    /**
     * 注册优先级相关命令
     */
    static registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('vorg.setPriorityUp', () => this.cyclePriority(true)),
            vscode.commands.registerCommand('vorg.setPriorityDown', () => this.cyclePriority(false))
        );
    }

    /**
     * 循环切换优先级
     * @param up - 是否向上切换 (C -> B -> A -> null)
     */
    private static async cyclePriority(up: boolean): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        const line = document.lineAt(position.line);

        // 只有标题行可以设置优先级
        if (!HeadingParser.isHeadingLine(line.text)) {
            return;
        }

        const headingInfo = HeadingParser.parseHeading(line.text);
        const priorities = [null, '[#C]', '[#B]', '[#A]'];

        let currentIndex = priorities.indexOf(headingInfo.priority);
        if (currentIndex === -1) {
            currentIndex = 0;
        }

        let nextIndex: number;
        if (up) {
            // 循环逻辑: null -> [#C] -> [#B] -> [#A] -> null
            // 实际上通常 [Shift+Up] 是 A -> B -> C -> null 还是什么?
            // Emacs: S-Up 是 C -> B -> A -> None
            // 我们按照 Emacs 逻辑: Up 是提升优先级 (None -> C -> B -> A)
            nextIndex = (currentIndex + 1) % priorities.length;
        } else {
            nextIndex = (currentIndex - 1 + priorities.length) % priorities.length;
        }

        const nextPriority = priorities[nextIndex];
        const newLineText = HeadingParser.buildHeadingLine(
            headingInfo.level,
            headingInfo.title,
            headingInfo.todoKeyword,
            nextPriority
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(line.range, newLineText);
        });

        Logger.info(`Updated priority to ${nextPriority || 'None'}`);
    }
}
