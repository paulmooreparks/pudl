# The settled signal

PUDL queues some of its work. A window layer refits after a resize, a toolbar folds on the next frame, and a dock strip measures itself when its size changes. A host or a test that reads the page before that work has run sees a half-finished layout. `pudl-settle.js` says when the work is done, so nothing has to wait for a guessed time.

## Loading

`pudl-settle.js` is optional. Load it before every other PUDL script:

```html
<script src="dist/pudl-settle.js"></script>
```

Each PUDL script looks for it once, when the script starts. A script that started earlier does not report to it, and its work is then not counted. A page that does not load `pudl-settle.js` behaves exactly as before.

## Contract

`pudlSettled()` returns a promise. The promise resolves when all of these hold:

1. The document has loaded.
2. The document's fonts have loaded (`document.fonts.ready`).
3. No reported work is outstanding.
4. One whole animation frame has then passed in which no work was reported and no observed element changed size.

The promise never rejects. It stays pending for as long as work is outstanding, which includes a page in a hidden tab, where the browser runs no animation frames.

`pudl:settled` fires on `document` each time PUDL goes from having work to being settled. It does not bubble and has no detail.

`pudlBusy()` reports work of the host's own. It returns a function, and the work counts as outstanding until that function is called. `pudlBusy.frame(fn)`, `pudlBusy.cancelFrame(id)`, `pudlBusy.timeout(fn, ms)` and `pudlBusy.cancelTimeout(id)` queue and cancel a frame or a timer that is counted until it has run or been cancelled.

```js
var done = pudlBusy();
loadRows().then(render).finally(done);
await pudlSettled();
```

## What is counted

Table 1 lists the work each script reports as of this release. The list grows as scripts are moved over.

**Table 1** *Work Reported by Each Script*

| Script | Frames | Resize observations | Timers |
|---|---|---|---|
| `pudl-windows.js` | All | All | Zero-delay deferrals, the dock menu placement fallback, the delayed address write after keyboard moves, the live-region announcement |
| `pudl-split.js`, `pudl-md.js` | All | All | The announcement after a handle's keys go quiet, the fallback and zero-delay deferrals |
| `pudl-toolbar.js`, `pudl-menubar.js` | All | All | The placement fallback and the ribbon's zero-delay deferral |
| `pudl-launcher.js`, `pudl-annotations.js` | All | All | None yet |
| `pudl-menu.js` | All | None used | None yet |
| `pudl-dialog.js`, `pudl-zoom.js` | None used | All | None used |
| `pudl-reorder.js`, `pudl-code.js` | None used | None used | The live-region announcement |
| `pudl-combo.js`, `pudl-fields.js`, `pudl-listbox.js` | None used | None used | The deferral after a form reset |
| `pudl-toast.js` | None used | None used | The deferrals that place toasts found in the page |
| Every other script | None used | None used | None yet |

*Note.* Delays that wait for a person are never counted: hover intent, tooltip delays, toast dismissal and the pause before a window switcher shows.

The signal does not cover work the browser does on its own account, such as scrolling after a wheel turn, a CSS transition, or a network request. Wait for those by their own events or by the state they produce.

## Why the fourth condition is sound

Within one frame a browser runs animation frame callbacks, recalculates layout and then delivers resize observations, and a timer task cannot run in the middle of that. The HTML event loop and the Resize Observer specification define this order. `pudl-settle.js` asks for a frame and, from inside it, a zero-delay timer. When that timer runs, every resize observation for the frame has been delivered. If any of them reported work, the wait starts again.

## In PUDL's tests

`tests/lib.js` loads `pudl-settle.js` into every page and exports `settled(page)` and `resize(page, size)`. New and changed suites use these in place of `waitForTimeout` and counted frames.
