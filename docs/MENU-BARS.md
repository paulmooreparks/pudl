# PUDL menu-bar conventions

These conventions define where users find commands across PUDL sites. They were agreed on 2 October 2026. They complement the [web contract](CONTRACT.md) and [integration guide](../README.md#the-menu-bar). The implementation notes below distinguish the conventions from behavior enforced by PUDL 0.39.2. This document does not introduce an API or change the vendored PUDL specification.

## Ownership and names

The **site bar** belongs to the site or application shell. Its commands and order remain stable as the active applet changes. The **applet bar** belongs to the active applet, article, or other content and appears to the site's right. An article can use its title as the identity of that group. Existing implementation terms `host` and `front` refer to these respective groups; their API names remain unchanged.

Each group begins with an identity menu bearing its owner's visible name, optionally with a logo. The hamburger glyph toggles that group's first menu. The name and glyph must not navigate to different destinations or expose different commands.

Menus describe the scope of their commands. Opening a menu does not change the active content or selection on which those commands operate. Settings labels distinguish this instance's settings from defaults for future instances where both exist.

## Site bar

The standard order is **Site name, Go, Applets, View, Window, Help**. A site omits menus for which it has no meaningful commands. The remaining menus retain their relative order. Site-specific menus may appear after Applets and before View when their purpose cannot fit a standard menu. They must not become destinations for applet command contributions.

Applets is a top-level launcher immediately after Go. Launching a tool is frequent enough to deserve direct access and is distinct from navigating site destinations. Do not bury the primary launcher under Go. A toolbar or launch page may provide an additional route.

| Menu | Contents |
|---|---|
| Site identity | Home; About the site; Site settings when available; account and sign-in commands when applicable; Copy workspace link when supported. |
| Go | Site destinations, site search, and navigation commands. |
| Applets | Available tools that users can launch. The list describes available tools, regardless of which instances are already open. |
| View | Site presentation, including theme, sidebar visibility, and window/classic layout. |
| Window | Active-window controls, arrangements, bulk window commands, and the open-window list. |
| Help | Site help, keyboard guidance, support, and the active applet's help contribution. |

The identity menu groups related entries with separators. It is not a general navigation directory or a drawer for unrelated commands. Theme choices belong under View; the settings page can expose the same preference. Applet launching belongs under Applets. Account actions remain clearly separated from navigation and workspace sharing. A browser site must not offer Quit unless its environment actually supports quitting the application.

Applets launches tools; Window selects and manages existing windows. Sites with multiple instances must make launch behavior clear, using labels such as New editor window when a command always creates another instance. Reusing an existing instance must not discard its work.

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

Hosts must provide each shared menu required by their installed applets, even if the host itself has no commands for it. The menu appears when it has commands and disappears when empty. Commands must not silently vanish because a host omitted a required destination. Stable menu identifiers independent of translated labels are planned; applications must use the current documented API until that support ships.

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

## Implementation status and follow-up

Sites can adopt the menu names, order, identity separation, and contribution policy with PUDL 0.39.2. Its `menus()` interface supports multiple titles and `into` contributions; native popovers, glyph toggling, keyboard navigation, named collapsed sections, and Back rows already exist. PUDL does not yet enforce all these conventions.

| Follow-up | Evidence in 0.39.2 and required outcome |
|---|---|
| Stable standard menu identifiers | `assemble()` matches `into` keys against displayed labels. Add identifiers independent of translation, with a documented migration for existing label-based hosts and applets. Final field and attribute names require an API design before implementation. |
| Contribution validation | Current assembly accepts additions to any existing non-identity host title. Restrict standard contributions to Go, View, and Help, preserve owner headings, and diagnose unsupported destinations. Define how required empty shared slots are represented and displayed. |
| Shortcut ownership | Contributions are appended to host menu items, and `onShortcut()` searches those items as host commands. Preserve contributor ownership so applet shortcuts remain scoped to their content after merging. |
| Target lifetime | `soon()` skips rebuilding while a panel is open. Add explicit invalidation when its target is removed or changes, and ensure queued changes are reconciled when the panel closes. Prevent invocation against a disconnected or newly substituted target. |
| Identity menus and fallbacks | The `commands()` fallback places working commands in the identity menu. Generated article menus also place Print there and use generic Copy the link and Close labels. Bring generated menus into these conventions through a documented migration; do not silently drop legacy commands. |
| Consistent window actions | Sites currently build their Window lists. Design a shared capability-based mechanism to keep standard actions, availability, and labels consistent without arbitrary applet injection. Reuse the existing window API. |
| Conformance coverage | Add translated-menu routing, scoped contribution shortcuts, target removal, empty-slot handling, and identity/fallback cases to the existing click, hover, touch, and keyboard tests. |

These are implementation work items, not shipped API promises. The shortcut-ownership and target-lifetime items deserve priority because they concern which content an action affects. The naming and slot changes should ship together with a migration guide in a future minor release.
