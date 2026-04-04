
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { VOrgQLParser } = require('../out/services/vorgQLParser');
const { VOrgQLTranslator } = require('../out/services/vorgQLTranslator');

async function run() {
    const workspacePath = process.argv[2];
    const query = process.argv[3];
    workspacePath = "/Users/Ref/OneDrive/knowledgebase-blog/content-org"
    query = 
    if (!workspacePath || !query) {
        console.error('Usage: node scripts/query_workspace.js <workspace-path> "<query>"');
        console.error('Example: node scripts/query_workspace.js . "(group-by tag (category \\"todo\\" \\"\\"))"');
        process.exit(1);
    }

    const dbPath = path.join(path.resolve(workspacePath), '.vorg.db');
    if (!fs.existsSync(dbPath)) {
        console.error(`Database not found at: ${dbPath}`);
        process.exit(1);
    }

    const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
    if (!fs.existsSync(wasmPath)) {
        console.error(`WASM not found at: ${wasmPath}`);
        process.exit(1);
    }

    console.log(`Connecting to: ${dbPath}`);

    try {
        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        const fileBuffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(fileBuffer);

        const ast = VOrgQLParser.parse(query);
        const translator = new VOrgQLTranslator();
        const { where, params, groupBy } = translator.translate(ast);

        let sql = `SELECT * FROM headings WHERE ${where}`;
        if (groupBy) {
            // Note: In our current implementation, grouping is handled in JS
            // but we can sort by group to make it readable in console
            sql += ` ORDER BY ${groupBy} ASC`;
        }

        console.log('\nExecuting SQL:', sql);
        console.log('Params:', params);

        const stmt = db.prepare(sql);
        stmt.bind(params);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();

        console.log(`\nFound ${results.length} results:`);

        if (results.length > 0) {
            if (groupBy) {
                // Manual grouping for display
                const groups = {};
                results.forEach(r => {
                    const groupVal = r[groupBy] || 'None';
                    if (!groups[groupVal]) groups[groupVal] = [];
                    groups[groupVal].push(r);
                });

                Object.keys(groups).sort().forEach(group => {
                    console.log(`\n--- [${group}] (${groups[group].length} items) ---`);
                    groups[group].forEach(r => {
                        console.log(`  - [${r.todo_state || ''}] ${r.title} (${path.basename(r.file_uri)}:${r.start_line})`);
                        if (r.todo_category) console.log(`      Cat: ${r.todo_category}`);
                    });
                });
            } else {
                results.forEach(r => {
                    console.log(`- [${r.todo_state || ''}] ${r.title} (Tags: ${r.tags || 'none'})`);
                    console.log(`  Path: ${r.file_uri}:${r.start_line}`);
                });
            }
        }

        db.close();
    } catch (e) {
        console.error('Execution Failed:', e);
    }
}

run();
