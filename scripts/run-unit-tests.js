/**
 * 以编程方式运行 Mocha 单元测试，避免 Node 26 下 yargs CLI 兼容性问题。
 */
const Mocha = require('mocha');
const glob = require('glob');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patterns = [
  'out/test/unit/*.test.js',
  'out/test/unit/database/*.test.js',
];
const excludes = [
  'out/test/unit/orgCompletionProviderContent.test.js',
  'out/test/unit/orgTagCompletion.test.js',
];

const files = patterns
  .flatMap(pattern => glob.sync(pattern, { cwd: root, absolute: true }))
  .filter(file => !excludes.includes(path.relative(root, file)));

if (files.length === 0) {
  console.error('No unit test files found. Run: pnpm run compile-tests');
  process.exit(1);
}

const mocha = new Mocha({ ui: 'tdd', timeout: 10000 });
files.forEach(file => mocha.addFile(file));

mocha.run(failures => {
  process.exit(failures ? 1 : 0);
});
