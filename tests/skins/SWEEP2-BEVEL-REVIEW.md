# Second sweep and initial Bevel review

Independent verification accepts the second sweep's Windows primary Standard preservation result. The initial Bevel review found a destructive-text contrast defect, and the corrected candidate passes the reviewed checks below. This report does not admit Bevel to a release registry or provide release sign-off.

## Standard preservation

The immutable source is `tests/output/skins-sweep2-source`; the capture is `tests/output/skins-sweep2-capture`. Its environment, harness, fixture coverage and conditions match the accepted Standard baseline. Only the two stylesheets differ among captured source inputs.

| Input | Second-sweep SHA256 |
|---|---|
| `dist/pudl.css` | `9300f05738cc20cb240ee107e0598c68ba29bdd2ab57dd38823539e3b2c7f848` |
| `dist/pudl-windows.css` | `55a30c3e85501ec126d02c6543955dccbc5a7635dda0060efa93b758f268062f` |

All 48 observation files match the original expectations. All 672 image comparisons pass under the previously accepted rules, and all 24 absent/explicit Standard pairs pass. No rerun was necessary. The logs are `tests/output/skins-sweep2-comparison.log` and `tests/output/skins-sweep2-selection-equivalence.log`. Original expectations remain unchanged.

The subsequent danger-text correction changes one fallback hook after that complete capture. A separate rendered check compares Standard's destructive button against the original frozen styles at rest, hover and pointer-down in both themes and every engine. Its paint and bounds match exactly. This targeted result is distinct from the complete second-sweep capture.

## Bevel finding and correction

The first Bevel run found six manifestations of one defect. Resting dark destructive text was `rgb(224, 97, 86)` over `rgb(35, 39, 45)`, producing 4.2968:1. All three engines reproduced it at 1280px and 360px. The required text ratio is 4.5:1.

The defect is inherited. The accepted Standard baseline's dark danger-button variant records the same foreground over gradient stops ending in that same fill. The separately rendered Standard gradient endpoints measure approximately 3.53:1 and 4.30:1. Preservation does not waive this existing defect.

The corrected Bevel candidate mixes its destructive foreground toward text without changing the shared status palette. The independent regression measures rest, hover and actual pointer-down states. Every engine produces these ratios:

| Theme | Rest | Hover | Pointer-down |
|---|---:|---:|---:|
| Light | 6.713 | 6.574 | 6.574 |
| Dark | 5.242 | 5.284 | 5.284 |

The original failing captures remain in `tests/output/skins-bevel-review` and `tests/output/skins-bevel-review-confirmed`. The corrected immutable source and results are `tests/output/skins-bevel-corrected-source` and `tests/output/skins-bevel-corrected-review`. The final log is `tests/output/skins-bevel-corrected-review.log`.

## Reviewed coverage

The corrected run passes 1,170 checks in Chromium, Firefox and WebKit, in light and dark forms. It checks geometry, client dimensions, padding, border widths and typography for 828 nodes across all 154 declared catalogue cases in each engine/theme pair. It independently checks base part surface mappings, including inset raised/sunken treatments and flat read-only categories.

The preview checks preserve the edited input node, its value and browser history length across selection. At 1280px and 360px, it fits the viewport and its measured enabled main-content controls meet text contrast, continuous boundary contrast and 24px minimum dimensions. These contrast assertions apply to flat fills; gradient endpoints are recorded separately. Representative forced-colour and print comparisons prove that Bevel paint is excluded for the tested button. No page errors occurred.

Desktop dark and narrow light screenshots were visually inspected. The review retains screenshots for both themes and widths in every engine. It does not infer comprehensive visual or accessibility conformance from computed styles.

| Corrected input | SHA256 |
|---|---|
| `dist/pudl.css` | `71718982b16a2354380ea608976c93c53c02ec7b83db85bbb555d7bc413aac09` |
| `dist/pudl-windows.css` | `55a30c3e85501ec126d02c6543955dccbc5a7635dda0060efa93b758f268062f` |
| `samples/skins.html` | `ab0b2f15688152accdaa0cfb0289bfd87cd14b744b4c1ea7b697d4b90ddf7b1f` |
| `samples/skins.js` | `1e5634ba8f74632183b50cf6f33f69b8046f3df5b79d3f480507e53e89dee045` |
| `samples/skins-bevel.css` | `41e41bd3f514acfb2e2b3c0958c9a56d57c179203df6da05998d25cf04c6d753` |
| `skins/bevel.json` | `2d69a5f81747da7559a8adebc36ab9c46788fecefe5f72273236d4559f78169b` |

## Remaining work

The full interaction matrix still needs visible generated menus, stacks, window placements, focus indicators and status marks under Bevel. Catalogue state geometry does not replace those interaction checks. Comprehensive contrast over gradients, status/category distinction, clipping, RTL, actual zoom, Linux, blocked/system fonts and manual assistive technology remain separate gates. The runtime availability/fallback mechanism and release admission checks also remain outside this preview review.

Verification changed only its test harness and review records. The architect supplied the stylesheet correction. Full-mode taskbar work remains untouched.
