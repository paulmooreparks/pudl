# PUDL 0.85.0 scope

Paul authorized this release to address open issues 22, 23, 26 and 27 and adopt the menubar focus candidate from Dinah commit bdb0f8c27f48a3c6eac0681135ab174c45506397.

Selection actions are an optional script. A content element names an action bar by ID. PUDL keeps a cloned selection range, positions the ordinary buttons beside its final line, preserves the offer while its controls have focus, and emits a cancelable action event. The application owns quoting, sharing and persistence. Invalid or detached ranges dismiss the offer. Escape dismisses without consuming the key.

Margin notes use a stationary centered body and available space on its logical end side. Notes align with element or Range anchors, move down to avoid collisions, and fall back to a list reached by raised markers when the container has insufficient room. The body never changes width between presentations. Ordinary links provide both directions of navigation without script. Script enhancement preserves mounted note content and supplies focus navigation without changing the address. Resize, mutation and font changes schedule one layout pass; explicit refresh handles other application layout changes.

Menu redraws retain a surviving open title only when its source identity remains valid. Unchanged bars retain their panel and callbacks. Rebuilt bars reopen surviving titles with fresh command descriptors, while removed applet sources close their menus. The implementation must not execute stale applet commands.

The public menubar focus method accepts an optional same-document return target. It uses the existing desktop entry and Escape hierarchy. The target is checked for connection, visibility, disabled and inert state; actual focus success determines restoration. Eligibility does not depend on a tag-name whitelist. A return event lets a host restore focus inside a sandbox frame through its own ordered bridge. PUDL does not inspect child documents.

Tooltip dismissal must not stop Escape propagation or prevent its default action. The same key remains available to menu, dialog, application and resize handlers.

The previous tooltip specification explicitly required consuming the first Escape. That requirement conflicts with the newly exposed ribbon-focus tips and existing application return behaviour. This release changes that requirement. Earlier chat guidance incorrectly described consumption as undocumented; the implementation and specification are being corrected together.
