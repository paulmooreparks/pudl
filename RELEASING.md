# Testing and releasing PUDL

A release is a tag. Projects copy a tagged release or load one from jsDelivr, which serves files straight from the tag and caches them for good. A tag must never move once it has been pushed, and a mistake in a release is fixed by the next release.

## Testing rules

Paul approved these rules on 28 November 2026. They replace the earlier evidence and audit process.

1. **The hosted gate is the only full run.** Push a branch and open a pull request, as a draft if the work is unfinished. The Tests workflow runs every suite in Chromium, Firefox and WebKit, and in Chromium against the minified copies. Locally, run `npm run test:static` and the suites that cover the change, for example `node tests/run.js firefox windows`. A local run of every suite in every engine is no longer part of the process, because it fails under load on a working machine and proves nothing the hosted gate does not.
2. **WebKit is tested on the hosted Linux runner.** A WebKit result from Windows does not block anything.
3. **State a cause before any rerun.** When a hosted job fails, read its log and say what failed and why before starting it again. A rerun started without a stated cause is not allowed, and a pass after one explains nothing.
4. **A failure nobody can reproduce gets one hour.** Open an issue, then start the Stress workflow from the Actions page with the suite, the engine and a duration. A failing round is the reproducer. If no round fails within about an hour, close the issue as not reproduced with a link to the run.
5. **A red `main` stops merges.** Nothing else merges until `main` is green again. The other way out is to set the failing suite aside by adding it to `tests/set-aside.json` with its engine, an owner, an issue number and a date. The gate skips a listed suite and fails once the date has passed.
6. **`main` reuses the pull request's result.** A push to `main` whose files match a tree that already passed is accepted without a second run. A branch that was behind `main` when it merged gets a full run.
7. **The record is the pull request, the hosted run and the release result file.** Do not write per-step preparation, audit or disposition documents, and do not add `docs/RELEASE-*.md` files. A change that alters how something looks gets one rendered review by one person, recorded as one comment on the pull request.

## Release steps

1. Choose the version. While PUDL is below 1.0, a change to what a project sees or must do raises the minor number, and a fix that changes nothing a project relies on raises the patch number.
2. On a branch, update the version in the header comment of `dist/pudl.css`, in the topbar link of `reference.html` and in the release section at the top of `README.md`.
3. If the release takes a new version of the specification, copy `tokens/`, `glyphs/` and `VERSION` from that tag of [pudl-spec](https://github.com/paulmooreparks/pudl-spec) into `vendor/pudl-spec/` and run `node build/tokens.js`. Never edit `vendor/pudl-spec/` or the token block of `dist/pudl.css` by hand. If the fonts or their generator changed, run `python build/fonts.py`.
4. Add the release to `CHANGELOG.md`, saying what changed and what a project must do about it. The release notes are taken from this section.
5. Run `node build/release.js prepare <version>`. It rebuilds the minified copies and writes the version and the SHA384 integrity values into the README's CDN examples.
6. Open `reference.html` in both themes and check every section.
7. Commit as `PUDL <version>: <what changed>`, push the branch and open a pull request. Merge it when the hosted gate is green.
8. On `main` at the merged commit, run `node build/release.js publish <version>`.

The publish command stops at the first check that fails. It confirms that the commit is `origin/main`, that the version, minified copies and README hashes agree, and that the hosted gate passed for the commit. It then tags the commit, pushes the tag, builds the archive, checksum and manifest from the tag, uploads them to a draft release, compares the uploaded archive with the local one, publishes the release, and compares every script and stylesheet on jsDelivr with the tagged bytes. It writes `tests/output/release-<version>/result.json`. Add `--dry-run` to run the checks and build the archive without creating a tag or a release.

Read and write release files as UTF-8, including on Windows.

Never delete or re-point a pushed tag. Anybody who already fetched the old bytes, jsDelivr included, keeps them.
