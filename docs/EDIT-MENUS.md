# Shared editing menus

PUDL 0.109.0 adds generic Cut, Copy, Paste and Select All rows for text fields, ordinary contenteditable regions and selected document text.

## Host clipboard

A host configures both text operations after pudl-menu.js initializes:

```js
window.pudlClipboard.setTransport({
  readText: function () { return hostClipboard.readText(); },
  writeText: function (text) { return hostClipboard.writeText(text); }
});
```

The hostClipboard adapter above belongs to the application. PUDL does not discover native APIs. Each method may return directly or through a Promise. readText must produce a string; writeText resolves without a result. Denied operations must reject. The accessor carries text only. Configure the adapter in each document that loads the shared menu/accessor, including editor frames when applicable; setting a parent window's transport does not configure another window's accessor.

Editors call window.pudlClipboard.readText() and writeText(text), both of which return Promises. Without a configured transport, they use navigator.clipboard. setTransport(null) restores that default. Each operation retains its starting transport; a configured host failure rejects without retrying another transport. Configuring a transport retires pending generic edits. Editors retain ownership of any separate rich-format clipboard integration.

## Editor transactions and merging

An editor with its own state model supplies transaction-based rows and explicitly claims editing during the bubbling event:

```js
editor.addEventListener('pudl:contextmenu', function (event) {
  event.detail.handlesEdit();
  event.detail.add(editorEditRows());
});
```

The application supplies editorEditRows. Standard IDs are cut, copy, paste and select-all, with labels Cut, Copy, Paste and Select All and display-only shortcuts Mod+X, Mod+C, Mod+V and Mod+A. The editor supplies its own enabled state and transactions so Undo works. Context menus do not bind those displayed shortcuts.

PUDL appends generic editing after event dispatch finishes, allowing document-level application handlers to claim it regardless of registration order. Other application rows merge with generic rows through one separator. Existing command scopes remain intact. Stopping propagation alone does not replace the explicit handlesEdit claim. Canceling the custom event with preventDefault preserves the application's supplied rows and suppresses default generic contributions, consistent with the existing cancellation contract.

## Selection, mutation and events

The menu captures its opening selection. Cut waits for a successful clipboard write before deletion. Paste waits for a read. Another interaction, focus change, newer operation, clipboard transport change, changed value/range, type change, lost permission or disconnection retires pending mutation. Restoration rechecks the active editor so focus handlers cannot redirect an edit into another field.

Generic mutation uses document.execCommand insertText/delete editing actions to preserve native Undo history. A failed command reports an error without directly replacing a field value or editable DOM. This API is deprecated and implementations differ. The [API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) identifies its Undo-preserving use case and limitations; the [editing draft](https://w3c.github.io/editing/docs/execCommand/) qualifies browser consistency. Focused cross-engine results must establish the supported execution behavior.

PUDL sends a cancellable, untrusted beforeinput preflight before mutation. Canceling it prevents the edit. A browser may also emit native beforeinput, which application handlers continue receiving. After successful mutation PUDL preserves the native input notification or supplies one untrusted input notification if none was emitted. An event alone does not prove a history transaction or trusted user gesture. Commit-time change behavior remains subject to focused native evidence.

Cut and Copy require selected text. Read-only targets disable Cut and Paste. Password fields disable Cut and Copy. Text, search, URL, telephone and password inputs expose the supported selection APIs, and password Paste remains available.

Email and number inputs still show the Edit menu, but Cut, Copy and Paste are disabled with a reason explaining that their selection positions are unavailable. PUDL does not intercept their native Cut, Copy, Paste or Select All keyboard shortcuts. The HTML standard excludes selectionStart, selectionEnd and setSelectionRange for [email](https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)) and [number](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number)). It permits select() for both, so Select All stays available. The [selection algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-textarea/input-select) allows that call to do nothing when the control has no selectable text.

An application needing the full menu can use type="text" with inputmode="email" or inputmode="decimal" and its own validation. The [Text state](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search)) retains selection APIs. The [inputmode attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-inputmode) suggests an input mechanism and does not turn a text field into an email or number field. This alternative loses automatic email syntax checks, number parsing/range/step validation and any native number spinner. The application must supply the required validation and numeric controls. Other applicable text-field constraints, such as required and pattern, remain available.

Errors dispatch bubbling, cancellable pudl:edit-error with target, operation and error. A host can prevent its default and display its own error. Otherwise PUDL uses pudlToast when available or the console. Failed writes never authorize Cut deletion.

## Host menu suppression

Right-click, Shift+F10 and the Menu key use the same request path. Shift on a delivered contextmenu event no longer bypasses PUDL. [Mozilla documents](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) that physical Shift+right-click can bypass contextmenu dispatch in Firefox. A page cannot suppress an event it never receives; a host that prohibits browser controls must disable its default menu using the documented host option.

Dinah and GK Companion adopt the PUDL release and matching yavc.app editor integration together, configure their native clipboard adapter and then disable the host menu. Installed checks cover actual clipboard permissions, ordinary fields, editor transactions, Undo, keyboard invocation and physical context-menu suppression. Standalone browser evidence does not establish those installed properties.
