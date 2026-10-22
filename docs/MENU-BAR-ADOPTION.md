# Menu-bar adoption guide

This guide applies the [PUDL menu-bar conventions](MENU-BARS.md) to two typical kinds of site: a tools workspace, which offers articles alongside a catalog of applets, and a reader application, which presents stories and their discussions from outside sources. Whoever adopts the conventions, a person or an agent, should read them and this document, and should inspect the site's current menu definitions before changing them.

A site that offers a catalog of applets should give them a top-level Applets menu instead of nesting the launcher under Go. Every site should order its site menus **Site name, Go, Applets, View, Window, Help**, omitting genuinely unused menus.

## Shared responsibilities

A site owns its navigation, launcher catalog, identity entries, and window commands. Applets own their identity and working menus, with scoped additions to Go, View, and Help. The site bar remains stable as different windows come forward. The applet bar changes with the active content.

A site should provide direct launch access through Applets. Go holds navigation between destinations; Window lists existing windows. Launch behavior must state whether it creates an instance or activates one. No site should require a user to discover a launcher beneath a navigation submenu.

Hosts and applets should adopt PUDL 0.40.0 together with the [migration guide](MENU-BAR-MIGRATION.md). Declare stable menu IDs and use them as `into` keys. Translated labels then remain independent of routing. The release preserves applet shortcut scope for contributions, so Go, View, and Help contributions may declare applet-scoped shortcuts. A host Window title can opt into shared window management with `data-menubar-windows`; remove its duplicate handwritten management commands when doing so. Agents should use the tagged release rather than copying or patching PUDL internals.

## A tools workspace

A site that offers articles and a catalog of applets should use the following division. The first row stands for the site's identity menu, titled with the site's own name.

| Menu | Adoption guidance |
|---|---|
| Site name | Keep Home, About, and Site settings. Move unrelated quick links into Go. Add Copy workspace link only with a label that distinguishes it from sharing one article or applet. |
| Go | Keep Find in the list and useful site destinations. Place curated navigation links here where useful. Remove any nested applet launcher once the top-level Applets menu provides it. |
| Applets | Keep the direct launcher for tools such as a terminal, a file browser, an editor, a game, and a theme editor. Keep the order stable. A guide is documentation and belongs in Help, even when rendered through the same window machinery. Site settings belongs in the identity menu even if implemented as an applet. |
| View | Keep Window view, Classic view, and Theme. Append active-applet presentation controls under the applet's heading. |
| Window | Keep bulk window actions, and provide clearly grouped active-window actions and an open-window list where supported. |
| Help | Provide site help and keyboard guidance. A guide to one applet may remain permanently available as site documentation; that applet's own help, while it is active, must not duplicate the same command. |

A theme editor should use **Theme Studio, File, Palette**, with its own name as the identity menu. Its identity menu holds About and only the identity operations it supports. Keep opening and saving CSS under File and palette selection/reset operations under Palette. Add Edit only if actual editing-history or editing commands justify it.

Editor should use **Editor, File, Edit**, plus substantial domain menus when needed. Move word wrap, line numbers, and preview visibility into its View contribution. Put go-to-line navigation under Go and editor help under Help. Keep document close under File and window close in the identity menu.

Games and small tools should separate their identity entries from their working commands. For example, a game's New game and Restart belong under Game. The `commands()` fallback now preserves working commands under Actions. Newly standardized applets should use `menus()` to give those commands a domain-specific title.

Articles should retain a recognizably named content group. PUDL 0.40.0 supplies scoped sharing and close labels. Since 0.49.0 an article has no File menu of PUDL's, and its identity menu offers Print only where the site marks its page menu `data-page-print`, once its printed article is worth having. Sites should review any translation overrides that retain the old generic labels.

## A reader application

A site that presents stories and discussions from outside sources should use the same order and scope rules.

| Menu | Adoption guidance |
|---|---|
| Site name | Provide Home and About. Put the source repository link in About or a clearly named support/development section. Keep any directory of destinations out of this identity menu. |
| Go | Place each source's story lists, Pinned stories, and Find the discussions of a link here. Clarify destination labels where an external source site could be confused with the reader's view of it. |
| Applets | Provide direct access to the reader's tools, such as replies to the reader, a user lookup, and job listings. Use an ellipsis when a command requires further input. |
| View | Keep story-list visibility, domain-filter access, and Theme. Domain filters should be labeled so their effect across story lists is clear. |
| Window | Retain bulk actions and provide active-window controls and the open-window list, consistently with the tools workspace above. |
| Help | Retain keyboard and site help. Label external source destinations clearly, and place ordinary external navigation under Go instead of treating it as help. |

The story reader should become **Reader, Story, Discussion**. Reader supplies identity, applet/content sharing, and Close window. Story keeps pinning, opening the original or source discussion, refreshing the article, hiding the story, and blocking its domain. A domain-block command must make its wider effect clear. Move Next story into a Go contribution headed Reader. Remove duplicate sharing and close commands after assigning their canonical locations.

Discussion retains its content-specific sorting, collapse, and expand commands. Move Next comment, Previous comment, and First new comment into the reader's Go contribution. Reader presentation controls, if added, belong under View. Reader documentation belongs in Help's Reader section.

A replies tool should use **Replies, Watch**. Watch holds Check now, Mark all as read, and Watch another user. Replies holds supported identity operations. Apply the same separation to the reader's other tools after inspecting their current menus; do not manufacture File or Edit menus for them.

## Verification

A shared convention or runtime behavior belongs in PUDL; domain wording and destinations belong in each site. Sites that adopt these conventions need not copy one another's tool catalogs or domain menus.

- The adopter should record the before/after menu inventory in the change description, including where commands moved or were intentionally removed as duplicates.
- The adopter should verify site-menu order with no window open, an article or story active, and several applet types active.
- The adopter should verify that contributions carry the active owner's heading and that switching between two instances of the same applet targets the correct instance.
- The adopter should test repeated title and glyph clicks, hover-switching followed by a click, keyboard navigation, and repeated mobile taps. A site should adopt PUDL 0.40.0 or later with its matching window, applet, menu-bar, menu, and stylesheet files.
- The adopter should verify that site shortcuts work at site scope and applet shortcuts do not execute while focus is elsewhere.
- The adopter should verify that mobile menus preserve the named groups and all commands without hover, including Back navigation from submenus.
- The adopter should verify that Copy workspace link and content-sharing commands produce their advertised URLs and that Back/Forward and direct navigation retain their established behavior.
- The adopter should report PUDL gaps to PUDL instead of presenting a local workaround as part of the shared contract.

