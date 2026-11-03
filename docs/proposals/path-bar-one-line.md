# A path bar that keeps to one line

Status: accepted on 3 November 2026, built for 0.97.7 with one change to the mechanism, recorded below.

## The problem

A path bar wraps. `.path ol` is a wrapping flex row, so a deep place in a narrow container breaks the path onto two or three lines. A path bar usually stands in a toolbar or above a list, and as the reader moves between a shallow place and a deep one, the bar's height changes and everything below it moves. Every file manager a reader knows keeps its path to one line.

## The change

A path bar keeps to one line by default. When its places do not fit, the places above the current one shrink, each to an ellipsis, and the current place shrinks last. When they still do not fit at their smallest, the bar scrolls sideways, and it starts scrolled to its end, so the current place is always in sight. The scrolled-off places stay in the Tab order, and a place that takes focus is scrolled into view, as any focused element in a scrolling box is.

```css
.path { display: flex; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.path:dir(ltr) { direction: rtl; }
.path:dir(ltr) > ol { direction: ltr; margin-right: auto; }
.path:dir(rtl) { direction: ltr; }
.path:dir(rtl) > ol { direction: rtl; margin-left: auto; }
.path ol { flex-wrap: nowrap; justify-content: flex-end; }
.path li { flex: 0 1 auto; min-width: 3em; }
.path li:last-child { flex-shrink: 0; min-width: 0; max-width: 100%; }
.toolbar > .path { flex: 1 1 0; }
```

The proposal's mechanism was `row-reverse` on the bar around its single `ol`, so that the bar's content flowed from its end. Confirmed in all three engines, it held in Chromium and Firefox, which place a reverse-direction flex container's scroll origin at its flex start, and failed in WebKit, which keeps the origin at the left and leaves what overflows to the left unreachable, so the leading places could not be scrolled or focused into view there. The build uses instead what every engine documents for a right-to-left scroll container: it starts at its right edge, and what its content overflows to the left is its scrollable overflow. The bar is a scroll container of the opposite direction to the page, holding the list in the page's own direction, with the list packed toward its end so that what does not fit overflows toward the page's start. A short list is pushed back to the page's start by an auto margin. No script is involved, and the fallback was not needed. The bar's own reading order and the list's order do not change.

In a toolbar, which wraps its items, the bar is told to take the room between the buttons, since a flex item's natural width would otherwise wrap it onto a line of its own before it shrank.

A shortened place keeps its whole name in its `title`, so the pointer can read it; the documentation for `.path` says the host gives each place its `title`, as it already gives the current place `aria-current`.

A page that wants the old wrapping path marks the bar `.path.wrap`, a documented modifier alongside `.path.mono`, rather than overriding PUDL's rules.

## Contract

The contract's Path bar row gains the one-line behaviour, the `title` on each place, and the `.wrap` modifier. The changelog says that path bars no longer wrap unless marked `.wrap`, since a page relying on wrapping sees a change.

## Tests

A path bar of eight places in a container 20em wide: one line, the leading places ended in an ellipsis, the current place whole and in view at load, each shortened place with its whole name as its tooltip. A path bar in a toolbar that is narrowed and widened: the toolbar's height never changes. Tabbing back to the first place scrolls it into view. A short path in a wide container looks as it did. `.path.wrap` wraps as before. Both themes, a right-to-left page, and forced colours, where the drawn separators still show. Chromium, Firefox and WebKit. These are `tests/path-bar.test.js` on `tests/fixtures/path-bar.html`. In WebKit, whose Tab moves past links as Safari's does by default, the first place takes focus by script, and what is checked is that it comes into view as it does.
