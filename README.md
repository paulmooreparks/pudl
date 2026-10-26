# PUDL

PUDL is the Pleasantly Usable Design Language. It rhymes with "puddle", which is a joke at its own expense, because a puddle is the flattest thing there is and PUDL insists that everything a user can touch has depth.

I built PUDL as an answer to flat design. Flat design began as a fair rebellion against skeuomorphism, and it went on to strip out the cues that tell a user what can be pressed, what can be typed into, and what can only be read. PUDL gives every affordance one visual representation. Somebody who has learned it in one application should be able to open any other application built with it and know how to use it on sight.

This repository is PUDL's web implementation. The language itself, its rules, tokens, glyphs and components, is specified in [pudl-spec](https://github.com/paulmooreparks/pudl-spec), independently of any platform, and each release here says which version of the specification it implements. This one implements specification 0.17.0.

The web implementation is a stylesheet, a small theme script and a font, with optional scripts for menus, floating windows, applets and regions. It needs no framework, and a project has nothing to build: it copies `dist/` or loads it from a CDN, and carries its own copy.

## See it

- **[The reference](https://paulmooreparks.github.io/pudl/reference.html)** shows every component in both themes, with a live demo of floating windows and menus.
- **[The article reader](https://paulmooreparks.github.io/pudl/samples/article-reader.html)** is a working reading site built with PUDL: articles in windows, listings as child windows, a launcher, category tabs that change only the list, and an applet.
- **[The colour mixer](https://paulmooreparks.github.io/pudl/samples/colour-mixer.html)** is that applet in a page of its own.
- **[The expense tracker](https://paulmooreparks.github.io/pudl/samples/expenses.html)** is a small working application: expenses, trips and reports. Its list sorts, filters, pages and acts on several expenses at once; an expense moves from draft to paid through dialogs and menus, takes a receipt, and keeps its history; its forms refuse what is wrong field by field; and reports total everything and download as CSV. GitHub Pages has no server, so a script stands in for one in the browser, keeping the data in localStorage, and every view is still an address.
- **[Commands and folding toolbars](https://paulmooreparks.github.io/pudl/samples/commands.html)** is a preview of [a proposal not yet settled](docs/proposals/toolbar-commands.md): a note editor applet declares each command once, with its words, glyph, key and state, and PUDL draws its toolbar from them, folds the groups into menus as the room runs out, answers the keys, and lets an agent list and run the same commands by id. Its command table, `pudl-commands.js`, may change before it is released; the folding is released in 0.78.0.
- **[Files](https://paulmooreparks.github.io/pudl/samples/files.html)** is a file browser and editor: a folder tree, a path bar, the folder's contents as a grid of rows to choose from, files dropped on it to add them, and an editor with document tabs and a Markdown preview that open in windows. The editor and the preview are applets that answer requests, so the browser asks to open a file without naming either. Like the expense tracker, it keeps its files in localStorage.
- **[Menus that unfold into a ribbon](https://paulmooreparks.github.io/pudl/samples/menu-ribbon.html)** shows the menu bar, the ribbon and the taskbar together: a menu bar whose menus unfold into a ribbon with Show as ribbon, titles that fold to their glyphs, a resident Pins applet whose pins are a command bar at the topbar's right, and a taskbar with a tray and its own menu at the foot of three applet windows. Narrow the page to watch each part give way in turn.

The article reader fetches its windows from the server, so to run it from a copy of this repository, serve the folder, for example with `python -m http.server`, rather than opening the file directly. The reference works either way.

## The rules

- **Elevation signals interactivity.** A raised control, with a hairline border and an inset highlight, can be pressed. A sunken field, with an inset shadow, takes input. Anything flat is there to be read.
- **Categories stay separate.** Buttons, links, tabs, status badges, chips and filter chips each look like themselves, and none of them borrows another's appearance.
- **Colour is never the only signal.** Every meaningful state carries a glyph, a position or an elevation as well as a colour, so the interface still reads for somebody with red-green colour blindness (WCAG 1.4.1).
- **State is marked with the ARIA attribute that states it.** `aria-current` says where the reader is, `aria-pressed` and `aria-checked` say a toggle is on, and `aria-selected` marks the tab of a tab panel, so the eye and assistive technology are told the same thing. The older `.active` class still works as an alias.
- **Each visible context has at most one primary button.** A view that seems to need two has a secondary or destructive action hiding in one of them.
- **Links are underlined.** The brand wordmark in the topbar is the only exception.
- **Numerals are tabular wherever numbers are data**, so identifiers, counts, money and timestamps line up in tables, fields, badges, chips and lists. Running prose keeps proportional figures, and a `<time>`, a `<data>` or the `.num` class makes a number inside prose tabular.
- **Dialogs are native dialog elements rendered by the server**, and a page never falls back on the browser's own `confirm()`.
- **Agents are readers too.** Whatever a part of PUDL lets a person find out or do, it lets a software agent, such as an AI model working for that person, find out or do by a documented, structured means that does not depend on reading the screen, where the part has anything to find out or do at all. The applet API is the model.
- **Glyphs are drawn, not typed.** Every glyph in PUDL's chrome is an SVG mask from the stylesheet, so it looks the same everywhere and never turns into a colour emoji.

These rules belong to the language, and [chapter 2 of the specification](https://github.com/paulmooreparks/pudl-spec/blob/main/spec/02-grammar.md) states them in full; where the two differ, the specification is right and this README is out of date. `reference.html` shows every component in both themes and lists the rest of the invariants. [`docs/CONTRACT.md`](docs/CONTRACT.md) lists every class, token, attribute, event and function a project may rely on, and what is internal.

## Using it

Copy the contents of `dist/` from a tagged release into your project, keeping the `fonts` folder beside `pudl.css`, and load three files in this order:

```html
<script src="pudl-theme.js"></script>
<link rel="stylesheet" href="pudl.css">
<link rel="stylesheet" href="brand.css">
```

`pudl-theme.js` goes first so that the reader's theme is applied before the first paint. A reader's preference is light, dark or system, remembered in local storage; system follows the operating system's setting and keeps following it if that changes with the page open, and with nothing saved the page starts dark. The script sets `data-theme` on the `<html>` element to the theme in force, `light` or `dark`, which the stylesheet reads, and `data-theme-pref` to the preference, which a settings control can read. It gives you `pudlSetTheme('light' | 'dark' | 'system')` and `pudlThemePreference()` for a settings control, `pudlToggleTheme()` for a single toggle button, and a `pudl:theme-change` event on the document after every change, including one made in another tab. The reference page's segmented control section has a working Light / Dark / System setting.

### Smaller downloads

Every script and stylesheet in `dist/` also comes minified, under the same name in `dist/min/`, as `min/pudl-theme.js`, `min/pudl.css` and so on, each with a source map that points back at its source. A minified file behaves as its source does and the suite runs against both, so a project can load either and switch at will; compressed, the minified copies are about half the size. The readable files stay the source, and they are what this README and the specification describe. A script that loads another of PUDL's scripts loads it from its own folder, so a minified one loads minified ones, and a minified stylesheet finds the fonts one folder up. Keep `min/` beside `fonts/` and `vendor/` when copying. `build/minify.js` writes the copies, and only a maintainer runs it.

From 0.70.0 to 0.72.0 the minified copies sat beside their sources as `name.min.js` and `name.min.css`. jsDelivr minifies a `.min.js` or `.min.css` file itself when it believes the file is missing, and for a release it has only just seen it did so for some of ours that existed, and then kept serving its own copies, whose integrity hashes do not match ours. Names without `.min` are never minified by it, which is why the copies moved (0.73.0).

Text is set in Inter, and a page downloads a font only for the characters it shows ([font subsetting](docs/FONTS.md)). An English page downloads 71,284 bytes. Two stylesheets, loaded after `pudl.css` and before a theme, change that:

- `pudl-fonts-full.css` sets text in the whole of Inter as PUDL shipped it before 0.70.0, with every weight, the optical-size axis that tightens headings, and the character variants and stylistic sets that a theme can ask for with `font-feature-settings`. An English page then downloads 162,188 bytes.
- `pudl-fonts-system.css` sets text in the platform's own interface face, Segoe UI, San Francisco, Roboto or the Linux desktop's, and downloads no font at all.

### From a CDN

For a prototype, a demo or a documentation page, you can load a release from jsDelivr instead of copying it. jsDelivr serves each file straight from this repository's release tags, and the fonts come along because `pudl.css` finds them relative to its own address.

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-theme.js"
        integrity="sha384-kd6cwrRNLEIY/49jBdC7mBi1fiFbf9DSlyMfmX61QgrtAc8YnUTEKkrBjKoBMgnY"
        crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl.css"
      integrity="sha384-jXb3skSZWMGROZ+JJj5VZDDx8dhFhLT4Z8pkXv0OAGqWe4Vu+qGVi9QPYnYUtgo5"
      crossorigin="anonymous">
```

The same two files minified, which every file below has too, with its own hash:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/min/pudl-theme.js"
        integrity="sha384-XZBxq31AdQf7zRUvXdda9Cvl1P6JqRbnUesbhGQ4kFmnQlPf1Zvhgl5CASd0kjQ9"
        crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/min/pudl.css"
      integrity="sha384-ojAhfmKwjgK0jrsinYd41nMbPbhKphjsB3QLdhSxA74TCkikPG60+uh4SJPkAbVU"
      crossorigin="anonymous">
```

With the menu script as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-menu.js" defer
        integrity="sha384-NO2lOk/iVthZc7AFAZ6Epoa4pMd+IswmlqNJWqhvcZT87g6Cp5s+Idl6IaqEkDwe"
        crossorigin="anonymous"></script>
```

With floating windows as well:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-windows.css"
      integrity="sha384-js+9lVOq65HxVJocaOCIGNIzBPLjw0QzvX0dQXgbRdYZfbe8/zP0w1dzq/UEeRVT"
      crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-windows.js" defer
        integrity="sha384-DHZ3QMA4k+zvjiE7kmAtL59AOro+qhmuDmfqw87AstjF15QAx5FnbtVHPIgU3uys"
        crossorigin="anonymous"></script>
```

With applets as well, loaded after the windows script:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-applets.js" defer
        integrity="sha384-1Q3ZlCi53MnCzxEQSmOl+br4Su1/y6EbKdHe5cjKqjbAJVaG2THiXIlj06a1tkCE"
        crossorigin="anonymous"></script>
```

With regions as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-regions.js" defer
        integrity="sha384-VpbKr+w0RPg3CvDhqi5ahDIxITHmzx1gcG+jy+5oAX2fRUTdWtYGXcqyBNVucMDg"
        crossorigin="anonymous"></script>
```

With the sidebar divider as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-md.js" defer
        integrity="sha384-+K820KmqZIaxOZxArpH+XAzpaJfDrbDqoz5EjqQaLxouxwcz+K1YzkX7CT7NzOXR"
        crossorigin="anonymous"></script>
```

With the dialog command buttons for older browsers as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-dialog.js" defer
        integrity="sha384-g8Wobr7R/IcsZhmHb4GRiTpnGGnUnWmkanT2e0zifKETY9aXFuWaTmfObuGQzTqe"
        crossorigin="anonymous"></script>
```

With toasts as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-toast.js" defer
        integrity="sha384-gnpXtHDYsAjtovbjyHQ5ValIDlRlt3tG05tg2LitfmDWUmigh9e3/H4F+gsxFRlD"
        crossorigin="anonymous"></script>
```

With tabs within a page and tooltips as well:

```html
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-tabs.js" defer
        integrity="sha384-lpU1GEZwaB/Cn15ifE7UQKboo/KI/uZxaTYAiGZJm5C6BzeSiAVZ9zEc63gTcLX4"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-tooltip.js" defer
        integrity="sha384-HDJ4lsJC6Z8CfMmBhyyhZb0fNghttxbLTaGJXC4Squ1lKY4FyJMHjxhRqjAUolLD"
        crossorigin="anonymous"></script>
```

With trees and grids as well, highlight.js coloured by PUDL's syntax tokens, and code blocks that copy and download:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-hljs.css"
      integrity="sha384-fo4XfkospG0ZjwQuB+cvRKuwdy3TtGciaUXVrI2ESl7MsuuiU41IDoTNtr3i/Cyj"
      crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-code.js" defer
        integrity="sha384-/v1kx/aWnxGTqr57wM4rCYnbtWgeysmaYmVYyVbS7xv627AumdudiiTv/QyNdtTr"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-toolbar.js" defer
        integrity="sha384-LA1GAN9E70FqYKWjjMLw1e2RT7XD0v87AgaEBCSB8jq2mJ9b88waaQ+Eyznrp9eg"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-split.js" defer
        integrity="sha384-apx4JcddiGfbbtBSUh64m5AJRxayFbqoA/G95EAkIJ2mVkQ86qW09KktpezmUCnL"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-menubar.js" defer
        integrity="sha384-Qgml/KSOFV/l8aAUq3FJ6thK8Gfg3kGS/b9fpWhuphQVj367EzFud1M6yxlf9emR"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-disclose.js" defer
        integrity="sha384-DcuzeBBcA6OXHwa9frM4JcMAMdSnx93wnJvYxQG7obBLhTnJp2JggyPAojTQDcA5"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-zoom.js" defer
        integrity="sha384-X7J9vOnggyyA2PCm/3ssowfj2lxGjeW97Zzes2T8I0wvEBJ5Nb3Kga9THHPAavt+"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-rows.js" defer
        integrity="sha384-st3TkNtIIRXU2hzNWDhfXEuB5M1L6afgZF7W9eDr4FJD2Qal7itGSv5EioRa9KU+"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-tree.js" defer
        integrity="sha384-UWaHt5yvDSCWLR6ZM4ULz6gTzoIntuKcBOL3L7Ix1taLbOTr/f0RGo3sXhteautu"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.88.0/dist/pudl-grid.js" defer
        integrity="sha384-vrZRtYlMiXz5ku8IWZAQoUD9njds6obk8PTszhPGqQobfCbdY6oBTx8Da/AEcmoK"
        crossorigin="anonymous"></script>
```

Always name an exact release, as these examples do. jsDelivr also accepts a loose version such as `@v0` or `@latest`, but PUDL's changes are visual, and a page linked that way would change its look whenever a release lands, which is the surprise that pinning exists to prevent. The `integrity` attribute makes the browser refuse a file whose bytes differ from the release, so a pinned page cannot change even if the CDN misbehaves.

An application in production should still copy a release into its own tree. A CDN is a third party that sees every visitor's address, and it cannot be reached offline or from inside a closed network.

A project themes PUDL with its own stylesheet, loaded after `pudl.css`. It may replace the whole palette, background and topbar included, and it may change the fonts, within the restrictions below. The neutral graphite palette in `pudl.css` is a default that a project is free to replace.

A palette is the block of tokens at the top of `pudl.css` under "The palette": six for the page and text, seven for the accent and status colours, four for lighting and two for the topbar, each given once for the light theme and once for the dark. Every other token is derived from those, so a theme sets nothing else. Set them on `:root` and on `[data-theme="dark"]`, because that is where the derived tokens are computed.

The lighting tokens are what keep the raised and sunken surfaces readable on a new palette. `--light` is the colour of the light falling on a raised control and `--shade` the colour of its shadow. `--lit` sets how strongly the highlight shows and `--depth` how strongly the shadow does. A light theme usually wants a strong highlight and a soft shadow, and a dark theme the reverse. What stays constant from one project to the next is the grammar: a user who has learned what raised, sunken and flat mean in one application finds the same meanings in every other.

The smallest useful theme changes only `--accent` and `--accent-hover`. The accent reaches links, primary buttons, focus rings, filter chips, accent badges, the current list row's edge, selected table rows, a switch that is on, the active window and the dots on the window dock, so those two values alone make a project recognisably its own. `examples/brand.css` shows one, with separate values for the dark theme. `examples/slate.css` replaces the whole palette with a cool slate one and gives it a light topbar. `examples/parchment.css` restores the warm parchment and leather palette with serif headings that PUDL used by default up to 0.2.0.

A topbar containing `[data-menubar]` uses `--surface` in the light theme, with matching foreground colors for its menus and toolbar controls. Each menu group forms one slightly raised surface using the background fill, border, and shadow of a neutral button. Other topbars retain their separate theme colors and can stay dark on a light page. The brand and plain topbar links hover in `--tb-link-hover`, which a theme may override.

The topbar never widens the page. On a screen too narrow for the brand and its chrome on one line, the chrome moves to a second line, at the end, and wraps within itself if it must. A pill may carry a glyph with its words in a `.topbar-pill-label`, and on a phone it then shows only the glyph while its words are still heard, so a topbar with several pills stays compact:

```html
<a class="topbar-pill" href="/articles"><span class="glyph" style="--glyph: var(--glyph-document)" aria-hidden="true"></span><span class="topbar-pill-label">Articles</span></a>
```

The pill for the page the reader is on carries `aria-current="page"` and is pressed in, as the current tab of a dock or a segmented control is. A menu button on the topbar may hold its words in a `.menu-btn-label`, and a phone then cuts a long name short with an ellipsis rather than letting it widen the chrome.

The topbar can hold a site's main sections as **tabs**, as a browser puts its tabs in its title bar, between the brand and the chrome:

```html
<header class="topbar">
  <a class="brand" href="/">Example</a>
  <nav class="topbar-tabs" aria-label="Sections">
    <a href="/" aria-current="page">All</a>
    <a href="/articles">Articles</a>
  </nav>
  <div class="topbar-chrome">…</div>
</header>
```

The row stands on the topbar's bottom edge. The tabs the reader can go to are raised in the topbar's chip colours, and the tab marked `aria-current` stands flat and taller, covers the topbar's bottom border and takes the colour of what lies below it, so it opens into the page as a section tab opens into its content. That colour is `--bg`; a page whose content directly below the topbar sits on another colour sets `--section-current-bg` on the `.topbar-tabs`. On a phone the tabs take the topbar's last row and scroll sideways.

PUDL sets text in Inter, which it ships in `dist/fonts/` as variable upright and italic subsets selected by Unicode range, because Inter is not installed by default on Windows or macOS and a font loaded from a third-party server breaks offline and on an intranet. Until the file loads, and on any system where it cannot, the platform's own interface face stands in. Headings use Inter too. Machine values use the platform's monospace face.

An English page downloads only the Latin upright subset (71,284 bytes); italic text adds the Latin italic subset (75,824 bytes). Other scripts load on demand, and a remainder subset preserves characters outside the named script ranges. Since 0.70.0 these subsets keep the weights from 400 to 900, the optical size of text, and the OpenType features CSS can ask for by name, such as tabular numerals and fractions, which together make them about 55% smaller. Headings are drawn at the optical size of text rather than tightened for their size. `pudl-fonts-full.css` restores the whole font, as the family "Inter Full", for a project that wants the optical-size axis or Inter's character variants and stylistic sets, and `pudl-fonts-system.css` uses the platform's face instead (see [Smaller downloads](#smaller-downloads)). The original whole files remain available for existing direct links and as the build's input, but no stylesheet requests them. See [font subsetting](docs/FONTS.md) for rebuilding and verification.

## What a project may change

A theme may change any colour token and the font tokens, provided the result keeps these rules.

- **The three surfaces stay distinct.** A raised control must still read as raised against the surface behind it, a sunken field as sunken, and flat content as flat. A theme tunes this with the four lighting tokens and leaves the derived raised and sunken tokens alone.
- **Contrast meets WCAG 2.2 AA.** Body text needs 4.5:1 against its background. Control boundaries and focus indicators need 3:1 against what surrounds them (WCAG 1.4.11).
- **Status colours stay apart.** `--warn`, `--danger`, `--positive` and `--accent` must remain distinguishable from one another, and each still carries its glyph. `--positive` was called `--pr` before 0.16.0; a theme that sets `--pr` still reaches it.
- **Both themes exist.** A project supplies light and dark values for every token it changes.
- **Fonts keep their roles.** Body text uses a legible sans-serif interface face. Identifiers, versions, timestamps and other machine values use a monospace face. The display face for headings and the brand wordmark may be any legible face, serif included. Numerals stay tabular where numbers are data, and weights stay between 400 and 700.

The type scale, the spacing grid and the corner radii belong to the language and do not change per project.

## Type, spacing and headings

Every size PUDL sets comes from its type scale: `--text-2xs` (11px), `--text-xs` (12px), `--text-sm` (13px), `--text-md` (14px), `--text-base` (15px, body text), `--text-lg` (17px), `--text-xl` (20px), `--text-2xl` (24px) and `--text-3xl` (30px). PUDL gives `h1` to `h4` their sizes from the scale, in the display face, through `:where()`, which carries no weight, so any class a project or a component puts on a heading wins over it.

Spacing between and around components comes from the grid, `--space-1` to `--space-6`: 4, 8, 12, 16, 24 and 32 pixels. A control's own padding, such as a button's, is part of that control's fixed metrics rather than the grid.

## Section tabs

The section bar is a notebook, after the widget of the same name in desktop toolkits. The bar is a recessed band. Each tab the reader can go to is a raised tab standing on the band, because it can be pressed, and the tab for where the reader is, marked `aria-current`, is flat, a little taller and open at the bottom into the content below.

```html
<nav class="app-section-bar" aria-label="Sections">
  <a class="section-tab" href="/">All</a>
  <a class="section-tab" href="/articles" aria-current="true">Articles</a>
  <a class="section-tab" href="/links">Links</a>
</nav>
```

A section's own page marks its tab `aria-current="page"`, and a page inside the section, such as one article, marks it `aria-current="true"`, so every page shows which section it belongs to. The current tab takes `--section-current-bg`, which defaults to `--surface`, the colour of a master-detail toolbar; a page whose content sits directly on the page background sets it to `var(--bg)`, so that the tab still opens into what lies below it.

## The status area

The status area holds the icons of what runs in the background of an application, such as a queue waiting for the reader, and the reader's account. It is one raised group, last in the topbar's chrome, holding flat items that highlight under the pointer and press in. On a topbar with a menu bar it looks exactly like the menu bar's groups, and its items like their titles; without one, it takes the topbar's own colours, since the bar may be dark in the light theme. It is 30px tall either way, as a group is. Each item is a link or a button holding a glyph or a 24px picture, which may be round, since the group is what is raised, and optionally a badge or words in a `span`. An account with no picture shows the account glyph in the picture's place, as `<span class="glyph status-picture" style="--glyph: var(--glyph-account)" aria-hidden="true"></span>`. The account goes last.

```html
<nav class="status-area" aria-label="Status">
  <a class="status-item" href="/moderation" aria-label="Moderation: 3 waiting" title="Moderation: 3 waiting">
    <span class="glyph" style="--glyph: var(--glyph-comments)" aria-hidden="true"></span>
    <span class="badge warn" aria-hidden="true">3</span>
  </a>
  <a class="status-item" href="/account" aria-label="Your account"><img src="/me.png" alt=""></a>
</nav>
```

A badge that is empty, or `hidden`, is not shown, so a count of nothing is never drawn as 0. The badge is hidden from assistive technology, so the item's `aria-label` says what it means, and the host keeps the two in step; PUDL redraws nothing, since the stylesheet alone follows the host's changes. A badge on the topbar takes its colours from the topbar, so it reads whether the bar is dark or lightened by a menu bar. Running the work behind an item is the host's.

## Layout

Three classes arrange components in a page, a pane or a window, so a project need not write its own. `.vstack` places them one above another; `.hstack` places them side by side and wraps them onto further lines rather than widening its space; `.auto-grid` places them in equal columns, as many as fit at `--grid-min` (224px), and becomes one column below it. Each keeps its components in document order, puts `--space-3` between them unless `.gap-0` to `.gap-6` chooses another step of the spacing grid, and adds nothing around them. A row aligns its components with `.align-center`, `.align-end` or `.align-baseline`, which lines up fields of different heights by their labels, and `.push-end` on its last component pushes it to the end. `.span-all` makes a grid's component span its line. Layout has no surface, so nothing in it looks pressable.

```html
<form class="vstack">
  <div class="auto-grid">
    <div class="form-group"><label class="form-label" for="from">From</label><input class="form-input" id="from" type="date"></div>
    <div class="form-group"><label class="form-label" for="to">To</label><input class="form-input" id="to" type="date"></div>
  </div>
  <div class="hstack"><button class="btn btn-primary">Save</button><button class="btn push-end" type="reset">Clear</button></div>
</form>
```

## Settings panels

A settings panel is a column of cards, one for each group of settings, 12px apart and at most 720px wide, centred in a page or filling a window. Each card has its title, a muted description, its controls and a row of the buttons that act on that group; a status line under the row says what the last action did and takes no room while it is empty.

```html
<div class="settings-panel">
  <form class="card" method="post" action="/settings/reading">
    <h2 class="card-title">Reading</h2>
    <p class="card-desc">How stories open.</p>
    <label class="check"><input type="checkbox" name="windows" checked> Open stories in windows</label>
    <div class="settings-actions"><button class="btn btn-primary">Save</button></div>
    <p class="settings-status" role="status"></p>
  </form>
</div>
```

## Badges, chips and filter chips

- A **badge** (`.badge` with `warn`, `danger`, `positive` or `accent`) states an entity's state, and always leads with its glyph. `.badge.pr` is the old name for `.badge.positive`.
- A **chip** (`.chip`) names an attribute the thing carries, a tag or a trip, and is a plain neutral label.
- A **filter chip** (`.filter-chip`) is a filter in force. It is outlined, it may lead with a `.filter-chip-kind` label (formerly `.fc-kind`), and its `.filter-chip-x` is a small raised button that removes the filter.

## Form states

A form the server has refused comes back with every value the reader typed, a notice at the top saying what went wrong, and each wrong field marked:

```html
<div class="form-group">
  <label class="form-label" for="amount">Amount</label>
  <input class="form-input" id="amount" name="amount" value="-150" required
         aria-invalid="true" aria-describedby="amount-error amount-help">
  <p class="form-help" id="amount-help">As printed on the receipt.</p>
  <p class="form-error" id="amount-error">The amount must be a number greater than zero.</p>
</div>
```

- A field with `aria-invalid="true"` takes a danger border and a danger focus ring, and its `.form-error`, tied by `aria-describedby`, leads with the warning glyph, so the state never rests on the border's colour.
- A field with `required` gives its group's label an asterisk, drawn by the stylesheet and hidden from assistive technology, which hears "required" from the field itself.
- `.form-help` is a field's help text, sometimes called a hint: muted text under the field, tied to it by `aria-describedby`.
- `.form-fieldset` with a `legend` groups related choices, and `.form-options`, or `.form-options.inline`, lays out their `.check` labels, radio buttons included.
- `.form-file` on a file input makes its button raised like any other.
- A `.form-select` inside a `span.form-select-wrap` is drawn by PUDL: the browser's own drawing is turned off, and the wrap draws the opener, the caret glyph in the select's text colour, at its end edge. Without the wrap, the browser draws the select, and WebKit draws it raised and lit and clips its text, so every select should have one. A select with `multiple` or `size` shows its rows in the page and has no opener.

```html
<div class="form-group">
  <label class="form-label" for="trip">Trip</label>
  <span class="form-select-wrap"><select class="form-select" id="trip" name="trip">…</select></span>
</div>
```

## Combo boxes and searchable selects

A combo box (0.72.0) is a field the reader may type any value in, or fill from a list of suggestions, as a Windows combo box is. Its markup is a native input with a `datalist`, in a `.combo`:

```html
<label class="form-label" for="sign">Currency sign</label>
<span class="combo">
  <input class="form-input" id="sign" name="sign" list="signs" autocomplete="off">
  <datalist id="signs">
    <option value="₱" data-combo-keys="PHP, Philippines">PHP · Philippine peso</option>
    <option value="HK$" data-combo-keys="HKD, Hong Kong">HKD · Hong Kong dollar</option>
    …
  </datalist>
</span>
```

Without a script the browser draws its own list, so the field works as it stands. The optional `pudl-combo.js` draws PUDL's instead: a raised opener inside the field's border at its end, behind a hairline, because it is pressed while the field is typed in, and a list drawn as a menu, each suggestion's value with its text on a second line, the one the field holds ticked. Typing filters the list by value, text and keys. Down and Up move through it, Alt+Down opens it without moving, Enter chooses, Escape closes it and then clears the field, and Tab leaves with what was typed. Choosing fires `input` and `change` on the field. The opener shows the whole list.

What the reader types to find a suggestion need not be what it puts in the field. An option's `data-combo-keys`, separated by commas, are words to find it by that are not shown, so typing PHP, peso or Philippines finds the first row above, and choosing it puts ₱ in the field. Leaving the field, or pressing Enter, with exactly a key or a value typed that only one suggestion has looks that suggestion up and puts its value in, so a reader with no ₱ on the keyboard types PHP and gets ₱; text several suggestions share, such as kr for three currencies, stays as typed. Put the code in the option's text as well as in its keys: the text shows the reader why a row was found and tells apart rows with the same sign, and the key is what an exact code looks up.

A searchable select is a select whose value must be one of its options, marked `data-combo`:

```html
<span class="form-select-wrap"><select class="form-select" id="currency" name="currency" data-combo>…</select></span>
```

Without the script it is a plain select. With it, a combo box stands in its place and filters as the reader types, the select's label moves to the field, and the hidden select keeps the value, fires `input` and `change` and is what the form sends. Leaving with text that names no option puts the choice back. After setting the select's value from a script, call `pudlCombo.refresh(select)`.

`data-combo-src` on the `.combo`, or on the select, is an address on the page's own origin with `{q}` for what is typed. After a pause in typing the script asks it and puts the `option` elements it returns, as `text/html`, into the list, taking only each option's value, text and keys; a searchable select keeps its chosen option among them. `data-combo-complete` on the field or the select completes a match as the reader types, which is off unless asked for. In a toolbar the field keeps its own keys, and the arrow keys pass over the opener, which carries `data-toolbar-skip`, the mark that keeps any control out of a toolbar's arrow order. `samples/combo.html` has every case to try.

## Progress bars and meters

A progress bar and a meter (0.74.0) are the native `<progress class="progress">` and `<meter class="meter">`, drawn by `pudl.css` alike in every browser: a flat bar 16px tall, always with words. In a `.progress-row` or `.meter-row` the bar stands beside its `.progress-value` or `.meter-value` under its `.progress-label` or `.meter-label`.

```html
<div class="progress-row">
  <span class="progress-label" id="up-name">Uploading receipts</span>
  <progress class="progress" value="42" max="100" aria-labelledby="up-name"></progress>
  <span class="progress-value">42%</span>
</div>
<div class="meter-row">
  <span class="meter-label" id="fuel-name">Fuel</span>
  <meter class="meter" min="0" max="100" low="20" high="50" optimum="90" value="35" aria-labelledby="fuel-name"></meter>
  <span class="meter-value">35%</span>
</div>
```

A progress bar with no `value` slides a block and says "Working…" in its words; with reduced motion the block stands still. A meter's own `low`, `high` and `optimum` say which end is bad and where the bands begin, so a low fuel level and a high pollution level are both marked bad. With the optional `pudl-fields.js` a meter takes the band's colour, positive, warn or danger, and its words lead with the warning or the stop glyph; `.meter.marks` keeps the accent and marks its thresholds instead. A progress bar needs no script.

## Sliders, number fields and password fields

These three (0.74.0) take `pudl-fields.js`, and each is the browser's own control without it.

```html
<div class="range-row"><input class="form-range" type="range" id="w" min="0" max="100" value="40"><output for="w">40</output></div>
<span class="number-field"><input class="form-input" type="number" name="guests" min="0" max="20" step="1" value="3"></span>
<span class="password-field"><input class="form-input" type="password" name="password"></span>
```

A slider's track is sunken and filled with the accent to its value, and its thumb raised; the script keeps an `<output for>` showing the value in the page's language. A number field is shown as a text field with its digits at the end and raised minus and plus keys inside its border, reading and writing numbers in the page's language, 1.234,5 in German, while the hidden original sends a plain number; it refuses letters, snaps to its step, keeps to its range, steps with Up and Down, Page Up and Page Down by ten, the keys held down, and the wheel only while it has focus and the pointer is over it. A password field gains a Show key, pressed in while the password shows, or the eye glyph with `data-password-toggle="glyph"`, and a line that says when Caps Lock is on; pasting is never blocked. `pudlFields.refresh(el)` shows a value a script has set.

## Images, figures and avatars

A `.figure` (0.74.0) holds an `img` with its `width` and `height`, which keep its frame's proportion before it loads, and a `figcaption`. `.figure.caption-over` lays the caption over the picture's foot, `.figure.plain` drops the frame, and `.figure.contain` fits the picture inside it. A picture that fails shows its `alt` under the image glyph rather than the browser's broken picture.

```html
<figure class="figure"><img src="receipt.jpg" alt="The receipt on a café table" width="1600" height="900" loading="lazy"><figcaption>Photographed at check-out.</figcaption></figure>
<span class="avatar-wrap"><span class="avatar" role="img" aria-label="Ana Reyes">AR</span><span class="avatar-status" data-status="online" aria-label="Online"></span></span>
```

A `.avatar` is a person's or an agent's initials, or an `img` with empty `alt`, in a neutral circle of 32px, or 24px (`.sm`), 40px (`.lg`) and 64px (`.xl`); a picture that fails gives way to the initials. `.avatar.tint` takes a soft tint from the name. A status mark has a shape as well as a colour: online a filled circle, away a half-filled one, busy a minus, offline a ring.

## List boxes

A list box (0.74.0) is a native `<select class="form-select" multiple size="6">`, or one without `multiple` and with a `size` above 1, marked `data-listbox`. Without a script it is the browser's list. With the optional `pudl-listbox.js` the select is hidden, keeps the value, the name, `required` and `disabled`, and is what the form sends, and a sunken list stands in its place, as many rows tall as `size`, each row carrying a check box where several may be chosen and a radio button where one may. An `optgroup` heads its rows. A press or Space switches one row and leaves the rest, so nobody needs Ctrl to choose several; Shift with a press or a key sets a range; Ctrl+A, or Command+A, chooses all, or none when all are chosen. In a single-choice list the choice follows the arrow keys. Letters jump to the rows they begin. `pudlListbox.refresh(select)` shows a choice a script has set.

## Token fields

A token field (0.74.0) is a combo box marked `data-combo-tokens`, whose values `pudl-combo.js` gathers as chips below the field, each with its remove key. The form receives the values joined by `data-combo-separator`, a comma unless it says otherwise, which is also what a reader types without the script.

```html
<label class="form-label" for="tags">Tags</label>
<span class="combo" data-combo-tokens data-combo-separator=";">
  <input class="form-input" id="tags" name="tags" list="tag-options" value="receipts; q4">
  <datalist id="tag-options">…</datalist>
</span>
```

Enter, the separator, Tab or leaving the field adds what is typed, and a value already there flashes its chip instead of being added again. Pasting splits at the separator and new lines, or at commas and new lines where the separator is not in the text. Backspace in the empty field, or a press on a chip's words, takes that value back into the field to edit; Escape puts it back. Left in the empty field moves along the chips, where Delete removes one and F2 edits it. Suggestions and keys work for each value as in a combo box, and `data-combo-max` limits the count.

**Checking and setting values** (0.80.0). Before each value is added, however it comes, `pudl:token-check` fires on the input with the value, `refuse(message)` and `replace(value)`. A refused value the reader gave stays in the field, which is marked invalid, with the message under it as a form error until the reader changes the text; a replaced value is added in its place, and repeats are found after the replacement:

```js
const input = document.getElementById('blocked');
input.addEventListener('pudl:token-check', e => {
  const v = e.detail.value.toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v)) e.detail.refuse('Enter a domain, such as example.com');
  else e.detail.replace(v);
});
const t = pudlCombo.tokens(input);
t.set(savedList);              // false if anything was refused
t.add('example.com');          // true if added
t.remove('example.com');       // true if removed
t.values();                    // the values, as an array
```

A script's changes are checked as the reader's are and redraw the chips, but fire no change event, as setting a native input's value fires none, so two fields kept in step never echo each other. `pudl:token-refused` lists what was refused, with `source` saying whether the reader or a script gave it.

## Date and time fields

A date or time field (0.74.0) is a native `<input type="date">` or `<input type="time">` marked `data-date`. Without a script it is the browser's own field. With the optional `pudl-date.js` the original is hidden, keeps the value and the name and is what the form sends, always ISO 8601 in the Gregorian calendar, and a text field with a raised opener inside its border stands in its place, as a combo box does:

```html
<label class="form-label" for="due">Due</label>
<input class="form-input" type="date" id="due" name="due" value="2026-10-22" min="2026-01-01" max="2026-12-31" data-date>
<label class="form-label" for="at">Starts</label>
<input class="form-input" type="time" id="at" name="at" value="13:30" step="900" data-time-list="15" data-date>
```

The field shows its value in the language of the nearest `lang` and in that language's calendar, Japanese eras, Thai years, the Hijri, Hebrew and Persian calendars included, and in ISO 8601 with a 24-hour clock where no `lang` is given. `data-date-style` asks for `iso`, `short` (numbers, the default), `medium` or `long` (the month by name). The reader types however they are likely to: ISO, the language's order, a four-digit year first, month names, "t" or the language's word for today, "+3" for three days on, digits of any script, an era's name or initial; and for times "9", "930", "9pm" or "21:30". The echo line under the field says back in words what it understood, "Thursday, 1 February 2026", so 01/02 is never read the wrong way, shows an example while the field is empty, and says why when it refuses. The calendar's month and year key opens a chooser of months and years, for a distant date, with Today and Clear at its foot; the week starts on the language's day; the chosen day is pressed in and today ringed. A time field's list is at `data-time-list` minutes, any whole number such as 5, 6 or 30, or at the field's step, or every 30 minutes. The wheel steps a focused time by its step or a minute, and the chooser's year by one, only while the pointer is over it. `pudlDate.refresh(input)` shows a value a script has set. `datetime-local` is left to the browser.

## Tabs within a page

Tabs within a page switch between panels of one thing in place, where section tabs go to other addresses. They follow the ARIA tab pattern and look like section tabs, since to the reader both are tabs.

```html
<div class="tabs">
  <div class="tablist" role="tablist" aria-label="Expense">
    <button role="tab" id="tab-details" aria-controls="details" aria-selected="true">Details</button>
    <button role="tab" id="tab-receipt" aria-controls="receipt">Receipt</button>
  </div>
  <section role="tabpanel" id="details" aria-labelledby="tab-details">…</section>
  <section role="tabpanel" id="receipt" aria-labelledby="tab-receipt">…</section>
</div>
```

With the optional `pudl-tabs.js`, one panel shows at a time; a tab is chosen by pressing it, or with the arrow keys, Home and End once the list has focus; the list is one stop in the Tab order; and the chosen panel's id is the address's fragment, so `…#receipt` opens that panel and a reload keeps it. The fragment is replaced, not pushed, so switching panels does not fill the history. Without the script the tab list is hidden and every panel shows, one after another.

Tabs in a dialog or a window keep one size (0.71.0). Every panel is laid in the same place, and the ones not chosen are kept out of sight rather than out of the layout, so the tab set is as large as its largest panel and choosing a tab never resizes or moves the dialog or the window. A panel out of sight still cannot be seen, focused, found in the page or reached by assistive technology. In a dialog, a `.tabs` that is a child of the `dialog`, or of a `form` that is, reaches the dialog's sides: the bar runs from edge to edge under the title, and the panels take the dialog's colour and padding. In a window, a `.tabs` that is the whole of the `.win-body` fills it: the bar runs from edge to edge under the title bar, the chosen panel takes the rest of the body and scrolls on its own, and a window that sizes to its content is as large as its largest panel. Elsewhere, `data-tabs-size="largest"` on the `.tabs` asks for the same sizing, and in a dialog or a window `data-tabs-size="each"` lets the tab set follow each panel's size instead. [Building screens](docs/BUILDING-SCREENS.md) has the tabbed settings window and dialog in full.

## Document tabs

Tabs that come and go, one per open document, record or view, as in an editor, are a `.tablist.doc-tabs`, so they look like every other tab:

```html
<div class="tablist doc-tabs" role="tablist" aria-label="Open files">
  <a role="tab" href="?file=today.md" aria-selected="true">today.md<span
     class="doc-tab-dirty">unsaved</span><span class="doc-tab-close" aria-hidden="true"></span></a>
  <a role="tab" href="?file=notes.md" aria-selected="false">notes.md<span
     class="doc-tab-close" aria-hidden="true"></span></a>
</div>
```

Which document is open is the host's state, so a tab is a link to the address that shows its document, or a button the host handles. A `.doc-tab-dirty` mark shows as a dot in the accent, while its words, here "unsaved", are heard by assistive technology rather than seen. A `.doc-tab-close` is a small raised button drawn inside the tab and hidden from assistive technology, because a tab list may hold only tabs.

With `pudl-tabs.js`, the list is one stop in the Tab order, on the selected tab; the arrow keys, Home and End move focus along it, and Enter or Space chooses, as the tab itself does. Pressing a tab's close button, or Delete on the focused tab, fires `pudl:tab-close` on the tab rather than following it, so the host can ask about unsaved changes before it removes the tab.

## Code

Selection actions and margin notes are optional in 0.85.0. Load `pudl-annotations.js` for a button bar beside selected text or notes beside stationary content, with numbered passage markers in narrow containers. Applications own the actions and persistence. See [the annotation contract](docs/ANNOTATIONS.md) and [the example](samples/annotations.html).

A code block is for reading, so it is flat: `pre.code`, a tinted panel in the monospace face with no shadow. An editor's surface takes input, so it is sunken like a field: `.code-surface` on the element the editor draws into. A code block whose lines may run past its width scrolls sideways, so it carries `tabindex="0"`, for a reader who scrolls by keyboard, and PUDL draws its focus ring.

Highlighted code takes its colours from ten syntax tokens, `--syntax-keyword`, `--syntax-string`, `--syntax-number`, `--syntax-comment`, `--syntax-name`, `--syntax-tag`, `--syntax-attr`, `--syntax-heading`, `--syntax-link` and `--syntax-error`, set for both themes, each reaching 4.5:1 on every surface a code block or editor sits on. A theme may set them, and should keep that contrast. The optional `pudl-hljs.css` maps highlight.js's classes onto them, in place of a highlight.js theme:

```html
<link rel="stylesheet" href="pudl-hljs.css">
<pre class="code"><code class="language-js">…</code></pre>
```

PUDL does not carry CodeMirror, but CodeMirror 6 takes the same tokens through a `HighlightStyle`, and the editor's surface through `.code-surface`:

```js
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const pudlHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: [tags.string, tags.regexp], color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--syntax-number)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: 'var(--syntax-name)' },
  { tag: [tags.tagName, tags.typeName], color: 'var(--syntax-tag)' },
  { tag: [tags.attributeName, tags.propertyName], color: 'var(--syntax-attr)' },
  { tag: tags.heading, color: 'var(--syntax-heading)', fontWeight: '700' },
  { tag: [tags.link, tags.url], color: 'var(--syntax-link)', textDecoration: 'underline' },
  { tag: tags.invalid, color: 'var(--syntax-error)' }
]);
// new EditorView({ extensions: [syntaxHighlighting(pudlHighlight), …], parent: surface }),
// where surface is an element with class="code-surface".
```

Because the colours are CSS variables, a theme change reaches the editor at once, with no new highlight style.

### Copying and downloading code

A reader who wants a listing should not have to select it by hand, which is awkward for a long one and nearly impossible on a phone. A code block marked `data-code-actions` gains, with the optional `pudl-code.js`, a strip above the code that names its language and holds two small raised buttons, Copy and Download:

```html
<pre class="code" data-code-actions data-code-filename="exercise-0-0.cpp"><code class="language-cpp">…</code></pre>
```

- **Copy** puts the code's text on the clipboard, never its highlighting. The button's glyph turns to a check for two seconds, and a live region says "Copied". Where the clipboard is unavailable or refused, the script selects the code instead and says how to copy it by hand.
- **Download** saves the code as a file named from `data-code-filename`, else `code` with an extension for the language, else `code.txt`.

The strip is flat, as the code is, and stays outside the `pre`, whose content is text. Without script the block is the plain `pre.code` it was. The strip's language name and the download's extension come from `pudlCode.names` and `pudlCode.extensions`, which cover about thirty common languages and to which a project adds its own; `pudlCode.words` holds the words the script writes, for a page in another language. `pudlCode.enhance(scope)` takes in blocks added by other means, and `pudlCode.enhance(pre)` takes a single block, marked or not, which is how a site whose Markdown writes a bare `pre` takes part. Enhancing a block twice changes nothing. `pudl:code-copy`, with `detail.ok`, and `pudl:code-download`, with `detail.name`, fire on the `pre` after each action.

PUDL also has `.visually-hidden`, for words meant for assistive technology alone, such as the strip's live region.

## Empty and loading states

An `.empty-state` says there is nothing here and what to do about it, with a drawn glyph, an `.empty-state-title`, an `.empty-state-body` and perhaps `.empty-state-actions`. A `.loading` element with `role="status"` pairs a `.spinner` with words, so it is announced and never rests on the animation alone; with reduced motion the spinner stops. A data table with no rows uses its own `.data-table-empty` row instead.

## Tooltips

The optional `pudl-tooltip.js` shows a tooltip naming a control that shows only a glyph: any element with `data-tooltip`, and PUDL's own glyph-only controls (icon buttons, window buttons, dismiss buttons, a filter's apply button and a filter chip's ×) from their `aria-label`. It appears after a moment of hover, or at once on keyboard focus; it stays while the pointer moves onto it; Escape dismisses it; and it sits above the control, or below when there is no room. A `title` on the same control is moved into `data-tooltip` so the browser does not show a second one. A tooltip only names or briefly describes; anything the reader must read belongs on the page.

## Pagination

A long list comes in pages, each an address such as `?page=3`:

```html
<nav class="pagination" aria-label="Pages of expenses">
  <span class="pagination-summary">Showing 21 to 40 of 132</span>
  <a class="page-link" href="?page=1" rel="prev">Previous</a>
  <a class="page-link" href="?page=1">1</a>
  <a class="page-link" href="?page=2" aria-current="page">2</a>
  <a class="page-link" href="?page=3">3</a>
  <a class="page-link" href="?page=3" rel="next">Next</a>
</nav>
```

Page links are raised small buttons, and the current page is pressed in, since the reader is already there. Previous and next carry glyphs, mirrored on a right-to-left page, and at either end are marked `aria-disabled="true"` with no `href`. With `pudl-regions.js`, a pagination inside a region pages the list without disturbing anything else.

## Steppers

A stepper (0.74.0) shows the steps of a task that takes several pages: which are done, which one the reader is on, and which are to come, each told by its mark's shape as well as its colour.

```html
<ol class="stepper" aria-label="Add a configuration">
  <li class="done"><a href="?step=1">Client<span class="visually-hidden"> (done)</span></a></li>
  <li aria-current="step"><span>Languages</span></li>
  <li><span>Review</span></li>
</ol>
```

A done step is the tick on an accent circle and a link back to its page, the current step its number in a heavy accent ring with its name in bold, and a step to come its number in a light ring with its name muted. The steps run across, joined by lines that take the accent after a done step, and on a narrow screen only the current step keeps its name in sight. `.stepper.vertical` runs them down the side, the current one lit as a list's current row.

## Data tables

A data table lists many records, one per row, inside a `.data-table-wrap` that scrolls sideways when the columns outrun the space and keeps the header in view.

```html
<div class="data-table-wrap">
  <table class="data-table stack">
    <thead><tr>
      <th aria-sort="none"><a href="?sort=name">Expense</a></th>
      <th aria-sort="descending"><a href="?sort=date&dir=asc">Date</a></th>
      <th class="num" aria-sort="none"><a href="?sort=amount">Amount</a></th>
    </tr></thead>
    <tbody><tr>
      <td data-label="Expense"><a href="/expenses/12">Hotel, Makati</a></td>
      <td data-label="Date"><time datetime="2026-10-19">2026-10-19</time></td>
      <td class="num" data-label="Amount">21,600.00</td>
    </tr></tbody>
  </table>
</div>
```

- A column the reader can sort by has `aria-sort` on its header, and a link inside it to the address of the other order. The header is raised, since pressing it re-sorts, and shows two small arrows while the column is not the sort and one arrow for its direction when it is. Sorting is an address, so it works without script and can be shared.
- Columns of numbers carry `.num` and align to the end.
- A row is selected by a checked checkbox in a `.data-table-check` cell, or in a grid by `aria-selected="true"`, and shows a tint and an accent edge at its start. ARIA allows `aria-selected` on a row only in a grid, below.
- A `.data-table-empty` row, with one cell spanning the columns, says there is nothing to show.
- With `.stack`, a wrap 560px wide or less shows each row as a small card of labelled values, the labels from each cell's `data-label`; without it, a narrow table scrolls sideways.

## Rows to choose from

A table whose rows are choices, such as a file list, an inbox or a picker, is a grid: `role="grid"` on the `.data-table`, with each row's first link its own address, so that without script the table is a list of links.

```html
<table class="data-table" role="grid" aria-label="Contents">
  <thead>…</thead>
  <tbody>
    <tr aria-selected="true"><td><a href="?open=notes.md">notes.md</a></td>…</tr>
    <tr aria-selected="false"><td><a href="?open=todo.md">todo.md</a></td>…</tr>
  </tbody>
</table>
```

With the optional `pudl-grid.js`, the grid is one stop in the Tab order, on the selected row. Selection follows focus, which Up, Down, Home, End, Page Up and Page Down move, and Enter or a double-click opens the row by following its first link, so a link that opens a window or swaps regions does just that. A row with no link fires `pudl:row-open` on the row instead, for the host to act on, and every change of selection fires `pudl:row-select`. The selection is single. The links inside a row leave the Tab order, because the row stands for them, so a row's other actions belong on a toolbar that acts on the selected row, as a file manager's do. `pudlGrid.enhance(table)` takes in rows a script has added.

## Trees and path bars

A tree is a hierarchy of places, such as folders or nested categories, written as nested lists of links, so that without script it is an indented list the reader can follow and every node is an address.

```html
<ul class="tree" aria-label="Folders">
  <li><a href="?path=/" aria-expanded="true">site</a>
    <ul>
      <li><a href="?path=/articles" aria-expanded="false">articles</a>
        <ul>…</ul></li>
      <li><a href="?path=/about.md" aria-current="page">about.md</a></li>
    </ul></li>
</ul>
```

The server marks each node that has children with `aria-expanded` on its link, `"true"` or `"false"`, and the current node with `aria-current`. Without script every branch shows. The optional `pudl-tree.js` turns the list into the ARIA tree pattern, following the WAI-ARIA navigation tree: the links become tree items and the tree one stop in the Tab order; Up and Down move between the nodes showing; Right opens a node or moves into it and Left closes it or moves to its parent, mirrored on a right-to-left page; Home and End go to the ends; typing a node's first letters moves to it; and Enter follows the link. Each node with children gains a small raised toggle that opens and closes it by pointer. `pudl:tree-toggle` fires on a node's link as it opens or closes, with `detail.open`, so a host can remember which nodes are open, or fill in a branch as it opens and call `pudlTree.enhance(tree)` to take the new nodes in.

The nodes are flat, as list rows are, because they are places to go, and the current node carries the current row's accent edge and bold.

A **path bar** says where the reader is inside a hierarchy they are browsing, such as the folder a file manager shows:

```html
<nav class="path mono" aria-label="Location">
  <ol>
    <li><a href="?path=/">site</a></li>
    <li><a href="?path=/articles">articles</a></li>
    <li><span aria-current="location">coincidences.md</span></li>
  </ol>
</nav>
```

It is for a browsed hierarchy only. A site's own sections are its tabs, and a record's way back is its back link, so a path bar is never a site's breadcrumb trail. The separators are drawn, and assistive technology hears the list rather than them. `.mono` sets the path in the monospace face, for file paths.

## Glyphs as elements and drop targets

Any glyph token can be drawn as an element with `.glyph`, in the colour of the text around it and at its size, unless `--glyph-size` says otherwise:

```html
<span class="glyph" style="--glyph: var(--glyph-folder)" aria-hidden="true"></span> drafts
```

A glyph beside words that already say what it shows is `aria-hidden`; one that stands alone carries `role="img"` and an `aria-label`. For lists of files and documents there are `--glyph-folder`, `--glyph-file`, `--glyph-document`, `--glyph-app`, `--glyph-script`, `--glyph-link` and `--glyph-home`. They carry no colour of their own, because the shape says the kind; PUDL's colours are for state. `--glyph-gear` marks settings and an applet's Commands button, and `--glyph-tick` marks a menu command that is switched on.

A **drop target** is styled by PUDL and run by its host, since what may be dropped where is the application's rule. While something is dragged over a place it may land, the host sets `data-drop-over` on a `.drop-zone`, or `data-drop-target` on an item such as a folder's row, and PUDL rings it in the accent. A `.drop-hint` inside a zone says what dropping there will do, and shows only while something is over it.

```html
<div class="drop-zone" data-drop-over>
  …the list…
  <p class="drop-hint">Drop text files here to upload them</p>
</div>
```

## Notices and toasts

A **notice** is a message that stays on the page until it is dealt with. A **toast** is a passing confirmation that leaves by itself. Both come in four kinds, information by default and `.positive`, `.warn` and `.danger`, and each kind leads with its own glyph and a coloured edge.

```html
<div class="notice danger" role="alert">
  <div class="notice-content">
    <p class="notice-title">The expense could not be saved</p>
    <p class="notice-body">The amount must be a number greater than zero.</p>
    <div class="notice-actions"><a class="btn btn-sm" href="#amount">Edit the amount</a></div>
  </div>
  <button class="notice-close" type="button" aria-label="Dismiss"></button>
</div>
```

The close button is optional. An error the reader must act on is always a notice, never a toast, because a toast goes away.

Toasts gather in a `.toast-region` at the foot of the window, a live region, so screen readers announce each one. With the optional `pudl-toast.js`, a script raises one with `pudlToast('Expense saved.', { kind: 'positive' })`, and a server renders one as `<div class="toast positive"><p class="toast-text">Expense saved.</p></div>` inside the region, typically after a form posts and redirects. A toast leaves after five seconds, or `data-toast-ms`, and waits while the pointer or focus is on it; `data-toast-sticky` keeps it until dismissed. A live region does not announce what was on the page when it loaded, so the script re-inserts the server's toasts a moment after load, which makes them heard.

Content that arrives later can carry toasts too. A window's body fetched after the page loaded, or regions swapped in, may hold a `.toast`, usually `hidden` so it does not flash where it stands; the script moves it into the region, shows it and announces it, adding a dismiss button if it has none. A server can then render the same toast after a redirect whether the reader is on a page or in a window.

## Dialogs

A dialog is a native `<dialog class="dialog">` that the server renders into the page, opened with `showModal()`, or by a button carrying `command="show-modal"` and `commandfor` naming it. The browser keeps focus inside it, closes it on Escape and draws its backdrop, which PUDL dims to 40% while the panel's shadow does the lifting. A `<form method="dialog">` inside it closes it on submission, with the pressed button's value as the dialog's `returnValue`, and needs no script.

```html
<button class="btn btn-danger" commandfor="discard" command="show-modal">Discard changes…</button>
<dialog class="dialog" id="discard" aria-labelledby="discard-title">
  <h3 class="dialog-title" id="discard-title">Discard unsaved changes?</h3>
  <p class="dialog-body">Leaving now will lose your changes.</p>
  <form class="dialog-actions" method="dialog">
    <button class="btn" value="stay" autofocus>Stay</button>
    <button class="btn btn-danger" value="discard">Discard changes</button>
  </form>
</dialog>
```

The command attributes are newer than PUDL's 2024 browser floor, so the optional `pudl-dialog.js` supplies them where a browser lacks them. The older markup, a `.dialog` panel inside a `.dialog-backdrop` that a project's script shows, still works.

When a dialog's content is taller than the window, its title and its `.dialog-actions` stay in view and only the content between them scrolls (0.65.0). Both are bands that stick to the panel's edges, so the markup does not change, and the actions may be the dialog's own or sit in a form that wraps the fields or the whole dialog. A `.dialog-head` around the title keeps a control that goes with it, such as a filter, in view as well. A line separates a band from the content only while content is hidden beneath it. `pudl-dialog.js` works that out, and it also sets the dialog's scroll padding to the bands' measured heights so that a focused field is scrolled clear of them. Without the script the bands still stay in view, with no lines, and the scroll padding is an estimate. The actions keep 24px between them and whatever comes before them, a list or a table as well as the body.

A dialog's head and actions are pinned by default. A dialog that reads better scrolled as one, its title and actions with its content, is marked `data-dialog-pin="none"` (0.74.0).

## Popovers

A popover (0.74.0) is a panel of any content anchored to the control that opened it, such as a small form, a help text or an item's details: not a menu, and not modal. It is an HTML popover, so Escape and a press outside close it without a script, and `pudl-menu.js` places it against its control as a menu is placed, takes focus into its first field, and gives focus back to the control when it closes.

```html
<button class="btn" type="button" popovertarget="filter">Filter…</button>
<div class="popover" id="filter" popover role="dialog" aria-label="Filter the expenses">
  <div class="form-group">…</div>
  <div class="popover-actions"><button class="btn btn-sm btn-primary" type="button">Apply</button></div>
</div>
```

`.popover.pointer` points at its control, for controls that sit close together. A `.popover-head` holding an `h2.popover-title` and a `button.icon-btn.popover-close` with `popovertarget` and `popovertargetaction="hide"` gives it a title and a close key. Its head and its actions stay in view while what lies between them scrolls, as a dialog's do.

## Names that changed

These old names keep working until 2.0, and new work should use the new ones.

| Old | New |
|---|---|
| `--pr` | `--positive` |
| `.badge.pr` | `.badge.positive` |
| `.fc-kind` | `.filter-chip-kind` |
| `.active` on a tab, segment or row | `aria-current`, `aria-pressed` or `aria-checked` |
| `.dialog-backdrop` with a script | `<dialog class="dialog">` |

Pin a release rather than tracking the default branch. A change to PUDL reaches a project when that project copies a newer tag, and never by surprise.

## Toggle buttons, disclosure buttons and hidden elements

A **disclosure button** shows or hides content in place, such as a note under a toolbar. It is a `.btn.disclosure` with `aria-expanded` and `aria-controls`, and it carries the chevron glyph after its words, pointing down while the content is hidden and up while it is shown, turning without motion when the reader asks for reduced motion. It does not latch, since the chevron says its state. The project's script flips `aria-expanded` and the content's `hidden`.

```html
<button class="btn btn-sm disclosure" type="button" aria-expanded="false" aria-controls="note">Note</button>
<div id="note" hidden>…</div>
```

A button that latches, such as a mode switch, is a `.btn` with `aria-pressed`. While the attribute is `"true"` the button stays pressed in, and the same attribute tells assistive technology that it is on. The project's own script flips it; a group of mutually exclusive choices is a segmented control instead. A primary button may latch too, such as a flash card's Reveal: latched, it keeps its accent fill and its text and loses its lift, pressed in rather than darkened, so its label reads in both themes.

The `hidden` attribute always hides an element, even a component that sets its own `display`, because `pudl.css` gives it `display: none !important`. The one exception is `hidden="until-found"`, which the browser hides in its own way so that in-page search can still reveal it.

## Split buttons

A split button (0.74.0) does its usual thing when its main key is pressed, and offers the alternatives from a menu button joined to its end, the two sharing a border so the reader sees two things to press. The menu button holds only the caret, its accessible name says what it offers, and its menu lines up under the whole button. Both keys are of one kind, plain or primary.

```html
<span class="split-btn">
  <button class="btn btn-primary" type="submit">Save</button>
  <span class="menu">
    <button class="btn btn-primary menu-btn" type="button" popovertarget="save-more" aria-label="More ways to save"></button>
    <nav class="menu-panel" id="save-more" popover aria-label="More ways to save">…</nav>
  </span>
</span>
```

## Context menus

A right-click, Shift+F10 or the Menu key fires `pudl:contextmenu` (0.74.0) on what was under the pointer or what has focus, bubbling, and whatever answers by calling `event.detail.add(rows)` gets a context menu of those rows at the point, in place of the browser's own. Where nothing answers, the browser's menu opens as always, and Shift with a right-click always gives the browser's, with its spelling suggestions. `pudl-menu.js` draws it.

```js
editor.addEventListener('pudl:contextmenu', e => e.detail.add([
  { label: 'Cut', shortcut: 'Mod+X', glyph: 'strike', run: cut },
  { label: 'Copy', shortcut: 'Mod+C', glyph: 'copy', run: copy },
  { label: 'Paste', shortcut: 'Mod+V', glyph: 'clip', disabled: !canPaste, reason: 'The clipboard is empty.', run: paste },
  '-',
  { label: 'Wrap lines', checked: wrap, run: toggleWrap },
  { label: 'Insert', items: [{ label: 'Link', run: link }, { label: 'Table', run: table }] }
]));
```

A row is a menu bar's row: `label`, `run`, `disabled` with its `reason`, `checked` (with `radio`), `danger`, `detail`, `shortcut`, `glyph` (a glyph token's name) and `items` for a submenu, or `'-'` for a separator, or a command's id where `pudl-commands.js` is loaded. A shortcut is shown in the platform's form and bound by nothing, since the key belongs to whatever owns it. The detail also carries `x`, `y`, `keyboard` and `target`. `pudlMenu.openAt(x, y, rows, { owner, label, for })` opens one from a script, and `pudlMenu.closeContext()` closes it. Up and Down move, wrapping; a letter goes to the next row starting with it; Right and Left open and close a submenu; Enter and Space choose; Escape closes a level; focus returns where it was.

A handler should also say which element the menu is for, with `event.detail.mark(element)` (0.76.0), or `for` when a script calls `openAt`. The event's `target` is whatever was under the pointer, often a word or a glyph inside a row, so only the page knows which element is the row. While the menu is open that element has `data-menu-for`, set to the menu's id, and the stylesheet keeps it lit as a row under the pointer is, so the reader can still see which row the commands act on after moving into the menu. Call it whether the pointer or the keyboard opened the menu, since focus leaves the row in both cases. The mark goes when the menu closes, however it closes, and only one element is marked at a time. The rule is `:where([data-menu-for])`, with no weight, so a component whose rows have their own hover look restyles `[data-menu-for]` as it does `:hover`.

```js
tree.addEventListener('pudl:contextmenu', e => {
  const row = e.detail.target.closest('a');
  if (!row) return;
  e.detail.mark(row);
  e.detail.add([{ label: 'Rename', run: () => rename(row) }]);
});
```

**A row's actions button** (0.81.0). A `button` marked `data-row-actions`, the last thing in a row, opens the row's context menu, so a reader with a pointer can see the row has one. Left empty it shows the `more` glyph. Pressing it fires `pudl:contextmenu` on the row, so the menu is the one your handler already gives a right-click; it opens against the button with the row marked, and a second press closes it. It shows only on the row under the pointer, the selected or current row, a row with focus in it and a row whose menu is open, and keeps its place empty on the rest, so a long list is not a column of identical buttons. The keyboard reaches the same menu with Shift+F10 or the Menu key, so PUDL takes the button out of the Tab order and hides it from assistive technology. A row is the nearest element holding the button as a child, or a table row holding it in a cell; in a tree it goes after the node's branch, and stands at the end of the node's own line:

```html
<li class="md-row"><a class="md-item" href="/files/report">Report</a><button data-row-actions></button></li>

<li><a href="/folders/site" aria-expanded="true">site</a>
  <ul>…</ul><button data-row-actions></button></li>
```

**A long press** (0.81.0). On a touch screen, holding a finger still for half a second opens the context menu wherever a right-click would, once, since some browsers give a long press no context menu event.

## Menus

A menu button opens a panel of choices. The button is raised and carries a caret, so it reads as opening something rather than doing something, and it looks pressed while its panel is open. The panel is lifted like a dialog without a backdrop, because it is not modal. The panel is an HTML popover, so opening, closing on Escape or an outside click, and sitting above every other surface all work without script:

```html
<div class="menu">
  <button class="btn menu-btn" popovertarget="expense-menu">Expense</button>
  <nav class="menu-panel" id="expense-menu" popover aria-label="Expense">
    <div class="md-section-label">Go to</div>
    <div class="md-row"><a class="md-item" href="/expenses/exp-12/receipt">Receipt</a></div>
    <hr class="menu-sep">
    <button class="menu-action" type="submit" form="export"><span class="glyph" style="--glyph: var(--glyph-download)" aria-hidden="true"></span> Export as PDF</button>
  </nav>
</div>
```

Places are list rows, the same `.md-row` and `.md-item` a master-detail sidebar uses, grouped under `.md-section-label` headings, and a row that opens a window is marked while its window is in front. Actions are `.menu-action` buttons below an `.menu-sep` rule, each with a leading glyph drawn as a `.glyph`. A destructive one adds `danger`, and PUDL draws the warning glyph before it at 12px, in the tick's column when the panel has ticks (0.66.0); a row that holds a picture of its own keeps that instead. This README used to say a destructive action should carry the `stop` glyph itself, and a row that still does keeps it, so drop it to get the warning glyph every other destructive control shows. A `.btn-danger` gets the same glyph, on the same terms. The `.menu` wrapper holds the button and its panel together, and that is how the button knows to look pressed.

The optional `pudl-menu.js`, loaded with `defer`, opens a panel against its button, below it, and above it only when the panel does not fit below and either fits whole above or has less than 240px below (0.77.1), so a long panel stays below and scrolls; and as a full-width sheet when the window is 640px wide or less. It lets Up and Down move between rows, and Down on the button open the panel and move into it. An `.md-filter` at the top of a panel narrows its rows as the reader types, hides a section whose rows have all gone, and follows the first remaining row on Enter. Without the script a panel opens centred, and a filter is whatever form holds it.

An open menu is not part of the URL. It is momentary, like a hover, and everything it leads to has an address of its own.

A **filter menu** holds checkbox rows that filter a list, and applies each at once. Each row is a `label.check.menu-check` holding a checkbox that belongs to the filter's GET form, by its `form` attribute or by sitting in it, so the filter works without script as an ordinary form. With `data-filter-menu` on a panel that has an id, `pudl-menu.js` sends the form when a box changes, and where `pudl-regions.js` turns that into a swap of the regions holding the menu, the panel opens again on the new page with focus on the same box, so the reader can tick several in a row. The arrow keys move between the boxes as between any rows.

```html
<form id="filter" method="get" action="/stories"></form>
<div class="menu">
  <button class="btn menu-btn" popovertarget="show-menu">Show</button>
  <div class="menu-panel" id="show-menu" popover aria-label="Filter by site" data-filter-menu>
    <label class="check menu-check"><input type="checkbox" form="filter" name="source" value="hn" checked> Hacker News</label>
    <label class="check menu-check"><input type="checkbox" form="filter" name="show" value="unread"> Only unread</label>
  </div>
</div>
```

A menu can also be **summoned by a key**. A `.menu-panel` carrying `data-menu-key`, a single printable key such as `/`, opens when that key is pressed anywhere outside an editable field, with focus in its filter; inside any field the key types as usual. Its button, if it has one, gets a matching `aria-keyshortcuts`. A panel with no button, kept only for its key, opens as a palette near the top centre of the window. If the filter sits in a GET form and the reader presses Enter with no row left, the form submits, so a server can take the typed text to a page of its own, such as a "go to" endpoint that redirects by slug; with a row left, Enter follows it. That makes a launcher summoned by `/` a go-to palette with completion that always ends in an address.

A **segmented control on a phone** can become a pop-up button, as Finder's view switcher does in a narrow window. Mark the `.seg` with `data-seg-menu` and name it with an `aria-label`:

```html
<nav class="seg" data-seg-menu aria-label="View">
  <a href="/?view=window" aria-current="page">Window</a>
  <a href="/?view=classic">Classic</a>
</nav>
```

`pudl-menu.js` builds a menu button beside it, labelled with the current choice and named, for example, "View: Window", whose menu lists every choice with a tick on the current one. At 640px or narrower the stylesheet hides the segments and shows the button; wider, nothing changes, and without script the segments stay. A choice that is a link is a link to the same address in the menu too, and a choice that is a button presses its segment, so the page's own handlers run as they always do and the button's label follows the change. A project that adds such a control by script calls `pudlMenu.refresh()`.

A panel a script opens from something that cannot carry `popovertarget`, such as a link, names that element's id in `data-menu-anchor`, and is placed against it as against a button. The windows' layout picker opens this way from the maximise button.

A **launcher** is a menu button first in the row that holds a window dock, whose panel reaches everything a site offers: one section per category, a filter at the top, and site-wide actions at the foot. Put it in a toolbar marked `.md-site-tools` so that it stays on screen when a narrow master-detail layout shows a record, and the reader can reach everything from inside an article on a phone. `samples/article-reader.html` has one.

## The menu bar

The [menu-bar conventions](docs/MENU-BARS.md) define the site and applet groups, standard menu order, and command ownership. The [adoption guide](docs/MENU-BAR-ADOPTION.md) applies them to a tools workspace and to a reader application. The [0.40.0 migration guide](docs/MENU-BAR-MIGRATION.md) covers stable IDs, scoped contributions, generated window commands, and fallback menu changes.

The optional `pudl-menubar.js` gives an application a menu bar in its topbar, as a Mac's is: one bar however many windows are open, showing the menus of what the reader is in. It holds the **host menu**, the site's own, which is always there, and to its right the **front menu**, for whatever is in front: the applet or article in the front window, or, with no window in front, the one on the page. Each menu is one raised surface in the topbar's chip colours with the menu glyph at its start, and its titles are flat words that take their press from it. Load it after `pudl-menu.js`, and after `pudl-windows.js` and `pudl-applets.js` if the page has them.

The host renders its menu as a hidden list inside the bar, beside whatever should show without script, which the bar hides once it is built:

```html
<nav class="menubar" data-menubar aria-label="Example">
  <ul data-menubar-source hidden>
    <li><img src="/logo.svg" alt=""> Example
      <ul>
        <li><a href="/">Home</a></li>
      </ul></li>
    <li>Go
      <ul>
        <li>Articles</li>
        <li><a href="/?open=welcome" data-win-open="welcome">Welcome</a></li>
      </ul></li>
    <li>View
      <ul><li><button type="button" aria-pressed="false" data-shortcut="Mod+Shift+L">Wide layout</button></li></ul></li>
    <li data-menubar-if="windows">Window<ul>…</ul></li>
  </ul>
  <a class="brand" href="/">Example</a>
</nav>
```

Each top item is a title, its words before its list; the first is the menu's name. In a list, an item holding a link or a button is a command, `-` is a separator, plain words are a heading for the commands below, and an item with a list of its own is a submenu. A command follows its link, or presses its button, as a reader's click would, so a link with `data-win-open` opens a window and the host's own script answers a button. A button's `aria-pressed` or `aria-checked` gives its command a tick. `data-shortcut` gives a command a shortcut, and `data-menubar-if="windows"` shows a title only on a page of windows.

A host can give the bar a **pins group** for the few things its readers go to most. It is a third raised group, between the host menu and the front menu, so it stays put as the front changes. The host renders it as a second hidden list in the bar:

```html
<ul data-menubar-pins hidden>
  <li>Pins<ul><li><button type="button">Pin “About”</button></li></ul></li>
  <li><a href="/page/about"><img src="/about.png" alt=""> About</a></li>
  <li><a href="/page/terminal"><span class="glyph" style="--glyph: var(--glyph-app)" aria-hidden="true"></span> Terminal</a></li>
</ul>
```

The first item is the Pins menu, marked by the pin glyph and holding the host's pinning commands; the bar sends `pudl:pins-menu` on the list as it opens, so the host can set them for whatever is in front at that moment. Each later item is a pin, a link whose icon and words become a button in the bar. A plain press on the button presses the host's link, so the host can open the item its own way, such as raising its window; a press with a modifier opens the link in a new tab, as any link's would. When the buttons do not fit they all give way together to one Items menu that lists them, and when the whole bar collapses, its menu has a Pins section with the commands and then the pins. With nothing pinned, the Pins menu stands alone. Storing the pins and deciding what can be pinned are the host's; the bar redraws when the host changes the list.

Host titles declare `data-menubar-id="go"`, `"applets"`, `"view"`, `"window"`, or `"help"`; the first title is the site identity. IDs determine standard order and contribution routing independently of displayed labels. An empty `ul` declares a shared slot that appears when populated. Exact English standard labels are recognized when no ID is supplied. A Window title can add `data-menubar-windows` to generate capability-based window management, bulk actions, and the open-window list through `pudlWindows.menuCommands()`.

An applet gives its front menu through `menus()` on its instance, asked afresh each time a panel opens:

```js
menus() {
  return {
    titles: [
      { label: 'Notes', items: [{ label: 'About Notes', run }] },
      { id: 'file', label: 'File', items: [
        { label: 'Save', run, shortcut: 'Mod+S', disabled: !dirty }] },
      { id: 'edit', label: 'Edit', items: [
        { label: 'Change case', items: [/* a submenu */] },
        { heading: 'Danger' },
        { label: 'Clear the note', run, danger: true }] }],
    into: { view: [{ label: 'Wrap lines', run, checked: wrap }] } };
}
```

A command takes `label` and `run`, and may take `checked`, `radio` (one of a named group), `disabled`, `danger`, `shortcut` or `items` for a submenu. `'-'` is a separator and `{ heading }` labels the commands below. `into` adds commands by standard ID, with exact host labels retained as a compatibility fallback. Contributions appear below the site's entries under the applet's name. An applet that offers only `commands()` gets an identity menu and an Actions menu holding its commands. A window whose content offers no menu at all, neither an applet's nor an article's, gets an identity menu under its own title, with Open as a page, Copy link to this content and Close window, so a host needs no stub applet for it. An article's menu is a hidden `<nav data-page-menu>` of the same lists, of links; a link to a heading in the article moves there, in its window, without changing the address, and its first title offers Open as a page, Copy link to this content and, in a window, Close window. An article has no File menu of PUDL's. Print is in the first title, after Copy link, only when the nav carries `data-page-print`, which a host adds once its printed article is worth having, since printing a page of windows prints the desktop around the article; a host that wants a File menu for an article adds one to its list.

The rules hold the bar together. A front menu may not reuse reserved site menu IDs or a title the host has. It may add commands only to Go, View, and Help, without changing site commands, and within a panel every label is different; what breaks a rule is left out with a console warning naming it. Shortcuts are written `Mod+S`, Ctrl on Windows and Linux and ⌘ on a Mac, and shown in each platform's form. An applet's shortcuts, including contributions to the site bar, work while focus is in its content; site-owned shortcuts work anywhere. A command may not claim `Mod` with N, T, W, Q or Tab, with or without Shift, which browsers keep, or `Mod` with A, C, X or V; it keeps its place without the shortcut, with a warning. With a menu bar on the page, an applet's commands live in its front menu: the window menu holds only the window's own, and the Commands row above an applet on its page does not appear.

The bar is one tab stop and follows the WAI-ARIA menu bar pattern: Left and Right run across both menus, Down, Enter and Space open a panel, Right and Left open and close submenus or move between titles, Escape closes, Tab leaves. Its first title carries `accesskey="m"`, which `data-menubar-key` changes, or turns off with an empty value.

**Letters.** Since 0.61.0 every title and every row has a letter. A title declares it with `data-mnemonic` on its list item, an applet's title with `mnemonic`; a row with `data-mnemonic` on its button or link, an applet's item with `mnemonic`; the generated window commands take theirs from `data-win-text-<id>-mnemonic` on the layer. A letter must be in the label, once per bar for titles and once per panel for rows; one that is not, or that repeats an earlier one, is dropped with a warning saying which. A title or row with none is assigned one as the bar is drawn: the first letter of its first word, else of a later word, else any letter of the label, the first not taken, and a row such as "2. Decision log" takes its digit. On every platform, a letter typed with focus on a title opens the title that has it, and a letter typed in a panel runs the row that has it, or opens its submenu, cycling among rows that share it; this replaces the older type-ahead. The letters are underlined while focus is in the bar and in a panel opened from the keyboard, as `<span class="mnemonic">`, and announced through `aria-keyshortcuts`.

**A desktop host.** A bar marked `data-menubar-host="desktop"` belongs to an application with no browser around it, such as a WebView2 or WebKitGTK shell. Its commands may then claim `Mod+N`, `Mod+T` and `Mod+W`, with and without Shift, which a page cannot. And the keys a browser would own reach the bar: Alt pressed and released alone moves focus to the first title on every platform, since Option alone types nothing on a Mac either; F10 does the same on Windows and Linux, where macOS keeps it; and the platform's access-key modifier with a title's letter, Alt on Windows and Linux and Ctrl+Option on a Mac, opens that title from anywhere, a field included, the collapsed bar included. Alt with another key between the press and the release, or a loss of focus between them, does nothing, so Alt+Tab is safe. While the modifier is held the titles underline their letters. A shortcut of the same chord as a title's letter is refused with a warning. Without the attribute, those keys stay the browser's, and the letters still work inside the bar.

**More of a row.** A markup row's button or link may hold a picture of its own before its words, an `<img alt="">` or a `.glyph` span, which the row shows as its 16px icon, as a pin shows its item's (0.64.0); the words alone are its name. It may also carry `data-menu-danger`, `data-menu-glyph="<name>"`, `data-menu-detail="…"` for a second line in muted text, and `data-menu-reason="…"` for why it is disabled, shown as its second line and tooltip and exposed as its description; an applet's item says the same with `danger`, `glyph`, `detail` and `reason`. A markup list marked `data-menu-radio` makes its `aria-checked` rows radio rows, as an applet's `radio` does. A function key, F1 to F12 alone or with Shift, is dispatched from a field like a chord, unless the field prevents its default. `pudlMenubar.shortcuts()` lists every key bound in the bar, each with `key`, `shown`, `label`, `title`, `source` (`host`, `pins` or `front`) and `disabled`; a key bound to two rows of one source is reported in the console as the bar is built. When the bar does not fit, it becomes one menu button whose panel lists each menu's titles, opening one level at a time with a Back row. `pudlMenubar.refresh()` rebuilds the bar after a change the script did not see.

**Folding in steps.** When the bar runs short of room it gives way one step at a time: Show as ribbon, where the bar has it, drops to its glyph; titles with a glyph show the glyph alone; the pins give way to Items; and last the bar becomes one menu button. A title's glyph comes from `data-menu-glyph="<name>"` on its list item, or `glyph` on an applet's title (0.79.0). When the topbar holds other things that fold beside the bar, a folding toolbar such as a command bar of pins, they share its room in order, each folding as far as it goes before the next starts: Show as ribbon first, then the toolbars, then the bar. `data-fold-order` on a topbar child changes its place, lower first, or keeps it from folding with `none` (0.79.0).

**Unfolding into a ribbon** (0.79.0, stable since 0.80.0). `data-menubar-ribbon` on the bar adds Show as ribbon at the topbar's end, or inside an element marked `data-menubar-ribbon-slot`. Unfolded, every title but Pins becomes a tab where it stands, and one row of tools under the topbar holds the chosen tab's commands, built from the rows you already give the bar: a heading or a separator starts a group, a switching row is a toggle, the rows of one radio group are a segmented control under the heading's caption, a submenu is a menu button, a row marked `glyphOnly` shows its glyph alone, and a `danger` row is a danger button. Each applet keeps the tab chosen in it. `data-menubar-ribbon-captions` sets the row's captions, `none` unless set; `pudlMenubar.ribbon(on)` unfolds or folds the bar from a script, and `pudl:menubar-ribbon` says when it changes. The reader's choice is kept for the site. While the ribbon shows, the root element carries `data-menubar-ribbon-on`, and a toolbar marked `data-toolbar-ribbon="hide"`, such as a window's own that repeats the ribbon's commands, is hidden (0.80.0); an applet marks a toolbar its `toolbars()` describes the same way with `ribbon: 'hide'` (0.80.1).

**Long front titles** (0.80.0). A front menu's title longer than 12em, or `--menubar-title-max`, ends in an ellipsis rather than widening the bar, with its whole words as its tooltip.

**Resident applets** (preview, 0.79.0). An applet whose mount carries `data-applet-resident` has its menus in the bar all the time, after the site's menus, whatever is in front, and its shortcuts work anywhere. A resident applet suits something that runs for as long as the application does, such as the reader's pins: `samples/menu-ribbon.html` keeps its pins in a command bar at the topbar's right, which is the Pins applet's mount, and the Pins menu comes from that applet.

**Ribbon discovery** (0.84.0) keeps full-title hover and keyboard-focus tips available through folding. A labeled **Ribbon tabs** chooser appears when menu-bar tab titles fold to glyphs, or when standalone ribbon tabs overflow their strip. It stays hidden when all titles fit. The chooser lists the available tabs and marks the selected one, so keyboard and touch users can choose by title. Down Arrow opens the chooser and Escape closes it. Menu bars localize its label with `data-menubar-text-ribbon-tabs`; standalone ribbons use `data-ribbon-tabs-text`.

## Filtering a list

A master-detail toolbar's filter that applies on submission pairs its input with a raised apply button, since an action that can be pressed must look pressable. The group is drawn as one sunken field with the button as a raised strip inside its border, as every field with a key is, and the button's magnifying glass comes from the stylesheet:

```html
<form class="md-filter-group" action="/expenses" method="get" role="search">
  <input class="md-filter" type="search" name="q" placeholder="Filter expenses…" aria-label="Filter expenses">
  <button class="icon-btn md-filter-go" type="submit" aria-label="Apply the filter"></button>
</form>
```

Enter applies the filter as well. On a narrow layout the pair takes a row of the toolbar to itself. A filter that narrows as the reader types, such as the one at the top of a launcher, needs no button, because there is nothing to apply.

**At the head of the sidebar** (0.82.0). Where the filter, its menus and its chips act on the list alone, they can stand at the top of the list's own column instead of in rows across the layout, so they take no width over the detail and go wherever the sidebar goes: collapsed, resized, peeking, at either side and as a phone's list pane. The head stays put while the list scrolls under it. Each part may be a region of its own, so a chip swap never replaces the field the reader is typing in, and a list swap leaves the head alone:

```html
<nav class="md-sidebar" aria-label="Articles">
  <div class="md-sidebar-head">
    <form class="md-filter-group" role="search" data-region="filter">…</form>
    <div class="md-sidebar-tools">…filter menus… <a class="md-chips-clear" href="?">Clear all</a></div>
    <div class="md-chips" data-region="chips">…</div>
  </div>
  <ul class="md-list" data-region="list">…</ul>
</nav>
```

The field runs across the head, the tools row and the chips wrap, and the chips take no space when there are none.

## Resizing the master-detail sidebar

An opt-in [persistent sidebar](docs/PERSISTENT-SIDEBAR.md) keeps its handle available after collapse and at narrow widths. It adds collapse/restore, host-handled pane requests, and click/tap commands while preserving mounted content. See the [article-reader example](samples/persistent-sidebar.html). With `data-md-peek`, resting the pointer on a collapsed sidebar's handle, or focusing it from the keyboard, opens a peek that draws the list over the detail pane without moving it, and closes again when the pointer or focus leaves. With `data-md-side="end"` on any master-detail layout, the sidebar stands at the end edge, mirrored.

The optional `pudl-md.js` makes the `.md-resize` divider between the sidebar and the detail pane move. Dragging it sets `--md-sidebar-w` on the `.md-layout`, and the stylesheet holds the sidebar between `--md-sidebar-min`, 180px by default, and half the layout, so the limits apply however the width was set and still apply when the layout narrows later. With the divider focused, Left and Right move it 16px, Shift with them 64px, and Home and End go to the limits; a double-click returns it to the default 260px. The divider follows the ARIA window-splitter pattern, and the script gives it a tab stop and keeps its `aria-valuenow`, `aria-valuemin` and `aria-valuemax` current.

```html
<div class="md-resize" role="separator" aria-orientation="vertical" aria-label="Resize the list"></div>
```

A sidebar's width is the reader's convenience, not something to link to, so it is not part of the URL, and PUDL keeps no state for it. When a change ends, at the end of a drag or once the arrow keys go quiet, `pudl:md-resize` fires on the layout with `detail.width` in pixels, or `detail.reset` true after a double-click. A project that remembers the width stores it and applies it before the page is first drawn, so the reader never sees the default width jump to theirs: render it into the layout's `style` on the server, or set it from a line of inline script placed first inside the layout, as the article reader sample does:

```html
<div class="md-layout">
  <script>
    (function (layout) {
      try {
        var w = localStorage.getItem('sidebar-w');
        if (w) layout.style.setProperty('--md-sidebar-w', w);
        layout.addEventListener('pudl:md-resize', function (e) {
          if (e.detail.reset) localStorage.removeItem('sidebar-w');
          else localStorage.setItem('sidebar-w', e.detail.width + 'px');
        });
      } catch (e) { /* the default width serves */ }
    })(document.currentScript.parentElement);
  </script>
  …
```

Windows in the detail pane are sized as fractions of their area, so they follow the divider as it moves. On a layout narrow enough to show one pane at a time the divider is hidden.

## Splitters

The master-detail divider resizes a page's sidebar. A splitter does the same for two panes inside a component, such as a folder tree beside a file list, or an editor above a terminal:

```html
<div class="split" style="--split-a: 240px">
  <div class="split-pane">…</div>
  <div class="split-handle" aria-label="Resize the folders" data-split-min="140" data-split-max="60%"></div>
  <div class="split-pane">…</div>
</div>
```

The first pane's size is a custom property on the `.split`, `--split-a` unless the handle's `data-split-prop` names another, and the stylesheet does the layout; without one the panes share the space equally. A `.split.stacked` puts the panes one above the other. The handle is drawn as the divider is: flat, with the `grip` glyph at rest so that it can be found without hovering, and a rule that takes the accent while it is hovered, dragged or focused.

### Disclosure cards, row editors, zoom and row lists

Four components arrived in 0.60.0 (`docs/proposals/flow-ui-controls.md`), each replacing something an application had drawn for itself in a way the grammar does not allow.

A **disclosure card** is `.card.disclosure` with a `.card-head` holding a `.card-toggle` button, the `.card-title`, any chips and a `.card-summary`, then a `.card-body` and an optional `.card-actions` foot. The toggle is drawn as a tree's toggle, and it is the only part of the head that can be pressed: a flat head that responds to a press is what the card replaces. The server writes `aria-expanded` on the toggle, and `pudl-disclose.js` hides the body and foot while it is false and the summary while it is true, sets `aria-controls`, names an unnamed toggle for the title, and fires `pudl:disclose` on the card with `detail.open`. `pudlDisclose.set(card, open)` opens or closes one from script. Without the script every part shows.

A **row editor** is a `table.row-editor` in a `.row-editor-wrap`, with flat `th` headings, one field per `td` (each with `data-label` for the stacked layout and an `aria-label` that says its row, such as "Name of input 2"), a `td.row-editor-remove` holding an `.icon-btn.danger[data-row-remove]`, an optional `tr.row-editor-more` whose one cell spans the columns, and a `.btn.row-editor-add[data-row-add]` beneath, led by the `plus` glyph. At 480px of the editor's own width each row stacks its fields under their headings. `pudl-rows.js` answers Remove by firing `pudl:row-remove` on the row, cancelable with `detail.index`, then removing it and focusing the next row's first field, else the previous row's, else Add; Add fires `pudl:row-add` on the editor, and the host appends its row with `pudlRows.add(editor, row)`, which focuses it. A host that redraws from its model cancels the removal and calls `pudlRows.focusAfter(editor, index)`.

A **zoom group** is `.zoom[role="group"]` with `[data-zoom="out"]` and `[data-zoom="in"]` glyph buttons carrying `minus` and `plus`, an `output.zoom-scale[aria-live="polite"]` and a `[data-zoom="fit"]` button, above a `.zoom-viewport` that `data-zoom-for` names by id, or that follows the group. `pudl-zoom.js` scales the viewport's first `svg` or `img` between `data-zoom-min` and `data-zoom-max` (5% and 800%) by `data-zoom-step` (1.25), keeping the viewport's middle in place, fits on load unless `data-zoom-scale` gives a scale, answers Ctrl with Plus, Minus, 0 and the wheel while the viewport has focus, and fires `pudl:zoom` with `detail.scale` and `detail.fit`. `pudlZoom.set`, `fit`, `state` and `refresh` work on a viewport from script.

A **row list** is `ul.row-list` of `li.md-row > a.md-item` rows, the master-detail list's rows standing on their own, each a link to its thing's address, with `aria-current="true"` on the one that is open. `pudl-md.js` makes every list of rows, the sidebar's too, one tab stop with Up, Down, Home and End moving among them.

A **toolbar** (0.61.0) is `.toolbar[role="toolbar"]` of `.toolbar-group[role="group"]`s holding glyph buttons, menu buttons and small buttons, as a page editor's formatting toolbar; groups are set apart by a hairline and wrap whole. A button in the state the cursor is in carries `aria-pressed="true"` and is drawn pressed in. `pudl-toolbar.js` makes the toolbar one tab stop, on the button last used: Left and Right move along the enabled controls, Home and End to the ends, and a menu button whose every `.menu-action` is disabled is disabled with them. A field the reader types in, a text area, or an input other than a box, a button, a file or a colour, keeps its own keys and is a Tab stop of its own, so that two fields are filled one after the other as in a form (0.70.1). Left, Right, Home and End move its caret; Left with the caret at the field's start moves to the control before it, and Right at its end to the control after. A field that does not report its caret, such as a number or a date, keeps its arrow keys always and is left with Tab. A key a field's own handler has already called `preventDefault()` on is left alone. The glyphs `bold`, `italic`, `underline`, `strike`, `code`, `list`, `list-numbered`, `quote`, `table`, `panel`, `colour` and `paragraph` came with it.

### Folding toolbars, command bars and ribbons

A toolbar marked `data-toolbar-fold` keeps to one row (0.78.0; a preview before). Each group may carry `data-toolbar-group`, its name; `data-toolbar-glyph`, its glyph; `data-toolbar-priority`, higher kept open longer; `data-toolbar-end`, which keeps it at the row's end; and `data-toolbar-keep`, which never folds it. As room runs out `pudl-toolbar.js` takes each group, one step at a time, from its name and its controls with their words, to their glyphs alone, to one menu button with the group's glyph and name, to that button's glyph alone, to a section of a More menu at the row's end, and back as the row widens. `pudl:toolbar-fit` fires on the toolbar when it has folded.

Nothing is lost by folding. A folded group's menu holds a row for each command; a switching command (`aria-pressed`) as a ticked row that keeps the menu open, so several can be set in turn; a segmented control's choices as radio rows under its name; a `select` as a row whose submenu holds its options, the current one ticked and shown as the row's second line; a set of keys that step a value, such as a minus and a plus, as rows that keep the menu open; a field typed into, such as a search field or a combo box, as a row that opens the field itself in a popover against the fold button, focus in it, and puts it back when the popover closes; and a menu button as a row that opens its menu beside it, with its headings and separators. On a window 640px wide or less a submenu shows in the menu's place, with a Back row first.

A command whose glyph nearly every reader knows, such as bold, the lists, copy, the arrows or reload, can be marked `data-toolbar-glyph-only`: it shows its glyph alone at every stage, and its `.toolbar-words` become its accessible name and tooltip. A field shows its value, such as a font's name, and needs no label of its own. A toolbar marked `data-toolbar-captions="none"` shows no group names before its groups; each group's name is still its fold button's words.

A **command bar** is a folding toolbar whose first group, marked `data-toolbar-menus`, holds a menu bar, so one row holds the menus and the tools. The menu group folds last, into the `menu` glyph alone, and its menus then become submenus. While one of its menus is open, Left and Right open the menu beside it and the pointer moving onto another title opens that one.

```html
<div class="toolbar" role="toolbar" aria-label="Commands" data-toolbar-fold>
  <div class="toolbar-group" data-toolbar-menus>
    <div class="menubar-menu">
      <span class="menubar-glyph" aria-hidden="true"></span>
      <div class="menu"><button class="menubar-title menu-btn" type="button" popovertarget="m-story">Story</button>
        <div class="menu-panel" id="m-story" popover>
          <div class="md-section-label">Keep</div>
          <button class="menu-action" type="button" role="menuitemcheckbox" aria-checked="false"><span class="glyph" style="--glyph: var(--glyph-pin)" aria-hidden="true"></span> Pin this story</button>
        </div></div>
    </div>
  </div>
  <div class="toolbar-group" data-toolbar-group="Feed" data-toolbar-glyph="list">
    <button class="btn btn-sm" type="button" data-toolbar-glyph-only><span class="glyph" style="--glyph: var(--glyph-reload)" aria-hidden="true"></span><span class="toolbar-words">Refresh</span></button>
  </div>
</div>
```

A **ribbon** is for a long set of tools, such as an editor's: a `.ribbon` holding a `.tablist` of tabs, each with `aria-controls` naming its folding toolbar, and those toolbars after it. One row shows at a time, under its tab, which is momentary and not in the address. `pudl-toolbar.js` puts **Show as ribbon** beside the tabs, a toggle with the `ribbon` glyph, pressed while the ribbon shows; releasing it folds the ribbon into a menu bar of the same names, each menu holding its tab's groups under their names, and the choice is kept in `localStorage` under the ribbon's `id`. The tab band and the menu bar are one height, so folding takes away only the row. `pudl:ribbon-fold` fires with `detail.folded`, and `data-ribbon-toggle-text` gives the toggle other words. Without the script every row shows, one after another.

```html
<div class="ribbon" id="editor-ribbon" aria-label="Editor">
  <div class="tablist" role="tablist" aria-label="Editor">
    <button role="tab" aria-controls="r-home" aria-selected="true">Home</button>
    <button role="tab" aria-controls="r-insert">Insert</button>
  </div>
  <div class="toolbar" id="r-home" aria-label="Home" data-toolbar-fold>…</div>
  <div class="toolbar" id="r-insert" aria-label="Insert" data-toolbar-fold>…</div>
</div>
```

In every menu panel (0.78.0), glyphs, ticks and the warning on a dangerous row stand in one column wherever any row has a glyph, so every row's words start in one line, and a switching row with a glyph shows its glyph while it is off and the tick while it is on. A switching row is a `menuitemcheckbox` or `menuitemradio` with `aria-checked`; `aria-pressed` on a row still works.

A field's label line may end in a command: a `.form-label-row` holding the `.form-label` and a `.form-label-end` slot of small raised controls, such as a `.menu-btn.btn-sm`. The command wraps under the label when the line is too narrow. A select is never used for this, since it is an input and holds no value.

With the optional `pudl-split.js`, the handle moves by pointer and by keyboard. It is a focusable separator in the ARIA window-splitter pattern. The arrow keys along its axis move it a step, and with Shift a larger one; Home and End go to its limits; Enter or a double-click returns the stylesheet's size. Its limits are `data-split-min` in pixels, 80 unless it says otherwise, and `data-split-max` in pixels or as a percentage of the split, by default all but the minimum, so the second pane never vanishes. They follow the split's own size, whatever changes it. PUDL keeps no state: when a change ends, `pudl:split` fires on the handle with `detail.size` in pixels, or null after a return to the stylesheet's size, and a project that wants the size remembered stores it and renders it in the `style` next time. `data-split-valuetext` gives the handle's spoken size in the page's words, with `{n}` for the pixels.

## Master-detail on a narrow screen

The master-detail layout shows a list beside one record. When the layout itself is 640px wide or less, on a phone or in a narrow window or panel, it shows one pane at a time instead: the list, or the record. It measures its own width with a container query, not the screen's, so a layout inside a narrow floating window behaves the same way as one on a phone.

Each pane is its own URL, which the server already has, because selecting a record in the list is a link to that record's URL. The server tells the layout which pane the URL names:

```html
<div class="md-layout" data-md-pane="detail">
  …
  <div class="md-detail" tabindex="0">
    <a class="md-back" href="/expenses?trip=manila-oct#row-exp-12">Expenses</a>
    …
  </div>
</div>
```

`data-md-pane="detail"` goes on the layout whenever the URL names a record, or shows a form that stands in for one, such as a new record, whether or not a row in the list is highlighted. Otherwise it is `"list"` or absent. On a wide layout the attribute changes nothing.

The detail pane carries `tabindex="0"` because it scrolls, and a reader who scrolls by keyboard can otherwise reach it only through a link or field inside it, which a plain record may not have. A window's body needs no such attribute; `pudl-windows.js` gives it one.

A row in the list is an `.md-row` holding an `a.md-item` whose text is the title, and which may hold `.md-meta` lines beneath it, as many as the row needs, a date and then a description say:

```html
<div class="md-row"><a class="md-item" href="/articles/elevation">Raised means pressable
  <time class="md-meta" datetime="2026-09-21">21 September 2026</time>
  <span class="md-meta">Why every control that can be pressed looks lifted.</span></a></div>
```

The title keeps to one line and ends in an ellipsis when the sidebar is too narrow for it; the metadata lines wrap, so none of them loses its end.

The detail pane starts with an `.md-back` link, which appears only when one pane shows at a time. Its `href` is the list's URL with the current filters kept, and its fragment names the record's row, whose `.md-row` carries that id, so the list scrolls back to where the reader left it. The link text names the list. It returns to the list the record lives in, and it is not a breadcrumb trail. While the record shows, the list's toolbar and filter chips step aside, since they act on the list, except a toolbar marked `.md-site-tools`, which holds site-wide tools such as a launcher or a window dock and stays in both panes, and while the list shows, its rows grow taller because they are touch targets. None of this needs script.

## Floating windows

Native full-screen application windows can add their own topbar window menu and Minimize, Restore and Close controls with optional `pudl-native.js` (0.86.0). The native host supplies state and callbacks; PUDL does not operate the OS window itself. See [the native host contract](docs/NATIVE-WINDOWS.md) and [the simulated example](samples/native-window.html).

**Outline resizing** (0.84.0) previews pointer resizing without reflowing window content during the drag. Set `data-win-resize-mode="outline"` on the window layer to enable it. Release applies the new bounds once and records one history entry; Escape or pointer cancellation discards the preview. Frame edges, outer dock edges, dock-pane dividers and snapped-window grid dividers support this mode. A window may override the layer with `outline` or `live` for its own frame and outer dock edge; shared dividers use the layer setting. Keyboard resizing remains immediate. The default is `live`. This setting does not change native operating-system window resizing.

**Title-bar status chips** (0.88.0) use `.win-statuses` holding `.win-status` spans after the title/detail and before the window buttons. They inherit the bar's foreground and have transparent fills with currentColor outlines. `.strong` emphasizes in-progress work by weight. If the chips would truncate the title, or the header becomes vertical, a Window status button opens their full text in a popover. The same window command remains available in shared docks with hidden headers. See [the status contract](docs/WINDOW-STATUS.md).

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
| `top` | one key | the active window, drawn above the others; when it names a minimised window, which it does after minimise-all, no window is active, and that window comes back in front on restoring them |
| `min` | keys, comma-separated | the minimised windows, which stay open and show only in the dock |
| `p.<key>` | `<mode>:<x>,<y>,<w>,<h>` | one window's placement |

A key names a record and is made of letters, digits, `-` and `_`. The mode is `floating`, `maximized`, `left` or `right`, the last two being the snapped halves; the zones and the docks below add modes of their own. The four numbers are the window's left edge, top edge, width and height as fractions of the layer, from 0 to 1, with at most three decimal places. A maximised or snapped window keeps its floating numbers, which are where it returns when restored. For example:

```
/trips/manila?open=exp-12,exp-13&top=exp-13&min=exp-12&p.exp-12=floating:0.36,0.04,0.5,0.72&p.exp-13=left:0.4,0.08,0.5,0.72
```

A server ignores a key it does not recognise and a placement it cannot parse. A window whose placement is missing opens floating, cascading from the top left.

#### Default windows

Some windows are part of a page's furniture rather than a record the reader opened: a panel of site links, a help strip. The layer names them, with `data-win-default="site"` (keys, comma-separated), and an address that names no windows at all opens them. The server renders them for such an address, where their markup places them, and the page's plain address stays plain for as long as they stay as it opened them. They move, minimise and close like any window.

An address that carries `open`, even an empty `open=`, means exactly what it says, so a shared link or Back and Forward are never changed by the defaults. Closing the last window on such a page writes `open=`, because an address with no window parameters would bring the defaults back, and moving a default window writes it into the address like any other. The layer names the defaults, rather than each window's markup, because a default window the address has closed is not in the page. In a master-detail layout narrow enough to show one pane at a time, a default window does not turn the pane over to the detail by itself.

Whether a reader's close should last beyond the visit is the project's business, since PUDL keeps no state: `pudl:window-close` carries `detail.reason`, `"button"` or `"key"` when the reader closed the window, so a project can remember it and render the page with `open=` next time.

### The markup

The windows float over a host, the region they may occupy, which is usually the main area below the topbar. The host holds the page's own content and one layer, and a page has one layer. `data-win-src` on the layer says where the script fetches a window's markup, with `{key}` standing for the key. A value starting with `#` names a `<template>` in the page instead. The markup becomes part of the page, so it must come from the page's own origin and be served as `text/html`; the script refuses anything else, a redirect to another origin included, and falls back on the link's own page.

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
<section class="win" data-win="exp-12" data-win-mode="floating"
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
</section>
```

The server writes the placement from the URL into `data-win-mode` and the four `--win-` properties, gives a minimised window the `hidden` attribute, gives the active window the class `active`, and renders the windows in stacking order with the active one last. Each button's `href` is the URL of the state that pressing it produces, with the other parameters kept. The buttons are empty because their glyphs come from the stylesheet. The title is plain text. A page opens with the ↗ button, and the whole title bar is the drag handle. A window's `data-win-src` URL should return the window markup alone, not a whole page, so that opening a window costs one small render.

A window is a `<section>`, because it is a dialog and ARIA allows `role="dialog"` on a section but not on an `<article>`, which earlier versions of this README used. An `<article>` window still works, and assistive technology still hears a dialog, but a checker such as axe reports the role as not allowed. The content inside a window may of course be an article.

Scripts inside a fetched window do not run. A project wires up a window's content by listening for `pudl:window-open`, which fires on each window as it arrives. `pudl:window-place` fires on the layer before a window opens with no placement in the URL, and a listener may set `event.detail.placement` to `{mode, x, y, w, h}`, from saved state for example. `pudl:windows-change` fires on the layer after every change with the whole state, for a project that wants to remember placements. PUDL keeps no state of its own beyond the URL.

With a title bar focused, the arrow keys move the window, Shift with the arrow keys resizes it, and Enter maximises or restores it. Double-clicking the title bar also maximises or restores it, and dragging it against the left, right or top edge of the layer snaps it to that half or maximises it.

A window the reader brings forward takes the keyboard, as an activated window does on the desktop, whether they press its title bar or frame, its dock tab, a list row or its window menu. Focus goes back to whatever last had it inside that window, so a reader who was typing in a terminal, worked in the editor, and pressed the terminal's title bar carries on typing in the terminal. The first time, it goes to an element in the window's body marked `autofocus`, and otherwise to the title bar. A window that already holds focus keeps it where it is, and a press inside a window's body focuses what it lands on.

### Snap zones

A window can be snapped to a zone, a rectangle of the workspace on a grid of sixths, which holds the halves, the quarters, the thirds and two thirds beside one third. A zone follows the workspace as it resizes, and it is a fraction of the area the docks leave, so it never covers a docked window. A zone window is drawn flush like a half, with a hairline where it meets another zone.

- **Dragging.** A drag that ends at a side snaps to that half, as before, and one that ends at a corner snaps to that quarter. A corner is the last 64 pixels of a side. The top edge still maximises, and the foot of the workspace still docks, except at its corners.
- **The layout picker.** The window menu holds a thumbnail of each layout, halves, quarters, thirds, and two thirds with one third either way round, and each zone in a thumbnail is a button that snaps the window there. The zone the window fills is drawn in the accent and marked `aria-current`. On a window that has the window menu, a mouse resting on the maximise button for half a second opens the same picker under it.
- **The keyboard.** The picker's zones are menu rows, each named in words, such as "Top left quarter", so the arrow keys and Enter reach every zone from the window menu. Shift with the arrow keys still resizes a window rather than snapping it.
- **Script.** `pudlWindows.snap(key, zone)` snaps a window to a named zone, `left`, `right`, `top`, `bottom`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `left-third`, `middle-third`, `right-third`, `left-two-thirds` or `right-two-thirds`, or to a rectangle `{ x, y, w, h }` of fractions, which is moved to the nearest sixths. `pudlWindows.snap(key, null)` floats it again.
- **Restoring.** A zone window restores as a half does. The maximise button reads Restore and floats it again, and dragging it lifts it back to its floating size.
- **The address.** A zone is the mode `zone`, whose placement adds the zone's rectangle after the floating geometry: `p.term=zone:0.06,0.05,0.55,0.75,0,0,0.5,0.5` is the top left quarter. A zone that is a half or the whole is written, and read, as `left`, `right` or `maximized`, so every arrangement has one address, and existing addresses are unchanged. A server renders a zone as `data-win-mode="zone"` with `--zone-x`, `--zone-y`, `--zone-w` and `--zone-h` in the window's style, and a window's markup may open it in a zone the same way.
- **Opening from a zone.** A window opened by a link in a zone window opens in the same zone, as one opened from a half opens in that half.

**Splitters between snapped windows (0.67.0).** Wherever two snapped windows meet, a splitter lies on the grid line they share, for as far as they share it, and dragging it moves the whole line: two halves become 40% and 60%, the edge shared by a half and two quarters moves all three, and the line between the two quarters moves only them. Each window keeps its cells of the grid, so a window snapped to the left half is still `left`, and a window snapped later fills the cells as they are now drawn. While one line moves, the other lines dividing windows on the same axis hold still, so moving the edge between the first two thirds leaves the last third alone; a line nobody moved lies evenly between the moved ones. A line stops where a window with an edge on it would go below its least size, or its plain size if that is smaller, and goes back toward the grid when the workspace shrinks. Where two splitters cross, as the four quarters' do, a handle moves both lines. Each splitter is a focusable separator named for the windows either side: the arrow keys move its line by 1% of the inner area, by a sixth with Shift, Home and End to its limits, and Enter or a double-click returns the line to the grid. A moved line is forgotten once no two snapped windows meet across it, such as when one of two halves is closed or floated. The address keeps the moved lines as `grid=x3:0.4,y3:0.35`, shares of the inner area, absent while no line has moved; a server rendering a moved arrangement writes the moved shares into `--zone-x` and the rest, and the middle line as `--win-grid-x3` on the layer for the halves. `pudlWindows.grid(axis, line, share)` moves a line from script, and `null` returns it; `state().grid` lists the moved lines. The splitters are `.win-splitter`, and the crossing `.win-splitter-cross`. A window's stacking level is now two apart from the next, so a splitter can lie just above the windows it divides.

Tiling, where windows divide the space among themselves, is left out. A zone is the unit a tiling layout would place windows in, so nothing here rules it out.

The active window's title bar comes from four tokens a theme may set: `--win-active-bg`, `--win-active-fg`, `--win-active-border` and `--win-active-shadow`. By default the light theme fills the bar with the accent and light text, the classic active window, and the dark theme, whose accent must be bright for its links to read, tints the raised gradient toward the accent and keeps the normal text colour. The active window also takes a stronger shadow and an accent-tinted frame in both themes.

A window's markup may give it a starting mode with `data-win-mode` and no position, and it opens in that mode, with a cascade position to restore to. A reading site opens its articles maximised this way.

A window opened by a link inside another window opens in that window's state instead, so following a link never overturns the reader's arrangement: maximised from a maximised window, the same half from a snapped one, and from a floating window, floating one step down and to the right so the opener stays in sight, starting again near the top left when the step would run past the edge. A window opened from outside any window, from a list, a menu or the dock, keeps its markup's default. In full, a new window's placement comes from the URL if it names one, then from the zone a `data-win-beside` link asks for, then from a `pudl:window-place` listener, then from its own markup when it is marked `data-win-place="own"`, then from the zone its opener names in `data-win-opens`, then from its opener's state, then from a position in its markup, then from its markup's mode. The event's `detail.opener` names the opening window's key, or is null, and `detail.link` is the link that was followed, so a listener can place two links' windows differently. A window opened from a docked one opens as it would from the page.

A window whose markup says where it belongs, such as an editor that needs the left half wherever it is opened from, is marked `data-win-place="own"`. A window marked `data-win-opens` with a zone name, such as `right`, opens the windows its links open in that zone, as a report opens the days of its log beside it. A docked window marked `data-win-undock` with a zone name goes to that zone when it is undocked, rather than to where it last floated. The zone names are those `pudlWindows.snap()` takes, and `maximized`.

A window marked `data-win-room` with a CSS length, such as `data-win-room="61rem"`, asks for that much width while it is in front. On a layer with shared docks, an automatic side dock that would leave it less shows as a rail, the widest first and only as many as it takes, so an editor that needs two columns gets them. The address and the dock's mode do not change, and the dock opens again once the window closes, loses the front, or has room after all, such as when the browser widens. A dock the reader pinned open stays open, and a rail tab still slides its window out as usual; choosing a docked window brings it to the front, so its dock opens.

### Split docked panes

Add `data-win-dock-splits` to a shared-dock layer to divide each edge into independently tabbed panes. Side docks stack panes vertically; top and bottom docks arrange them horizontally and require `data-win-dock-tabs="all"`. Additional splits are available while the panes meet their minimum sizes. The window menu and drag previews offer tabbing, splitting and full-height or full-width merging. Internal dividers resize the panes while the existing outer edge resizes the dock.

`pudlWindows.dock(key, edge, { group: 'main', position: 'after' })` splits the initial group. Each pane keeps its own selection and mounted content, and the URL restores its arrangement. Equalize, Swap and Merge are available from the menu and the script API. See the [split-dock contract](docs/SHARED-DOCKS.md#split-panes) and [interactive sample](samples/split-docks.html).

### Windows sized by their content

A window is sized either by the reader or by its content, as a Win32 window has a sizing border or is a dialog that sizes itself to its template. Every window is sized by the reader unless its markup says otherwise. A tool laid out at its own size, such as a form, a settings page or a small game, marks its window `data-win-size="content"`:

```html
<section class="win" data-win="barcodes" data-win-size="content">…</section>
```

- **Its size is its content's.** The window takes its content's width and height and follows them as they change, larger and smaller, so an applet whose settings add or remove fields resizes its window by doing so, with nothing to call. The browser does the following, through the window's intrinsic size, and no script watches it. What sets the width is the content: give the applet's root a width, or a maximum width, and let nothing in it stretch to the height it is given, or the height would have nothing to come from.
- **Its top-left corner stays where it is** as its size changes, so a control above the part that changed stays under the pointer. At the right and bottom of the workspace it stops, and its body scrolls.
- **It cannot be resized, maximised, snapped or docked.** It has no resize edges, and its maximise and dock buttons do not show. Its window menu leaves out Maximize, the layout picker and Dock, and offers Reset position in place of Reset size and position. Enter and a double-click on its title bar do nothing, Shift with the arrow keys does nothing, and a drag to an edge moves it there without snapping. An address or a script that asks for any of these leaves it floating where it is.
- **Its address keeps a floating placement**, whose width and height it ignores, so the same address still works if the window is later sized by the reader.
- **An applet in it flows.** It is told `fit: "flow"` and its mount reads `data-applet-fit="flow"`, since the window gives it no box to fill.

A window the reader sizes may carry limits, `data-win-min="400,250"` and `data-win-max="1200,900"`, its smallest and largest width and height in pixels. Dragging, the keyboard and an address all respect them, so a terminal keeps a usable grid however small it is dragged, and an old link cannot open it smaller.

### Docked windows

A window may be docked at an edge of the workspace, and it then belongs to the workspace's frame: it takes that strip away from every other window, which lays itself out in what remains. A maximised window ends where a dock begins, a snapped half is half of what is left, and a floating window cannot be dragged into a dock's strip, so nothing ever covers a docked window. It serves standing furniture a page opens by default, such as a site's links at the foot of the workspace, and a tool the reader keeps beside their work, such as a terminal at the bottom or a mixer at the side. A footer that never moves or closes is page layout instead, and belongs below the window host. `docs/proposals/docked-windows.md` sets out the rules.

```html
<div class="win-layer" data-win-layer data-win-src="/window/{key}" data-win-default="site" style="--dock-bottom: 22%">
  <section class="win" data-win="site" data-win-mode="dock-bottom" data-win-edge="bottom" style="--win-dock-size: 0.22">
    <header class="win-head">
      <h2 class="win-title">Site</h2>
      <nav class="win-chrome" aria-label="Window">
        <a class="win-btn" data-win-action="dock" href="…" aria-label="Undock"></a>
        <a class="win-btn" data-win-action="minimize" href="…" aria-label="Collapse"></a>
        <a class="win-btn" data-win-action="close" href="…" aria-label="Close"></a>
      </nav>
    </header>
    <div class="win-body">…</div>
  </section>
</div>
```

- **Modes.** A window's mode may be `dock-top`, `dock-bottom`, `dock-left` or `dock-right`. Top and bottom docks span the workspace's width, and side docks the height between them. In the address a docked placement adds its strip's size as a fraction of the workspace, `p.site=dock-bottom:0.06,0.05,0.55,0.75,0.22`; the four numbers before it are the floating geometry to return to. In markup the size is `--win-dock-size`, and without one a dock takes a quarter.
- **Looks.** A docked window is flush, with no shadow, rounded corners or frame band, and a hairline on the side facing the workspace. Its title bar is thin, `--win-head-docked`, 30px, and the maximise button does not show.
- **Collapsing.** Its minimise button collapses it to its title bar, in place, and expands it again; a collapsed side dock is a narrow strip with its title running down it.
- **Resizing** is along its free edge only, by pointer, or with Shift and the arrow keys on its focused title bar.
- **Docking and undocking.** Dragging a window to the foot of the workspace docks it there, with an outline showing where it will land. Dragging a docked window's title bar away, pressing Enter on it or double-clicking it undocks it. A `data-win-action="dock"` button docks a window at the bottom and undocks a docked one, so docking never depends on dragging; `pudlWindows.dock(key, 'bottom')` and `pudlWindows.dock(key, null)` do the same from script, at any edge.
- **One edge, several windows.** An edge shows one docked window at a time, the one most recently in front; the others wait behind it and come forward from the dock of open windows. A tabbed dock, with a tab for each, is specified in the proposal and not yet built.
- **Narrow screens.** On a layer 640px wide or less a side dock shows at the bottom, since there is no room beside the content.
- **Rendering.** The script sets the strips as `--dock-top`, `--dock-bottom`, `--dock-left` and `--dock-right` on the layer, and `data-win-edge` on each docked window, naming the edge it shows on. A server renders the same, as above, so the page is right before the script runs.

### The window menu

A layer carrying `data-win-menu` gives every window a menu button at the left of its title bar. A single window can have one instead by carrying the button in its markup, `<button type="button" class="win-btn" data-win-action="menu"></button>`, first in its `.win-head`. The menu reaches every command a window has from one place, including the ones a title bar has no room for, and it is the keyboard's route to them: the context-menu key or Shift+F10 on a focused title bar opens it with focus on its first command, and the arrow keys and Enter choose one. It needs `pudl-menu.js` to place it and move through it.

The menu is built afresh each time it opens, in three groups:

1. The window's own commands. These are Open as a page when the window has a page link, Copy the link when it has a share address, Minimize (Collapse or Expand on a docked window), Maximize or Restore, and Reset size and position, which returns the window to the placement its markup gave it; then, each set apart by a line and under its heading, the layout picker under Snap, whose zones place a floating window in part of the layer, and a Dock list under Dock, whose edges fasten the window to a side of the layer, of Top, Bottom, Left and Right, ticking the edge the window is docked at and ending with Undock on a docked window. A menu bar's Window menu shows the Dock list as a submenu.
2. The commands of what the window holds, after a separator. An applet's come from its `commands()`, described under Applets. Any other content adds its own when `pudl:window-menu` fires on the window as the menu opens: `detail.key` names the window, and `detail.add(label, run, { checked, disabled })` adds a command.
3. Close, last and after a separator, so it is never chosen by a slip from the command above it.

```js
document.addEventListener('pudl:window-menu', function (e) {
  if (e.detail.key !== 'notes') return;
  e.detail.add('Word wrap', toggleWrap, { checked: wrapping });
});
```

A command given `checked` carries `aria-pressed` and shows a tick while it is on. A disabled command stays in the menu, dimmed, so the reader learns it exists. Content cannot take over the window's own commands; one that must stop a close cancels `pudl:window-closing`, as below. The labels come from the `data-win-text-*` attributes listed under Accessibility, languages and print, with `data-win-text-menu` for the button, and `data-win-text-page`, `-minimize`, `-reset` and `-close` for the commands the other buttons do not already name.

A right-click on a window's button in the dock opens the same menu, against the button, which wears an accent ring while it is open (0.79.0). `data-win-tab-menu="off"` on the layer or the dock turns it off, and rows a page adds for the tab through `pudl:contextmenu` replace it.

### The taskbar

The window layer can opt into taskbar reordering with `data-win-taskbar-reorder`. Readers can drag mouse/pen entries, use Alt+Shift+Left/Right, choose Taskbar order from an entry's context menu, or tap the generated Arrange taskbar button. Its draft list includes overflow entries and has move controls, Apply order and Cancel. Ordering has its own `tb.order` URL state and leaves window activation and shared-dock ordering unchanged. See [the contract and API](docs/TASKBAR-ORDER.md) and [the sample](samples/taskbar-reordering.html).

A `.win-bar` holding the dock is a taskbar (0.79.0, stable since 0.80.0): a bar along the foot of the window area, or its head with `data-win-bar-edge="top"`, which keeps the dock on one line and puts the page's own buttons on either side of it in the order you write them. Short of room it never scrolls (0.81.2): the window buttons shrink to 120px, then the tray shows its glyphs alone, then the last buttons but the front window's go into a "N more" button whose menu lists them.

```html
<footer class="win-bar">
  <button class="icon-btn" type="button" aria-label="Show the sidebar" aria-pressed="true">
    <span class="glyph" style="--glyph: var(--glyph-panel)" aria-hidden="true"></span></button>
  <nav class="win-dock" data-win-dock aria-label="Open windows"></nav>
  <nav class="status-area" aria-label="Status">…</nav>
  <a class="icon-btn" data-win-back href="?" aria-label="Minimize all windows"></a>
  <a class="icon-btn" data-win-restore href="?" aria-label="Restore all windows"></a>
  <a class="icon-btn" data-win-close-all href="?" aria-label="Close all windows"></a>
</footer>
```

PUDL keeps the three links pointed at the state they produce and marks them `aria-disabled` while they would change nothing. Minimize all and Restore all share one place, showing whichever is useful. Close all closes every window the reader may close, each as its own Close would, so a window that refuses through `pudl:window-closing` stays; `pudlWindows.closeAll()` does the same. An icon link left empty takes the `minimize-all`, `restore-all` or `close-all` glyph, and one holding a `.glyph`, `svg` or `img` keeps its own, at 16px. A `.status-area` in the bar is its tray. A press in the bar's padding or between its controls goes to the nearest one, so the screen's edge is part of every button on the bar, and a right-click away from a window's button opens the bar's menu of Minimize all, Restore all and Close all windows, which `data-win-bar-menu="off"` turns off. Toasts stand above a taskbar along the foot, from the room PUDL keeps as `--win-bar-clear` on the root (0.80.0), so they never cover its tray.

### Child windows

A window can open children for content that belongs to it, such as a source listing, an image or a receipt. A child's markup names its parent:

```html
<section class="win" data-win="art-12-listing-1" data-win-parent="art-12" data-win-mode="maximized">
```

The relation belongs to the content, so it lives in the markup and the URL does not repeat it: the child appears in `open` like any other window. A link inside the parent with `data-win-open` opens the child. A child's buttons are maximise, which also restores, and close. It has no minimise button, because it has no dock tab to come back from. A child opened from a floating parent floats, and the reader may want to maximise it and restore it again.

- A child stacks directly above its parent, and bringing the parent forward brings its children with it.
- Minimising the parent hides its children, and closing the parent closes them.
- The dock has tabs for top-level windows only. A parent's tab brings forward its topmost child, since that child covers it.
- Escape closes a child that is in front, as a lightbox does, unless the key is meant for a form field. Escape never closes a top-level window. Focus returns to the link that opened the child.
- Children nest one level. A child of a child stands on its own.

`pudl:window-place` carries the parent's key in `event.detail.parent`, so a listener that places windows can leave children alone.

### Moving between windows, and scripting them

A link inside a window marked `data-win-replace`, as well as `data-win-open`, opens its target in place of the window it sits in, the way a link works in a browser tab. The new window takes the old one's place in the dock and its placement, the old one closes, and the move is one history entry, so Back returns to the old window. If the target is already open it comes forward and the old window closes. A reading site uses this for a "Next" link at the foot of an article.

A link marked `data-win-beside`, as well as `data-win-open`, opens its target beside the window it sits in instead, for two views of one thing side by side, such as two days of a log. The new window takes the zone the attribute names, such as `data-win-beside="right"`, or with no value, the half the opener's middle is not in, and a maximised opener moves to the other half. A target that is already open moves into that zone and comes forward. The link's `href` should be the address with both windows open, so it does the same without script. A layer marked `data-win-beside-modifier` also lets Ctrl, or Cmd on a Mac, with a click on a `data-win-replace` link open its target beside rather than in place. A middle click and Shift with a click stay the browser's.

### Changing a window in place

A POST form inside a window marked `data-win-submit` is sent with `fetch` rather than loading the page. The request carries the header `X-PUDL-Window` with the window's key, and a server that sees it answers with that window's markup, as `data-win-src` would return it, at whatever status suits: 200 after an action, 422 with a refused form's errors in place. The window keeps its key, placement, place in the stack and dock tab, and takes its body, its title and its status marks (`data-win-glyph`, `data-win-attention`, `data-win-running` and `data-win-progress`) from the answer. Focus stays on the field that had it, found again by `id` or `name`, or else goes to the window's body. A `.notice`, or anything with `role="status"` or `role="alert"`, in the new body is announced. `pudl:window-update` then fires on the window, since scripts in fetched markup do not run.

An answer that redirects to another address is followed as the page would follow it. An answer that is neither the window nor such a redirect means the action happened but the server did not draw the window, so the page loads again from its own address. Only a request that could not be sent at all falls back to sending the form the ordinary way. Without script, the form posts as it always did, so a server should go on answering a request without the header with its usual redirect.

`pudlWindows.reload(key)` takes a window's content again from its `data-win-src`, and `pudlWindows.update(key, markup)` gives it new content from a window element, from HTML holding the window, or from HTML that is the new body alone, which leaves the status marks as they are. Both follow the same rules for focus and announcements.

`pudl:window-close` fires on each window just before it leaves the page, however it was closed, and `detail.reason` says how: `"button"` for its close button, `"key"` for Escape on a child window, `"script"` for `pudlWindows.close()`, `"parent"` when its parent closed, `"replace"` when another window took its place, and `"address"` when the address moved on, by Back, Forward or a link. Content that set something up on `pudl:window-open` tears it down there.

Before a close by its button, by Escape or by `pudlWindows.close()`, `pudl:window-closing` fires on the window, and on each child that would close with it, with the same `detail`, and it can be cancelled. An editor with unsaved changes cancels it, asks, and closes the window itself if the reader says to discard them. A close by the address, by Back, Forward or a link, cannot be refused, because the address has already moved on.

`window.pudlWindows` gives scripts `open(key)`, `replace(oldKey, key)`, `raise(key)`, `minimize(key)`, `minimizeAll()`, `restoreAll()`, `dock(key, edge)`, `snap(key, zone)`, `retitle(key, title, detail)`, `detailOf(key)`, `openMenu(key)`, `reload(key)`, `update(key, markup)`, `close(key)` and `state()`, and `shown(key)` and `seen(key)`, which say whether a window can be seen now and whether it has been seen since it opened (0.66.0). Each window fires `pudl:window-seen` once, the first time it is seen, which is what an applet that starts when seen waits for; the section on applets sets out what counts.

A window may carry a **detail** beside its title, a second part saying where the thing belongs: `data-win-detail="Customers"` on the window, or the third argument of `retitle`. It is drawn after the title as `.win-title-detail` in the title bar, as `.win-item-detail` in the taskbar and dock tabs, and after the separator in the window menu's and Window list's rows; `data-win-text-title-sep` on the layer changes the separator from " · ". The title keeps priority: the detail gives way first, down to six characters and an ellipsis, and below that both shrink with the title keeping about two thirds. In an icon rail the tooltip holds both. The heading's text and `pudl:windows-change` are unchanged, so a host that sets no detail sees nothing new. `openMenu(key)` opens a window's menu with its first command focused, for a host that gives it a key.

**Switching windows (0.62.0).** `state().recent` lists the open windows in the order they were last in front, the front one first. A layer marked `data-win-switcher` takes Ctrl+Tab, the key every desktop gives for the window a person was in a moment ago: a quick press flips between the two windows used last; with Ctrl held, each Tab picks the next in the order, Ctrl+Shift+Tab the previous, the arrow keys move the pick, and a list of the windows shows after about 120ms, a menu panel placed as a palette with each window's glyph, title and detail; letting go of Ctrl or pressing Enter brings the pick to the front, restoring it if minimised; Escape, a lost window focus or a press outside the list let go. Docked windows are left out and a focused docked window does not count as the front. The keys are taken on the window in the capture phase, so a text field or an editor never sees them, and a modal dialog keeps them. Ctrl+PageDown and Ctrl+PageUp, where a host has them, are untouched. In a browser the browser keeps Ctrl+Tab, so the attribute is for a desktop shell. `pudlWindows.switcherKeys()` gives the two keys and `pudlMenubar.shortcuts()` lists them; `data-win-text-switcher`, `-switch-last` and `-switch-back` give their words. Each does exactly what the matching link or button does, the URL and history included, so a project never needs to click PUDL's own buttons from script. `retitle` changes a window's title, as a preview does when it shows another file, and the title bar's spoken name, the dock tab and the list row follow.

`rekey(oldKey, key, push)` gives an open window a new key and keeps everything else: its element, placement, place in the stack, focus and running content. It is for a window that stays while what it shows changes, such as a reader turning to another story, where `replace(oldKey, key)` opens a new window in place of the old one and loses all of that. The change is a new history entry unless `push` is `false`, and `pudl:window-rekey` fires on the window with both keys. It returns `false`, changing nothing, onto a key that is open or loading, and re-keying to the window's own key brings it forward.

A page can keep some state of each window in its address, beside PUDL's own parameters, by naming prefixes on the layer: with `data-win-params="r"`, a parameter `r.<key>`, such as the story a reader window shows, belongs to window `<key>`. It travels with the windows through region swaps and Back and Forward, moves with the window when it is re-keyed, and is dropped when the window closes. A window's share link is its `data-win-href`, which the host writes, so the host includes such a parameter there itself.

### Sharing a chosen state

A host can give a window a crafted share address with `data-win-href="/posts/example"`. That address may open the article alone or any other state the host chooses to export. It must work independently of the sender's browser history. Copying it leaves the current workspace and its full URL intact. PUDL does not store an alternative arrangement in `history.state` or replace the address bar with a URL that omits the current state.

The window menu's Copy the link command and an article's menu-bar command use this address. Without `data-win-href`, they use the title bar's Open as a page link. With neither, they omit the copy command rather than accidentally sharing unrelated windows. An explicitly empty or invalid `data-win-href` also omits it. Open as a page keeps its own destination even when the share address differs.

`pudlWindows.shareURL(key)` returns the absolute share address, or `null` if none is usable. It accepts HTTP and HTTPS addresses, including another origin; relative addresses resolve against the window element's document base, just as a link does. The host's query and fragment are preserved, and PUDL adds no workspace parameters. The value is read when requested, so a host may update the attribute as the content changes. Omitting `key` selects the active, visible front window.

`pudlWindows.copyLink(key)` copies that address and returns a promise resolving to `true` when the clipboard write succeeds. If the clipboard is unavailable or refuses the write, a browser prompt offers the address for manual copying and the promise resolves to `false`. No usable address returns `false` without opening a prompt. Call it from a reader's action, since browsers restrict clipboard access. After an attempted copy, `pudl:window-link-copy` bubbles from the window with `{ key, href, ok }`; `ok` reports automatic clipboard success, not whether the reader copied manually. A host can use the event to show confirmation. The layer can translate the window command and fallback prompt through `data-win-text-copy-link` and `data-win-text-copy-link-manual`.

[The sharing sample](samples/shared-window.html) exports an article-only view while retaining a second window in the sender's workspace. Its article is present without JavaScript, and a visible article link also supports ordinary navigation and the browser's Copy link action.

### Windows and a list

A list built from master-detail rows follows the windows its links open. The script finds each `.md-row` holding a link with `data-win-open`, marks the row of the window in front with `active` and `aria-current`, and adds an `.md-row-child` row beneath it for each open child, titled with the child's title and linking to it. The row goes when the child closes. A server rendering the page for a URL renders the same rows.

When the layer sits inside a master-detail layout, in place of `.md-detail` or inside it, the windows are the detail pane. The script sets `data-md-pane` to `detail` while any window shows and to `list` otherwise, so a narrow layout shows the list or the windows. A link with `data-win-back`, usually an `.md-back` above the layer, minimises every window, which returns to the list with the windows kept in the URL.

Some layouts show a record of their own in the detail pane, with windows floating over it, as a file manager shows a folder's contents. There the server decides which pane a narrow layout shows, and the layer carries `data-win-pane="off"` so that the script leaves `data-md-pane` alone.

A link with `data-win-restore` does the reverse, restoring every minimised window in one step, with the window that was in front before back in front. Together they make a minimise-all and restore-all pair for a desktop's toolbar. The script keeps both links' `href`s current, so they work without script from the second page on, and marks each `aria-disabled="true"` while it would change nothing: minimise-all with nothing showing, restore-all with nothing minimised. A `.btn` so marked looks disabled and takes no clicks. The server renders the first `href`s, and the same `aria-disabled`, for a page without script.

`samples/article-reader.html` puts all of this together as a reading site: an article list in the sidebar, each article opening maximised, and listings as child windows.

## Regions

A navigation that changes only part of a page, such as a category tab or a filter, should replace only that part. Otherwise the reload re-fetches every open window, loses their scroll positions and restarts their applets. The optional `pudl-regions.js` does that for the parts a page marks with `data-region`:

```html
<nav class="app-section-bar" data-region="sections">…</nav>
<nav class="md-sidebar" data-region="list">…</nav>
```

A plain click on a same-origin link inside a region, or a GET form submitted inside one, fetches the target page, which may be the same path with other parameters or another path, such as a page per category. If that page has a region of every name the current page has, and the same window layer, the script replaces each region with its counterpart and pushes the address, carrying the open windows, which stay exactly as they were. If it does not, or the fetch fails, the browser navigates as it always would, so the worst case is an ordinary page load. A link to what the regions already show does nothing. A form's empty fields are left out of the address it builds, so clearing a filter leaves no `?q=` behind. Back and Forward swap the regions again when the part of the address they depend on changed; when only the windows changed, the windows module handles it alone.

A link outside every region swaps regions in the same way when it carries `data-region-link`, or sits inside an element that does. The usual case is an article in a window, whose tag and category links lead to pages with the same regions: without the attribute, following one is an ordinary page load, and the address it loads carries no windows, so every window closes. Marking the window's body keeps them:

```html
<div class="win-body" data-region-link>…<a href="/articles/design">Design</a>…</div>
```

It is opt-in, because a window's content often links to pages that were never meant to be swapped in, and those should stay ordinary links.

Because a swap needs a counterpart for every region, a region that is sometimes empty must still be rendered when it has nothing in it. A chips row with no active filters is the usual case: render the empty `.md-chips` element anyway, and PUDL hides it, or every navigation away from a filtered view falls back to a full page load. PUDL tells an empty chips row by the absence of chips, not by `:empty`, so the whitespace a template leaves inside it does no harm.

The script asks the server for nothing special. It fetches the same address a bookmark would, so the server renders what the address names, as it always does, and the swap reads the regions out of that page.

Same-page links that swap regions, and the window fields a server renders into a region's GET forms, are kept up to date with the open windows as they change, so a middle-click or a copied link carries the windows as they are. A link's own parameters are kept as written. A page that renders links into a region by script calls `pudlRegions.refresh()` afterwards, so they carry the windows too. A segmented control in a region that folds into a menu on a phone swaps regions from its menu's choices as it does from its segments.

`pudlRegions.reload()` fetches the current address again, past any cache, and swaps its regions in place, with no new history entry, as a Refresh command wants. Where following a link would fall back to loading the whole page, a reload never navigates: if the request fails, or the page that comes back has other regions, it rejects and leaves the regions as they were. It resolves `true` once swapped, or `false` if a navigation that started meanwhile superseded it. After a swap, focus returns to the matching element in the new region, the title follows the new page, and `pudl:regions-swap` fires on the document; the windows module listens for it to mark the new list's rows. A region being replaced dims a little if the answer takes more than a moment.

`samples/article-reader.html` and its two category pages use regions for their category tabs and article list. Open an article, restore it, scroll it, set the colour mixer, and move between categories: only the list changes.

## Applets

An applet is interactive content, such as a game, a calculator or a tool, that runs unchanged in a page of its own, embedded in an article, or inside a window, from one script. PUDL does not build or manage applets. The optional `pudl-applets.js` is only the handshake between an applet and whichever host it lands in, and it is needed because scripts inside a fetched window do not run. An applet knows itself and never its host: it runs the same with `pudl-applets.js` alone, and a window is only one more host.

A site names each applet's files once, in a small script it loads on every page after `pudl-applets.js`:

```js
pudlApplets.define('mixer', { src: '/js/mixer.js', css: '/css/mixer.css',
                              page: '/apps/mixer', ver: '3' });
```

and each place the applet goes needs only its name, with whatever should show without script:

```html
<div data-applet="mixer">
  <noscript><p>The mixer needs JavaScript to run.</p></noscript>
</div>
```

`ver` is added to the script's and stylesheet's addresses as `?v=`, so a new version is one edit rather than one per page. Only `define()` names an applet's script and stylesheet. A page's markup can come from people other than its authors, such as a comment that a sanitiser let data attributes through, and a mount that named a script would let them choose what runs with the page's authority; `define()` is called by the site's own script. A mount may carry `data-applet-page`, a page on the site's own origin that overrides the registry's. Up to 0.22 a mount could also carry `data-applet-src` and `data-applet-css`; they are no longer read, and a mount that carries them warns in the console. The order does not matter: a mount that meets a name not yet defined waits for its `define()`. The attribute is the canonical form rather than a custom element, because a plain element carries its fallback content, needs nothing registered before the first paint, and passes through Markdown as raw HTML.

The applet's script registers it:

```js
pudlApplets.register('mixer', {
  init: function (root, opts) {
    // build inside root, find and listen only within root
    return {
      state: function () { return '...'; },        // optional
      setState: function (s) { /* ... */ },         // optional
      commands: function () { return [/* ... */]; }, // optional
      destroy: function () { /* undo everything init set up */ }
    };
  }
});
```

What `opts` tells the applet:

- `host` is `"window"` inside a window, otherwise `"page"`.
- `fit` is how to size itself. `"fill"`: the host gives a definite box, and the applet fills it and never scrolls, as in a window or a page that is nothing but the applet. `"flow"`: the column gives the width, the applet caps its height against the viewport, and the page scrolls, as in an article. A window fills and anything else flows, unless the mount's `data-applet-fit` says otherwise; the mount's `data-applet-fit` always reads the answer, for the applet's stylesheet. The override matters for an article that opens in a window: the article scrolls within its window, so an applet in it should flow with the prose, and its mount says `data-applet-fit="flow"`, as the article reader's colour-mixing article does.
- `ownsUrl` is true only on the applet's own page, the one `data-applet-page` or the registry names, outside a window. There the applet may keep its state in the address itself. Anywhere else it must leave the address alone: in a window the windows own it, and in someone else's article the article does.
- `pageUrl` is the applet's own page, for a link that reaches the current state from anywhere.
- `state` is the state its host kept for it, a string, or `null`. Just before `init`, `pudl:applet-state` fires on the mount with `detail.state`, and whatever a listener puts there, synchronously, is what arrives. `detail` also carries the applet's `name`, `host`, `fit` and `param`.
- `changed(s)` is what the applet calls with its state, as a string, when the state settles. It fires `pudl:applet-change` on the mount.

PUDL keeps no applet state, with one opt-in. A mount outside a window that carries `data-applet-param="g"` has its applet's state kept in the page's query as `g`: each `changed()` replaces the parameter, rather than adding to the history, so a game in the middle of an article is shared by the article's own address, and Back still leaves the article. The applet receives the parameter as `opts.state`, and Back and Forward hand a changed one to `setState()`. `pudl-regions.js` carries the parameter from address to address, like the windows' parameters, and never fetches regions because it changed. Any other host, such as a window that should remember its game, answers `pudl:applet-state` from wherever it keeps the reader's continuity and listens for `pudl:applet-change` to keep it there, or keeps it nowhere. The article reader does this for its windows in a dozen lines, `samples/applets/continuity.js`. The shape to avoid is the applet reaching for `localStorage` or `history` itself anywhere but its own page.

An article about an applet wants links that set it up, such as "a glider gun". Such a link carries `data-applet-preset` with the applet's name, and its `href` is where it goes without script, which is the applet's page, or the article, with the state in the query:

```html
<a data-applet-preset="conway" href="/page/conway?preset=gosper">a Gosper glider gun</a>
```

With a running instance of that applet in the same window as the link, or, like the link, in no window, a plain click hands the state to the instance's `setState()` instead of navigating: the nearest such instance before the link, else the first after it. The state is the value of the mount's `data-applet-param` if the link carries that parameter, and otherwise the link's whole query, which is why an applet's own-page query and its state string should share one grammar. A mount that keeps its state in the address, by `data-applet-param` or on its own page, gets the link's state there as a new history entry, so Back undoes the preset as it would have undone the link. With no instance to take it, or with a modifier key, the link is an ordinary link, and the applet reads the same state from the address it arrives at.

An applet may offer commands of its own, such as Save, Word wrap or Show hidden files, with `commands()`, which returns `[{ label, run, checked, disabled }]`. The runtime asks for them each time they are shown, so an applet builds the list from its current state and every label, tick and disabled command is true when the reader sees it. A command given `checked`, true or false, switches something on and off and shows a tick while it is on. In a window the commands join the window menu, below the window's own; on a page, where there is no window menu, the runtime puts a row above the applet holding a Commands menu button with the gear glyph, whose label a mount may change with `data-applet-text-commands`, and removes the row when the applet is destroyed. `pudlApplets.commandsIn(scope)` returns the commands of the applets running inside `scope`.

An applet that listens on `window` or `document`, or starts a timer, must undo that in `destroy()`; an `AbortController` passed to every `addEventListener` makes that one call.

The runtime loads each stylesheet and script once, however many mounts name it. It starts the applets in the page when the page loads, those in each window as the window opens and those in a region as `pudl-regions.js` swaps it in, and destroys them as their window closes or their region goes, so a page needs no wiring. `pudlApplets.boot(scope)` and `pudlApplets.destroy(scope)` are there for content a project adds or removes some other way. A mount's `data-applet-state` reads `loading`, `waiting`, `running` or `error`.

### When an applet starts

A layout of many windows, restored from its address, would start every window's applet at once, and they would all compete with the one window the reader is looking at. An applet may say when it would rather start (0.66.0), with `start` in `define()` or `register()`, or with `data-applet-start` on its mount, which wins:

- `"open"`, the default, starts it as its window opens, as before.
- `"seen"` starts it the first time its window is seen: when the window comes to the front, takes focus or a press, or is shown in a dock or a zone that no window above it covers. A window partly showing behind another is not counted, and a minimised one is not seen until it is restored. On a narrow screen only the window in front is seen.
- `"idle"` starts it when seen, and also, while its window has not been seen, once every applet started before it is ready, one at a time, so a restored layout fills in behind the front window.

Outside a window the choice has no effect. Until an applet starts, its mount is hidden and reads `waiting`, a loading line stands in its place, in the words of the mount's `data-applet-text-loading` or "Loading…", and the window carries `aria-busy="true"`, which dims the applet and shows the progress cursor. An instance may offer `ready`, a promise that settles once it can be used, such as after it has fetched what it shows, and the window stays busy until then. A window closed before it was seen closes without starting its applet. `pudl:applet-start` fires on the mount as the applet starts, with `detail.reason`: `"open"`, `"seen"`, `"idle"` or `"host"`. `pudlApplets.started(key)` says whether every applet in a window has started, and `pudlApplets.start(key)` starts them now, answering a promise that settles when they are ready, for a host command that needs every instance, such as saving every open document.

A window's title comes from its markup, as always, so a host that creates a restored window should give it the title it will have, rather than leave the applet to set it once it runs. PUDL keeps nothing but the address.

### Requests between applets

Once a site has several applets, they start to ask each other for things: a file manager opens a file in the editor, a terminal opens one too, and the file manager opens a terminal in a folder. An applet declares the requests it serves in its `define()`, and a caller asks for a request without naming an applet:

```js
pudlApplets.define('editor', { src: '/js/editor.js', page: '/page/editor',
  handles: { open: { param: 'file', kinds: ['file', 'script'] } } });
pudlApplets.define('terminal', { src: '/js/terminal.js', page: '/page/terminal', instances: 4,
  handles: { shell: { param: 'cwd', extra: ['run'], reuse: false } } });

if (pudlApplets.can('open', 'file')) {
  pudlApplets.request('open', { path: '~/notes.md', kind: 'file' }, button);
}
```

A request is a verb and a path, and optionally a kind and further parameters. The verbs and kinds are the project's own words; PUDL routes them and gives them no meaning. The first applet defined that serves the verb, and the kind if it lists kinds, answers, with the state `param=path`, followed by any `extra` parameters the request carries, with a path's slashes and tildes left readable. `request()` returns false when nothing serves it, so a caller can fall back or hide the action, and `can()` asks the same question without acting.

On a page with windows, the request goes to the applet's newest open instance, whose window comes forward and whose `setState()` takes the state, as Back, Forward and preset links already do; what adopting it means is the applet's affair, and an editor may open the file in a new tab. With no instance open, or when the verb says `reuse: false`, it opens a new instance in a new window while fewer than `instances` of them are open, and the new instance starts with the state, ahead of anything the host's `pudl:applet-state` listener offers, because the reader asked for it just now. At the limit, the newest instance takes the request. The instances' keys are the applet's name, then `name-2` to `name-9`, passing over any key an unrelated window already holds. On a page without windows, the browser goes to the applet's page with the state as its query, in a new tab when that page is the one the caller is on.

A window source must answer the numbered keys. A server renders the applet's window again for `/window/terminal-2`, with the number in its title, after checking that no real page has that key; a page whose windows come from templates needs nothing more, because a numbered key with no template of its own takes the template of the unnumbered one, with the number added to its title.

`opts.instance` and `pudl:applet-state`'s `detail.instance` carry the key an instance goes by, its window's key or, outside a window, the applet's name, so a host can keep each instance's state apart. That matters for one reason: a request's state reaches a new window through memory, not through the address, which the windows own. A reload keeps the window but not the state a request gave it, unless the host keeps it for that instance.

### Actions

An applet may publish **actions** (0.68.0): things it does that a script, the page, a server or an agent calls by reference and that answer with a result, with the input and output checked against JSON Schemas, and without the applet's window unless the action is about a window. `pudl-actions.js` is the broker, and the specification's chapter 9 states the contract for any host. Load it after `pudl-applets.js`; it loads `pudl-actions-core.js` and the validator in `vendor/` beside it when first used.

```js
pudlApplets.define('dice', { src: '/js/dice.js', ver: '3', actions: '/js/dice-actions.json' });
```

The manifest lists the provider, such as `example.dice`, and its actions, each with a reference such as `example.dice/roll@1`, a title and description, `inputSchema` and `outputSchema`, `capabilities` and `replay`, and optionally `handles`, a request verb, or `live`, for an action the open applet answers. `module`, a script beside it, hands over the handlers the first time one runs: `pudlApplets.provide('example.dice', { 'roll@1': function (input, ctx) { return { output: { … } }; } })`. A live action's handlers come from the running applet, `pudlApplets.attach(id, handlers)`, which returns the function that detaches them. `pudlApplets.publish(url)` adds a manifest that belongs to no applet.

- **Replay.** `pure` has no effect beyond its result and may run anywhere, any number of times. `once` has effects and is never run again unasked; a caller that may retry passes `opts.id`, and a second call with that id answers with the first. `human` asks the reader a question, in a dialog, and waits.
- **Capabilities.** PUDL's are `artifact.create`, `attention.request`, `notification.post` and `window.open`; a project adds its own with `pudlApplets.capability(name, give)`, where `give(ctx, record)` returns the services a handler is handed, such as `{ files: … }`. A manifest naming any other is refused.
- **Grants.** A caller passes `opts.grant`, the capabilities it holds, or `"all"`; with none it holds `artifact.create` alone. A command a person presses holds everything. For an action needing more than its caller holds, a host may set `pudlApplets.confirm`, a function given `{ action, missing, owner }` that resolves true to let it run, so the person decides what an agent may do for them.
- **Calling.** `pudlApplets.catalog()`, `describe(ref)`, `run(ref, input, opts)`, which gives the output or an error saying why not, `invoke(ref, input, opts)`, which gives the record, and `status(id)`, `wait(id)`, `cancel(id)`, `artifact(id)`, `invocations()` and `problems()`. `pudl:applet-invocation` fires on the document as each record changes.
- **Requests are actions.** Every `handles` verb with no action of its own is published as `<applet>/<verb>@1`. An action never navigates the page that called it: without windows it opens the applet's page in a new tab.
- **For agents outside the page,** a host offers the same contract through MCP as `applet_discover`, `applet_invoke`, `applet_status`, `applet_cancel` and `applet_artifact`.
- **The old name.** `window.pudlActions`, which the applet package format used first, is the same functions, deprecated; it says so once in the console and goes at 1.0.

[The commands sample](https://paulmooreparks.github.io/pudl/samples/commands.html) publishes five actions from its note editor and runs them as an agent would, asking the reader through the confirm hook.

### Sizing an applet that fills

Three lessons apply to any applet that fills a window without scrollbars, such as a game board:

- An element with `aspect-ratio` and a definite width does not carry a `max-height` back to its width, so a square board squashes. Measure instead: a wrapper with `container-type: size` takes the leftover space through flex, and the content inside it is sized `min(100cqi, 100cqb)`.
- A size container's box must come from its layout, such as flex stretch, never from its content, because a size container ignores its content's size and collapses to nothing.
- On a phone, viewport units should be `svh`, the smallest viewport, which is always wholly on screen. What counts towards `dvh` is each browser's own business: Edge for Android answers differently from Chrome, and a number pad went under its bottom bar.

Content with a size of its own, such as a `<canvas>` with real pixel dimensions, is scaled into the box rather than resized. In the fill habitat give it `max-width: 100%; max-height: 100%; width: auto; height: auto` inside the elastic stage, so it keeps its proportions and shrinks to fit. The pointer then no longer lands on the pixel it appears to: map each event back through the canvas's displayed size,

```js
var r = canvas.getBoundingClientRect();
var x = (e.clientX - r.left) * canvas.width / r.width;
var y = (e.clientY - r.top) * canvas.height / r.height;
```

and give the canvas no border or padding, or subtract them, since the rectangle includes both.

`samples/colour-mixer.html` is an applet in a page of its own, `samples/applet-article.html` embeds the same applet in an article, keeps its state in the article's address and sets it from preset links, and the article reader runs it in a window that remembers its colours.

## Accessibility, languages and print

**High contrast.** In Windows' high-contrast mode the browser replaces the page's colours and removes every shadow, which is how PUDL draws its focus rings and much of its raised and sunken treatment. In that mode PUDL draws focus as a real outline, keeps a border on every control, and marks selected and pressed states, the active window's title bar and the current dock tab with the system's highlight colours.

**Less motion.** A reader whose system asks for reduced motion gets none: every PUDL transition and animation completes at once.

**Right to left.** On a page or element with `dir="rtl"`, PUDL's layout mirrors: the master-detail sidebar sits on the right, a selected row marks the edge facing the detail, the divider widens the sidebar by moving left and the arrow keys follow suit, a menu lines up with its button's right edge, the back link's arrow and the child rows' branch glyph turn round, and a switch that is on slides left. Window positions stay measured from the left of their area, because they are coordinates in the URL, not reading order.

**The page's own words.** The scripts write a few words into the page, and each can come from the page instead, so a server can render them in the reader's language. English is the default.

| Words | Where to set them |
|---|---|
| The maximise and restore buttons' labels | `data-win-text-maximize` and `data-win-text-restore` on the window layer |
| A minimised window's dock tab tooltip | `data-win-text-minimized` on the layer, with `{title}` for the window's title |
| The label on a window's title bar | `data-win-text-head` on the layer, with `{title}` |
| The dock button's labels, and a docked window's minimise button | `data-win-text-dock`, `-undock`, `-collapse` and `-expand` on the layer |
| The window menu's Dock list | `data-win-text-dock-menu`, and `-dock-top`, `-dock-bottom`, `-dock-left` and `-dock-right` for its edges, on the layer |
| The heading over the window menu's layout picker | `data-win-text-snap-menu` on the layer, "Snap" unless it says otherwise |
| A menu filter's "nothing matches" | `data-menu-empty` on the `.menu-panel`, or render the `.menu-empty` element yourself |
| The sidebar divider's label | `aria-label` on the `.md-resize` |
| The divider's spoken width | `data-md-valuetext` on the `.md-resize`, with `{n}` for the width in pixels |

**Print.** A printed page carries the content without the chrome: no topbar, tab bar, toolbars, filter chips or divider, black on white even from the dark theme. A master-detail layout showing a record prints the record alone, and with windows open, the window in front prints as the page's content, title and body, without its frame or buttons; the other windows, and whatever lies under them, do not print.

## What is in the repository

Everything a project uses is in `dist/`, and everything else supports it.

- `dist/`, the files a project copies or loads:
  - `pudl.css`, the tokens and component classes
  - `pudl-theme.js`, the pre-paint theme loader and toggle
  - `pudl-windows.css` and `pudl-windows.js`, the optional floating windows
  - `pudl-menu.js`, the optional script that places menu panels and adds their keyboard and filter
  - `pudl-applets.js`, the optional applet runtime
  - `pudl-regions.js`, the optional script that swaps only the regions a navigation changes
  - `pudl-md.js`, the optional script that resizes the master-detail sidebar
  - `pudl-dialog.js`, the optional script that supplies the dialog command buttons in browsers that lack them
  - `pudl-toast.js`, the optional script that raises and dismisses toasts and dismisses notices
  - `pudl-tabs.js`, the optional script for tabs within a page
  - `pudl-combo.js`, the optional script for combo boxes, searchable selects and token fields
  - `pudl-date.js`, the optional script for date and time fields with PUDL's calendar
  - `pudl-listbox.js`, the optional script for list boxes
  - `pudl-fields.js`, the optional script for meters, sliders, number fields, password fields, and failed pictures in figures and avatars
  - `pudl-tooltip.js`, the optional script that shows tooltips on glyph-only controls
  - `pudl-tree.js`, the optional script that makes nested lists of links into trees
  - `pudl-grid.js`, the optional script for tables whose rows are choices
  - `pudl-hljs.css`, the optional stylesheet that colours highlight.js's classes from the syntax tokens
  - `pudl-code.js`, the optional script that gives code blocks Copy and Download
  - `pudl-split.js`, the optional script for splitters between two panes
  - `pudl-disclose.js`, the optional script for cards that open and close
  - `pudl-zoom.js`, the optional script that scales a picture in a viewport that scrolls
  - `pudl-rows.js`, the optional script that keeps focus right in a row editor
  - `pudl-toolbar.js`, the optional script that makes a toolbar one tab stop besides its fields, and folds one marked `data-toolbar-fold` (preview)
  - `pudl-actions.js`, `pudl-actions-core.js` and `vendor/cfworker-json-schema-4.1.1/`, the optional applet actions: the broker, the rules any host shares, and the JSON Schema validator it loads (MIT, see its `NOTICE.txt`)
  - `pudl-commands.js`, the optional declared commands (preview)
  - a notice and a toast keep an unbroken word, a code block and a long action inside the card (0.62.0); give a long action its whole label as `title`
  - `pudl-menubar.js`, the optional script for an application's menu bar in its topbar
  - `pudl-components.json`, the components described for tools, which `docs/COMPONENTS.md` explains; a page never loads it
  - `pudl-fonts-full.css` and `pudl-fonts-system.css`, the optional stylesheets that set text in the whole of Inter or in the platform's own face
  - `min/`, a minified copy of every script and stylesheet under the same name, with its source map
  - `fonts/`, Inter script subsets, lean and full, and retained whole variable fonts, with its licence
  - `LICENSE`, a copy of PUDL's licence, so that it travels with the files
- `reference.html`, the living reference for every component, also published at https://paulmooreparks.github.io/pudl/reference.html
- `samples/`, working pages built with PUDL: `article-reader.html` and its two category pages, a reading site with articles in windows, listings as child windows, a launcher, an applet and category tabs that swap only the list, also published at https://paulmooreparks.github.io/pudl/samples/article-reader.html; `windows/`, the markup of each of its windows, as a server would return it; `colour-mixer.html`, the applet in a page of its own; `applet-article.html`, the same applet embedded in an article; `applets/`, the applet and the registry that names it; and `expenses.html` with `expense.html`, `expense-edit.html`, `trips.html`, `trip.html`, `trip-edit.html` and `reports.html`, the expense tracker, whose `expenses-app.js` stands in for its server: it renders each page from its address and handles each form, keeping the data in the browser's localStorage; and `files.html`, the file browser, whose `files-app.js` does the same for it, with its editor and preview applets in `applets/` and pages of their own in `editor.html` and `preview.html`. The article reader fetches its windows, so it needs a web server; opened from the file system, its windows cannot load.
- `examples/`, three example themes: `brand.css` changes only the accent, `slate.css` replaces the whole palette, and `parchment.css` is the warm palette PUDL used by default up to 0.2.0
- `vendor/pudl-spec/`, the specification's tokens and glyphs at the version this release implements, copied from a tag of pudl-spec and never edited here
- `build/`, the maintainer's build steps, which a project never runs: `tokens.js` writes the token block of `dist/pudl.css` from the specification's tokens, `fonts.py` writes the font subsets and their font faces, and `minify.js` writes the minified copies
- `docs/BUILDING-SCREENS.md`, putting the components together into screens, written for agents first
- `docs/CONTRACT.md`, everything a project may rely on
- `docs/COMPONENTS.md`, the component list for tools, the grammar categories its test measures, and the gaps it has found
- `docs/proposals/`, design proposals and the decisions taken on them
- `tests/`, the browser tests, their runner `run.js`, and in `fixtures/` the pages some of them need beyond the samples
- `package.json`, which installs Playwright and axe for the tests and esbuild for `build/minify.js`, and `.github/workflows/test.yml`, which runs the tests in three engines on every push, and once more in Chromium against the minified copies
- `RELEASING.md`, the steps for cutting a release
- `CHANGELOG.md`, what changed in each release

## Tests

The tests drive the samples and the reference page in real browsers through Playwright. `npm ci` installs it, `npx playwright install` fetches the browsers, `npm test` runs every suite in Chromium, and `npm run test:all` runs them in Chromium, Firefox and WebKit. `node tests/run.js firefox windows` runs one engine and only the suites whose names contain `windows`. The runner serves the repository itself on port 8765, and runs the suites several at a time across the engines, eight by default or `PUDL_JOBS`; a suite that runs longer than two minutes, or `PUDL_SUITE_TIMEOUT` seconds, is stopped and counted as failed. It ends by naming the slowest suites. Where Playwright cannot fetch its own browsers, `PUDL_EXECUTABLE=/path/to/chromium npm test` uses one already installed. GitHub Actions runs all three engines on every push and pull request.

## Status

This is version 0.89.0, and PUDL is below 1.0, so a minor release may still change what a project sees.

The [responsive workspace guide](docs/RESPONSIVE-WORKSPACES.md) covers narrow placement policies, compact chrome, menu overflow, splitter targets and single-pane presentation, with adoption instructions for a reader application and a tools workspace.

## Lineage

PUDL supersedes earlier design languages and keeps the control vocabulary they settled on, a grammar modelled on desktop toolkits, GTK in particular. PUDL borrows ideas from GTK and contains none of its code, stylesheets or artwork.

## Licence

PUDL is released under the Apache License 2.0. See `LICENSE`, which `dist/LICENSE` copies. Inter, in `dist/fonts/`, is by Rasmus Andersson and the Inter Project Authors and is released under the SIL Open Font License 1.1. See `dist/fonts/Inter-LICENSE.txt`.
