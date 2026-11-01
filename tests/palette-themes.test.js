/* Include companion palette freshness and browser contracts in CI. */
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
execFileSync(process.execPath, [path.join(__dirname, '../build/palette-themes.js'), '--check'], { stdio: 'inherit' });
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', path.join(__dirname, '../build/palette-themes.test.js'), path.join(__dirname, '../build/palette-themes.browser.test.js')], { env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
