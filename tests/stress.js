/* Reruns chosen suites until a time limit, to reproduce a failure nobody
   can explain or to show that it does not recur:

     node tests/stress.js <minutes> <engine> <suite filter>...

   Each round is one ordinary `node tests/run.js <engine> <filters>` with
   its own output folder under tests/output/stress/. A passing round's
   folder is deleted; a failing round's folder is kept as the reproducer.
   The script exits 1 when any round failed. The Stress workflow runs it on
   the hosted runner. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [minutesText, ...runArgs] = process.argv.slice(2);
const minutes = Number(minutesText);
if (!(minutes > 0 && minutes <= 60) || runArgs.length < 2) {
  console.error('Usage: node tests/stress.js <minutes, at most 60> <engine> <suite filter>...');
  process.exit(2);
}
if (runArgs.some(a => !/^[\w.-]+$/.test(a))) {
  console.error('An engine or filter may hold only letters, digits, dot, dash and underscore.');
  process.exit(2);
}

const base = path.join(__dirname, 'output', 'stress');
const deadline = Date.now() + minutes * 60000;
const failed = [];
let rounds = 0;
while (Date.now() < deadline) {
  rounds += 1;
  const output = path.join(base, 'round-' + rounds);
  fs.rmSync(output, { recursive: true, force: true });
  const run = spawnSync(process.execPath, [path.join(__dirname, 'run.js'), ...runArgs], {
    env: Object.assign({}, process.env, { PUDL_RUN_OUTPUT: output }),
    encoding: 'utf8'
  });
  /* A round that ran no suite is a setup error and proves nothing. */
  if (!fs.existsSync(path.join(output, 'results.json'))) {
    console.error((run.stdout || '') + (run.stderr || '') + '\nThe round ran no suite. Check the engine and the filters.');
    process.exit(2);
  }
  const tail = (run.stdout || '').trim().split('\n').slice(-1)[0] || '';
  if (run.status === 0) {
    fs.rmSync(output, { recursive: true, force: true });
    console.log('round ' + rounds + ' ok    ' + tail);
  } else {
    failed.push(rounds);
    console.log('round ' + rounds + ' FAIL  ' + tail);
    console.log((run.stdout || '') + (run.stderr || ''));
  }
}

const summary = failed.length
  ? failed.length + ' of ' + rounds + ' rounds failed (rounds ' + failed.join(', ') + '); their output is kept.'
  : 'All ' + rounds + ' rounds passed in ' + minutes + ' minutes.';
const line = '`' + runArgs.join(' ') + (process.env.PUDL_MIN === '1' ? '` minified, ' : '`, ') +
  (process.env.PUDL_JOBS || 'default') + ' at a time: ' + summary;
console.log('\n' + line);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n\n');
fs.mkdirSync(base, { recursive: true });
fs.writeFileSync(path.join(base, 'summary.json'), JSON.stringify({ args: runArgs, minutes, rounds, failed }, null, 2) + '\n');
process.exit(failed.length ? 1 : 0);
