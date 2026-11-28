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
const SETTLE = path.join(__dirname, '..', 'dist', process.env.PUDL_MIN === '1' ? 'min' : '', 'pudl-settle.js');

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
  /* Every page loads pudl-settle.js before anything else, as a host that
     wants the settled signal does, so a suite can wait on settled(page). */
  const first = async target => { await target.addInitScript({ path: SETTLE }); return target; };
  b.newPage = async opts => first(await newPage(adapt(opts)));
  b.newContext = async opts => first(await newContext(adapt(opts)));
  return b;
}

/* Resolves when the page has loaded, its fonts have loaded and PUDL has
   finished the work it queued (docs/SETTLED.md). Use it where a suite
   would otherwise wait for a time or count frames. */
const settled = page => page.evaluate(() => window.pudlSettled());

/* Changes the viewport, waits until the page reports the new size, then
   waits for PUDL to settle at it. */
async function resize(page, size) {
  await page.setViewportSize(size);
  await page.waitForFunction(s => window.innerWidth === s.width && window.innerHeight === s.height, size);
  await settled(page);
}

/* Where a suite saves a screenshot or a PDF, named for the engine. */
function out(name) {
  fs.mkdirSync(OUT, { recursive: true });
  return path.join(OUT, engine + '-' + name);
}

module.exports = { engine, ROOT, launch, out, settled, resize };
