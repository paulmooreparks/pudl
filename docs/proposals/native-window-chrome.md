# Native full-screen window controls

Paul requested native application controls at the physical corners of a full-screen topbar for the release following 0.85.0. The application window menu stands at the top left, before the site menu. Minimize, Restore and Close stand at the top right, after Show as ribbon. These controls act on the native application window, separately from PUDL content windows.

## Host boundary

Optional `pudl-native.js` exposes `pudlNative.attach(topbar, options)`. The host supplies an application title, a full-screen state snapshot and callbacks for native minimize, restore and close. The returned controller provides `update(snapshot)`, `run(action)`, `focusMenu()` and `destroy()`. No adapter for Wails, WebView2, Electron or any other framework is built into the library. Browser Fullscreen API state does not imply native full-screen state.

Restore means leaving full screen for the host's previous normal or maximized placement. The host owns that placement, close confirmation, native errors and notifications. PUDL does not close a web page or optimistically infer a state transition after a callback returns. Missing callbacks or explicitly unavailable capabilities disable their controls. Only one action runs at a time; rejection reports an error event and restores interactivity.

## Layout and interaction

The menu and control group occupy reserved physical corner slots. They do not fold into application menus. The existing topbar fitter measures only flow children and shares the remaining content space. Both slots reach the topbar edges for pointer acquisition. Native host dragging remains host-owned; the generated interactive regions must be excluded from the native drag region using the framework's documented mechanism.

The app menu uses the existing menu component and contains Restore, Minimize and Close. Its accessible name includes the application title. The right buttons use the existing minimize, restore and close glyphs with full text tips. Native controls retain physical corner order in RTL while the site menu and menu content retain their reading direction. Full-screen controls are hidden outside full screen and in print. The host may report inactive state without changing its application's palette.

The standard menu keyboard pattern applies. A controller method exposes menu focus for a host-managed accelerator; PUDL does not claim Alt+Space or intercept native keyboard events. State changes, leaving full screen, and destroy close the app menu. Repeated attach on one topbar is refused. Destroy removes generated nodes and restores existing topbar state without removing application content.

## Verification

Tests must exercise menu and ribbon mode, narrow fitting, both themes, RTL corner order, disabled capabilities, asynchronous duplicate suppression, callback rejection, full-screen exit while a menu is open, destroy and attach ordering relative to menu initialization. A sample adapter will simulate native state and plainly identify that it does not control an operating-system window. Real native integration remains the consuming application's responsibility.

Pointer command restoration does not depend on a clicked button receiving DOM focus. That behavior varies by browser and OS, as the [button documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#clicking_and_focus) explains. Explicit control activation restores the saved content target; background state changes restore only while the chrome still owns focus.
