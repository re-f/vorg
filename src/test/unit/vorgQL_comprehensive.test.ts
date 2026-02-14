
import * as assert from 'assert';
import { VOrgQLParser } from '../../services/vorgQLParser';
import { VOrgQLTranslator } from '../../services/vorgQLTranslator';

suite('VOrg-QL Comprehensive Engine Tests (Parser & Translator)', () => {
    const translator = new VOrgQLTranslator();

    suite('1. 语法边界测试 (Parser Edge Cases)', () => {
        test('应该处理基础 logic 和 原子结构', () => {
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

        test('应该处理多参数谓词 (如多个标签)', () => {
            const q = '(tag "work" "project" "urgent")';
            const ast = VOrgQLParser.parse(q);
            assert.strictEqual(ast.type, 'tag');
            assert.strictEqual(ast.args.length, 3);
            assert.deepStrictEqual(ast.args.map(a => a.type), ['work', 'project', 'urgent']);
        });

        test('应该处理深度嵌套逻辑', () => {
            const q = '(and (or (todo "TODO") (todo "NEXT")) (not (priority "C")))';
            const ast = VOrgQLParser.parse(q);
            assert.strictEqual(ast.type, 'and');
            assert.strictEqual((ast.args[0] as any).type, 'or');
            assert.strictEqual((ast.args[1] as any).type, 'not');
        });

        test('应该处理带空格的引号字符串', () => {
            const q = '(and (todo "IN PROGRESS") "search term")';
            const ast = VOrgQLParser.parse(q);
            assert.strictEqual((ast.args[0] as any).args[0].type, 'IN PROGRESS');
            assert.strictEqual((ast.args[1] as any).type, 'search term');
        });
    });

    suite('2. SQL 翻译 quality 测试 (Translator Output)', () => {
        test('应该翻译多值 IN 子句', () => {
            const q = '(todo "WAITING" "HOLD" "CANCELLED")';
            const ast = VOrgQLParser.parse(q);
            const { where, params } = translator.translate(ast);

            assert.ok(where.includes('todo_state IN ($v0, $v1, $v2)'));
            assert.strictEqual(params['$v0'], 'WAITING');
            assert.strictEqual(params['$v2'], 'CANCELLED');
        });

        test('应该正确翻译 NOT 逻辑', () => {
            const q = '(not (tag "personal"))';
            const ast = VOrgQLParser.parse(q);
            const { where } = translator.translate(ast);
            assert.ok(where.startsWith('NOT (EXISTS'));
        });

        test('应该翻译 group-by 元数据', () => {
            const q = '(group-by status (priority "A"))';
            const ast = VOrgQLParser.parse(q);
            const { where, groupBy } = translator.translate(ast);

            assert.strictEqual(groupBy, 'todo_state');
            assert.ok(where.includes('priority IN ($v0)'));
        });

        test('应该处理复杂的组合逻辑并生成正确的括号', () => {
            const q = '(or (and (todo "DONE") (prio "A")) (and (todo "NEXT") (prio "B")))';
            const ast = VOrgQLParser.parse(q);
            const { where } = translator.translate(ast);

            assert.ok(where.startsWith('(('));
            assert.ok(where.includes(' AND ') && where.includes(' OR '));
        });
    });

    suite('3. 别名一致性测试 (Alias Mapping)', () => {
        const aliases = [
            ['status', 'todo'],
            ['prio', 'priority'],
            ['p', 'priority'],
            ['#', 'tag'],
            ['src', 'file']
        ];

        aliases.forEach(([alias, target]) => {
            test(`别名 "${alias}" 应该映射到 "${target}"`, () => {
                const ast = VOrgQLParser.parse(`(${alias} "val")`);
                assert.strictEqual(ast.type, target);
            });
        });
    });
});
