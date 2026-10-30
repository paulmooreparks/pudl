/* Include skin runtime and rendered smoke contracts in the normal runner. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const files = ['field-enlargement.browser.test.js', 'skin-css.browser.test.js', 'skin-runtime.browser.test.js', 'skin-host.browser.test.js', 'skin-gel.browser.test.js', 'skin-glaze.browser.test.js'];
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files.map(file => path.join(__dirname, '../build', file))], { env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
