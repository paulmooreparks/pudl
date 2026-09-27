# Changelog

## 0.18.0

- Form states. A field marked `aria-invalid="true"` takes a danger border and focus ring beside its `.form-error`; a required field's label carries an asterisk drawn from its `required` attribute; and there are `.form-help`, `.form-fieldset` with its legend, `.form-options` for radio and checkbox groups, `.form-file` with a raised button, and a disabled state.
- Tabs within a page, in the ARIA tab pattern, styled like section tabs. The new optional `dist/pudl-tabs.js` shows one panel at a time, adds the arrow keys and a single tab stop, and keeps the chosen panel in the address's fragment; without it every panel shows.
- Empty and loading states: `.empty-state` with a drawn glyph, title, text and actions, and `.loading` with a `.spinner` in a status element.
- Tooltips. The new optional `dist/pudl-tooltip.js` names glyph-only controls from their `aria-label`, or any element from `data-tooltip`, on hover or keyboard focus, hoverable and dismissible with Escape.
- Pagination, with raised page links, the current page pressed in, and previous and next glyphs that mirror on right-to-left pages.
- The expense tracker sample, `samples/expenses.html` and three pages beside it, shows the components of 0.17.0 and 0.18.0 working together. It is to grow into a full demonstration application with a server for 1.0.
- The reference page gains the new form states and sections for tabs within a page, empty and loading states, and pagination, and its icon buttons carry proper names.

## 0.17.0

- Data tables. `.data-table` in a `.data-table-wrap` lists many records: a sticky header, sortable columns whose raised headers carry `aria-sort` and a direction glyph and link to the other order, `.num` columns aligned to the end, row selection by checkbox or `aria-selected` with a tint and an edge, a `.data-table-empty` row, and with `.stack`, rows as labelled cards when the table is narrow.
- Notices and toasts. A `.notice` stays until dealt with; a `.toast` confirms and leaves. Both come in information, `.positive`, `.warn` and `.danger`, each with its own drawn glyph and a coloured edge. The new optional `dist/pudl-toast.js` provides `pudlToast()`, timing that pauses while the reader is on a toast, dismiss buttons, and the re-insertion that makes a server's toast heard by screen readers.
- Menus summoned by a key. A `.menu-panel` with `data-menu-key` opens on that key outside editable fields, with focus in its filter; a panel with no button opens as a palette near the top of the window; and Enter with no match left submits the filter's form. This is PUDL's answer to parkscomputing.com's go palette, recorded in `docs/proposals/go-palette.md`.
- New glyphs for sorting and for the kinds of notice.
- The reference page gains sections for data tables and for notices and toasts, and its launcher opens with <kbd>/</kbd>, as do the article reader's.

## 0.16.0

The consistency pass from `docs/proposals/road-to-1.0.md`. Every old name keeps working; the README's "Names that changed" lists them.

- Section tabs are a notebook. The bar is a recessed band, each tab the reader can go to is raised, and the tab for where they are, marked `aria-current`, is flat and opens into the content below. `aria-current="true"` marks the section a page belongs to. The current tab takes `--section-current-bg`, which a page on the page background sets to `var(--bg)`. Before, every tab was flat text, so by PUDL's own rules none of them looked pressable.
- State is marked with ARIA attributes everywhere: `aria-current` on section tabs, list rows and view links in a segmented control, and `aria-pressed` or `aria-checked` on segmented buttons. `.active` remains an alias.
- Badges, chips and filter chips look distinct. A chip is now a neutral label rather than accent-tinted; a filter chip is outlined, and its × is a small raised button.
- The switch is a raised thumb in a sunken track.
- Every chrome glyph is an SVG mask from the stylesheet: badge glyphs, the form error's warning, the menu caret, the back link, the window buttons, the dock's dots and the child-row branch. None can turn into a colour emoji, and all follow the theme. In high-contrast mode they paint in the system's colours.
- A type scale, `--text-2xs` to `--text-3xl`, which every size in PUDL now uses, and base sizes for `h1` to `h4` that any class overrides. A few sizes moved by a pixel to land on the scale.
- A spacing grid, `--space-1` to `--space-6`, used for spacing between and around components. Cards and dialogs have 16px and 24px of padding, on the grid.
- Dialogs are native `<dialog class="dialog">` elements with a 40% `::backdrop`, opened by `command="show-modal"` buttons, and the new optional `dist/pudl-dialog.js` supplies those buttons in browsers that lack them.
- Renamed: `--pr` is `--positive`, `.badge.pr` is `.badge.positive`, and `.fc-kind` is `.filter-chip-kind`.
- The reference page reads as one document, in prose throughout, with a section for section tabs and a rewritten list of invariants.

## 0.15.0

- High contrast. In Windows' high-contrast mode, which removes every shadow, focus is drawn as a real outline, controls keep visible borders, and selected and pressed states, the active window's title bar and the current dock tab take the system's highlight colours. Before, focus did not show at all in that mode.
- Reduced motion. A reader who asks their system for less motion gets no transitions or animations.
- Right to left. The stylesheet uses logical properties where the reading direction matters, and on a right-to-left page the master-detail sidebar, its divider (pointer and keys), the selected-row marker, menu placement, the back link and child-row glyphs, and the switch all mirror. Window positions stay physical, since they are coordinates in the URL.
- The words the scripts write into the page can come from the page: `data-win-text-maximize`, `-restore`, `-minimized` and `-head` on the window layer, `data-menu-empty` on a menu panel, and `data-md-valuetext` on the sidebar divider. English remains the default.
- Print. Chrome does not print, pages print black on white from either theme, a master-detail layout showing a record prints the record alone, and the window in front prints as the page's content while other windows, and what lies under them, do not.
- The form error's ⚠ and the window's ↗ ask for their text form, so they cannot render as colour emoji.
- The first release on the road to 1.0; `docs/proposals/road-to-1.0.md` sets out the rest.

## 0.14.0

- The master-detail sidebar resizes. The new optional `dist/pudl-md.js` makes the `.md-resize` divider move by pointer and by keyboard (Left and Right, Shift for a larger step, Home and End to the limits, double-click to reset), following the ARIA window-splitter pattern. It sets `--md-sidebar-w` on the layout and fires `pudl:md-resize` when a change ends; PUDL keeps no state, and the README shows how to remember the width without a jump on load.
- The stylesheet holds the sidebar between `--md-sidebar-min` (180px) and half the layout, whether the width came from a drag, a stored preference or a theme.
- Fixed: windows could rise over what surrounded their host, such as the half of a master-detail divider that overlaps the detail pane, which a maximised window then covered. `.win-host` now keeps its windows' stacking to itself.
- The reference page's master-detail demo and the article reader sample have working dividers, and the sample remembers the reader's width.
- From parkscomputing.com (`Architecture/pudl-proposal-sidebar-resize.md` in that repository).

## 0.13.2

- The dark theme's active title bar no longer draws an accent rule along its foot, which read as a divider and pulled the eye. Its accent tint is a little stronger instead, so the active bar still stands apart from the others, and the active window keeps its accent frame and stronger shadow. A theme that wants the rule back can set it in `--win-active-shadow`.

## 0.13.1

- Fixed: the active section tab showed the bar's baseline under it, so the tab no longer read as joined to the content below. 0.12.0 let the section bar scroll sideways on a narrow screen, and a box that scrolls clips anything reaching past its edge, including the pixel by which the active tab covered the bar's bottom border. The bar now draws its baseline as part of its own background, and the active tab paints over it from inside the bar.

## 0.13.0

- A reader can choose to follow the operating system's theme. `pudl-theme.js` remembers light, dark or system; system is resolved before the first paint and follows the system's setting live. It adds `pudlSetTheme()`, `pudlThemePreference()`, `data-theme-pref` on the `<html>` element and a `pudl:theme-change` event, and a choice made in one tab reaches the others. `pudlToggleTheme()` is unchanged, and a reader with nothing saved still starts dark. The reference page has a working Light / Dark / System setting.
- An empty window dock is no longer removed from the layout. It still draws nothing, but a toolbar that uses it as its elastic middle keeps its shape when the last window closes.
- An empty chips row is hidden by the absence of chips rather than by `:empty`, which a template's whitespace defeated, leaving a thin empty bar.
- The README says that a region that is sometimes empty must still be rendered, since a swap needs a counterpart for every region.
- From parkscomputing.com (`Architecture/pudl-proposal-empty-structure.md` in that repository).

## 0.12.0

- Regions. The new optional `dist/pudl-regions.js` makes a navigation that changes only part of a page replace only that part. A page marks the parts with `data-region`. A same-origin link or GET form inside a region fetches the target page, the same address a bookmark would fetch; if it has the same regions and window layer, the regions are swapped and the address pushed with the open windows, which stay as they were, scroll positions and running applets included. Otherwise the browser navigates normally. Back and Forward swap the regions when their part of the address changed. Same-page links and window fields in regions are kept current with the open windows.
- `pudl:regions-swap` fires after a swap, and the windows module marks the new list's rows on it.
- `pudl:windows-change` now bubbles, so a listener on the document hears it.
- The section bar no longer shrinks in a full-height layout, and scrolls sideways when its tabs outrun a narrow screen.
- The article reader sample gains category tabs, with a page per category, and its windows now come from `samples/windows/`, fetched as a server would answer them. It therefore needs a web server to run.
- From parkscomputing.com; `docs/proposals/window-workspace.md` records the design.

## 0.11.0

- A window opened by a link inside another window opens in that window's state: maximised from maximised, the same half from a snapped half, and from a floating window, floating one step down and to the right, wrapping to the top left at the edge. Opens from outside any window keep the markup's default. `pudl:window-place` gains `detail.opener`.
- A child window's buttons are now maximise, which also restores, and close. The samples' child windows carry both.
- The filter's apply button: a `form.md-filter-group` joins the `.md-filter` input to an `.icon-btn.md-filter-go` submit button, whose magnifying glass is drawn by the stylesheet. The reference page's master-detail demos use it.
- `--tb-link-hover`, a hover colour for links on the topbar, derived from the accent and the topbar's foreground. The brand used the page's link hover, which on a light theme was a dark colour on the dark bar; it now uses this token, and plain links on the topbar take the topbar's colours.
- The reference page's receipt child now opens floating, because the expense it is opened from floats.
- These came from parkscomputing.com; `docs/proposals/window-workspace.md` records them.

## 0.10.0

- Applets. The new optional `dist/pudl-applets.js` lets interactive content run unchanged in a page of its own or inside a window. A mount names the applet's script, stylesheet and page; the script registers `init(root, opts)` returning an instance with `destroy()`; and `opts` says whether the applet is in a page or a window and so whether it owns the URL. The runtime loads assets once and starts and destroys applets as windows open and close. The README sets out the contract.
- `pudl:window-close` fires on each window just before it leaves the page, by any route.
- A link inside a window marked `data-win-replace` opens its target in place of that window, keeping its dock position and placement, as one history entry that Back undoes.
- `window.pudlWindows` gives scripts `open`, `replace`, `raise`, `minimize`, `close` and `state`, each doing what the matching link or button does.
- The article reader sample gains an article hosting an applet and "Next" links between articles, and `samples/colour-mixer.html` runs the same applet in a page of its own.
- All four came from adopting PUDL on parkscomputing.com; `docs/proposals/from-parkscomputing.md` records them.

## 0.9.0

- The `hidden` attribute always hides, even on a component that sets its own `display`, such as `.btn`. `hidden="until-found"` is left to the browser. The per-component patches for the same problem in the windows and menu styles are gone.
- A `.btn` with `aria-pressed="true"` stays pressed in, for toggle buttons that latch.
- The active window's title bar comes from four new tokens, `--win-active-bg`, `--win-active-fg`, `--win-active-border` and `--win-active-shadow`, so a theme can tune it without overriding the component. The dark theme's default is now quieter: the raised gradient tinted toward the accent, normal text, and an accent rule along the foot, since a dark theme's bright accent made a glaring filled bar. The light theme keeps the filled bar.
- The active title bar's keyboard focus ring now shows. The accent bar's own styles had hidden it.
- These three came from adopting PUDL on parkscomputing.com, and `docs/proposals/from-parkscomputing.md` records them.

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
