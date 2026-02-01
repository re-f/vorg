import parseSExpr = require('s-expression');

/**
 * VOrg-QL 抽象语法树节点
 */
export type OrgQLNode = {
    type: string;
    args: OrgQLNode[];
};

/**
 * VOrg-QL 解析器
 * 
 * 负责将 S-Expression 字符串解析为结构化的 AST，
 * 并提供元数据提取（如 group-by 提取）。
 */
export class VOrgQLParser {
    /**
     * 将 S-Expression 字符串解析为 AST
     */
    public static parse(input: string): OrgQLNode {
        const sexpr = parseSExpr(input);
        return this.transform(sexpr);
    }

    /**
     * 递归将 s-expression 的数组结构转换为 AST 节点
     */
    private static transform(sexpr: any): OrgQLNode {
        if (typeof sexpr === 'string' || sexpr instanceof String) {
            // 所有原子（字符串/String对象）统一封装为 text 节点，不带下一级 args
            // 或者我们可以约定 text 节点的 args[0] 是原始字符串，但为了保持 OrgQLNode[] 结构，
            // 这里的 args 只能为空，而内容存在 type 之外的字段？
            // 不，我们可以把字符串内容放在 type 为 'atom' 的节点中，或者就用 text。
            // 改进：如果是一个纯字符串原子，其 args 设为 []，我们将其内容暂存在 type 中，
            // 或者直接让 args 包含一个特殊的代表内容的标记。
            // 实际上，为了符合 OrgQLNode[]，我们可以把原子看作 type='atom', args=[]，
            // 但这样没地方存值。
            // 修正 OrgQLNode 定义，允许 args 为空，内容存放在 label 或类似字段。
            // 或者，我们让 text 节点的第一个 arg 是一个特殊的伪节点。
            // 简单点：原子节点其 type 就是内容，args 为空。
            return { type: String(sexpr), args: [] };
        }

        if (Array.isArray(sexpr)) {
            if (sexpr.length === 0) {
                return { type: 'empty', args: [] };
            }

            const [op, ...rawArgs] = sexpr;

            // 归一化操作符别名
            const type = this.normalizeOperator(String(op));
            const args = rawArgs.map(arg => this.transform(arg));

            return { type, args };
        }

        throw new Error('Invalid S-Expression format');
    }

    /**
     * 别名映射，确保 DSL 的兼容性 (如 prio -> priority)
     */
    private static normalizeOperator(op: string): string {
        const mapping: Record<string, string> = {
            'status': 'todo',
            'state': 'todo',
            'heading': 'heading',
            'title': 'heading',
            'h': 'heading',
            'closed': 'closed',
            'prio': 'priority',
            'p': 'priority',
            '#': 'tag',
            'src': 'file',
            'dl': 'deadline',
            'sc': 'scheduled',
            'prop': 'property',
            'up': 'parent'
        };
        const normalized = op.toLowerCase();
        return mapping[normalized] || normalized;
    }

    /**
     * 辅助方法：从查询中提取分组信息
     * 格式: (group-by file (...)) -> 返回 'file' 和 内部查询 AST
     */
    public static extractGroupBy(node: OrgQLNode): { type: string | null, subQuery: OrgQLNode } {
        if (node.type === 'group-by' && node.args.length >= 2) {
            return {
                type: node.args[0].type, // 此时第一个参数也是一个 node，其 type 就是内容
                subQuery: node.args[1]
            };
        }
        return { type: null, subQuery: node };
    }
}
