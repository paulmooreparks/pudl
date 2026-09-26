# Changelog

## 0.8.0

- Menus. A `.menu-btn` opens a `.menu-panel`, an HTML popover, so opening, closing on Escape or an outside click, and sitting above everything work without script. Places in a panel are master-detail rows under section labels; actions are `.menu-action` buttons below a `.menu-sep`. The button looks pressed while its panel is open. The README sets out the markup.
- A new optional `dist/pudl-menu.js` opens a panel against its button, above it when there is more room, and as a full-width sheet on a narrow window; adds Up, Down, Home and End between rows; and makes an `.md-filter` in a panel narrow its rows, with Enter following the first row left.
- A launcher is a menu button at the start of the row that holds a window dock. The reference page's windows demo and the article reader sample each have one, and the master-detail toolbar's Trip and Account buttons are now real menus.
- A master-detail toolbar marked `.md-site-tools` stays on screen when a narrow layout shows a record, so a launcher or dock in it is reachable from inside a record on a phone.
- In a menu panel, rows that open windows are marked while their window is in front, but gain no child-window rows, since a child is not a place.
- Fixed: on a narrow master-detail layout, the list's rows were meant to grow taller as touch targets from 0.5.0 on, but a later rule of equal weight kept them compact.
- The design is recorded in `docs/proposals/launcher.md`.

## 0.7.0

- Child windows. A window whose markup says `data-win-parent="<key>"` is a child of that window: it stacks above its parent, comes forward and hides with it, closes with it, has no dock tab of its own, and closes on Escape when it is in front. Focus returns to the link that opened it. The relation lives in the markup, so the URL grammar is unchanged.
- A list of master-detail rows follows the windows its links open. The row of the window in front is marked `active` with `aria-current`, and each open child gets an `.md-row-child` row beneath its parent's row, with a branch glyph, which goes when the child closes.
- A layer inside a master-detail layout makes the windows its detail pane: the script sets `data-md-pane`, so a narrow layout shows the list or the windows, and a `data-win-back` link minimises every window to return to the list.
- A window whose markup gives `data-win-mode` without a position now opens in that mode. Before, it opened floating unless its position was given too.
- `pudl:window-place` now carries `event.detail.parent`.
- The new `samples/` folder starts with `article-reader.html`, a reading site with the article list in a sidebar, articles opening maximised and listings as child windows. The reference page's window demo gains a child window, uses master-detail rows for its list, and links to the sample.

## 0.6.0

- The files a project uses now live in `dist/`: `pudl.css`, `pudl-theme.js`, `pudl-windows.css`, `pudl-windows.js` and `fonts/`, with a copy of the licence as `dist/LICENSE` so that it travels with them. The reference page, the examples and the documentation stay at the top level. Nothing inside the files changed.
- A project copying a release now copies the contents of `dist/`. A page loading PUDL from jsDelivr adds `/dist` to the path, as in `https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl.css`. Links to earlier releases keep working at their old paths.

## 0.5.0

- The master-detail layout shows one pane at a time when it is 640px wide or less: the list, or a record. The server marks the layout with `data-md-pane="detail"` when the URL names a record, and the detail pane's new `.md-back` link returns to the list with its filters kept, scrolled to the record's row. The list's toolbar and filter chips step aside while a record shows, and list rows grow taller as touch targets. The README sets out the contract.
- The layout measures its own width with a container query, so a master-detail layout in a narrow window or panel behaves as it does on a phone.
- This replaces 0.4.2's narrow-screen rule, which stacked the list above the record. A project on 0.4.2 that wants the record pane on a phone must now render `data-md-pane="detail"` and an `.md-back` link.

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
