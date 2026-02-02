
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';

async function checkDb() {
    const dbPath = path.join(process.cwd(), 'test-data', '.vorg.db');
    if (!fs.existsSync(dbPath)) {
        console.error('DB not found at:', dbPath);
        return;
    }

    const wasmPath = path.join(path.dirname(require.resolve('sql.js/package.json')), 'dist', 'sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });

    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    console.log('Checking priorities in database...');
    const result = db.exec("SELECT DISTINCT priority FROM headings WHERE priority IS NOT NULL");

    if (result.length > 0) {
        console.log('Unique priorities found:', JSON.stringify(result[0].values));
    } else {
        console.log('No priorities found in database.');
    }

    const searchA = db.exec("SELECT title, priority FROM headings WHERE priority = '[#A]' LIMIT 5");
    console.log('Searching for [#A]:', JSON.stringify(searchA[0]?.values || []));

    const searchPlainA = db.exec("SELECT title, priority FROM headings WHERE priority = 'A' LIMIT 5");
    console.log('Searching for A:', JSON.stringify(searchPlainA[0]?.values || []));

    db.close();
}

checkDb().catch(console.error);
