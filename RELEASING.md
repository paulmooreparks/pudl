# Releasing PUDL

A release is a tag. Projects copy a tagged release or load one from jsDelivr, which serves files straight from the tag and caches them for good, so a tag must never move once it has been pushed. A mistake in a release is fixed by the next release.

1. Choose the version. A change to what a project sees or must do, such as a new palette, a renamed token or a new required file, raises the minor number while PUDL is below 1.0. A fix that changes nothing a project relies on raises the patch number.
2. Update the version everywhere it appears: the header comment in `dist/pudl.css`, the version link in the topbar of `reference.html`, and the "Status" section of `README.md`.
3. If the release takes a new version of the specification, copy `tokens/`, `glyphs/` and `VERSION` from that tag of [pudl-spec](https://github.com/paulmooreparks/pudl-spec) into `vendor/pudl-spec/`, run `node build/tokens.js`, and say in the changelog which specification version the release implements. Never edit `vendor/pudl-spec/` or the token block of `dist/pudl.css` by hand; the tests fail if the block and the vendored tokens disagree.
4. Run `node build/minify.js`, after the version change and any other edit to `dist/`, so that every minified copy in `dist/min/` matches its source; `node build/minify.js --check` confirms it, and CI fails if they disagree. If the fonts or their generator changed, run `python build/fonts.py` before it.
5. Add the release to `CHANGELOG.md`, saying what changed and what a project must do about it.
6. Open `reference.html` in both themes and check every section, and run any tests that cover what changed.
7. Commit with the message `PUDL <version>: <what changed>`.
8. Tag the commit `v<version>` and push the branch and the tag together:

   ```
   git tag v0.5.0
   git push origin main v0.5.0
   ```

9. Publish the GitHub release with its archive and checksum attached, because projects that copy PUDL download that pair rather than cloning the repository. Build the archive from the pushed tag, never from the working tree, so that it contains the tagged bytes and nothing else. It holds `CHANGELOG.md`, `LICENSE`, `README.md`, all of `dist/`, and the documents the release points readers to, under one folder named for the version. `git archive` makes the archive reproducible: the same tag and paths always give the same bytes, and the archive's comment is the tagged commit.

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

11. Put the new version and hashes into the CDN examples in `README.md`, and commit that on the branch. The README on the branch always shows the latest release, and older hashes stay in the history.

Never delete or re-point a pushed tag, and never push a tag before the commit it points to has been checked. Anybody who already fetched the old bytes, jsDelivr included, keeps them.
