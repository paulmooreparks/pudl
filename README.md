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

Copy a tagged release into your project, keeping the `fonts` folder beside `pudl.css`, and load three files in this order:

```html
<script src="pudl-theme.js"></script>
<link rel="stylesheet" href="pudl.css">
<link rel="stylesheet" href="brand.css">
```

`pudl-theme.js` goes first so that the saved theme is applied before the first paint. It sets `data-theme` on the `<html>` element to `light` or `dark`, and it gives you `pudlToggleTheme()` for a toggle button.

A project themes PUDL with its own stylesheet, loaded after `pudl.css`. It may replace the whole palette, background and topbar included, and it may change the fonts, within the restrictions below. The neutral graphite palette in `pudl.css` is a default that a project is free to replace.

A palette is the block of tokens at the top of `pudl.css` under "The palette": six for the page and text, seven for the accent and status colours, four for lighting and two for the topbar, each given once for the light theme and once for the dark. Every other token is derived from those, so a theme sets nothing else. Set them on `:root` and on `[data-theme="dark"]`, because that is where the derived tokens are computed.

The lighting tokens are what keep the raised and sunken surfaces readable on a new palette. `--light` is the colour of the light falling on a raised control and `--shade` the colour of its shadow. `--lit` sets how strongly the highlight shows and `--depth` how strongly the shadow does. A light theme usually wants a strong highlight and a soft shadow, and a dark theme the reverse. What stays constant from one project to the next is the grammar: a user who has learned what raised, sunken and flat mean in one application finds the same meanings in every other.

The smallest useful theme changes only `--accent` and `--accent-hover`. The accent reaches links, primary buttons, focus rings, the segmented control, chips and filter chips, so those two values alone make a project recognisably its own. `examples/brand.css` shows one, with separate values for the dark theme. `examples/slate.css` replaces the whole palette with a cool slate one and gives it a light topbar. `examples/parchment.css` restores the warm parchment and leather palette with serif headings that PUDL used by default up to 0.2.0, which is also the Andoneer look.

PUDL sets text in Inter, which it ships in `fonts/` as one variable file for each style, because Inter is not installed by default on Windows or macOS and a font loaded from a third-party server breaks offline and on an intranet. Until the file loads, and on any system where it cannot, the platform's own interface face stands in. Headings use Inter too, and the font's optical-size axis tightens it at heading sizes. Machine values use the platform's monospace face.

## What a project may change

A theme may change any colour token and the font tokens, provided the result keeps these rules.

- **The three surfaces stay distinct.** A raised control must still read as raised against the surface behind it, a sunken field as sunken, and flat content as flat. A theme tunes this with the four lighting tokens and leaves the derived raised and sunken tokens alone.
- **Contrast meets WCAG 2.2 AA.** Body text needs 4.5:1 against its background. Control boundaries and focus indicators need 3:1 against what surrounds them (WCAG 1.4.11).
- **Status colours stay apart.** `--warn`, `--danger`, `--pr` and `--accent` must remain distinguishable from one another, and each still carries its glyph.
- **Both themes exist.** A project supplies light and dark values for every token it changes.
- **Fonts keep their roles.** Body text uses a legible sans-serif interface face. Identifiers, versions, timestamps and other machine values use a monospace face. The display face for headings and the brand wordmark may be any legible face, serif included. Numerals stay tabular where numbers are data, and weights stay between 400 and 700.

The type scale, the spacing grid and the corner radii belong to the language and do not change per project.

Pin a release rather than tracking the default branch. A change to PUDL reaches a project when that project copies a newer tag, and never by surprise.

## What is in the repository

- `pudl.css`, the tokens and component classes
- `pudl-theme.js`, the pre-paint theme loader and toggle
- `fonts/`, Inter in its upright and italic variable files, with its licence
- `reference.html`, the living reference for every component
- `examples/brand.css`, a theme that changes only the accent
- `examples/slate.css`, a theme that replaces the whole palette
- `examples/parchment.css`, the warm palette PUDL used by default up to 0.2.0

## Status

This is version 0.3.0 and it is incomplete. The stylesheet was extracted from the Andoneer Design Language v2 reference page, which is the fullest statement of these ideas so far, and it has not yet been used on its own in a project. The reference page describes floating windows with a composite resize border, but PUDL ships no class for them yet, and it ships no script for dragging or for resizing the master-detail sidebar.

## Lineage

PUDL supersedes three earlier design languages. The Tela Design Language came first. The Andoneer Design Language and the Planning Fit Design Language extended it for their own products, and the second version of the Andoneer Design Language moved the control vocabulary to a grammar taken from GTK. PUDL is that second version, separated from Andoneer so that every project can share it.

## Licence

PUDL is released under the Apache License 2.0. See `LICENSE`. Inter, in `fonts/`, is by Rasmus Andersson and the Inter Project Authors and is released under the SIL Open Font License 1.1. See `fonts/Inter-LICENSE.txt`.
