/* Comparisons never rewrite expected captures. Raster equality is exact
   unless the caller explicitly enables the documented live-page allowance. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const cp = require('child_process');
const [expected, actual] = process.argv.slice(2);
assert.ok(expected && actual, 'Usage: node tests/skins/compare.js <expected> <actual>');
const files = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(root, entry.name)) : [path.join(root, entry.name)]);
const normalized = file => {
  const data = JSON.parse(fs.readFileSync(file));
  if (data.settings) delete data.settings.standard;
  return JSON.stringify(data);
};
let failures = 0, checked = 0;
for (const file of files(actual)) {
  const relative = path.relative(actual, file);
  if (relative !== 'manifest.json' && !fs.existsSync(path.join(expected, relative))) { failures++; console.error('EXTRA ' + relative); }
}
for (const file of files(expected)) {
  const relative = path.relative(expected, file);
  if (relative === 'manifest.json') continue;
  if (relative.endsWith('.png')) continue;
  const other = path.join(actual, relative);
  const equal = fs.existsSync(other) && (file.endsWith('.json') ? normalized(file) === normalized(other) : fs.readFileSync(file).equals(fs.readFileSync(other)));
  if (!equal) { failures++; console.error('DIFF ' + relative); }
  checked++;
}
console.log(checked + ' artifacts compared; ' + failures + ' differ');
const args = [path.join(__dirname, 'compare-images.py'), expected, actual];
if (process.argv.includes('--live-noise')) args.push('--live-noise');
const raster = cp.spawnSync('python', args, { encoding: 'utf8' });
process.stdout.write(raster.stdout || '');
process.stderr.write(raster.stderr || '');
process.exitCode = failures || raster.status !== 0 ? 1 : 0;
