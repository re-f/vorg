import * as Database from 'better-sqlite3';
import { OrgLink } from './types';

/**
 * LinkRepository
 * 
 * 负责 OrgLink 的数据访问操作
 * 支持正向链接和反向链接查询
 */
export class LinkRepository {
  constructor(private db: Database.Database) { }

  /**
   * 插入单个 link
   */
  insert(link: OrgLink): void {
    const stmt = this.db.prepare(`
      INSERT INTO links (
        source_uri, line_number, source_heading_line, source_heading_id,
        target_uri, target_heading_line, target_id,
        link_type, link_text
      ) VALUES (
        @sourceUri, @lineNumber, @sourceHeadingLine, @sourceHeadingId,
        @targetUri, @targetHeadingLine, @targetId,
        @linkType, @linkText
      )
    `);

    stmt.run({
      sourceUri: link.sourceUri,
      lineNumber: link.lineNumber !== undefined ? link.lineNumber : null,
      sourceHeadingLine: link.sourceHeadingLine !== undefined ? link.sourceHeadingLine : null,
      sourceHeadingId: link.sourceHeadingId || null,
      targetUri: link.targetUri || null,
      targetHeadingLine: link.targetHeadingLine !== undefined ? link.targetHeadingLine : null,
      targetId: link.targetId || null,
      linkType: link.linkType,
      linkText: link.linkText || null
    });
  }

  /**
   * 批量插入 links (性能优化)
   */
  insertBatch(links: OrgLink[]): void {
    if (links.length === 0) {
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO links (
        source_uri, line_number, source_heading_line, source_heading_id,
        target_uri, target_heading_line, target_id,
        link_type, link_text
      ) VALUES (
        @sourceUri, @lineNumber, @sourceHeadingLine, @sourceHeadingId,
        @targetUri, @targetHeadingLine, @targetId,
        @linkType, @linkText
      )
    `);

    // 使用事务批量插入
    const insertMany = this.db.transaction((links: OrgLink[]) => {
      for (const link of links) {
        stmt.run({
          sourceUri: link.sourceUri,
          lineNumber: link.lineNumber !== undefined ? link.lineNumber : null,
          sourceHeadingLine: link.sourceHeadingLine !== undefined ? link.sourceHeadingLine : null,
          sourceHeadingId: link.sourceHeadingId || null,
          targetUri: link.targetUri || null,
          targetHeadingLine: link.targetHeadingLine !== undefined ? link.targetHeadingLine : null,
          targetId: link.targetId || null,
          linkType: link.linkType,
          linkText: link.linkText || null
        });
      }
    });

    insertMany(links);
  }

  /**
   * 查找源文件的所有链接
   */
  findBySourceUri(uri: string): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE source_uri = ?
      ORDER BY line_number
    `).all(uri) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 查找目标文件的所有反向链接
   */
  findByTargetUri(uri: string): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE target_uri = ?
      ORDER BY source_uri, line_number
    `).all(uri) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 按目标 ID 查找反向链接
   */
  findByTargetId(id: string): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE target_id = ?
      ORDER BY source_uri, line_number
    `).all(id) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 查找源 heading 的所有链接 (By ID)
   */
  findBySourceHeadingId(headingId: string): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE source_heading_id = ?
      ORDER BY line_number
    `).all(headingId) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 查找源 heading 的所有链接 (By Composite Key)
   */
  findBySourceHeading(uri: string, startLine: number): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE source_uri = ? AND source_heading_line = ?
      ORDER BY line_number
    `).all(uri, startLine) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 查找目标 heading 的所有反向链接
   */
  findByTargetHeading(uri: string, startLine: number): OrgLink[] {
    const rows = this.db.prepare(`
      SELECT * FROM links 
      WHERE target_uri = ? AND target_heading_line = ?
      ORDER BY source_uri, line_number
    `).all(uri, startLine) as any[];

    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 删除文件的所有链接
   */
  deleteByFileUri(uri: string): void {
    this.db.prepare(`
      DELETE FROM links WHERE source_uri = ?
    `).run(uri);
  }

  /**
   * 统计文件的链接数量
   */
  countBySourceUri(uri: string): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM links WHERE source_uri = ?
    `).get(uri) as { count: number };

    return result.count;
  }

  /**
   * 统计文件的反向链接数量
   */
  countByTargetUri(uri: string): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM links WHERE target_uri = ?
    `).get(uri) as { count: number };

    return result.count;
  }

  /**
   * 私有: 将数据库行转换为 OrgLink
   */
  private rowToLink(row: any): OrgLink {
    return {
      id: row.id,
      sourceUri: row.source_uri,
      lineNumber: row.line_number,
      sourceHeadingLine: row.source_heading_line,
      sourceHeadingId: row.source_heading_id,
      targetUri: row.target_uri,
      targetHeadingLine: row.target_heading_line,
      targetId: row.target_id,
      linkType: row.link_type,
      linkText: row.link_text
    };
  }
}
