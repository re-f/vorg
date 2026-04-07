/**
 * Refile Domain Types and Logic
 *
 * Pure domain logic for org-refile, independent of VS Code API.
 * These types and functions can be unit-tested without any VS Code dependency.
 */

import * as core from '../../types/core';
import { HeadingParser } from '../../parsers/headingParser';
import { DEFAULT_TODO_KEYWORDS, parseTodoKeywords } from '../../utils/constants';

/**
 * Error types for refile operations
 */
export enum RefileError {
  NotAHeading = 'NotAHeading',
  TargetIsSource = 'TargetIsSource',
  TargetInsideSource = 'TargetInsideSource',
  NoValidTargets = 'NoValidTargets',
}

/**
 * Result type for operations that can fail
 */
export interface Ok<T> {
  ok: true;
  source?: T;
  target?: T;
  plan?: RefilePlan;
}

export interface Err {
  ok: false;
  error: RefileError;
}

export type Result<T> = Ok<T> | Err;

/**
 * RefileSource describes the source subtree being refiled.
 */
export interface RefileSource {
  /** Document URI or identifier */
  uri: string;
  /** Start line of the subtree (inclusive) */
  startLine: number;
  /** End line of the subtree (inclusive) */
  endLine: number;
  /** Raw text of the entire subtree */
  rawText: string;
  /** Level of the root heading of this subtree */
  rootLevel: number;
}

/**
 * RefileTarget describes the target location for a refile operation.
 */
export interface RefileTarget {
  /** Document URI or identifier */
  uri: string;
  /** The line number where the target heading is */
  line: number;
  /** Level of the target heading */
  level: number;
  /** Outline path (e.g. ["H1", "H2", "H3"]) for display purposes */
  outlinePath: string[];
  /** The raw heading line text */
  headingText: string;
}

/**
 * Type of refile edit
 */
export type EditType = 'delete' | 'insert';

/**
 * A single edit operation in a refile plan.
 * For cross-file refile, each edit carries the document URI it applies to.
 */
export interface RefileEdit {
  type: EditType;
  /** The document URI this edit applies to */
  documentUri: string;
  /** The text to insert (for insert type) or undefined for delete */
  text?: string;
  /** Target position for insert */
  position?: core.Position;
  /** Range to delete */
  range?: core.Range;
}

/**
 * RefilePlan describes the complete set of edits needed to perform a refile.
 * Supports both single-file and cross-file refile:
 * - For single-file: sourceUri === targetUri
 * - For cross-file: sourceUri !== targetUri
 */
export interface RefilePlan {
  /** The source subtree being moved */
  source: RefileSource;
  /** The target location */
  target: RefileTarget;
  /** URI of the source document (where the subtree will be deleted from) */
  sourceDocumentUri: string;
  /** URI of the target document (where the subtree will be inserted into) */
  targetDocumentUri: string;
  /** Edits to perform: first delete source from source document, then insert at target document */
  edits: RefileEdit[];
  /** The new root level for the source after refile */
  newSourceRootLevel: number;
}

// =============================================================================
// RefileSource Operations
// =============================================================================

export const RefileSource = {

  /**
   * Extract the complete subtree range starting from the heading at position.
   * Returns a Result containing the RefileSource if successful.
   */
  extractSubtreeRange(
    document: core.TextDocument,
    position: core.Position,
    todoKeywords?: string[]
  ): Result<RefileSource> {
    const keywords = todoKeywords || parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

    const currentLine = document.lineAt(position.line);
    const headingInfo = HeadingParser.parseHeading(currentLine.text, false, keywords);

    if (headingInfo.level === 0) {
      return { ok: false, error: RefileError.NotAHeading };
    }

    const rootLevel = headingInfo.level;
    const startLine = position.line;

    // Find subtree end
    const subtreeEnd = HeadingParser.findSubtreeEnd(document, position, keywords);

    // Collect raw text for the subtree
    const lines: string[] = [];
    for (let i = startLine; i <= subtreeEnd.line; i++) {
      lines.push(document.lineAt(i).text);
    }
    const rawText = lines.join('\n');

    return {
      ok: true,
      source: {
        uri: '',  // Will be set by caller
        startLine,
        endLine: subtreeEnd.line,
        rawText,
        rootLevel,
      }
    };
  },

  /**
   * Derive the new root level for a source when refiled under a target.
   *
   * When source (rootLevel=S) is moved under target (level=T):
   * - The source becomes a child of target, so it gets level T+1
   * - Relative depths of descendants are preserved
   *
   * newRootLevel = targetLevel + 1 + (sourceRootLevel - sourceRootLevel) = targetLevel + 1
   *
   * Actually we need to preserve the relative depth structure:
   * If source is at level S and target is at level T, and source's relative offset from
   * its own root is always 0 (it's the root of its subtree), then:
   * newRootLevel = T + 1
   */
  deriveNewSourceLevel(source: RefileSource, target: RefileTarget): number {
    // The source heading becomes a child of target
    // Its new level = target level + 1
    return target.level + 1;
  },
};

// =============================================================================
// RefileTarget Operations
// =============================================================================

export const RefileTarget = {

  /**
   * Create a RefileTarget at a given line.
   */
  atLine(document: core.TextDocument, line: number): Result<RefileTarget> {
    const headingLine = document.lineAt(line);
    const headingInfo = HeadingParser.parseHeading(headingLine.text, true);

    if (headingInfo.level === 0) {
      // Line is not a heading - but for target selection, we still accept it
      // as the insertion point could be at end of document or between lines
      return {
        ok: true,
        target: {
          uri: '',
          line,
          level: 0,
          outlinePath: [],
          headingText: headingLine.text,
        }
      };
    }

    // Build outline path by walking up to root
    const outlinePath: string[] = [];
    let currentLine = line;
    let currentLevel = headingInfo.level;

    while (currentLine >= 0) {
      const l = document.lineAt(currentLine);
      const info = HeadingParser.parseHeading(l.text, true);
      if (info.level > 0) {
        if (info.level <= currentLevel) {
          outlinePath.unshift(info.text || info.title);
          currentLevel = info.level;
          if (info.level === 1) break;
        }
      }
      currentLine--;
    }

    return {
      ok: true,
      target: {
        uri: '',
        line,
        level: headingInfo.level,
        outlinePath,
        headingText: headingLine.text,
      }
    };
  },

  /**
   * Check if a target is valid (not source itself, not inside source subtree).
   */
  isValidTarget(source: RefileSource, target: RefileTarget): Result<RefileTarget> {
    // Target cannot be the source itself (same start line = same heading)
    if (target.line === source.startLine) {
      return { ok: false, error: RefileError.TargetIsSource };
    }
    // Target cannot be inside source subtree
    if (target.line > source.startLine && target.line <= source.endLine) {
      return { ok: false, error: RefileError.TargetInsideSource };
    }

    return { ok: true, target };
  },
};

// =============================================================================
// RefilePlan Operations
// =============================================================================

export const RefilePlan = {

  /**
   * Build a complete refile plan given source, target, and documents.
   * Supports both single-file and cross-file refile.
   */
  buildRefilePlan(
    source: RefileSource,
    target: RefileTarget,
    sourceDocument: core.TextDocument,
    targetDocument?: core.TextDocument
  ): Result<RefilePlan> {
    // Validate target first
    const targetValid = RefileTarget.isValidTarget(source, target);
    if (!targetValid.ok) {
      return { ok: false, error: targetValid.error };
    }

    // For single-file, targetDocument is the same as sourceDocument
    const tgtDoc = targetDocument || sourceDocument;

    // Calculate new source level
    const newSourceRootLevel = RefileSource.deriveNewSourceLevel(source, target);

    // Build the delete edit (remove source from original location)
    const deleteEdit: RefileEdit = {
      type: 'delete',
      documentUri: source.uri,
      range: {
        start: { line: source.startLine, character: 0 },
        end: { line: source.endLine, character: sourceDocument.lineAt(source.endLine).text.length }
      }
    };

    // Build the insert edit (insert source at target location)
    // The source will be inserted AFTER the target heading's subtree
    // For simplicity, we insert after the target line
    const insertEdit: RefileEdit = {
      type: 'insert',
      documentUri: target.uri,
      text: source.rawText,
      position: { line: source.endLine, character: sourceDocument.lineAt(source.endLine).text.length }
    };

    return {
      ok: true,
      plan: {
        source,
        target,
        sourceDocumentUri: source.uri,
        targetDocumentUri: target.uri,
        edits: [deleteEdit, insertEdit],
        newSourceRootLevel,
      }
    };
  },
};
