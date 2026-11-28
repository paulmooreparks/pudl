/* The release command. RELEASING.md says when to run each part.

     node build/release.js prepare 0.113.0
       Run on the release branch after the version edits. Rebuilds the
       minified copies and writes the version and SHA384 integrity values
       into the README's CDN examples.

     node build/release.js publish 0.113.0
       Run on main after the release pull request is merged. Checks the
       commit, tags it, pushes the tag, builds the archive, checksum and
       manifest from the tag, publishes the GitHub release, compares the
       published archive and every jsDelivr file with the tagged bytes,
       and writes one result file.

     node build/release.js publish 0.113.0 --dry-run
       Runs every check and builds the archive from HEAD. It creates no
       tag and no release and reads nothing from the CDN.

   Output goes to tests/output/release-<version>/, which git ignores. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = 'paulmooreparks/pudl';
const ROOT = path.resolve(__dirname, '..');
const [command, version] = process.argv.slice(2);
const dryRun = process.argv.includes('--dry-run');
if (!['prepare', 'publish'].includes(command) || !/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Usage: node build/release.js prepare|publish <version> [--dry-run]');
  process.exit(2);
}
const tag = 'v' + version;

function run(file, args, options) {
  return execFileSync(file, args, Object.assign({ cwd: ROOT, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, options));
}
const git = (...args) => run('git', args).toString('utf8').trim();
const gh = (...args) => run('gh', args).toString('utf8').trim();
const sha384 = bytes => 'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/* The README's CDN examples: an address at a tag, then its integrity value. */
const EXAMPLE = /(paulmooreparks\/pudl@v)(\d+\.\d+\.\d+)(\/(dist\/[\w./-]+)"[^<>]*?integrity=")(sha384-[A-Za-z0-9+/=]+)/g;

/* Returns the README text with every example at this version and at the
   hash of the bytes that read(path) gives. */
function withExamples(readme, read) {
  let count = 0;
  const text = readme.replace(EXAMPLE, (all, start, old, middle, file) => {
    count += 1;
    return start + version + middle + sha384(read(file));
  });
  if (!count) throw new Error('README.md has no CDN examples to check');
  return text;
}

function prepare() {
  run(process.execPath, ['build/minify.js'], { stdio: 'inherit' });
  const file = path.join(ROOT, 'README.md');
  const before = fs.readFileSync(file, 'utf8');
  const after = withExamples(before, f => fs.readFileSync(path.join(ROOT, f)));
  if (after !== before) fs.writeFileSync(file, after, 'utf8');
  console.log(after === before ? 'README examples already match ' + version + '.' : 'README examples now give ' + version + ' and its hashes.');
  const missing = versionMarks('HEAD', f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  missing.forEach(m => console.log('Still to do: ' + m));
}

/* Step 2 and step 5 of RELEASING.md, as checks. */
function versionMarks(label, readText) {
  const missing = [];
  if (!readText('dist/pudl.css').slice(0, 400).includes('Version ' + version + '.')) missing.push('dist/pudl.css header does not say Version ' + version);
  if (!readText('reference.html').includes('>v' + version + '<')) missing.push('reference.html topbar does not show v' + version);
  if (!new RegExp('^## ' + version.replace(/\./g, '\\.') + '\\b', 'm').test(readText('CHANGELOG.md'))) missing.push('CHANGELOG.md has no section for ' + version);
  return missing;
}

function changelogNotes(changelog) {
  const start = changelog.search(new RegExp('^## ' + version.replace(/\./g, '\\.') + '\\b', 'm'));
  const body = changelog.slice(start).split('\n').slice(1).join('\n');
  const end = body.search(/^## /m);
  return (end < 0 ? body : body.slice(0, end)).trim() + '\n';
}

async function publish() {
  const out = path.join(ROOT, 'tests', 'output', 'release-' + version);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const result = { version, tag, dryRun, checks: [], started: new Date().toISOString() };
  const resultFile = path.join(out, 'result.json');
  const failures = [];
  function finish(code) {
    result.ok = code === 0;
    result.failures = failures;
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log('\n' + (code === 0 ? (dryRun ? 'Dry run passed.' : 'Released ' + tag + '.') : 'Stopped: ' + failures.join('; ')) + '\nResult: ' + resultFile);
    process.exit(code);
  }
  /* A failed check stops a real release at once. A dry run lists them all. */
  function check(name, ok, detail) {
    result.checks.push({ name, ok: !!ok, detail: detail || null });
    console.log((ok ? 'ok    ' : 'FAIL  ') + name + (detail ? ' (' + detail + ')' : ''));
    if (ok) return;
    failures.push(name);
    if (!dryRun) finish(1);
  }

  git('fetch', '--quiet', '--tags', 'origin', 'main');
  const commit = git('rev-parse', 'HEAD');
  const show = file => run('git', ['show', commit + ':' + file]);
  result.commit = commit;
  result.tree = git('rev-parse', 'HEAD^{tree}');
  check('working tree is clean', git('status', '--porcelain') === '');
  check('HEAD is origin/main', commit === git('rev-parse', 'origin/main'), commit);
  check('tag ' + tag + ' does not exist yet', git('tag', '--list', tag) === '' && git('ls-remote', '--tags', 'origin', tag) === '');
  const missing = versionMarks(commit, f => show(f).toString('utf8'));
  check('version ' + version + ' is in pudl.css, reference.html and CHANGELOG.md', !missing.length, missing.join('; '));
  let minified = true;
  try { run(process.execPath, ['build/minify.js', '--check'], { stdio: 'pipe' }); } catch (e) { minified = false; }
  check('minified copies match their sources', minified);
  const readme = show('README.md').toString('utf8');
  let examples = false;
  try { examples = withExamples(readme, show) === readme; } catch (e) { /* reported below */ }
  check('README examples give ' + version + ' and the committed hashes', examples);
  const runs = JSON.parse(gh('run', 'list', '-R', REPO, '--workflow', 'test.yml', '--commit', commit, '--status', 'success', '--json', 'url,event', '--limit', '5'));
  check('the hosted Tests gate passed for this commit', runs.length > 0, runs.length ? runs[0].url : 'no successful run for ' + commit);
  result.gate = runs.length ? runs[0].url : null;

  if (!dryRun) {
    git('tag', '-a', tag, '-m', 'PUDL ' + version, commit);
    git('push', 'origin', tag);
    const peeled = git('ls-remote', '--tags', 'origin', tag, tag + '^{}').split('\n').find(line => line.endsWith('refs/tags/' + tag + '^{}')) || '';
    check('pushed tag points at the checked commit', peeled.split(/\s/)[0] === commit);
  }

  /* git archive gives the same bytes for the same commit and paths, and
     the archive holds exactly the tagged files. */
  const source = dryRun ? commit : tag;
  const zipName = 'pudl-' + version + '.zip';
  const zip = path.join(out, zipName);
  /* The archive holds the guides in docs/ and any deeper document the
     README links to. */
  const tracked = new Set(git('ls-tree', '-r', '--name-only', commit, 'docs').split('\n'));
  const linked = [...new Set([...readme.matchAll(/\]\((docs\/[^)#\s]+\/[^)#\s]+)/g)].map(m => m[1]))].filter(f => tracked.has(f)).sort();
  git('archive', '--format=zip', '--prefix=pudl-' + version + '/', '-o', zip, source, 'CHANGELOG.md', 'LICENSE', 'README.md', 'dist', ':(glob)docs/*.md', ...linked);
  const zipHash = sha256(fs.readFileSync(zip));
  const sumName = zipName + '.sha256';
  fs.writeFileSync(path.join(out, sumName), zipHash + '  ' + zipName + '\n', 'utf8');
  result.archive = { name: zipName, sha256: zipHash };
  const assets = [zip, path.join(out, sumName)];
  if (!dryRun) {
    const manifest = path.join(out, 'pudl-' + version + '-dist-manifest.json');
    run(process.execPath, ['build/release-manifest.js', tag, manifest]);
    assets.push(manifest);
  }
  const notes = path.join(out, 'notes.md');
  fs.writeFileSync(notes, changelogNotes(show('CHANGELOG.md').toString('utf8')), 'utf8');
  check('release notes come from the changelog section', fs.statSync(notes).size > 1);
  if (dryRun) finish(failures.length ? 1 : 0);

  /* The release stays a draft until its uploaded archive is shown to be
     the local one. */
  gh('release', 'create', tag, '-R', REPO, '--draft', '--verify-tag', '--title', 'PUDL ' + version, '--notes-file', notes, ...assets);
  const fetched = path.join(out, 'downloaded');
  fs.mkdirSync(fetched);
  gh('release', 'download', tag, '-R', REPO, '--dir', fetched);
  check('uploaded archive is byte-identical to the tagged archive', sha256(fs.readFileSync(path.join(fetched, zipName))) === zipHash, zipHash);
  check('uploaded checksum names that archive', fs.readFileSync(path.join(fetched, sumName), 'utf8') === zipHash + '  ' + zipName + '\n');
  gh('release', 'edit', tag, '-R', REPO, '--draft=false');
  result.release = 'https://github.com/' + REPO + '/releases/tag/' + tag;

  /* jsDelivr can take a short while to see a new tag, so a file that is
     not there yet is asked for again for up to five minutes. A file that
     arrives with the wrong bytes fails at once. */
  const files = git('ls-tree', '-r', '--name-only', tag, 'dist').split('\n').filter(f => /\.(css|js)$/.test(f));
  result.cdn = [];
  for (const file of files) {
    const expected = sha384(show(file));
    const url = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + tag + '/' + file;
    let got = null;
    for (const deadline = Date.now() + 300000; ;) {
      const response = await fetch(url);
      if (response.ok) { got = sha384(Buffer.from(await response.arrayBuffer())); break; }
      if (response.status !== 404 || Date.now() > deadline) { got = 'HTTP ' + response.status; break; }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    result.cdn.push({ file, integrity: expected, match: got === expected });
    check('jsDelivr serves the tagged ' + file, got === expected, got === expected ? null : 'got ' + got);
  }
  finish(0);
}

if (command === 'prepare') prepare();
else publish().catch(error => { console.error(error); process.exit(1); });
