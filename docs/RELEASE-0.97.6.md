# PUDL 0.97.6

This point release lets a toast's text break a long word inside the toast. The rule that lets a notice's and a toast's words break anywhere, so that a word with no spaces cannot run past the card, covered a toast's title and body but not `.toast-text`, the element `pudl-toast.js` draws a toast's message into. A toast holding a long file path therefore ran past its right edge. The rule now covers `.toast-text` too. Ordinary prose still breaks at its spaces.

The shortcuts proposal is also updated to say it shipped in 0.96.7.

## Validation

tests/toast-action.test.js gains a check that a toast holding a long path with no spaces keeps every word inside its box and wraps onto more lines. The check failed against 0.97.5 and passes with the change. It passed with the tables-notices-keys, hardening and grammar suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.6. Its immutable commit is a139e8974d9eb5a28f64f3a926c4919e122d10d5 and its annotated tag object is 733750ba1824bd0a7ae00936f03f8e5e8723aecc. The reproducible archive contains 425 files including all 183 dist files, occupies 6257866 bytes, and has SHA-256 7075358fb39edc5704f2d5b12b9ae52ea7ecfeff3d38e25577709c71242e1fcc. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JS files match their tagged bytes. Main's 25 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
