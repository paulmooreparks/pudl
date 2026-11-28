'use strict';
/* Suites set aside from the gate. tests/set-aside.json is a list of
   { "suite": "name.test.js", "engine": "firefox", "owner": "who fixes it",
     "until": "2026-12-05", "issue": 60 }.
   A full run skips each listed suite in its engine and says so. A run with
   a suite filter ignores the list, so a set-aside suite can still be run
   and stressed. An entry past its date fails the run. */
const fs = require('fs');
const path = require('path');

const ENGINES = ['chromium', 'firefox', 'webkit'];

function check(entries, suites, today) {
  if (!Array.isArray(entries)) throw new Error('set-aside.json must be a list');
  for (const entry of entries) {
    const label = 'set-aside entry ' + JSON.stringify(entry);
    if (!suites.includes(entry.suite)) throw new Error(label + ' names no suite');
    if (!ENGINES.includes(entry.engine)) throw new Error(label + ' needs an engine');
    if (typeof entry.owner !== 'string' || !entry.owner.trim()) throw new Error(label + ' needs an owner');
    if (!Number.isInteger(entry.issue)) throw new Error(label + ' needs an issue number');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.until || '')) throw new Error(label + ' needs an until date, YYYY-MM-DD');
    if (entry.until < today) throw new Error(label + ' passed its date. Fix the suite or agree a new date.');
  }
  return entries;
}

function load(suites) {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, 'set-aside.json'), 'utf8'));
  return check(entries, suites, new Date().toISOString().slice(0, 10));
}

const isSetAside = (entries, suite, engine) => entries.some(entry => entry.suite === suite && entry.engine === engine);

module.exports = { check, load, isSetAside };
