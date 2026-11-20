'use strict';

/* Partition sorted suites without changing a suite's own execution. Each
   shard runs on its own CI runner, with one browser suite at a time. */
function selectSuites(suites, filters, shard) {
  const matched = suites.filter(name => !filters.length || filters.some(filter => name.includes(filter)));
  if (!matched.length) throw new Error('No suites match the requested filters');
  if (!shard) return { suites: matched, shard: null, totalSuites: matched.length };
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(shard);
  if (!match) throw new Error('PUDL_SHARD must be INDEX/TOTAL, starting at 1');
  const index = Number(match[1]), total = Number(match[2]);
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total) || index > total || total > matched.length) {
    throw new Error('PUDL_SHARD must identify a nonempty shard within the selected suites');
  }
  return {
    suites: matched.filter((name, ordinal) => ordinal % total === index - 1),
    shard: { index, total },
    totalSuites: matched.length
  };
}

module.exports = { selectSuites };
