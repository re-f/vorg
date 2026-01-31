const fs = require('fs');
const path = require('path');

// Ensure out directory exists
const outDir = path.join(__dirname, 'out');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// 1. Copy sql-wasm.wasm
const wasmSource = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const wasmDest = path.join(outDir, 'sql-wasm.wasm');

console.log(`Copying WASM from ${wasmSource} to ${wasmDest}`);
try {
    fs.copyFileSync(wasmSource, wasmDest);
    console.log('WASM copy success.');
} catch (err) {
    console.error('WASM copy failed:', err);
    process.exit(1);
}

// 2. Copy sql-wasm.js (to avoid Webpack bundling issues)
const jsSource = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.js');
const jsDest = path.join(outDir, 'sql-wasm.js');

console.log(`Copying SQL.js JS from ${jsSource} to ${jsDest}`);
try {
    fs.copyFileSync(jsSource, jsDest);
    console.log('SQL.js JS copy success.');
} catch (err) {
    console.error('SQL.js JS copy failed:', err);
    process.exit(1);
}

// 3. Copy schema.sql
const schemaSource = path.join(__dirname, 'src', 'database', 'schema.sql');
const schemaDest = path.join(outDir, 'schema.sql');

console.log(`Copying Schema from ${schemaSource} to ${schemaDest}`);
try {
    fs.copyFileSync(schemaSource, schemaDest);
    console.log('Schema copy success.');
} catch (err) {
    console.error('Schema copy failed:', err);
    process.exit(1);
}
