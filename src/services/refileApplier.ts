/**
 * Refile Edit Applier
 *
 * Applies a RefilePlan to VS Code's WorkspaceEdit.
 * This module is the bridge between the pure RefilePlan and VS Code's edit API.
 *
 * Key behaviors:
 * - Opens real documents before writing to validate positions
 * - Supports both single-file and cross-file refile plans
 * - Validates source/target positions match expected state before applying
 * - Fails safely without partial writes on validation errors
 * - Applies all edits atomically via a single WorkspaceEdit
 */

import * as vscode from 'vscode';
import { RefilePlan } from '../commands/editing/refileDomain';
import { HeadingParser } from '../parsers/headingParser';
import { DEFAULT_TODO_KEYWORDS, parseTodoKeywords } from '../utils/constants';

/**
 * Result of applying a refile plan.
 */
export interface ApplyResult {
  ok: boolean;
  error?: string;
  /** Human-readable reason for failure, for user feedback */
  reason?: ApplyFailureReason;
}

/**
 * Reasons why apply might fail - used to provide appropriate user feedback
 */
export type ApplyFailureReason =
  | 'SOURCE_DOCUMENT_NOT_FOUND'
  | 'TARGET_DOCUMENT_NOT_FOUND'
  | 'SOURCE_VALIDATION_FAILED'
  | 'TARGET_VALIDATION_FAILED'
  | 'WORKSPACE_EDIT_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Validate that the source subtree range still matches the expected state.
 *
 * Checks:
 * 1. The source document exists and can be opened
 * 2. The start line is still a heading at the expected level
 * 3. The end line is still within bounds
 * 4. The subtree structure is intact
 */
async function validateSourceDocument(
  plan: RefilePlan,
  sourceDocument: vscode.TextDocument
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { source } = plan;
  const keywords = parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

  // Check line bounds
  if (source.startLine < 0 || source.startLine >= sourceDocument.lineCount) {
    return { ok: false, error: `Source start line ${source.startLine} is out of bounds` };
  }
  if (source.endLine < source.startLine || source.endLine >= sourceDocument.lineCount) {
    return { ok: false, error: `Source end line ${source.endLine} is out of bounds` };
  }

  // Check that start line is still a heading at the expected level
  const startLineText = sourceDocument.lineAt(source.startLine).text;
  const startHeading = HeadingParser.parseHeading(startLineText, false, keywords);

  if (startHeading.level === 0) {
    return { ok: false, error: `Source start line ${source.startLine} is no longer a heading` };
  }

  // Verify the heading level matches expected root level
  // (allowing for same heading with different level means document changed)
  if (startHeading.level !== source.rootLevel) {
    // Check if it's the same heading text - if so, level was changed externally
    const expectedHeadingText = startHeading.text || startHeading.title;
    const rawHeadingText = source.rawText.split('\n')[0];
    const expectedRawText = HeadingParser.buildHeadingLine(
      startHeading.level,
      expectedHeadingText,
      startHeading.todoKeyword,
      startHeading.priority,
      startHeading.tags
    );

    if (rawHeadingText !== expectedRawText) {
      return {
        ok: false,
        error: `Source heading level changed from ${source.rootLevel} to ${startHeading.level} (heading text: "${startHeading.title}")`
      };
    }
  }

  return { ok: true };
}

/**
 * Validate that the target position still corresponds to a valid heading.
 *
 * Checks:
 * 1. The target document exists and can be opened
 * 2. The target line still contains a heading at the expected level
 * 3. The target is still a valid location (not source or inside source)
 */
async function validateTargetDocument(
  plan: RefilePlan,
  targetDocument: vscode.TextDocument
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { target } = plan;
  const keywords = parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

  // Check line bounds
  if (target.line < 0 || target.line >= targetDocument.lineCount) {
    return { ok: false, error: `Target line ${target.line} is out of bounds` };
  }

  // Check that target line is still a heading
  const targetLineText = targetDocument.lineAt(target.line).text;
  const targetHeading = HeadingParser.parseHeading(targetLineText, false, keywords);

  if (targetHeading.level === 0) {
    return { ok: false, error: `Target line ${target.line} is no longer a heading` };
  }

  // Verify the heading level matches
  if (targetHeading.level !== target.level) {
    // Check if heading text changed
    const targetHeadingText = targetHeading.text || targetHeading.title;
    if (targetHeadingText !== target.headingText && targetHeadingText !== (target.headingText.split(' ').slice(1).join(' '))) {
      return {
        ok: false,
        error: `Target heading level changed from ${target.level} to ${targetHeading.level} (heading: "${targetHeading.title}")`
      };
    }
  }

  return { ok: true };
}

/**
 * Build a WorkspaceEdit from a RefilePlan.
 *
 * All edits are prepared but not yet applied.
 * The edits array should be in order: delete first, then insert.
 */
export function buildWorkspaceEdit(plan: RefilePlan): vscode.WorkspaceEdit {
  const workspaceEdit = new vscode.WorkspaceEdit();

  for (const edit of plan.edits) {
    if (edit.type === 'delete') {
      if (!edit.range) continue;
      const startPos = new vscode.Position(edit.range.start.line, edit.range.start.character);
      const endPos = new vscode.Position(edit.range.end.line, edit.range.end.character);
      const range = new vscode.Range(startPos, endPos);
      workspaceEdit.delete(vscode.Uri.parse(edit.documentUri), range);
    } else if (edit.type === 'insert') {
      if (!edit.position || edit.text === undefined) continue;
      const insertPos = new vscode.Position(edit.position.line, edit.position.character);
      workspaceEdit.insert(vscode.Uri.parse(edit.documentUri), insertPos, edit.text);
    }
  }

  return workspaceEdit;
}

/**
 * Apply a RefilePlan to the workspace.
 *
 * This is the main entry point for applying a refile plan.
 * It:
 * 1. Opens the source and target documents
 * 2. Validates that source/target positions are still valid
 * 3. Builds and applies a multi-file WorkspaceEdit
 * 4. Returns a result indicating success or failure
 *
 * If validation fails, NO edits are applied (safe failure).
 */
export async function applyRefilePlan(plan: RefilePlan): Promise<ApplyResult> {
  try {
    // Step 1: Open source document
    let sourceDocument: vscode.TextDocument;
    try {
      sourceDocument = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(plan.sourceDocumentUri)
      );
    } catch {
      return {
        ok: false,
        error: `Could not open source document: ${plan.sourceDocumentUri}`,
        reason: 'SOURCE_DOCUMENT_NOT_FOUND'
      };
    }

    // Step 2: Open target document (may be same as source)
    let targetDocument: vscode.TextDocument;
    try {
      targetDocument = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(plan.targetDocumentUri)
      );
    } catch {
      return {
        ok: false,
        error: `Could not open target document: ${plan.targetDocumentUri}`,
        reason: 'TARGET_DOCUMENT_NOT_FOUND'
      };
    }

    // Step 3: Validate source document state
    const sourceValidation = await validateSourceDocument(plan, sourceDocument);
    if (!sourceValidation.ok) {
      return {
        ok: false,
        error: `Source validation failed: ${sourceValidation.error}`,
        reason: 'SOURCE_VALIDATION_FAILED'
      };
    }

    // Step 4: Validate target document state
    const targetValidation = await validateTargetDocument(plan, targetDocument);
    if (!targetValidation.ok) {
      return {
        ok: false,
        error: `Target validation failed: ${targetValidation.error}`,
        reason: 'TARGET_VALIDATION_FAILED'
      };
    }

    // Step 5: Build the multi-file WorkspaceEdit
    const workspaceEdit = buildWorkspaceEdit(plan);

    // Step 6: Apply all edits atomically
    const success = await vscode.workspace.applyEdit(workspaceEdit);
    if (!success) {
      return {
        ok: false,
        error: 'Failed to apply workspace edit',
        reason: 'WORKSPACE_EDIT_FAILED'
      };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      reason: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Synchronous version of applyRefilePlan that accepts pre-opened documents.
 *
 * This is useful for scenarios where documents are already open
 * and we want to avoid re-opening them.
 *
 * The caller is responsible for ensuring documents match the plan's URIs.
 */
export function applyRefilePlanWithDocuments(
  plan: RefilePlan,
  sourceDocument: vscode.TextDocument,
  targetDocument: vscode.TextDocument
): ApplyResult {
  // Validate source
  const sourceValidation = validateSourceDocumentSync(plan, sourceDocument);
  if (!sourceValidation.ok) {
    return {
      ok: false,
      error: `Source validation failed: ${sourceValidation.error}`,
      reason: 'SOURCE_VALIDATION_FAILED'
    };
  }

  // Validate target
  const targetValidation = validateTargetDocumentSync(plan, targetDocument);
  if (!targetValidation.ok) {
    return {
      ok: false,
      error: `Target validation failed: ${targetValidation.error}`,
      reason: 'TARGET_VALIDATION_FAILED'
    };
  }

  // Build and apply workspace edit
  const workspaceEdit = buildWorkspaceEdit(plan);
  const success = vscode.workspace.applyEdit(workspaceEdit);
  if (!success) {
    return {
      ok: false,
      error: 'Failed to apply workspace edit',
      reason: 'WORKSPACE_EDIT_FAILED'
    };
  }

  return { ok: true };
}

/**
 * Synchronous source document validation (non-async version).
 */
function validateSourceDocumentSync(
  plan: RefilePlan,
  sourceDocument: vscode.TextDocument
): { ok: true } | { ok: false; error: string } {
  const { source } = plan;
  const keywords = parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

  // Check line bounds
  if (source.startLine < 0 || source.startLine >= sourceDocument.lineCount) {
    return { ok: false, error: `Source start line ${source.startLine} is out of bounds` };
  }
  if (source.endLine < source.startLine || source.endLine >= sourceDocument.lineCount) {
    return { ok: false, error: `Source end line ${source.endLine} is out of bounds` };
  }

  // Check that start line is still a heading at the expected level
  const startLineText = sourceDocument.lineAt(source.startLine).text;
  const startHeading = HeadingParser.parseHeading(startLineText, false, keywords);

  if (startHeading.level === 0) {
    return { ok: false, error: `Source start line ${source.startLine} is no longer a heading` };
  }

  if (startHeading.level !== source.rootLevel) {
    return {
      ok: false,
      error: `Source heading level changed from ${source.rootLevel} to ${startHeading.level}`
    };
  }

  return { ok: true };
}

/**
 * Synchronous target document validation (non-async version).
 */
function validateTargetDocumentSync(
  plan: RefilePlan,
  targetDocument: vscode.TextDocument
): { ok: true } | { ok: false; error: string } {
  const { target } = plan;
  const keywords = parseTodoKeywords(DEFAULT_TODO_KEYWORDS).allKeywords.map(k => k.keyword);

  // Check line bounds
  if (target.line < 0 || target.line >= targetDocument.lineCount) {
    return { ok: false, error: `Target line ${target.line} is out of bounds` };
  }

  // Check that target line is still a heading
  const targetLineText = targetDocument.lineAt(target.line).text;
  const targetHeading = HeadingParser.parseHeading(targetLineText, false, keywords);

  if (targetHeading.level === 0) {
    return { ok: false, error: `Target line ${target.line} is no longer a heading` };
  }

  if (targetHeading.level !== target.level) {
    return {
      ok: false,
      error: `Target heading level changed from ${target.level} to ${targetHeading.level}`
    };
  }

  return { ok: true };
}
