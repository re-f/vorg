/**
 * Refile Commands
 *
 * Command layer orchestration for org-refile.
 *
 * This module coordinates:
 * 1. Getting the current editor and headline
 * 2. Calling the target resolver to get candidate targets
 * 3. Showing Quick Pick for target selection
 * 4. Calling the planner to generate RefilePlan
 * 5. Calling the applier to apply edits
 *
 * It does NOT contain core refile logic (subtree extraction, level rewriting, etc.)
 * - Those are in refileDomain.ts and refilePlanner.ts
 * - This layer only handles orchestration and UX
 *
 * UX failure handling:
 * - No active editor → show error, abort
 * - Non-org document → show warning, abort
 * - Cursor not on headline → show info, abort
 * - No valid targets → show info, abort
 * - User cancels Quick Pick → abort silently
 * - Planner returns invalid → show error, abort
 * - Applier fails → show error
 */

import * as vscode from 'vscode';
import { RefileSource, RefileTarget, RefileError } from './refileDomain';
import { resolveRefileTargets, RefileTargetWithDisplay, RefileTargetResolverInput } from '../../services/refileTargetResolver';
import { buildRefilePlan } from '../../services/refilePlanner';
import { applyRefilePlan } from '../../services/refileApplier';
import { getConfigService } from '../../services/configService';

/**
 * Entry point: execute the refile command.
 *
 * Orchestrates the full refile flow:
 * - Get source subtree at current cursor
 * - Resolve valid targets
 * - User picks target via Quick Pick
 * - Build and apply refile plan
 */
export async function executeRefileCommand(): Promise<void> {
  // Step 1: Get active editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('VOrg: No active editor. Please open an org file.');
    return;
  }

  // Step 2: Check it's an org document
  if (editor.document.languageId !== 'org') {
    vscode.window.showWarningMessage('VOrg: Refile only works on .org files.');
    return;
  }

  const document = editor.document;
  const position = editor.selection.active;

  // Step 3: Extract source subtree at current cursor position
  const config = getConfigService();
  const todoKeywords = config.getAllKeywordStrings();
  const sourceResult = RefileSource.extractSubtreeRange(document, position, todoKeywords);

  if (!sourceResult.ok) {
    switch (sourceResult.error) {
      case RefileError.NotAHeading:
        vscode.window.showInformationMessage('VOrg: Place cursor on a heading to refile its subtree.');
        break;
      default:
        vscode.window.showErrorMessage(`VOrg: Failed to extract subtree: ${sourceResult.error}`);
    }
    return;
  }

  // Set the URI on the source now that we know the document
  const source: RefileSource = {
    ...sourceResult.source!,
    uri: document.uri.toString(),
  };

  // Step 4: Resolve valid targets
  const resolverInput: RefileTargetResolverInput = { document, source };
  const resolverResult = resolveRefileTargets(resolverInput);

  if (!resolverResult.ok) {
    switch (resolverResult.error) {
      case RefileError.NoValidTargets:
        vscode.window.showInformationMessage('VOrg: No valid refile targets in this document.');
        break;
      default:
        vscode.window.showErrorMessage(`VOrg: Failed to resolve targets: ${resolverResult.error}`);
    }
    return;
  }

  const targets: RefileTargetWithDisplay[] = resolverResult.targets;

  if (targets.length === 0) {
    vscode.window.showInformationMessage('VOrg: No valid refile targets found.');
    return;
  }

  // Step 5: Show Quick Pick for target selection
  const quickPickItems: vscode.QuickPickItem[] = targets.map((targetWithDisplay) => ({
    label: targetWithDisplay.displayInfo.label,
    description: targetWithDisplay.displayInfo.outlinePathString || undefined,
    detail: targetWithDisplay.displayInfo.levelIndicator,
  }));

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: 'Select refile target',
    title: 'Refile to...',
    ignoreFocusOut: true,
  });

  // User cancelled
  if (!selected) {
    return;
  }

  // Find the selected target (match by label)
  const selectedIndex = quickPickItems.findIndex((item) => item.label === selected.label);
  if (selectedIndex < 0) {
    return;
  }

  const selectedTargetWithDisplay = targets[selectedIndex];
  const target: RefileTarget = {
    ...selectedTargetWithDisplay.target,
    uri: document.uri.toString(),
  };

  // Step 6: Build refile plan
  const planResult = buildRefilePlan(source, target, document);

  if (!planResult.ok) {
    switch (planResult.error) {
      case RefileError.TargetIsSource:
        vscode.window.showErrorMessage('VOrg: Cannot refile to the same heading.');
        break;
      case RefileError.TargetInsideSource:
        vscode.window.showErrorMessage('VOrg: Cannot refile to a location inside the source subtree.');
        break;
      default:
        vscode.window.showErrorMessage(`VOrg: Invalid refile target: ${planResult.error}`);
    }
    return;
  }

  const plan = planResult.plan;

  // Step 7: Apply the plan (async - opens docs, validates, applies)
  const applyResult = await applyRefilePlan(plan);

  if (!applyResult.ok) {
    vscode.window.showErrorMessage(`VOrg: Failed to apply refile: ${applyResult.error}`);
    return;
  }

  // Success - optionally show a message
  // vscode.window.showInformationMessage('VOrg: Refile complete.');
}

/**
 * Register the refile command with VS Code.
 */
export function registerRefileCommands(context: vscode.ExtensionContext): void {
  const refileCommand = vscode.commands.registerCommand('vorg.refile', () => {
    return executeRefileCommand();
  });

  context.subscriptions.push(refileCommand);
}
