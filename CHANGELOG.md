# Changelog

## 0.1.0

The first release, extracted from the an earlier project Design Language v2 reference page (an earlier project repository, `mockups/adl-v2-reference.html`, commit 097a9c7).

- The tokens and component classes moved into `pudl.css`, without the styling that exists only to lay out the reference page.
- The focus rings and the primary button's shadow now derive from `--accent` and `--danger`. In an earlier design language they were fixed to the navy accent, so a project that overrode `--accent` kept navy focus rings, which contradicted an earlier design language's own rule that recolouring the accent reaches the focus rings.
- Theme handling moved into `pudl-theme.js`, and the saved theme lives under the key `pudl-theme`.
- The reference page's sample content no longer comes from an earlier project's own cards.
