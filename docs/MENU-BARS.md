# PUDL menu-bar conventions

These conventions define where users find commands across PUDL sites. They were agreed on 2 October 2026. They complement the [web contract](CONTRACT.md) and [integration guide](../README.md#the-menu-bar). The implementation notes below describe support in PUDL 0.40.0. The API is documented in the web contract; the vendored PUDL specification is unchanged.

## Ownership and names

The **site bar** belongs to the site or application shell. Its commands and order remain stable as the active applet changes. The **applet bar** belongs to the active applet, article, or other content and appears to the site's right. An article can use its title as the identity of that group. Existing implementation terms `host` and `front` refer to these respective groups; their API names remain unchanged.

Each group begins with an identity menu bearing its owner's visible name, optionally with a logo. The hamburger glyph toggles that group's first menu. The name and glyph must not navigate to different destinations or expose different commands.

Each group forms one slightly raised surface around its glyph, identity, and menu titles. Its shared border and shadow establish that elevation in both themes. Individual titles gain hover, open, and focus treatments within that surface.

Menus describe the scope of their commands. Opening a menu does not change the active content or selection on which those commands operate. Settings labels distinguish this instance's settings from defaults for future instances where both exist.

## Single-application bar

Since 0.107.0, a host can set `data-menubar-composition="application"` on its `data-menubar` element when its active content is the application itself. PUDL draws the host and active content as one raised group with the host's identity and one hamburger. The default workspace presentation keeps separate site and applet groups.

The first title returned by the applet remains its identity. Its commands appear before the host identity's commands, with a separator when both contain entries. The host should put Close Window last in its own identity list. PUDL does not infer command roles from translated labels.

The combined title order is Application, File, Edit, View, domain titles, Window and Help. Other host titles retain their relative order among domain titles. Shared contributions still follow the host's entries, but their applet-name heading is omitted. Resident and Pins groups remain separate.

The collapsed menu and ribbon use the same composition. Applet commands retain their source, current enabled state and content shortcut scope; composition does not turn them into host commands. The site-menu pin APIs still describe the semantic host titles and do not expose the applet's File or Edit menus as site destinations. A host launcher, when configured, continues to own its identity control, so a document application that needs the merged identity commands must leave `data-menubar-launcher` unset.

## Site bar

The standard order is **Site name, Go, Applets, View, Window, Help**. A site omits menus for which it has no meaningful commands. The remaining menus retain their relative order. Site-specific menus may appear after Applets and before View when their purpose cannot fit a standard menu. They must not become destinations for applet command contributions.

When the site identity retains an ordinary menu, Applets is a top-level launcher immediately after Go. Do not bury the primary launcher under Go. A host may instead opt into the shared host launcher through `data-menubar-launcher` on the site menu bar. In that presentation, the site identity and hamburger open the same catalog, and a duplicate Applets menu may be omitted. The [launcher contract](LAUNCHER.md) defines invocation, focus and popup/sidebar behavior.

| Menu | Contents |
|---|---|
| Site identity | The host launcher when opted in; otherwise Home, About, site settings, account commands and workspace sharing when supported. |
| Go | Site destinations, site search, and navigation commands. |
| Applets | Available tools that users can launch. The list describes available tools, regardless of which instances are already open. |
| View | Site presentation, including theme, sidebar visibility, and window/classic layout. |
| Window | Active-window controls, arrangements, bulk window commands, and the open-window list. |
| Help | Site help, keyboard guidance, support, and the active applet's help contribution. |

An ordinary identity menu groups related entries with separators. Theme choices belong under View; the settings page can expose the same preference. Applet launching belongs under Applets or the opted-in host launcher. Account actions remain clearly separated from navigation and workspace sharing. A browser site must not offer Quit unless its environment actually supports quitting the application.

Applets launches tools; Window selects and manages existing windows. Sites with multiple instances must make launch behavior clear, using labels such as New editor window when a command always creates another instance. Reusing an existing instance must not discard its work.

## Pins group

A site may add a pins group between the site bar and the applet bar, for the applets and articles its readers go to most, one press away in both the window and classic views. The group stands after the site bar so that it stays put as the active applet changes.

Its first control is the Pins menu, marked by the pin glyph as an identity is marked by the menu glyph. The menu holds the site's pinning commands, such as Pin "About" and Unpin "About" for whatever is in front, disabled when nothing pinnable is. After it come buttons, not menus, one for each pinned item, showing the icon and title the item shows elsewhere, such as in the taskbar. Each is a link to the item's page, so a modified click opens a new tab, and the site may handle a plain press itself, as a window view does by opening or raising the item's window.

When the buttons do not fit, they all give way together to one menu, Items, which lists them, so the bar never shows an arbitrary subset. That happens before the bar itself collapses. In the collapsed bar, the Pins section lists the pinning commands and then the pins. A group with nothing pinned keeps its Pins menu, so the reader can see where pins go.

Storing pins and deciding what can be pinned are the site's. Pinning a particular item is an operation on that item, so a Pin command also belongs in the item's own domain menu or window menu, where the reader works with it; the Pins menu offers the same command for whatever is in front.

## Applet bar

The standard order is **Applet name, File, Edit, domain menus**. File and Edit appear only when the applet supports their functions. Domain menus use familiar nouns or verbs from the applet's work, such as Palette, Game, Story, Discussion, Query, or Run. An applet must not create its own Go, Applets, View, Window, or Help menu; the contribution rules below provide shared destinations where appropriate.

| Menu | Contents |
|---|---|
| Applet identity | About the applet; Applet settings when available; Open as a page when supported; Copy link to this applet or content; Close window when windowed. |
| File | Creation, opening, saving, import, export, printing, and document lifecycle commands. |
| Edit | Undo/redo, supported selection and clipboard operations, and find/replace. |
| Domain menus | Commands specific to the applet's subject or workflow. |

Close window is the final identity-menu command, separated from sharing commands. Close document belongs under File. Labels must distinguish these actions where both exist. A standalone page must not imply it can close the browser tab.

Save, Run, Pin, sorting, and similar working commands do not belong in the identity menu. A small applet still gives working commands a named domain menu; it does not use its identity menu as an exception. A content reader can use Reader as its identity, with Story and Discussion as its working menus. Long article titles may be visually truncated while retaining their complete accessible names.

## Contributions to the site bar

Only the active applet contributes commands. Its contribution follows the site's entries, separated and headed by the applet's name. It cannot replace, reorder, or relabel site commands, add commands to the site identity menu or Applets launcher, or create site-bar titles. Launch registration belongs to the host's applet catalog and is independent of the active applet's menu contributions.

| Site menu | Permitted contribution |
|---|---|
| Go | Navigation within the active applet, such as previous/next item or go to line. |
| View | Presentation of the active applet, such as word wrap, line numbers, or preview visibility. |
| Help | Applet help, applet keyboard guidance, and applet-specific support. |
| Window | No arbitrary injected commands. The host supplies standard window actions from supported window capabilities. |

A command has one canonical menu location. Toolbar buttons and contextual menus may provide additional access. Applet-local navigation goes under Go, while operations on content stay in its domain menu. For example, Next story belongs in the reader's Go contribution; Pin this story belongs under Story. Discussion-specific sorting can remain under Discussion because it is an operation on that content collection. View governs presentation such as showing a preview or wrapping text.

Shared slots have a consistent meaning even when their contents are contextual. An applet's View command still targets that applet. Moving it into the site bar must not make its keyboard shortcut global.

Hosts must provide each shared menu required by their installed applets, even if the host itself has no commands for it. The menu appears when it has commands and disappears when empty. Commands must not silently vanish because a host omitted a required destination. Hosts use `data-menubar-id` for these destinations. Applets use those IDs as `into` keys. Exact displayed labels remain a compatibility fallback; IDs are preferred for translated sites.

## Interaction and accessibility

- A pointer click or touch tap on an open menu's title or glyph closes it. This remains true after hover switches the open menu to another title.
- Hover switches menus only while a menu is already open. Hover never executes commands. Every operation is reachable without hover.
- The collapsed layout preserves the site and applet groups, their owner names, menu order, and commands. Submenus open one level at a time with an explicit Back command.
- Keyboard navigation follows the [WAI-ARIA menu and menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). Arrow keys navigate, Enter activates or opens, Escape dismisses and restores focus, and Tab leaves. Native browser and text-editing shortcuts remain available.
- An open menu retains its command target. If the target closes or becomes unavailable, its menu closes. A change of active applet must not silently retarget a displayed command.
- Temporarily unavailable supported commands remain visible and disabled, with an explanation where necessary. Unsupported capabilities and unauthorized or illegal operations are absent. Disabled menu entries do not override the backend's available actions.
- Independent options use checkmarks; mutually exclusive choices use radio groups. Their accessible state matches their visible state.
- Labels state the action and scope, such as Copy workspace link, Copy story link, Close document, and Close window. An ellipsis indicates that further input is required before an operation proceeds.
- Destructive actions are separated from routine actions and follow the host's undo or confirmation policy. Menu discovery must not itself execute an action.
- Navigation and sharing use real URLs. A crafted applet link and a workspace link can represent different states, and their labels distinguish them. Opening or closing a menu is transient interaction and need not create a history entry.

## Implementation status

PUDL 0.40.0 implements standard menu IDs and ordering, validates contribution destinations, preserves command ownership across contributions, and closes menus when their source is removed or replaced. Existing label-based contributions still resolve where their destination has a permitted standard identity. Empty declared slots appear when populated and are omitted otherwise. Missing or disallowed destinations produce console diagnostics.

Hosts opt into generated window management by adding `data-menubar-windows` to a title with `data-menubar-id="window"`. PUDL obtains capabilities from `pudlWindows.menuCommands()`, the same source used by window chrome, and adds bulk actions and the open-window list. Custom content commands cannot enter this generated list.

Legacy `commands()` applets retain their working commands under Actions and receive a separate identity menu. Since 0.51.0 a window whose content offers no menu receives the same identity menu under the window's title. Generated article menus use scope-specific sharing and close labels, and since 0.49.0 have no File menu: Print is in the article's identity menu, only where the host marks its page menu `data-page-print`, because printing a page of windows prints the desktop rather than the article. Explicit applet `menus()` definitions remain author-controlled: PUDL cannot infer whether a command called Settings changes this instance or every instance, or whether a domain command belongs in the identity menu. Site authors must apply the placement rules above.

The [migration guide](MENU-BAR-MIGRATION.md) gives the supported markup and API changes. The [implementation design](proposals/menu-bar-standardization.md) records the decisions and verification scope.

## Site-menu taskbar tear-offs

Identified site-menu titles now offer Pin or Unpin through their context menu and keyboard context-menu shortcut. Applet titles suppress those requests. The built-in taskbar destination provider owns pin presentation and restoration; hosts do not clone source lists or create special taskbar buttons. The [taskbar contract](TASKBAR-PINS.md#shared-pinned-section-and-site-menus) describes defaults, persistence, reserved identities and compatibility. These additions are available in 0.104.0.

- `siteMenus()` returns current `{ id, label, glyph }` descriptors for identified site menus, excluding applet groups and the identity button when it invokes a launcher. Custom titles declare their existing `data-menubar-id`. Persist IDs rather than labels or positions.
- `siteMenuId(element)` returns a site-menu ID for an element within a generated site title, or null for other controls. It does not infer ownership from visible text.
- `siteMenuDestinationId(menuId)` returns the canonical taskbar destination ID for a nonempty string. It does not pin or activate anything.
- `siteMenuDestination(destinationId)` returns the current menu destination descriptor or null. The built-in provider uses it to resolve saved references.
- `toggleSiteMenu(menuId, opener, options)` toggles the current site menu at a connected opener and returns whether it found a menu. Taskbar activation calls this method. The controller preserves its normal command ownership, live refresh, keyboard and focus paths. Overflow uses the visible More control. Optional `{ open: true, focus: 'first' | 'last' }` opens or focuses rather than toggling, as the taskbar ArrowDown and ArrowUp handlers require. Left and Right stay within the tear-off and its submenus rather than switching to a different menubar title.
- `siteMenuCommands(menuId)` returns fresh command rows suitable for `pudlMenu.openAt()`, including generated Window commands and permitted contributions. Unknown menus return an empty array. Call it each time an auxiliary surface opens and discard the rows when it closes. This method is unnecessary for normal taskbar pin integration, which uses the controller directly.

A future pin editor is deferred and will probably live in the launcher. No pin-management command is inserted into the ordinary menu contents.

## Native navigation popup rows

A `pudlMenu.openAt()` command row may supply `source`, an original connected anchor or button. An anchor source produces an anchor row carrying its `href`, `target`, `rel`, `download`, `hreflang` and `referrerpolicy` attributes. Ordinary activation calls the row's `run` callback when present, or clicks the source otherwise. Modified link activation uses the displayed anchor's native browser behavior without running the ordinary callback. Disabled rows block activation. Stable-ID updates replace a row when its required element type changes.

The shared taskbar navigation popups use this contract to retain link semantics while routing plain activation through the original destination or window button. The source is a live DOM reference, never a persisted preference. Hosts should continue providing native links for navigation.

A caller using `openAt(..., { owner: button, toggle: true })` marks its opener with `data-menu-toggle`. A second pointer or keyboard activation closes the owned context popup. The marker preserves the opener identity through pointer light dismissal. Arrow-key opening can omit the toggle option. Normal context requests on source-backed navigation rows remain available, including keyboard requests.

Native popup dismissal retires the corresponding context-menu state. Returning from a link opened in another tab and dismissing with Escape leaves the opener ready for its next activation.
