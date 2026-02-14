
import * as assert from 'assert';
import { VOrgQLParser } from '../../services/vorgQLParser';
import { VOrgQLTranslator } from '../../services/vorgQLTranslator';

suite('VOrgQL Comprehensive Engine Integration', () => {
    let translator: VOrgQLTranslator;

    setup(() => {
        translator = new VOrgQLTranslator();
    });

    // --- Comparison Operators ---
    test('should translate comparison: (level >= 2)', () => {
        const result = translator.translate(VOrgQLParser.parse('(level >= 2)'));
        assert.strictEqual(result.where, 'level >= $v0');
        assert.strictEqual(result.params['$v0'], '2');
    });

    test('should translate comparison: (priority < B)', () => {
        const result = translator.translate(VOrgQLParser.parse('(p < B)'));
        assert.strictEqual(result.where, 'priority < $v0');
        assert.strictEqual(result.params['$v0'], '[#B]');
    });

    // --- Advanced Date Ranges ---
    test('should translate date range: (deadline :from today :to today+1w)', () => {
        const result = translator.translate(VOrgQLParser.parse('(deadline :from today :to today+1w)'));
        assert.ok(result.where.includes('deadline BETWEEN $v0 AND $v1'));

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

        assert.strictEqual(result.params['$v0'], Math.floor(now.getTime() / 1000));
        assert.strictEqual(result.params['$v1'], Math.floor(nextWeek.getTime() / 1000) + 86399);
    });

    test('should translate date :on today', () => {
        const result = translator.translate(VOrgQLParser.parse('(deadline :on today)'));
        assert.ok(result.where.includes('deadline BETWEEN $v0 AND $v1'));
    });

    test('should support month offset: today+1m', () => {
        const result = translator.translate(VOrgQLParser.parse('(scheduled today+1m)'));
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        assert.strictEqual(result.params['$v0'], Math.floor(nextMonth.getTime() / 1000));
    });

    // --- New Predicates ---
    test('should support closed predicate', () => {
        const result = translator.translate(VOrgQLParser.parse('(closed today)'));
        assert.ok(result.where.includes('closed BETWEEN'));
    });

    // --- Property Comparisons ---
    test('should translate property comparison: (prop "Age" > "18")', () => {
        const result = translator.translate(VOrgQLParser.parse('(prop "Age" > "18")'));
        assert.ok(result.where.includes("json_extract(properties, '$.' || 'Age') > $v0"));
        assert.strictEqual(result.params['$v0'], '18');
    });

    // --- Hierarchy & Content ---
    test('should translate complex nested: (and (todo) (priority A) (level 1))', () => {
        const query = '(and (todo) (p A) (level 1))';
        const result = translator.translate(VOrgQLParser.parse(query));
        assert.ok(result.where.includes("todo_category = 'todo'"));
        assert.ok(result.where.includes('priority IN ($v0)'));
        assert.ok(result.where.includes('level IN ($v1)'));
    });

    test('should translate headings explicitly', () => {
        const result = translator.translate(VOrgQLParser.parse('(h "fix")'));
        assert.ok(result.where.includes('LOWER(title) LIKE $v0'));
        assert.strictEqual(result.params['$v0'], '%fix%');
    });
});
