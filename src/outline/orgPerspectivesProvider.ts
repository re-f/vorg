import * as vscode from 'vscode';
import * as path from 'path';
import { QueryService } from '../services/queryService';
import { VOrgQLParser } from '../services/vorgQLParser';
import { OrgHeading } from '../database/types';

/**
 * 侧边栏透视项类型
 */
export enum PerspectiveItemType {
    Folder,      // 顶层透视视图节点
    Group,       // 分组节点 (如 "File: work.org")
    Heading      // 具体的标题条目
}

/**
 * 侧边栏透视配置
 */
interface PerspectiveConfig {
    label: string;
    query: string;
    description: string;
}

/**
 * 侧边栏透视项
 */
export class PerspectiveItem extends vscode.TreeItem {
    public headings: OrgHeading[] = []; // 用于 Group 节点传递数据

    constructor(
        public label: string,
        public readonly type: PerspectiveItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public query?: string,
        description?: string,
        public readonly headingData?: OrgHeading
    ) {
        super(label, collapsibleState);
        this.description = description;

        if (type === PerspectiveItemType.Folder) {
            this.contextValue = 'perspective';
            this.iconPath = new vscode.ThemeIcon('compass');
            this.tooltip = `Query: ${query}`;
        } else if (type === PerspectiveItemType.Group) {
            this.iconPath = new vscode.ThemeIcon('symbol-folder');
            this.contextValue = 'group';
        } else if (type === PerspectiveItemType.Heading && headingData) {
            // 设置标题项的图标和命令
            this.iconPath = this.getTodoIcon(headingData.todoState);
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(headingData.fileUri),
                    { selection: new vscode.Range(headingData.startLine, 0, headingData.startLine, 0) }
                ]
            };
            // 构造详细的 Description
            const parts = [];
            if (headingData.todoState) parts.push(headingData.todoState);
            if (headingData.priority) parts.push(`[#${headingData.priority}]`);
            this.description = parts.join(' ');
        }
    }

    private getTodoIcon(state?: string): vscode.ThemeIcon {
        if (!state) return new vscode.ThemeIcon('circle-outline');
        if (['DONE', 'CANCELLED', 'CNCL'].includes(state)) {
            return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('debugIcon.stepOverForeground'));
        }
        if (['TODO', 'NEXT', 'WAITING', 'HOLD'].includes(state)) {
            return new vscode.ThemeIcon('circle-large-outline', new vscode.ThemeColor('charts.blue'));
        }
        return new vscode.ThemeIcon('circle-outline');
    }
}

/**
 * 侧边栏透视提供器
 */
export class OrgPerspectivesProvider implements vscode.TreeDataProvider<PerspectiveItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PerspectiveItem | undefined | null | void> = new vscode.EventEmitter<PerspectiveItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PerspectiveItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentQuery: string = '';

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setFilter(query: string): void {
        this.currentQuery = query;
        this.refresh();
    }

    getTreeItem(element: PerspectiveItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PerspectiveItem): Promise<PerspectiveItem[]> {
        // 1. 顶层
        if (!element) {
            // 如果有临时搜索 Filter，将其作为一个虚拟的展开 Folder 处理
            if (this.currentQuery) {
                const tempFolder = new PerspectiveItem(
                    'Search Results',
                    PerspectiveItemType.Folder,
                    vscode.TreeItemCollapsibleState.Expanded,
                    this.currentQuery
                );
                return this.resolveFolderChildren(tempFolder);
            }

            // 否则读取配置
            const config = vscode.workspace.getConfiguration('vorg').get<PerspectiveConfig[]>('perspectives') || [];
            return config.map(c => new PerspectiveItem(
                c.label,
                PerspectiveItemType.Folder,
                vscode.TreeItemCollapsibleState.Collapsed,
                c.query,
                c.description
            ));
        }

        // 2. Folder 层：执行查询并根据 group-by 决定返回 Group 还是 Heading
        if (element.type === PerspectiveItemType.Folder) {
            return this.resolveFolderChildren(element);
        }

        // 3. Group 层：直接返回缓存的 Headings
        if (element.type === PerspectiveItemType.Group && element.headings) {
            return element.headings.map(h => new PerspectiveItem(
                h.title,
                PerspectiveItemType.Heading,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                h
            ));
        }

        return [];
    }

    /**
     * 处理 Folder 节点的子项解析（执行查询、分组）
     */
    private resolveFolderChildren(folder: PerspectiveItem): PerspectiveItem[] {
        if (!folder.query) return [];

        try {
            // 2.1 执行查询
            const headings = QueryService.executeSync(folder.query);

            // 2.2 检查 group-by
            const ast = VOrgQLParser.parse(folder.query);
            const { type: groupType } = VOrgQLParser.extractGroupBy(ast);

            if (groupType) {
                // 需要分组
                const grouped = this.groupHeadings(headings, groupType);
                const groupItems: PerspectiveItem[] = [];

                for (const [key, groupHeadings] of grouped.entries()) {
                    const groupItem = new PerspectiveItem(
                        key || '(No Group)',
                        PerspectiveItemType.Group,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        `${groupHeadings.length} items`
                    );
                    groupItem.headings = groupHeadings;

                    // 定制图标
                    if (groupType === 'tag') groupItem.iconPath = new vscode.ThemeIcon('tag');
                    if (groupType === 'status' || groupType === 'todo') groupItem.iconPath = new vscode.ThemeIcon('checklist');
                    if (groupType === 'priority') groupItem.iconPath = new vscode.ThemeIcon('alert');

                    groupItems.push(groupItem);
                }
                return groupItems.sort((a, b) => a.label.localeCompare(b.label));
            } else {
                // 不需要分组，直接返回 Heading Items
                return headings.map(h => new PerspectiveItem(
                    h.title,
                    PerspectiveItemType.Heading,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    undefined,
                    h
                ));
            }
        } catch (error) {
            console.error('Error fetching perspective:', error);
            return [new PerspectiveItem(`Error: ${error}`, PerspectiveItemType.Heading, vscode.TreeItemCollapsibleState.None)];
        }
    }

    /**
     * 在内存中对结果进行分组
     */
    private groupHeadings(headings: OrgHeading[], type: string): Map<string, OrgHeading[]> {
        const groups = new Map<string, OrgHeading[]>();

        const addToGroup = (key: string, h: OrgHeading) => {
            const k = key || '(None)';
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k)?.push(h);
        };

        for (const h of headings) {
            switch (type) {
                case 'file':
                case 'src':
                    addToGroup(path.basename(h.fileUri), h);
                    break;
                case 'tag':
                case '#':
                    if (h.tags && h.tags.length > 0) {
                        h.tags.forEach(t => addToGroup(t, h));
                    } else {
                        addToGroup('(No Tags)', h);
                    }
                    break;
                case 'status':
                case 'todo':
                    addToGroup(h.todoState || '(No Status)', h);
                    break;
                case 'priority':
                case 'prio':
                case 'p':
                    addToGroup(h.priority || '(No Priority)', h);
                    break;
                default:
                    addToGroup('All', h);
            }
        }
        return groups;
    }
}

/**
 * 解析标签和描述
 */
export function parseLabelAndDescription(input: string) {
    const parts = input.split('#').map(p => p.trim());
    return {
        label: parts[0] || 'New Perspective',
        description: parts[1] || ''
    };
}
