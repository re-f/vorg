/**
 * Refile Planner
 *
 * Pure domain logic for planning an org-refile operation.
 *
 * This module is independent of VS Code API - it takes structured inputs
 * (RefileSource, RefileTarget, TextDocument) and produces a RefilePlan
 * with level-adjusted text and correct edit positions.
 *
 * No direct dependency on activeTextEditor, showQuickPick, or WorkspaceEdit.
 */

import { RefileSource, RefileTarget, RefilePlan, RefileEdit, RefileError } from '../commands/editing/refileDomain';
import { HeadingParser } from '../parsers/headingParser';
import * as core from '../types/core';
import { DEFAULT_TODO_KEYWORDS, parseTodoKeywords } from '../utils/constants';

// =============================================================================
// Level Rewriting
// =============================================================================

/**
 * Rewrite all heading levels in the source text for the new parent level.
 *
 * When source (rootLevel=S) is moved under target (level=T), the source heading
 * becomes level T+1. All descendant headings preserve their relative depth.
 *
 * newLevel = newRootLevel + (oldLevel - oldRootLevel)
 */
function rewriteHeadingLevels(
  sourceText: string,
  oldRootLevel: number,
  newRootLevel: number,
  todoKeywords?: string[]
): string {
  const keywords = todoKeywords || parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);
  const lines = sourceText.split('\n');
  const rewritten: string[] = [];

  for (const line of lines) {
    const headingInfo = HeadingParser.parseHeading(line, true, keywords);

    if (headingInfo.level > 0) {
      // This is a heading line - rewrite its level
      const newLevel = newRootLevel + (headingInfo.level - oldRootLevel);
      const newHeadingLine = HeadingParser.buildHeadingLine(
        newLevel,
        headingInfo.text || headingInfo.title,
        headingInfo.todoKeyword,
        headingInfo.priority,
        headingInfo.tags
      );
      rewritten.push(newHeadingLine);
    } else {
      // Non-heading line - keep as-is
      rewritten.push(line);
    }
  }

  return rewritten.join('\n');
}

// =============================================================================
// Target Subtree End Finding
// =============================================================================

/**
 * Find the last line of the target's subtree.
 * This is where we will insert the refiled source.
 */
function findTargetSubtreeEnd(
  document: core.TextDocument,
  targetLine: number,
  targetLevel: number,
  todoKeywords?: string[]
): number {
  const keywords = todoKeywords || parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

  // Target's subtree ends at the next heading at or below target level,
  // or at the end of the document
  for (let i = targetLine + 1; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const headingInfo = HeadingParser.parseHeading(line.text, false, keywords);

    if (headingInfo.level > 0 && headingInfo.level <= targetLevel) {
      // Found the next heading at or above target level - target's subtree ends before this
      return i - 1;
    }
  }

  // No next heading found - target's subtree goes to end of document
  return document.lineCount - 1;
}

// =============================================================================
// Refile Planner
// =============================================================================

export interface RefilePlannerInput {
  source: RefileSource;
  target: RefileTarget;
  document: core.TextDocument;
}

export interface RefilePlannerOutput {
  source: RefileSource;
  target: RefileTarget;
  /** Edits: first delete source, then insert adjusted source at target subtree end */
  edits: RefileEdit[];
  /** The new root level for the source after refile */
  newSourceRootLevel: number;
  /** Source text with all heading levels rewritten */
  adjustedSourceText: string;
}

/**
 * Plan a refile operation.
 *
 * Given a source subtree, a target location, and the document:
 * 1. Validates the target is not the source or inside the source subtree
 * 2. Finds the end of the target's subtree (insertion point)
 * 3. Rewrites all heading levels in the source for the new parent
 * 4. Returns a complete edit plan
 */
export function planRefile(input: RefilePlannerInput): RefilePlanResult {
  const { source, target, document } = input;

  // Validate target
  if (target.line === source.startLine) {
    return { ok: false, error: RefileError.TargetIsSource };
  }
  if (target.line > source.startLine && target.line <= source.endLine) {
    return { ok: false, error: RefileError.TargetInsideSource };
  }

  // Compute new root level: source becomes a child of target
  const newRootLevel = target.level + 1;

  // Rewrite heading levels in source text
  const adjustedText = rewriteHeadingLevels(
    source.rawText,
    source.rootLevel,
    newRootLevel
  );

  // Find target subtree end - this is the insertion point
  // We insert AFTER the target's subtree (as the last child of target)
  const targetSubtreeEndLine = findTargetSubtreeEnd(document, target.line, target.level);

  // Find the insert position: end of target subtree line
  const insertLine = targetSubtreeEndLine;
  const insertChar = document.lineAt(targetSubtreeEndLine).text.length;

  // Build delete edit: remove source from original location
  const deleteEdit: RefileEdit = {
    type: 'delete',
    range: {
      start: { line: source.startLine, character: 0 },
      end: {
        line: source.endLine,
        character: document.lineAt(source.endLine).text.length
      }
    }
  };

  // Build insert edit: insert adjusted source at end of target subtree
  const insertEdit: RefileEdit = {
    type: 'insert',
    text: adjustedText,
    position: { line: insertLine, character: insertChar }
  };

  return {
    ok: true,
    source,
    target,
    edits: [deleteEdit, insertEdit],
    newSourceRootLevel: newRootLevel,
    adjustedSourceText: adjustedText
  };
}

export type RefilePlanResult = RefilePlanSuccess | RefilePlanFailure;

interface RefilePlanSuccess {
  ok: true;
  source: RefileSource;
  target: RefileTarget;
  edits: RefileEdit[];
  newSourceRootLevel: number;
  adjustedSourceText: string;
}

interface RefilePlanFailure {
  ok: false;
  error: RefileError;
}

/**
 * Convenience function that returns a RefilePlan compatible with the existing domain types.
 * Returns { ok: true, plan: RefilePlan } on success, { ok: false, error: RefileError } on failure.
 */
export function buildRefilePlan(
  source: RefileSource,
  target: RefileTarget,
  document: core.TextDocument
): { ok: true; plan: RefilePlan } | { ok: false; error: RefileError } {
  const planResult = planRefile({ source, target, document });

  if (!planResult.ok) {
    return { ok: false, error: planResult.error };
  }

  return {
    ok: true,
    plan: {
      source,
      target,
      edits: planResult.edits,
      newSourceRootLevel: planResult.newSourceRootLevel
    }
  };
}
