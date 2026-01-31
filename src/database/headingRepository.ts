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

        stmt.run({
            fileUri: heading.fileUri,
            startLine: heading.startLine,
            endLine: heading.endLine,
            id: heading.id,
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
            const tagStmt = this.db.prepare('INSERT INTO heading_tags (heading_id, tag) VALUES (?, ?)');
            for (const tag of heading.tags) {
                tagStmt.run(heading.id, tag);
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
      INSERT INTO heading_tags (heading_id, tag)
      VALUES (?, ?)
    `);

        // 使用事务批量插入
        const insertMany = this.db.transaction((headings: OrgHeading[]) => {
            for (const heading of headings) {
                insertHeading.run({
                    fileUri: heading.fileUri,
                    startLine: heading.startLine,
                    endLine: heading.endLine,
                    id: heading.id,
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

                // 插入标签
                if (heading.tags && heading.tags.length > 0) {
                    for (const tag of heading.tags) {
                        insertTag.run(heading.id, tag);
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
     * 按 TODO 状态查找 headings
     */
    findByTodoState(state: string): OrgHeading[] {
        const rows = this.db.prepare(`
      SELECT * FROM headings 
      WHERE todo_state = ?
      ORDER BY file_uri, start_line
    `).all(state);

        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 按标签查找 headings
     */
    findByTag(tag: string): OrgHeading[] {
        const rows = this.db.prepare(`
      SELECT h.* FROM headings h
      INNER JOIN heading_tags ht ON h.id = ht.heading_id
      WHERE ht.tag = ?
      ORDER BY h.file_uri, h.start_line
    `).all(tag);

        return rows.map(row => this.rowToHeading(row));
    }

    /**
     * 查找指定时间范围内的计划任务
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
     * 查找指定时间范围内的截止任务
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
        // 先删除标签关联 (由于外键约束)
        this.db.prepare(`
      DELETE FROM heading_tags WHERE heading_id IN (SELECT id FROM headings WHERE file_uri = ?)
    `).run(uri);

        // 删除 headings
        this.db.prepare(`
      DELETE FROM headings WHERE file_uri = ?
    `).run(uri);
    }

    /**
     * 统计文件的 heading 数量
     */
    countByFileUri(uri: string): number {
        const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM headings WHERE file_uri = ?
    `).get(uri) as { count: number };

        return result.count;
    }

    /**
     * 私有: 查询 heading 的标签
     */
    private getTags(headingId: string): string[] {
        const rows = this.db.prepare(`
      SELECT tag FROM heading_tags 
      WHERE heading_id = ?
      ORDER BY tag
    `).all(headingId) as Array<{ tag: string }>;

        return rows.map(row => row.tag);
    }

    /**
     * 私有: 将数据库行转换为 OrgHeading
     */
    private rowToHeading(row: any): OrgHeading {
        const tags = this.getTags(row.id);

        return {
            id: row.id,
            fileUri: row.file_uri,
            level: row.level,
            title: row.title,
            todoState: row.todo_state,
            todoCategory: row.todo_category as 'todo' | 'done' | undefined,
            priority: row.priority as 'A' | 'B' | 'C' | undefined,
            tags,
            properties: {}, // TODO: 从 properties 表加载
            scheduled: row.scheduled ? new Date(row.scheduled * 1000) : undefined,
            deadline: row.deadline ? new Date(row.deadline * 1000) : undefined,
            closed: row.closed ? new Date(row.closed * 1000) : undefined,
            timestamps: [], // TODO: 从 timestamps 表加载
            startLine: row.start_line,
            endLine: row.end_line || row.start_line,
            parentId: row.parent_id,
            childrenIds: [], // TODO: 计算子节点
            content: row.content || '',
            createdAt: new Date(row.created_at * 1000),
            updatedAt: new Date(row.updated_at * 1000)
        };
    }
}
