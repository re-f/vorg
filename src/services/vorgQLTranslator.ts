import { OrgQLNode } from './vorgQLParser';

/**
 * 翻译结果
 */
export interface TranslationResult {
    where: string;
    params: Record<string, any>;
    groupBy?: string;
}

/**
 * VOrg-QL 翻译器
 * 
 * 负责将 AST 转换为 SQLite 的 WHERE 子句。
 */
export class VOrgQLTranslator {
    private paramCount = 0;

    /**
     * 将解析后的 AST 翻译为 SQL 片段和参数
     */
    public translate(node: OrgQLNode): TranslationResult {
        this.paramCount = 0;
        const params: Record<string, any> = {};

        // 如果根节点是 group-by，将其剥离并记录分组字段
        if (node.type === 'group-by' && node.args.length >= 2) {
            const groupByField = this.mapField(node.args[0].type);
            const subQuery = node.args[1];
            return {
                where: this.translateNode(subQuery, params),
                params,
                groupBy: groupByField
            };
        }

        return {
            where: this.translateNode(node, params),
            params
        };
    }

    /**
     * 递归构建 WHERE 子句
     */
    private translateNode(node: OrgQLNode, params: Record<string, any>): string {
        const type = node.type.toLowerCase();

        // 如果是叶子节点且不是预定义的关键字，则视为文本搜索
        if (node.args.length === 0) {
            const p = this.nextParam();
            params[p] = `%${node.type.toLowerCase()}%`;
            return `(LOWER(title) LIKE ${p} OR LOWER(pinyin_title) LIKE ${p})`;
        }

        switch (type) {
            case 'and':
                if (node.args.length === 0) return '1=1';
                return `(${node.args.map(arg => this.translateNode(arg, params)).join(' AND ')})`;

            case 'or':
                if (node.args.length === 0) return '0=1';
                return `(${node.args.map(arg => this.translateNode(arg, params)).join(' OR ')})`;

            case 'not':
                return node.args.length > 0 ? `NOT (${this.translateNode(node.args[0], params)})` : '1=1';

            case 'todo':
                return this.buildInClause('todo_state', node.args.map(a => a.type), params);

            case 'priority':
                return this.buildInClause('priority', node.args.map(a => a.type), params);

            case 'file':
                return this.buildInClause('file_uri', node.args.map(a => a.type), params);

            case 'tag':
                return this.buildTagClause(node.args.map(a => a.type), params);

            default:
                // 如果是一个复合列表但操作符未知，视为一个 AND 组合（暂定）
                return `(${node.args.map(arg => this.translateNode(arg, params)).join(' AND ')})`;
        }
    }

    private buildInClause(column: string, values: string[], params: Record<string, any>): string {
        if (values.length === 0) return '1=1';
        const markers = values.map(v => {
            const p = this.nextParam();
            params[p] = v;
            return p;
        });
        return `${column} IN (${markers.join(', ')})`;
    }

    private buildTagClause(tags: string[], params: Record<string, any>): string {
        if (tags.length === 0) return '1=1';
        const markers = tags.map(t => {
            const p = this.nextParam();
            params[p] = t;
            return p;
        });
        return `EXISTS (
            SELECT 1 FROM heading_tags ht 
            WHERE ht.file_uri = headings.file_uri 
              AND ht.heading_line = headings.start_line 
              AND ht.tag IN (${markers.join(', ')})
        )`;
    }

    private nextParam(): string {
        return `$v${this.paramCount++}`;
    }

    private mapField(field: string): string {
        const mapping: Record<string, string> = {
            'file': 'file_uri',
            'status': 'todo_state',
            'todo': 'todo_state',
            'priority': 'priority',
            'prio': 'priority',
            'tag': 'tag'
        };
        return mapping[field.toLowerCase()] || field;
    }
}
