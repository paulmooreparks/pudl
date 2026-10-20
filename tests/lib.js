/* Shared by every suite. The engine comes from PUDL_BROWSER (chromium,
   firefox or webkit) and the address of the running test server from
   PUDL_ROOT; tests/run.js sets both. */
const fs = require('fs');
const path = require('path');
const pw = require('playwright');

const engine = process.env.PUDL_BROWSER || 'chromium';
const ROOT = process.env.PUDL_ROOT || 'http://127.0.0.1:8765';
const OUT = path.join(__dirname, 'output');

/* Firefox does not emulate mobile devices, so phone-sized pages there are
   just narrow pages, which is what the phone checks measure anyway. */
function adapt(opts) {
  if (!opts || engine !== 'firefox') return opts;
  const o = Object.assign({}, opts);
  delete o.isMobile;
  delete o.hasTouch;
  return o;
}

/* With PUDL_MIN=1 every request for a script or stylesheet in dist/ is
   served from its minified copy (build/minify.js), so the whole suite runs
   against what a project loading the .min files gets. The page still sees
   the readable file's address. */
const MIN = process.env.PUDL_MIN === '1';
const SOURCE = /\/dist\/([\w-]+)\.(js|css)(\?[^#]*)?$/;
async function minified(target) {
  if (!MIN) return target;
  await target.route(SOURCE, route => {
    const url = route.request().url().replace(SOURCE, (all, name, ext, query) => `/dist/${name}.min.${ext}${query || ''}`);
    return route.continue({ url });
  });
  return target;
}

async function launch() {
  /* PUDL_EXECUTABLE points at a browser already installed, for machines
     whose browsers do not match Playwright's pinned builds. */
  const b = await pw[engine].launch(process.env.PUDL_EXECUTABLE ? { executablePath: process.env.PUDL_EXECUTABLE } : {});
  const newPage = b.newPage.bind(b);
  const newContext = b.newContext.bind(b);
  b.newPage = async opts => minified(await newPage(adapt(opts)));
  b.newContext = async opts => minified(await newContext(adapt(opts)));
  return b;
}

/* Where a suite saves a screenshot or a PDF, named for the engine. */
function out(name) {
  fs.mkdirSync(OUT, { recursive: true });
  return path.join(OUT, engine + '-' + name);
}

module.exports = { engine, ROOT, launch, out };
