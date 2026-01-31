import * as vscode from 'vscode';
import { HeadingParser } from '../../parsers/headingParser';
import { OrgSymbolIndexService } from '../../services/orgSymbolIndexService';
import { Logger } from '../../utils/logger';

/**
 * 标签命令处理类
 * 
 * 负责 Org-mode 标题标签的快速设置和编辑
 */
export class TagCommands {

    /**
     * 注册标签相关命令
     */
    static registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('vorg.setTags', (tags?: string[]) => this.setTags(tags))
        );
    }

    /**
     * 设置当前标题的标签
     */
    private static async setTags(providedTags?: string[]): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;

            const { HeadingCommands } = await import('./headingCommands');
            const { getConfigService } = await import('../../services/configService');

            const config = getConfigService();
            const todoKeywords = config.getAllKeywordStrings();

            // 查找当前位置所属的标题
            const headingLineInfo = HeadingCommands.findCurrentHeading(document, position, todoKeywords);
            if (!headingLineInfo) {
                return;
            }

            const { line: headingLine, headingInfo } = headingLineInfo;
            const indexService = OrgSymbolIndexService.getInstance();

            let newTags: string[];

            if (providedTags && Array.isArray(providedTags)) {
                newTags = providedTags;
            } else {
                // Get tags from both sources for maximum coverage
                const inMemoryTags = indexService.getAllTags();
                let dbTags = new Map<string, number>();
                try {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    const { DatabaseConnection } = await import('../../database/connection');
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    const { HeadingRepository } = await import('../../database/headingRepository');
                    const db = DatabaseConnection.getInstance().getDatabase();
                    if (db) {
                        const repo = new HeadingRepository(db);
                        dbTags = repo.getAllTags();
                    }
                } catch (e) {
                    Logger.warn('Failed to get tags from database', e);
                }

                // Merge tags
                const allTagsMap = new Map<string, number>(inMemoryTags);
                for (const [tag, count] of dbTags.entries()) {
                    allTagsMap.set(tag, (allTagsMap.get(tag) || 0) + count);
                }

                const existingTags = headingInfo.tags || [];

                // 准备 QuickPick 项
                const items: vscode.QuickPickItem[] = Array.from(allTagsMap.keys()).map(tag => ({
                    label: tag,
                    description: `${allTagsMap.get(tag)} uses`,
                    picked: existingTags.includes(tag)
                }));

                // 使用 showQuickPick 支持多选
                const selectedItems = await vscode.window.showQuickPick(items, {
                    canPickMany: true,
                    placeHolder: 'Select tags (or type new tags separated by space/colon)',
                    title: 'Set Tags'
                });

                if (selectedItems === undefined) {
                    return; // 用户取消
                }

                const finalTags = selectedItems.map(item => item.label);

                const tagString = await vscode.window.showInputBox({
                    value: finalTags.join(':'),
                    placeHolder: 'tag1:tag2',
                    prompt: 'Enter tags separated by colons (:tag1:tag2:)'
                });

                if (tagString === undefined) {
                    return;
                }

                newTags = tagString.split(':').map(t => t.trim()).filter(t => t.length > 0);
            }

            const newLineText = HeadingParser.updateTags(headingLine.text, newTags, todoKeywords);

            const success = await editor.edit(editBuilder => {
                editBuilder.replace(headingLine.range, newLineText);
            });

            if (success) {
                Logger.info(`Updated tags to :${newTags.join(':')}:`);
            }
        } catch (error) {
            Logger.error('Error in setTags', error);
            vscode.window.showErrorMessage('VOrg Error: Failed to set tags. See output for details.');
        }
    }
}
