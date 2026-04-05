/**
 * Refile Target Resolver
 *
 * Resolves valid refile targets from the current document.
 * Independent of VS Code API - no showQuickPick, QuickPickItem, or WorkspaceEdit.
 *
 * This module:
 * - Scans the document for all headlines
 * - Builds outline paths for each candidate
 * - Filters out source itself and source descendants
 * - Returns business targets with display info clearly separated
 */

import { RefileSource, RefileTarget, RefileError } from '../commands/editing/refileDomain';
import { HeadingParser } from '../parsers/headingParser';
import * as core from '../types/core';
import { DEFAULT_TODO_KEYWORDS, parseTodoKeywords } from '../utils/constants';

// =============================================================================
// Display Info (UI layer concerns, clearly separated from business target)
// =============================================================================

/**
 * Display-only information for a target.
 * This type belongs to the presentation layer and is kept separate
 * so the UI can be swapped without touching business logic.
 */
export interface RefileTargetDisplayInfo {
  /** Human-readable label for Quick Pick */
  label: string;
  /** Outline path as a single display string (e.g., "H1 > H2 > H3") */
  outlinePathString: string;
  /** Level display (e.g., "L2") */
  levelIndicator: string;
}

/**
 * Combined result: business target + display info.
 * The UI layer uses `displayInfo`; business logic uses `target`.
 */
export interface RefileTargetWithDisplay {
  target: RefileTarget;
  displayInfo: RefileTargetDisplayInfo;
}

// =============================================================================
// Resolver Input / Output Types
// =============================================================================

export interface RefileTargetResolverInput {
  document: core.TextDocument;
  source: RefileSource;
}

export type RefileTargetResolverSuccess = {
  ok: true;
  targets: RefileTargetWithDisplay[];
};

export type RefileTargetResolverFailure = {
  ok: false;
  error: RefileError;
};

export type RefileTargetResolverResult = RefileTargetResolverSuccess | RefileTargetResolverFailure;

// =============================================================================
// Internal Helpers
// =============================================================================

/** All headings found in a document scan */
interface ScannedHeading {
  line: number;
  level: number;
  text: string;
}

/**
 * Scan all headings in a document.
 * Returns array of ScannedHeading sorted by line number.
 */
function scanHeadings(document: core.TextDocument): ScannedHeading[] {
  const keywords = parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);
  const headings: ScannedHeading[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const info = HeadingParser.parseHeading(line.text, true, keywords);

    if (info.level > 0) {
      headings.push({
        line: i,
        level: info.level,
        text: info.text || info.title,
      });
    }
  }

  return headings;
}

/**
 * Build the outline path for a heading at a given line.
 * Walks backward through the document to find ancestor headings.
 */
function buildOutlinePath(
  document: core.TextDocument,
  targetLine: number,
  allHeadings: ScannedHeading[]
): string[] {
  const targetHeading = allHeadings.find(h => h.line === targetLine);
  if (!targetHeading) return [];

  const path: string[] = [];
  let currentLevel = targetHeading.level;

  // Walk backward through all headings to build path
  // We only add headings that are STRICTLY BEFORE the target line
  // and have level strictly less than the current tracking level
  for (let i = allHeadings.length - 1; i >= 0; i--) {
    const h = allHeadings[i];
    if (h.line >= targetLine) continue; // Only look at headings strictly before target

    if (h.level < currentLevel) {
      path.unshift(h.text);
      currentLevel = h.level;
      if (h.level === 1) break; // Reached root
    }
  }

  return path;
}

/**
 * Build display info for a target.
 */
function buildDisplayInfo(target: RefileTarget): RefileTargetDisplayInfo {
  const outlinePathString = target.outlinePath.join(' > ');
  const label = outlinePathString
    ? `${outlinePathString} > ${target.headingText}`
    : target.headingText;

  return {
    label,
    outlinePathString,
    levelIndicator: `L${target.level}`,
  };
}

// =============================================================================
// Target Resolution
// =============================================================================

/**
 * Check if a candidate target line is inside the source subtree.
 */
function isInsideSourceSubtree(
  candidateLine: number,
  source: RefileSource
): boolean {
  return candidateLine > source.startLine && candidateLine <= source.endLine;
}

/**
 * Check if candidate is the source itself.
 */
function isSourceItself(candidateLine: number, source: RefileSource): boolean {
  return candidateLine === source.startLine;
}

/**
 * Resolve all valid refile targets in the current document.
 *
 * Given a document and a source subtree:
 * 1. Scans all headings in the document
 * 2. Builds outline paths for each
 * 3. Filters out source itself and source descendants
 * 4. Returns targets with display info
 */
export function resolveRefileTargets(
  input: RefileTargetResolverInput
): RefileTargetResolverResult {
  const { document, source } = input;

  const allHeadings = scanHeadings(document);

  if (allHeadings.length === 0) {
    return { ok: false, error: RefileError.NoValidTargets };
  }

  const targetsWithDisplay: RefileTargetWithDisplay[] = [];

  for (const heading of allHeadings) {
    // Filter 1: source itself is not a valid target
    if (isSourceItself(heading.line, source)) {
      continue;
    }

    // Filter 2: source descendants are not valid targets
    if (isInsideSourceSubtree(heading.line, source)) {
      continue;
    }

    // Build outline path for this heading
    const outlinePath = buildOutlinePath(document, heading.line, allHeadings);

    // Build business target object
    const target: RefileTarget = {
      uri: '',
      line: heading.line,
      level: heading.level,
      outlinePath,
      headingText: heading.text,
    };

    // Build display info (UI layer concern)
    const displayInfo = buildDisplayInfo(target);

    targetsWithDisplay.push({ target, displayInfo });
  }

  if (targetsWithDisplay.length === 0) {
    return { ok: false, error: RefileError.NoValidTargets };
  }

  return { ok: true, targets: targetsWithDisplay };
}
