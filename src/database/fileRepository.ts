/**
 * File Repository
 * 
 * Handles CRUD operations for OrgFile entities
 */

import * as Database from 'better-sqlite3';
import { OrgFile } from './types';

export class FileRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /**
     * Insert a new file
     */
    public insert(file: Omit<OrgFile, 'createdAt'>): void {
        const stmt = this.db.prepare(`
      INSERT INTO files (uri, title, properties, tags, updated_at, hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            file.uri,
            file.title || null,
            JSON.stringify(file.properties),
            JSON.stringify(file.tags),
            Math.floor(file.updatedAt.getTime() / 1000),
            file.hash
        );
    }

    /**
     * Update an existing file
     */
    public update(file: Partial<OrgFile> & { uri: string }): void {
        const updates: string[] = [];
        const values: any[] = [];

        if (file.title !== undefined) {
            updates.push('title = ?');
            values.push(file.title);
        }
        if (file.properties !== undefined) {
            updates.push('properties = ?');
            values.push(JSON.stringify(file.properties));
        }
        if (file.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(file.tags));
        }
        if (file.updatedAt !== undefined) {
            updates.push('updated_at = ?');
            values.push(Math.floor(file.updatedAt.getTime() / 1000));
        }
        if (file.hash !== undefined) {
            updates.push('hash = ?');
            values.push(file.hash);
        }

        if (updates.length === 0) {
            return;
        }

        values.push(file.uri);

        const stmt = this.db.prepare(`
      UPDATE files SET ${updates.join(', ')} WHERE uri = ?
    `);

        stmt.run(...values);
    }

    /**
     * Upsert (insert or update) a file
     */
    public upsert(file: Omit<OrgFile, 'createdAt'>): void {
        const existing = this.findByUri(file.uri);
        if (existing) {
            this.update(file);
        } else {
            this.insert(file);
        }
    }

    /**
     * Find file by URI
     */
    public findByUri(uri: string): OrgFile | null {
        const stmt = this.db.prepare('SELECT * FROM files WHERE uri = ?');
        const row = stmt.get(uri) as any;

        if (!row) {
            return null;
        }

        return this.rowToFile(row);
    }

    /**
     * Find all files
     */
    public findAll(): OrgFile[] {
        const stmt = this.db.prepare('SELECT * FROM files ORDER BY uri');
        const rows = stmt.all() as any[];

        return rows.map(row => this.rowToFile(row));
    }

    /**
     * Find files by hash
     */
    public findByHash(hash: string): OrgFile[] {
        const stmt = this.db.prepare('SELECT * FROM files WHERE hash = ?');
        const rows = stmt.all(hash) as any[];

        return rows.map(row => this.rowToFile(row));
    }

    /**
     * Find files updated after a specific date
     */
    public findUpdatedAfter(date: Date): OrgFile[] {
        const timestamp = Math.floor(date.getTime() / 1000);
        const stmt = this.db.prepare('SELECT * FROM files WHERE updated_at > ? ORDER BY updated_at DESC');
        const rows = stmt.all(timestamp) as any[];

        return rows.map(row => this.rowToFile(row));
    }

    /**
     * Delete file by URI
     */
    public delete(uri: string): void {
        const stmt = this.db.prepare('DELETE FROM files WHERE uri = ?');
        stmt.run(uri);
    }

    /**
     * Delete all files
     */
    public deleteAll(): void {
        const stmt = this.db.prepare('DELETE FROM files');
        stmt.run();
    }

    /**
     * Count total files
     */
    public count(): number {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM files');
        const result = stmt.get() as { count: number };
        return result.count;
    }

    /**
     * Check if file exists
     */
    public exists(uri: string): boolean {
        const stmt = this.db.prepare('SELECT 1 FROM files WHERE uri = ? LIMIT 1');
        const result = stmt.get(uri);
        return result !== undefined;
    }

    /**
     * Convert database row to OrgFile
     */
    private rowToFile(row: any): OrgFile {
        return {
            uri: row.uri,
            title: row.title,
            properties: JSON.parse(row.properties),
            tags: JSON.parse(row.tags),
            headings: [], // Headings are loaded separately
            updatedAt: new Date(row.updated_at * 1000),
            hash: row.hash,
            createdAt: new Date(row.created_at * 1000)
        };
    }
}
