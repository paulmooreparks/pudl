# PUDL 0.96.10

This point release corrects the stack row detail rule of 0.96.9. The adopter's request had been described as a detail repeating the row's title; its code in fact hides a detail that repeats the stack's label, since a stack's button already shows that label and every row of a stack of one workspace's windows would repeat it. Paul approved the item as a redundant detail in a stack row; this release applies the rule the adopter needs, keeps the title rule, and the lead implemented and published it from the primary checkout.

A stack row whose `data-win-detail` equals the stack's label, the leader's `data-win-group-label` or else the group key, leaves the detail undrawn. The row's accessible name and tooltip still carry it. A taskbar button outside a stack is unchanged, and the 0.96.9 rule for a detail equal to the title stays.

## Validation

tests/contract-hooks.test.js gains a stacked window whose detail is the stack's label and checks that its row draws no detail while its name still says it, alongside the existing title and differing-detail cases. It passed with the taskbar-stacks and taskbar-stacks-full suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction no whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.10. Its immutable commit is 22f5aa264259790b53a76f3eaf8b185e787a99e0 and its annotated tag object is b0051c0b5f6d6a59a51f93f1427420b6218d73e7. The reproducible archive contains 411 files including all 180 dist files, occupies 6207031 bytes, and has SHA-256 d3c250cbc9ba79373b1e6da8bfbf9e7aca0126b8aaeb90fb07caa797ea1f8622. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
