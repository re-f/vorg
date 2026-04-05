/**
 * Refile Edit Applier
 *
 * Applies a RefilePlan to VS Code's WorkspaceEdit.
 * This module is the bridge between the pure RefilePlan and VS Code's edit API.
 *
 * It takes the structured edits from the planner and applies them in the correct order:
 * 1. Delete the source subtree
 * 2. Insert the adjusted source at the target location
 */

import * as vscode from 'vscode';
import { RefilePlan, RefileEdit } from '../commands/editing/refileDomain';

/**
 * Applies a RefilePlan to the workspace.
 *
 * Returns true if all edits were applied successfully.
 */
export function applyRefilePlan(plan: RefilePlan, document: vscode.TextDocument): boolean {
  const workspaceEdit = new vscode.WorkspaceEdit();

  // Apply edits in order: delete first, then insert
  // The plan's edits array has delete at index 0 and insert at index 1
  for (const edit of plan.edits) {
    if (edit.type === 'delete') {
      applyDeleteEdit(workspaceEdit, edit, document);
    } else if (edit.type === 'insert') {
      applyInsertEdit(workspaceEdit, edit, document);
    }
  }

  // Apply all edits at once (applyEdit returns a Thenable)
  vscode.workspace.applyEdit(workspaceEdit);
  return true;
}

/**
 * Apply a delete edit (removing the source subtree from original location).
 */
function applyDeleteEdit(
  workspaceEdit: vscode.WorkspaceEdit,
  edit: RefileEdit,
  document: vscode.TextDocument
): void {
  if (!edit.range) {
    return;
  }

  const startPos = new vscode.Position(edit.range.start.line, edit.range.start.character);
  const endPos = new vscode.Position(edit.range.end.line, edit.range.end.character);
  const range = new vscode.Range(startPos, endPos);

  workspaceEdit.delete(document.uri, range);
}

/**
 * Apply an insert edit (inserting the adjusted source at target location).
 */
function applyInsertEdit(
  workspaceEdit: vscode.WorkspaceEdit,
  edit: RefileEdit,
  document: vscode.TextDocument
): void {
  if (!edit.position || edit.text === undefined) {
    return;
  }

  const insertPos = new vscode.Position(edit.position.line, edit.position.character);
  workspaceEdit.insert(document.uri, insertPos, edit.text);
}

/**
 * Result of applying a refile plan.
 */
export interface ApplyResult {
  ok: boolean;
  error?: string;
}

/**
 * Apply a RefilePlan and return a result indicating success or failure.
 */
export function applyRefilePlanWithResult(
  plan: RefilePlan,
  document: vscode.TextDocument
): ApplyResult {
  try {
    const success = applyRefilePlan(plan, document);
    return { ok: success, error: success ? undefined : 'Failed to apply edits' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
