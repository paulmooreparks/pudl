/* The token block of dist/pudl.css is what the vendored specification's
   tokens produce. It needs no browser, so it runs the same in every
   engine. */
const { execFileSync } = require('child_process');
const path = require('path');
try {
  process.stdout.write(execFileSync('node', [path.join(__dirname, '..', 'build', 'tokens.js'), '--check'], { encoding: 'utf8' }));
  console.log('ALL PASSED');
} catch (e) {
  process.stdout.write((e.stdout || '') + (e.stderr || ''));
  console.log('1 FAILED');
  process.exit(1);
}
