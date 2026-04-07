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
 *
 * Cross-file support:
 * - For untitled/in-memory documents: only document-level targets
 * - For saved documents: shows both same-file and cross-file targets from workspace index
 * - User can select any target from the merged list
 * - Cross-file targets show file path in Quick Pick description
 */

import * as vscode from 'vscode';
import { RefileSource, RefileTarget, RefileError } from './refileDomain';
import {
  resolveRefileTargets,
  RefileTargetWithDisplay,
  RefileTargetResolverInput,
  resolveWorkspaceRefileTargets,
  WorkspaceRefileTargetInput,
  IndexedHeading,
} from '../../services/refileTargetResolver';
import { buildRefilePlan } from '../../services/refilePlanner';
import { applyRefilePlan } from '../../services/refileApplier';
import { getConfigService } from '../../services/configService';
import { OrgSymbolIndexService } from '../../services/orgSymbolIndexService';

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
  // For untitled/in-memory documents: use document-level resolution only
  // For saved documents: use workspace-level resolution (handles both same-file and cross-file)
  const isUntitledDocument = document.uri.scheme === 'untitled';

  let targets: RefileTargetWithDisplay[] = [];

  if (isUntitledDocument) {
    // Use document-level resolution for untitled files
    const resolverInput: RefileTargetResolverInput = { document, source };
    const docResolverResult = resolveRefileTargets(resolverInput);
    if (docResolverResult.ok) {
      targets = docResolverResult.targets;
    }
  } else {
    // Use workspace-level resolution for saved files
    // resolveWorkspaceRefileTargets handles both same-file and cross-file targets
    const indexService = OrgSymbolIndexService.getInstance();
    const indexedSymbols = await indexService.getAllSymbols();

    if (indexedSymbols.length > 0) {
      // Convert IndexedHeadingSymbol to IndexedHeading format expected by resolver
      const indexedHeadings: IndexedHeading[] = indexedSymbols.map(s => ({
        uri: s.uri.toString(),
        line: s.line,
        level: s.level,
        title: s.text,
        displayName: s.displayName,
        relativePath: s.relativePath,
      }));

      const workspaceInput: WorkspaceRefileTargetInput = {
        source,
        sourceDocument: document,
        indexedHeadings,
      };

      const workspaceResult = resolveWorkspaceRefileTargets(workspaceInput);
      if (workspaceResult.ok) {
        targets = workspaceResult.targets;
      }
    }
  }

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
  // For same-file targets, the resolver sets uri=''; set it to current document
  // For cross-file targets, the resolver already sets the proper uri
  const target: RefileTarget = selectedTargetWithDisplay.target.uri
    ? selectedTargetWithDisplay.target
    : { ...selectedTargetWithDisplay.target, uri: document.uri.toString() };

  // Step 6: Build refile plan
  // Detect whether this is a cross-file refile
  const isCrossFile = target.uri !== source.uri;
  let planResult;

  if (isCrossFile) {
    // For cross-file refile, open the target document so planner can find insertion point
    let targetDocument: vscode.TextDocument;
    try {
      targetDocument = await vscode.workspace.openTextDocument(
        vscode.Uri.parse(target.uri)
      );
    } catch {
      vscode.window.showErrorMessage(`VOrg: Could not open target file: ${target.uri}`);
      return;
    }
    planResult = buildRefilePlan(source, target, document, targetDocument);
  } else {
    planResult = buildRefilePlan(source, target, document);
  }

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
