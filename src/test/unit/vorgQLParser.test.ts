
import * as assert from 'assert';
import { VOrgQLParser } from '../../services/vorgQLParser';

suite('VOrgQLParser (S-Expression)', () => {
    test('应该解析基础的 and 逻辑', () => {
        const query = '(and (todo "TODO") (prio "A"))';
        const ast = VOrgQLParser.parse(query);

        assert.strictEqual(ast.type, 'and');
        assert.strictEqual(ast.args.length, 2);

        const arg1 = ast.args[0] as any;
        assert.strictEqual(arg1.type, 'todo');
        assert.strictEqual(arg1.args[0].type, 'TODO');

        const arg2 = ast.args[1] as any;
        assert.strictEqual(arg2.type, 'priority');
        assert.strictEqual(arg2.args[0].type, 'A');
    });

    test('应该处理操作符别名 (p -> priority, # -> tag)', () => {
        const query = '(and (p "B") (# "work"))';
        const ast = VOrgQLParser.parse(query);

        assert.strictEqual((ast.args[0] as any).type, 'priority');
        assert.strictEqual((ast.args[1] as any).type, 'tag');
    });

    test('应该解析 group-by 嵌套结构', () => {
        const query = '(group-by file (todo "NEXT"))';
        const ast = VOrgQLParser.parse(query);

        const { type, subQuery } = VOrgQLParser.extractGroupBy(ast);
        assert.strictEqual(type, 'file');
        assert.strictEqual(subQuery.type, 'todo');
        assert.strictEqual(subQuery.args[0].type, 'NEXT');
    });

    test('应该级联处理复杂的嵌套逻辑', () => {
        const query = '(or (and (todo "TODO") (p "A")) (tag "urgent"))';
        const ast = VOrgQLParser.parse(query);

        assert.strictEqual(ast.type, 'or');
        const andNode = ast.args[0] as any;
        assert.strictEqual(andNode.type, 'and');
        assert.strictEqual((ast.args[1] as any).type, 'tag');
    });

    test('应该处理纯文本搜索', () => {
        const query = '"database search"';
        const ast = VOrgQLParser.parse(query);
        assert.strictEqual(ast.type, 'database search');
    });
});
