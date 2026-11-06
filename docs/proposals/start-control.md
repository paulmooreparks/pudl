# Start control

The Start control publishes the approved searchable catalog as a reusable PUDL component. It composes native popover, navigation-list, filter and splitter controls. Hosts supply HTML links for destinations and buttons for commands, so a catalog can contain more than applications. The visual grammar remains that of the existing components.

## Markup and ownership

The root is `.menu-panel.start-menu[data-start]`, optionally with `popover` and an accessible name. Use a labelled section or an explicit region role for an inline catalog; a popup can use a nonmodal dialog role. An ordinary `popovertarget` button opens it. Load `pudl.css`, `pudl-split.js` and `pudl-start.js` with defer. The root owns one `[data-start-query]` input, `[data-start-items]` list and `[data-start-categories]` navigation list. Each `[data-start-item]` row contains one destination link or command button. Its whitespace-separated `data-start-category` keys and optional `data-start-keywords` extend its searchable text. A category control carries `data-start-category-key`; the empty key means All. Render one All control and give each other category a unique key. Category labels use `[data-start-label]`, and optional counts use `[data-start-category-count]`.

Optional output slots are `[data-start-heading]`, `[data-start-count]`, `[data-start-empty]` and `[data-start-announcement]`. Counts render numerals only; hosts supply surrounding localized words. Optional `[data-start-clear]` buttons clear the query and return to All. Clear retains its label and close glyph and becomes disabled with an empty query. `[data-start-close]` dismisses a popup and returns focus to its opener. Hosts provide the title Start, category All, search label and empty-state wording in their own language.

The content uses `.split.start-content` with two `.split-pane` children separated by a `.split-handle`. `data-start-side="left"` on the root selects the category-first default; the DOM order must match. Right is the default in left-to-right text; right-to-left layouts mirror the pane order. The existing splitter owns pointer and keyboard resizing and emits `pudl:split`; the host owns persistence. Inline roots work without popover opening or dismissal. Without enhancement, all catalog links remain available.

## Behavior and API

Search matches every whitespace-separated query word against row text and keywords, case-insensitively. Typing starts a global search; selecting a category then narrows it. Filtering marks rows with `data-start-filtered`, leaving the host's `hidden` state intact. Hidden rows are excluded from counts, as are rows inside a hidden catalog container. Disabled actions remain visible but are skipped by arrow navigation and search submission. Categories are navigation choices with `aria-current="page"`; the control does not impose menu or listbox roles on a mixed catalog.

Arrow Down from search enters the first available item. Up and Down, Home and End navigate available items. Up from the first item returns to search. Categories support the same keys within their list. Enter in the search form activates the first available result through its normal click behavior. Modified navigation clicks retain browser behavior. Activation leaves dismissal policy to the host, since a command may need to leave Start open. Escape dismisses the focused Start popup, and an explicit close restores opener focus. Outside dismissal retains the browser's focus behavior. No operating-system shortcut is captured.

`pudlStart.enhance(root)` initializes a newly inserted root idempotently and returns whether it is valid. `refresh(root)` rereads rows, category membership and search text. `state(root)` returns a fresh `{query, category, count}` object or null. `setState(root, {query, category})` restores host state; an unknown category resolves to All. `open(root, opener)` opens a popup and remembers its opener; `close(root)` dismisses it and restores that opener. `destroy(root)` removes listeners, observers and generated filter markers so detached controls can be released or enhanced again.

The bubbling `pudl:start-change` event carries `{query, category, count, reason}` after a semantic change. Reasons are `query`, `category`, `clear`, `api` and `refresh`. Initialization emits no event. The host owns URL and storage policy and can connect this event and `setState` to its router. The control never rewrites page history or storage on its own. Multiple controls keep independent state.

An observer is scoped to each root. It watches changes to catalog rows, category controls and relevant host attributes, coalesces a batch into one refresh, and ignores its generated output. Refresh skips unchanged DOM writes. It performs no geometry reads; the existing splitter measures layout when its own contract requires it.

## Verification

Focused tests must cover both category positions, two independent instances, real links and command buttons, hidden and disabled items, live insertion and replacement, repeated enhancement, mutation-free unchanged refresh, URL restoration through the sample host adapter, Escape and outside dismissal, destroy/reinitialization, RTL, narrow screens, zoom and both themes. Run the focused control, component-inventory and splitter checks in Chromium, Firefox and WebKit, including generated minified assets.

## Implementation status

The distribution implementation is `dist/pudl-start.js`; its layout is in `dist/pudl.css`. The examples `samples/start.html` and `samples/start-left.html` use the distribution implementation, while the earlier mockups remain design history. The component inventory and reference page expose Start as a reusable control. `tests/start.test.js` covers the contract and its coexistence with `pudl-menu.js`. The Start, component-inventory, menu and splitter suites passed across the final readable and minified runs in Chromium, Firefox and WebKit. The unchanged-refresh check observed zero DOM mutations. Light/dark reference interaction checks also passed. Evidence is retained under `tests/output/start-control-final-source`, `tests/output/start-control-confirmed-source`, `tests/output/start-control-confirmed-min` and `tests/output/release-0980-reference.json`. Superseded assertion failures and the baseline-reproduced Firefox applet idle-start timing failure remain in their original outputs; see the release record for limits.

## Minimal host markup

This inline example works as a catalog without JavaScript. Adding `popover`, an accessible popup name and a `popovertarget` opener makes it a popup. A host can add count and empty-state slots without rebuilding rows.

```html
<div class="menu-panel start-menu" data-start role="region" aria-label="Start">
  <form class="md-filter-group start-search-form" role="search">
    <input class="md-filter" data-start-query type="search" aria-label="Search items">
    <button class="icon-btn md-filter-go" aria-label="Open first matching item"></button>
  </form>
  <div class="split start-content">
    <div class="split-pane start-items-pane">
      <ul class="row-list start-items" data-start-items>
        <li class="md-row" data-start-item data-start-category="tools" data-start-keywords="documents">
          <a class="md-item start-item" href="/files">Files</a>
        </li>
        <li class="md-row" data-start-item data-start-category="tools">
          <button class="btn btn-sm start-item" type="button" id="new-note">New note</button>
        </li>
      </ul>
    </div>
    <div class="split-handle" aria-label="Resize categories"></div>
    <nav class="split-pane start-categories" data-start-categories aria-label="Categories">
      <ul class="row-list start-category-list">
        <li class="md-row"><a class="md-item start-category" href="?category=" data-start-category-key=""><span data-start-label>All</span></a></li>
        <li class="md-row"><a class="md-item start-category" href="?category=tools" data-start-category-key="tools"><span data-start-label>Tools</span></a></li>
      </ul>
    </nav>
  </div>
</div>
```

The host attaches its own command handler to `new-note`. Start does not invent commands, install an application registry or record usage. The full examples include the labelled header, glyph-bearing Clear button and result count. A host can render query/category values from its URL and restore them through `setState`; `samples/start.js` demonstrates the corresponding history adapter.

## Host-wide launcher direction

The [host launcher design](host-launcher.md) records the proposed title-menu integration and browsing presentations, including consolidation of tool and applet entry points in desktop and web hosts. Those extensions do not change the published Start contract until implemented and released.
