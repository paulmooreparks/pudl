# Changelog

## 0.4.2

- The master-detail layout works on a phone. Below 640px wide the toolbar wraps, the filter takes a full row, and the sidebar sits above the detail, holding at most two fifths of the height, instead of keeping its 260px width beside it.
- A long value in a key/value table now wraps instead of pushing the table past the edge of the screen.
- The reference page fits a phone: its side margins shrink to 16px, the form sample puts each label above its field, and the invariants list stacks its labels. The topbar's Reference and version pills, which looked pressable but were labels, are now links to the repository and the changelog.

## 0.4.1

- A press on a window's title bar or resize border now raises the window at once. In 0.4.0 only a press in the window's body did, and the title bar raised the window only at the end of a drag.

## 0.4.0

- Floating windows, in the optional `pudl-windows.css` and `pudl-windows.js`. Windows drag by the title bar, resize from any edge or corner, snap to the left or right half or maximise when dragged against an edge, minimise to a dock, and move and resize from the keyboard. The URL holds the whole arrangement, the server renders the windows it names, and every window button is a real link to the state it produces. The README sets out the URL format and the markup.
- The windows are a rewrite of Andoneer's card windows as a general module. Unlike Andoneer's, they fetch a window's markup alone rather than cutting it out of a full page, work without script, take focus when they open and return it when they close, and include only the snapping that works.
- The reference page demonstrates the windows live, in place of a static drawing of one. Its section headings no longer style headings inside the demos.
- The README and the reference page now say PUDL is modelled on desktop toolkits such as GTK, rather than taken from GTK, and the README says PUDL contains no GTK code, stylesheets or artwork.

## 0.3.0

- The default palette is now a neutral graphite, with cool greys, a steel-blue accent, status colours a step less saturated than before, and a dark graphite topbar in both themes. The warm parchment and leather palette that was the default up to 0.2.0 is now `examples/parchment.css`, serif headings included.
- Text is set in Inter, which ships in `fonts/` as an upright and an italic variable file under the SIL Open Font License. The platform's interface face stands in until it loads. A project copying a release must now keep `fonts/` beside `pudl.css`.
- Headings use the body face. `--font-display` defaults to `var(--font)`, and a theme may still set a display face of its own.
- The monospace stack now leads with `ui-monospace`.
- Numerals are tabular wherever numbers are data (tables, form fields, code, badges, chips, the segmented control, topbar pills and master-detail rows, plus `<time>`, `<data>`, `<output>` and the new `.num` class) instead of on the whole page. Running prose now keeps proportional figures, because Inter's tabular feature also widens the hyphen and spaced out every hyphenated word.
- `examples/slate.css` no longer sets `--font-display`, because the default now does what it did.
- On the reference page, the introductory paragraphs are no longer muted and narrowed, and the card and dialog titles no longer carry an extra 22px of space above them. Both came from styles on the reference page, not from PUDL.

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
