# Migrating menu bars to PUDL 0.40.0

PUDL 0.40.0 implements the [menu-bar conventions](MENU-BARS.md). Update the distribution files together, particularly `pudl-applets.js`, `pudl-menubar.js`, and `pudl-windows.js`. Existing explicit applet menus retain their commands, subject to the stricter contribution destinations below. Generated fallback menus change their organization.

## Declare the site's menu identities

Each host title can declare `data-menubar-id`. Standard IDs are `site`, `go`, `applets`, `view`, `window`, and `help`. The first title is always the site identity. Custom titles can declare distinct custom IDs. IDs are case-sensitive and independent of translated labels. Duplicate IDs are diagnosed and later duplicates are omitted.

```html
<nav class="menubar" data-menubar aria-label="Example">
  <ul data-menubar-source hidden>
    <li data-menubar-id="site">Example
      <ul><li><a href="/">Home</a></li></ul>
    </li>
    <li data-menubar-id="go">Go<ul></ul></li>
    <li data-menubar-id="applets">Applets
      <ul><li><a href="/editor">Editor</a></li></ul>
    </li>
    <li data-menubar-id="view">View<ul></ul></li>
    <li data-menubar-id="window" data-menubar-windows>Window<ul></ul></li>
    <li data-menubar-id="help">Help
      <ul><li><a href="/help">Site help</a></li></ul>
    </li>
  </ul>
  <a href="/">Home</a>
  <a href="/editor">Editor</a>
  <a href="/help">Help</a>
</nav>
```

The fallback links remain available without script. Empty shared `ul` elements declare contribution slots; their menus appear only when they contain commands. Hosts must declare the shared slots required by their applets. PUDL diagnoses missing slots and omits contributions to them rather than guessing a translated title.

PUDL orders standard site menus as Site, Go, Applets, View, Window, Help. Custom site menus appear between Applets and View in their original relative order. Without explicit IDs, English standard labels are recognized case-insensitively for compatibility. A translated host must declare IDs to receive contributions reliably.

## Route applet contributions by ID

Applet title descriptors accept an optional `id`. Use `file` and `edit` for translated working menus; PUDL orders them before other working menus while preserving the first title as the applet identity. Duplicate working-menu IDs are diagnosed and omitted.

```js
menus() {
  return {
    titles: [
      { label: 'Editor', items: [{ label: 'About Editor', run: showAbout }] },
      { id: 'file', label: 'File', items: [{ label: 'Save', run: save }] },
      { id: 'edit', label: 'Edit', items: [{ label: 'Undo', run: undo }] }
    ],
    into: {
      go: [{ label: 'Go to line…', run: goToLine }],
      view: [{ label: 'Wrap lines', checked: wrap, run: toggleWrap }],
      help: [{ label: 'Editor help', run: showHelp }]
    }
  };
}
```

An `into` key first resolves as an ID, then as an exact displayed host label for compatibility. Only Go, View, and Help accept contributions. Contributions to the site identity, Applets, Window, or custom menus are now diagnosed and omitted. Move those commands to an appropriate applet menu or permitted contribution. Applets may not create working menus with reserved site IDs. Existing conflicts with displayed host titles also remain prohibited.

Contribution commands retain their applet ownership, including commands nested in submenus. Their shortcuts work only while focus is in that applet's content. Site shortcuts retain site scope. Removing the active source, replacing its instance, or changing the active window closes its open menu. Command invocation also checks validity before acting.

## Adopt generated Window commands

A Window title with `data-menubar-windows` appends standard active-window layout controls, Minimize all, Restore all, Close all windows, and a numbered open-window list after any host-authored entries. Omit handwritten duplicates. Window selection restores minimized windows and raises the selected instance. Bulk close uses the existing cancellable window-close behavior. No commands are generated when there are no windows.

The shared source is `pudlWindows.menuCommands(key)`. An omitted key selects the visible front window. Missing windows return `[]`. Each descriptor has `id`, `label`, and either `run()` or nested `items`; it can also carry `checked` or `danger`. Standard leaf IDs are `page`, `copy-link`, `minimize`, `unminimize`, `collapse`, `expand`, `maximize`, `restore`, `dock`, `undock`, `reset`, and `close`. The `snap` submenu has `snap:<zone>` children for the existing named snap zones other than maximized, which has its own command.

Descriptors are fresh snapshots. Fetch them when presenting commands. Their callbacks bind to the original window element and recheck availability before acting; an old Maximize callback cannot maximize a window that has since become docked. Mutating a returned descriptor does not change the window's capabilities. This API does not expose applet commands or invoke the `pudl:window-menu` extension hook.

The generated site menu omits page, sharing, and individual close commands, which belong in the content identity menu or window chrome. Content-sized windows omit maximize, snap, and dock capabilities. Labels for individual window commands use the existing `data-win-text-*` overrides; site-menu headings and bulk labels use the menu-bar overrides below.

## Migrate generated identity menus

An applet exposing only `commands()` now receives an identity menu and an Actions menu containing its existing commands. No working commands are discarded. Migrate to `menus()` to replace Actions with a domain-specific title. Supported page, sharing, and window-close commands populate the generated identity menu.

Generated article menus put Print under File. Their identity commands use Open as a page, Copy link to this content, and Close window where applicable. Existing `data-menubar-text-copy-link` and `data-menubar-text-close` overrides still apply; update translations that currently obscure the scope. Explicit applet `menus()` definitions are not automatically supplied with identity commands or semantically rewritten.

Additional `data-menubar-text-*` suffixes are `actions`, `file`, `active-window`, `minimize-all`, `restore-all`, `close-all`, and `open-windows`. They change displayed labels only. Standard IDs and routing remain unchanged.

## Verify the migration

- Check every applet's identity and working menus, including legacy applets and articles.
- Check translated labels, empty slots, and console diagnostics for invalid or missing destinations.
- Check contributed shortcuts with focus inside and outside their applet.
- Check two instances of the same applet, active-window changes, and removal while a menu is open.
- Check generated Window commands for floating, minimized, docked, and content-sized windows, including cancellation of bulk close.
- Check title and glyph toggling, hover switching, keyboard navigation, and mobile taps.

The [shared adoption guide](MENU-BAR-ADOPTION.md) supplies site-specific changes for Parks Computing and YAVCHN.
