# Proposal: menus and a launcher

Status: accepted 2026-09-26 and built in 0.8.0. Paul chose the general primitive, the one-column panel and the 2024 browser floor, as recommended below.

One detail changed in building it. Panels are placed by `pudl-menu.js` in every browser, not by CSS anchor positioning with a script fallback. One code path on documented APIs is simpler than two, anchor positioning would have needed a unique anchor name for every menu on a page, and it removed the need to track Firefox's support. Without the script a panel opens centred and works.

The build also added `.md-site-tools`, a marker for a master-detail toolbar that holds site-wide tools. A narrow layout showing a record hides the list's toolbar, and without the marker it would have hidden the launcher too, defeating its purpose on a phone.

## Why PUDL needs this

PUDL has no vocabulary for a control that opens a panel of choices. The gap already shows. The master-detail toolbar on the reference page has "Trip ▾" and "Account ▾" buttons whose arrows promise a dropdown that PUDL does not define, and the classic view of parkscomputing.com draws its dropdowns with site CSS because PUDL offers none.

A launcher, a Start-menu-style button at the left end of a window dock that opens a categorised panel of everything the site offers, is the case that prompted this proposal. I would build it as the first use of a general primitive, a **menu button** and the **menu panel** it opens, rather than as a one-off, so that the toolbar dropdowns get the same control.

## The grammar

The button is raised, because it can be pressed, and carries a ▾ after its label or a glyph of its own, so it reads as "opens something" and not "does something". While the panel is open the button shows its pressed state, the same sunken treatment a segmented control uses for its active segment.

The panel is lifted off the page like a dialog: the dialog surface, a hairline border and the large drop shadow. It has no backdrop, because it is not modal, and it closes when the reader presses Escape, clicks outside it or chooses something.

The panel's items are list rows, the same `.md-row` and `.md-item` markup the master-detail sidebar uses, with section labels for categories. That settles a question the elevation rule would otherwise raise. A row in a list of places is a link by category, like a sidebar row or a notebook tab, so it follows the list-row rules and is not drawn as a raised button. Reusing the markup also means a panel row that opens a window gets marked current by the windows script with no extra work.

Items that perform an action rather than go somewhere, such as "Sign out" or "Export", are buttons laid out as rows with a leading glyph. A panel may hold both kinds, with a separator between them.

## How it works

The panel uses the HTML Popover API, which is documented in the HTML standard and supported in every current engine since 2024 (Chromium 114, Firefox 125, Safari 17). It is declarative:

```html
<button class="btn menu-btn" popovertarget="launcher">Start</button>
<nav class="menu-panel" id="launcher" popover aria-label="Everything on this site">
  <div class="md-section-label">Articles</div>
  <div class="md-row"><a class="md-item" href="/articles/raised" data-win-open="raised">Raised means pressable</a></div>
  …
</nav>
```

That gives, with no script at all: opening and closing, Escape, dismissal on an outside click, the top layer so no window or `overflow` can clip it, focus handling, and the expanded state exposed to assistive technology on the button. PUDL would add the styling and a few small enhancements.

- **Positioning.** The panel should open against its button. CSS anchor positioning does that declaratively, and Chromium and Safari support it. I have not confirmed Firefox's status, and I will check before building. Where anchor positioning is missing, a few lines in `pudl-menu.js` place the panel from the button's rectangle when the popover's documented `toggle` event fires. Without either, the panel opens in the popover's default centred position, which is usable.
- **Choosing a window.** When a panel row opens a window, the windows script closes the panel with `hidePopover()`. A row that navigates to a new page closes it by leaving.
- **Arrow keys.** Tab moves through the rows as it does through any list of links. Up and Down between rows is an enhancement in `pudl-menu.js`. The panel is a disclosure of navigation links, not an ARIA `menu`, because the WAI authoring practices reserve `role="menu"` for application command menus and recommend the disclosure pattern for site navigation.
- **Type to filter.** A launcher may put an `.md-filter` input at the top of its panel. With script it narrows the rows as the reader types. Without script it is a GET form to the site's search page.

Whether a panel is open is not part of the URL. An open menu is momentary, like a hover, and a link to one would be odd to receive. Everything the panel leads to is addressable, and the panel itself is server-rendered navigation that is always in the page, so a crawler and a reader without script both see it.

## The launcher

A launcher is a menu button placed first in the row that holds the window dock, with a glyph and a short label, and a panel laid out for a whole site:

- one section per category, in the site's order, each headed by a section label;
- rows for the items in each category, with the current item marked;
- an optional filter at the top;
- an optional footer row of actions.

On a wide screen the panel is a fixed width, about 22rem, and as tall as its content up to the height of the layout, scrolling beyond that. On a narrow screen it spans the width of the screen from the top of the layout, like a sheet, so the rows stay large enough to tap.

The launcher complements the other ways the site is organising articles. The category tabs say where the reader is, the filter narrows the list in front of them, and the launcher reaches everything from anywhere, including from inside a maximised article whose sidebar is out of sight on a phone.

## What it would add to PUDL

- In `pudl.css`: `.menu-btn`, `.menu-panel`, a separator, and action rows, since the toolbar dropdowns are core rather than part of the windows module.
- A new optional `pudl-menu.js` of perhaps a hundred lines, for positioning without anchor positioning, arrow keys and type-to-filter. The panels work without it.
- In `pudl-windows.js`: closing a panel when one of its rows opens a window, and keeping child-window rows out of panels, since a launcher lists places and a child is not one.
- On the reference page: a menus section in which the "Trip ▾" and "Account ▾" buttons finally open something, and a launcher added to the windows demo and to the article reader sample.

It would be a minor release, with nothing existing changing.

## Decisions for Paul

1. **General primitive or launcher only.** I recommend the general menu button and panel, with the launcher as its first use, because the toolbar dropdowns need the same thing and two designs for one idea is the debt DIRT warns about.
2. **Panel layout.** I recommend one column of categorised sections with an optional filter. The alternative is the Windows 7 layout, categories on the left and their items on the right, which is more "desktop" but needs script to switch categories and is poor on a phone.
3. **Browser floor.** The Popover API sets it at 2024 engines. I think that is acceptable for PUDL, which already relies on `color-mix()`, `:has()` and container queries from the same era, and a browser without it still has the sidebar and the tabs to find its way.
