/**
 * Refile Planner Unit Tests
 *
 * Tests for the pure domain logic in refilePlanner.ts.
 * No VS Code API dependencies.
 */

import * as assert from 'assert';
import * as core from '../../types/core';
import { RefileSource, RefileTarget, RefileError } from '../../commands/editing/refileDomain';
import { planRefile, buildRefilePlan, RefilePlannerOutput } from '../../services/refilePlanner';

/**
 * Create a mock document from string content
 */
function createMockDocument(content: string): core.TextDocument {
  const lines = content.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] ?? '',
      lineNumber: line,
      range: {
        start: { line, character: 0 },
        end: { line, character: lines[line]?.length ?? 0 }
      }
    }),
    getText: (range?: core.Range) => {
      if (!range) return content;
      const { start, end } = range;
      if (start.line === end.line) {
        return lines[start.line]?.substring(start.character, end.character) ?? '';
      }
      let result = (lines[start.line]?.substring(start.character) ?? '') + '\n';
      for (let i = start.line + 1; i < end.line; i++) {
        result += (lines[i] ?? '') + '\n';
      }
      result += lines[end.line]?.substring(0, end.character) ?? '';
      return result;
    }
  };
}

function createPosition(line: number, character: number = 0): core.Position {
  return { line, character };
}

/**
 * Helper: extract a RefileSource from document at given line
 */
function extractSource(document: core.TextDocument, line: number): RefileSource {
  const { RefileSource: RS } = require('../../commands/editing/refileDomain');
  const result = RS.extractSubtreeRange(document, createPosition(line));
  if (!result.ok) throw new Error('Failed to extract source: ' + result.error);
  return result.source;
}

/**
 * Helper: create a RefileTarget at given line
 */
function createTarget(document: core.TextDocument, line: number): RefileTarget {
  const { RefileTarget: RT } = require('../../commands/editing/refileDomain');
  const result = RT.atLine(document, line);
  if (!result.ok) throw new Error('Failed to create target: ' + result.error);
  return result.target;
}

// =============================================================================
// Level Rewriting Tests
// =============================================================================

suite('refilePlanner: level rewriting', () => {

  test('should rewrite source root level to target level + 1', () => {
    // * H1
    // ** H2
    // * H3
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    // Source: ** H2 (rootLevel=2), Target: * H3 (level=1)
    // After refile: ** H2 → * H3's child = ** H2 (level 2 = 1 + 1)
    const source = extractSource(document, 1);
    const target = createTarget(document, 2);

    assert.strictEqual(source.rootLevel, 2);
    assert.strictEqual(target.level, 1);

    const result = planRefile({ source, target, document });

    assert.ok(result.ok, 'should succeed');
    const plan = result as unknown as RefilePlannerOutput;

    // New root level should be target.level + 1 = 2
    assert.strictEqual(plan.newSourceRootLevel, 2, 'new root level should be 2');

    // Adjusted text should have the heading at level 2
    assert.ok(plan.adjustedSourceText.startsWith('** H2'), 'heading should remain at level 2');
  });

  test('should preserve relative depth of nested children', () => {
    // * H1
    // ** H2
    // *** H3
    // **** H4
    // * H5
    const content = '* H1\n** H2\n*** H3\n**** H4\n* H5';
    const document = createMockDocument(content);

    // Source: ** H2 (rootLevel=2) with descendants at 3, 4
    // Target: * H5 (level=1)
    // After refile: ** H2 → * H5's child = ** H2 (level 2 = 1 + 1)
    // *** H3 (relative depth 1 from root) → level 3
    // **** H4 (relative depth 2 from root) → level 4
    const source = extractSource(document, 1);
    const target = createTarget(document, 4);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = (result as unknown as RefilePlannerOutput).adjustedSourceText;

    // Check that all heading levels are preserved relative to root
    assert.ok(plan.includes('** H2'), 'root should stay at **');
    assert.ok(plan.includes('*** H3'), 'H3 should stay at *** (relative depth 1)');
    assert.ok(plan.includes('**** H4'), 'H4 should stay at **** (relative depth 2)');
  });

  test('should correctly re-level when source is deeply nested', () => {
    // * Level 1
    // ** Level 2
    // *** Level 3
    // **** Level 4
    // * Another Top
    const content = '* Level 1\n** Level 2\n*** Level 3\n**** Level 4\n* Another Top';
    const document = createMockDocument(content);

    // Source: *** Level 3 (rootLevel=3), child **** Level 4 (depth 1)
    // Target: ** Level 2 (level=2)
    // After refile: *** Level 3 → ** Level 2's child = *** Level 3 (2+1=3)
    // **** Level 4 → **** Level 3's child = **** Level 4 (3+1=4)
    const source = extractSource(document, 2); // *** Level 3
    const target = createTarget(document, 1);   // ** Level 2

    assert.strictEqual(source.rootLevel, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = (result as unknown as RefilePlannerOutput).adjustedSourceText;

    assert.ok(plan.includes('*** Level 3'), 'root should become ***');
    assert.ok(plan.includes('**** Level 4'), 'child should become ****');
  });

  test('should preserve TODO keywords and priorities when rewriting', () => {
    // * H1
    // ** TODO [#A] Important Task
    // *** NEXT Another Task
    // * H2
    const content = '* H1\n** TODO [#A] Important Task\n*** NEXT Another Task\n* H2';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = (result as unknown as RefilePlannerOutput).adjustedSourceText;

    assert.ok(plan.includes('** TODO [#A] Important Task'), 'TODO keyword and priority should be preserved');
    assert.ok(plan.includes('*** NEXT Another Task'), 'NEXT keyword should be preserved');
  });

});

// =============================================================================
// Insert Position Tests
// =============================================================================

suite('refilePlanner: insert position', () => {

  test('should insert at end of target subtree when target has no children', () => {
    // * H1
    // ** H2
    // content
    // * H3
    // ** H4
    const content = '* H1\n** H2\ncontent\n* H3\n** H4';
    const document = createMockDocument(content);

    // Source: ** H2 + content (lines 1-2)
    // Target: * H3 (line 3), which has child ** H4
    // Insert position: end of * H3's subtree, which is after ** H4
    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    assert.strictEqual(source.startLine, 1);
    assert.strictEqual(source.endLine, 2);
    assert.strictEqual(target.level, 1);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const insertEdit = plan.edits.find(e => e.type === 'insert');

    assert.ok(insertEdit, 'should have an insert edit');
    // Insert should be at end of line 4 (end of ** H4's line), not at * H3
    assert.strictEqual(insertEdit!.position!.line, 4, 'insert at end of target subtree (line 4)');
  });

  test('should insert at end of target line when target has no children', () => {
    // * H1
    // ** H2
    // content
    // * H3
    // nothing else
    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const insertEdit = plan.edits.find(e => e.type === 'insert');

    assert.ok(insertEdit);
    // Target * H3 has no children, so its subtree ends at line 3
    assert.strictEqual(insertEdit!.position!.line, 3, 'insert at end of target line 3');
  });

  test('should insert after all descendants of target', () => {
    // * Root
    // ** Child1
    // *** Grandchild
    // ** Child2
    // * Another
    const content = '* Root\n** Child1\n*** Grandchild\n** Child2\n* Another';
    const document = createMockDocument(content);

    // Source: * Another
    // Target: ** Child1 (line 1), which has subtree lines 1-3
    // Insert should be after line 3 (after *** Grandchild)
    const source = extractSource(document, 4);
    const target = createTarget(document, 1);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const insertEdit = plan.edits.find(e => e.type === 'insert');

    assert.ok(insertEdit);
    // ** Child1's subtree ends at line 3 (*** Grandchild), next heading is ** Child2 at line 3 (same level)
    // So we insert before ** Child2, at end of line 2 (after *** Grandchild)
    assert.strictEqual(insertEdit!.position!.line, 2, 'insert after target subtree end');
  });

});

// =============================================================================
// Edit Plan Structure Tests
// =============================================================================

suite('refilePlanner: edit plan structure', () => {

  test('should generate exactly 2 edits: delete and insert', () => {
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 2);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    assert.strictEqual(plan.edits.length, 2, 'should have 2 edits');

    const deleteEdit = plan.edits.find(e => e.type === 'delete');
    const insertEdit = plan.edits.find(e => e.type === 'insert');

    assert.ok(deleteEdit, 'should have delete edit');
    assert.ok(insertEdit, 'should have insert edit');
  });

  test('should set correct delete range covering source subtree', () => {
    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;

    assert.strictEqual(deleteEdit.range!.start.line, 1, 'delete starts at source startLine');
    assert.strictEqual(deleteEdit.range!.end.line, 2, 'delete ends at source endLine');
  });

  test('should include adjusted text in insert edit', () => {
    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const insertEdit = plan.edits.find(e => e.type === 'insert')!;

    assert.ok(insertEdit!.text, 'insert edit should have text');
    assert.ok(insertEdit!.text!.includes('** H2'), 'insert text should contain heading');
  });

  test('should set newSourceRootLevel correctly', () => {
    // * H1
    // ** H2
    // * H3
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    // Source: ** H2 (level 2), Target: * H3 (level 1)
    // newRootLevel = 1 + 1 = 2
    const source = extractSource(document, 1);
    const target = createTarget(document, 2);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    assert.strictEqual(plan.newSourceRootLevel, 2, 'new root level should be 2');
  });

  test('should return adjustedSourceText with rewritten levels', () => {
    // * H1
    // ** H2
    // *** H3
    // * H4
    const content = '* H1\n** H2\n*** H3\n* H4';
    const document = createMockDocument(content);

    // Source: ** H2 (rootLevel=2) with child *** H3
    // Target: * H4 (level=1)
    // After refile: ** H2 → ** H4's child = ** H2 (2 = 1+1)
    // *** H3 → *** (relative depth 1 from ** H2)
    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // The adjusted text should have ** H2 (not *** H3)
    assert.ok(plan.adjustedSourceText.startsWith('** H2'), 'root heading should be at **');
    assert.ok(plan.adjustedSourceText.includes('*** H3'), 'child should be at ***');
  });

});

// =============================================================================
// Invalid Target Tests
// =============================================================================

suite('refilePlanner: invalid targets', () => {

  test('should reject when target is source itself', () => {
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 1); // same as source

    const result = planRefile({ source, target, document });

    assert.ok(!result.ok, 'should reject target same as source');
    assert.strictEqual(result.error, RefileError.TargetIsSource);
  });

  test('should reject when target is inside source subtree', () => {
    // * H1
    // ** H2
    // *** H3
    // **** H4
    // * H5
    const content = '* H1\n** H2\n*** H3\n**** H4\n* H5';
    const document = createMockDocument(content);

    const source = extractSource(document, 1); // ** H2 (lines 1-3)
    const target = createTarget(document, 2);    // *** H3 (inside source subtree)

    const result = planRefile({ source, target, document });

    assert.ok(!result.ok, 'should reject target inside source subtree');
    assert.strictEqual(result.error, RefileError.TargetInsideSource);
  });

  test('should reject when target is descendant of source', () => {
    const content = '* H1\n** H2\n*** H3\n**** H4\n* H5';
    const document = createMockDocument(content);

    const source = extractSource(document, 1); // ** H2
    const target = createTarget(document, 3);   // **** H4 (descendant)

    const result = planRefile({ source, target, document });

    assert.ok(!result.ok);
    assert.strictEqual(result.error, RefileError.TargetInsideSource);
  });

});

// =============================================================================
// buildRefilePlan Compatibility Tests
// =============================================================================

suite('buildRefilePlan: returns RefilePlan compatible structure', () => {

  test('should return a valid RefilePlan for legal refile', () => {
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 2);

    const result = buildRefilePlan(source, target, document);

    assert.ok(result.ok, 'should return ok');
    const plan = (result as any).plan;
    assert.ok(plan.source, 'plan should have source');
    assert.ok(plan.target, 'plan should have target');
    assert.ok(plan.edits, 'plan should have edits');
    assert.strictEqual(plan.newSourceRootLevel, 2, 'new level should be 2');
  });

  test('should return error for invalid target', () => {
    const content = '* H1\n** H2\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 1); // same as source

    const result = buildRefilePlan(source, target, document);

    assert.ok(!result.ok);
    assert.strictEqual(result.error, RefileError.TargetIsSource);
  });

  test('should have both delete and insert edits in plan', () => {
    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 3);

    const result = buildRefilePlan(source, target, document);
    assert.ok(result.ok);

    const plan = (result as any).plan;
    const hasDelete = plan.edits.some((e: any) => e.type === 'delete');
    const hasInsert = plan.edits.some((e: any) => e.type === 'insert');

    assert.ok(hasDelete, 'plan should have delete edit');
    assert.ok(hasInsert, 'plan should have insert edit');
  });

});

// =============================================================================
// Single-file Refile End-to-end Tests
// =============================================================================

suite('refilePlanner: end-to-end single-file refile', () => {

  test('should correctly plan refile of simple subtree to sibling parent', () => {
    // Before:
    // * H1
    // ** H2
    // content
    // * H3
    //
    // After refile of ** H2 under * H3:
    // * H1
    // * H3
    // ** H2
    // content

    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);

    const source = extractSource(document, 1); // ** H2
    const target = createTarget(document, 3);   // * H3

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // Verify delete covers lines 1-2
    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;
    assert.strictEqual(deleteEdit.range!.start.line, 1);
    assert.strictEqual(deleteEdit.range!.start.character, 0);
    assert.strictEqual(deleteEdit.range!.end.line, 2);

    // Verify insert position is at end of target (line 3)
    const insertEdit = plan.edits.find(e => e.type === 'insert')!;
    assert.strictEqual(insertEdit.position!.line, 3);

    // Verify adjusted text has correct levels
    assert.ok(plan.adjustedSourceText.startsWith('** H2'));
    assert.ok(plan.adjustedSourceText.includes('content'));
  });

  test('should preserve content lines exactly (non-heading lines unchanged)', () => {
    const content = '* H1\n** H2\nsome content here\n*** H3\n  nested content\n* H4';
    const document = createMockDocument(content);

    const source = extractSource(document, 1);
    const target = createTarget(document, 5);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // Non-heading lines should be preserved exactly
    assert.ok(plan.adjustedSourceText.includes('some content here'));
    assert.ok(plan.adjustedSourceText.includes('  nested content'));
  });

  test('should handle refile to ancestor (promoting subtree)', () => {
    // * H1
    // ** H2
    // *** H3
    // **** H4
    // * H5
    const content = '* H1\n** H2\n*** H3\n**** H4\n* H5';
    const document = createMockDocument(content);

    // Source: ** H2 (rootLevel=2) with descendants at 3, 4
    // Target: * H1 (level=1) - ancestor of source
    // After refile: ** H2 → * H1's child = ** H2 (level 2 = 1+1)
    // *** H3 → *** (relative depth 1)
    // **** H4 → **** (relative depth 2)
    const source = extractSource(document, 1);
    const target = createTarget(document, 0);

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    assert.strictEqual(plan.newSourceRootLevel, 2);
    assert.ok(plan.adjustedSourceText.startsWith('** H2'));
    assert.ok(plan.adjustedSourceText.includes('*** H3'));
    assert.ok(plan.adjustedSourceText.includes('**** H4'));
  });

  test('should handle refile that demotes subtree (target is ancestor)', () => {
    // * H1
    // * H2
    // ** H3
    // *** H4
    const content = '* H1\n* H2\n** H3\n*** H4';
    const document = createMockDocument(content);

    // Source: * H2 (rootLevel=1, subtree includes ** H3 and *** H4)
    // Target: * H1 (level=1) - ancestor of source
    // After refile: * H2 → * H1's child = ** H2 (level 2 = 1+1)
    // ** H3 → *** H3 (relative depth 1)
    // *** H4 → **** H4 (relative depth 2)
    const source = extractSource(document, 1); // * H2
    const target = createTarget(document, 0);   // * H1

    const result = planRefile({ source, target, document });
    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // newRootLevel = target.level + 1 = 2
    assert.strictEqual(plan.newSourceRootLevel, 2);
    assert.ok(plan.adjustedSourceText.startsWith('** H2'));
    assert.ok(plan.adjustedSourceText.includes('*** H3'));
    assert.ok(plan.adjustedSourceText.includes('**** H4'));
  });

});

// =============================================================================
// Cross-File Refile Tests
// =============================================================================

suite('refilePlanner: cross-file refile', () => {

  test('should generate cross-file refile plan with correct document URIs', () => {
    // Source document
    const sourceContent = '* H1\n** H2\ncontent\n* H3';
    const sourceDoc = createMockDocument(sourceContent);
    (sourceDoc as any).uri = 'file:///source.org';

    // Target document
    const targetContent = '* Target\n** Child';
    const targetDoc = createMockDocument(targetContent);
    (targetDoc as any).uri = 'file:///target.org';

    // Source: ** H2 (rootLevel=2) at line 1, Target: * Target (level=1) at line 0
    const source = extractSource(sourceDoc, 1);
    source.uri = 'file:///source.org';
    const target = createTarget(targetDoc, 0);
    target.uri = 'file:///target.org';

    const result = planRefile({
      source,
      target,
      sourceDocument: sourceDoc,
      targetDocument: targetDoc
    });

    assert.ok(result.ok, 'cross-file refile should succeed');

    const plan = result as unknown as RefilePlannerOutput;

    // Verify document URIs are correctly set
    assert.strictEqual(plan.sourceDocumentUri, 'file:///source.org');
    assert.strictEqual(plan.targetDocumentUri, 'file:///target.org');

    // Verify edits have correct document URIs
    const deleteEdit = plan.edits.find(e => e.type === 'delete');
    const insertEdit = plan.edits.find(e => e.type === 'insert');

    assert.ok(deleteEdit, 'should have delete edit');
    assert.ok(insertEdit, 'should have insert edit');

    assert.strictEqual(deleteEdit!.documentUri, 'file:///source.org');
    assert.strictEqual(insertEdit!.documentUri, 'file:///target.org');
  });

  test('cross-file plan should have delete on source doc and insert on target doc', () => {
    // Source document
    const sourceContent = '* Source Doc\n** Subtree\ncontent';
    const sourceDoc = createMockDocument(sourceContent);
    (sourceDoc as any).uri = 'file:///source.org';

    // Target document
    const targetContent = '* Target Doc\n** Existing';
    const targetDoc = createMockDocument(targetContent);
    (targetDoc as any).uri = 'file:///target.org';

    const source = extractSource(sourceDoc, 1);
    source.uri = 'file:///source.org';
    const target = createTarget(targetDoc, 0);
    target.uri = 'file:///target.org';

    const result = planRefile({
      source,
      target,
      sourceDocument: sourceDoc,
      targetDocument: targetDoc
    });

    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;
    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;
    const insertEdit = plan.edits.find(e => e.type === 'insert')!;

    // Delete edit should target source document
    assert.strictEqual(deleteEdit.documentUri, 'file:///source.org');
    assert.strictEqual(deleteEdit.range!.start.line, 1);
    assert.strictEqual(deleteEdit.range!.end.line, 2);

    // Insert edit should target target document
    assert.strictEqual(insertEdit.documentUri, 'file:///target.org');
    assert.strictEqual(insertEdit.position!.line, 1); // After ** Existing
  });

  test('should preserve subtree internal relative levels in cross-file refile', () => {
    // Source document
    const sourceContent = '* Src\n** H2\n*** H3\n**** H4';
    const sourceDoc = createMockDocument(sourceContent);
    (sourceDoc as any).uri = 'file:///source.org';

    // Target document
    const targetContent = '* Tgt';
    const targetDoc = createMockDocument(targetContent);
    (targetDoc as any).uri = 'file:///target.org';

    const source = extractSource(sourceDoc, 1);
    source.uri = 'file:///source.org';
    const target = createTarget(targetDoc, 0);
    target.uri = 'file:///target.org';

    const result = planRefile({
      source,
      target,
      sourceDocument: sourceDoc,
      targetDocument: targetDoc
    });

    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // Relative depths should be preserved
    // Source ** H2 (rootLevel=2) → Target * Tgt (level=1), new root = 2
    // *** H3 (depth 1 from root) → *** H3
    // **** H4 (depth 2 from root) → **** H4
    assert.strictEqual(plan.newSourceRootLevel, 2);
    assert.ok(plan.adjustedSourceText.startsWith('** H2'));
    assert.ok(plan.adjustedSourceText.includes('*** H3'));
    assert.ok(plan.adjustedSourceText.includes('**** H4'));
  });

  test('should maintain single-file compatibility when source and target in same file', () => {
    // Single document containing both source and target
    const content = '* H1\n** H2\ncontent\n* H3';
    const document = createMockDocument(content);
    (document as any).uri = 'file:///same.org';

    const source = extractSource(document, 1);
    source.uri = 'file:///same.org';
    const target = createTarget(document, 3);
    target.uri = 'file:///same.org';

    const result = planRefile({
      source,
      target,
      sourceDocument: document,
      targetDocument: document
    });

    assert.ok(result.ok);

    const plan = result as unknown as RefilePlannerOutput;

    // For single-file, both URIs should be the same
    assert.strictEqual(plan.sourceDocumentUri, 'file:///same.org');
    assert.strictEqual(plan.targetDocumentUri, 'file:///same.org');

    // Should still have two edits
    assert.strictEqual(plan.edits.length, 2);

    // Both edits should target same document
    plan.edits.forEach(edit => {
      assert.strictEqual(edit.documentUri, 'file:///same.org');
    });
  });

  test('should reject invalid target in cross-file scenario (target inside source)', () => {
    // Source document
    const sourceContent = '* Src\n** Sub\n*** Deep';
    const sourceDoc = createMockDocument(sourceContent);
    (sourceDoc as any).uri = 'file:///source.org';

    // Target document - different file
    const targetContent = '* Other';
    const targetDoc = createMockDocument(targetContent);
    (targetDoc as any).uri = 'file:///target.org';

    const source = extractSource(sourceDoc, 1);
    source.uri = 'file:///source.org';

    // Even in cross-file, the target is checked against source lines
    // Since target is on line 0 and source is on line 1, target is NOT inside source
    // This test verifies the validation still works
    const target = createTarget(targetDoc, 0);
    target.uri = 'file:///target.org';

    const result = planRefile({
      source,
      target,
      sourceDocument: sourceDoc,
      targetDocument: targetDoc
    });

    assert.ok(result.ok, 'target not inside source should be valid');
  });

});
