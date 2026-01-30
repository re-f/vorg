/**
 * Database Connection Manager
 * 
 * Manages SQLite database connections with singleton pattern,
 * connection pooling, and error handling
 */

import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConfig } from './types';
import { SchemaManager } from './schemaManager';

/**
 * Default database configuration
 */
const DEFAULT_CONFIG: DatabaseConfig = {
    dbPath: '',
    enableWAL: true,
    cacheSize: 2000,
    foreignKeys: true,
    busyTimeout: 5000
};

/**
 * Database connection manager (Singleton)
 */
export class DatabaseConnection {
    private static instance: DatabaseConnection | null = null;
    private db: Database.Database | null = null;
    private config: DatabaseConfig;
    private schemaManager: SchemaManager | null = null;
    private isInitialized: boolean = false;

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

            // Create database connection
            this.db = new Database(dbPath);

            // Configure database
            this.configure();

            // Initialize schema
            this.schemaManager = new SchemaManager(this.db);
            this.schemaManager.initialize();

            this.isInitialized = true;
            console.log(`Database initialized at: ${dbPath}`);
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

        // Enable WAL mode for better concurrency
        if (this.config.enableWAL) {
            this.db.pragma('journal_mode = WAL');
        }

        // Set cache size (in pages)
        if (this.config.cacheSize) {
            this.db.pragma(`cache_size = ${this.config.cacheSize}`);
        }

        // Enable foreign keys
        if (this.config.foreignKeys) {
            this.db.pragma('foreign_keys = ON');
        }

        // Set busy timeout (in milliseconds)
        if (this.config.busyTimeout) {
            this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`);
        }

        // Optimize for performance
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('temp_store = MEMORY');
    }

    /**
     * Get database instance
     */
    public getDatabase(): Database.Database {
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

    /**
     * Execute a transaction
     */
    public transaction<T>(fn: (db: Database.Database) => T): T {
        const db = this.getDatabase();
        const transaction = db.transaction(fn);
        return transaction(db);
    }

    /**
     * Close database connection
     */
    public close(): void {
        if (this.db) {
            try {
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
        const db = this.db;
        return {
            path: this.config.dbPath,
            isOpen: db !== null && db.open,
            isInitialized: this.isInitialized,
            inTransaction: db ? db.inTransaction : false,
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
        const db = this.getDatabase();

        try {
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Checkpoint WAL file to ensure all data is in main database file
            db.pragma('wal_checkpoint(TRUNCATE)');

            // Copy database file
            fs.copyFileSync(this.config.dbPath, backupPath);

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
export function getDatabase(): Database.Database {
    return DatabaseConnection.getInstance().getDatabase();
}

/**
 * Get global database connection
 */
export function getDatabaseConnection(): DatabaseConnection {
    return DatabaseConnection.getInstance();
}
