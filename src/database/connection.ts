/**
 * Database Connection Manager (sql.js WASM-based)
 * 
 * Manages SQLite database connections using sql.js (WASM) with singleton pattern,
 * automatic persistence, and error handling
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConfig } from './types';
import { SchemaManager } from './schemaManager';

/**
 * Default database configuration
 */
const DEFAULT_CONFIG: DatabaseConfig = {
    dbPath: '',
    enableWAL: false, // WAL not supported in sql.js
    cacheSize: 2000,
    foreignKeys: true,
    busyTimeout: 5000
};

/**
 * Database connection manager (Singleton)
 */
export class DatabaseConnection {
    private static instance: DatabaseConnection | null = null;
    private db: Database | null = null;
    private SQL: SqlJsStatic | null = null;
    private config: DatabaseConfig;
    private schemaManager: SchemaManager | null = null;
    private isInitialized: boolean = false;
    private saveInterval: NodeJS.Timeout | null = null;

    private constructor(config: Partial<DatabaseConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: Partial<DatabaseConfig>): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection(config);
        }
        return DatabaseConnection.instance;
    }

    /**
     * Reset singleton instance (for testing)
     */
    public static resetInstance(): void {
        if (DatabaseConnection.instance) {
            DatabaseConnection.instance.close();
            DatabaseConnection.instance = null;
        }
    }

    /**
     * Initialize database connection
     */
    public async initialize(dbPath: string): Promise<void> {
        if (this.isInitialized && this.db) {
            console.log('Database already initialized');
            return;
        }

        try {
            // Update config with provided path
            this.config.dbPath = dbPath;

            // Ensure directory exists
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Initialize sql.js
            // Try multiple paths for sql-wasm.wasm to support both bundled and unbundled environments
            const baseDir = __dirname;
            const potentialWasmPaths = [
                path.join(baseDir, 'sql-wasm.wasm'),         // Bundled (out/extension.js)
                path.join(baseDir, '../sql-wasm.wasm'),      // Unbundled (out/database/connection.js)
                path.join(baseDir, '../../node_modules/sql.js/dist/sql-wasm.wasm') // Development
            ];

            let wasmPath = '';
            for (const p of potentialWasmPaths) {
                if (fs.existsSync(p)) {
                    wasmPath = p;
                    break;
                }
            }

            if (!wasmPath) {
                throw new Error(`Could not find sql-wasm.wasm in any of: ${potentialWasmPaths.join(', ')}`);
            }

            console.log(`Using WASM from: ${wasmPath}`);
            this.SQL = await initSqlJs({
                locateFile: () => wasmPath
            });

            // Load existing database or create new one
            if (fs.existsSync(dbPath)) {
                const buffer = fs.readFileSync(dbPath);
                this.db = new this.SQL.Database(buffer);
                console.log(`Loaded existing database from: ${dbPath}`);
            } else {
                this.db = new this.SQL.Database();
                console.log(`Created new database at: ${dbPath}`);
            }

            // Configure database
            this.configure();

            // Initialize schema
            this.schemaManager = new SchemaManager(this.db as any);
            this.schemaManager.initialize();

            // Setup auto-save (every 30 seconds)
            this.setupAutoSave();

            this.isInitialized = true;
            console.log(`Database initialized successfully`);
        } catch (error) {
            this.isInitialized = false;
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }

    /**
     * Configure database settings
     */
    private configure(): void {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Enable foreign keys (sql.js supports this)
        if (this.config.foreignKeys) {
            this.db.run('PRAGMA foreign_keys = ON');
        }

        // Note: WAL mode, cache_size, busy_timeout are not applicable in sql.js
        // sql.js runs entirely in memory, so these optimizations aren't needed
    }

    /**
     * Setup automatic save to disk
     */
    private setupAutoSave(): void {
        // Clear existing interval if any
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        // Save every 30 seconds
        this.saveInterval = setInterval(() => {
            this.save();
        }, 30000);
    }

    /**
     * Save database to disk
     */
    public save(): void {
        if (!this.db || !this.config.dbPath) {
            return;
        }

        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.config.dbPath, buffer);
            console.log(`Database saved to: ${this.config.dbPath}`);
        } catch (error) {
            console.error('Failed to save database:', error);
        }
    }

    /**
     * Get database instance
     */
    public getDatabase(): any {
        if (!this.db || !this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Get schema manager
     */
    public getSchemaManager(): SchemaManager {
        if (!this.schemaManager) {
            throw new Error('Schema manager not initialized');
        }
        return this.schemaManager;
    }

    /**
     * Check if database is initialized
     */
    public isReady(): boolean {
        return this.isInitialized && this.db !== null;
    }

    /**
     * Get database path
     */
    public getPath(): string {
        return this.config.dbPath;
    }

    private transactionDepth: number = 0;

    /**
     * Execute a transaction
     * Supports nested transactions by using a counter and only performing
     * BEGIN/COMMIT/ROLLBACK on the outermost call.
     */
    public transaction<T>(fn: (db: any) => T): T {
        const db = this.getDatabase();

        if (this.transactionDepth === 0) {
            try {
                db.run('BEGIN TRANSACTION');
            } catch (error) {
                throw new Error(`Failed to begin transaction: ${error}`);
            }
        }

        this.transactionDepth++;

        try {
            const result = fn(db);
            this.transactionDepth--;

            if (this.transactionDepth === 0) {
                db.run('COMMIT');
            }
            return result;
        } catch (error) {
            this.transactionDepth--;

            if (this.transactionDepth === 0) {
                try {
                    db.run('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Database rollback failed:', rollbackError);
                }
            }
            throw error;
        }
    }

    /**
     * Close database connection
     */
    public close(): void {
        if (this.db) {
            try {
                // Clear auto-save interval
                if (this.saveInterval) {
                    clearInterval(this.saveInterval);
                    this.saveInterval = null;
                }

                // Save before closing
                this.save();

                // Close database
                this.db.close();
                this.db = null;
                this.schemaManager = null;
                this.isInitialized = false;
                console.log('Database connection closed');
            } catch (error) {
                console.error('Error closing database:', error);
            }
        }
    }

    /**
     * Reconnect to database
     */
    public async reconnect(): Promise<void> {
        const dbPath = this.config.dbPath;
        this.close();
        await this.initialize(dbPath);
    }

    /**
     * Get database statistics
     */
    public getStatistics(): {
        path: string;
        isOpen: boolean;
        isInitialized: boolean;
        inTransaction: boolean;
        schemaVersion: number;
    } {
        return {
            path: this.config.dbPath,
            isOpen: this.db !== null,
            isInitialized: this.isInitialized,
            inTransaction: false, // sql.js doesn't expose this
            schemaVersion: this.schemaManager ? this.schemaManager.getSchemaVersion() : 0
        };
    }

    /**
     * Optimize database
     */
    public optimize(): void {
        if (this.schemaManager) {
            this.schemaManager.optimize();
        }
    }

    /**
     * Verify database integrity
     */
    public verify(): boolean {
        if (this.schemaManager) {
            return this.schemaManager.verify();
        }
        return false;
    }

    /**
   * Backup database to a file
   */
    public async backup(backupPath: string): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Export and save to backup path
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(backupPath, buffer);

            console.log(`Database backed up to: ${backupPath}`);
        } catch (error) {
            throw new Error(`Failed to backup database: ${error}`);
        }
    }

    /**
     * Restore database from backup
     */
    public async restore(backupPath: string): Promise<void> {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        try {
            // Close current connection
            this.close();

            // Copy backup file to database path
            fs.copyFileSync(backupPath, this.config.dbPath);

            // Reinitialize
            await this.initialize(this.config.dbPath);

            console.log(`Database restored from: ${backupPath}`);
        } catch (error) {
            throw new Error(`Failed to restore database: ${error}`);
        }
    }
}

/**
 * Get global database instance
 */
export function getDatabase(): any {
    return DatabaseConnection.getInstance().getDatabase();
}

/**
 * Get global database connection
 */
export function getDatabaseConnection(): DatabaseConnection {
    return DatabaseConnection.getInstance();
}
