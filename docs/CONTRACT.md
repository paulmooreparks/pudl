# The PUDL contract

This document lists everything a project may rely on in PUDL. From 1.0 on, nothing listed here changes except in a new major version, and anything not listed is internal and may change in any release. The README explains how to use each part; this document says what is promised.

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
| `pudl-menu.js` | `pudl.css` | Menu placement, arrow keys, filtering, keys that summon menus |
| `pudl-applets.js` | | The applet runtime; works with or without windows |
| `pudl-regions.js` | | Swapping regions on navigation |
| `pudl-md.js` | `pudl.css` | Resizing the master-detail sidebar |
| `pudl-dialog.js` | | Dialog command buttons for browsers that lack them |
| `pudl-toast.js` | `pudl.css` | Toasts and dismissing notices |
| `pudl-tabs.js` | `pudl.css` | Tabs within a page |
| `pudl-tooltip.js` | `pudl.css` | Tooltips on glyph-only controls |

## Tokens

**A theme may set these**, on `:root` and on `[data-theme="dark"]`, within the rules in the README's "What a project may change":

- Page and text: `--bg`, `--surface`, `--surface-alt`, `--text`, `--text-muted`, `--border`
- Accent and status: `--accent`, `--accent-hover`, `--on-accent`, `--warn`, `--danger`, `--danger-hover`, `--positive`
- Lighting: `--light`, `--shade`, `--lit`, `--depth`
- Topbar: `--tb-bg`, `--tb-fg`, `--tb-link-hover`
- Fonts: `--font`, `--font-display`, `--mono`
- Adjustments with defaults derived from the above: `--dialog-bg`, `--section-current-bg`, `--win-active-bg`, `--win-active-fg`, `--win-active-border`, `--win-active-shadow`
- Layout: `--md-sidebar-w` and `--md-sidebar-min` on a `.md-layout`

**A project may read these** in its own styles but does not set them: the type scale `--text-2xs` to `--text-3xl`; the spacing grid `--space-1` to `--space-6`; `--radius`, `--radius-sm`, `--radius-pill`; the surface treatments `--input-bg`, `--raise-top`, `--raise-grad`, `--raise-grad-hover`, `--raise-active-bg`, `--raise-border`, `--raise-border-hover`, `--raise-shadow`, `--raise-active-shadow`, `--entry-shadow`, `--recess-bg`, `--recess-shadow`, `--shadow-card`, `--focus-ring` and `--focus-ring-danger`; and the glyphs `--glyph-back`, `--glyph-branch`, `--glyph-caret`, `--glyph-check`, `--glyph-circle`, `--glyph-close`, `--glyph-diamond`, `--glyph-empty`, `--glyph-info`, `--glyph-maximize`, `--glyph-minimize`, `--glyph-open`, `--glyph-restore`, `--glyph-ring`, `--glyph-search`, `--glyph-sort`, `--glyph-sort-down`, `--glyph-sort-up`, `--glyph-square`, `--glyph-stop`, `--glyph-triangle` and `--glyph-warning`, which are SVG masks to be filled with a colour. Drawing a project's own control from these tokens keeps it in the grammar.

Every other custom property is internal.

## Components

Each row is a component, the markup it expects and the attributes that carry its state. "Aria-current" means any `aria-current` value but `"false"`.

| Component | Markup | State |
|---|---|---|
| Topbar | `header.topbar` holding `a.brand`, `.topbar-chrome` with `a.topbar-pill`, `button.theme-toggle` | |
| Section tabs | `nav.app-section-bar` of `a.section-tab` | aria-current on the current tab: `"page"` for the section's page, `"true"` for a page inside it |
| Buttons | `.btn`, with `.btn-primary`, `.btn-danger`, `.btn-sm`; `.icon-btn`, with `.danger`; `.link` and `.link-muted` on a button or link | `disabled`; `aria-pressed="true"` latches a `.btn` |
| Form fields | `.form-group` holding `label.form-label`, `.form-input`, `.form-select` or `.form-textarea`, `.form-help`, `.form-error`; `.form-fieldset` with a `legend`; `.form-options`, with `.inline`; `label.check`; `input.form-file` | `required`, `aria-invalid="true"`, `aria-describedby`, `readonly`, `disabled` |
| Switch | `button.switch[role="switch"]` holding `.switch-track` holding `.switch-thumb`, then the label | `aria-checked` |
| Segmented control | `.seg`, with `.pill`, `.sm`, of `button` or `a` | `aria-pressed`, `aria-checked` or aria-current |
| Badges and chips | `.badge`, with `.warn`, `.danger`, `.positive`, `.accent`; `.chip`; `.filter-chip` holding `.filter-chip-kind` and `.filter-chip-x` | |
| Card | `.card` holding `.card-title`, `.card-subtitle`, `.card-desc` | |
| Key/value table | `table.kv-table` of `th` and `td` rows | |
| Data table | `.data-table-wrap` holding `table.data-table`, with `.stack`; `th[aria-sort]` holding `a` or `button`; `.num`; `.data-table-check`; `tr.data-table-empty`; `td[data-label]` | `aria-sort`; `aria-selected="true"` or a checked `.data-table-check` checkbox |
| Notices | `.notice`, with `.positive`, `.warn`, `.danger`, holding `.notice-content` with `.notice-title`, `.notice-body`, `.notice-actions`, and `button.notice-close` | `hidden` once dismissed |
| Toasts | `.toast-region` holding `.toast`, with `.positive`, `.warn`, `.danger`, holding `p.toast-text` and `button.toast-close` | `data-toast-ms`, `data-toast-sticky` |
| Tabs within a page | `.tabs` holding `.tablist[role=tablist]` of `[role=tab][aria-controls]`, then `[role=tabpanel]` panels | `aria-selected` |
| Empty and loading | `.empty-state` holding `.empty-state-title`, `.empty-state-body`, `.empty-state-actions`; `.loading[role=status]` holding `.spinner` | |
| Pagination | `nav.pagination` holding `.pagination-summary`, `a.page-link` (with `rel="prev"` or `rel="next"`), `.page-gap` | aria-current `"page"`; `aria-disabled="true"` |
| Dialog | `dialog.dialog` holding `.dialog-title`, `.dialog-body`, `.dialog-actions`; opened by a button with `command="show-modal"` and `commandfor` | `open` |
| Menu | `.menu` holding `.menu-btn[popovertarget]` and `.menu-panel[popover]`, whose content is `.md-section-label`, `.md-row` with `.md-item`, `.menu-sep`, `button.menu-action` (with `.danger`), an `.md-filter` and a `.menu-empty` | `data-menu-key`, `data-menu-empty` |
| Master-detail | `.md-layout` holding `.md-toolbar` (with `.md-site-tools`), `.md-chips`, `.md-body` holding `.md-sidebar`, `.md-resize`, `.md-detail[tabindex="0"]`; toolbar parts `.md-filter`, `.md-filter-group`, `.md-filter-go`, `.md-toolbar-spacer`, `.md-toolbar-cmds`, `.md-toolbar-sep`, `.md-chips-clear`; list parts `.md-section-label`, `.md-row` holding `a.md-item` with `.md-meta`, `.md-grip`; `a.md-back` in the detail | `data-md-pane="detail"` or `"list"`; aria-current on a row's link |
| Windows | `.win-host` holding `.win-layer[data-win-layer][data-win-src]`; `section.win[data-win]` holding `header.win-head` with `.win-title` and `.win-chrome` of `.win-btn[data-win-action]`, then `.win-body`; `nav.win-dock[data-win-dock]`; a list row `.md-row-child[data-win-child]` | `data-win-mode`, `hidden` for minimised, the four `--win-` position properties, `.active` on the window in front |
| Applets | an element with `data-applet`, and optionally `data-applet-page`, `data-applet-fit`, `data-applet-param` | `data-applet-state`; `data-applet-fit` |
| Regions | any element with `data-region` | `aria-busy` while replaced |
| Numbers and time | `.num`, `time`, `data` in prose take tabular figures | |

The `hidden` attribute always hides, on any component, except `hidden="until-found"`.

## Attributes that scripts read

| Attribute | On | Read by | Meaning |
|---|---|---|---|
| `data-theme`, `data-theme-pref` | `<html>` | the stylesheet, a settings control | The theme in force, and the reader's preference |
| `data-win-layer`, `data-win-src` | the window layer | `pudl-windows.js` | The layer, and where window markup comes from (`{key}`, or `#` for a template); fetched markup must be `text/html` from the page's origin |
| `data-win-default` | the window layer | `pudl-windows.js` | The keys of the windows an address naming no windows opens |
| `data-win`, `data-win-parent`, `data-win-mode` | a window | `pudl-windows.js` | Its key, its parent's key, its starting mode |
| `data-win-open`, `data-win-replace` | a link | `pudl-windows.js` | Open that key's window, in place of this one |
| `data-win-action` | a window button | `pudl-windows.js` | `page`, `minimize`, `maximize` or `close` |
| `data-win-dock`, `data-win-tab`, `data-win-back` | the dock, a dock tab or row, a back link | `pudl-windows.js` | |
| `data-win-text-maximize`, `-restore`, `-minimized`, `-head` | the window layer | `pudl-windows.js` | The page's own words, with `{title}` |
| `data-menu-key`, `data-menu-empty` | a menu panel | `pudl-menu.js` | Its summoning key, its "nothing matches" text |
| `data-md-pane` | `.md-layout` | the stylesheet, `pudl-windows.js` | Which pane a narrow layout shows |
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
| `pudl:window-close` | the window, bubbles | `key`, `reason`: `button`, `key`, `script`, `parent`, `replace` or `address` | Just before a window leaves the page, by any route |
| `pudl:windows-change` | the window layer, bubbles | the whole state: `open`, `top`, `min`, `place` | After every change to the windows |
| `pudl:regions-swap` | the document | `url`, `regions` | After regions are swapped |
| `pudl:md-resize` | the `.md-layout`, bubbles | `width`, `reset` | When a sidebar resize ends |
| `pudl:applet-state` | the applet's mount, bubbles | `name`, `host`, `fit`, `param`, and `state` for a listener to set | Just before `init`; what `state` holds then is `opts.state` |
| `pudl:applet-change` | the applet's mount, bubbles | `state`, a string or null | When the applet calls `opts.changed()` |

## Script functions

| Function | From | Does |
|---|---|---|
| `pudlSetTheme(p)`, `pudlThemePreference()`, `pudlToggleTheme()` | `pudl-theme.js` | Set, read and toggle the reader's theme |
| `pudlWindows.open(key)`, `.replace(oldKey, key)`, `.raise(key)`, `.minimize(key)`, `.close(key)`, `.state()` | `pudl-windows.js` | What the matching link or button does, URL and history included |
| `pudlApplets.define(name, { src, css, page, ver })` | `pudl-applets.js` | Name an applet's files once, for mounts that carry only the name |
| `pudlApplets.register(name, { init })`, `.boot(scope)`, `.destroy(scope)` | `pudl-applets.js` | The applet contract: `init(root, opts)` returns `{ destroy }` and optionally `state()` and `setState(s)`, with `opts.host`, `opts.fit`, `opts.ownsUrl`, `opts.pageUrl`, `opts.state`, `opts.changed(s)` |
| `pudlToast(message, { kind, ms, sticky })` | `pudl-toast.js` | Raise a toast |
| `pudlTabs.enhance()` | `pudl-tabs.js` | Enhance tabs added to the page by other means |

## Addresses

**Windows.** The parameters `open` (keys, comma-separated, in opening order), `top` (one key), `min` (keys) and `p.<key>=<mode>:<x>,<y>,<w>,<h>` describe the windows, alongside the page's own parameters. A key is letters, digits, `-` and `_`. The mode is `floating`, `maximized`, `left` or `right`; the four numbers are fractions of the layer from 0 to 1, with at most three decimal places, and are the floating geometry to restore to. A server renders the windows these name, and ignores what it cannot parse. An address with no `open` parameter opens the layer's default windows, if it names any; an address with `open`, empty or not, opens exactly what it names.

**Regions.** A soft navigation fetches the same address a bookmark would. It is made by a link inside a region or marked with `data-region-link`, or a GET form inside a region. It swaps when the answering page is `text/html` from the page's own origin, with no redirect to another, and has a region of every name the current page has and the same window layer source; otherwise the browser navigates. A region that is sometimes empty must still be rendered.

**Applets.** A mount outside a window with `data-applet-param="name"` has its applet's state under `name` in the page's query, replaced rather than pushed as it changes. Regions carry that parameter from address to address like the windows' parameters, and a change in it alone fetches nothing. The applet owns the address itself only on its own page: `ownsUrl` is true when the mount is outside a window, has no `data-applet-param`, and its page, from `data-applet-page` or the registry, is this page's path, ignoring an index file, an `.html` extension and a trailing slash.

A link with `data-applet-preset` whose click an instance takes is handled as the link: its state goes to `setState()`, and a mount that keeps its state in the address gets it there as a new history entry.

**Everything else.** Sorting, filtering, paging, the record in view and the panel chosen in a set of tabs are addresses: query parameters for the first four, the fragment for the last. What is momentary, such as an open menu or a tooltip, is not.

## Internal

These are how PUDL works today and may change in any release: the classes scripts add for their own use (`.placing`, `.sheet`, `.dragging`, `.tabs-ready`, `.leaving`, `.minimized`, `.win-rh`, `.win-ghost`, `.win-moving`, `.tooltip`), `data-toast-armed`, `data-edge`, the custom properties not listed above (among them `--ctl-h`, `--notice-color`, `--badge-color`, `--glyph` and `--glyph-size`), the popover used for tooltips, the order of rules in the stylesheets, and anything a script does that no event, function or attribute above describes.

## Names already replaced

These work until 2.0: `--pr` (now `--positive`), `.badge.pr` (`.badge.positive`), `.fc-kind` (`.filter-chip-kind`), `.active` on section tabs, segments and list rows (the ARIA attributes above), and `.dialog-backdrop` shown by a project's script (`dialog.dialog`).

One name was removed outright before 1.0, for security rather than replaced: `data-applet-src` and `data-applet-css` on an applet mount, removed in 0.23.0, whose files `pudlApplets.define()` now names.
