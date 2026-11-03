# A path bar that keeps to one line

Status: accepted on 3 November 2026, to be built in the next point release.

## The problem

A path bar wraps. `.path ol` is a wrapping flex row, so a deep place in a narrow container breaks the path onto two or three lines. A path bar usually stands in a toolbar or above a list, and as the reader moves between a shallow place and a deep one, the bar's height changes and everything below it moves. Every file manager a reader knows keeps its path to one line.

## The change

A path bar keeps to one line by default. When its places do not fit, the places above the current one shrink, each to an ellipsis, and the current place shrinks last. When they still do not fit at their smallest, the bar scrolls sideways, and it starts scrolled to its end, so the current place is always in sight. The scrolled-off places stay in the Tab order, and a place that takes focus is scrolled into view, as any focused element in a scrolling box is.

```css
.path { display: flex; flex-direction: row-reverse; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.path ol { flex-wrap: nowrap; }
.path li { flex: 0 1 auto; min-width: 3em; }
.path li:last-child { flex-shrink: 0; min-width: 0; max-width: 100%; }
```

The `row-reverse` on the bar, around its single `ol`, is what starts it scrolled to its end without script: a box whose content flows from its end starts with its end in view. It must be confirmed in all three engines. If any engine does not honour it, the fallback is a few lines in an existing script that set `scrollLeft` to the end when a path bar is drawn or changed, and the documentation says so. The bar's own reading order and the list's order do not change.

A shortened place keeps its whole name in its `title`, so the pointer can read it; the documentation for `.path` says the host gives each place its `title`, as it already gives the current place `aria-current`.

A page that wants the old wrapping path marks the bar `.path.wrap`, a documented modifier alongside `.path.mono`, rather than overriding PUDL's rules.

## Contract

The contract's Path bar row gains the one-line behaviour, the `title` on each place, and the `.wrap` modifier. The changelog says that path bars no longer wrap unless marked `.wrap`, since a page relying on wrapping sees a change.

## Tests

A path bar of eight places in a container 20em wide: one line, the leading places ended in an ellipsis, the current place whole and in view at load, each shortened place with its whole name as its tooltip. A path bar in a toolbar that is narrowed and widened: the toolbar's height never changes. Tabbing back to the first place scrolls it into view. A short path in a wide container looks as it did. `.path.wrap` wraps as before. Both themes, a right-to-left page, and forced colours, where the drawn separators still show. Chromium, Firefox and WebKit.
