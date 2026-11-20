# Releasing PUDL

A release is a tag. Projects copy a tagged release or load one from jsDelivr, which serves files straight from the tag and caches them for good, so a tag must never move once it has been pushed. A mistake in a release is fixed by the next release.

A request to build, release, or complete a task that requires a build authorizes the necessary intermediate work through completion. The team should perform preparation, review, tests, corrections and evidence collection without asking for permission at each step. Ask Paul only when the work presents a genuine scope or product decision, or requires a capability for which no documented route is available. Keep normal review, exact publication boundaries and failure reporting; do not turn them into intermediate person-approval gates.

Run `npm run test:static` once for the candidate and use focused browser suites while developing. The complete CI gate runs every retained browser suite in readable Chromium, Firefox and WebKit and minified Chromium. Each form has two separate runner shards with one suite worker each. `Complete test gate` requires successful static/font checks and verifies the exact union of original shard results and logs. A missing or failed shard blocks completion. Keep assertions and timeouts unchanged when changing the schedule.

Reuse accepted test evidence for unchanged tested inputs when progressing through packaging and documentation. Bind its source identity, original results, classifier/policy and qualifications, and verify mutable publication state separately. A new tag name or a README integrity receipt does not by itself require another full browser matrix. If a required tested input or relevant classification rule changes, revalidate that changed scope. Do not replace a failed test with a passing result from another attempt.

The Tests workflow runs for pull requests and main pushes. A tag reuses the successful complete gate for its checked commit rather than triggering another identical matrix. Before publishing, verify the tag's exact object/commit and archive bytes against that accepted input identity. README-only receipt publication likewise reuses unchanged browser-input evidence while its new hashes and links receive their own checks. This does not waive validation of changed product inputs.

Read and write release files explicitly as UTF-8, including on Windows. An implicit legacy-codepage read followed by a UTF-8 write can corrupt punctuation and currency symbols while still producing a syntactically valid file. Inspect the diff for changes beyond the intended version fields and verify the title-separator regression before packaging.

1. Choose the version. A change to what a project sees or must do, such as a new palette, a renamed token or a new required file, raises the minor number while PUDL is below 1.0. A fix that changes nothing a project relies on raises the patch number.
2. Update the version everywhere it appears: the header comment in `dist/pudl.css`, the version link in the topbar of `reference.html`, and the "Status" section of `README.md`.
3. If the release takes a new version of the specification, copy `tokens/`, `glyphs/` and `VERSION` from that tag of [pudl-spec](https://github.com/paulmooreparks/pudl-spec) into `vendor/pudl-spec/`, run `node build/tokens.js`, and say in the changelog which specification version the release implements. Never edit `vendor/pudl-spec/` or the token block of `dist/pudl.css` by hand; the tests fail if the block and the vendored tokens disagree.
4. Run `node build/minify.js`, after the version change and any other edit to `dist/`, so that every minified copy in `dist/min/` matches its source; `node build/minify.js --check` confirms it, and CI fails if they disagree. If the fonts or their generator changed, run `python build/fonts.py` before it.
   Compute the SHA384 integrity values for the README CDN examples from these final local distribution bytes and put the planned version and hashes in the same release commit. These are the expected public bytes. Public/CDN acceptance still requires the independent comparisons after publication below. Because the hashes cover distribution files rather than the README, this introduces no archive-hash cycle.
5. Add the release to `CHANGELOG.md`, saying what changed and what a project must do about it.
6. Open `reference.html` in both themes and check every section, and run any tests that cover what changed.
7. Commit with the message `PUDL <version>: <what changed>`.
8. Tag the commit `v<version>` and push the branch and the tag together:

   ```
   git tag v0.5.0
   git push origin main v0.5.0
   ```

9. Publish the GitHub release with its archive and checksum attached, because projects that copy PUDL download that pair rather than cloning the repository. Build the archive from the pushed tag, never from the working tree, so that it contains the tagged bytes and nothing else. It holds `CHANGELOG.md`, `LICENSE`, `README.md`, all of `dist/`, and the documents the release points readers to, under one folder named for the version. `git archive` makes the archive reproducible: the same tag and paths always give the same bytes, and the archive's comment is the tagged commit.

   Keep the GitHub release as a draft until the successful complete test gate is bound to the checked commit and unchanged tested inputs, and independent tag/object/archive verification has passed. The tag reuses that accepted test evidence under the classifier and policy conditions above; it does not require another tag-triggered matrix. After publication, public-byte comparisons below must pass before delivery acceptance. Retain every failed gate's artifacts and establish whether its cause is a runtime defect or a test-readiness error before clearing intake; a later passing run alone does not establish that cause. Uploading frozen assets to the draft lets consumers prepare without treating the candidate as a cleared release.

   Generate the complete distribution manifest with `node build/release-manifest.js v<version> pudl-<version>-dist-manifest.json` and attach it alongside the archive and checksum. The generator reads tagged Git blobs and emits the version, tag, commit, and each file's path, byte count, SHA-256 and SHA-384 integrity value as UTF-8 with LF. Preserve this complete schema when changing release tooling.

   ```sh
   v=0.5.0
   git archive --format=zip --prefix=pudl-$v/ -o pudl-$v.zip v$v CHANGELOG.md LICENSE README.md dist docs/EXAMPLE.md
   sha256sum pudl-$v.zip | sed 's/ \*/  /' > pudl-$v.zip.sha256
   gh release create v$v --title "PUDL $v" --notes-file notes.md --verify-tag pudl-$v.zip pudl-$v.zip.sha256
   ```

   Then download the pair from the release's public addresses into an empty folder, run `sha256sum -c pudl-$v.zip.sha256`, and confirm that every file in the archive is byte-identical to `git show v$v:<path>` and that its `dist/` holds exactly the files `git ls-tree -r --name-only v$v dist` lists. If a release was published without them, attach them later with `gh release upload`; that changes the release page and leaves the tag alone.

10. Record the integrity hashes. Fetch each file from jsDelivr, confirm it matches the tagged copy, and compute its hash:

   ```sh
   for f in $(git ls-tree -r --name-only v0.5.0 dist/ | grep -E '\.(css|js)$'); do
     tag=$(git show v0.5.0:$f | openssl dgst -sha384 -binary | openssl base64 -A)
     cdn=$(curl -sSL https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.5.0/$f | openssl dgst -sha384 -binary | openssl base64 -A)
     [ "$tag" = "$cdn" ] && echo "$f sha384-$tag" || echo "$f MISMATCH"
   done
   ```

11. Confirm that the already committed README examples contain the version and hashes verified in the preceding public comparison. A normal successful release needs no second README commit or documentation-triggered browser matrix. A mismatch stops acceptance; investigate it without rewriting expected values to match unexpected public bytes. The README on the branch shows the release, and older hashes stay in the history.

Never delete or re-point a pushed tag, and never push a tag before the commit it points to has been checked. Anybody who already fetched the old bytes, jsDelivr included, keeps them.
