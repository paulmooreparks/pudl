# Response: the go palette

Status: accepted in a different shape, 2026-09-28, scheduled for 0.17.0. Answers `Architecture/pudl-proposal-go-palette.md` in the parkscomputing repository.

The proposal describes a bar summoned by a key that takes typed text and turns it into an address, and it suggests either a small `.palette` primitive now or waiting until a command palette is worth designing. PUDL already has most of the second, in the menus of 0.8.0. A menu panel with an `.md-filter` at the top is a list of places that narrows as the reader types, moves with the arrow keys, and follows the first match on Enter. That is a go palette with completion, which the site's version does not have. A second component for the same job would be the duplication the road to 1.0 is trying to remove.

So the palette becomes a way to summon a menu, not a new component:

- A `.menu-panel` may carry `data-menu-key`, a single unmodified printable key such as `/`. Pressing it anywhere outside an editable field opens the panel and puts focus in its filter. The key types normally inside any field, the filter included, which is the proposal's first design point.
- A panel with a button opens against the button, as now. A panel without one, which a page may keep purely for the key, opens near the top centre of the window, where keyboard palettes conventionally sit.
- When the filter sits in a GET form and the reader presses Enter with no match left, the form submits as it would without script, to whatever address the server gives it, such as a redirecting "go" endpoint that takes a slug. Everything the palette does therefore remains an address, which is the proposal's second design point. With a match left, Enter follows the match, as it does today.
- PUDL still does not interpret the text. The page decides what its rows are and what its form's action does.

On parkscomputing.com the launcher can carry `data-menu-key="/"`, and the site's local bar becomes a launcher summoned by key, with the site's articles as completions. A command syntax, results ranked beyond "contains", and actions run from the keyboard remain out of scope until a second use asks for them.
