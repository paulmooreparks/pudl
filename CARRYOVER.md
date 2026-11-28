# PUDL carryover

PUDL 0.112.0 is the latest release, at commit bf4a5d484ee431fb31d2b066b3f4e8c40cb5a818.

Team work stopped on 28 November 2026 after an independent review of testing and release. Paul approved new rules the same day, and [RELEASING.md](RELEASING.md) now holds them. The older preparation records that this file used to carry are in its git history.

## Open work

- Issues 43, 44 and 50 are single unexplained test failures. Each gets a stress run on the hosted runner and is then closed or reproduced. The evidence is on each issue.
- Tests still wait on fixed delays in many places. They are being moved to a documented settled signal, starting with the suites that have failed most.
- The dock policy in `pudl-windows.js` needs one scheduler in place of its three triggers. The historical palette baseline needs replacing with a committed snapshot. Neither has been started.

## Useful locations

The repository is https://github.com/paulmooreparks/pudl. The language specification is https://github.com/paulmooreparks/pudl-spec. The reference site is https://paulmooreparks.github.io/pudl/. Shared APIs are recorded in `docs/CONTRACT.md`.

Customer documents and screenshots must never become public test fixtures.
