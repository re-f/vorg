import { Database } from 'sql.js';
import { OrgHeading } from './types';
import { SqlJsHelper } from './sqlJsHelper';

/**
 * HeadingRepository
 * 
 * 负责 OrgHeading 的数据访问操作
 * 使用 "删除重建" 模式,不提供 update 操作
 */
export class HeadingRepository {
    constructor(private db: Database) { }

    /**
     * 插入单个 heading
     */
    insert(heading: OrgHeading): void {
        const stmt = SqlJsHelper.prepare(this.db, `
      INSERT INTO headings (
        file_uri, start_line, end_line, id, level, title,
        pinyin_title, pinyin_display_name,
        todo_state, todo_category, priority,
        scheduled, deadline, closed,
        parent_id, content, properties,
        created_at, updated_at
      ) VALUES (
        $fileUri, $startLine, $endLine, $id, $level, $title,
        $pinyinTitle, $pinyinDisplayName,
        $todoState, $todoCategory, $priority,
        $scheduled, $deadline, $closed,
        $parentId, $content, $properties,
        $createdAt, $updatedAt
      )
    `);

        // Check if ID is a real Org ID (from properties)
        const dbId = heading.properties?.ID || null;

        // sql.js uses $paramName for named parameters
        stmt.run({
            $fileUri: heading.fileUri,
            $startLine: heading.startLine,
            $endLine: heading.endLine,
            $id: dbId,
            $level: heading.level,
            $title: heading.title,
            $pinyinTitle: heading.pinyinTitle || null,
            $pinyinDisplayName: heading.pinyinDisplayName || null,
            $todoState: heading.todoState || null,
            $todoCategory: heading.todoCategory || null,
            $priority: heading.priority || null,
            $scheduled: heading.scheduled ? Math.floor(heading.scheduled.getTime() / 1000) : null,
            $deadline: heading.deadline ? Math.floor(heading.deadline.getTime() / 1000) : null,
            $closed: heading.closed ? Math.floor(heading.closed.getTime() / 1000) : null,
            $parentId: heading.parentId || null,
            $content: heading.content || '',
            $properties: JSON.stringify(heading.properties || {}),
            $createdAt: Math.floor(heading.createdAt.getTime() / 1000),
            $updatedAt: Math.floor(heading.updatedAt.getTime() / 1000)
        });

        // 插入标签关联
        if (heading.tags && heading.tags.length > 0) {
            const tagStmt = SqlJsHelper.prepare(this.db, 'INSERT INTO heading_tags (file_uri, heading_line, tag) VALUES (?, ?, ?)');
            const uniqueTags = [...new Set(heading.tags)];
            for (const tag of uniqueTags) {
                tagStmt.run([heading.fileUri, heading.startLine, tag]);
            }
        }
    }

    /**
     * 批量插入 headings (性能优化)
     */
    insertBatch(headings: OrgHeading[]): void {
        if (headings.length === 0) {
            return;
        }

        const headingSql = `
      INSERT INTO headings (
        file_uri, start_line, end_line, id, level, title,
        pinyin_title, pinyin_display_name,
        todo_state, todo_category, priority,
        scheduled, deadline, closed,
        parent_id, content,
        created_at, updated_at
      ) VALUES (
        $fileUri, $startLine, $endLine, $id, $level, $title,
        $pinyinTitle, $pinyinDisplayName,
        $todoState, $todoCategory, $priority,
        $scheduled, $deadline, $closed,
        $parentId, $content,
        $createdAt, $updatedAt
      )
    `;

        const tagSql = `
      INSERT INTO heading_tags (file_uri, heading_line, tag)
      VALUES (?, ?, ?)
    `;

        // Pre-prepare statements for performance within loop
        const headingStmt = this.db.prepare(headingSql);
        const tagStmt = this.db.prepare(tagSql);

        try {
            for (const heading of headings) {
                const dbId = heading.properties?.ID || null;

                headingStmt.bind({
                    $fileUri: heading.fileUri,
                    $startLine: heading.startLine,
                    $endLine: heading.endLine,
                    $id: dbId,
                    $level: heading.level,
                    $title: heading.title,
                    $pinyinTitle: heading.pinyinTitle || null,
                    $pinyinDisplayName: heading.pinyinDisplayName || null,
                    $todoState: heading.todoState || null,
                    $todoCategory: heading.todoCategory || null,
                    $priority: heading.priority || null,
                    $scheduled: heading.scheduled ? Math.floor(heading.scheduled.getTime() / 1000) : null,
                    $deadline: heading.deadline ? Math.floor(heading.deadline.getTime() / 1000) : null,
                    $closed: heading.closed ? Math.floor(heading.closed.getTime() / 1000) : null,
                    $parentId: heading.parentId || null,
                    $content: heading.content || '',
                    $createdAt: Math.floor(heading.createdAt.getTime() / 1000),
                    $updatedAt: Math.floor(heading.updatedAt.getTime() / 1000)
                });
                headingStmt.step();
                headingStmt.reset();

                if (heading.tags && heading.tags.length > 0) {
                    const uniqueTags = [...new Set(heading.tags)];
                    for (const tag of uniqueTags) {
                        tagStmt.bind([heading.fileUri, heading.startLine, tag]);
                        tagStmt.step();
                        tagStmt.reset();
                    }
                }
            }
        } finally {
            headingStmt.free();
            tagStmt.free();
        }
    }

    /**
     * 获取所有标签及其使用次数
     */
    getAllTags(): Map<string, number> {
        const rows = SqlJsHelper.prepare(this.db, `
            SELECT tag, COUNT(*) as count 
            FROM heading_tags 
            GROUP BY tag 
            ORDER BY count DESC
        `).all();

        const tagMap = new Map<string, number>();
        for (const row of (rows as any[])) {
            tagMap.set(row.tag, row.count);
        }
        return tagMap;
    }

    /**
     * 按 ID 查找 heading
     */
    findById(id: string): OrgHeading | null {
        // Only finds explicit IDs
        const row = SqlJsHelper.prepare(this.db, `
      SELECT * FROM headings WHERE id = ?
    `).get([id]);

        if (!row) {
            return null;
        }

        return this.rowToHeading(row);
    }

    /**
     * 查找文件的所有 headings
     */
    findByFileUri(uri: string): OrgHeading[] {
        const rows = SqlJsHelper.prepare(this.db, `
      SELECT * FROM headings 
      WHERE file_uri = ?
      ORDER BY start_line ASC
    `).all([uri]);

        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 查找文件的 headings (按 TODO 状态)
     */
    findByTodoState(todoState: string): OrgHeading[] {
        const rows = SqlJsHelper.prepare(this.db, `SELECT * FROM headings WHERE todo_state = ?`).all([todoState]);
        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 查找文件的 headings (按 tag)
     */
    findByTag(tag: string): OrgHeading[] {
        const rows = SqlJsHelper.prepare(this.db, `
            SELECT h.* 
            FROM headings h
            JOIN heading_tags ht ON h.file_uri = ht.file_uri AND h.start_line = ht.heading_line
            WHERE ht.tag = ?
        `).all([tag]);
        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 查找日期范围内 Schedule 的 Headings
     */
    findScheduledBetween(start: Date, end: Date): OrgHeading[] {
        const startTs = Math.floor(start.getTime() / 1000);
        const endTs = Math.floor(end.getTime() / 1000);

        const rows = SqlJsHelper.prepare(this.db, `
            SELECT * FROM headings 
            WHERE scheduled >= ? AND scheduled <= ?
            ORDER BY scheduled ASC
        `).all([startTs, endTs]);

        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 查找日期范围内 Deadline 的 Headings
     */
    findDeadlineBetween(start: Date, end: Date): OrgHeading[] {
        const startTs = Math.floor(start.getTime() / 1000);
        const endTs = Math.floor(end.getTime() / 1000);

        const rows = SqlJsHelper.prepare(this.db, `
            SELECT * FROM headings 
            WHERE deadline >= ? AND deadline <= ?
            ORDER BY deadline ASC
        `).all([startTs, endTs]);

        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 搜索 headings (支持文本和拼音)
     */
    search(query: string, maxResults: number = 100): OrgHeading[] {
        const lowerQuery = `%${query.toLowerCase()}%`;
        const rows = SqlJsHelper.prepare(this.db, `
            SELECT * FROM headings 
            WHERE title LIKE ? 
               OR pinyin_title LIKE ? 
               OR pinyin_display_name LIKE ?
            LIMIT ?
        `).all([lowerQuery, lowerQuery, lowerQuery, maxResults]);

        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 根据复杂条件查询 headings (用于现代化查询系统)
     */
    findByCriteria(query: any): OrgHeading[] {
        const params: any = {};
        const whereClauses: string[] = [];

        // 1. TODO 状态过滤
        if (query.todo) {
            if (Array.isArray(query.todo)) {
                const todoList = query.todo.map((t: string, i: number) => {
                    const key = `$todo${i}`;
                    params[key] = t;
                    return key;
                });
                whereClauses.push(`todo_state IN (${todoList.join(', ')})`);
            } else {
                params.$todo = query.todo;
                whereClauses.push(`todo_state = $todo`);
            }
        }

        // 2. 优先级过滤
        if (query.priority) {
            if (Array.isArray(query.priority)) {
                const prioList = query.priority.map((p: string, i: number) => {
                    const key = `$prio${i}`;
                    params[key] = p;
                    return key;
                });
                whereClauses.push(`priority IN (${prioList.join(', ')})`);
            } else {
                params.$priority = query.priority;
                whereClauses.push(`priority = $priority`);
            }
        }

        // 3. 标签过滤 (使用 EXISTS 子查询处理多对多关系)
        if (query.tags) {
            const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
            const tagMarkers = tags.map((t: string, i: number) => {
                const key = `$tag${i}`;
                params[key] = t;
                return key;
            });
            whereClauses.push(`EXISTS (
                SELECT 1 FROM heading_tags ht 
                WHERE ht.file_uri = headings.file_uri 
                  AND ht.heading_line = headings.start_line 
                  AND ht.tag IN (${tagMarkers.join(', ')})
            )`);
        }

        // 4. 文本搜索 (复用 pinyin 逻辑)
        if (query.searchTerm) {
            params.$search = `%${query.searchTerm.toLowerCase()}%`;
            whereClauses.push(`(title LIKE $search OR pinyin_title LIKE $search OR pinyin_display_name LIKE $search)`);
        }

        // 5. 范围限制
        if (query.fileUri) {
            params.$fileUri = query.fileUri;
            whereClauses.push(`file_uri = $fileUri`);
        }

        // 构建 SQL
        let sql = `SELECT * FROM headings`;
        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 排序
        const sortField = query.sortBy === 'priority' ? 'priority' :
            query.sortBy === 'todo' ? 'todo_state' :
                query.sortBy === 'deadline' ? 'deadline' :
                    query.sortBy === 'mtime' ? 'updated_at' : 'start_line';
        const sortOrder = query.order === 'desc' ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortField} ${sortOrder}, file_uri ASC`;

        // 限制数量
        if (query.limit) {
            params.$limit = query.limit;
            sql += ` LIMIT $limit`;
        } else {
            sql += ` LIMIT 500`; // 默认限制，防止内存溢出
        }

        const rows = SqlJsHelper.prepare(this.db, sql).all(params);
        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 根据 VOrg-QL 翻译出的 SQL 执行查询
     */
    findByQL(where: string, params: Record<string, any>, limit: number = 500): OrgHeading[] {
        let sql = `SELECT * FROM headings`;
        if (where && where !== '1=1') {
            sql += ` WHERE ${where}`;
        }

        // 默认按文件和行号排序
        sql += ` ORDER BY file_uri ASC, start_line ASC`;

        if (limit) {
            params['$limit'] = limit;
            sql += ` LIMIT $limit`;
        }

        const rows = SqlJsHelper.prepare(this.db, sql).all(params);
        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 获取所有 headings
     */
    findAll(): OrgHeading[] {
        const rows = SqlJsHelper.prepare(this.db, 'SELECT * FROM headings').all();
        return rows.map((row: any) => this.rowToHeading(row));
    }

    /**
     * 删除文件的所有 headings
     */
    deleteByFileUri(uri: string): void {
        const stmt = SqlJsHelper.prepare(this.db, 'DELETE FROM headings WHERE file_uri = ?');
        stmt.run([uri]);
    }

    /**
     * 统计文件的 headings 数量
     */
    countByFileUri(uri: string): number {
        const stmt = SqlJsHelper.prepare(this.db, 'SELECT COUNT(*) as count FROM headings WHERE file_uri = ?');
        const result = stmt.get([uri]) as { count: number };
        return result.count;
    }

    private rowToHeading(row: any): OrgHeading {
        // Recover ID: explicit >> generated
        const id = row.id || `${row.file_uri}:${row.start_line}`;

        // Fetch tags using composite key
        const tags = SqlJsHelper.prepare(this.db, 'SELECT tag FROM heading_tags WHERE file_uri = ? AND heading_line = ? ORDER BY tag ASC')
            .all([row.file_uri, row.start_line])
            .map((r: any) => r.tag);

        return {
            id,
            fileUri: row.file_uri,
            startLine: row.start_line,
            endLine: row.end_line,
            level: row.level,
            title: row.title,
            pinyinTitle: row.pinyin_title || undefined,
            pinyinDisplayName: row.pinyin_display_name || undefined,
            todoState: row.todo_state,
            todoCategory: row.todo_category,
            priority: row.priority,
            tags,
            properties: JSON.parse(row.properties || '{}'),
            timestamps: [],
            scheduled: row.scheduled ? new Date(row.scheduled * 1000) : undefined,
            deadline: row.deadline ? new Date(row.deadline * 1000) : undefined,
            closed: row.closed ? new Date(row.closed * 1000) : undefined,
            parentId: row.parent_id,
            childrenIds: [],
            content: row.content,
            createdAt: new Date(row.created_at * 1000),
            updatedAt: new Date(row.updated_at * 1000)
        };
    }
}
