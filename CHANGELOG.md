# Changelog

## 0.2.0

- A palette is now nineteen tokens per theme: six for the page and text, seven for the accent and status colours, four for lighting and two for the topbar. The raised and sunken treatments, the input background, the shadows, the focus rings, the dialog panel and the topbar chrome are all derived from them. In 0.1.1 a theme replacing the palette had to set about forty tokens per theme, most of them hand-tuned gradients and shadows.
- Four lighting tokens are new: `--light`, `--shade`, `--lit` and `--depth`.
- `--btn-bg`, `--shadow-btn`, `--tb-chrome-bg`, `--tb-chrome-border`, `--tb-chrome-hover-bg`, `--tb-chrome-hover-border`, `--tb-trough` and `--tb-trough-shadow` are gone. Nothing in PUDL used them.
- The default palette renders as it did in 0.1.1, to within a shade.
- `examples/slate.css` shows a theme that replaces the whole palette.

## 0.1.1

- A project may now replace the whole palette, background and topbar included, and the fonts, within restrictions the README sets out. The 0.1.0 README said a project could change only the accent, which was wrong.

## 0.1.0

The first release, extracted from the Andoneer Design Language v2 reference page (Andoneer repository, `mockups/adl-v2-reference.html`, commit 097a9c7).

- The tokens and component classes moved into `pudl.css`, without the styling that exists only to lay out the reference page.
- The focus rings and the primary button's shadow now derive from `--accent` and `--danger`. In ADL v2 they were fixed to the navy accent, so a project that overrode `--accent` kept navy focus rings, which contradicted ADL v2's own rule that recolouring the accent reaches the focus rings.
- Theme handling moved into `pudl-theme.js`, and the saved theme lives under the key `pudl-theme`.
- The reference page's sample content no longer comes from Andoneer's own cards.
