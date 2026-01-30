/**
 * Database Type Definitions for VOrg Structured Storage
 * 
 * Based on org-roam architecture, adapted for VS Code and TypeScript
 */

/**
 * Timestamp types in Org-mode
 */
export type TimestampType = 'active' | 'inactive' | 'scheduled' | 'deadline' | 'closed';

/**
 * Priority levels for headings
 */
export type Priority = 'A' | 'B' | 'C';

/**
 * TODO state categories
 */
export type TodoStateCategory = 'todo' | 'done';

/**
 * Timestamp with optional repeater and warning
 */
export interface Timestamp {
    /** The date/time value */
    date: Date;

    /** Type of timestamp */
    type: TimestampType;

    /** Repeater interval (e.g., '+1w', '++1m', '.+1d') */
    repeater?: string;

    /** Warning period before deadline (e.g., '-3d') */
    warning?: string;
}

/**
 * Link types supported in Org-mode
 */
export type LinkType = 'file' | 'id' | 'heading' | 'http' | 'https';

/**
 * Link between org nodes
 */
export interface OrgLink {
    /** Unique link ID */
    id?: number;

    /** Source file URI */
    sourceUri: string;

    /** Source heading ID (if link is within a heading) */
    sourceHeadingId?: string;

    /** Target file URI (for file links) */
    targetUri?: string;

    /** Target heading ID (for id/heading links) */
    targetHeadingId?: string;

    /** Type of link */
    linkType: LinkType;

    /** Link text/description */
    linkText: string;

    /** Line number where link appears */
    lineNumber?: number;
}

/**
 * Org heading (node) with all metadata
 */
export interface OrgHeading {
    /** Unique ID from :ID: property */
    id: string;

    /** File URI containing this heading */
    fileUri: string;

    /** Heading level (1-6, corresponding to * to ******) */
    level: number;

    /** Heading title text (without stars, TODO, priority, tags) */
    title: string;

    /** TODO state (TODO, DONE, NEXT, etc.) */
    todoState?: string;

    /** TODO state category */
    todoCategory?: TodoStateCategory;

    /** Priority [#A], [#B], [#C] */
    priority?: Priority;

    /** Tags array (from :tag1:tag2:) */
    tags: string[];

    /** Properties as key-value pairs */
    properties: Record<string, string>;

    // Date-related fields

    /** SCHEDULED date */
    scheduled?: Date;

    /** DEADLINE date */
    deadline?: Date;

    /** CLOSED date */
    closed?: Date;

    /** All timestamps in heading */
    timestamps: Timestamp[];

    // Position information

    /** Starting line number (0-indexed) */
    startLine: number;

    /** Ending line number (0-indexed, inclusive) */
    endLine: number;

    // Hierarchy

    /** Parent heading ID */
    parentId?: string;

    /** Child heading IDs */
    childrenIds: string[];

    // Content

    /** Heading content (excluding sub-headings) */
    content: string;

    // Metadata

    /** When this heading was first indexed */
    createdAt: Date;

    /** When this heading was last updated */
    updatedAt: Date;
}

/**
 * Org file metadata
 */
export interface OrgFile {
    /** File URI (absolute path) */
    uri: string;

    /** File-level title (from #+TITLE:) */
    title?: string;

    /** File-level properties */
    properties: Record<string, string>;

    /** File-level tags */
    tags: string[];

    /** All headings in this file */
    headings: OrgHeading[];

    /** Last modification time */
    updatedAt: Date;

    /** Content hash for change detection */
    hash: string;

    /** When this file was first indexed */
    createdAt: Date;
}

/**
 * Search filters for complex queries
 */
export interface SearchFilters {
    /** Filter by TODO states */
    todoStates?: string[];

    /** Filter by tags (AND/OR logic handled separately) */
    tags?: string[];

    /** Filter by priority */
    priorities?: Priority[];

    /** Filter by date range */
    dateRange?: {
        start: Date;
        end: Date;
    };

    /** Filter by specific files */
    fileUris?: string[];

    /** Filter by heading level */
    levels?: number[];
}

/**
 * Database statistics
 */
export interface OrgStatistics {
    /** Total number of indexed files */
    totalFiles: number;

    /** Total number of headings */
    totalHeadings: number;

    /** Count by TODO state */
    todoCount: Map<string, number>;

    /** Count by tag */
    tagCount: Map<string, number>;

    /** Count by priority */
    priorityCount: Map<Priority, number>;

    /** Database size in bytes */
    databaseSize?: number;

    /** Last index time */
    lastIndexTime?: Date;
}

/**
 * Indexing progress information
 */
export interface IndexProgress {
    /** Current file being indexed */
    currentFile: string;

    /** Number of files processed */
    processedFiles: number;

    /** Total files to process */
    totalFiles: number;

    /** Number of headings indexed */
    headingsIndexed: number;

    /** Start time */
    startTime: Date;

    /** Estimated completion time */
    estimatedCompletion?: Date;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
    /** Database file path */
    dbPath: string;

    /** Enable WAL mode for better concurrency */
    enableWAL?: boolean;

    /** Cache size in pages */
    cacheSize?: number;

    /** Enable foreign keys */
    foreignKeys?: boolean;

    /** Busy timeout in milliseconds */
    busyTimeout?: number;
}
