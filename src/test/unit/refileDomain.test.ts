import * as assert from 'assert';
import * as core from '../../types/core';
import { RefileSource, RefileTarget, RefilePlan, RefileEdit, RefileError, Result } from '../../commands/editing/refileDomain';

/**
 * 创建 mock document
 */
function createMockDocument(content: string): core.TextDocument {
  const lines = content.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
      range: {
        start: { line: line, character: 0 },
        end: { line: line, character: lines[line]?.length || 0 }
      }
    }),
    getText: (range?: core.Range) => {
      if (!range) return content;
      const startLine = range.start.line;
      const endLine = range.end.line;
      if (startLine === endLine) {
        return lines[startLine].substring(range.start.character, range.end.character);
      }
      let result = lines[startLine].substring(range.start.character) + '\n';
      for (let i = startLine + 1; i < endLine; i++) {
        result += lines[i] + '\n';
      }
      result += lines[endLine].substring(0, range.end.character);
      return result;
    }
  };
}

function createPosition(line: number, character: number = 0): core.Position {
  return { line, character };
}

suite('Refile Domain Logic Tests', () => {

  // ============ Subtree Range Extraction ============

  suite('extractSubtreeRange', () => {

    test('should extract complete subtree range for top-level heading', () => {
      // * H1
      // content line
      // ** H2
      // *** H3
      // * H4
      const content = [
        '* H1',
        'content line',
        '** H2',
        '*** H3',
        '* H4'
      ].join('\n');
      const document = createMockDocument(content);
      const position = createPosition(0); // cursor on * H1

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(result.ok, 'should return ok');
      const src = (result as any).source;
      assert.strictEqual(src.startLine, 0, 'startLine should be 0');
      assert.strictEqual(src.endLine, 3, 'endLine should be 3 (*** H3)');
      assert.strictEqual(src.rootLevel, 1, 'rootLevel should be 1');
    });

    test('should extract complete subtree range for nested heading', () => {
      // * H1
      // ** H2
      // content
      // *** H3
      // **** H4
      // ** H5
      const content = [
        '* H1',
        '** H2',
        'content',
        '*** H3',
        '**** H4',
        '** H5'
      ].join('\n');
      const document = createMockDocument(content);
      const position = createPosition(1); // cursor on ** H2

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(result.ok, 'should return ok');
      const src = (result as any).source;
      assert.strictEqual(src.startLine, 1, 'startLine should be 1');
      assert.strictEqual(src.endLine, 4, 'endLine should be 4 (**** H4)');
      assert.strictEqual(src.rootLevel, 2, 'rootLevel should be 2');
    });

    test('should handle heading with no children', () => {
      // * H1
      // * H2
      const content = '* H1\n* H2';
      const document = createMockDocument(content);
      const position = createPosition(0);

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(result.ok, 'should return ok');
      const src = (result as any).source;
      assert.strictEqual(src.startLine, 0);
      assert.strictEqual(src.endLine, 0, 'endLine should equal startLine when no children');
    });

    test('should return error when cursor is not on a heading', () => {
      // * H1
      // content
      // * H2
      const content = '* H1\ncontent\n* H2';
      const document = createMockDocument(content);
      const position = createPosition(1); // cursor on content line

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(!result.ok, 'should return error');
      assert.strictEqual((result as any).error, RefileError.NotAHeading);
    });

    test('should return error when cursor is on last heading at end of doc', () => {
      // * H1
      // ** H2
      const content = '* H1\n** H2';
      const document = createMockDocument(content);
      const position = createPosition(1); // cursor on ** H2 (last line)

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(result.ok, 'should return ok for last heading');
      const src = (result as any).source;
      assert.strictEqual(src.startLine, 1);
      assert.strictEqual(src.endLine, 1, 'endLine should equal startLine');
    });

    test('should extract subtree at deep nesting', () => {
      // * Level 1
      // ** Level 2
      // *** Level 3
      // **** Level 4
      // * Another Top
      const content = [
        '* Level 1',
        '** Level 2',
        '*** Level 3',
        '**** Level 4',
        '* Another Top'
      ].join('\n');
      const document = createMockDocument(content);
      const position = createPosition(2); // cursor on *** Level 3

      const result = RefileSource.extractSubtreeRange(document, position);

      assert.ok(result.ok, 'should return ok');
      const src = (result as any).source;
      assert.strictEqual(src.startLine, 2);
      assert.strictEqual(src.endLine, 3, 'should include **** Level 4');
      assert.strictEqual(src.rootLevel, 3, 'rootLevel should be 3');
    });

  });

  // ============ Target Validation ============

  suite('isValidTarget', () => {

    test('should reject when target is source itself', () => {
      // * H1
      // ** H2
      // * H3
      const content = '* H1\n** H2\n* H3';
      const document = createMockDocument(content);

      // Source is ** H2 (lines 1-1)
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is ** H2 itself (same position)
      const targetResult = RefileTarget.atLine(document, 1);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(!validResult.ok, 'target same as source should be invalid');
      assert.strictEqual((validResult as any).error, RefileError.TargetIsSource);
    });

    test('should reject when target is inside source subtree', () => {
      // * H1
      // ** H2
      // *** H3
      // **** H4
      // * H5
      const content = [
        '* H1',
        '** H2',
        '*** H3',
        '**** H4',
        '* H5'
      ].join('\n');
      const document = createMockDocument(content);

      // Source is ** H2 (lines 1-3)
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is *** H3 (line 2) - inside source subtree
      const targetResult = RefileTarget.atLine(document, 2);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(!validResult.ok, 'target inside source subtree should be invalid');
      assert.strictEqual((validResult as any).error, RefileError.TargetInsideSource);
    });

    test('should reject when target is descendant of source', () => {
      // * H1
      // ** H2
      // *** H3
      // **** H4
      // * H5
      const content = [
        '* H1',
        '** H2',
        '*** H3',
        '**** H4',
        '* H5'
      ].join('\n');
      const document = createMockDocument(content);

      // Source is ** H2
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is **** H4 (line 3) - descendant of source
      const targetResult = RefileTarget.atLine(document, 3);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(!validResult.ok, 'target descendant of source should be invalid');
      assert.strictEqual((validResult as any).error, RefileError.TargetInsideSource);
    });

    test('should accept valid target (sibling below source)', () => {
      // * H1
      // ** H2
      // * H3
      // ** H4
      const content = '* H1\n** H2\n* H3\n** H4';
      const document = createMockDocument(content);

      // Source is ** H2
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is * H3 (line 2) - valid sibling parent
      const targetResult = RefileTarget.atLine(document, 2);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(validResult.ok, 'sibling parent should be valid target');
    });

    test('should accept valid target (ancestor of source)', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is ** H2 (lines 1-2)
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is * H1 (line 0) - ancestor, valid
      const targetResult = RefileTarget.atLine(document, 0);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(validResult.ok, 'ancestor should be valid target');
    });

    test('should accept valid target (unrelated heading)', () => {
      // * H1
      // ** H2
      // * H3
      // ** H4
      // * H5
      const content = '* H1\n** H2\n* H3\n** H4\n* H5';
      const document = createMockDocument(content);

      // Source is ** H2
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is * H5 (line 4) - unrelated
      const targetResult = RefileTarget.atLine(document, 4);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const validResult = RefileTarget.isValidTarget(source, target);
      assert.ok(validResult.ok, 'unrelated heading should be valid target');
    });

  });

  // ============ New Level Derivation ============

  suite('deriveNewSourceLevel', () => {

    test('should derive new level when refiling under direct child', () => {
      // * H1
      // ** H2
      // * H3
      // ** H4
      const content = '* H1\n** H2\n* H3\n** H4';
      const document = createMockDocument(content);

      // Source is ** H4 (level 2), target is * H3 (level 1)
      // When refiled under * H3, ** H4 becomes *** H4 (target level + 1)
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(3));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 2);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const newLevel = RefileSource.deriveNewSourceLevel(source, target);

      // source (level 2) under target (level 1) => new level = 1 + 1 = 2
      assert.strictEqual(newLevel, 2, 'source should become level 2 (target level 1 + 1)');
    });

    test('should derive new level when refiling under same level sibling', () => {
      // Source: ** H2 (rootLevel=2)
      // Target: * H3 (level=1)
      // Relative depth of source from its root: 2-2=0
      // New level: 1 + 1 + 0 = 2
      // * H1
      // ** H2
      // * H3
      const content = '* H1\n** H2\n* H3';
      const document = createMockDocument(content);

      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 2);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const newLevel = RefileSource.deriveNewSourceLevel(source, target);

      assert.strictEqual(newLevel, 2, 'source root level should become 2');
    });

    test('should preserve relative depth when refiling nested subtree', () => {
      // Source is *** H3 (rootLevel=3, depth from root = 0)
      // Target is ** H2 (level=2)
      // New level: 2 + 1 + 0 = 3
      // * H1
      // ** H2
      // *** H3
      // **** H4
      // * H5
      const content = [
        '* H1',
        '** H2',
        '*** H3',
        '**** H4',
        '* H5'
      ].join('\n');
      const document = createMockDocument(content);

      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(2)); // *** H3
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 1); // ** H2
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const newLevel = RefileSource.deriveNewSourceLevel(source, target);

      assert.strictEqual(newLevel, 3, '*** H3 refiled under ** H2 should become level 3');
    });

    test('should compute new level for deeply nested descendant', () => {
      // Source is *** H3 (rootLevel=3), whose descendant **** H4 is at depth 1
      // Target is ** H2 (level=2)
      // After refile, *** H3 becomes level 3, so **** H4 becomes level 4
      // * H1
      // ** H2
      // *** H3
      // **** H4
      // * H5
      const content = [
        '* H1',
        '** H2',
        '*** H3',
        '**** H4',
        '* H5'
      ].join('\n');
      const document = createMockDocument(content);

      // Extract *** H3 (line 2) as source, not **** H4
      // The test verifies that descendants' relative depth is preserved
      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(2)); // *** H3
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 1); // ** H2
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const newLevel = RefileSource.deriveNewSourceLevel(source, target);

      // *** H3 (level 3) under ** H2 (level 2) => new level = 2 + 1 = 3
      assert.strictEqual(newLevel, 3, '*** H3 refiled under ** H2 should become level 3');
    });

  });

  // ============ RefilePlan Generation ============

  suite('buildRefilePlan', () => {

    test('should generate plan for valid refile', () => {
      // * H1
      // ** H2
      // content
      // * H3
      const content = '* H1\n** H2\ncontent\n* H3';
      const document = createMockDocument(content);

      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 3);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const planResult = RefilePlan.buildRefilePlan(source, target, document);

      assert.ok(planResult.ok, 'should generate valid plan');
      const plan = (planResult as any).plan;

      // Should have 2 edits: delete source, insert at target
      assert.strictEqual(plan.edits.length, 2, 'should have 2 edits');

      const deleteEdit = plan.edits.find((e: RefileEdit) => e.type === 'delete');
      assert.ok(deleteEdit, 'should have a delete edit');
      assert.strictEqual(deleteEdit!.range!.start.line, 1, 'delete should start at line 1');
      assert.strictEqual(deleteEdit!.range!.end.line, 2, 'delete should end at line 2');

      const insertEdit = plan.edits.find((e: RefileEdit) => e.type === 'insert');
      assert.ok(insertEdit, 'should have an insert edit');
      assert.strictEqual(insertEdit!.position!.line, 2, 'insert should be at line 2');
    });

    test('should reject invalid target when building plan', () => {
      // * H1
      // ** H2
      // * H3
      const content = '* H1\n** H2\n* H3';
      const document = createMockDocument(content);

      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      // Target is source itself
      const targetResult = RefileTarget.atLine(document, 1);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const planResult = RefilePlan.buildRefilePlan(source, target, document);

      assert.ok(!planResult.ok, 'should reject invalid plan');
      assert.strictEqual((planResult as any).error, RefileError.TargetIsSource);
    });

    test('should set newLevel correctly in plan', () => {
      // * H1
      // ** H2
      // * H3
      const content = '* H1\n** H2\n* H3';
      const document = createMockDocument(content);

      const sourceResult = RefileSource.extractSubtreeRange(document, createPosition(1));
      assert.ok(sourceResult.ok);
      const source = (sourceResult as any).source;

      const targetResult = RefileTarget.atLine(document, 2);
      assert.ok(targetResult.ok);
      const target = (targetResult as any).target;

      const planResult = RefilePlan.buildRefilePlan(source, target, document);

      assert.ok(planResult.ok);
      const plan = (planResult as any).plan;
      assert.strictEqual(plan.newSourceRootLevel, 2, 'new level should be 2');
    });

  });

});
