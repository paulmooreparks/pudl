# PUDL 0.97.1

This point release refines the folding status area of 0.97.0 and takes provenance out of older release records and proposals.

The Status item's total now shows only when it is known. A badge whose count has not arrived yet carries `data-status-pending`; while any folded badge does, the total is blank. A total of 0 that every counting badge reads is shown as 0, plainly, so a tray that knows there is nothing reads differently from one still waiting to find out. A badge that is empty or hidden without the marker keeps its existing meaning, nothing to say, and is left out of the total. The Status item's tone, total and name also follow a folded item's badge as it changes. In 0.97.0 they waited for the next time the taskbar was fitted, which a change inside a folded item does not cause, since its width is reserved.

`pudlListbox.activate(list, rowOrValue)` puts the keyboard on a row of either kind of list box, given the row or its value. It is for a row the page has just added: the choice is left alone, the row is shown within the list only, and the list keeps it as the active row when it next takes focus, where before the list always started on its first chosen row.

Release records from 0.95.2 to 0.96.2 and a number of proposals and skin admission notes recorded the coordination behind each change as well as the change. They now describe only what changed, why, how it was verified and its limits. The technical content, results, hashes and limits are unchanged.

## Validation

tests/status-fold.test.js gains checks that the total follows a folded badge's count at once, reads 0 when every counting badge reads 0, is blank while a badge is pending, and counts that badge once its number arrives. tests/listbox-rich.test.js gains checks that activate puts the keyboard on a newly added row without changing the choice and that the list keeps it on focus, and that a value no row has is reported. Both suites passed with tests/listbox.test.js in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check. The documentation changes were checked for names of people, applications and agents and for request and approval lines.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.1 CDN examples after publication.
