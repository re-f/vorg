/**
 * Database Schema Manager (sql.js compatible)
 * 
 * Handles database initialization, version management, and schema migrations
 */

import { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Schema version history
 */
const SCHEMA_VERSIONS = {
    1: 'Initial schema with files, headings, links, tags, timestamps'
};

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Schema Manager for VOrg database
 */
export class SchemaManager {
    private db: Database;
    private schemaPath: string;

    constructor(db: Database) {
        this.db = db;

        // Try to find schema.sql in multiple locations
        // 1. Same directory as compiled code (out/database/schema.sql)
        // 2. Source directory (src/database/schema.sql)
        const possiblePaths = [
            path.join(__dirname, 'schema.sql'),
            path.join(__dirname, '..', 'schema.sql'),
            path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql'),
            path.join(process.cwd(), 'src', 'database', 'schema.sql')
        ];

        this.schemaPath = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                this.schemaPath = p;
                break;
            }
        }

        if (!this.schemaPath) {
            throw new Error(`Could not find schema.sql. Searched: ${possiblePaths.join(', ')}`);
        }
    }

    /**
     * Initialize database schema
     * Creates all tables, indexes, and views if they don't exist
     */
    public initialize(): void {
        try {
            // Read schema file
            const schemaSQL = fs.readFileSync(this.schemaPath, 'utf-8');

            // Execute schema (sql.js uses exec for multiple statements)
            this.db.exec(schemaSQL);

            // Verify schema version
            const currentVersion = this.getSchemaVersion();
            if (currentVersion !== CURRENT_SCHEMA_VERSION) {
                this.setSchemaVersion(CURRENT_SCHEMA_VERSION);
            }

            console.log(`Database schema initialized (version ${CURRENT_SCHEMA_VERSION})`);
        } catch (error) {
            throw new Error(`Failed to initialize database schema: ${error}`);
        }
    }

    /**
     * Get current schema version from database
     */
    public getSchemaVersion(): number {
        try {
            const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
            stmt.bind(['schema_version']);

            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return parseInt((row.value as string), 10);
            }

            stmt.free();
            return 0;
        } catch (error) {
            // Metadata table doesn't exist yet
            return 0;
        }
    }

    /**
     * Set schema version in database
     */
    private setSchemaVersion(version: number): void {
        this.db.run(
            `INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)`,
            ['schema_version', version.toString(), Math.floor(Date.now() / 1000)]
        );
    }

    /**
     * Check if database schema is up to date
     */
    public isUpToDate(): boolean {
        return this.getSchemaVersion() === CURRENT_SCHEMA_VERSION;
    }

    /**
     * Migrate database to a specific version
     * @param targetVersion Target schema version
     */
    public migrate(targetVersion: number): void {
        const currentVersion = this.getSchemaVersion();

        if (currentVersion === targetVersion) {
            console.log(`Database already at version ${targetVersion}`);
            return;
        }

        if (targetVersion > CURRENT_SCHEMA_VERSION) {
            throw new Error(`Cannot migrate to future version ${targetVersion}`);
        }

        console.log(`Migrating database from version ${currentVersion} to ${targetVersion}`);

        // For now, we only have version 1
        // Future migrations will be added here
        if (currentVersion === 0 && targetVersion === 1) {
            this.initialize();
        }
    }

    /**
     * Verify database integrity
     * Checks foreign keys, indexes, and table structure
     */
    public verify(): boolean {
        try {
            // Check integrity (sql.js uses exec for PRAGMA)
            const integrityResult = this.db.exec('PRAGMA integrity_check');
            if (integrityResult.length === 0 || integrityResult[0].values[0][0] !== 'ok') {
                console.error('Database integrity check failed');
                return false;
            }

            // Check foreign keys
            const foreignKeyResult = this.db.exec('PRAGMA foreign_key_check');
            if (foreignKeyResult.length > 0 && foreignKeyResult[0].values.length > 0) {
                console.error('Foreign key violations found:', foreignKeyResult);
                return false;
            }

            // Verify required tables exist
            const requiredTables = ['files', 'headings', 'heading_tags', 'links', 'timestamps', 'metadata'];
            const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");

            if (tablesResult.length === 0) {
                console.error('No tables found in database');
                return false;
            }

            const tableNames = tablesResult[0].values.map(row => row[0] as string);

            for (const tableName of requiredTables) {
                if (!tableNames.includes(tableName)) {
                    console.error(`Required table '${tableName}' not found`);
                    return false;
                }
            }

            console.log('Database verification passed');
            return true;
        } catch (error) {
            console.error('Database verification failed:', error);
            return false;
        }
    }

    /**
     * Get database statistics
     */
    public getStatistics(): {
        schemaVersion: number;
        tableCount: number;
        indexCount: number;
        viewCount: number;
        pageSize: number;
        pageCount: number;
        databaseSize: number;
    } {
        const schemaVersion = this.getSchemaVersion();

        const tablesResult = this.db.exec("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
        const indexesResult = this.db.exec("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'");
        const viewsResult = this.db.exec("SELECT COUNT(*) as count FROM sqlite_master WHERE type='view'");

        const pageSizeResult = this.db.exec('PRAGMA page_size');
        const pageCountResult = this.db.exec('PRAGMA page_count');

        return {
            schemaVersion,
            tableCount: tablesResult[0]?.values[0][0] as number || 0,
            indexCount: indexesResult[0]?.values[0][0] as number || 0,
            viewCount: viewsResult[0]?.values[0][0] as number || 0,
            pageSize: pageSizeResult[0]?.values[0][0] as number || 0,
            pageCount: pageCountResult[0]?.values[0][0] as number || 0,
            databaseSize: (pageSizeResult[0]?.values[0][0] as number || 0) * (pageCountResult[0]?.values[0][0] as number || 0)
        };
    }

    /**
     * Reset database (drop all tables and recreate)
     * WARNING: This will delete all data!
     */
    public reset(): void {
        console.warn('Resetting database - all data will be lost!');

        // Disable foreign keys temporarily for clean drop
        this.db.run('PRAGMA foreign_keys = OFF');

        // Get all tables
        const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

        if (tablesResult.length > 0) {
            const tables = tablesResult[0].values.map(row => row[0] as string);

            // Drop all tables
            for (const tableName of tables) {
                this.db.run(`DROP TABLE IF EXISTS ${tableName}`);
            }
        }

        // Drop all views
        const viewsResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='view'");
        if (viewsResult.length > 0) {
            const views = viewsResult[0].values.map(row => row[0] as string);

            for (const viewName of views) {
                this.db.run(`DROP VIEW IF EXISTS ${viewName}`);
            }
        }

        // Re-enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');

        // Reinitialize
        this.initialize();

        console.log('Database reset complete');
    }

    /**
     * Optimize database (VACUUM and ANALYZE)
     */
    public optimize(): void {
        console.log('Optimizing database...');

        // Update statistics for query optimizer
        this.db.exec('ANALYZE');

        // Rebuild database file to reclaim space
        this.db.exec('VACUUM');

        console.log('Database optimization complete');
    }
}
