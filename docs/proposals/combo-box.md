# Proposal: a combo box

Status: decided 2026-10-21, built in 0.72.0. For an application, which needs a field where the reader may either type a value or choose one from a list, as a Windows combo box allows.

## What it is

A combo box is a text field with a list of suggestions. The reader may type anything, or open the list and choose from it, and the value is whatever the field holds when the form is sent. That freedom is what sets it apart from a select, whose value must be one of its options. Typical uses are a currency, where the common ones are listed and any ISO code is accepted; a client or a configuration chosen from those known, where a new one may be typed; and a value with a history, such as the last few search terms.

A field whose value must be one of a long list, where typing only helps the reader find the option, is a searchable select, described below. A plain select stays the right control for a short closed list.

## The markup

The combo box is a native text input with a native `datalist`, wrapped so that PUDL can draw it:

```html
<label class="form-label" for="currency">Currency</label>
<span class="combo">
  <input class="form-input" id="currency" name="currency" list="currencies" autocomplete="off">
  <datalist id="currencies">
    <option value="PHP">Philippine peso</option>
    <option value="SGD">Singapore dollar</option>
    <option value="EUR">Euro</option>
  </datalist>
</span>
```

Without the script this is already a working combo box, because the browser draws its own suggestion list for an input with a `list`. The form sends whatever the field holds, and the server needs no special handling. an application's currency field in the tableau applet is this markup already, less the wrapper. With `pudl-combo.js` the browser's list, which no stylesheet can reach and which each browser draws differently, gives way to PUDL's own.

An option's `value` is what goes into the field, and its text, where it has any, is a second line of description, as "Philippine peso" under "PHP". An option with no text shows its value alone.

## How it looks

The field is the sunken input every PUDL field is, at the same height, with its border, focus ring, invalid and disabled states unchanged. At its end edge sits the opener, a raised button that shows the `caret` glyph, joined to the field the way the master-detail filter's search button is joined to its field: the sunken field meets the raised button, and they share a border.

The opener is raised because it is pressed, and the field is sunken because it is typed in, so the combo box says what it is by the grammar alone. A select is drawn differently on purpose. Its whole surface opens it, so it shows its caret inside the field. A reader who sees the joined button knows the field takes typing as well.

The list opens below the field, or above it when there is no room below, as a menu panel does, with the same raised panel, shadow and radius. It is at least as wide as the field, so a field and its list line up, and wider when an option's text needs it, up to the panel's usual limit. It shows at most eight rows and scrolls past them. Each row is set like a menu row: the value in `text`, its description below it in `text-muted` at `text-xs`, and the `tick` glyph in the leading space beside the option the field's value matches exactly. The row the keyboard is on carries the same highlight a menu's focused row does.

| Part | State | Appearance |
|---|---|---|
| Field | Every state | As every text field |
| Opener | At rest, under the pointer, pressed, focused | As a raised button |
| Opener | The field disabled | Disabled with the field |
| List row | The keyboard on it, or the pointer over it | A menu row's focus highlight |
| List row | Its value equals the field's | The `tick` glyph |
| List | No option matches what is typed | Closed, rather than open and empty |

## How it behaves

The keyboard follows the ARIA Authoring Practices' editable combobox with list autocomplete, with these choices.

- Typing filters the list to the options whose value or text contains what is typed, ignoring case, and opens the list if there is any match. It never completes the field by itself, so a reader typing a new value is never handed a different one by surprise.
- Down opens the list and moves to the next row, and Up to the previous, wrapping from the last to the first. Alt+Down opens the list without moving, and Alt+Up closes it.
- Enter on a row puts its value in the field and closes the list. Enter with no row highlighted leaves the field as typed and does what Enter does in that form.
- Escape closes the list. Escape again, with the list closed, clears the field, as the pattern says, unless the field is required to keep a value.
- Tab leaves the field with its value as typed, and closes the list. A highlighted row is not chosen by leaving, so a reader never gets a value they did not ask for.
- Pressing the opener opens the whole list, unfiltered, with the field's own value ticked, and keeps focus in the field. Pressing it again closes it.
- Pressing a row chooses it.
- Home and End stay with the field's caret, since the field is a text field.

Focus never leaves the field while the list is open. The row the keyboard is on is announced through `aria-activedescendant`. Choosing a row fires an `input` and a `change` event on the field, as typing does, so the application listens to the field as it would to any input.

## Keys that are not the value

the maintainer asked for a list of currency signs, where the field holds the sign but the reader may only be able to type the code. An option's `data-combo-keys`, separated by commas, are words it is found by that are not shown:

```html
<option value="₱" data-combo-keys="PHP, Philippines">PHP · Philippine peso</option>
```

Typing PHP, peso or Philippines finds the row, and choosing it puts ₱ in the field. Text left in the field, by Tab, by Enter with no row lit or by moving away, that is exactly a key or a value that only one option has looks that option up and puts its value in, so PHP typed becomes ₱. Text several options share, such as kr, stays as typed and only filters. The code belongs in the visible text as well as in the keys: the text shows why a row was found and tells apart rows with the same sign, and only a key is looked up exactly.

## Options from the server

An application whose options depend on what is typed, such as a search over thousands of clients, gives the wrapper `data-combo-src`, an address on its own origin with `{q}` standing for what is typed:

```html
<span class="combo" data-combo-src="/clients/suggest?q={q}">
  <input class="form-input" name="client" list="client-options" autocomplete="off">
  <datalist id="client-options"></datalist>
</span>
```

The address returns `option` elements as HTML, as a window's address returns its markup, and the script puts them in the `datalist`, so the options stay in the page where anything can read them. It asks after the reader stops typing for a moment, cancels a question that is overtaken by the next, and refuses anything not served as `text/html` from the page's own origin, as the window layer does. Without the script the field is a plain text field, which still works.

## For agents

The combo box needs nothing new for an agent. Its value is the field's value, which an agent sets as it sets any field, and its options are `option` elements in the page, which an agent reads without opening anything. The popup the script draws is only for the eye and the keyboard.

## Where else it fits

In a toolbar, a combo box is a field, so it keeps its own keys and is a Tab stop of its own (0.70.1). In a dialog, its list opens above the dialog's backdrop and is not clipped by the dialog's scrolling, since it is a popover. In a row editor it fills its cell as other fields do.

## The specification

The fields section gains the combo box: its anatomy, its states, its keys and its accessibility, with conformance items. The section on selects says when to choose which.

## A searchable select

A select whose list is long, such as every currency in the world, is the same control with its value restricted to the options. Its markup is a plain select marked `data-combo`:

```html
<span class="form-select-wrap">
  <select class="form-select" name="currency" data-combo>
    <option value="PHP">PHP · Philippine peso</option>
    …
  </select>
</span>
```

Without the script it is an ordinary select, which works. With it, the select is hidden and a combo box stands in its place, filtering the options as the reader types. The select keeps the value and is what the form sends, so the server sees a select's value as it always has. Leaving the field with text that matches no option puts back the option chosen before, so the value is always one of the options. Choosing an option fires `input` and `change` on the select, as choosing in the select itself does.

## Decisions

the maintainer decided on 2026-10-21:

1. **Typing filters the list.**
2. **Inline completion is off by default**, and a field may ask for it with `data-combo-complete`, for a list where completing a match is what the reader wants.
3. **Options from the server are in the first release.** an application's first use is a list of every currency in the world from a local file, and remote lists will follow.
4. **The searchable select is in the first release too**, as above, rather than left for later.
