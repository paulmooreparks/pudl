# Window selector locality

PUDL 0.97.10 narrows five window selector rules without adding JavaScript or changing host markup. The declaration bodies and selector specificity remain unchanged.

## Dock fallback

A shared window receives fallback geometry when its layer has no direct-child dock group. The former selector asks the layer to inspect its children. The replacement starts at each eligible shared window and excludes a dock group in every possible position among those same children.

The window cannot itself have the dock-group class, cannot have a preceding dock-group sibling, and cannot have a following dock-group sibling. The self and preceding exclusions use `:not(:where(.win-dock-group, .win-dock-group ~ *))`; the following exclusion uses `:not(:has(~ .win-dock-group))`. A group nested in window content affects neither selector. Insertion, removal, movement and class changes continue to affect layout through CSS, including before JavaScript runs.

The `:where()` exclusion contributes no specificity. The following-sibling `:has()` contributes the same class specificity as the former layer query. The left/right geometry rule retains its edge restriction, the padding rule retains its shared-window restriction, and the header rule retains its dock-only exclusion.

## Menu selectors

Compact chrome checks for its menu control within the documented window header. Streaming body content is outside that query. Open-menu paint checks the header's menu siblings in both orders. The header uses `:where(.win-head)` in those open-menu selectors to retain the former specificity. Native popover state remains the source of truth, so no menu-open cache or new event synchronization is needed.

The semantic argument uses the subsequent-sibling combinator, relative `:has()` matching and `:where()` specificity defined in [Selectors Level 4](https://www.w3.org/TR/selectors-4/). Browser invalidation cost is measured separately and is not part of the correctness argument.

## Performance evidence and limits

Eight balanced baseline/candidate pairs on a streaming host workload measured paired median style/layout reductions of 16.0 percent with open windows and 20.4 percent after reopening. Input-delay p95 improved by 4.7 ms and 4.0 ms respectively. Every loaded pair reduced style/layout cost. All sixteen cases passed their input, ordered-output, producer-duration, page-error and asset-integrity checks.

Closing four windows added a paired median 12.5 ms of style/layout during the first 500 ms. Some individual input pairs worsened. The selector candidate met its recorded CSS-specific requirements but did not meet the separate scheduler experiment's stricter every-pair input gate or 20 percent mounted reduction target. Long tasks remain during transitions, and key-to-animation-frame measures a callback rather than presentation. These results do not establish a cure for intermittent live stalls.

The measured workload used PUDL 0.97.5. The same five-rule patch is applied to 0.97.9 for the upstream release, retaining its skin-attribute correction. Upstream parity and functional checks validate that combination at the library level; host integration remains a separate check.
