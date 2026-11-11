# Single-application menu composition

Paul requested one application menu bar for the standalone Editor on 11 November 2026. The applet identity's commands belong in the application identity menu, and its File, Edit and domain titles belong on that same raised surface. This opt-in presentation changes no workspace defaults.

## Contract

A host sets `data-menubar-composition="application"` on its existing `data-menubar` element. PUDL combines the host and active content into one visible group with the host's name and one hamburger. The first applet title is already its identity under the existing contract; applets add no marker and retain their menu providers.

The visible order is the application identity, File, Edit, View, domain titles, Window and Help. Host-specific nonstandard titles retain their relative order. The applet's identity commands precede the host's identity commands, separated when both have content, so a host-authored final Close Window command stays last. Shared contributions keep their existing destinations but omit the redundant applet-name heading in this presentation. Pins and resident menus remain separately authored groups; this option composes the application and its active content.

PUDL keeps the original host and active-content models for command ownership, shortcuts and guarded invocation. It composes their visible title entries for rendering, mnemonic allocation, the collapsed menu and the ribbon. The application identity's displayed rows combine both sources without copying callbacks into host markup. Host menu pin APIs continue to describe authored host menus, and do not acquire active-content File or Edit menus.

The ribbon has one selected application tab. A keyboard-opened panel keeps focus across a redraw when its command survives; changing active content removes obsolete contributions and retains the existing source checks. The default two-group workspace bar keeps its established behavior.

## Verification and delivery

Focused source and minified Chromium, Firefox and WebKit checks must cover the default layout, the single group and identity merge, actual menu actions, shortcut priority and source guards, current-content changes, shared View entries, collapsed navigation, ribbon selection and keyboard focus. The existing menu continuity, mnemonic, pin and host suites remain regression coverage.

This new opt-in contract requires a minor release, planned as 0.107.0, with full branch and tag gates and immutable archive, manifest and CDN verification. Dinah owns opting the standalone document page into the published mode and verifying its real Editor. yavc.app owns the separate Markdown attribute correction. No rendered menu nodes are moved by a host workaround.

The 0.107.0 branch and tag gates exposed a missing responsive-readiness wait in the new Linux WebKit test. The recorded comparison reproduced the failure with focus still in the document and the title hidden, and passed when the expanded state was awaited. The tag and draft assets stay frozen. Delivery continues as 0.107.1 with the corrected test and unchanged menu runtime.
