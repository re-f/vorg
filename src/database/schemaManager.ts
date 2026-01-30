/**
 * Database Schema Manager
 * 
 * Handles database initialization, version management, and schema migrations
 */

import * as Database from 'better-sqlite3';
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
    private db: Database.Database;
    private schemaPath: string;

    constructor(db: Database.Database) {
        this.db = db;

        // Try to find schema.sql in multiple locations
        // 1. Same directory as compiled code (out/database/schema.sql)
        // 2. Source directory (src/database/schema.sql)
        const possiblePaths = [
            path.join(__dirname, 'schema.sql'),
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

            // Execute schema in a transaction
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
            const result = stmt.get('schema_version') as { value: string } | undefined;
            return result ? parseInt(result.value, 10) : 0;
        } catch (error) {
            // Metadata table doesn't exist yet
            return 0;
        }
    }

    /**
     * Set schema version in database
     */
    private setSchemaVersion(version: number): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at) 
      VALUES (?, ?, ?)
    `);
        stmt.run('schema_version', version.toString(), Math.floor(Date.now() / 1000));
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
            // Check integrity
            const integrityCheck = this.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
            if (integrityCheck[0].integrity_check !== 'ok') {
                console.error('Database integrity check failed:', integrityCheck);
                return false;
            }

            // Check foreign keys
            const foreignKeyCheck = this.db.pragma('foreign_key_check') as Array<any>;
            if (foreignKeyCheck.length > 0) {
                console.error('Foreign key violations found:', foreignKeyCheck);
                return false;
            }

            // Verify required tables exist
            const requiredTables = ['files', 'headings', 'heading_tags', 'links', 'timestamps', 'metadata'];
            const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
            const tableNames = tables.map(t => t.name);

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

        const tables = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
        const indexes = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'").get() as { count: number };
        const views = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='view'").get() as { count: number };

        const pageSize = this.db.pragma('page_size', { simple: true }) as number;
        const pageCount = this.db.pragma('page_count', { simple: true }) as number;

        return {
            schemaVersion,
            tableCount: tables.count,
            indexCount: indexes.count,
            viewCount: views.count,
            pageSize,
            pageCount,
            databaseSize: pageSize * pageCount
        };
    }

    /**
     * Reset database (drop all tables and recreate)
     * WARNING: This will delete all data!
     */
    public reset(): void {
        console.warn('Resetting database - all data will be lost!');

        // Disable foreign keys temporarily for clean drop
        this.db.pragma('foreign_keys = OFF');

        // Get all tables
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];

        // Drop all tables
        for (const table of tables) {
            this.db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
        }

        // Drop all views
        const views = this.db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all() as { name: string }[];
        for (const view of views) {
            this.db.prepare(`DROP VIEW IF EXISTS ${view.name}`).run();
        }

        // Re-enable foreign keys
        this.db.pragma('foreign_keys = ON');

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
