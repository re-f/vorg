
const { VOrgQLParser } = require('../out/services/vorgQLParser');
const { VOrgQLTranslator } = require('../out/services/vorgQLTranslator');

const query = process.argv[2];

if (!query) {
    console.error('Usage: node scripts/debug_ql.js "<vorg-ql-query>"');
    process.exit(1);
}

try {
    console.log('--- VOrgQL Debugger ---');
    console.log('Input:', query);

    // 1. Parse
    const ast = VOrgQLParser.parse(query);
    console.log('\n[1] AST Structure:');
    console.log(JSON.stringify(ast, null, 2));

    // 2. Extract Group Info
    const { type: groupByField, subQuery } = VOrgQLParser.extractGroupBy(ast);
    console.log('\n[2] Grouping:');
    console.log('  Field:', groupByField || 'None');
    console.log('  Inner Query AST Type:', subQuery.type);

    // 3. Translate to SQL
    const translator = new VOrgQLTranslator();
    const result = translator.translate(ast);

    console.log('\n[3] SQL Translation:');
    console.log('  WHERE:', result.where);
    console.log('  PARAMS:', JSON.stringify(result.params, null, 2));
    console.log('  GROUP BY:', result.groupBy || 'None');

} catch (e) {
    console.error('\nError:', e.message);
}
