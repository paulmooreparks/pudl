'use strict';

function suiteResult(exitCode, output, timedOut) {
  const printedFailure = /^\s*FAIL(?:\s|$)/m.test(output) || /^\s*[1-9]\d* FAILED\s*$/m.test(output);
  return { code: timedOut || printedFailure ? 1 : exitCode, printedFailure };
}

module.exports = { suiteResult };
