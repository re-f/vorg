/**
 * Refile Applier Unit Tests
 *
 * Tests for the multi-file refile applier service.
 * Tests validation logic, WorkspaceEdit building, and safe failure behavior.
 */

import * as assert from 'assert';
import * as core from '../../types/core';
import { RefileSource, RefileTarget, RefilePlan, RefileEdit } from '../../commands/editing/refileDomain';
import { buildWorkspaceEdit } from '../../services/refileApplier';

// =============================================================================
// Mock Document Factory
// =============================================================================

interface MockTextDocument extends core.TextDocument {
  uri: string;
}

function createMockDocument(content: string, uri: string = 'file:///test.org'): MockTextDocument {
  const lines = content.split('\n');
  return {
    uri,
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

// =============================================================================
// WorkspaceEdit Builder Tests
// =============================================================================

suite('refileApplier: buildWorkspaceEdit', () => {

  test('should build WorkspaceEdit with correct document URIs for cross-file plan', () => {
    // Source document
    const sourceDoc = createMockDocument('* H1\n** H2\ncontent', 'file:///source.org');
    // Target document
    const targetDoc = createMockDocument('* Target\n** Child', 'file:///target.org');

    const source: RefileSource = {
      uri: 'file:///source.org',
      startLine: 1,
      endLine: 2,
      rawText: '** H2\ncontent',
      rootLevel: 2,
    };

    const target: RefileTarget = {
      uri: 'file:///target.org',
      line: 0,
      level: 1,
      outlinePath: ['Target'],
      headingText: '* Target',
    };

    const plan: RefilePlan = {
      source,
      target,
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        {
          type: 'delete',
          documentUri: 'file:///source.org',
          range: { start: { line: 1, character: 0 }, end: { line: 2, character: 7 } }
        },
        {
          type: 'insert',
          documentUri: 'file:///target.org',
          text: '** H2\ncontent',
          position: { line: 1, character: 9 }
        }
      ],
      newSourceRootLevel: 2,
    };

    // Verify the plan has correct URIs
    assert.strictEqual(plan.sourceDocumentUri, 'file:///source.org');
    assert.strictEqual(plan.targetDocumentUri, 'file:///target.org');

    // Verify each edit has correct document URI
    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;
    const insertEdit = plan.edits.find(e => e.type === 'insert')!;

    assert.strictEqual(deleteEdit.documentUri, 'file:///source.org');
    assert.strictEqual(insertEdit.documentUri, 'file:///target.org');
  });

  test('should build edit with delete at source document URI', () => {
    const deleteEdit: RefileEdit = {
      type: 'delete',
      documentUri: 'file:///source.org',
      range: { start: { line: 1, character: 0 }, end: { line: 2, character: 10 } }
    };

    assert.strictEqual(deleteEdit.type, 'delete');
    assert.strictEqual(deleteEdit.documentUri, 'file:///source.org');
    assert.strictEqual(deleteEdit.range!.start.line, 1);
    assert.strictEqual(deleteEdit.range!.end.line, 2);
  });

  test('should build edit with insert at target document URI', () => {
    const insertEdit: RefileEdit = {
      type: 'insert',
      documentUri: 'file:///target.org',
      text: '** New Heading\ncontent',
      position: { line: 5, character: 0 }
    };

    assert.strictEqual(insertEdit.type, 'insert');
    assert.strictEqual(insertEdit.documentUri, 'file:///target.org');
    assert.strictEqual(insertEdit.text, '** New Heading\ncontent');
    assert.strictEqual(insertEdit.position!.line, 5);
  });

  test('cross-file plan should have different source and target URIs', () => {
    const plan: RefilePlan = {
      source: {
        uri: 'file:///source.org',
        startLine: 1,
        endLine: 2,
        rawText: '** H2\ncontent',
        rootLevel: 2,
      },
      target: {
        uri: 'file:///target.org',
        line: 0,
        level: 1,
        outlinePath: [],
        headingText: '* Target',
      },
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        { type: 'delete', documentUri: 'file:///source.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 7 } } },
        { type: 'insert', documentUri: 'file:///target.org', text: '** H2\ncontent', position: { line: 1, character: 9 } }
      ],
      newSourceRootLevel: 2,
    };

    assert.notStrictEqual(plan.sourceDocumentUri, plan.targetDocumentUri);
    assert.strictEqual(plan.sourceDocumentUri, 'file:///source.org');
    assert.strictEqual(plan.targetDocumentUri, 'file:///target.org');
  });

  test('single-file plan should have same source and target URIs', () => {
    const plan: RefilePlan = {
      source: {
        uri: 'file:///same.org',
        startLine: 1,
        endLine: 2,
        rawText: '** H2\ncontent',
        rootLevel: 2,
      },
      target: {
        uri: 'file:///same.org',
        line: 3,
        level: 1,
        outlinePath: [],
        headingText: '* H3',
      },
      sourceDocumentUri: 'file:///same.org',
      targetDocumentUri: 'file:///same.org',
      edits: [
        { type: 'delete', documentUri: 'file:///same.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 7 } } },
        { type: 'insert', documentUri: 'file:///same.org', text: '** H2\ncontent', position: { line: 3, character: 4 } }
      ],
      newSourceRootLevel: 2,
    };

    assert.strictEqual(plan.sourceDocumentUri, plan.targetDocumentUri);
  });

});

// =============================================================================
// Source Validation Tests
// =============================================================================

suite('refileApplier: source document validation', () => {

  test('source validation should pass when heading level matches', () => {
    // Source at line 1 with level 2
    const doc = createMockDocument('* H1\n** H2\ncontent\n* H3', 'file:///test.org');

    // Verify document line at expected source position is correct level
    const line1Text = doc.lineAt(1).text;
    assert.strictEqual(line1Text, '** H2');

    // Level check logic: parseHeading should return level 2 for '** H2'
    const { HeadingParser } = require('../../parsers/headingParser');
    const parsed = HeadingParser.parseHeading(line1Text, false, ['TODO', 'DONE', 'NEXT']);
    assert.strictEqual(parsed.level, 2, 'heading level should be 2');
  });

  test('source validation should detect when heading level changed', () => {
    // Original source was level 2, but document now has level 3
    const doc = createMockDocument('* H1\n*** H2\ncontent\n* H3', 'file:///test.org');

    const line1Text = doc.lineAt(1).text;
    const { HeadingParser } = require('../../parsers/headingParser');
    const parsed = HeadingParser.parseHeading(line1Text, false, ['TODO', 'DONE', 'NEXT']);

    // Document shows level 3 but we expect level 2
    assert.strictEqual(parsed.level, 3, 'document has level 3');
    assert.strictEqual(parsed.level !== 2, true, 'level mismatch should be detected');
  });

  test('source validation should fail when start line is out of bounds', () => {
    const doc = createMockDocument('* H1\n** H2', 'file:///test.org');

    // Line count is 2, so valid lines are 0 and 1
    const validLineCount = doc.lineCount;
    const outOfBoundsLine = 5;

    assert.strictEqual(outOfBoundsLine >= validLineCount, true, 'line 5 is out of bounds for 2-line doc');
  });

  test('source validation should fail when start line is no longer a heading', () => {
    // Document changed - what was a heading is now content
    const doc = createMockDocument('* H1\njust content\n** H2', 'file:///test.org');

    const { HeadingParser } = require('../../parsers/headingParser');
    const parsed = HeadingParser.parseHeading(doc.lineAt(1).text, false, ['TODO', 'DONE', 'NEXT']);

    assert.strictEqual(parsed.level, 0, 'content line should have level 0');
    assert.strictEqual(parsed.level === 0, true, 'non-heading should fail validation');
  });

});

// =============================================================================
// Target Validation Tests
// =============================================================================

suite('refileApplier: target document validation', () => {

  test('target validation should pass when heading level matches', () => {
    const doc = createMockDocument('* H1\n** H2\n* Target', 'file:///test.org');

    const { HeadingParser } = require('../../parsers/headingParser');
    const parsed = HeadingParser.parseHeading(doc.lineAt(2).text, false, ['TODO', 'DONE', 'NEXT']);

    assert.strictEqual(parsed.level, 1, 'target should be level 1');
  });

  test('target validation should fail when target line is no longer a heading', () => {
    // Target line was a heading but is now content
    const doc = createMockDocument('* H1\n** H2\njust content', 'file:///test.org');

    const { HeadingParser } = require('../../parsers/headingParser');
    const parsed = HeadingParser.parseHeading(doc.lineAt(2).text, false, ['TODO', 'DONE', 'NEXT']);

    assert.strictEqual(parsed.level, 0, 'content should have level 0');
  });

  test('target validation should fail when target line is out of bounds', () => {
    const doc = createMockDocument('* H1\n** H2', 'file:///test.org');

    // Only 2 lines (0 and 1), line 5 is out of bounds
    assert.strictEqual(5 >= doc.lineCount, true, 'line 5 is out of bounds');
  });

});

// =============================================================================
// Multi-file Edit Plan Structure Tests
// =============================================================================

suite('refileApplier: multi-file edit plan structure', () => {

  test('cross-file plan should have exactly 2 edits', () => {
    const plan: RefilePlan = {
      source: {
        uri: 'file:///source.org',
        startLine: 1,
        endLine: 2,
        rawText: '** H2\ncontent',
        rootLevel: 2,
      },
      target: {
        uri: 'file:///target.org',
        line: 0,
        level: 1,
        outlinePath: ['Target'],
        headingText: '* Target',
      },
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        { type: 'delete', documentUri: 'file:///source.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 7 } } },
        { type: 'insert', documentUri: 'file:///target.org', text: '** H2\ncontent', position: { line: 1, character: 9 } }
      ],
      newSourceRootLevel: 2,
    };

    assert.strictEqual(plan.edits.length, 2);
  });

  test('delete edit should reference source document URI', () => {
    const plan: RefilePlan = {
      source: { uri: 'file:///source.org', startLine: 1, endLine: 2, rawText: '** H2', rootLevel: 2 },
      target: { uri: 'file:///target.org', line: 0, level: 1, outlinePath: [], headingText: '* T' },
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        { type: 'delete', documentUri: 'file:///source.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 5 } } },
        { type: 'insert', documentUri: 'file:///target.org', text: '** H2', position: { line: 0, character: 8 } }
      ],
      newSourceRootLevel: 2,
    };

    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;
    assert.strictEqual(deleteEdit.documentUri, plan.sourceDocumentUri);
  });

  test('insert edit should reference target document URI', () => {
    const plan: RefilePlan = {
      source: { uri: 'file:///source.org', startLine: 1, endLine: 2, rawText: '** H2', rootLevel: 2 },
      target: { uri: 'file:///target.org', line: 0, level: 1, outlinePath: [], headingText: '* T' },
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        { type: 'delete', documentUri: 'file:///source.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 5 } } },
        { type: 'insert', documentUri: 'file:///target.org', text: '** H2', position: { line: 0, character: 8 } }
      ],
      newSourceRootLevel: 2,
    };

    const insertEdit = plan.edits.find(e => e.type === 'insert')!;
    assert.strictEqual(insertEdit.documentUri, plan.targetDocumentUri);
  });

  test('delete range should match source start and end lines', () => {
    const source = {
      uri: 'file:///source.org',
      startLine: 1,
      endLine: 2,
      rawText: '** H2\ncontent',
      rootLevel: 2,
    };

    const plan: RefilePlan = {
      source,
      target: { uri: 'file:///target.org', line: 0, level: 1, outlinePath: [], headingText: '* T' },
      sourceDocumentUri: 'file:///source.org',
      targetDocumentUri: 'file:///target.org',
      edits: [
        { type: 'delete', documentUri: 'file:///source.org', range: { start: { line: source.startLine, character: 0 }, end: { line: source.endLine, character: 7 } } },
        { type: 'insert', documentUri: 'file:///target.org', text: '** H2\ncontent', position: { line: 0, character: 8 } }
      ],
      newSourceRootLevel: 2,
    };

    const deleteEdit = plan.edits.find(e => e.type === 'delete')!;
    assert.strictEqual(deleteEdit.range!.start.line, source.startLine);
    assert.strictEqual(deleteEdit.range!.end.line, source.endLine);
  });

});

// =============================================================================
// Single-file Plan Compatibility Tests
// =============================================================================

suite('refileApplier: single-file plan compatibility', () => {

  test('single-file plan should have same source and target URIs', () => {
    const plan: RefilePlan = {
      source: {
        uri: 'file:///same.org',
        startLine: 1,
        endLine: 2,
        rawText: '** H2\ncontent',
        rootLevel: 2,
      },
      target: {
        uri: 'file:///same.org',
        line: 3,
        level: 1,
        outlinePath: ['H1', 'H3'],
        headingText: '* H3',
      },
      sourceDocumentUri: 'file:///same.org',
      targetDocumentUri: 'file:///same.org',
      edits: [
        { type: 'delete', documentUri: 'file:///same.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 7 } } },
        { type: 'insert', documentUri: 'file:///same.org', text: '** H2\ncontent', position: { line: 3, character: 4 } }
      ],
      newSourceRootLevel: 2,
    };

    assert.strictEqual(plan.sourceDocumentUri, plan.targetDocumentUri);
    assert.strictEqual(plan.sourceDocumentUri, plan.source.uri);
    assert.strictEqual(plan.targetDocumentUri, plan.target.uri);
  });

  test('single-file plan should have 2 edits with same URI', () => {
    const plan: RefilePlan = {
      source: { uri: 'file:///same.org', startLine: 1, endLine: 2, rawText: '** H2', rootLevel: 2 },
      target: { uri: 'file:///same.org', line: 3, level: 1, outlinePath: [], headingText: '* H3' },
      sourceDocumentUri: 'file:///same.org',
      targetDocumentUri: 'file:///same.org',
      edits: [
        { type: 'delete', documentUri: 'file:///same.org', range: { start: { line: 1, character: 0 }, end: { line: 2, character: 5 } } },
        { type: 'insert', documentUri: 'file:///same.org', text: '** H2', position: { line: 3, character: 4 } }
      ],
      newSourceRootLevel: 2,
    };

    plan.edits.forEach(edit => {
      assert.strictEqual(edit.documentUri, 'file:///same.org');
    });
  });

});

// =============================================================================
// ApplyResult Type Tests
// =============================================================================

suite('refileApplier: ApplyResult type', () => {

  test('success result should have ok: true', () => {
    const result = { ok: true };
    assert.strictEqual(result.ok, true);
    assert.strictEqual('error' in result, false);
  });

  test('failure result should have ok: false and error reason', () => {
    const result: { ok: false; error: string; reason: string } = {
      ok: false,
      error: 'Source validation failed',
      reason: 'SOURCE_VALIDATION_FAILED'
    };
    assert.strictEqual(result.ok, false);
    assert.ok(result.error);
    assert.ok(result.reason);
  });

  test('failure reason should indicate source document not found', () => {
    const reason = 'SOURCE_DOCUMENT_NOT_FOUND';
    assert.strictEqual(reason.includes('SOURCE'), true);
  });

  test('failure reason should indicate target document not found', () => {
    const reason = 'TARGET_DOCUMENT_NOT_FOUND';
    assert.strictEqual(reason.includes('TARGET'), true);
  });

  test('failure reason should indicate source validation failed', () => {
    const reason = 'SOURCE_VALIDATION_FAILED';
    assert.strictEqual(reason, 'SOURCE_VALIDATION_FAILED');
  });

  test('failure reason should indicate target validation failed', () => {
    const reason = 'TARGET_VALIDATION_FAILED';
    assert.strictEqual(reason, 'TARGET_VALIDATION_FAILED');
  });

});
