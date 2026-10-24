# Selection actions and margin notes

Load `pudl.css` and optional `pudl-annotations.js`. These controls handle presentation and focus. The application supplies content, validates permissions and stores annotations. They introduce no address parameters or persistence.

## Selection actions

The content names an action bar by ID, with or without a leading hash. Keep the bar outside the selected content and in a predictable place after it in document order.

```html
<article data-selection-actions="passage-actions">Selectable content</article>
<div class="selection-actions" id="passage-actions" hidden>
  <button type="button" class="btn btn-sm" data-selection-action="quote">Quote selection</button>
</div>
```

PUDL offers the buttons only for a nonempty selection whose two endpoints belong to that content. It places them near the selection's final line, clamped horizontally to the content and viewport. The action bar must not be inside a transformed or clipping ancestor that changes fixed positioning. It wraps where necessary. Pointer activation preserves the selection; keyboard focus on the bar retains its cloned Range even if the browser collapses the live selection. Escape hides the offer without consuming the key. A new selection makes an offer again.

`pudl:selection-action` bubbles from the content with `detail.action`, `detail.range`, `detail.text` and `detail.button`. The Range is a clone in the current document, not a persistent passage identifier. The event is cancelable and has no built-in application action. The application must reject stale or unauthorized requests. Replaced content invalidates the selection.

## Margin notes

```html
<div class="noted" id="article">
  <article class="noted-body"><p id="passage">A passage</p></article>
  <aside class="margin-note" data-note-for="passage">
    <p>The note</p><a href="#passage">Passage</a>
  </aside>
</div>
```

The body has a centered maximum width of 42rem. An application may choose its reading width in its own stylesheet. PUDL never changes that width to make room for notes. A 14rem margin is used only when that width plus a 1rem gap fits between the body's logical end and its container. The decision uses container geometry, including RTL direction, rather than viewport width.

Notes align to their anchors in vertical order and move downward to avoid overlap. On narrow containers they remain after the body in normal flow, with numbered raised markers beside their anchor blocks. Markers focus the mounted note; a generated Show passage button focuses its anchor without changing the URL. Provide ordinary links both ways for operation without JavaScript. Missing anchors leave notes in normal flow without a marker or generated return action.

Use `data-note-label` on a note to name its marker. Use `data-notes-back-text` on the container to localize Show passage. `.note-anchor` supplies a tint and dotted underline for application-rendered passage elements. PUDL does not insert text wrappers or serialize ranges.

`pudlAnnotations.setRange(container, note, range)` replaces that note's element anchor with a cloned nonempty Range within its body. It returns false for invalid inputs. Passing null restores the `data-note-for` anchor. Ranges must be replaced after application content reconstruction.

## Lifecycle

`pudlAnnotations.enhance(root)` takes in new containers and action bars, idempotently. Initialization enhances the document. `refresh()` schedules one layout pass after application-driven changes that observers cannot see, such as a sibling moving the container. Resize, text/child mutations and completed font loads also schedule layout. `destroy(root)` disconnects observers, removes generated controls and restores note inline styles. Call it before removing or replacing enhanced content. Destroy and enhance a note container when adding or removing notes.

The script preserves mounted content. Print shows notes after the article and hides generated controls. Container height may grow to accommodate margin notes, but the reading column stays in place.

The example at `samples/annotations.html` demonstrates both themes, pointer selection and narrow note markers.

The implementation uses documented [Range geometry](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects), [selection ranges](https://developer.mozilla.org/en-US/docs/Web/API/Selection/getRangeAt) and [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver). It does not resolve selections across shadow roots or documents.
