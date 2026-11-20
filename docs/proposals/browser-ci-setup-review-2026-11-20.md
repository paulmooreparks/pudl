# Browser CI image source review

Verification reviewed the change against base 8d580821abfc897e6ddb04cfab0f4d5ad7e266d6 on 20 November 2026. Source readiness is clean. Hosted outcome acceptance remains pending.

The workflow pins the official Microsoft registry image v1.63.0-noble to OCI index SHA256 eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27. An independent SHA256 calculation over the retained original 705-byte registry response matches that digest. The index contains Linux amd64 and arm64 manifests. The response and its HTTP observation are retained in the speed audit worktree under tests/output/test-release-speed-ci-20261120/setup-investigation/playwright-image-manifest.json and playwright-image-observation.json. This review did not query the registry again or pull the image.

Both package.json and package-lock.json bind Playwright 1.63.0; the lock also binds playwright-core to that version. The installed-package guard runs after npm ci and before suites. A later package upgrade that leaves this image unchanged will fail the guard.

[Playwright's Docker contract](https://playwright.dev/docs/docker) states that its image supplies browser binaries and system dependencies while the project installs its Playwright package separately. It documents version matching, init, host IPC and default-root use for trusted end-to-end tests. [Playwright's CI guidance](https://playwright.dev/docs/ci) documents GitHub container jobs and recommends one worker with sharding for wider parallelism. These contracts support removing the repeated installation command while retaining npm ci. The current documentation uses a newer example version; the reviewed pin follows this repository's version and retained registry response.

[GitHub's job-container documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container) documents container execution and its default sh shell. The explicit Bash default preserves the existing script's shell assumptions. Node 22 remains selected through setup-node.

The complete workflow diff changes only browser-job environment setup. All eight browser/form/shard combinations, one worker, 300-second suite timeout, source/minified selection, revision binding, unique original artifacts, missing-artifact rejection and the final exact checker remain unchanged. Font and generated/static jobs are unchanged. The Complete test gate remains a workflow acceptance condition; this review makes no repository-settings enforcement claim. git diff --check passes.

Build can proceed with the assigned normal commit and PR. Fresh evidence must cover all 760 original rows, nested outcomes, static/font prerequisites and the Complete test gate. Retain container initialization and resolved image identity alongside package, suite and total timing. Image pull cost and rendered behavior in this environment are unmeasured. Neither prior passing outcomes nor this source review establish the new environment's acceptance or a speed improvement.

The taskbar correction remains separate. Preserve both changes and their original attempts, then require independently accepted combined-main outcomes before publishing 0.108.2. Verification wrote only this review document and did not run browsers, change workflow source or mutate repository settings.
