# PUDL

PUDL is the Pleasantly Usable Design Language. It rhymes with "puddle", which is a joke at its own expense, because a puddle is the flattest thing there is and PUDL insists that everything a user can touch has depth.

I built PUDL as an answer to flat design. Flat design began as a fair rebellion against skeuomorphism, and it went on to strip out the cues that tell a user what can be pressed, what can be typed into, and what can only be read. PUDL gives every affordance one visual representation. Somebody who has learned it in one application should be able to open any other application built with it and know how to use it on sight.

It is a stylesheet, a small theme script and a font, with no framework and no build step. Every project that uses it carries a copy.

## The rules

- **Elevation signals interactivity.** A raised control, with a hairline border and an inset highlight, can be pressed. A sunken field, with an inset shadow, takes input. Anything flat is there to be read.
- **Categories stay separate.** Buttons, links, status badges and chips each look like themselves, and none of them borrows another's appearance.
- **Colour is never the only signal.** Every meaningful state carries a glyph as well as a colour, so the interface still reads for somebody with red-green colour blindness (WCAG 1.4.1).
- **Each visible context has at most one primary button.** A view that seems to need two has a secondary or destructive action hiding in one of them.
- **Links are underlined.** The brand wordmark in the topbar is the only exception.
- **Numerals are tabular wherever numbers are data**, so identifiers, counts, money and timestamps line up in tables, fields, badges, chips and lists. Running prose keeps proportional figures, and a `<time>`, a `<data>` or the `.num` class makes a number inside prose tabular.
- **Dialogs are rendered by the server** and shown by script, and a page never falls back on the browser's own `confirm()`.

`reference.html` shows every component in both themes and lists the rest of the invariants.

## Using it

Copy the contents of `dist/` from a tagged release into your project, keeping the `fonts` folder beside `pudl.css`, and load three files in this order:

```html
<script src="pudl-theme.js"></script>
<link rel="stylesheet" href="pudl.css">
<link rel="stylesheet" href="brand.css">
```

`pudl-theme.js` goes first so that the saved theme is applied before the first paint. It sets `data-theme` on the `<html>` element to `light` or `dark`, and it gives you `pudlToggleTheme()` for a toggle button.

### From a CDN

For a prototype, a demo or a documentation page, you can load a release from jsDelivr instead of copying it. jsDelivr serves each file straight from this repository's release tags, and the fonts come along because `pudl.css` finds them relative to its own address.

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl-theme.js"
        integrity="sha384-MVBsHKpekAHr+tn0bTWhvmuChc2GE0LuMgNXVtxFYU2ht0dMVHtSreaYuhhEb2my"
        crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl.css"
      integrity="sha384-tDnbiYbPuqm25oxmQe3dw+sZQ/1pp6Whkqe6XoRL/ugwsZV82ZEubGD1YqiI4kpi"
      crossorigin="anonymous">
```

With floating windows as well:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl-windows.css"
      integrity="sha384-a6Hk3ctcWCEH1a1w21ajWl1IJ6RtMngseAQgi5F0x0obYAeTOM3lEwFiONe5o/kn"
      crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl-windows.js" defer
        integrity="sha384-DqM9FWJUDZTv5dfaQoBPgKI5FfAqDQwxEcxwGpoIAu4OSh0CDtCnDXYpmr912Mz9"
        crossorigin="anonymous"></script>
```

Always name an exact release, as these examples do. jsDelivr also accepts a loose version such as `@v0` or `@latest`, but PUDL's changes are visual, and a page linked that way would change its look whenever a release lands, which is the surprise that pinning exists to prevent. The `integrity` attribute makes the browser refuse a file whose bytes differ from the release, so a pinned page cannot change even if the CDN misbehaves.

An application in production should still copy a release into its own tree. A CDN is a third party that sees every visitor's address, and it cannot be reached offline or from inside a closed network.

A project themes PUDL with its own stylesheet, loaded after `pudl.css`. It may replace the whole palette, background and topbar included, and it may change the fonts, within the restrictions below. The neutral graphite palette in `pudl.css` is a default that a project is free to replace.

A palette is the block of tokens at the top of `pudl.css` under "The palette": six for the page and text, seven for the accent and status colours, four for lighting and two for the topbar, each given once for the light theme and once for the dark. Every other token is derived from those, so a theme sets nothing else. Set them on `:root` and on `[data-theme="dark"]`, because that is where the derived tokens are computed.

The lighting tokens are what keep the raised and sunken surfaces readable on a new palette. `--light` is the colour of the light falling on a raised control and `--shade` the colour of its shadow. `--lit` sets how strongly the highlight shows and `--depth` how strongly the shadow does. A light theme usually wants a strong highlight and a soft shadow, and a dark theme the reverse. What stays constant from one project to the next is the grammar: a user who has learned what raised, sunken and flat mean in one application finds the same meanings in every other.

The smallest useful theme changes only `--accent` and `--accent-hover`. The accent reaches links, primary buttons, focus rings, the segmented control, chips and filter chips, so those two values alone make a project recognisably its own. `examples/brand.css` shows one, with separate values for the dark theme. `examples/slate.css` replaces the whole palette with a cool slate one and gives it a light topbar. `examples/parchment.css` restores the warm parchment and leather palette with serif headings that PUDL used by default up to 0.2.0, which is also the Andoneer look.

PUDL sets text in Inter, which it ships in `dist/fonts/` as one variable file for each style, because Inter is not installed by default on Windows or macOS and a font loaded from a third-party server breaks offline and on an intranet. Until the file loads, and on any system where it cannot, the platform's own interface face stands in. Headings use Inter too, and the font's optical-size axis tightens it at heading sizes. Machine values use the platform's monospace face.

## What a project may change

A theme may change any colour token and the font tokens, provided the result keeps these rules.

- **The three surfaces stay distinct.** A raised control must still read as raised against the surface behind it, a sunken field as sunken, and flat content as flat. A theme tunes this with the four lighting tokens and leaves the derived raised and sunken tokens alone.
- **Contrast meets WCAG 2.2 AA.** Body text needs 4.5:1 against its background. Control boundaries and focus indicators need 3:1 against what surrounds them (WCAG 1.4.11).
- **Status colours stay apart.** `--warn`, `--danger`, `--pr` and `--accent` must remain distinguishable from one another, and each still carries its glyph.
- **Both themes exist.** A project supplies light and dark values for every token it changes.
- **Fonts keep their roles.** Body text uses a legible sans-serif interface face. Identifiers, versions, timestamps and other machine values use a monospace face. The display face for headings and the brand wordmark may be any legible face, serif included. Numerals stay tabular where numbers are data, and weights stay between 400 and 700.

The type scale, the spacing grid and the corner radii belong to the language and do not change per project.

Pin a release rather than tracking the default branch. A change to PUDL reaches a project when that project copies a newer tag, and never by surprise.

## Master-detail on a narrow screen

The master-detail layout shows a list beside one record. When the layout itself is 640px wide or less, on a phone or in a narrow window or panel, it shows one pane at a time instead: the list, or the record. It measures its own width with a container query, not the screen's, so a layout inside a narrow floating window behaves the same way as one on a phone.

Each pane is its own URL, which the server already has, because selecting a record in the list is a link to that record's URL. The server tells the layout which pane the URL names:

```html
<div class="md-layout" data-md-pane="detail">
  …
  <div class="md-detail">
    <a class="md-back" href="/expenses?trip=manila-oct#row-exp-12">Expenses</a>
    …
  </div>
</div>
```

`data-md-pane="detail"` goes on the layout whenever the URL names a record, or shows a form that stands in for one, such as a new record, whether or not a row in the list is highlighted. Otherwise it is `"list"` or absent. On a wide layout the attribute changes nothing.

The detail pane starts with an `.md-back` link, which appears only when one pane shows at a time. Its `href` is the list's URL with the current filters kept, and its fragment names the record's row, whose `.md-row` carries that id, so the list scrolls back to where the reader left it. The link text names the list. It returns to the list the record lives in, and it is not a breadcrumb trail. While the record shows, the list's toolbar and filter chips step aside, since they act on the list, and while the list shows, its rows grow taller because they are touch targets. None of this needs script.

## Floating windows

A project can open records as windows floating above a list or a board, from two optional files loaded after the core ones:

```html
<link rel="stylesheet" href="pudl-windows.css">
<script src="pudl-windows.js" defer></script>
```

The windows follow the same principles as the rest of PUDL. The URL holds the whole arrangement, so a page with windows open can be bookmarked, reloaded and shared, and Back and Forward step between sets of open windows. The server renders the windows the URL names, so they appear without script, and the script adds dragging, resizing, snapping and the keyboard. Every window button is a real link to the state it produces. A window is not modal and never stands in for a page: each record keeps its own page, which is where its link goes without script.

### The URL

Four kinds of query parameter describe the windows, alongside whatever parameters the page already uses:

| Parameter | Value | Meaning |
|---|---|---|
| `open` | keys, comma-separated | the open windows, in the order they were opened, which is the dock's order |
| `top` | one key | the active window, drawn above the others |
| `min` | keys, comma-separated | the minimised windows, which stay open and show only in the dock |
| `p.<key>` | `<mode>:<x>,<y>,<w>,<h>` | one window's placement |

A key names a record and is made of letters, digits, `-` and `_`. The mode is `floating`, `maximized`, `left` or `right`, the last two being the snapped halves. The four numbers are the window's left edge, top edge, width and height as fractions of the layer, from 0 to 1, with at most three decimal places. A maximised or snapped window keeps its floating numbers, which are where it returns when restored. For example:

```
/trips/manila?open=exp-12,exp-13&top=exp-13&min=exp-12&p.exp-12=floating:0.36,0.04,0.5,0.72&p.exp-13=left:0.4,0.08,0.5,0.72
```

A server ignores a key it does not recognise and a placement it cannot parse. A window whose placement is missing opens floating, cascading from the top left.

### The markup

The windows float over a host, the region they may occupy, which is usually the main area below the topbar. The host holds the page's own content and one layer, and a page has one layer. `data-win-src` on the layer says where the script fetches a window's markup, with `{key}` standing for the key. A value starting with `#` names a `<template>` in the page instead.

```html
<main class="win-host">
  <div class="board">
    <a href="/expenses/exp-12" data-win-open="exp-12">Hotel, Makati</a>
  </div>
  <div class="win-layer" data-win-layer data-win-src="/expenses/{key}/window">
    <!-- the windows the URL names, rendered by the server -->
  </div>
</main>
<nav class="win-dock" data-win-dock aria-label="Open windows"></nav>
```

A link with `data-win-open` opens its record as a window on a plain click, and a modified click is left to the browser. Its `href` is the record's own page. The host does not scroll, and the content inside it does. The dock may sit anywhere on the page, and the script fills it with one tab per open window.

Each window is the same markup whether the server renders it into the page or returns it from the `data-win-src` URL:

```html
<article class="win" data-win="exp-12" data-win-mode="floating"
         role="dialog" aria-labelledby="win-exp-12-title"
         style="--win-x:0.36; --win-y:0.04; --win-w:0.5; --win-h:0.72">
  <header class="win-head">
    <h2 class="win-title" id="win-exp-12-title">Hotel, Makati, three nights</h2>
    <nav class="win-chrome" aria-label="Window">
      <a class="win-btn" data-win-action="page" href="/expenses/exp-12" aria-label="Open as a page"></a>
      <a class="win-btn" data-win-action="minimize" href="…" aria-label="Minimize"></a>
      <a class="win-btn" data-win-action="maximize" href="…" aria-label="Maximize"></a>
      <a class="win-btn" data-win-action="close" href="…" aria-label="Close"></a>
    </nav>
  </header>
  <div class="win-body">…</div>
</article>
```

The server writes the placement from the URL into `data-win-mode` and the four `--win-` properties, gives a minimised window the `hidden` attribute, gives the active window the class `active`, and renders the windows in stacking order with the active one last. Each button's `href` is the URL of the state that pressing it produces, with the other parameters kept. The buttons are empty because their glyphs come from the stylesheet. The title is plain text. A page opens with the ↗ button, and the whole title bar is the drag handle. A window's `data-win-src` URL should return the window markup alone, not a whole page, so that opening a window costs one small render.

Scripts inside a fetched window do not run. A project wires up a window's content by listening for `pudl:window-open`, which fires on each window as it arrives. `pudl:window-place` fires on the layer before a window opens with no placement in the URL, and a listener may set `event.detail.placement` to `{mode, x, y, w, h}`, from saved state for example. `pudl:windows-change` fires on the layer after every change with the whole state, for a project that wants to remember placements. PUDL keeps no state of its own beyond the URL.

With a title bar focused, the arrow keys move the window, Shift with the arrow keys resizes it, and Enter maximises or restores it. Double-clicking the title bar also maximises or restores it, and dragging it against the left, right or top edge of the layer snaps it to that half or maximises it.

A window's markup may give it a starting mode with `data-win-mode` and no position, and it opens in that mode, with a cascade position to restore to. A reading site opens its articles maximised this way.

### Child windows

A window can open children for content that belongs to it, such as a source listing, an image or a receipt. A child's markup names its parent:

```html
<article class="win" data-win="art-12-listing-1" data-win-parent="art-12" data-win-mode="maximized">
```

The relation belongs to the content, so it lives in the markup and the URL does not repeat it: the child appears in `open` like any other window. A link inside the parent with `data-win-open` opens the child. A child has no minimise button, because it has no dock tab to come back from, and usually has only close.

- A child stacks directly above its parent, and bringing the parent forward brings its children with it.
- Minimising the parent hides its children, and closing the parent closes them.
- The dock has tabs for top-level windows only. A parent's tab brings forward its topmost child, since that child covers it.
- Escape closes a child that is in front, as a lightbox does, unless the key is meant for a form field. Escape never closes a top-level window. Focus returns to the link that opened the child.
- Children nest one level. A child of a child stands on its own.

`pudl:window-place` carries the parent's key in `event.detail.parent`, so a listener that places windows can leave children alone.

### Windows and a list

A list built from master-detail rows follows the windows its links open. The script finds each `.md-row` holding a link with `data-win-open`, marks the row of the window in front with `active` and `aria-current`, and adds an `.md-row-child` row beneath it for each open child, titled with the child's title and linking to it. The row goes when the child closes. A server rendering the page for a URL renders the same rows.

When the layer sits inside a master-detail layout, in place of `.md-detail` or inside it, the windows are the detail pane. The script sets `data-md-pane` to `detail` while any window shows and to `list` otherwise, so a narrow layout shows the list or the windows. A link with `data-win-back`, usually an `.md-back` above the layer, minimises every window, which returns to the list with the windows kept in the URL.

`samples/article-reader.html` puts all of this together as a reading site: an article list in the sidebar, each article opening maximised, and listings as child windows.

## What is in the repository

Everything a project uses is in `dist/`, and everything else supports it.

- `dist/`, the files a project copies or loads:
  - `pudl.css`, the tokens and component classes
  - `pudl-theme.js`, the pre-paint theme loader and toggle
  - `pudl-windows.css` and `pudl-windows.js`, the optional floating windows
  - `fonts/`, Inter in its upright and italic variable files, with its licence
  - `LICENSE`, a copy of PUDL's licence, so that it travels with the files
- `reference.html`, the living reference for every component, also published at https://paulmooreparks.github.io/pudl/reference.html
- `samples/`, working pages built with PUDL, starting with `article-reader.html`, a reading site with articles in windows and listings as child windows, also published at https://paulmooreparks.github.io/pudl/samples/article-reader.html
- `examples/`, three example themes: `brand.css` changes only the accent, `slate.css` replaces the whole palette, and `parchment.css` is the warm palette PUDL used by default up to 0.2.0
- `RELEASING.md`, the steps for cutting a release
- `CHANGELOG.md`, what changed in each release

## Status

This is version 0.7.0 and it is incomplete. The stylesheet was extracted from the Andoneer Design Language v2 reference page, which is the fullest statement of these ideas so far, and it has not yet been used on its own in a project. The floating windows are a rewrite of Andoneer's card windows as a general module. PUDL ships no script yet for resizing the master-detail sidebar.

## Lineage

PUDL supersedes three earlier design languages. The Tela Design Language came first. The Andoneer Design Language and the Planning Fit Design Language extended it for their own products, and the second version of the Andoneer Design Language moved the control vocabulary to a grammar modelled on desktop toolkits, GTK in particular. PUDL borrows ideas from GTK and contains none of its code, stylesheets or artwork. PUDL is that second version, separated from Andoneer so that every project can share it.

## Licence

PUDL is released under the Apache License 2.0. See `LICENSE`, which `dist/LICENSE` copies. Inter, in `dist/fonts/`, is by Rasmus Andersson and the Inter Project Authors and is released under the SIL Open Font License 1.1. See `dist/fonts/Inter-LICENSE.txt`.
