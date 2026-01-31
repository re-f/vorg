"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Quick test to inspect uniorg AST structure
const unified_1 = require("unified");
const uniorg_parse_1 = require("uniorg-parse");
const content = `* TODO [#A] Test Heading :work:urgent:
:PROPERTIES:
:ID: abc-123-def
:SCHEDULED: <2024-01-28 Sun>
:END:

Some content with [[file:other.org][a link]].`;
const parser = (0, unified_1.unified)().use(uniorg_parse_1.default);
const ast = parser.parse(content);
console.log('=== FULL AST ===');
console.log(JSON.stringify(ast, null, 2));
//# sourceMappingURL=debug-ast.js.map