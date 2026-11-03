# PUDL 0.97.6

This point release lets a toast's text break a long word inside the toast. The rule that lets a notice's and a toast's words break anywhere, so that a word with no spaces cannot run past the card, covered a toast's title and body but not `.toast-text`, the element `pudl-toast.js` draws a toast's message into. A toast holding a long file path therefore ran past its right edge. The rule now covers `.toast-text` too. Ordinary prose still breaks at its spaces.

The shortcuts proposal is also updated to say it shipped in 0.96.7.

## Validation

tests/toast-action.test.js gains a check that a toast holding a long path with no spaces keeps every word inside its box and wraps onto more lines. The check failed against 0.97.5 and passes with the change. It passed with the tables-notices-keys, hardening and grammar suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.6 CDN examples after publication.
