# The component list

`dist/pudl-components.json` describes PUDL's components for tools, so that a tool can offer them, insert them and check them without reading the README. It was started on 5 October 2026 for PUDL Studio, the development tool in [pudl-desktop](https://github.com/paulmooreparks/pudl-desktop), whose palette, property sheet and checks are built from it. It formalises the component table of the [web contract](CONTRACT.md). The contract stays the promise; the list is the same promise in a form a program reads, and `tests/components.test.js` fails when the two, or the list and the stylesheet, drift apart.

The list is web-specific today, since its templates are HTML and its parts are CSS selectors. The platform-neutral part, which is each component's name, its kind, the grammar of its parts and its variants and states, moves into the PUDL specification when a second implementation needs it.

## What each entry holds

| Field | Meaning |
|---|---|
| `id`, `name` | A stable identifier, and the name a tool shows |
| `kind` | The component's category in the grammar, which a palette groups it by: one of the keys of `grammar` at the top of the file |
| `spec` | The section of the PUDL specification that defines it |
| `requires` | The files in `dist/` it needs besides `pudl.css` |
| `template` | The smallest markup that shows the component working, ready to insert |
| `parts` | Its surfaces: each a `selector` within the template, an optional `pseudo`-element, and the `surface` the part has in the grammar |
| `variants` | Classes that change it, each with its `name` and `class`, the part it goes `on` when not the root, and a `group` when only one of a group applies |
| `states` | Attributes that say its state, each with its `name`, `attribute`, the `value` that means the state when not a boolean attribute, and the part it goes `on` |
| `properties` | Other attributes a tool should offer, with `values` when they are a fixed set and `required` when the component is wrong without them |
| `slots` | Where a tool may place other components, by selector |
| `opener` | Markup that opens the component, for one that starts closed, such as a dialog |
| `context` | Where it belongs when that is not anywhere in a page, such as `page-top` for section tabs |

The `structure` list at the end names the parts of an application that are not placed like a component, such as the application bar, the menu bar, windows and applet mounts, with the markup that marks each and the files it needs.

## The grammar's categories

The specification's chapter on grammar has more than the three elevations. A part's `surface` is one of these:

- `raised`, which can be pressed;
- `sunken`, which takes input;
- `flat`, which is there to be read;
- `list`, a list of places or choices, whose rows are flat but respond and mark the current one;
- `handle`, which is dragged, flat with the grip glyph;
- `link`, which goes somewhere;
- `tab`, which is raised except the current tab, which stands flat and open into its content;
- `layout`, which arranges other components and has no surface of its own.

The test measures every part in both themes and in Chromium, Firefox and WebKit. A raised part has a gradient fill and a shadow, outside it or along its top edge; a sunken part has a shadow inside its top edge and neither a gradient nor a shadow outside; the flat categories have neither the gradient nor the inner shadow.

## Known gaps

The test keeps a list of parts known not to look like their category in an engine, each with its reason, so that none passes silently. The list is empty.

Its first entry was a select in WebKit, which drew the select itself, raised and lit, and clipped its text. Specification 0.8.0 settled that a select's opener is PUDL's, and 0.47.0 draws a select in a `.form-select-wrap` with the browser's drawing turned off and the caret glyph as its opener. The engine tested is Playwright's WebKit on Windows; Safari on a Mac has not been checked.

## What Studio will need that PUDL does not have

Building a palette from the list shows what a development tool needs and PUDL lacks. These are gaps in the language, to be designed in the specification first, not workarounds for Studio:

- **Layout**, done in 0.53.0: `.vstack`, `.hstack` and `.auto-grid`, in the list as `stack`, `row` and `column-grid`.
- **A slider**, for a value in a range.
- **A progress bar.** The specification mentions progress in its chapter on empty and loading states but does not define a component.
- **A combo box**, a text field that suggests values as the reader types.
- **A list box**, a list from which the reader chooses one item or several, in a form.
- **An image**, with its caption and how it fits its space.
