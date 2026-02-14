/**
 * VOrgQL Real-world Debugger
 * 
 * 一个独立运行的工具，用于在真实的 Org 文件目录下测试 VOrgQL 查询。
 * 它会在内存中创建一个临时数据库，扫描并索引指定目录下的所有 .org 文件，然后执行查询并展示结果。
 * 
 * 使用方法:
 * npx ts-node src/test/unit/debug_vorgql_real.ts --dir <org-dir> [选项]
 * 
 * 必填参数:
 *   --dir <path>          待扫描的 Org 文件目录逻辑路径
 * 
 * 选项:
 *   --query <string>      要执行的 VOrgQL 查询字符串 (例如: "(todo)")
 *   --file <path>         包含 VOrgQL 查询的文件路径 (如果未提供 --query)
 *   --todo <config>       自定义 TODO 关键词配置 (默认为 "TODO|DONE")
 * 
 * 示例:
 *   1. 查询所有待办事项:
 *      npx ts-node src/test/unit/debug_vorgql_real.ts --dir ~/notes --query "(todo)"
 * 
 *   2. 查询特定标签并分组:
 *      npx ts-node src/test/unit/debug_vorgql_real.ts --dir . --query "(group-by tag (tag 'work'))"
 * 
 *   3. 从文件读取复杂查询:
 *      npx ts-node src/test/unit/debug_vorgql_real.ts --dir . --file ./my_query.vql
 */

import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { SchemaManager } from '../../database/schemaManager';
import { FileRepository } from '../../database/fileRepository';
import { HeadingRepository } from '../../database/headingRepository';
import { VOrgQLParser } from '../../services/vorgQLParser';
import { VOrgQLTranslator } from '../../services/vorgQLTranslator';
import { HeadingParser } from '../../parsers/headingParser';
import { OrgHeading } from '../../database/types';
import { parseTodoKeywords, DEFAULT_TODO_KEYWORDS } from '../../utils/constants';

/**
 * 程序主入口
 */
async function main() {
    const args = process.argv.slice(2);
    const dirIdx = args.indexOf('--dir');
    const fileIdx = args.indexOf('--file');
    const queryIdx = args.indexOf('--query');
    const todoIdx = args.indexOf('--todo');

    const orgDir = dirIdx !== -1 ? args[dirIdx + 1] : null;
    let queryFile = fileIdx !== -1 ? args[fileIdx + 1] : null;
    let queryString = queryIdx !== -1 ? args[queryIdx + 1] : null;
    const customTodo = todoIdx !== -1 ? args[todoIdx + 1] : DEFAULT_TODO_KEYWORDS;

    if (!orgDir) {
        console.error('Usage: npx ts-node src/test/unit/debug_vorgql_real.ts --dir <org-dir> [--file <query-file> | --query <query-string>] [--todo <todo-config>]');
        process.exit(1);
    }

    if (!queryString && queryFile) {
        queryString = fs.readFileSync(queryFile, 'utf-8');
    } else if (!queryString) {
        // Try reading from stdin if no query provided
        if (!process.stdin.isTTY) {
            queryString = fs.readFileSync(0, 'utf-8');
        }
    }

    if (!queryString) {
        console.error('Error: No VOrgQL query provided.');
        process.exit(1);
    }

    console.log(`\n--- VOrgQL Debugger ---`);
    console.log(`Directory: ${orgDir}`);
    console.log(`Query: ${queryString.trim()}`);
    console.log(`TODO Keywords: ${customTodo}`);

    // 1. Initialize DB
    let wasmPath: string;
    try {
        wasmPath = path.join(path.dirname(require.resolve('sql.js/package.json')), 'dist', 'sql-wasm.wasm');
    } catch (e) {
        // Fallback for some environments
        wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    }

    if (!fs.existsSync(wasmPath)) {
        console.error(`Error: sql-wasm.wasm not found at ${wasmPath}`);
        process.exit(1);
    }

    const SQL = await initSqlJs({
        locateFile: () => wasmPath
    });

    const db = new SQL.Database();
    const schemaManager = new SchemaManager(db);
    schemaManager.initialize();

    const headingRepo = new HeadingRepository(db);
    const fileRepo = new FileRepository(db);

    // 2. Scan and Index Files
    console.log(`Indexing files...`);
    const files = getAllOrgFiles(orgDir);
    console.log(`Found ${files.length} .org files.`);

    const keywordCfg = parseTodoKeywords(customTodo);
    const todoKeywords = keywordCfg.allKeywords.map((k: any) => k.keyword);

    for (const fileLine of files) {
        // Insert file record first to satisfy foreign key
        fileRepo.insert({
            uri: fileLine,
            title: path.basename(fileLine),
            properties: {},
            tags: [],
            updatedAt: new Date(),
            hash: 'dummy-hash',
            headings: []
        });

        const content = fs.readFileSync(fileLine, 'utf-8');
        const headings = parseHeadings(fileLine, content, keywordCfg);
        if (headings.length > 0) {
            headingRepo.insertBatch(headings);
        }
    }

    // 3. Execute Query
    try {
        const ast = VOrgQLParser.parse(queryString);
        const translator = new VOrgQLTranslator();
        const { where, params, groupBy } = translator.translate(ast);

        console.log(`\n--- Translation Details ---`);
        console.log(`SQL WHERE: ${where}`);
        console.log(`Params: ${JSON.stringify(params, null, 2)}`);
        console.log(`Group By Field: ${groupBy || 'None'}`);

        const results = headingRepo.findByQL(where, params, 5000); // Increase limit for debugger
        console.log(`\nTotal results found: ${results.length}`);

        if (groupBy) {
            console.log(`\n--- Grouped Results (by ${groupBy}) ---`);
            const grouped = groupResults(results, groupBy);
            for (const [key, list] of grouped.entries()) {
                console.log(`${key.padEnd(20)} | ${list.length} items`);
            }

            // Special check for "missing" tags
            if (groupBy === 'tag') {
                const allTags = headingRepo.getAllTags();
                console.log(`\n--- Database Tag Inventory ---`);
                for (const [tag, count] of allTags) {
                    if (!grouped.has(tag)) {
                        console.log(`[WARNING] Tag "${tag}" exists in DB (${count} times) but NOT in query results!`);
                    } else {
                        console.log(`${tag.padEnd(20)} | ${count} times (in DB)`);
                    }
                }
            }
        } else {
            console.log(`\n--- Result Sample ---`);
            results.slice(0, 10).forEach((r: any) => console.log(`- ${r.title} (${path.basename(r.fileUri)})`));
        }

    } catch (err) {
        console.error(`Query Execution Error:`, err);
    }
}

/**
 * 递归获取目录下所有的 .org 文件路径
 * @param dir 目标目录
 * @returns 文件路径数组
 */
function getAllOrgFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllOrgFiles(file));
        } else if (file.endsWith('.org')) {
            results.push(file);
        }
    });
    return results;
}

/**
 * 简单的标题解析器，用于调试工具快速索引
 * @param fileUri 文件路径
 * @param content 文件内容
 * @param keywordCfg TODO 关键词配置
 * @returns 解析得到的标题对象数组
 */
function parseHeadings(fileUri: string, content: string, keywordCfg: any): OrgHeading[] {
    const lines = content.split('\n');
    const headings: OrgHeading[] = [];
    const allKeywords = keywordCfg.allKeywords.map((k: any) => k.keyword);

    lines.forEach((line, index) => {
        if (line.startsWith('*')) {
            const info = HeadingParser.parseHeading(line, true, allKeywords);
            if (info.level > 0) {
                // Determine category
                let category: 'todo' | 'done' | undefined = undefined;
                if (info.todoKeyword) {
                    const isDone = keywordCfg.doneKeywords.some((k: any) => k.keyword === info.todoKeyword);
                    category = isDone ? 'done' : 'todo';
                }

                headings.push({
                    id: `${fileUri}:${index}`,
                    fileUri,
                    startLine: index,
                    endLine: index,
                    level: info.level,
                    title: info.title,
                    todoState: info.todoKeyword || undefined,
                    todoCategory: category,
                    priority: info.priority ? (info.priority.replace(/[\[\]#]/g, '') as any) : undefined,
                    tags: info.tags || [],
                    properties: {},
                    timestamps: [],
                    childrenIds: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    content: ''
                });
            }
        }
    });

    return headings;
}

/**
 * 对查询结果进行分组处理
 * @param headings 标题数组
 * @param type 分组类型 (file_uri, tag, todo_state, priority)
 * @returns 分组后的 Map
 */
function groupResults(headings: OrgHeading[], type: string): Map<string, OrgHeading[]> {
    const groups = new Map<string, OrgHeading[]>();

    const addToGroup = (key: string, h: OrgHeading) => {
        const k = key || '(None)';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(h);
    };

    for (const h of headings) {
        switch (type) {
            case 'file_uri':
                addToGroup(path.basename(h.fileUri), h);
                break;
            case 'tag':
                if (h.tags && h.tags.length > 0) {
                    h.tags.forEach((t: string) => addToGroup(t, h));
                } else {
                    addToGroup('(No Tags)', h);
                }
                break;
            case 'todo_state':
                addToGroup(h.todoState || '(No Status)', h);
                break;
            case 'priority':
                addToGroup(h.priority || '(No Priority)', h);
                break;
            default:
                addToGroup('All', h);
        }
    }
    return groups;
}

main().catch(console.error);
