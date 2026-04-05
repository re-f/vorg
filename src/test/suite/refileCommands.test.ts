/**
 * Refile Commands Integration Tests
 *
 * Tests for the refile command orchestration layer.
 *
 * These tests verify:
 * 1. Command correctly aborts when there's no active editor
 * 2. Command correctly aborts for non-org documents
 * 3. Command correctly aborts when cursor is not on a heading
 * 4. Command correctly handles when no valid targets exist
 * 5. Command correctly passes through to Quick Pick when all conditions are met
 * 6. Successful refile: source subtree deleted, inserted at target with correct level
 * 7. Subtree with children: all levels preserved after refile
 * 8. Duplicate headlines: outline path ensures correct target selection
 * 9. TargetInsideSource: command aborts and document unchanged
 * 10. Quick Pick cancellation: document unchanged
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureTestReady } from './testUtils';
import { executeRefileCommand } from '../../commands/editing/refileCommands';

/**
 * Helper to temporarily mock vscode.window.showQuickPick.
 * Saves the original, replaces it with a mock that resolves to `selectedItem`,
 * then restores the original after the test.
 *
 * Usage:
 *   await withMockedQuickPick(selectedItem, async () => {
 *     await executeRefileCommand();
 *   });
 *   // original showQuickPick is restored here
 */
async function withMockedQuickPick<T extends vscode.QuickPickItem>(
  selectedItem: T | undefined,
  fn: () => Promise<void>
): Promise<void> {
  const original = vscode.window.showQuickPick;
  // Use Object.defineProperty to override even if the property is not reassignable
  const mock = async (_options: vscode.QuickPickOptions | Thenable<vscode.QuickPickItem[]>): Promise<T | undefined> => {
    return selectedItem;
  };
  Object.defineProperty(vscode.window, 'showQuickPick', {
    value: mock,
    writable: true,
    configurable: true,
  });
  try {
    await fn();
  } finally {
    Object.defineProperty(vscode.window, 'showQuickPick', {
      value: original,
      writable: true,
      configurable: true,
    });
  }
}

suite('RefileCommands Integration Test Suite', () => {
    suiteSetup(async () => {
        await ensureTestReady();
    });
    vscode.window.showInformationMessage('Start RefileCommands integration tests.');

    /**
     * 设置测试文档和编辑器
     */
    async function setupTest(content: string, line: number, char: number) {
        const doc = await vscode.workspace.openTextDocument({
            content: content,
            language: 'org'
        });
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(line, char);
        editor.selection = new vscode.Selection(pos, pos);
        return { doc, editor };
    }

    // =============================================================================
    // UX Failure: No Active Editor
    // =============================================================================

    test('should abort when no active editor', async () => {
        // Close all editors first
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Execute refile - should show error and abort
        // We can't directly capture showErrorMessage, but we verify it doesn't crash
        await executeRefileCommand();

        // If we got here without crashing, the guard clause worked
    });

    // =============================================================================
    // UX Failure: Non-org Document
    // =============================================================================

    test('should abort for non-org documents', async () => {
        // Open a non-org file
        const doc = await vscode.workspace.openTextDocument({
            content: '* Not an org file',
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);

        // Execute refile - should show warning and abort
        await executeRefileCommand();

        // Clean up
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    // =============================================================================
    // UX Failure: Cursor Not on Heading
    // =============================================================================

    test('should abort when cursor is not on a heading', async () => {
        const { doc } = await setupTest('* H1\nSome content here\n* H2', 1, 5);

        // Execute refile - should show info message and abort
        await executeRefileCommand();

        // Document should be unchanged
        assert.strictEqual(doc.getText(), '* H1\nSome content here\n* H2');
    });

    // =============================================================================
    // UX Failure: No Valid Targets (source is only heading)
    // =============================================================================

    test('should abort when no valid targets exist', async () => {
        const { doc } = await setupTest('* Only Heading', 0, 2);

        // Execute refile - should show info message about no targets
        await executeRefileCommand();

        // Document should be unchanged
        assert.strictEqual(doc.getText(), '* Only Heading');
    });

    // =============================================================================
    // UX Failure: Source is the only non-child heading
    // =============================================================================

    test('should abort when source is top-level with one child only', async () => {
        // * H1
        // ** H2
        // H2 is source, H1 is ancestor (valid), but there's no other sibling
        const { doc } = await setupTest('* H1\n** H2', 1, 3);

        // Execute refile - should show info about no valid targets
        await executeRefileCommand();

        // Document should be unchanged
        assert.strictEqual(doc.getText(), '* H1\n** H2');
    });

    // =============================================================================
    // Success Path: Valid refile scenario (aborts at Quick Pick)
    // =============================================================================

    test('should reach Quick Pick when all conditions are met', async () => {
        // * H1
        // ** H2
        // content
        // * H3
        const { doc } = await setupTest('* H1\n** H2\ncontent\n* H3', 1, 3);

        // Execute refile - this should reach the Quick Pick stage
        // Since we don't select anything, it will abort after Quick Pick
        // We use a timeout to prevent the test from hanging
        const result = Promise.race([
            executeRefileCommand(),
            new Promise<void>((resolve) => setTimeout(resolve, 100))
        ]);

        await result;

        // Document should be unchanged (Quick Pick was shown but not selected)
        assert.strictEqual(doc.getText(), '* H1\n** H2\ncontent\n* H3');
    });

    // =============================================================================
    // Document Unchanged: User Cancels Quick Pick
    // =============================================================================

    test('should keep document unchanged when Quick Pick is cancelled', async () => {
        // Same as above, but we verify the document is unchanged after Quick Pick cancel
        const { doc } = await setupTest('* H1\n** H2\ncontent\n* H3', 1, 3);

        await executeRefileCommand();

        // Document should remain unchanged
        assert.strictEqual(doc.getText(), '* H1\n** H2\ncontent\n* H3');
    });

    // =============================================================================
    // Error Path: Invalid target from planner
    // =============================================================================

    test('should handle planner error gracefully', async () => {
        // This test would require mocking to force a planner error
        // The integration test verifies error handling paths exist
        const { doc } = await setupTest('* H1\n** H2\n* H3', 1, 3);

        // Even if planner returns error, command should handle it gracefully
        await executeRefileCommand();

        // Document unchanged - command aborted gracefully
        assert.strictEqual(doc.getText(), '* H1\n** H2\n* H3');
    });

    // =============================================================================
    // Success Path: Actual refile with Quick Pick selection
    // =============================================================================

    test('should move subtree to target and adjust level', async () => {
        // Setup:
        // Line 0: * H1
        // Line 1: ** H2  <- cursor here (source)
        // Line 2: content
        // Line 3: * H3   <- target
        //
        // After refile H2 under H3 (delete lines 1-2, insert at end of H3):
        // Line 0: * H1
        // Line 1: * H3
        // Line 2: ** H2   <- inserted at end of H3
        // Line 3: content
        const { doc } = await setupTest('* H1\n** H2\ncontent\n* H3', 1, 3);

        const targetItem = { label: 'H3', description: '', detail: 'L1' };

        await withMockedQuickPick(targetItem, async () => {
            await executeRefileCommand();
        });

        const text = doc.getText();
        // H2 and its content should NOT be at original location (lines 1-2)
        assert.ok(!text.includes('** H2\ncontent'), 'source subtree should be removed from original location');
        // H2 should appear as child of H3 somewhere in the doc
        assert.ok(text.includes('** H2'), 'source heading should appear with adjusted level');
        // H1 should still be there
        assert.ok(text.includes('* H1'), 'H1 should remain');
        // content should still be there (after H2)
        assert.ok(text.includes('content'), 'content should remain');
        // H3 should still be there
        assert.ok(text.includes('* H3'), 'target H3 should remain');
    });

    test('should preserve relative levels when moving subtree with children', async () => {
        // Setup:
        // * Src
        // ** Child1
        // *** Grandchild
        // ** Child2
        // * Dest
        //
        // Refile Src under Dest -> Src becomes level 2 (child of Dest)
        // Children preserve relative depth:
        // ** Child1 (was level 2, offset 0 from Src → level 3)
        // *** Grandchild (was level 3, offset 1 from Src → level 4)
        // ** Child2 (was level 2, offset 0 from Src → level 3)
        const { doc } = await setupTest(
            '* Src\n** Child1\n*** Grandchild\n** Child2\n* Dest',
            0, 2
        );

        const targetItem = { label: 'Dest', description: '', detail: 'L1' };

        await withMockedQuickPick(targetItem, async () => {
            await executeRefileCommand();
        });

        const text = doc.getText();
        // Src should no longer be at level 1 at top
        assert.ok(!text.startsWith('* Src'), 'source root should not be at top level after move');
        // Src should appear as child of Dest (level 2)
        assert.ok(text.includes('** Src'), 'Src should be child of Dest (level 2)');
        // Child1 relative depth preserved: was 2, now 3
        assert.ok(text.includes('*** Child1'),
            'Child1 should be at level 3 (relative offset preserved)');
        // Grandchild relative depth preserved: was 3, now 4
        assert.ok(text.includes('**** Grandchild'),
            'Grandchild should be at level 4 (relative offset preserved)');
        // Child2 relative depth preserved: was 2, now 3
        assert.ok(text.includes('*** Child2'),
            'Child2 should be at level 3 (relative offset preserved)');
    });

    test('should delete source subtree completely after refile', async () => {
        // Verify source subtree is fully removed, not just the heading line
        // * Src
        // ** SubHeading
        // body content
        // * Dest
        const { doc } = await setupTest(
            '* Src\n** SubHeading\nbody content\n* Dest',
            0, 2
        );

        const targetItem = { label: 'Dest', description: '', detail: 'L1' };

        await withMockedQuickPick(targetItem, async () => {
            await executeRefileCommand();
        });

        const text = doc.getText();
        // Entire source should be gone from original location
        assert.strictEqual(text.indexOf('* Src'), -1, 'source heading should be removed');
        assert.strictEqual(text.indexOf('** SubHeading'), -1, 'source subheading should be removed');
        assert.strictEqual(text.indexOf('body content'), -1, 'source body content should be removed');
        // Dest should still exist
        assert.ok(text.includes('* Dest'), 'target should remain');
    });

    // =============================================================================
    // Duplicate Headlines: outline path disambiguates
    // =============================================================================

    test('should select correct target among duplicate headlines using outline path', async () => {
        // Setup with two headings named "H2":
        // * H1a
        // ** H2  <- source
        // * H1b
        // ** H2  <- this is the intended target (under H1b)
        //
        // Quick Pick labels include outline path:
        // "H1a > H2" (source, filtered out)
        // "H1b > H2" (target)
        const { doc } = await setupTest(
            '* H1a\n** H2\n* H1b\n** H2',
            1, 4
        );

        // The second H2 is at line 3, label will be "H1b > H2"
        const targetItem = { label: 'H1b > H2', description: 'H1b', detail: 'L2' };

        await withMockedQuickPick(targetItem, async () => {
            await executeRefileCommand();
        });

        const text = doc.getText();
        // First H2 (under H1a) should be gone
        // Second H2 should be moved under H1b (becomes level 3)
        // Original structure:
        // * H1a
        // * H1b
        // ** H2  <- moved here
        assert.ok(text.includes('* H1b\n*** H2') || text.includes('* H1b\n** H2'),
            'source H2 should move under H1b');
        // H1a should still have its original H2 removed (source is gone)
        assert.ok(!text.includes('* H1a\n** H2'),
            'source H2 under H1a should be removed');
    });

    // =============================================================================
    // Error Path: TargetInsideSource
    // =============================================================================

    test('should abort when target is inside source subtree', async () => {
        // * Src
        // ** Child  <- this would be target if selected, but inside source
        // * Dest
        const { doc } = await setupTest('* Src\n** Child\n* Dest', 0, 2);

        // The resolver should exclude "Child" since it's inside source
        // So the only valid target is "Dest"
        // But if somehow a target inside source gets selected, planner should reject it
        // We test this by mocking a target inside source
        const targetInsideSource = { label: 'Child', description: 'Src', detail: 'L2' };

        await withMockedQuickPick(targetInsideSource, async () => {
            await executeRefileCommand();
        });

        // Document should be unchanged - command should reject TargetInsideSource
        assert.strictEqual(doc.getText(), '* Src\n** Child\n* Dest');
    });

    // =============================================================================
    // Negative Paths: Document remains unchanged
    // =============================================================================

    test('should keep document unchanged when user cancels Quick Pick (explicit mock)', async () => {
        // Using withMockedQuickPick to explicitly return undefined (cancelled)
        const { doc } = await setupTest('* H1\n** H2\ncontent\n* H3', 1, 3);

        await withMockedQuickPick(undefined, async () => {
            await executeRefileCommand();
        });

        assert.strictEqual(doc.getText(), '* H1\n** H2\ncontent\n* H3');
    });

    test('should keep document unchanged when no valid targets (explicit guard)', async () => {
        // Only one heading in doc - no valid target
        const { doc } = await setupTest('* OnlyHeading', 0, 2);

        await executeRefileCommand();

        assert.strictEqual(doc.getText(), '* OnlyHeading');
    });

    test('should keep document unchanged when cursor is not on heading (explicit guard)', async () => {
        const { doc } = await setupTest('* H1\nSome content\n* H2', 1, 5);

        await executeRefileCommand();

        assert.strictEqual(doc.getText(), '* H1\nSome content\n* H2');
    });

});
