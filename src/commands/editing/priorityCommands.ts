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
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;
            const line = document.lineAt(position.line);

            // 只有在标题行本身时才触发优先级调整
            if (!HeadingParser.isHeadingLine(line.text)) {
                // 如果不是标题行，触发 VS Code 默认的 Shift+Up/Down 行为（向上/下选中）
                await vscode.commands.executeCommand(up ? 'cursorUpSelect' : 'cursorDownSelect');
                return;
            }

            const headingInfo = HeadingParser.parseHeading(line.text);

            /**
             * 语义顺序: 空 (None) < [#C] (低) < [#B] (中) < [#A] (高)
             * 循环逻辑: [null, '[#C]', '[#B]', '[#A]']
             * Up:   None -> C -> B -> A -> None
             * Down: None -> A -> B -> C -> None
             */
            const priorities = [null, '[#C]', '[#B]', '[#A]'];

            // 找到当前匹配的索引
            let currentIndex = priorities.indexOf(headingInfo.priority);
            if (currentIndex === -1) {
                currentIndex = 0; // 默认视为 None
            }

            let nextIndex: number;
            if (up) {
                nextIndex = (currentIndex + 1) % priorities.length;
            } else {
                nextIndex = (currentIndex - 1 + priorities.length) % priorities.length;
            }

            const nextPriority = priorities[nextIndex];
            const newLineText = HeadingParser.buildHeadingLine(
                headingInfo.level,
                headingInfo.text || headingInfo.title,
                headingInfo.todoKeyword,
                nextPriority,
                headingInfo.tags
            );

            const success = await editor.edit(editBuilder => {
                editBuilder.replace(line.range, newLineText);
            });

            if (success) {
                Logger.info(`Updated priority to ${nextPriority || 'None'}`);
            }
        } catch (error) {
            Logger.error('Error in cyclePriority', error);
        }
    }
}
