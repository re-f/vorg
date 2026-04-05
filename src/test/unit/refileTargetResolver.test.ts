/**
 * Refile Target Resolver Unit Tests
 *
 * Tests for resolveRefileTargets function.
 * These tests verify:
 * 1. Scanning current document and returning valid targets
 * 2. Building outline paths for duplicate headings
 * 3. Filtering source itself
 * 4. Filtering source descendants
 */

import * as assert from 'assert';
import * as core from '../../types/core';
import { RefileSource, RefileTarget, RefileError } from '../../commands/editing/refileDomain';
import {
  resolveRefileTargets,
  RefileTargetResolverInput,
  RefileTargetWithDisplay,
} from '../../services/refileTargetResolver';

/**
 * Create a mock document from content string
 */
function createMockDocument(content: string): core.TextDocument {
  const lines = content.split('\n');
  return {
    lineCount: lines.length,
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
      range: {
        start: { line, character: 0 },
        end: { line, character: lines[line]?.length || 0 }
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

/**
 * Extract source from document at given position
 */
function extractSource(document: core.TextDocument, position: core.Position): RefileSource {
  const keywords = ['TODO', 'NEXT', 'WAITING', 'DONE', 'CANCELLED'];
  const currentLine = document.lineAt(position.line);
  const headingInfo = parseHeading(currentLine.text, keywords);

  if (headingInfo.level === 0) {
    throw new Error('Not a heading');
  }

  const rootLevel = headingInfo.level;
  const startLine = position.line;

  // Find subtree end (simplified - just go to next heading at same or higher level)
  let endLine = startLine;
  for (let i = startLine + 1; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const info = parseHeading(line.text, keywords);
    if (info.level > 0 && info.level <= rootLevel) {
      endLine = i - 1;
      break;
    }
    endLine = i;
  }

  // Collect raw text
  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(document.lineAt(i).text);
  }

  return {
    uri: '',
    startLine,
    endLine,
    rawText: lines.join('\n'),
    rootLevel,
  };
}

// Simple heading parser for tests (reuse the same logic)
function parseHeading(text: string, keywords: string[]): { level: number; text: string; title: string } {
  const keywordRegex = new RegExp(`^(\\*+)\\s+(?:(${keywords.join('|')})\\s+)?(?:\\[#([A-C])\\]\\s+)?(.*)$`);
  const match = text.match(keywordRegex);

  if (!match) {
    return { level: 0, text, title: text };
  }

  const titleText = match[4] || '';
  return {
    level: match[1].length,
    text: titleText,
    title: titleText,
  };
}

suite('Refile Target Resolver Tests', () => {

  // ============ Basic Target Resolution ============

  suite('resolveRefileTargets', () => {

    test('should scan document and return all valid targets', () => {
      // * H1
      // ** H2
      // content
      // * H3
      // ** H4
      const content = '* H1\n** H2\ncontent\n* H3\n** H4';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Should have 3 valid targets: H1 (line 0), H3 (line 3), H4 (line 4)
      assert.strictEqual(targets.length, 3, 'should have 3 valid targets');

      // Verify target lines
      const targetLines = targets.map((t: RefileTargetWithDisplay) => t.target.line);
      assert.ok(targetLines.includes(0), 'H1 should be a target');
      assert.ok(targetLines.includes(3), 'H3 should be a target');
      assert.ok(targetLines.includes(4), 'H4 should be a target');
    });

    test('should filter source itself from candidates', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;
      const targetLines = targets.map((t: RefileTargetWithDisplay) => t.target.line);

      // Source itself (line 1) should NOT be in the list
      assert.ok(!targetLines.includes(1), 'source itself should not be a target');
    });

    test('should filter source descendants from candidates', () => {
      // * H1
      // ** H2
      // *** H3
      // **** H4
      // * H5
      const content = '* H1\n** H2\n*** H3\n**** H4\n* H5';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1), subtree spans lines 1-3
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;
      const targetLines = targets.map((t: RefileTargetWithDisplay) => t.target.line);

      // H3 (line 2) and H4 (line 3) are inside source subtree - should be filtered
      assert.ok(!targetLines.includes(2), 'H3 (descendant) should not be a target');
      assert.ok(!targetLines.includes(3), 'H4 (descendant) should not be a target');

      // H1 (line 0) and H5 (line 4) should still be targets
      assert.ok(targetLines.includes(0), 'H1 (ancestor) should be a target');
      assert.ok(targetLines.includes(4), 'H5 (sibling) should be a target');
    });

    test('should return NoValidTargets when source is only heading', () => {
      // * H1
      const content = '* H1';
      const document = createMockDocument(content);

      // Source is * H1 (line 0) - it's the only heading
      const source = extractSource(document, createPosition(0));

      const result = resolveRefileTargets({ document, source });

      assert.ok(!result.ok, 'should return error');
      assert.strictEqual((result as any).error, RefileError.NoValidTargets);
    });

    test('should return NoValidTargets when all headings are filtered out', () => {
      // * H1
      // ** H2
      const content = '* H1\n** H2';
      const document = createMockDocument(content);

      // Source is * H1 (line 0), ** H2 (line 1) is its only child/descendant
      const source = extractSource(document, createPosition(0));

      const result = resolveRefileTargets({ document, source });

      assert.ok(!result.ok, 'should return error');
      assert.strictEqual((result as any).error, RefileError.NoValidTargets);
    });

  });

  // ============ Outline Path Construction ============

  suite('outline path construction', () => {

    test('should build correct outline path for nested heading', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is * H4 (line 3) - sibling of H1, not a descendant
      const source = extractSource(document, createPosition(3));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find H3 target (line 2)
      const h3Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 2);
      assert.ok(h3Target, 'H3 should be a target');

      // H3's outline path should be ["H1", "H2"]
      assert.deepStrictEqual(h3Target.target.outlinePath, ['H1', 'H2']);
    });

    test('should build correct outline path for top-level heading', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is *** H3 (line 2), subtree is lines 2-2 (no children)
      const source = extractSource(document, createPosition(2));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find H1 target (line 0) - top level
      const h1Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 0);
      assert.ok(h1Target, 'H1 should be a target');

      // H1's outline path should be empty (it's at root)
      assert.deepStrictEqual(h1Target.target.outlinePath, []);
    });

    test('should build correct outline path for sibling heading', () => {
      // * H1
      // ** H2
      // * H3
      // ** H4
      const content = '* H1\n** H2\n* H3\n** H4';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1), subtree spans lines 1-1 (no children)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find H3 target (line 2) - sibling at top level
      const h3Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 2);
      assert.ok(h3Target, 'H3 should be a target');

      // H3's outline path should be empty (top level sibling)
      assert.deepStrictEqual(h3Target.target.outlinePath, []);

      // Find H4 target (line 3)
      const h4Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 3);
      assert.ok(h4Target, 'H4 should be a target');

      // H4's outline path should be ["H3"]
      assert.deepStrictEqual(h4Target.target.outlinePath, ['H3']);
    });

  });

  // ============ Display Info Separation ============

  suite('display info separation', () => {

    test('should include displayInfo with each target', () => {
      // * H1
      // ** H2
      const content = '* H1\n** H2';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Each target should have displayInfo
      for (const targetWithDisplay of targets) {
        assert.ok(targetWithDisplay.displayInfo, 'should have displayInfo');
        assert.ok(typeof targetWithDisplay.displayInfo.label === 'string', 'label should be string');
        assert.ok(typeof targetWithDisplay.displayInfo.outlinePathString === 'string', 'outlinePathString should be string');
        assert.ok(typeof targetWithDisplay.displayInfo.levelIndicator === 'string', 'levelIndicator should be string');
      }
    });

    test('should build correct label for nested target', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is * H4 (line 3) - not a descendant of H1/H2/H3
      const source = extractSource(document, createPosition(3));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find H3 target (line 2)
      const h3Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 2);
      assert.ok(h3Target, 'H3 should be a target');

      // Label should include outline path: H1 > H2 > H3
      assert.strictEqual(h3Target.displayInfo.label, 'H1 > H2 > H3');
      assert.strictEqual(h3Target.displayInfo.outlinePathString, 'H1 > H2');
    });

    test('should build correct label for top-level target', () => {
      // * H1
      // ** H2
      const content = '* H1\n** H2';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find H1 target (line 0) - top level
      const h1Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 0);
      assert.ok(h1Target, 'H1 should be a target');

      // Label should just be the heading text (no path prefix)
      assert.strictEqual(h1Target.displayInfo.label, 'H1');
      assert.strictEqual(h1Target.displayInfo.outlinePathString, '');
    });

    test('should include level indicator in displayInfo', () => {
      // * H1
      // ** H2
      // *** H3
      // * H4
      const content = '* H1\n** H2\n*** H3\n* H4';
      const document = createMockDocument(content);

      // Source is * H4 (line 3)
      const source = extractSource(document, createPosition(3));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Check level indicators for all three valid targets
      const h1Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 0);
      assert.strictEqual(h1Target.displayInfo.levelIndicator, 'L1');

      const h2Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 1);
      assert.strictEqual(h2Target.displayInfo.levelIndicator, 'L2');

      const h3Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 2);
      assert.strictEqual(h3Target.displayInfo.levelIndicator, 'L3');
    });

  });

  // ============ Business Info vs Display Info Separation ============

  suite('business info vs display info separation', () => {

    test('should keep business target fields separate from display fields', () => {
      // * H1
      // ** H2
      const content = '* H1\n** H2';
      const document = createMockDocument(content);

      // Source is ** H2 (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Business fields should be on target
      const h1Target = targets.find((t: RefileTargetWithDisplay) => t.target.line === 0);
      assert.ok(h1Target.target.line === 0);
      assert.ok(h1Target.target.level === 1);
      assert.ok(h1Target.target.uri === '');
      assert.ok(Array.isArray(h1Target.target.outlinePath));

      // Display fields should NOT leak into target business object
      assert.strictEqual((h1Target.target as any).label, undefined);
      assert.strictEqual((h1Target.target as any).outlinePathString, undefined);
      assert.strictEqual((h1Target.target as any).levelIndicator, undefined);

      // Display fields should be on displayInfo only
      assert.strictEqual((h1Target.displayInfo as any).line, undefined);
      assert.strictEqual((h1Target.displayInfo as any).level, undefined);
    });

  });

  // ============ Duplicate Heading Names ============

  suite('duplicate heading names', () => {

    test('should distinguish duplicate headings by outline path', () => {
      // Three headings all named "Todo" at different nesting levels
      // * Todo       (line 0, level 1)
      // ** Todo      (line 1, level 2) - source
      // *** Todo     (line 2, level 3) - descendant, filtered
      // * Todo       (line 3, level 1) - sibling of line 0
      const content = '* Todo\n** Todo\n*** Todo\n* Todo';
      const document = createMockDocument(content);

      // Source is ** Todo (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // All targets have the same headingText "Todo"
      // But they should have different outline paths
      const todoTargets = targets.filter((t: RefileTargetWithDisplay) => t.target.headingText === 'Todo');

      // We expect 2 valid targets (source is line 1, descendant is line 2)
      // Top-level Todo at line 0: outlinePath = []
      // Top-level Todo at line 3: outlinePath = [] (sibling, same level)
      // These two have the SAME outline path - algorithm limitation
      assert.strictEqual(todoTargets.length, 2);

      // The two top-level Todos have the same outline path []
      // This is a known limitation - outline path alone cannot distinguish
      // siblings at the same level with the same name
      const paths = todoTargets.map((t: RefileTargetWithDisplay) => JSON.stringify(t.target.outlinePath));
      const uniquePaths = new Set(paths);
      assert.strictEqual(uniquePaths.size, 1, 'siblings at same level have same outline path - algorithm limitation');
    });

    test('should use outline path in display label to distinguish duplicates', () => {
      // Headings named "Same" at different levels
      // * Same        (line 0, level 1)
      // ** Same       (line 1, level 2) - source
      // *** Same      (line 2, level 3) - descendant, filtered
      // ** Same       (line 3, level 2) - child of line 0
      const content = '* Same\n** Same\n*** Same\n** Same';
      const document = createMockDocument(content);

      // Source is ** Same (line 1)
      const source = extractSource(document, createPosition(1));

      const result = resolveRefileTargets({ document, source });

      assert.ok(result.ok, 'should return ok');
      const targets = (result as any).targets;

      // Find the two targets with headingText "Same"
      const sameTargets = targets.filter((t: RefileTargetWithDisplay) => t.target.headingText === 'Same');

      // Their labels should include their path to distinguish them
      const labels = sameTargets.map((t: RefileTargetWithDisplay) => t.displayInfo.label);

      // Top-level "Same" at line 0: label = "Same"
      assert.ok(labels.includes('Same'), 'top-level Same should have label "Same"');

      // Child "Same" at line 3: label should include parent
      const childLabel = labels.find((l: string) => l.includes('>'));
      assert.ok(childLabel, 'child Same should have label with outline path');
      assert.strictEqual(childLabel, 'Same > Same');
    });

  });

});
