# Glass overlap legibility

This is a backlog proposal recorded on 2 November 2026 against PUDL 0.96.1. No implementation or release is authorised by this record.

In the Glass skin a window's title bar is translucent, and the title and status chips of a window behind it stay partly readable through it. Screenshots in light and dark modes show blurred fragments of the background window's title and a status chip beside the foreground window's own title, where they read as ghost lettering. The other skins, and Glass's own opaque fallback for reduced transparency, do not show the effect.

The shared Glass layer blurs what lies behind it by 2px under a 35 percent surface tint, and the title bar's background is transparent, with a halo behind each letter of the foreground title. At 2px the text behind it is softened but not made unreadable, which is consistent with what the screenshots show. No rendered experiment has been run yet to confirm it.

## Direction

The blur should increase slightly from 2px. Translucency is what makes Glass Glass, so the shared frame and title-bar material stay translucent, and the tint stays where it is for the first comparison. A denser tint, or an opaque backing behind the title row, is not the direction chosen. No replacement radius has been picked; the first preview compares a few small increases.

Only the foreground window's title should be bold, with background windows' titles at normal weight. A bold title beside faint ghost text reads as the one title, and the weight also tells the reader at a glance which window is in front. Whether to carry the same distinction to the other skins, Standard included, is left open. The two changes together may be enough to settle the ghosting.

## Verification

A preview and its tests should put high-contrast titles and status chips behind both the foreground window and an inactive one, in light and dark modes and in every palette Glass offers. They should check that the title's weight follows activation without changing the title bar's size or moving anything in it, and check the contrast of titles, host chips and focus rings, the frame and title bar staying one material, the reduced-transparency and unsupported-filter fallbacks, and readability in narrow and enlarged layouts. Glass's existing admission covers its current bytes only, so changed bytes need their own before-and-after evidence and source hashes.
