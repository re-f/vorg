import * as vscode from 'vscode';
import { HeadingCommands } from './headingCommands';
import { getConfigService } from '../../services/configService';
import { Logger } from '../../utils/logger';

/**
 * 日期相关命令处理类
 * 
 * 负责 Org-mode 标题的 SCHEDULED 和 DEADLINE 设置
 */
export class DateCommands {

    /**
     * 注册日期相关命令
     */
    static registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('vorg.setScheduled', (date?: string) => this.setPlanningDate('SCHEDULED', date)),
            vscode.commands.registerCommand('vorg.setDeadline', (date?: string) => this.setPlanningDate('DEADLINE', date))
        );
    }

    /**
     * 设置计划日期 (SCHEDULED 或 DEADLINE)
     */
    private static async setPlanningDate(type: 'SCHEDULED' | 'DEADLINE', providedDate?: string): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;

            // 获取关键词配置
            const config = getConfigService();
            const todoKeywords = config.getAllKeywordStrings();

            // 查找当前位置所属的标题
            const headingLineInfo = HeadingCommands.findCurrentHeading(document, position, todoKeywords);
            if (!headingLineInfo) {
                vscode.window.showInformationMessage('请将光标放在标题或其内容区域内');
                return;
            }

            const { line: headingLine } = headingLineInfo;
            const headingLineNumber = headingLine.lineNumber;

            let dateStr: string | undefined;

            if (providedDate && typeof providedDate === 'string') {
                dateStr = providedDate;
            } else {
                // 提示输入日期 (简单实现，使用 InputBox)
                const today = new Date();
                const defaultDate = today.toISOString().split('T')[0];
                dateStr = await vscode.window.showInputBox({
                    value: defaultDate,
                    prompt: `Enter ${type} date (YYYY-MM-DD)`,
                    placeHolder: 'YYYY-MM-DD'
                });

                if (!dateStr) {
                    return;
                }
            }

            // 简单的日期校验
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                vscode.window.showErrorMessage('Invalid date format. Please use YYYY-MM-DD.');
                return;
            }

            // 安全获取星期名称，避免 RangeError
            let dayName = '';
            try {
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                    dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                } else {
                    dayName = '???';
                }
            } catch (e) {
                dayName = '???';
                Logger.warn('Failed to parse day name', e);
            }

            const orgTimestamp = `<${dateStr}${dayName ? ' ' + dayName : ''}>`;

            // 查找现有的规划行 (通常在标题后第一行)
            let planningLineNumber = headingLineNumber + 1;
            let foundPlanning = false;
            let planningLineText = '';

            if (planningLineNumber < document.lineCount) {
                const nextLine = document.lineAt(planningLineNumber);
                if (/^\s*(?:SCHEDULED:|DEADLINE:|CLOSED:)/.test(nextLine.text)) {
                    foundPlanning = true;
                    planningLineText = nextLine.text;
                }
            }

            const pattern = new RegExp(`(${type}:\\s*<[^>]+>)`);
            const newEntry = `${type}: ${orgTimestamp}`;

            const success = await editor.edit(editBuilder => {
                if (foundPlanning) {
                    if (pattern.test(planningLineText)) {
                        // 更新已存在的
                        const updatedLine = planningLineText.replace(pattern, newEntry);
                        editBuilder.replace(document.lineAt(planningLineNumber).range, updatedLine);
                    } else {
                        // 在现有规划行添加新的
                        const updatedLine = `${planningLineText.trimEnd()} ${newEntry}`;
                        editBuilder.replace(document.lineAt(planningLineNumber).range, updatedLine);
                    }
                } else {
                    // 插入新规划行 (缩进 2 空格)
                    const headingEnd = document.lineAt(headingLineNumber).range.end;
                    editBuilder.insert(headingEnd, `\n  ${newEntry}`);
                }
            });

            if (success) {
                Logger.info(`Updated ${type} to ${dateStr}`);
            } else {
                Logger.error(`Failed to apply edit for ${type}`);
            }
        } catch (error) {
            Logger.error(`Error in setPlanningDate (${type})`, error);
            vscode.window.showErrorMessage(`VOrg Error: Failed to set ${type}. See output for details.`);
        }
    }
}
