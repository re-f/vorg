/**
 * SQL.js Database Helper
 * 
 * Provides helper methods to simplify sql.js API usage
 * and make it more similar to better-sqlite3
 */

import { Database } from 'sql.js';

/**
 * Helper class for sql.js database operations
 */
export class SqlJsHelper {
    /**
     * Execute a query and return the first row
     */
    static get(db: Database, sql: string, params: any[] | object = []): any | undefined {
        const stmt = db.prepare(sql);
        stmt.bind(params as any);

        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }

        stmt.free();
        return undefined;
    }

    /**
     * Execute a query and return all rows
     */
    static all(db: Database, sql: string, params: any[] | object = []): any[] {
        const stmt = db.prepare(sql);
        stmt.bind(params as any);

        const results: any[] = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }

        stmt.free();
        return results;
    }

    /**
     * Execute a statement (INSERT, UPDATE, DELETE)
     * Returns an object with lastInsertRowid and changes
     */
    static run(db: Database, sql: string, params: any[] | object = []): { lastInsertRowid: number; changes: number } {
        db.run(sql, params as any);

        // Get last insert rowid
        const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
        lastIdStmt.step();
        const lastId = lastIdStmt.getAsObject().id as number;
        lastIdStmt.free();

        // Get changes count
        const changesStmt = db.prepare('SELECT changes() as count');
        changesStmt.step();
        const changes = changesStmt.getAsObject().count as number;
        changesStmt.free();

        return {
            lastInsertRowid: lastId,
            changes: changes
        };
    }

    /**
     * Create a prepared statement wrapper
     * This provides a better-sqlite3-like interface
     */
    static prepare(db: Database, sql: string) {
        return {
            get: (params: any[] | object = []) => SqlJsHelper.get(db, sql, params),
            all: (params: any[] | object = []) => SqlJsHelper.all(db, sql, params),
            run: (params: any[] | object = []) => SqlJsHelper.run(db, sql, params)
        };
    }
}
