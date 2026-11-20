/* Rendered companion palette contracts run in every engine/form. Pure
   calculations and generator freshness run once with npm run test:static. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', path.join(__dirname, '../build/palette-themes.browser.test.js')], { env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
