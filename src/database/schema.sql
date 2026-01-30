-- VOrg Database Schema
-- SQLite schema for structured storage of Org-mode files
-- Based on org-roam architecture, adapted for VS Code

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- ============================================================================
-- FILES TABLE
-- Stores metadata about indexed .org files
-- ============================================================================
CREATE TABLE IF NOT EXISTS files (
  uri TEXT PRIMARY KEY,              -- Absolute file path (unique identifier)
  title TEXT,                        -- File-level title from #+TITLE:
  properties TEXT,                   -- JSON object of file-level properties
  tags TEXT,                         -- JSON array of file-level tags
  updated_at INTEGER NOT NULL,       -- Last modification timestamp (Unix epoch)
  hash TEXT NOT NULL,                -- Content hash for change detection (MD5/SHA256)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

-- ============================================================================
-- HEADINGS TABLE
-- Stores individual Org headings (nodes) with all metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS headings (
  id TEXT PRIMARY KEY,               -- Unique ID from :ID: property
  file_uri TEXT NOT NULL,            -- Reference to files table
  level INTEGER NOT NULL,            -- Heading level (1-6)
  title TEXT NOT NULL,               -- Heading title (without stars, TODO, priority, tags)
  
  -- TODO and priority
  todo_state TEXT,                   -- TODO state (TODO, DONE, NEXT, etc.)
  todo_category TEXT,                -- 'todo' or 'done'
  priority TEXT,                     -- Priority: A, B, or C
  
  -- Tags and properties
  tags TEXT,                         -- JSON array of tags
  properties TEXT,                   -- JSON object of properties
  
  -- Date fields (stored as Unix timestamps)
  scheduled INTEGER,                 -- SCHEDULED date
  deadline INTEGER,                  -- DEADLINE date
  closed INTEGER,                    -- CLOSED date
  
  -- Position in file
  start_line INTEGER NOT NULL,       -- Starting line number (0-indexed)
  end_line INTEGER NOT NULL,         -- Ending line number (0-indexed, inclusive)
  
  -- Hierarchy
  parent_id TEXT,                    -- Parent heading ID (NULL for top-level)
  
  -- Content
  content TEXT,                      -- Heading content (excluding sub-headings)
  
  -- Metadata
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  
  -- Foreign key constraint
  FOREIGN KEY (file_uri) REFERENCES files(uri) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES headings(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_headings_file_uri ON headings(file_uri);
CREATE INDEX IF NOT EXISTS idx_headings_todo_state ON headings(todo_state);
CREATE INDEX IF NOT EXISTS idx_headings_priority ON headings(priority);
CREATE INDEX IF NOT EXISTS idx_headings_scheduled ON headings(scheduled);
CREATE INDEX IF NOT EXISTS idx_headings_deadline ON headings(deadline);
CREATE INDEX IF NOT EXISTS idx_headings_parent_id ON headings(parent_id);
CREATE INDEX IF NOT EXISTS idx_headings_level ON headings(level);

-- Composite index for Agenda queries
CREATE INDEX IF NOT EXISTS idx_headings_agenda 
  ON headings(todo_state, scheduled, deadline);

-- ============================================================================
-- HEADING_TAGS TABLE
-- Many-to-many relationship between headings and tags
-- Enables efficient tag-based queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS heading_tags (
  heading_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  
  PRIMARY KEY (heading_id, tag),
  FOREIGN KEY (heading_id) REFERENCES headings(id) ON DELETE CASCADE
);

-- Index for tag queries
CREATE INDEX IF NOT EXISTS idx_heading_tags_tag ON heading_tags(tag);

-- ============================================================================
-- LINKS TABLE
-- Stores all links found in Org files
-- Supports backlink queries and link graph analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Source information
  source_uri TEXT NOT NULL,          -- Source file
  source_heading_id TEXT,            -- Source heading (NULL if link is outside headings)
  
  -- Target information
  target_uri TEXT,                   -- Target file (for file links)
  target_heading_id TEXT,            -- Target heading (for id/heading links)
  
  -- Link metadata
  link_type TEXT NOT NULL,           -- Type: file, id, heading, http, https
  link_text TEXT,                    -- Link description/text
  line_number INTEGER,               -- Line number where link appears
  
  -- Metadata
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  
  -- Foreign key constraints
  FOREIGN KEY (source_uri) REFERENCES files(uri) ON DELETE CASCADE,
  FOREIGN KEY (source_heading_id) REFERENCES headings(id) ON DELETE CASCADE,
  FOREIGN KEY (target_heading_id) REFERENCES headings(id) ON DELETE SET NULL
);

-- Indexes for link queries
CREATE INDEX IF NOT EXISTS idx_links_source_uri ON links(source_uri);
CREATE INDEX IF NOT EXISTS idx_links_source_heading_id ON links(source_heading_id);
CREATE INDEX IF NOT EXISTS idx_links_target_uri ON links(target_uri);
CREATE INDEX IF NOT EXISTS idx_links_target_heading_id ON links(target_heading_id);
CREATE INDEX IF NOT EXISTS idx_links_link_type ON links(link_type);

-- Composite index for backlink queries
CREATE INDEX IF NOT EXISTS idx_links_backlinks 
  ON links(target_heading_id, link_type);

-- ============================================================================
-- TIMESTAMPS TABLE
-- Stores all timestamps found in headings (for repeaters, warnings, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS timestamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  heading_id TEXT NOT NULL,
  
  timestamp_date INTEGER NOT NULL,   -- Unix timestamp
  timestamp_type TEXT NOT NULL,      -- active, inactive, scheduled, deadline, closed
  repeater TEXT,                     -- Repeater pattern (+1w, ++1m, .+1d)
  warning TEXT,                      -- Warning period (-3d)
  
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  
  FOREIGN KEY (heading_id) REFERENCES headings(id) ON DELETE CASCADE
);

-- Indexes for timestamp queries
CREATE INDEX IF NOT EXISTS idx_timestamps_heading_id ON timestamps(heading_id);
CREATE INDEX IF NOT EXISTS idx_timestamps_date ON timestamps(timestamp_date);
CREATE INDEX IF NOT EXISTS idx_timestamps_type ON timestamps(timestamp_type);

-- ============================================================================
-- METADATA TABLE
-- Stores database metadata and version information
-- ============================================================================
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Insert initial metadata
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('created_at', strftime('%s', 'now'));

-- ============================================================================
-- VIEWS
-- Convenient views for common queries
-- ============================================================================

-- View: All TODO items with dates
CREATE VIEW IF NOT EXISTS v_todo_items AS
SELECT 
  h.id,
  h.file_uri,
  h.title,
  h.todo_state,
  h.priority,
  h.scheduled,
  h.deadline,
  h.tags
FROM headings h
WHERE h.todo_state IS NOT NULL 
  AND h.todo_category = 'todo';

-- View: Agenda items (scheduled or deadline in next 30 days)
CREATE VIEW IF NOT EXISTS v_agenda_items AS
SELECT 
  h.id,
  h.file_uri,
  h.title,
  h.todo_state,
  h.priority,
  h.scheduled,
  h.deadline,
  h.tags,
  CASE 
    WHEN h.scheduled IS NOT NULL THEN h.scheduled
    WHEN h.deadline IS NOT NULL THEN h.deadline
  END as sort_date
FROM headings h
WHERE (h.scheduled IS NOT NULL OR h.deadline IS NOT NULL)
  AND (h.scheduled <= strftime('%s', 'now', '+30 days') 
       OR h.deadline <= strftime('%s', 'now', '+30 days'))
ORDER BY sort_date;

-- View: Tag statistics
CREATE VIEW IF NOT EXISTS v_tag_stats AS
SELECT 
  tag,
  COUNT(*) as count
FROM heading_tags
GROUP BY tag
ORDER BY count DESC;
