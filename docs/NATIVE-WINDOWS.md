# Native full-screen topbar

PUDL can supply application-window controls when a native desktop host removes its own frame in full screen. Load `pudl.css`, `pudl-menu.js` and `pudl-native.js`. Load `pudl-tooltip.js` for PUDL hover and keyboard-focus tips; native title text remains a fallback. No browser window is controlled by these files.

## Attach a host adapter

```js
const nativeChrome = pudlNative.attach(document.querySelector('.topbar'), {
  title: 'My application',
  state: { fullscreen: false, active: true },
  actions: {
    minimize: () => nativeHost.minimize(),
    restore: () => nativeHost.leaveFullscreen(),
    close: () => nativeHost.requestClose()
  }
});

// Call this from authoritative native-host state notifications.
nativeChrome.update({ fullscreen: true });
```

`nativeHost` is a placeholder for the application's documented native API. PUDL provides no framework binding. The native host must make minimize, leaving full screen and close requests available to its frontend. It owns unsaved-work confirmation, native placement restoration and OS-specific error handling. Restore means leaving full screen for the normal or maximized placement that the host remembers.

Only one controller can attach to a topbar. Attach before or after the menubar initializes. Existing site menus, applet menus, content windows and Show as ribbon keep their behavior. The native application menu is separate from PUDL's Window menu, which operates on content windows.

## State and capabilities

`update(snapshot)` merges a partial snapshot. Supported fields are `title`, `fullscreen`, `active`, `canMinimize`, `canRestore` and `canClose`. All state fields except title must be booleans. Title must be a nonempty string. Invalid state throws before changing the UI. Full screen defaults to false; active and capability flags default to true.

The host reports native full-screen state. Browser `document.fullscreenElement`, viewport size and maximized state are not substitutes. No browser full-screen listener or viewport heuristic is installed. The controls remain hidden outside native full screen, including an ordinary maximized window. Applications that want other presentation policies need a separate contract.

A missing callback disables its action even if its capability flag is true. Disabled buttons remain in their fixed slots so the other buttons do not move. A capability or state change closes an open native menu; an identical repeated snapshot leaves it open. PUDL does not infer new window state from callback completion; the host sends the resulting state separately.

## Actions and errors

Each callback receives a copy of the state snapshot at the time of the request. It may return a promise. While a callback is pending, all native controls are disabled to prevent duplicate or contradictory requests. A request not yet started is discarded if its action becomes unavailable or the controller is destroyed. Already-started native work cannot be canceled by PUDL.

`chrome.run('minimize' | 'restore' | 'close')` returns a promise. It resolves true when an available callback completes, or false for unavailable, busy, discarded or rejected requests. True does not assert that an OS state transition occurred or that a close confirmation was accepted. A rejected callback emits bubbling `pudl:native-error` from the topbar, with `detail.action` and `detail.error`, then releases the pending state. The application should show an appropriate error; PUDL does not insert native exception text into the product UI.

Destroy suppresses subsequent UI updates and error events from an already-started callback. It does not roll back native work. State updates and destruction restore remembered content focus only when focus is still within the native controls; they do not steal focus from other application content.

## Placement and keyboard behavior

The app menu occupies the physical top-left corner. Minimize, Restore and Close occupy the physical top-right corner, in that order, after the ribbon toggle. RTL changes the reading direction of application content and menus but keeps these physical corners. The topbar reserves space before fitting its flow children, so native buttons never fold into the site menu. A host with additional nonfolding topbar content must still ensure that content fits the remaining space.

Controls span the topbar's height and meet its physical edges. The default target width is 40px, or 48px for a coarse pointer. The topbar must itself reach the native client area's edges. The fullscreen topbar owns its horizontal padding; application content belongs within its flow children. No body drag region or OS hit testing is installed. If the host makes the topbar draggable, it must exclude `[data-native-chrome-slot]` and other interactive controls using its framework's documented mechanism.

`chrome.focusMenu()` focuses the app menu button and returns whether focus reached it. The host may use it for its own allowed accelerator. PUDL does not intercept Alt+Space, invoke an OS system menu, or synthesize key events. The standard PUDL menu keys open and navigate the menu; Escape closes its panel back to the button, then Escape from the button restores the remembered content target. Pointer actions restore remembered focus before calling the host. Successful restoration emits bubbling `pudl:native-return-focus` on the topbar with `detail.target` and `detail.reason` (`action`, `escape`, `state` or `destroy`). It runs before the native action callback. Restoration is best effort and does not access child-frame DOM; hosts can use the event for their tokenized child-focus protocol.

`chrome.destroy()` closes the native menu, removes generated controls and releases the controller. It leaves the topbar's application content mounted. Calls to update after destroy return false, and calls to run resolve false.

## Localization and demonstration

`options.words` can replace `menu`, `minimize`, `restore` and `close`. The same words label menu items, accessible names and tips. The app menu name includes the application title. Text is inserted as text, not HTML.

The [native-window sample](../samples/native-window.html) uses a simulated adapter and an action log. Its controls deliberately do not affect the browser window. Automated browser tests verify UI behavior; native host integration must also be tested in the consuming application.
