# Proposal: the road to 1.0

Status: accepted 2026-09-28. An assessment of PUDL at 0.14.0 and what 1.0 should require. The accessibility section shipped in 0.15.0. The consistency pass shipped in 0.16.0, all ten items except the Architectural Principles document, which is left for 1.0, and it added notebook section tabs, since the flat tab bar broke the elevation rule too.

## What 1.0 means

A 1.0 release is a promise: from then on, a class name, token, attribute, event, script function or URL parameter that a project relies on changes only in a 2.0. PUDL has been changing freely below 1.0, and rightly, because parkscomputing.com kept finding real gaps. Before making the promise, three things have to be true: the public surface is written down, it is consistent enough to live with for years, and there is a way to tell whether a change breaks it. Most of what follows serves one of those three.

## Blocking: the promise itself

**A written contract.** Everything a project may rely on, in one place: the palette and fixed tokens, every class and its allowed markup, every `data-` attribute, every event and its `detail`, every script function, the window URL grammar and the regions rules. Today these are spread through a long README, and some exist only in code comments. Anything not in the contract is internal and free to change.

**Tests in the repository, run on every push.** Nine browser suites were written during 0.4 to 0.14, and all of them live in a scratch folder on one machine. They belong in `tests/`, run by a GitHub Action on every push and on every tag before it is released.

**All three browser engines.** Every test so far has run in Edge, which is Chromium. Firefox and Safari have not been checked once. PUDL claims a 2024 browser floor, and the popover, `:has()`, container queries, `color-mix()`, the pointer-capture drags and the window-splitter keyboard all need confirming in Gecko and WebKit, which Playwright can run.

**A deprecation rule.** When a name changes, the old one keeps working, with a note in the changelog, until the next major release.

## Blocking: accessibility

**Forced colours.** Windows' high-contrast mode removes every `box-shadow`, by specification. PUDL draws every focus ring as a shadow, so in that mode no focused control shows focus at all, and the raised and sunken surfaces lose the shadows that distinguish them. PUDL needs `@media (forced-colors: active)` rules: real outlines for focus, and borders for the surfaces.

**Reduced motion.** The switch, the menus and the busy regions animate, and nothing respects `prefers-reduced-motion`.

**Right to left.** The stylesheet uses physical left and right throughout, and the sidebar divider assumes the sidebar is on the left. Logical properties (`inline-start`, `margin-inline`) and a direction check in `pudl-md.js` would make an Arabic or Hebrew page work.

**Words in the scripts.** The scripts write English into the page: "Resize the list", "Nothing matches.", "Maximize" and "Restore", "(minimized)", and a long accessible label on every window's title bar. Each should come from an attribute the server can localise, with the English as the default.

**Print.** A printed page today shows the topbar, the toolbars and the window chrome. A print stylesheet should drop the chrome and print the content, a maximised window's body included.

## Inconsistencies

These are places where PUDL breaks its own rules or uses two answers for one question. 1.0 is the last cheap moment to fix names.

1. **State is marked four ways.** A selected tab, a segmented choice, a list row and a window use a `.active` class; a dock tab uses `aria-current`; a toggle uses `aria-pressed`; a switch uses `aria-checked`. The ARIA attributes are the better answer, because one attribute tells the eye and assistive technology the same thing, and a class tells only the eye. 1.0 should style the ARIA state everywhere (`aria-current` for a current tab, row or page; `aria-pressed` and `aria-checked` for toggles; `aria-selected` for true tab panels), keeping `.active` as a deprecated alias.

2. **Three pills that look alike.** An accent badge (a state), a filter chip (an active filter) and a plain chip (an attribute) are all accent-tinted rounded labels, which breaks the rule that categories stay separate. A badge should always lead with its glyph, as it does; a chip should be neutral, not accent-tinted; and a filter chip, which can be pressed to remove, should look like it can be pressed.

3. **The switch is flat.** The rest of PUDL raises what can be pressed, but the switch's thumb is a flat dot on a flat track. It should be a raised thumb in a sunken track, the elevation grammar applied to it.

4. **The type scale is claimed but not defined.** The README says the type scale belongs to the language. The stylesheet uses twelve sizes, from 9px to 18px, with no tokens, and styles no headings at all; the reference page styles its own. 1.0 needs a named scale (`--text-xs` to `--text-2xl`, say) and base styles for `h1` to `h4` and body text that a project can rely on.

5. **The spacing grid is claimed but not followed.** The Architectural Principles call for a 4 and 8 grid; the stylesheet uses paddings of 5, 6, 7, 9, 11, 14, 18 and 26 pixels. Either define spacing tokens and move to them, or drop the claim.

6. **Glyphs are drawn three ways.** Window buttons, badges, the dock, the caret and the back link use Unicode characters; the filter button uses an SVG mask; the launcher uses inline SVG. The form error's ⚠ has no text-presentation selector, so it can render as a colour emoji on Android, the problem the launcher already hit. 1.0 should draw every chrome glyph one way, as SVG masks from `--glyph-*` tokens filled with `currentColor`, so they are identical on every platform and follow the theme.

7. **Names from history.** `--pr` and `.badge.pr` mean "positive" but read as nothing; `.fc-kind` is short for "filter chip kind"; the reference page still calls master-detail "the new primary layout". A naming pass, with aliases for the old names, belongs before the freeze.

8. **Two ways to lift a panel.** Menus use the HTML popover, which gives Escape, outside click, the top layer and focus handling for free. Dialogs use a hand-built backdrop and panel, and PUDL ships no script to show them. They should be native `<dialog>` elements shown with `showModal()`, which brings the focus trap, Escape and `::backdrop` from the browser, styled as PUDL's dialog is now.

9. **The reference page speaks in two registers.** Its later sections are prose; its early ones are terse fragments ("One look. Every button is raised. Disabled = dimmed") and its invariants list mixes the two. It should read as one document, and its invariants should cover menus, windows, regions and applets.

10. **The Architectural Principles have drifted.** That document still describes the system font stack, 8px and 4px radii, 2px focus outlines and a toast component that PUDL does not have. It says the repository wins, but it should be brought into line at 1.0.

## Missing components

These are the gaps an application built on PUDL will hit first, roughly in order.

- **A data table**, for lists with columns: header, sortable columns shown by a glyph as well as position, row selection, numeric alignment, and a narrow-screen form. PUDL has the key/value table for one record and nothing for many.
- **Notices**: an inline banner for information, warning, error and success, each with its glyph, and a toast for confirmations that pass ("Saved"), announced to screen readers through a live region.
- **Form states**: an invalid field (`aria-invalid`) drawn as invalid, a required marker, help text tied by `aria-describedby`, fieldsets with legends, radio groups, and file input.
- **Tabs within a page**, the ARIA tab-panel pattern, which differs from the section bar: the section bar navigates between addresses, and tabs switch panels inside one.
- **Empty and loading states**: what a list with nothing in it shows, and a busy indicator beyond the regions' dimming.
- **Tooltips**, for icon buttons, which today rely on the browser's `title`.
- **Pagination**, or a documented "load more" pattern for long lists.

## Further ideas

- **Server helpers.** The windows, regions and master-detail panes all ask the server to render state from the URL. A small Go package and an ASP.NET Core package that parse the window parameters, render the dock, the rows and the placements, and build the button links would save every project writing that twice. Tela is Go and your other work is C#, so both are useful.
- **A theme builder.** A page that takes the nineteen palette tokens, shows every component live in both themes, checks every pair the README's contrast rules name against WCAG AA, and exports the theme file.
- **A lint.** A development script that checks a page against PUDL's rules: a raised surface that is not a control, a badge without its glyph, two primary buttons in one context, a link that is not underlined, a region missing on some pages.
- **A second sample.** The article reader shows reading. An application sample, a small expense tracker, would show forms, the data table, dialogs, notices and validation, which is where most projects live.
- **Unsaved readers and the theme.** New readers still start dark. With system following now built, System is the kinder default, and 1.0 is the moment to decide.
- **An npm package.** jsDelivr from GitHub serves the CDN case well, but a package would let a project with a build pin and update PUDL with the tools it already uses.

## A suggested order

1. **0.15**: the accessibility fixes (forced colours, reduced motion, print, glyphs, localisable words), since they are bugs today.
2. **0.16**: the consistency pass (state attributes, pills, switch, names, type and spacing tokens, native dialog), with aliases for everything renamed.
3. **0.17**: the data table, notices and toasts, and menus summoned by a key, which is how PUDL answers parkscomputing.com's go palette (`docs/proposals/go-palette.md`).
   **0.18**: form states, tabs within a page, empty and loading states, tooltips and pagination, and the application sample that shows them all.
4. **0.19**: the contract document, the tests in the repository with CI across three engines, and the reference page in one register.
5. **1.0**: a release candidate adopted by parkscomputing.com and one application, then the tag.

The server helpers and the theme builder can come alongside or after; they add to PUDL without changing its surface.
