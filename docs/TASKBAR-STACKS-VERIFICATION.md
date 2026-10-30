# Taskbar stacks verification

The implementation was checked on 30 October 2026. This records checkout verification and does not represent a published release.

Independent verification signed off this unchanged candidate after checking the final Windows results and source hashes.

## Candidate

The final source files have these SHA256 hashes. Generated assets passed `node build/minify.js --check`.

| File | SHA256 |
| --- | --- |
| `dist/pudl-windows.js` | `A88962B307DA091FB6DA39F73F52FD4B46CB9FFF45EC639FAC6AE6D834FCB340` |
| `dist/pudl-menu.js` | `51D8F4748A22999078A7EC2E5A79143AB7FBA14A5186FC1F342C88E53210A12A` |
| `dist/pudl-windows.css` | `416EE66613AC2CA2B8C3BD7C4B6D55A8A608FA9859097267E1C1DFF5C3EB95B1` |

## Automated results

Linux checks used the Playwright `v1.63.0-noble` image with one test job and a read-only checkout mount. Full runs covered Chromium, Firefox and WebKit.

| Check | Result | Local log under `tests/output/` |
| --- | --- | --- |
| Linux full normal assets | 311/312 passed, 1773 seconds | `stacks-linux-full.log` |
| Isolated Linux normal WebKit stacks | All cases passed | `stacks-linux-isolate.log` |
| Linux full minified assets | 311/312 passed, 1578 seconds | `stacks-linux-min-full.log` |
| Isolated Linux minified Firefox applet-start | 1/1 passed | `stacks-linux-min-rerun.log` |
| Windows final focused normal assets | 15/15 passed, 81 seconds | `stacks-windows-final-normal.log` |
| Windows final focused minified assets | 15/15 passed, 81 seconds | `stacks-windows-final-min.log` |

The normal Linux failure was an intercepted-click timeout in the WebKit stack suite. The minified Linux failure was an applet-start assertion that observed the first idle applet before its initial check. Both isolated reruns passed. Rerunning does not prove the cause of either failure; these results must not be described as clean first-pass full-suite passes.

The final Windows checks covered the component catalogue, context menus, menu-open tracking, taskbar reordering and stacks in all three engines. They include the final localization and retained-element focus regressions. The normal Linux Chromium portion preceded the final retained-focus correction; the full minified run and final Windows checks exercised that correction in all three engines. Earlier concurrent Windows broad attempts were interrupted after navigation timeouts and are incomplete results.

Independent verification also exercised mirrored filters, close vetoes and synchronous callbacks, pointer commit and cancellation, physical RTL arrows, top-bar placement, live menus and submenus, and touch activation and direct Close in Chromium and WebKit. Firefox touch emulation was unavailable in the harness. Light, dark and forced-color screenshots were inspected. Syntax and whitespace checks passed, including the specification checkout.

## Remaining limitation

Manual screen-reader interoperability has not been verified. Automated focus and accessibility assertions do not substitute for that check.
