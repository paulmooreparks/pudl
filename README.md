# PUDL

PUDL is the Pleasantly Usable Design Language. It rhymes with "puddle", which is a joke at its own expense, because a puddle is the flattest thing there is and PUDL insists that everything a user can touch has depth.

I built PUDL as an answer to flat design. Flat design began as a fair rebellion against skeuomorphism, and it went on to strip out the cues that tell a user what can be pressed, what can be typed into, and what can only be read. PUDL gives every affordance one visual representation. Somebody who has learned it in one application should be able to open any other application built with it and know how to use it on sight.

It is a single stylesheet with no framework and no build step. Every project that uses it carries a copy.

## The rules

- **Elevation signals interactivity.** A raised control, with a hairline border and an inset highlight, can be pressed. A sunken field, with an inset shadow, takes input. Anything flat is there to be read.
- **Categories stay separate.** Buttons, links, status badges and chips each look like themselves, and none of them borrows another's appearance.
- **Colour is never the only signal.** Every meaningful state carries a glyph as well as a colour, so the interface still reads for somebody with red-green colour blindness (WCAG 1.4.1).
- **Each visible context has at most one primary button.** A view that seems to need two has a secondary or destructive action hiding in one of them.
- **Links are underlined.** The brand wordmark in the topbar is the only exception.
- **Numerals are tabular everywhere**, so identifiers, counts, money and timestamps line up.
- **Dialogs are rendered by the server** and shown by script, and a page never falls back on the browser's own `confirm()`.

`reference.html` shows every component in both themes and lists the rest of the invariants.

## Using it

Copy a tagged release into your project and load three files in this order:

```html
<script src="pudl-theme.js"></script>
<link rel="stylesheet" href="pudl.css">
<link rel="stylesheet" href="brand.css">
```

`pudl-theme.js` goes first so that the saved theme is applied before the first paint. It sets `data-theme` on the `<html>` element to `light` or `dark`, and it gives you `pudlToggleTheme()` for a toggle button.

A project brands PUDL by setting `--accent` and `--accent-hover` in its own stylesheet and leaving every other token alone. The accent reaches links, primary buttons, focus rings, the segmented control, chips and filter chips, so those two values are enough to make a project recognisably its own while the elevation cues stay exactly as a user learned them. `examples/brand.css` shows an override with a separate pair for the dark theme, which most accents need.

The parchment palette and the dark leather topbar are PUDL's own, and they stay the same in every project. They are what makes an application recognisable as a PUDL application.

Pin a release rather than tracking the default branch. A change to PUDL reaches a project when that project copies a newer tag, and never by surprise.

## What is in the repository

- `pudl.css`, the tokens and component classes
- `pudl-theme.js`, the pre-paint theme loader and toggle
- `reference.html`, the living reference for every component
- `examples/brand.css`, an example brand override

## Status

This is version 0.1.0 and it is incomplete. The stylesheet was extracted from the Andoneer Design Language v2 reference page, which is the fullest statement of these ideas so far, and it has not yet been used on its own in a project. The reference page describes floating windows with a composite resize border, but PUDL ships no class for them yet, and it ships no script for dragging or for resizing the master-detail sidebar.

## Lineage

PUDL supersedes three earlier design languages. The Tela Design Language came first. The Andoneer Design Language and the Planning Fit Design Language extended it for their own products, and the second version of the Andoneer Design Language moved the control vocabulary to a grammar taken from GTK. PUDL is that second version, separated from Andoneer so that every project can share it.

## Licence

PUDL is released under the Apache License 2.0. See `LICENSE`.
