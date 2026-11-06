# Markup radio menu choices

The enhanced menu bar dispatches `pudl:menu-choose` when a command originates from a source button with an explicit `value` and `aria-checked` in a `ul[data-menu-radio]`. The event is dispatched on that source list, bubbles and is cancelable. Its detail contains the unchanged string `value` and the original source `button`. An explicit empty value is valid. Labels and values are data; PUDL does not evaluate JavaScript stored in either.

The same command path serves the enhanced menu, folded combined menu, ribbon and registered keyboard shortcuts. Disabled commands do not dispatch a choice. Links, ordinary buttons and direct clicks on the hidden source markup retain their existing behavior.

The host handles the choice and updates the source buttons' `aria-checked` attributes. Call `pudlMenubar.refresh()` when the visible ribbon must reflect that change immediately. PUDL does not automatically change application settings or checked state. For example, a host may call `pudlSkins.select(value)` after validating a skin ID against its available registrations.

Call `event.preventDefault()` to suppress the source button's legacy click. Without cancellation, PUDL dispatches the source click once after the choice event, preserving existing click handlers. Menu dismissal and focus recovery follow the existing menu command path. Asynchronous host work must not depend on the original user activation surviving a timer.

The [working example](../samples/markup-menu-choices.html) uses external JavaScript to change appearance. Automatic generation of skin and theme menus is outside this contract.
