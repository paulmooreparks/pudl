# Releasing PUDL

A release is a tag. Projects copy a tagged release or load one from jsDelivr, which serves files straight from the tag and caches them for good, so a tag must never move once it has been pushed. A mistake in a release is fixed by the next release.

1. Choose the version. A change to what a project sees or must do, such as a new palette, a renamed token or a new required file, raises the minor number while PUDL is below 1.0. A fix that changes nothing a project relies on raises the patch number.
2. Update the version everywhere it appears: the header comment in `dist/pudl.css`, the version link in the topbar of `reference.html`, and the "Status" section of `README.md`.
3. If the release takes a new version of the specification, copy `tokens/`, `glyphs/` and `VERSION` from that tag of [pudl-spec](https://github.com/paulmooreparks/pudl-spec) into `vendor/pudl-spec/`, run `node build/tokens.js`, and say in the changelog which specification version the release implements. Never edit `vendor/pudl-spec/` or the token block of `dist/pudl.css` by hand; the tests fail if the block and the vendored tokens disagree.
4. Add the release to `CHANGELOG.md`, saying what changed and what a project must do about it.
5. Open `reference.html` in both themes and check every section, and run any tests that cover what changed.
6. Commit with the message `PUDL <version>: <what changed>`.
7. Tag the commit `v<version>` and push the branch and the tag together:

   ```
   git tag v0.5.0
   git push origin main v0.5.0
   ```

8. Record the integrity hashes. Fetch each file from jsDelivr, confirm it matches the tagged copy, and compute its hash:

   ```sh
   for f in $(git ls-tree --name-only v0.5.0 dist/ | grep -E '\.(css|js)$'); do
     tag=$(git show v0.5.0:$f | openssl dgst -sha384 -binary | openssl base64 -A)
     cdn=$(curl -sSL https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.5.0/$f | openssl dgst -sha384 -binary | openssl base64 -A)
     [ "$tag" = "$cdn" ] && echo "$f sha384-$tag" || echo "$f MISMATCH"
   done
   ```

9. Put the new version and hashes into the CDN examples in `README.md`, and commit that on the branch. The README on the branch always shows the latest release, and older hashes stay in the history.

Never delete or re-point a pushed tag, and never push a tag before the commit it names has been checked. Anybody who already fetched the old bytes, jsDelivr included, keeps them.
