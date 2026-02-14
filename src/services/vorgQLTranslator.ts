
import { OrgQLNode } from './vorgQLParser';

export interface TranslationResult {
    where: string;
    params: Record<string, any>;
    groupBy?: string;
}

/**
 * VOrgQLTranslator
 * 
 * 将 OrgQLNode 树转换为 SQLite WHERE 子句
 */
export class VOrgQLTranslator {
    private paramCount = 0;

    /**
     * 翻译 AST 节点
     */
    translate(node: OrgQLNode): TranslationResult {
        this.paramCount = 0;
        const params: Record<string, any> = {};

        let root = node;
        let groupByField: string | undefined;

        // 处理 group-by 包装
        if (node.type.toLowerCase() === 'group-by' && node.args.length >= 2) {
            groupByField = this.mapField(node.args[0].type);
            root = node.args[1];
        }

        const where = this.translateNode(root, params);
        return { where, params, groupBy: groupByField };
    }

    private translateNode(node: OrgQLNode, params: Record<string, any>): string {
        const type = node.type.toLowerCase();

        const keywords = [
            'and', 'or', 'not', 'todo', 'priority', 'file', 'category', 'done',
            'tag', 'deadline', 'scheduled', 'property', 'parent', 'level', 'heading', 'title', 'closed',
            'status', 'state', 'prio', 'dl', 'sc', 'prop', 'up', 'h', '#'
        ];

        // 如果是叶子节点且不是预定义的关键字，则视为文本搜索
        if (node.args.length === 0 && !keywords.includes(type)) {
            const p = this.nextParam();
            params[p] = `%${node.type.toLowerCase()}%`;
            return `(LOWER(title) LIKE ${p} OR LOWER(pinyin_title) LIKE ${p})`;
        }

        switch (type) {
            case 'and':
                return node.args.length > 0 ? `(${node.args.map(arg => this.translateNode(arg, params)).join(' AND ')})` : '1=1';

            case 'or':
                return node.args.length > 0 ? `(${node.args.map(arg => this.translateNode(arg, params)).join(' OR ')})` : '1=1';

            case 'not':
                return node.args.length > 0 ? `NOT (${this.translateNode(node.args[0], params)})` : '1=1';

            case 'todo':
                if (node.args.length === 0) {
                    return "todo_category = 'todo'";
                }
                return this.buildInOrCompareClause('todo_state', node.args, params);

            case 'priority':
                return this.buildInOrCompareClause('priority', node.args, params, (val) => {
                    const p = val.toUpperCase();
                    return /^[A-C]$/.test(p) ? `[#${p}]` : val;
                });

            case 'file':
                return this.buildInClause('file_uri', node.args.map(a => a.type), params);

            case 'done':
                if (node.args.length === 0) {
                    return "todo_category = 'done'";
                }
                return this.buildInClause('todo_category', node.args.map(a => a.type), params);

            case 'level':
                return this.buildInOrCompareClause('level', node.args, params);

            case 'tag':
                return this.buildTagClause(node.args.map(a => a.type), params);

            case 'deadline':
                return this.buildDateClause('deadline', node.args, params);

            case 'scheduled':
                return this.buildDateClause('scheduled', node.args, params);

            case 'closed':
                return this.buildDateClause('closed', node.args, params);

            case 'property':
                return this.buildPropertyClause(node.args, params);

            case 'parent':
                if (node.args.length === 0) return '1=1';
                return this.buildParentClause(node.args.map(a => a.type), params);

            case 'heading':
                if (node.args.length === 0) return '1=1';
                return this.buildHeadingClause(node.args.map(a => a.type), params);

            default:
                // 如果是一个复合列表但操作符未知，视为一个 AND 组合（暂定）
                return `(${node.args.map(arg => this.translateNode(arg, params)).join(' AND ')})`;
        }
    }

    private buildInClause(column: string, values: string[], params: Record<string, any>): string {
        if (values.length === 0) return '1=1';
        const markers = values.map(val => {
            const p = this.nextParam();
            params[p] = val;
            return p;
        });
        return `${column} IN (${markers.join(', ')})`;
    }

    private buildInOrCompareClause(column: string, args: OrgQLNode[], params: Record<string, any>, normalizer?: (val: string) => string): string {
        if (args.length === 0) return '1=1';

        const firstArg = args[0].type;
        const operators = ['>', '<', '>=', '<=', '=', '!='];

        if (operators.includes(firstArg) && args.length >= 2) {
            const op = firstArg;
            let val = args[1].type;
            if (normalizer) val = normalizer(val);
            const p = this.nextParam();
            params[p] = val;
            return `${column} ${op} ${p}`;
        }

        const values = args.map(a => normalizer ? normalizer(a.type) : a.type);
        return this.buildInClause(column, values, params);
    }

    private buildTagClause(tags: string[], params: Record<string, any>): string {
        if (tags.length === 0) return '1=1';
        const markers = tags.map(tag => {
            const p = this.nextParam();
            params[p] = tag;
            return p;
        });
        return `EXISTS (
            SELECT 1 FROM heading_tags ht 
            WHERE ht.file_uri = headings.file_uri 
              AND ht.heading_line = headings.start_line 
              AND ht.tag IN (${markers.join(', ')})
        )`;
    }

    private buildDateClause(column: string, args: OrgQLNode[], params: Record<string, any>): string {
        if (args.length === 0) {
            return `${column} IS NOT NULL`;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let from: number | undefined;
        let to: number | undefined;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i].type;
            if (arg === ':from' && i + 1 < args.length) {
                from = this.parseDateToTimestamp(args[++i].type, now);
            } else if (arg === ':to' && i + 1 < args.length) {
                to = this.parseDateToTimestamp(args[++i].type, now) + 86399;
            } else if (arg === ':on' && i + 1 < args.length) {
                from = this.parseDateToTimestamp(args[++i].type, now);
                to = from + 86399;
            } else if (i === 0 && !arg.startsWith(':')) {
                from = this.parseDateToTimestamp(arg, now);
                to = from + 86399;
            }
        }

        if (from !== undefined && to !== undefined) {
            const p1 = this.nextParam();
            const p2 = this.nextParam();
            params[p1] = from;
            params[p2] = to;
            return `${column} BETWEEN ${p1} AND ${p2}`;
        } else if (from !== undefined) {
            const p = this.nextParam();
            params[p] = from;
            return `${column} >= ${p}`;
        } else if (to !== undefined) {
            const p = this.nextParam();
            params[p] = to;
            return `${column} <= ${p}`;
        }

        return '1=1';
    }

    private parseDateToTimestamp(dateStr: string, now: Date): number {
        if (dateStr === 'today') {
            return Math.floor(now.getTime() / 1000);
        }

        const relativeMatch = dateStr.match(/^today([+-])(\d+)([dwmy]?)$/);
        if (relativeMatch) {
            const op = relativeMatch[1];
            const val = parseInt(relativeMatch[2], 10);
            const unit = relativeMatch[3] || 'd';
            const offset = op === '+' ? val : -val;

            const targetDate = new Date(now);
            if (unit === 'd') targetDate.setDate(now.getDate() + offset);
            else if (unit === 'w') targetDate.setDate(now.getDate() + offset * 7);
            else if (unit === 'm') targetDate.setMonth(now.getMonth() + offset);
            else if (unit === 'y') targetDate.setFullYear(now.getFullYear() + offset);

            return Math.floor(targetDate.getTime() / 1000);
        }

        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return 0;
        parsed.setHours(0, 0, 0, 0);
        return Math.floor(parsed.getTime() / 1000);
    }

    private buildPropertyClause(args: OrgQLNode[], params: Record<string, any>): string {
        if (args.length < 2) return '1=1';

        const key = args[0].type;
        const opOrVal = args[1].type;
        const operators = ['>', '<', '>=', '<=', '=', '!='];

        if (operators.includes(opOrVal) && args.length >= 3) {
            const op = opOrVal;
            const val = args[2].type;
            const p = this.nextParam();
            params[p] = val;
            return `json_extract(properties, '$.' || ${this.escapeJsonProperty(key)}) ${op} ${p}`;
        } else {
            const p = this.nextParam();
            params[p] = opOrVal;
            return `json_extract(properties, '$.' || ${this.escapeJsonProperty(key)}) = ${p}`;
        }
    }

    private buildParentClause(titles: string[], params: Record<string, any>): string {
        if (titles.length === 0) return '1=1';
        const subClauses = titles.map(title => {
            const p = this.nextParam();
            params[p] = `%${title.toLowerCase()}%`;
            return `(LOWER(title) LIKE ${p} OR LOWER(pinyin_title) LIKE ${p})`;
        });
        const subQuery = `SELECT id FROM headings WHERE ${subClauses.join(' OR ')}`;
        return `parent_id IN (${subQuery})`;
    }

    private buildHeadingClause(terms: string[], params: Record<string, any>): string {
        if (terms.length === 0) return '1=1';
        const clauses = terms.map(term => {
            const p = this.nextParam();
            params[p] = `%${term.toLowerCase()}%`;
            return `(LOWER(title) LIKE ${p} OR LOWER(pinyin_title) LIKE ${p})`;
        });
        return clauses.length === 1 ? clauses[0] : `(${clauses.join(' AND ')})`;
    }

    private escapeJsonProperty(key: string): string {
        return `'${key.replace(/'/g, "''")}'`;
    }

    private nextParam(): string {
        return `$v${this.paramCount++}`;
    }

    private mapField(field: string): string {
        const mapping: Record<string, string> = {
            'file': 'file_uri',
            'status': 'todo_state',
            'todo': 'todo_state',
            'done': 'todo_category',
            'priority': 'priority',
            'prio': 'priority',
            'tag': 'tag',
            'level': 'level'
        };
        return mapping[field.toLowerCase()] || field;
    }
}
