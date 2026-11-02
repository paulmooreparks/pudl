# PUDL 0.96.10

This point release extends the stack row detail rule of 0.96.9. A stack's button already shows the stack's label, so in a stack of windows that share a place, such as one workspace, every row whose detail is that place repeats the button. This release leaves such a detail undrawn and keeps the title rule.

A stack row whose `data-win-detail` equals the stack's label, the leader's `data-win-group-label` or else the group key, leaves the detail undrawn. The row's accessible name and tooltip still carry it. A taskbar button outside a stack is unchanged, and the 0.96.9 rule for a detail equal to the title stays.

## Validation

tests/contract-hooks.test.js gains a stacked window whose detail is the stack's label and checks that its row draws no detail while its name still says it, alongside the existing title and differing-detail cases. It passed with the taskbar-stacks and taskbar-stacks-full suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.10. Its immutable commit is 22f5aa264259790b53a76f3eaf8b185e787a99e0 and its annotated tag object is b0051c0b5f6d6a59a51f93f1427420b6218d73e7. The reproducible archive contains 411 files including all 180 dist files, occupies 6207031 bytes, and has SHA-256 d3c250cbc9ba79373b1e6da8bfbf9e7aca0126b8aaeb90fb07caa797ea1f8622. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
