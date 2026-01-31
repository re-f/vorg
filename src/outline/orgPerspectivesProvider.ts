import * as vscode from 'vscode';

/**
 * 侧边栏透视项类型
 */
export enum PerspectiveItemType {
    Folder,      // 顶层透视视图节点
    Group,       // 分组节点 (如 "File: work.org")
    Heading      // 具体的标题条目
}

/**
 * 侧边栏透视项
 */
export class PerspectiveItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: PerspectiveItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public query?: string,
        description?: string
    ) {
        super(label, collapsibleState);
        this.description = description;

        if (type === PerspectiveItemType.Folder) {
            this.contextValue = 'perspective';
            this.iconPath = new vscode.ThemeIcon('compass');
        } else if (type === PerspectiveItemType.Group) {
            this.iconPath = new vscode.ThemeIcon('symbol-folder');
            this.contextValue = 'group';
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
}

/**
 * 模拟 VOrg-QL 语法展示功能器
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
        if (!element) {
            // 顶层透视：通过 S-Expression 定义
            return [
                new PerspectiveItem(
                    '� 紧急看板',
                    PerspectiveItemType.Folder,
                    vscode.TreeItemCollapsibleState.Expanded,
                    '(group-by file (and (todo "TODO") (p "A")))',
                    '按文件分组的高优先级任务'
                ),
                new PerspectiveItem(
                    '🏷️ 标签视图',
                    PerspectiveItemType.Folder,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    '(group-by tag (todo "NEXT"))',
                    '按标签聚合的下一步行动'
                )
            ];
        }

        // 如果点击的是 Folder，且带有 group-by 模拟展示
        if (element.type === PerspectiveItemType.Folder) {
            if (element.label.includes('紧急看板')) {
                return [
                    new PerspectiveItem('📄 work.org', PerspectiveItemType.Group, vscode.TreeItemCollapsibleState.Expanded),
                    new PerspectiveItem('� project-x.org', PerspectiveItemType.Group, vscode.TreeItemCollapsibleState.Collapsed)
                ];
            }
            return [];
        }

        // 如果点击的是 Group，展示具体的 Heading
        if (element.type === PerspectiveItemType.Group) {
            if (element.label === '📄 work.org') {
                return [
                    this.createMockHeading('修复系统崩溃 Bug', 'TODO', 'A', 'work.org'),
                    this.createMockHeading('更新架构路线图', 'TODO', 'A', 'work.org')
                ];
            }
        }

        return [];
    }

    private createMockHeading(label: string, todo: string, priority: string, file: string): PerspectiveItem {
        const item = new PerspectiveItem(label, PerspectiveItemType.Heading, vscode.TreeItemCollapsibleState.None);
        item.description = `${todo} [${priority}]`;

        if (priority === 'A') {
            item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }

        item.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: []
        };

        return item;
    }
}

/**
 * 此时解析只需展示逻辑闭环
 */
export function parseLabelAndDescription(input: string) {
    const parts = input.split('#').map(p => p.trim());
    return {
        label: parts[0] || 'New Perspective',
        description: parts[1] || ''
    };
}
