/* Verify both Standard selection forms against each other without
   changing the captured expectations. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert/strict');
const root = process.argv[2];
assert.ok(root, 'Usage: node tests/skins/check-standard.js <capture-directory>');
const pairs = fs.readdirSync(root).filter(name => name.includes('-absent') && fs.statSync(path.join(root, name)).isDirectory());
assert.ok(pairs.length, 'capture contains no absent/Standard pairs');
let failures = 0;
for (const absent of pairs) {
  const standard = absent.replace('-absent', '-standard');
  const result = cp.spawnSync(process.execPath, [path.join(__dirname, 'compare.js'), path.join(root, absent), path.join(root, standard), '--live-noise'], { encoding: 'utf8' });
  if (result.status !== 0) { failures++; console.error('FAIL ' + absent + '\n' + result.stdout + result.stderr); }
  else console.log('PASS ' + absent);
}
console.log(pairs.length + ' absent/Standard pairs checked; ' + failures + ' failed');
process.exitCode = failures ? 1 : 0;
