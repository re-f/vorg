import * as Database from 'better-sqlite3';
import { OrgHeading } from './types';

/**
 * HeadingRepository
 * 
 * 负责 OrgHeading 的数据访问操作
 * 使用 "删除重建" 模式,不提供 update 操作
 */
export class HeadingRepository {
    constructor(private db: Database.Database) { }

    /**
     * 插入单个 heading
     */
    insert(heading: OrgHeading): void {
        const stmt = this.db.prepare(`
      INSERT INTO headings (
        file_uri, start_line, end_line, id, level, title,
        todo_state, todo_category, priority,
        scheduled, deadline, closed,
        parent_id, content,
        created_at, updated_at
      ) VALUES (
        @fileUri, @startLine, @endLine, @id, @level, @title,
        @todoState, @todoCategory, @priority,
        @scheduled, @deadline, @closed,
        @parentId, @content,
        @createdAt, @updatedAt
      )
    `);

        // Check if ID is a real Org ID (from properties)
        const dbId = heading.properties?.ID || null;

        stmt.run({
            fileUri: heading.fileUri,
            startLine: heading.startLine,
            endLine: heading.endLine,
            id: dbId,
            level: heading.level,
            title: heading.title,
            todoState: heading.todoState || null,
            todoCategory: heading.todoCategory || null,
            priority: heading.priority || null,
            scheduled: heading.scheduled ? Math.floor(heading.scheduled.getTime() / 1000) : null,
            deadline: heading.deadline ? Math.floor(heading.deadline.getTime() / 1000) : null,
            closed: heading.closed ? Math.floor(heading.closed.getTime() / 1000) : null,
            parentId: heading.parentId || null,
            content: heading.content || '',
            createdAt: Math.floor(heading.createdAt.getTime() / 1000),
            updatedAt: Math.floor(heading.updatedAt.getTime() / 1000)
        });

        // 插入标签关联
        if (heading.tags && heading.tags.length > 0) {
            const tagStmt = this.db.prepare('INSERT INTO heading_tags (file_uri, heading_line, tag) VALUES (?, ?, ?)');
            for (const tag of heading.tags) {
                tagStmt.run(heading.fileUri, heading.startLine, tag);
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

        const insertHeading = this.db.prepare(`
      INSERT INTO headings (
        file_uri, start_line, end_line, id, level, title,
        todo_state, todo_category, priority,
        scheduled, deadline, closed,
        parent_id, content,
        created_at, updated_at
      ) VALUES (
        @fileUri, @startLine, @endLine, @id, @level, @title,
        @todoState, @todoCategory, @priority,
        @scheduled, @deadline, @closed,
        @parentId, @content,
        @createdAt, @updatedAt
      )
    `);

        const insertTag = this.db.prepare(`
      INSERT INTO heading_tags (file_uri, heading_line, tag)
      VALUES (?, ?, ?)
    `);

        // 使用事务批量插入
        const insertMany = this.db.transaction((headings: OrgHeading[]) => {
            for (const heading of headings) {
                const dbId = heading.properties?.ID || null;

                insertHeading.run({
                    fileUri: heading.fileUri,
                    startLine: heading.startLine,
                    endLine: heading.endLine,
                    id: dbId,
                    level: heading.level,
                    title: heading.title,
                    todoState: heading.todoState || null,
                    todoCategory: heading.todoCategory || null,
                    priority: heading.priority || null,
                    scheduled: heading.scheduled ? Math.floor(heading.scheduled.getTime() / 1000) : null,
                    deadline: heading.deadline ? Math.floor(heading.deadline.getTime() / 1000) : null,
                    closed: heading.closed ? Math.floor(heading.closed.getTime() / 1000) : null,
                    parentId: heading.parentId || null,
                    content: heading.content || '',
                    createdAt: Math.floor(heading.createdAt.getTime() / 1000),
                    updatedAt: Math.floor(heading.updatedAt.getTime() / 1000)
                });

                if (heading.tags && heading.tags.length > 0) {
                    for (const tag of heading.tags) {
                        insertTag.run(heading.fileUri, heading.startLine, tag);
                    }
                }
            }
        });

        insertMany(headings);
    }

    /**
     * 按 ID 查找 heading
     */
    findById(id: string): OrgHeading | null {
        // Only finds explicit IDs
        const row = this.db.prepare(`
      SELECT * FROM headings WHERE id = ?
    `).get(id);

        if (!row) {
            return null;
        }

        return this.rowToHeading(row);
    }

    /**
     * 查找文件的所有 headings
     */
    findByFileUri(uri: string): OrgHeading[] {
        const rows = this.db.prepare(`
      SELECT * FROM headings 
      WHERE file_uri = ?
      ORDER BY start_line ASC
    `).all(uri);

        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 查找文件的 headings (按 TODO 状态)
     */
    findByTodoState(todoState: string): OrgHeading[] {
        const rows = this.db.prepare(`SELECT * FROM headings WHERE todo_state = ?`).all(todoState);
        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 查找文件的 headings (按 tag)
     */
    findByTag(tag: string): OrgHeading[] {
        const rows = this.db.prepare(`
            SELECT h.* 
            FROM headings h
            JOIN heading_tags ht ON h.file_uri = ht.file_uri AND h.start_line = ht.heading_line
            WHERE ht.tag = ?
        `).all(tag);
        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 查找日期范围内 Schedule 的 Headings
     */
    findScheduledBetween(start: Date, end: Date): OrgHeading[] {
        const startTs = Math.floor(start.getTime() / 1000);
        const endTs = Math.floor(end.getTime() / 1000);

        const rows = this.db.prepare(`
            SELECT * FROM headings 
            WHERE scheduled >= ? AND scheduled <= ?
            ORDER BY scheduled ASC
        `).all(startTs, endTs);

        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 查找日期范围内 Deadline 的 Headings
     */
    findDeadlineBetween(start: Date, end: Date): OrgHeading[] {
        const startTs = Math.floor(start.getTime() / 1000);
        const endTs = Math.floor(end.getTime() / 1000);

        const rows = this.db.prepare(`
            SELECT * FROM headings 
            WHERE deadline >= ? AND deadline <= ?
            ORDER BY deadline ASC
        `).all(startTs, endTs);

        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 删除文件的所有 headings
     */
    deleteByFileUri(uri: string): void {
        const stmt = this.db.prepare('DELETE FROM headings WHERE file_uri = ?');
        stmt.run(uri);
    }

    /**
     * 统计文件的 headings 数量
     */
    countByFileUri(uri: string): number {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM headings WHERE file_uri = ?');
        const result = stmt.get(uri) as { count: number };
        return result.count;
    }

    private rowToHeading(row: any): OrgHeading {
        // Recover ID: explicit >> generated
        const id = row.id || `${row.file_uri}:${row.start_line}`;

        // Fetch tags using composite key
        const tags = this.db.prepare('SELECT tag FROM heading_tags WHERE file_uri = ? AND heading_line = ?')
            .all(row.file_uri, row.start_line)
            .map((r: any) => r.tag);

        return {
            id,
            fileUri: row.file_uri,
            startLine: row.start_line,
            endLine: row.end_line,
            level: row.level,
            title: row.title,
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
