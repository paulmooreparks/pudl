# The PUDL contract

This document lists everything a project may rely on in PUDL. From 1.0 on, nothing listed here changes except in a new major version, and anything not listed is internal and may change in any release. The README explains how to use each part; this document says what is promised.

The [menu-bar conventions](MENU-BARS.md) describe command placement and ownership. The [0.40.0 migration guide](MENU-BAR-MIGRATION.md) explains the identifiers, contribution limits, and generated-menu changes supported by the API below.

The [responsive workspace contract and adoption guide](RESPONSIVE-WORKSPACES.md) defines narrow placement, compact chrome, menu overflow, splitter tracks, and mounted single-pane presentation introduced in 0.41.0.

The [shared dock contract](SHARED-DOCKS.md) defines the opt-in tabs, responsive icon rails and required windows introduced in 0.55.0, and the shared top and bottom docks, collapsed strips and tab order added in 0.57.0.

## Promises

- **Versions.** PUDL follows semantic versioning from 1.0. A patch release fixes behaviour without changing the contract. A minor release adds to the contract without changing or removing anything in it. A major release may change or remove what is listed here, and its changelog says what a project must do.
- **Deprecation.** When a name is replaced, the old name keeps working until the next major release, and the changelog and the README's "Names that changed" say so. The names already replaced are listed at the end of this document.
- **Releases.** A release is a tag, `v<version>`, and its files never change once pushed. A project copies the contents of `dist/` from a tag, or loads them from jsDelivr at the tag with integrity hashes.
- **Browsers.** PUDL supports browsers from 2024 on: Chromium 120, Firefox 128 and Safari 17.4 and later, the versions that support popovers, `:has()`, container queries, `color-mix()`, `:dir()` and the other features PUDL uses. Every release is tested in Chromium, Firefox and WebKit. `pudl-dialog.js` supplies the dialog command buttons, which are newer than that floor.
- **No state of its own.** PUDL keeps state only in the URL and, for the reader's theme, in local storage under the key `pudl-theme`. Everything else a project wants remembered, it stores itself, from the events below.

## Files

Everything is in `dist/`. `pudl.css` and its `fonts/` are the language; everything else is optional, and each optional script works without the others except where noted.

| File | Needs | Provides |
|---|---|---|
| `pudl.css`, `fonts/` | | Tokens and every component's appearance |
| `pudl-theme.js` | loaded in `<head>` before `pudl.css` | The reader's theme, applied before the first paint |
| `pudl-windows.css`, `pudl-windows.js` | `pudl.css` | Floating windows |
| `pudl-menu.js` | `pudl.css` | Menu placement, arrow keys, filtering, keys that summon menus; context menus, popover placement and focus, split buttons' menus (0.74.0) |
| `pudl-date.js` | `pudl.css` | Date and time fields with PUDL's calendar and time list (0.74.0) |
| `pudl-listbox.js` | `pudl.css` | List boxes (0.74.0) |
| `pudl-fields.js` | `pudl.css` | Meters' bands and marks, sliders' fill and output, number fields, password fields, and pictures that fail in figures and avatars (0.74.0) |
| `pudl-applets.js` | | The applet runtime; works with or without windows |
| `pudl-regions.js` | | Swapping regions on navigation |
| `pudl-md.js` | `pudl.css` | Resizing the master-detail sidebar |
| `pudl-dialog.js` | | Dialog command buttons for browsers that lack them |
| `pudl-toast.js` | `pudl.css` | Toasts and dismissing notices |
| `pudl-tabs.js` | `pudl.css` | Tabs within a page |
| `pudl-toolbar.js` | `pudl.css`, `pudl-menu.js` | Toolbars' keys, folding toolbars, command bars and ribbons (folding released in 0.78.0) |
| `pudl-combo.js` | `pudl.css` | Combo boxes and searchable selects |
| `pudl-tooltip.js` | `pudl.css` | Tooltips on glyph-only controls |
| `pudl-tree.js` | `pudl.css` | Trees |
| `pudl-annotations.js` | `pudl.css` | Scoped selection action bars and aligned margin notes (0.85.0) |
| `pudl-native.js` | `pudl.css`, `pudl-menu.js` | Native host-supplied full-screen topbar window controls (0.86.0) |
| `pudl-grid.js` | `pudl.css` | Tables whose rows are choices |
| `pudl-hljs.css` | `pudl.css` | highlight.js classes coloured from the syntax tokens |
| `pudl-code.js` | `pudl.css` | Copy and Download on code blocks |
| `pudl-split.js` | `pudl.css` | Splitters between two panes |
| `pudl-menubar.js` | `pudl.css`, `pudl-menu.js`; uses `pudl-windows.js` and `pudl-applets.js` when present | An application's menu bar in its topbar |
| `pudl-fonts-full.css` | `pudl.css` and `fonts/`, loaded after `pudl.css` and before a theme | Text in the whole of Inter, as the family "Inter Full": every weight, the optical-size axis and every OpenType feature |
| `pudl-fonts-system.css` | `pudl.css`, loaded after it and before a theme | Text in the platform's own interface face, with no font downloaded |
| `min/name.js`, `min/name.css` | what its source needs, with `min/` beside `fonts/` and `vendor/` | Each script and stylesheet minified, under its own name, with a source map; it behaves as its source does, and a script loads the scripts it loads from its own folder (0.73.0; from 0.70.0 to 0.72.0 the copies were `name.min.js` and `name.min.css` beside their sources) |
| `pudl-components.json` | | The components, their templates, the grammar of their parts, variants and states, for tools; [described here](COMPONENTS.md). It agrees with the component table below. Until 1.0 its fields may change in a minor release. |

## Tokens

**A theme may set these**, on `:root` and on `[data-theme="dark"]`, within the rules in the README's "What a project may change":

- Page and text: `--bg`, `--surface`, `--surface-alt`, `--text`, `--text-muted`, `--border`
- Accent and status: `--accent`, `--accent-hover`, `--on-accent`, `--warn`, `--danger`, `--danger-hover`, `--positive`
- Lighting: `--light`, `--shade`, `--lit`, `--depth`
- Topbar: `--tb-bg`, `--tb-fg`, `--tb-link-hover`
- Syntax: `--syntax-keyword`, `--syntax-string`, `--syntax-number`, `--syntax-comment`, `--syntax-name`, `--syntax-tag`, `--syntax-attr`, `--syntax-heading`, `--syntax-link`, `--syntax-error`, each reaching 4.5:1 on `--surface`, `--surface-alt` and `--input-bg`
- Fonts: `--font`, `--font-display`, `--mono`
- Adjustments with defaults derived from the above: `--dialog-bg`, `--section-current-bg`, `--win-active-bg`, `--win-active-fg`, `--win-active-border`, `--win-active-shadow`, `--win-head-docked`
- Layout: `--md-sidebar-w` and `--md-sidebar-min` on a `.md-layout`

**A project may read these** in its own styles but does not set them: the type scale `--text-2xs` to `--text-3xl`; the spacing grid `--space-1` to `--space-6`; `--radius`, `--radius-sm`, `--radius-xs`, `--radius-pill`; the surface treatments `--input-bg`, `--input-border`, `--raise-top`, `--raise-grad`, `--raise-grad-hover`, `--raise-active-bg`, `--raise-border`, `--raise-border-hover`, `--raise-shadow`, `--raise-active-shadow`, `--entry-shadow`, `--recess-bg`, `--recess-shadow`, `--shadow-card`, `--shadow-dialog`, `--backdrop`, `--focus-ring` and `--focus-ring-danger`; and the glyphs `--glyph-account`, `--glyph-app`, `--glyph-arrow-down`, `--glyph-arrow-up`, `--glyph-back`, `--glyph-board`, `--glyph-bold`, `--glyph-branch`, `--glyph-caret`, `--glyph-check`, `--glyph-chevron`, `--glyph-circle`, `--glyph-clip`, `--glyph-close`, `--glyph-code`, `--glyph-colour`, `--glyph-comments`, `--glyph-copy`, `--glyph-diamond`, `--glyph-dock`, `--glyph-document`, `--glyph-download`, `--glyph-empty`, `--glyph-file`, `--glyph-flag`, `--glyph-folder`, `--glyph-gear`, `--glyph-grip`, `--glyph-home`, `--glyph-image`, `--glyph-inbox`, `--glyph-info`, `--glyph-italic`, `--glyph-link`, `--glyph-list`, `--glyph-list-numbered`, `--glyph-maximize`, `--glyph-menu`, `--glyph-minimize`, `--glyph-minus`, `--glyph-new-window`, `--glyph-open`, `--glyph-panel`, `--glyph-paragraph`, `--glyph-pencil`, `--glyph-pencil-off`, `--glyph-pin`, `--glyph-plus`, `--glyph-quote`, `--glyph-reload`, `--glyph-restore`, `--glyph-ring`, `--glyph-script`, `--glyph-search`, `--glyph-shield`, `--glyph-slash`, `--glyph-sort`, `--glyph-sort-down`, `--glyph-sort-up`, `--glyph-square`, `--glyph-stop`, `--glyph-strike`, `--glyph-table`, `--glyph-terminal`, `--glyph-theme`, `--glyph-tick`, `--glyph-ticket`, `--glyph-triangle`, `--glyph-underline`, `--glyph-undock` and `--glyph-warning`, which are SVG masks to be filled with a colour. Drawing a project's own control from these tokens keeps it in the grammar.

Every other custom property is internal.

## Components

Selection actions and margin notes have additional geometry and lifecycle rules in [ANNOTATIONS.md](ANNOTATIONS.md).

Each row is a component, the markup it expects and the attributes that carry its state. "Aria-current" means any `aria-current` value but `"false"`.

| Component | Markup | State |
|---|---|---|
| Native window controls | Generated app menu and three native action buttons in `.topbar`, attached through `pudlNative.attach` | Host-reported full screen, active state and action capabilities; see [NATIVE-WINDOWS.md](NATIVE-WINDOWS.md) |
| Selection actions | Content with `data-selection-actions="bar-id"`; sibling `.selection-actions` with that ID and `button[data-selection-action]` controls | `hidden` on the offer; `pudl:selection-action` carries action, cloned Range, text and button |
| Margin notes | `.noted` holding `.noted-body` and `.margin-note[data-note-for]` siblings; notes link to element IDs in the body | generated `data-notes-beside`, `.note-marker` and `.note-back`; application may supply Range anchors |
| Topbar | `header.topbar` holding `a.brand`, optionally `nav.topbar-tabs` of `a` (with `--section-current-bg` for what lies below), `.topbar-chrome` with `a.topbar-pill` (optionally a `.glyph` and a `.topbar-pill-label`, shown as the glyph alone on a phone), `button.theme-toggle`; a menu button may hold its words in `.menu-btn-label`, cut short on a phone | `aria-current` on the pill or tab for the current page |
| Status area | `nav.status-area`, last in `.topbar-chrome`, of `.status-item` links or buttons, each holding a `.glyph` or an `img`, or `.glyph.status-picture` with `--glyph-account` for an account with no picture, then optionally a `.badge` with its status class and words in a `span`; beside a menu bar it is drawn as the menu bar's groups | a `.badge` that is empty or `hidden` is not shown; the item's `aria-label` says what the badge means |
| Section tabs | `nav.app-section-bar` of `a.section-tab` | aria-current on the current tab: `"page"` for the section's page, `"true"` for a page inside it |
| Buttons | `.btn`, with `.btn-primary`, `.btn-danger`, `.btn-sm`, `.disclosure` (with `aria-expanded`, the chevron after its words); `.icon-btn`, with `.danger`; `.link` and `.link-muted` on a button or link | `disabled`; `aria-pressed="true"` latches a `.btn` |
| Form fields | `.form-group` holding `label.form-label`, `.form-input`, `span.form-select-wrap` holding `.form-select` (a `.form-select` alone keeps the browser's drawing), or `.form-textarea`, `.form-help`, `.form-error`; `.form-fieldset` with a `legend`; `.form-options`, with `.inline`; `label.check`; `input.form-file`; a combo box, `span.combo` holding an `input.form-input[list]` and its `datalist`, its options' `data-combo-keys`, with `data-combo-src` and `data-combo-complete`; a searchable select, `select.form-select[data-combo]` (0.72.0) | `required`, `aria-invalid="true"`, `aria-describedby`, `readonly`, `disabled` |
| Switch | `button.switch[role="switch"]` holding `.switch-track` holding `.switch-thumb`, then the label | `aria-checked` |
| Segmented control | `.seg`, with `.pill`, `.sm`, of `button` or `a`; with `data-seg-menu` and an `aria-label`, a pop-up `.seg-menu` beside it on a phone | `aria-pressed`, `aria-checked` or aria-current |
| Badges and chips | `.badge`, with `.warn`, `.danger`, `.positive`, `.accent`; `.chip`; `.filter-chip` holding `.filter-chip-kind` and `.filter-chip-x` | |
| Card | `.card` holding `.card-title`, `.card-subtitle`, `.card-desc` | |
| Layout | `.vstack`, `.hstack` (with `.align-center`, `.align-end`, `.align-baseline`; `.push-end` on a component), `.auto-grid` (with `--grid-min`, default 224px; `.span-all` on a component); `.gap-0` to `.gap-6` on any of them | |
| Settings panel | `.settings-panel` holding `.card`s, each with its controls, a `.settings-actions` row of buttons and optionally a `p.settings-status[role="status"]`, which takes no room while empty | |
| Key/value table | `table.kv-table` of `th` and `td` rows | |
| Data table | `.data-table-wrap` holding `table.data-table`, with `.stack`; `th[aria-sort]` holding `a` or `button`; `.num`; `.data-table-check`; `tr.data-table-empty`; `td[data-label]` | `aria-sort`; `aria-selected="true"` in a grid, or a checked `.data-table-check` checkbox |
| Notices | `.notice`, with `.positive`, `.warn`, `.danger`, holding `.notice-content` with `.notice-title`, `.notice-body`, `.notice-actions`, and `button.notice-close` | `hidden` once dismissed |
| Toasts | `.toast-region` holding `.toast`, with `.positive`, `.warn`, `.danger`, holding `p.toast-text` and `button.toast-close`; a `.toast`, usually `hidden`, in a window's content or in regions swapped in moves into the region, shown and announced | `data-toast-ms`, `data-toast-sticky` |
| Tabs within a page | `.tabs` holding `.tablist[role=tablist]` of `[role=tab][aria-controls]`, then `[role=tabpanel]` panels; in a dialog, and as the whole of a `.win-body`, they keep the size of their largest panel and reach the edges (0.71.0); `data-tabs-size="largest"` or `"each"` chooses | `aria-selected` |
| Empty and loading | `.empty-state` holding `.empty-state-title`, `.empty-state-body`, `.empty-state-actions`; `.loading[role=status]` holding `.spinner` | |
| Pagination | `nav.pagination` holding `.pagination-summary`, `a.page-link` (with `rel="prev"` or `rel="next"`), `.page-gap` | aria-current `"page"`; `aria-disabled="true"` |
| Dialog | `dialog.dialog` holding `.dialog-title`, `.dialog-body`, `.dialog-actions`; opened by a button with `command="show-modal"` and `commandfor`; head and actions pinned unless `data-dialog-pin="none"` (0.74.0) | `open` |
| Popover | `.popover[popover]`, with `.pointer`, opened by a button with `popovertarget`; optional `.popover-head` holding `.popover-title` and `.popover-close`, and `.popover-actions` (0.74.0) | `role="dialog"` with a name |
| Split button | `.split-btn` holding a `.btn` and a `.menu` whose `.menu-btn` holds only the caret (0.74.0) | an `aria-label` on the menu button |
| Toolbar | `.toolbar[role=toolbar]` of `.toolbar-group[role=group]`s; a control's words in `.toolbar-words` | an `aria-label` on the toolbar and each group |
| Folding toolbar | a `.toolbar` with `data-toolbar-fold`, its groups with `data-toolbar-group`, `data-toolbar-glyph`, `data-toolbar-priority`, `data-toolbar-end`, `data-toolbar-keep`; `data-toolbar-captions="none"` on the toolbar, `data-toolbar-glyph-only` on a control (0.78.0) | a name for every group |
| Command bar | a folding toolbar whose first group has `data-toolbar-menus` and holds a `.menubar-menu` of a `.menubar-glyph` and `.menu`s, each a `.menubar-title.menu-btn` and its `.menu-panel` (0.78.0) | |
| Ribbon | `.ribbon` holding a `.tablist` of `[role=tab][aria-controls]` and the folding `.toolbar`s they control; the script adds `.ribbon-bar`, `.ribbon-toggle` and `.ribbon-menus` (0.78.0) | an `id` to remember its folding, an `aria-label` on the tab list |
| Taskbar | `.win-bar` holding a `nav.win-dock[data-win-dock]`, the page's own buttons on either side, an optional `.status-area` as its tray, and `a.icon-btn` links with `data-win-back`, `data-win-restore` and `data-win-close-all`, empty for PUDL's glyphs or holding a `.glyph`, `svg` or `img` (0.79.0) | an `aria-label` on the dock and each icon link |
| Stepper | `ol.stepper`, with `.vertical`, of `li`, a done one `.done` holding an `a`, the current one `aria-current="step"` (0.74.0) | `aria-label` on the list |
| Progress bar | `progress.progress`, in a `.progress-row` with `.progress-label` and `.progress-value` (0.74.0) | `value`, `max`; none for busy |
| Meter | `meter.meter`, with `.marks`, in a `.meter-row` with `.meter-label` and `.meter-value` (0.74.0) | `min`, `max`, `low`, `high`, `optimum`, `value`; `data-band` set by the script |
| Slider | `input.form-range[type=range]`, in a `.range-row` with an `output[for]` (0.74.0) | `min`, `max`, `step`, `disabled` |
| Number field | `span.number-field` holding `input.form-input[type=number]` (0.74.0) | `min`, `max`, `step`, `required`, `disabled`, `readonly` |
| Password field | `span.password-field` holding `input.form-input[type=password]`, with `data-password-toggle="glyph"` (0.74.0) | `aria-pressed` on the key |
| Figure | `figure.figure` holding `img[width][height][alt]` and `figcaption`, with `.caption-over`, `.plain`, `.contain` (0.74.0) | `data-broken` set by the script |
| Avatar | `.avatar[role=img][aria-label]` with `.sm`, `.lg`, `.xl`, `.tint`, holding initials or `img[alt=""]`; `.avatar-wrap` with `.avatar-status[data-status]` (0.74.0) | `data-status` `online`, `away`, `busy`, `offline` |
| List box | `select.form-select[data-listbox]` with `multiple` or a `size` above 1 (0.74.0) | `required`, `disabled` |
| Token field | `span.combo[data-combo-tokens]` with `data-combo-separator` and `data-combo-max`, holding the combo box's input and datalist (0.74.0) | `required`, `disabled` |
| Date and time fields | `input[type=date][data-date]`, `input[type=time][data-date]`, with `data-date-style` and `data-time-list` (0.74.0) | `min`, `max`, `step`, `required`, `disabled`, `readonly` |
| Menu | `.menu` holding `.menu-btn[popovertarget]` and `.menu-panel[popover]`, whose content is `.md-section-label`, `.md-row` with `.md-item`, `.menu-sep`, `button.menu-action` (with `.danger`), `label.check.menu-check` holding a checkbox, an `.md-filter` and a `.menu-empty` | `data-menu-key`, `data-menu-empty`; `data-filter-menu` on a panel with an id makes a filter menu: a box belonging to a form sends it on change, and after the region swap that causes the panel opens again with focus on that box |
| Master-detail | `.md-layout` holding `.md-toolbar` (with `.md-site-tools`), `.md-chips`, `.md-body` holding `.md-sidebar`, `.md-resize`, `.md-detail[tabindex="0"]`; toolbar parts `.md-filter`, `.md-filter-group`, `.md-filter-go`, `.md-toolbar-spacer`, `.md-toolbar-cmds`, `.md-toolbar-sep`, `.md-chips-clear`; or the list's own parts at the head of the sidebar, a `.md-sidebar-head` first in `.md-sidebar` holding the filter (`.md-filter-group`, alone or in a `form`), a `.md-sidebar-tools` row of filter menus and `.md-chips-clear`, and `.md-chips` (0.82.0); list parts `.md-section-label`, `.md-row` holding `a.md-item` with any number of `.md-meta` lines, which wrap, `.md-grip`; `a.md-back` in the detail | `data-md-pane="detail"` or `"list"`; aria-current on a row's link |
| Windows | `.win-host` holding `.win-layer[data-win-layer][data-win-src]`; `section.win[data-win]` holding `header.win-head` with `.win-title` and `.win-chrome` of `.win-btn[data-win-action]`, then `.win-body`; `nav.win-dock[data-win-dock]`; a list row `.md-row-child[data-win-child]` | `data-win-mode`, `hidden` for minimised, the four `--win-` position properties, `.active` on the window in front; for a zone `--zone-x`, `--zone-y`, `--zone-w` and `--zone-h`, with `--zone-rule-e` and `--zone-rule-s` for its hairlines; for a docked window `data-win-edge` and `--win-dock-size`, and on the layer `--dock-top`, `--dock-bottom`, `--dock-left` and `--dock-right` |
| Title-bar status | `.win-statuses` directly in `.win-head`, after the title/detail and before `.win-chrome`, holding text spans `.win-status`, optionally `.strong` | Inherited foreground, transparent fill and currentColor outline; compacts before statuses truncate the title, and in vertical headers; full text remains in the generated Window status popover and window command. See [WINDOW-STATUS.md](WINDOW-STATUS.md). Applications own text and announcements. |
| Applets | an element with `data-applet`, and optionally `data-applet-page`, `data-applet-fit`, `data-applet-param` | `data-applet-state`; `data-applet-fit` |
| Regions | any element with `data-region` | `aria-busy` while replaced |
| Grid | `table.data-table[role="grid"]` whose rows each hold a link, the first being the row's address | `aria-selected` on rows |
| Tree | `ul.tree` of `li` holding `a`, then optionally a nested `ul` of the same | `aria-expanded` on a node's link when it has children; `aria-current` on the current node's |
| Path bar | `nav.path` (with `.mono`) holding `ol` of `li`, each an `a` or, last, the current place with `aria-current` | `aria-current` |
| Glyph | `.glyph` with `--glyph` set to a glyph token, and `--glyph-size` | |
| Document tabs | `.tablist.doc-tabs[role="tablist"]` of `[role="tab"]` links or buttons, each holding its name, an optional `.doc-tab-dirty` with words for assistive technology, and an optional `.doc-tab-close[aria-hidden="true"]` | `aria-selected` |
| Code | `pre.code` for a block to read, with `tabindex="0"` when it may scroll; `.code-surface` for an editor's surface; `pre[data-code-actions]`, with `data-code-filename`, which `pudl-code.js` wraps in `.code-block` with a `.code-head` holding `.code-lang` and `.code-actions` | |
| Visually hidden | `.visually-hidden`, words for assistive technology alone | |
| Splitter | `.split` (with `.stacked`) holding `.split-pane`, `.split-handle`, `.split-pane`; the first pane's size in `--split-a` on the split, or the property the handle's `data-split-prop` names; `data-split-min`, `data-split-max`, `data-split-valuetext` on the handle | |
| Drop target | `.drop-zone` holding an optional `.drop-hint`; any element as a target | `data-drop-over` on a zone, `data-drop-target` on an item, set by the host while something is dragged over it |
| Numbers and time | `.num`, `time`, `data` in prose take tabular figures | |

The `hidden` attribute always hides, on any component, except `hidden="until-found"`.

## Attributes that scripts read

| Attribute | On | Read by | Meaning |
|---|---|---|---|
| `data-theme`, `data-theme-pref` | `<html>` | the stylesheet, a settings control | The theme in force, and the reader's preference |
| `data-win-layer`, `data-win-src` | the window layer | `pudl-windows.js` | The layer, and where window markup comes from (`{key}`, or `#` for a template); fetched markup must be `text/html` from the page's origin; a numbered key `name-2` to `name-9` with no template of its own takes `name`'s, numbered |
| `data-win-default` | the window layer | `pudl-windows.js` | The keys of the windows an address naming no windows opens |
| `data-win-required` | the window layer | `pudl-windows.js` | Keys separated by spaces or commas; always opened, protected against closing, replacement and re-keying, and ordered first in shared docks |
| `data-win-dock-tabs`, `data-win-dock-rail-width` | the window layer | `pudl-windows.js` | Opt into shared side docks, with automatic icon rails at or below the given width, default 960 CSS pixels |
| `data-win-dock-splits` | a shared-dock window layer | `pudl-windows.js`, `pudl-windows.css` | Opt into independent tabbed panes along each dock's long axis; top and bottom require `data-win-dock-tabs="all"`. See [SHARED-DOCKS.md](SHARED-DOCKS.md#split-panes). |
| `data-win-resize-mode` | a window layer or window | `pudl-windows.js` | `outline` previews pointer resizing without reflowing window content until release; `live` is the default. A window overrides the layer for its frame and outer dock edge; shared pane and grid dividers use the layer. Escape or pointer cancellation discards an outline, and release commits one history entry. Keyboard resizing remains immediate. |
| `data-dock-pane`, `data-win-dock-pane`, `.win-dock-splitter`, `.win-dock-drop` | a shared dock strip, a window, a divider, a placement preview | `pudl-windows.js`, `pudl-windows.css` | Derived pane identity and geometry, accessible internal resizing and drag preview; generated presentation hooks, also available for server rendering |
| `data-win-glyph`, `data-win-attention`, `data-win-running`, `data-win-progress` | a window | `pudl-windows.js` | Glyph token suffix, positive integer attention count, boolean running mark, and percentage from 0 to 100; reflected in side tabs, rails and taskbar |
| `data-win-params` | the window layer | `pudl-windows.js`, `pudl-regions.js` | Prefixes, space- or comma-separated, of the page's window-scoped parameters: `<prefix>.<key>` belongs to window `<key>`, travels with the windows through region swaps and history, follows the window when it is re-keyed, and is dropped when it closes; `p` is PUDL's and is ignored |
| `data-win-pane="off"` | the window layer | `pudl-windows.js` | Leave the master-detail layout's `data-md-pane` to the server |
| `data-win`, `data-win-parent`, `data-win-mode` | a window | `pudl-windows.js` | Its key, its parent's key, its starting mode |
| `data-win-href` | a window | `pudl-windows.js`, `pudl-menubar.js` | The host's crafted share URL; without it, Copy the link uses the title bar's page link; an empty or invalid value disables sharing |
| `data-win-open`, `data-win-replace` | a link | `pudl-windows.js` | Open that key's window, in place of this one |
| `data-win-menu` | the window layer | `pudl-windows.js` | Give every window a window menu |
| `data-win-size` | a window | `pudl-windows.js`, `pudl-windows.css`, `pudl-applets.js` | `content` for a window sized by its content, or `user`, the default |
| `data-win-narrow`, `data-win-narrow-width` | a window, the layer | `pudl-windows.js` | `maximized` opts a window into restricted presentation at or below the layer width in CSS pixels, default 640; the URL placement is preserved; content-sized windows ignore the option |
| `data-win-chrome` | a window | `pudl-windows.js`, `pudl-windows.css` | `compact` retains the title and menu and hides secondary chrome; `--win-button-size` and `--win-glyph-size` set independent sizes |
| `data-toolbar-stage` | a folding toolbar's group | `pudl.css` | Set by `pudl-toolbar.js`: 1 to 5, how far the group has folded |
| `data-ribbon-folded` | a `.ribbon` | `pudl.css`, `pudl-toolbar.js` | Present while the ribbon is folded into menus; an author may set it for the first visit, before the reader has chosen |
| `data-ribbon-toggle-text` | a `.ribbon` | `pudl-toolbar.js` | The words of Show as ribbon |
| `data-split-pane` | a `.split` | `pudl-split.js`, `pudl.css` | `first` or `second` shows one mounted pane and preserves the split value; removal restores split presentation; `--split-target-size` and `--split-rule-size` set track and line sizes |
| `data-win-min`, `data-win-max` | a window | `pudl-windows.js` | Its smallest and largest width and height, `w,h` in pixels |
| `data-win-action` | a window button | `pudl-windows.js` | `menu`, `page`, `minimize`, `maximize`, `dock` or `close` |
| `data-menubar`, `data-menubar-source`, `data-menubar-if`, `data-menubar-key`, `data-menubar-text-*` | the menu bar, its hidden source list, a title, the bar, the bar | `pudl-menubar.js` | The menu bar; the host menu as nested lists; `windows` to show a title only on a page of windows; the jump key, `m` unless set, none if empty; the bar's own words (`menu`, `back`, `page`, `copy-link`, `print`, `close`, `actions`, `active-window`, `minimize-all`, `restore-all`, `close-all`, `open-windows`) |
| `data-menubar-id` | a source-list title | `pudl-menubar.js` | Stable site menu ID; standard IDs are `site`, `go`, `applets`, `view`, `window`, and `help`. The first title is always the identity; standard menus are ordered, and duplicate IDs are rejected. Empty slots appear when populated. |
| `data-menubar-windows` | a title with ID `window` | `pudl-menubar.js` | Append generated active-window layout commands, bulk actions, and the open-window list, using the window module's capabilities. |
| `data-shortcut` | a link or button in a menu bar's list | `pudl-menubar.js` | Its command's shortcut, as `Mod+Shift+L` |
| `data-page-menu` | a hidden `nav` in an article | `pudl-menubar.js` | The article's front menu, as nested lists of links |
| `data-page-print` | the article's `nav[data-page-menu]` | `pudl-menubar.js` | Offer Print in the article's own menu, which a host does once its printed article is worth having |
| `data-menubar-pins` | a hidden list in the menu bar | `pudl-menubar.js` | The pins group, between the host menu and the front menu: its first item the Pins menu of the host's commands, each later item a pin, a link whose content is its icon and title. The bar redraws when the list changes. Adds `pins` and `items` to the bar's own words. |
| `data-applet-text-commands`, `-no-commands` | an applet mount outside a window | `pudl-applets.js` | The label of its Commands button, and the text of an empty menu |
| `data-win-dock`, `data-win-tab`, `data-win-back`, `data-win-restore` | the dock, a dock tab or row, a minimise-all or back link, a restore-all link | `pudl-windows.js` | The script keeps the last two's `href` current and marks them `aria-disabled` when they would change nothing |
| `data-win-close-all` | a link | `pudl-windows.js`, `pudl-windows.css` | Closes every window the reader may close, each as its own Close would; its `href` and `aria-disabled` are kept current (0.79.0, stable in 0.80.0) |
| `data-win-tab-menu` | the layer or the dock | `pudl-windows.js` | `off` turns off a dock tab's right-click window menu (0.79.0) |
| `data-win-bar-edge`, `data-win-bar-menu` | a `.win-bar` | `pudl-windows.css`, `pudl-windows.js` | `top` for a taskbar above the window area; `off` turns off the bar's own right-click menu (0.79.0, stable in 0.80.0) |
| `data-win-bar-compact`, `data-win-tab-over`, `.win-bar-more` | a `.win-bar`, a dock button, a button after the dock | `pudl-windows.js`, `pudl-windows.css` | Set by the script as the bar runs short of room: the tray shows glyphs alone; the button has left the dock; the More button that lists those that left (0.81.2) |
| `data-win-text-more-windows`, `data-win-text-more-windows-name` | the layer | `pudl-windows.js` | The More button's words, `{n} more`, and its name, `{n} more windows` (0.81.2) |
| `data-menubar-ribbon`, `data-menubar-ribbon-slot`, `data-menubar-ribbon-captions`, `data-menubar-ribbon-words`, `data-menubar-ribbon-fold-order` | the menu bar, an element to hold Show as ribbon, the bar, the bar, the bar | `pudl-menubar.js`, `pudl.css` | The bar may unfold into a ribbon, with Show as ribbon at the topbar's end or in the slot; the row's captions, `none` by default; keep the toggle's words; the toggle's place in the topbar's fold order. Adds `ribbon` to the bar's own words (0.79.0, stable in 0.80.0) |
| `data-menu-glyph` | a title's `li` in the menu source | `pudl-menubar.js` | A glyph's name, shown before the title's words; such a title folds to its glyph first (0.79.0, stable in 0.80.0) |
| `data-fold-order` | a child of the topbar | `pudl-menubar.js` | Its place in the topbar's fold order, a number, lower giving way first, or `none`; Show as ribbon is 100, folding toolbars 200 and the menu bar 300 unless set (0.79.0, stable in 0.80.0) |
| `data-applet-resident` | an applet mount | `pudl-applets.js`, `pudl-menubar.js` | The applet is resident: its menus stand in the menu bar after the site's, whatever is in front, and its shortcuts work anywhere (0.79.0, preview) |
| `data-toolbar-captioned` | a folding toolbar's group | `pudl.css` | Shows the group's caption when the toolbar has `data-toolbar-captions="none"` (0.79.0, stable in 0.80.0) |
| `data-toolbar-ribbon` | a toolbar | `pudl.css` | `hide` hides it while the menu bar shows as a ribbon, for a toolbar that repeats the ribbon's commands (0.80.0) |
| `data-menubar-ribbon-on` | the root element | `pudl-menubar.js` | Set while the menu bar shows as a ribbon, for a page to style by (0.80.0) |
| `.menubar-ribbon-tabs`, `.ribbon-tabs`, `data-ribbon-tabs-text` | the generated ribbon chooser buttons, a standalone `.ribbon` | `pudl-menubar.js`, `pudl-toolbar.js`, `pudl-menu.js` | The chooser appears when menu-bar tab titles fold to glyphs or standalone tabs overflow; it stays hidden when all titles fit. A labeled menu lists tabs by full title, marks the selected tab and selects it on activation. Down Arrow opens it; Escape returns focus. Widening closes an obsolete chooser and returns its focus to the selected tab. Menu bars localize with `data-menubar-text-ribbon-tabs`; standalone ribbons use `data-ribbon-tabs-text`. Tabs retain full-title hover and focus tips. |
| `--win-bar-clear` | the root element | `pudl-windows.js`, `pudl.css` | The room a taskbar along the window's foot takes, which toasts stand above; `0px` with none (0.80.0) |
| `--menubar-title-max` | any ancestor of the menu bar | `pudl.css` | How long a front title runs before its ellipsis, `12em` unless set (0.80.0) |
| `data-win-text-maximize`, `-restore`, `-minimized`, `-head`, `-dock`, `-undock`, `-dock-menu`, `-dock-top`, `-dock-bottom`, `-dock-left`, `-dock-right`, `-collapse`, `-expand`, `-menu`, `-page`, `-minimize`, `-reset`, `-reset-position`, `-close`, `-snap`, `-snap-menu`, `-layout-<name>`, `-zone-<name>` | the window layer | `pudl-windows.js` | The page's own words, with `{title}` |
| `data-win-text-copy-link`, `data-win-text-copy-link-manual` | the window layer | `pudl-windows.js` | The share command label and manual-copy prompt |
| `data-win-edge` | a docked window | the stylesheet, `pudl-windows.js` | The edge it shows on, `top`, `bottom`, `left` or `right`, which the server renders and the script keeps |
| `data-menu-key`, `data-menu-empty` | a menu panel | `pudl-menu.js` | Its summoning key, its "nothing matches" text |
| `data-menu-anchor` | a menu panel with no button | `pudl-menu.js` | The id of the element a script opens it from, which it is placed against |
| `data-menu-placement` | a menu panel | `pudl-menu.js` | `beside` places a submenu beside its anchor, using the same visible viewport bounds and overflow cues |
| `data-menu-for` | the element a context menu acts on | the stylesheet | Set by `pudl-menu.js` to the open menu's id where the page marks the element, and removed when the menu closes; the element keeps its pointed-at look (0.76.0) |
| `data-row-actions` | a button, the last thing in a row of a list, a tree or a table | `pudl-menu.js`, `pudl.css` | The row's actions button: opens the row's context menu against itself, shows only where the reader is, and is set out of the Tab order and hidden from assistive technology; empty, it shows the `more` glyph (0.81.0) |
| `data-row-hot`, `data-row-focus` | a row holding a `data-row-actions` button | `pudl.css` | Set by `pudl-menu.js` on the row under a mouse or pen, and on the row with focus in it (0.81.0) |
| `data-md-pane` | `.md-layout` | the stylesheet, `pudl-windows.js` | Which pane a narrow layout shows |
| `data-md-side` | `.md-layout` | the stylesheet, `pudl-md.js` | `end` puts the sidebar at the end edge of the writing direction, mirrored; `start`, the default, at the start |
| `data-md-peek` | a persistent `.md-layout` | `pudl-md.js`, the stylesheet | Let the reader peek at the collapsed sidebar by resting the pointer on, or keyboard-focusing, its handle; PUDL marks an open peek with `data-md-peek-open` and `--md-peek-shift`, which are its own |
| `data-md-valuetext` | `.md-resize` | `pudl-md.js` | The divider's spoken width, with `{n}` |
| `data-region` | any element | `pudl-regions.js` | A region's name |
| `data-region-link` | a link, or an element holding links | `pudl-regions.js` | Links outside every region that swap regions as if inside one |
| `data-applet`, `data-applet-page` | an applet mount | `pudl-applets.js` | The applet's name, and a page on this origin overriding the registry's; only `pudlApplets.define()` names the script and stylesheet |
| `data-applet-fit` | an applet mount | `pudl-applets.js`, the applet's stylesheet | `fill` or `flow`; the runtime sets it when absent |
| `data-applet-param` | an applet mount outside a window | `pudl-applets.js`, `pudl-regions.js` | The page query parameter that keeps the applet's state |
| `data-applet-preset` | a link | `pudl-applets.js` | The applet whose running instance the link's state is handed to |
| `data-toast-ms`, `data-toast-sticky`, `data-toast-close-label` | a toast, the region | `pudl-toast.js` | How long, whether to stay, the dismiss label |
| `data-tooltip` | any element | `pudl-tooltip.js` | A tooltip's text |
| `data-label` | a data table cell | the stylesheet | The label shown when rows stack |

## Events

Each is a `CustomEvent`. The ones marked "bubbles" can be heard on the document.

| Event | Fired on | Detail | When |
|---|---|---|---|
| `pudl:theme-change` | the document | `preference`, `theme` | After the theme changes, in this tab or another |
| `pudl:window-place` | the window layer | `key`, `parent`, `opener`, and `placement` for a listener to set | Before a window opens with no placement in the URL |
| `pudl:window-open` | the window, bubbles | | When a window's content is in the page |
| `pudl:window-closing` | the window, and each child closing with it, bubbles, cancelable | `key`, `reason`: `button`, `key`, `script` or `parent` | Before a reader's or a script's close; cancelling it keeps the window |
| `pudl:window-close` | the window, bubbles | `key`, `reason`: `button`, `key`, `script`, `parent`, `replace` or `address` | Just before a window leaves the page, by any route |
| `pudl:window-rekey` | the window, bubbles | `oldKey`, `key` | After `pudlWindows.rekey()` has given the window its new key |
| `pudl:pins-menu` | the menu bar's pins list, bubbles | none | As the Pins menu, or the collapsed bar's menu, opens, before the list is read, so the host can set its pinning commands for what is in front |
| `pudl:window-menu` | the window, bubbles | `key`, and `add(label, run, { checked, disabled })` | As the window menu opens, for content to add its commands |
| `pudl:window-link-copy` | the window, bubbles | `key`, `href`, `ok` | After a share URL copy attempt; `ok` is true only for a successful automatic clipboard write; no event when no URL is usable |
| `pudl:windows-change` | the window layer, bubbles | the whole state: `open`, `top`, `min`, `place` | After every change to the windows |
| `pudl:windows-policy` | the window layer, bubbles | none | After responsive presentation changes; the URL state is unchanged |
| `pudl:regions-swap` | the document | `url`, `regions` | After regions are swapped |
| `pudl:tree-toggle` | a tree node's link, bubbles | `open` | After a node opens or closes |
| `pudl:split` | a splitter's handle, bubbles | `size` in pixels, or null after a reset | When a change to the split ends |
| `pudl:toolbar-fit` | a folding toolbar, bubbles | | When it has folded to its row (0.69.1) |
| `pudl:ribbon-fold` | a `.ribbon`, bubbles | `folded` | When the ribbon folds into menus or shows again (0.78.0) |
| `pudl:code-copy`, `pudl:code-download` | the code block's `pre`, bubbles | `ok` for a copy, `name` for a download | After each action |
| `pudl:tab-close` | a document tab, bubbles | | When its close button is pressed, or Delete on it; the host closes it or not |
| `pudl:contextmenu` | what was under the pointer or has focus, bubbles, cancelable | `add(rows)`, `mark(element)`, `anchor(element)`, `count()`, `x`, `y`, `keyboard`, `target` | On a right-click, Shift+F10 or the Menu key; rows added open a context menu in place of the browser's (0.74.0), and `mark` says which element it acts on (0.76.0); `anchor` opens the menu against an element rather than at the pointer, `count` says how many rows nearer handlers have added, and `preventDefault()` stops handlers further out (0.79.0) |
| `pudl:menubar-ribbon` | the menu bar, bubbles | `ribbon` | When the bar unfolds into a ribbon or folds back (0.79.0, stable in 0.80.0) |
| `pudl:token-check` | a token field's input, bubbles | `value`, `refuse(message)`, `replace(value)` | Before each value is added, typed, pasted, chosen or given by a script; `refuse` turns it away with a message, `replace` adds another in its place, and repeats are found after it (0.80.0) |
| `pudl:token-refused` | a token field's input, bubbles | `refused` (a list of `{ value, message }`), `source` (`reader` or `script`) | After values were refused (0.80.0) |
| `pudl:row-select` | a grid's row, bubbles | | After the selection moves to the row |
| `pudl:row-open` | a grid's row, bubbles | | When a row with no link is opened, by Enter or a double-click |
| `pudl:md-resize` | the `.md-layout`, bubbles | `width`, `reset` | When a sidebar resize ends |
| `pudl:md-peek` | the `.md-layout`, bubbles | `open` | As a peek at a collapsed sidebar opens and closes |
| `pudl:applet-state` | the applet's mount, bubbles | `name`, `instance`, `host`, `fit`, `param`, and `state` for a listener to set; a request's state wins over it | Just before `init`; what `state` holds then is `opts.state` |
| `pudl:applet-change` | the applet's mount, bubbles | `state`, a string or null | When the applet calls `opts.changed()` |

## Script functions

| Function | From | Does |
|---|---|---|
| `pudlSetTheme(p)`, `pudlThemePreference()`, `pudlToggleTheme()` | `pudl-theme.js` | Set, read and toggle the reader's theme |
| `pudlWindows.open(key)`, `.replace(oldKey, key)`, `.raise(key)`, `.minimize(key)`, `.minimizeAll()`, `.restoreAll()`, `.dock(key, edge or null)`, `.snap(key, zone or null)`, `.retitle(key, title)`, `.close(key)`, `.state()` | `pudl-windows.js` | What the matching link or button does, URL and history included |
| `pudlWindows.closeAll()` | `pudl-windows.js` | Close every window the reader may close, each as a script's close would, so one that refuses stays (0.79.0, stable in 0.80.0) |
| `pudlWindows.shareURL(key)` | `pudl-windows.js` | The window's absolute HTTP(S) share URL, or null; omitted key means the visible front window; resolves against the document base and preserves the host's query and fragment |
| `pudlWindows.effectivePlacement(key)` | `pudl-windows.js` | Detached derived placement after responsive policy, or null for an unknown key; `state()` retains canonical URL placement |
| `pudlWindows.dockMode(edge, mode)` | `pudl-windows.js` | Set a shared side dock's mode: edge is `left` or `right`, mode is `auto`, `open` or `rail`; updates the URL and emits `pudl:windows-change` |
| `pudlWindows.dock(key, edge, { group, position })` | `pudl-windows.js` | Place a window in a split-enabled dock, adding a `tab` or splitting `before` or `after` a group. The unsplit group is `main`. Invalid destinations change nothing. Existing two-argument calls retain their behavior. |
| `pudlWindows.dockArrange(edge, action, groupId)` | `pudl-windows.js` | `merge`, `equalize`, or `swap` with the next pane; swap requires a group ID. Preserves mounted window content and records history. |
| `pudlWindows.dockRatio(edge, splitId, ratio)` | `pudl-windows.js` | Resize a split to a fraction within its permitted bounds |
| `pudlWindows.dockPresentation(edge)` | `pudl-windows.js` | Effective dock presentation, `single`, `split`, `collapsed`, or null for an unshared edge; canonical state remains in `state().docks` |
| `pudlWindows.copyLink(key)` | `pudl-windows.js` | Copies the share URL without changing workspace state; returns a promise of automatic-copy success; offers a manual-copy prompt on clipboard failure and returns false |
| `pudlWindows.rekey(oldKey, key, push)` | `pudl-windows.js` | Give an open window a new key and keep its element, placement, place in the stack, focus and running content, with its window-scoped parameters; a new history entry unless `push` is `false`; returns `false`, changing nothing, onto a key that is open or loading, and to its own key brings the window forward. Use it where the window stays and only its key changes, such as a reader turning to another story; use `replace()` where another window takes its place |
| `pudlApplets.define(name, { src, css, page, ver, handles, instances })` | `pudl-applets.js` | Name an applet's files once, for mounts that carry only the name, and the requests it serves: `handles: { verb: { param, kinds, extra, reuse } }`, with up to `instances` windows of it, at most 9 |
| `pudlApplets.request(verb, { path, kind, … }, from)`, `.can(verb, kind)` | `pudl-applets.js` | Ask for a request without naming an applet; `request` returns false when nothing serves it |
| `pudlApplets.menuSourceIn(scope, outside)` | `pudl-applets.js` | The first running applet in `scope` offering `menus()` or `commands()`, for a menu bar |
| `pudlApplets.commandsIn(scope)` | `pudl-applets.js` | The commands of the applets running inside `scope`, as the window menu shows them |
| `pudlApplets.register(name, { init })`, `.boot(scope)`, `.destroy(scope)` | `pudl-applets.js` | The applet contract: `init(root, opts)` returns `{ destroy }` and optionally `state()`, `setState(s)`, `commands()`, which returns `[{ label, run, checked, disabled }]`, and `menus()`, which returns `{ titles, into }` for a menu bar, a title `{ label, items, id, mnemonic, glyph }`, with `opts.host`, `opts.fit`, `opts.instance`, `opts.ownsUrl`, `opts.pageUrl`, `opts.state`, `opts.changed(s)` |
| `pudlToast(message, { kind, ms, sticky })` | `pudl-toast.js` | Raise a toast |
| `pudlTabs.enhance()` | `pudl-tabs.js` | Enhance tabs added to the page by other means |
| `pudlToolbar.enhance(root)`, `pudlToolbar.fit(bar)` | `pudl-toolbar.js` | Enhance toolbars, command bars and ribbons added by other means; fold a toolbar now |
| `pudlCombo.enhance(root)`, `pudlCombo.refresh(select)` | `pudl-combo.js` | Take in combo boxes and searchable selects added later; show a searchable select's value after a script has set it |
| `pudlCombo.tokens(input)` | `pudl-combo.js` | A token field's values, given its input: `.values()`, `.set(list)`, `.add(value)` and `.remove(value)`, each change checked as the reader's is, firing no change event; `add` and `remove` answer whether they changed anything, `set` whether nothing was refused; null for any other element (0.80.0) |
| `pudlTree.enhance(tree)` | `pudl-tree.js` | Take in nodes added to a tree by other means |
| `pudlGrid.enhance(table)` | `pudl-grid.js` | Take in rows added to a grid by other means |
| `pudlWindows.menuCommands(key)` | `pudl-windows.js` | Fresh standard command descriptors for a window, or the visible front window when omitted; missing windows return `[]`. Each has `id`, `label`, and `run` or nested `items`, with optional `checked`, `disabled`, or `danger`. Callbacks bind to the original element and recheck capabilities; applet commands and extension hooks are excluded. IDs and generated-menu rules are listed in the migration guide. |
| `pudlMenubar.refresh()` | `pudl-menubar.js` | Rebuild the menu bar after a change the script did not see |
| `pudlNative.attach(topbar, options)` | `pudl-native.js` | Return a native window controller with `update(snapshot)`, `run(action)`, `focusMenu()` and `destroy()`; [NATIVE-WINDOWS.md](NATIVE-WINDOWS.md) defines callbacks, state, focus/error events and native integration boundaries. |
| `pudlMenubar.focus({ returnTo })` | `pudl-menubar.js` | Focus the first available title, returning a boolean; defaults to the previous active element. A supplied return target must be a usable element in this document outside the menu. Repeated entry retains the original excursion. Actual restoration emits bubbling `pudl:menubar-return-focus` on the bar with `detail.target` and `detail.reason` (`escape` or `command`), before a command runs. Hosts own restoration within frames. |
| `pudlAnnotations.enhance(root)`, `.refresh()`, `.destroy(root)`, `.setRange(container, note, range)` | `pudl-annotations.js` | Optional scoped selection actions and aligned margin notes; see [ANNOTATIONS.md](ANNOTATIONS.md) for markup, event payloads and lifecycle. |
| `pudlMenubar.ribbon(on)` | `pudl-menubar.js` | Unfold the bar into a ribbon or fold it back, remembering the choice; with no argument, whether it is unfolded (0.79.0, stable in 0.80.0) |
| `pudlApplets.residentSources()` | `pudl-applets.js` | The running resident applets that offer menus, in document order (0.79.0, preview) |
| `pudlMenu.place(panel)` | `pudl-menu.js` | Place an open panel at once and show it, for a script that moves focus into it in the same moment |
| `pudlMenu.refresh()` | `pudl-menu.js` | Build the pop-up button for segmented controls with `data-seg-menu` added by other means |
| `pudlMenu.openAt(x, y, rows, { owner, label, for })`, `pudlMenu.closeContext()` | `pudl-menu.js` | Open a context menu at a point from a script, and close it (0.74.0); `for` is the element it acts on (0.76.0) |
| `pudlFields.enhance(root)`, `pudlFields.refresh(el)` | `pudl-fields.js` | Take in fields added later; show a value a script has set (0.74.0) |
| `pudlListbox.enhance(root)`, `pudlListbox.refresh(select)` | `pudl-listbox.js` | Take in list boxes added later; show a choice a script has set (0.74.0) |
| `pudlDate.enhance(root)`, `pudlDate.refresh(input)` | `pudl-date.js` | Take in date and time fields added later; show a value a script has set (0.74.0) |
| `pudlSplit.refresh()` | `pudl-split.js` | Bring the handles' values and limits up to date after a change the script did not see |
| `pudlCode.enhance(scope or pre)`, `.names`, `.extensions`, `.words` | `pudl-code.js` | Take in code blocks added by other means; the maps and words a project extends |
| `pudlRegions.refresh()` | `pudl-regions.js` | Carry the live windows into region links a script has rendered |
| `pudlRegions.reload()` | `pudl-regions.js` | Fetch the current address again, past any cache, and swap its regions in place with no new history entry; resolves `true` once swapped, or `false` if a navigation started meanwhile superseded it; rejects, leaving the regions as they were and never navigating, if the request fails or the page has other regions |

## Addresses

**Windows.** The parameters `open` (keys, comma-separated, in opening order), `top` (one key, which may name a minimised window after minimise-all, when no window is active), `min` (keys) and `p.<key>=<mode>:<x>,<y>,<w>,<h>` describe the windows, alongside the page's own parameters. A key is letters, digits, `-` and `_`. The mode is `floating`, `maximized`, `left`, `right`, `zone`, `dock-top`, `dock-bottom`, `dock-left` or `dock-right`. A docked placement adds a fifth number, its strip's size as a fraction of the layer, and a zone adds four, its rectangle's `x`, `y`, `w` and `h` as fractions of the inner area, which a reader moves to the nearest sixths and reads as `left`, `right` or `maximized` when it is a half or the whole; the four numbers are fractions of the inner area the docks leave, from 0 to 1, with at most three decimal places, and are the floating geometry to restore to. A server renders the windows these name, and ignores what it cannot parse. An address with no `open` parameter opens the layer's default windows, if it names any; an address with `open`, empty or not, opens exactly what it names.

**Regions.** A soft navigation fetches the same address a bookmark would. It is made by a link inside a region or marked with `data-region-link`, a collapsed segmented control's `.seg-choice` standing for such a link, or a GET form inside a region. It swaps when the answering page is `text/html` from the page's own origin, with no redirect to another, and has a region of every name the current page has and the same window layer source; otherwise the browser navigates. A region that is sometimes empty must still be rendered.

**Applets.** A mount outside a window with `data-applet-param="name"` has its applet's state under `name` in the page's query, replaced rather than pushed as it changes. Regions carry that parameter from address to address like the windows' parameters, and a change in it alone fetches nothing. The applet owns the address itself only on its own page: `ownsUrl` is true when the mount is outside a window, has no `data-applet-param`, and its page, from `data-applet-page` or the registry, is this page's path, ignoring an index file, an `.html` extension and a trailing slash.

A link with `data-applet-preset` whose click an instance takes is handled as the link: its state goes to `setState()`, and a mount that keeps its state in the address gets it there as a new history entry.

**Everything else.** Sorting, filtering, paging, the record in view and the panel chosen in a set of tabs are addresses: query parameters for the first four, the fragment for the last. What is momentary, such as an open menu or a tooltip, is not.

## Internal

These are how PUDL works today and may change in any release: the classes scripts add for their own use (`.placing`, `.sheet`, `.dragging`, `.tabs-ready`, `.leaving`, `.minimized`, `.win-rh`, `.win-ghost`, `.win-moving`, `.win-inner`, `.win-collapsed`, `.tooltip`, `.tree-ready`, `.tree-toggle`, `.tree-spacer`), `data-toast-armed`, `data-edge`, the custom properties not listed above (among them `--ctl-h`, `--notice-color`, `--badge-color`, `--glyph` and `--glyph-size`), the popover used for tooltips, the order of rules in the stylesheets, and anything a script does that no event, function or attribute above describes.

## Names already replaced

These work until 2.0: `--pr` (now `--positive`), `.badge.pr` (`.badge.positive`), `.fc-kind` (`.filter-chip-kind`), `.active` on section tabs, segments and list rows (the ARIA attributes above), and `.dialog-backdrop` shown by a project's script (`dialog.dialog`).

One name was removed outright before 1.0, for security rather than replaced: `data-applet-src` and `data-applet-css` on an applet mount, removed in 0.23.0, whose files `pudlApplets.define()` now names.

## Menu ownership and routing

Applet `menus()` title descriptors accept `id`. The first title is the identity; `file` and `edit` identify standard working menus and order them before domain menus. Reserved site IDs cannot be used by applet working menus. Duplicate working-menu IDs are diagnosed and omitted. Explicit menu definitions remain responsible for semantic command placement.

`into` keys resolve by stable site ID first and exact displayed label second. Only `go`, `view`, and `help` accept applet contributions, under their owner's heading. Missing or disallowed destinations are diagnosed and omitted. English standard labels are recognized when an ID is absent. Contributed commands retain applet shortcut scope, including inside submenus. An invalidated active source closes its open menu; stale commands cannot execute against a removed or substituted source.

Legacy `commands()` results appear under Actions beside a generated identity menu. Generated article menus have no File menu since 0.49.0; their identity menu uses Copy link to this content and Close window, and holds Print, after Copy link, only when the page menu carries `data-page-print`. Existing translation overrides continue to apply. See the [migration guide](MENU-BAR-MIGRATION.md) for all changed defaults and stable window command IDs.

The [persistent sidebar contract](PERSISTENT-SIDEBAR.md) defines `data-md-persistent`, sizing and translation attributes, `data-md-action` commands, `pudlMd`, and the `pudl:md-request` and `pudl:md-change` events introduced in 0.43.0. Its derived attributes and CSS properties belong to PUDL.
