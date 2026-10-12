# Controls the Flow Window Built for Itself: PUDL's Answer

This is PUDL's design for an application's proposal `pudl-flow-ui-controls.md` (13 October 2026), which asks for six components and one correction. It records what an application built, where that departs from the design language, what PUDL will provide, and the decisions that shape each component. It is the plan for one release, PUDL 0.60.0 with specification 0.21.0; the work is not done yet.

## What is not compliant today

The proposal is right about the five departures it names, and reading an application's `app.css`, `app.js`, `flow-values.js` and `flow-chart.js` turns up two more. Each is listed here once so that the fixes below can be judged against them.

1. **A flat control that is pressed.** The head of a flow step is a `<button class="flow-step-twisty">` with no border and no fill. Chapter 2 of the specification allows a flat thing to be pressed only as a row in a list of places or choices; everything else that can be pressed is raised. A step's head is neither, so the closed card gives no sign that it opens. The same shape appears twice more in `app.js`: the activity log's tool groups (`.tool-group-head`, with a chevron) and the pins strip's `#pin-expand`. The disclosure card below should replace all three.
2. **Glyphs the host draws.** The step head's caret is turned by an application's own rule, and Move Up turns `--glyph-chevron` through 180 degrees. A glyph that a host turns is one PUDL is not drawing, and it cannot keep it right in every theme, size and writing direction.
3. **Characters standing in for glyphs.** The zoom buttons hold the characters "−" and "+". The glyph-buttons section says a character from a font must not take a glyph's place, because a character can fall back to another face or render as an emoji, and then it no longer means what it did.
4. **A command dressed as an input.** "Insert an Answer…" is a `<select>` that holds no value. A select is sunken because it takes input; this one performs a command, which is a raised control's job. Chapter 2's categories do not allow a control to borrow another category's surface.
5. **Rows that are buttons without addresses.** Each run in the Runs tab is a `<button class="run-item">` that opens the run in place. The row look is right, but PUDL's rows are links to places, because every state a reader can reach must have an address (chapter 7, and the Architectural Principles' URL-is-king rule). A run has no address today, so it cannot be bookmarked, shared or restored with the window.
6. **Lists that do not fit their window.** The four row editors are grids with fixed column minimums and no narrow layout, so in a narrow window they run wider than the window.
7. **Window glyphs sized in pixels.** `pudl-windows.css` draws every window button's glyph in a 12px box, 10px docked, whatever the title's size, and the caret's path fills only 9 by 5.5 of its 16 units. The menu button's mark comes out at about 7 by 4 pixels beside 14px text. This one is PUDL's, not an application's.

## 1. A disclosure card

**Decision: the toggle alone is pressable; the head stays flat.** A card is a surface for reading, and chapter 2 keeps flat things unpressable outside a list of places. So the card gets a raised toggle, drawn exactly as a tree's toggle is (16px square, `radius-xs`, the `caret` glyph at 10px turning from the reading direction's end to down), fixed at the start of its head. The rest of the head, the title, chips and summary, is flat text, as a tree node's name is. A reader finds the affordance where PUDL always puts it. Making the whole head a target as well was considered and rejected: it would be a flat thing that responds to a press, which is the departure being corrected, and the menu bar's precedent, where flat titles take their press from the raised surface around them, does not apply to a card's flat surface.

**Markup.** A card marked `disclosure` holds a head, a body and an optional foot.

```html
<section class="card disclosure">
  <div class="card-head">
    <button type="button" class="card-toggle" aria-expanded="false" aria-controls="step-1-body" aria-label="Open step 1"></button>
    <h3 class="card-title">1. Research the account</h3>
    <span class="chip">Agent</span>
    <span class="card-summary">/research-account {{inputs.account}}</span>
  </div>
  <div class="card-body" id="step-1-body">…fields…</div>
  <div class="card-actions">…Move Up, Move Down, Add a Step After, Delete…</div>
</section>
```

The server writes `aria-expanded` on the toggle, as it writes it on a tree's node, and that attribute is the open state: there is no separate `data-open`. The script (`pudl-disclose.js`, new) sets `aria-controls` where the markup left it out, hides the body and the foot while the toggle says closed, hides the summary while it says open, and answers the toggle's press, Enter and Space. Until the script runs, every part shows, so a page without script loses nothing. The toggle's accessible name is its own (`aria-label`, or "Open" and "Close" with the title, which the script maintains from `.card-title` when no label is given). `pudl:disclose` fires on the card with `detail.open`, for a page that stores which steps are open; an application keeps that in its window state and writes `aria-expanded` back when it redraws.

**Layout.** The head is a wrapping row: the toggle, then the title at the card's title size, then any chips, then the summary, which takes the remaining width on the head's line and ends in an ellipsis, at `text-sm` in `text-muted`. The card's `space-4` padding stays; the head sits inside it. The foot is the settings panel's action row (`space-2` apart, at the card's foot), so it is not a new part. Opening and closing move no content but the card's own, and nothing animates except the caret's turn, which stops under reduced motion.

**Specification.** `cards.md` gains the disclosure card and answers its own open question, "whether a whole card may be pressable": no; a card that opens carries a raised toggle.

## 2. A zoom group for a picture that scrolls

**Decision: `plus` and `minus` glyphs, not magnifiers.** The two shapes are needed elsewhere too, a row editor's Add button and any stepper, and at 16px a bare plus and minus read more surely than a magnifier with a sign inside it. The buttons' names say "Zoom In" and "Zoom Out".

**Markup.** The group is a row of raised controls around a flat readout, above a viewport that scrolls.

```html
<div class="zoom" role="group" aria-label="Chart zoom" data-zoom-for="flow-chart">
  <button type="button" class="icon-btn" data-zoom="out" aria-label="Zoom Out"><span class="glyph" style="--glyph: var(--glyph-minus)" aria-hidden="true"></span></button>
  <output class="zoom-scale" aria-live="polite">100%</output>
  <button type="button" class="icon-btn" data-zoom="in" aria-label="Zoom In"><span class="glyph" style="--glyph: var(--glyph-plus)" aria-hidden="true"></span></button>
  <button type="button" class="btn btn-sm" data-zoom="fit">Fit</button>
</div>
<div class="zoom-viewport" id="flow-chart" tabindex="0" data-zoom-min="0.05" data-zoom-max="8" data-zoom-step="1.25">
  <svg …></svg>
</div>
```

The readout is an `<output>`, flat because it shows a value, and the live region. The script (`pudl-zoom.js`, new) scales the viewport's first `svg` or `img` by setting its width and height from its intrinsic size, keeps the point at the viewport's middle where it was, holds the scale between the limits (5% to 800% unless the attributes say otherwise), disables Zoom Out and Zoom In at the limits, and makes Fit the scale at which the picture's width fills the viewport, capped at 100%. While the viewport has focus, Ctrl+Plus, Ctrl+Minus and Ctrl+0 zoom in, out and fit; Ctrl with the wheel zooms about the pointer. Each change fires `pudl:zoom` on the viewport with `detail.scale` and `detail.fit`, and a page restores a scale by setting `data-zoom-scale` or `data-zoom-fit` on the viewport before the script runs, or by calling `pudlZoom.set(viewport, scale)`. The group is tied to its viewport by `data-zoom-for`, or by being the viewport's previous sibling when the attribute is absent.

an application's lightbox (`media-viewer.js`) has a click-to-zoom of its own. It is a different interaction, and this proposal leaves it alone.

## 3. Arrows that point up and down

**Decision: `arrow-up` and `arrow-down`, not more chevrons.** Move Up and Move Down move something; an arrow with a stem says movement, where a chevron says disclosure or direction of travel into content. The two are drawn in the stroke of `download`, which is already a stemmed arrow. `chevron` stays as it is, the disclosure button's glyph, pointing down; nothing needs an upward chevron once the disclosure button turns its own.

## 4. A row editor

**Decision: a table, with the data table's stacked layout for narrow widths.** A list of like things edited as rows, each with the same fields under shared headings, is a table, and a table is what assistive technology reads best for it. PUDL's data table already stacks its rows into labelled cards on a narrow screen (`.data-table.stack`); the row editor borrows that technique rather than a second one.

```html
<div class="row-editor-wrap">
  <table class="row-editor" aria-label="Inputs">
    <thead><tr><th scope="col">Name</th><th scope="col">Label</th><th scope="col">Type</th><th scope="col">Optional</th><th scope="col"><span class="visually-hidden">Remove</span></th></tr></thead>
    <tbody>
      <tr>
        <td data-label="Name"><input class="form-input" aria-label="Name of input 1"></td>
        <td data-label="Label"><input class="form-input" aria-label="Label of input 1"></td>
        <td data-label="Type"><span class="form-select-wrap"><select class="form-select" aria-label="Type of input 1">…</select></span></td>
        <td data-label="Optional"><label class="check"><input type="checkbox"> Optional</label></td>
        <td><button type="button" class="icon-btn danger" data-row-remove aria-label="Remove input 1"><span class="glyph" style="--glyph: var(--glyph-close)" aria-hidden="true"></span></button></td>
      </tr>
      <tr class="row-editor-more"><td colspan="5" data-label="Value to return"><input class="form-input" aria-label="Value to return for output 1"></td></tr>
    </tbody>
  </table>
  <button type="button" class="btn row-editor-add"><span class="glyph" style="--glyph: var(--glyph-plus)" aria-hidden="true"></span> Add an Input</button>
</div>
```

The headings are flat, at `text-xs` and weight 600 in `text-muted`, as an application's are now; they are not the data table's raised sortable headers. Each field keeps its own accessible name, since a screen reader moving through a form hears the field, not the column. A full-width second line is a row marked `row-editor-more` whose one cell spans the columns. The remove button is a 28px danger glyph button in the last column, which is as wide as the button and no wider. Columns take the width of their content; a field's cell stretches, so the widths an application chose per list fall away.

Below 480px of the editor's own width, measured by a container query on `.row-editor-wrap`, each row becomes a card of its fields, each under its heading from `data-label`, with the remove button at the card's top end, as the data table stacks. The threshold is the editor's width and not the screen's, because the editor sits in windows of every width.

**Script (`pudl-rows.js`, new).** A press on `[data-row-remove]` fires `pudl:row-remove` on the row, cancelable; unless the page cancels it, the script removes the row, with a following `row-editor-more` row, and moves focus to the next row's first field, else the previous row's, else the Add button. A page that must update a model first listens, updates and lets the removal go on; one that redraws from its model cancels and calls `pudlRows.focusAfter(editor, index)` once it has redrawn. `pudlRows.add(editor, row)` appends a row the page built and focuses its first field, which is what Add does.

## 5. A command beside a field's label

**Decision: a label row with an end slot, holding small raised controls.** The field's label stays a `<label for>` and the field's name; the control beside it is its own, with its own name.

```html
<div class="form-group">
  <div class="form-label-row">
    <label class="form-label" for="step-text">Text</label>
    <div class="form-label-end">
      <div class="menu"><button type="button" class="btn btn-sm menu-btn" popovertarget="answers-1">Insert an Answer</button><div class="menu-panel" id="answers-1" popover>…rows…</div></div>
    </div>
  </div>
  <textarea class="form-textarea" id="step-text"></textarea>
</div>
```

The row is a flex line, the label at its start and the slot at its end, aligned on the label's baseline; the slot's controls are `btn-sm` or `icon-btn`, and a `menu-btn` there carries the `caret` as every menu button does. When the line is too narrow for both, the slot wraps under the label, start-aligned, rather than squeezing the label. `.form-group:has(:required) > .form-label::after` and the error message keep working, since the label element is unchanged. an application's `withLabelEnd` helper goes, and so does the select: the menu's rows are the answers, and choosing one inserts at the cursor, which stays the page's job.

## 6. A list whose rows open something

**Decision: the master-detail row stands on its own, and its rows are links.** `.md-row` and `.md-item` are already drawn without a master-detail layout around them (the menu panel's place rows use them), so what this needs is a name, a rule and the keys. The component is a `.row-list`: a `<ul>` of `.md-row`s, each holding an `a.md-item` to the row's address, with `aria-current="true"` on the row that is open. The script, in `pudl-md.js`, gives every list of `.md-row`s the keys a tree has: Up and Down move among the rows, Home and End to the first and last, and Enter follows the row; the rows are one tab stop, the current row or the first. This applies to the sidebar's list as well, which the specification has left to the browser's Tab key until now, and it is an improvement there too.

For an application's runs, each row links to the run's address, a window-scoped parameter such as `?run.flow=<id>`, which the page's script may take as it takes any link, showing the run in the window and writing the address; the row is then current. The run gains an address, which it needs under chapter 7 whether or not this component exists.

## 7. Window buttons sized to the title

**Decision: sizes in em of the title's text, with a larger box for the menu's caret.** `.win-head` takes the title's font size, `text-md`, and `text-sm` when docked; the buttons become 1.7em (24px at the default size, 22px docked) and their glyphs 0.85em (12px, 11px). Page text scaling then grows them with the title. `--win-button-size` and `--win-glyph-size` stay as overrides and keep working in px for a page that set them.

The caret is small by design, since it is drawn for a select's opener and a tree's toggle, and it would be wrong to enlarge it everywhere. The window menu's button alone draws it in a box of 1.2em (about 17px), so that its visible triangle is about 9.5 by 6 pixels beside 14px text, the height of the title's lowercase, with the other window glyphs unchanged at 0.85em, which they fill. The glyph-buttons section's table, which gives these sizes in pixels, is rewritten in em with the pixel values at the default size.

## What an application changes on adopting 0.60.0

- `.flow-step-twisty`, `.flow-step-head` and their rules give way to the disclosure card; so do `.tool-group-head` and `#pin-expand`.
- `flow-chart.js` keeps only the storing of the scale and the drawing of the SVG; the tools and the zoom logic go.
- `.flow-move-up`'s rotation goes; the two buttons use `arrow-up` and `arrow-down`.
- The four grids (`.flow-value-row`, `.flow-question`, `.flow-exit`, and the inputs variant) become row editors; `flow-values.js` builds rows, not grids.
- `withLabelEnd` and the "Insert an Answer…" select go; a menu button stands in the label row's end slot.
- `.run-item` goes; runs are rows of a `.row-list`, each a link to the run's address, which the Flow window gains.
- Nothing for section 7; the new defaults apply.

## Release contents

- Specification 0.21.0: the disclosure card in `cards.md`; the zoom group as a section of its own; `arrow-up`, `arrow-down`, `plus` and `minus` in chapter 5; the row editor as a section of its own; the label row in `fields.md`; the row list in `master-detail.md`, with the keys; the window button sizes in em in `glyph-buttons.md` and `windows.md`.
- PUDL 0.60.0: `pudl.css` for the card, the zoom group, the row editor, the label row and the row list; `pudl-windows.css` for the sizes; `pudl-disclose.js`, `pudl-zoom.js` and `pudl-rows.js`, new; `pudl-md.js` for the row keys; the component list; the reference page.
- Tests, in the three engines and both themes, as the proposal's verification section lists them, plus axe over the new components.
