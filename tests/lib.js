/* Shared by every suite. The engine comes from PUDL_BROWSER (chromium,
   firefox or webkit) and the address of the running test server from
   PUDL_ROOT; tests/run.js sets both, and its server serves the minified
   copies when PUDL_MIN=1. */
const fs = require('fs');
const path = require('path');
const pw = require('playwright');

const engine = process.env.PUDL_BROWSER || 'chromium';
const ROOT = process.env.PUDL_ROOT;
if (!ROOT) throw new Error('Run a suite through tests/run.js, which starts the test server and sets PUDL_ROOT.');
const OUT = process.env.PUDL_OUTPUT_DIR || path.join(__dirname, 'output');

/* Firefox does not emulate mobile devices, so phone-sized pages there are
   just narrow pages, which is what the phone checks measure anyway. */
function adapt(opts) {
  if (!opts || engine !== 'firefox') return opts;
  const o = Object.assign({}, opts);
  delete o.isMobile;
  delete o.hasTouch;
  return o;
}

async function launch() {
  /* PUDL_EXECUTABLE points at a browser already installed, for machines
     whose browsers do not match Playwright's pinned builds. */
  const b = await pw[engine].launch(process.env.PUDL_EXECUTABLE ? { executablePath: process.env.PUDL_EXECUTABLE } : {});
  const newPage = b.newPage.bind(b);
  const newContext = b.newContext.bind(b);
  b.newPage = opts => newPage(adapt(opts));
  b.newContext = opts => newContext(adapt(opts));
  return b;
}

/* Where a suite saves a screenshot or a PDF, named for the engine. */
function out(name) {
  fs.mkdirSync(OUT, { recursive: true });
  return path.join(OUT, engine + '-' + name);
}

module.exports = { engine, ROOT, launch, out };
