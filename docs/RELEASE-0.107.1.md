# PUDL 0.107.1 verification

This release carries the single-application composition feature from the held 0.107.0 candidate. The [contract](MENU-BARS.md#single-application-bar) and [design record](proposals/single-application-menu.md) describe the opt-in. Applet providers require no new marker.

## Cause and correction

The 0.107.0 full branch and tag gates each had one failure among 664 suite results. The new application regression set a wide viewport and immediately tried to focus a title that PUDL had not yet made visible. Its Enter key consequently went to the document textarea. The [Linux WebKit comparison](https://github.com/paulmooreparks/pudl/actions/runs/42941527657) records that sequence in all six baseline attempts, across readable and minified scripts, and passes all six attempts with the expanded-state wait. The failed gates and their artifacts remain recorded in [the held candidate receipt](RELEASE-0.107.0.md).

The correction waits for the bar's collapsed state to clear before giving the identity keyboard focus. The menu runtime is byte-identical to 0.107.0. The version header changes separately. The corrected suite also passes locally in Chromium, Firefox and WebKit against readable and minified scripts.

## Required release gates

The complete branch and tag gates must pass before publication. The archive must be reproduced from the frozen tag and compared with every tagged blob. Its complete manifest must include version, tag, commit, byte counts and SHA-256 and SHA-384 values. CDN stylesheet and script bytes must match the tag before the README examples are updated.

The earlier candidate's 45 readable and 45 minified menu engine-suite runs, reference checks in both themes, and Dinah's Chromium scratch-host intake remain relevant because the menu runtime is unchanged. They do not replace this release's complete gates. Native-host installation, touch and manual assistive-technology testing are not claimed here.

## Adoption

A host replaces PUDL whole and adds `data-menubar-composition="application"` to its standalone document bar. Dinah takes this release together with a yavc.app release bundling the same PUDL. Its installed acceptance remains Dinah's responsibility. The [public sample](../samples/application-menu.html) exercises a document applet outside a window manager.
