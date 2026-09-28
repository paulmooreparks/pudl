# Changelog

## 0.23.0

Issues #7 and #8, reported by jottinger, and two changes from the 0.22 review. A project upgrading should read the last two items.

- Default windows (#8). The layer names windows that are part of a page's furniture, `data-win-default="site"`, and an address that names no windows opens them where their markup puts them, keeping the page's plain address plain while they stay that way. An address with `open`, even an empty `open=`, means exactly what it says, so closing the last window on such a page writes `open=`. The layer names the defaults, not the windows' own markup as the issue proposed, because a default window the address has closed is not in the page for the script to find.
- `pudl:window-close` says why a window closed, in `detail.reason`: `button`, `key`, `script`, `parent`, `replace` or `address`. A project can remember a reader's close of a default window from it (#8).
- Links inside a window can swap regions (#7). A link outside every region carrying `data-region-link`, or inside an element that does, such as a window's body, swaps regions as a link inside one does, so following a tag or category link in an article keeps the windows open. It is opt-in, and every other link is unchanged. The article reader's "Raised means pressable" shows it.
- **Only `pudlApplets.define()` names an applet's script and stylesheet.** A mount's `data-applet-src` and `data-applet-css` are no longer read, and a mount that carries them warns in the console. A page's markup can come from people other than its authors, and a mount that named a script let them choose what ran, even on the page's own origin, which may serve uploaded files. A mount's `data-applet-page` is still read, on the page's origin only. A project moves the two attributes into its `define()` call.
- **A window is a `<section class="win">`.** ARIA allows `role="dialog"` on a section but not on an article, which the documented markup used before. An `<article>` window still works, but axe reports its role; the README, the contract, the reference page and the samples use `<section>`.
- The axe suite also checks that roles are allowed where they are used, and a new suite covers default windows and links inside windows.

## 0.22.1

Accessibility fixes from issues #5 and #6, reported by jottinger.

- The default theme meets WCAG 2.2 AA text contrast everywhere axe checks it, in both themes. A status badge's text is now its status colour drawn toward the text colour (62% of the status colour), since a mid-tone colour cannot reach 4.5:1 on a tint of itself; the status tokens are unchanged, so notices, glyphs and a theme's own colours are unaffected. A filter chip's kind label is no longer faded with opacity. A segmented control's choices not taken are in the full text colour, the chosen one still marked by being raised, and they hover with a light tint.
- A window's body is a tab stop, given by `pudl-windows.js`, so a window whose content has no link or field can still be scrolled from the keyboard. Its focus ring is drawn inside it. A master-detail detail pane takes `tabindex="0"` in its markup for the same reason, and has the same ring.
- A switch is `button.switch` with `role="switch"`, which is what lets it carry `aria-checked`. The contract and the reference page say so.
- A new test suite runs axe for contrast, keyboard scrolling and ARIA on the reference page and the samples in both themes, in all three engines.

## 0.22.0

A review of the whole implementation for performance, clarity and security.

**Performance**

- Dragging a window does much less work, in Firefox and Safari above all. The window now moves by transform on a layer of its own, so each step is composited instead of laid out and repainted with its shadow, and it follows the pointer once a frame however many pointer events arrive. The four placement properties are registered as non-inherited numbers, so changing them restyles the window alone rather than everything inside it, which had made moving and resizing a full window slower the more it held. With a thousand elements in a window, the main-thread work of a drag fell by about half in Firefox and by about seven times in Chromium, and one step of moving the window no longer grows with its content in any engine.
- Dragging the master-detail divider no longer forces the page to be laid out on every pointer event. It measures once at the start and follows once a frame.
- A window change no longer makes the regions script search the whole document once for every parameter of every link in every region. It finds what it needs once per pass.
- An open menu is placed again once a frame while the page scrolls, and not at all while its own rows scroll.

**Security**

- Window markup and swapped regions must be `text/html` from the page's own origin. Both fetches refuse another origin, a redirect to one included, so an open redirect on a site can no longer bring another site's markup into its pages. Regions fall back to an ordinary navigation, and windows to the link's own page.
- An applet mount's `data-applet-src` and `data-applet-css` must name the page's own origin. A site that shows markup from its readers, with a sanitiser that lets data attributes through as DOMPurify does by default, could otherwise have had a reader's comment load a script from anywhere. `define()` may still name any origin. A mount that names another origin fails and loads nothing.
- `pudlToast()` takes only the kinds it knows as a class.
- The expense tracker sample refuses a category, currency or account outside its lists, escapes every stored value it writes into the page, ignores sort and filter names that are not its own, and writes a CSV cell that a spreadsheet would read as a formula as text.

**Correctness**

- `--md-sidebar-min` may be written in any length, such as `12rem`; the divider's limits and the stylesheet's now agree.
- The stylesheet sizes the full-height master-detail page, dialogs and menus with `svh`, as the README advises, so on a phone they never run under the browser's bars.
- `command="request-close"` asks a dialog to close, which its cancel handler may refuse, in browsers that have `requestClose()`.
- When a browser refuses to change the address because a page has changed it too often, as Firefox and Safari do after quick clicking between windows, the windows keep working and the address is written once things are quiet.

## 0.21.0

Follow-ups from parkscomputing.com's second applet, `Architecture/pudl-proposal-applet-followups.md`; `docs/proposals/applet-followups.md` records the response.

- Preset links. A link with `data-applet-preset="name"` hands its state to a running instance of that applet in the same window as the link, or like the link in none, instead of navigating: the value of the mount's `data-applet-param` if the link carries it, otherwise the link's whole query. A mount that keeps its state in the address gets it there as a new history entry, so Back undoes the preset. With no instance to take it, the link is an ordinary link.
- A host hands an applet its state. Just before `init`, `pudl:applet-state` fires on the mount, and whatever a listener puts in `detail.state` arrives as `opts.state`. With `pudl:applet-change`, that is all a window needs to keep an applet's continuity, and PUDL still keeps no state and never hands out an instance.
- The README's applet section shows how to scale content with a size of its own, such as a canvas, into a fill habitat, with the pointer mapping that goes with it, and when an article in a window wants `data-applet-fit="flow"`.
- The article reader keeps its windowed mixer's colours for the visit through the new event, in `samples/applets/continuity.js`; its colour-mixing article's mount flows; and `samples/applet-article.html` sets its mixer from preset links.

## 0.20.0

Applets and their hosts, from parkscomputing.com's `Architecture/pudl-proposal-applet-hosts.md`; `docs/proposals/applet-hosts.md` records the response.

- A registry. `pudlApplets.define(name, { src, css, page, ver })` names an applet's files once, and a mount then needs only `data-applet="name"`. `ver` is added to the script and stylesheet as `?v=`, so a new version is one edit. A mount's own `data-applet-src`, `-css` and `-page` still work, and each wins over the registry separately. `define()` may run before or after `pudl-applets.js` has started the page's mounts.
- `opts.fit`, `"fill"` or `"flow"`, tells the applet how to size itself: fill the definite box a window or a bare page gives it, or flow with an article's column and let the page scroll. A window fills and anything else flows, unless the mount's `data-applet-fit` says otherwise, and the mount's `data-applet-fit` reads the answer for the applet's stylesheet.
- **Changed:** `opts.ownsUrl` is true only on the applet's own page, the one `data-applet-page` or the registry names. Before, any applet outside a window was told it owned the address, so one embedded in an article could rewrite the article's. A mount with no page named still counts as on its own page, as before. **A project must** name the page of any applet it embeds in another page, or the applet will still write that page's address.
- Applet state. An instance may offer `state()` and `setState(s)`, `opts.state` hands it the state its host kept, and `opts.changed(s)` fires `pudl:applet-change` on the mount. PUDL keeps no state, with one opt-in: a mount outside a window with `data-applet-param="name"` keeps its state in the page's query under that name, replaced rather than pushed, and Back and Forward hand a changed value to `setState()`.
- Fixed: an applet inside a region swapped by `pudl-regions.js` was never destroyed, and one arriving with a new region never started. The runtime now does both on every swap.
- `pudl-regions.js` carries an applet's `data-applet-param` from address to address as it carries the windows' parameters, and a change in it alone no longer fetches regions on Back or Forward.
- The README's applet section documents the fill and flow sizing patterns: the measuring wrapper for a square board, why a size container's box must come from its layout, and `svh` rather than `dvh` on phones.
- The colour mixer sample offers `state()` and `setState()`, and `samples/applet-article.html` embeds it in an article, named through `samples/applets/registry.js`, with its mix in the article's address.

## 0.19.2

Fixes found by making the expense tracker a working application. Nothing a project relies on changes.

- A one-line field is one height whatever its type. Browsers drew a `.form-select` and a date `.form-input` 2px taller than a text field, so fields side by side in a form did not line up. `.form-input` and `.form-select` are now 36px tall; a select with `multiple` or `size` keeps its own height.
- A stacked `.data-table.stack` keeps its caption across the full width. The caption was squeezed into a narrow column, a word to a line, once the table became cards.
- In a stacked table, everything in a cell's value stays together at the end, beside its label at the start. A cell holding two badges spread them across the row, and a `.data-table-check` cell was squeezed to 1% of the row's width.
- On a phone, a pagination's summary takes a line of its own, so the page links stay on one.
- The expense tracker sample works: its list sorts by any column, filters by search, trip, account and state with filter chips, pages, and submits or deletes several expenses at once; each expense moves from draft through approval to paid, takes a receipt and keeps a history; the Trips and Reports sections, unreachable before, are there, with reports downloadable as CSV; and the data can be reset. A script, `samples/expenses-app.js`, stands in for the server, since GitHub Pages has none. The archive page is now the list's Paid view, and its old address leads there.
- The tests gain a suite for the expense tracker, and `PUDL_EXECUTABLE` runs them with a browser already installed.

## 0.19.1

- The section tab bar keeps its height when no tab is current. The current tab stands 4px taller than the others, so the bar used to grow on a page inside a section and shrink on a page outside every section, and the content below jumped. The bar now always reserves that space.

## 0.19.0

- The contract. `docs/CONTRACT.md` lists everything a project may rely on: the files, the tokens a theme may set or read, the classes, data attributes, events, functions and address grammar, and what is internal. From 1.0 it changes only in a major release, and anything removed from it is deprecated first.
- The tests are in the repository. `npm test` runs fourteen suites against the samples and the reference page in Chromium, `npm run test:all` runs them in Firefox and WebKit too, and GitHub Actions runs all three engines on every push and pull request.
- A window that arrives after the reader has moved on no longer takes focus. Opening a window and pressing <kbd>/</kbd> before its content arrived left focus on the window rather than the launcher's filter, so what the reader typed went nowhere. A window now takes focus only if focus has not moved since it was asked for. Reported from parkscomputing.com.
- A menu's filter is cleared every time its panel opens. When a browser merged the toggle events of a quick close and reopen, the old filter text stayed.
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
