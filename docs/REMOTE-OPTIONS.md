# Remote searchable-select options

PUDL 0.109.0 provides beginOptions and replaceOptions for an enhanced select carrying data-combo. The asynchronous lookup belongs to the application. No synthetic keyboard event is needed to reopen the result list.

```js
select.addEventListener('pudl:combo-query', function (event) {
  var query = event.detail.query;
  var ticket = event.detail.ticket;
  if (!ticket) return;
  lookupPeople(query).then(function (people) {
    var options = people.map(function (person) {
      return new Option(person.name, person.id);
    });
    pudlCombo.replaceOptions(select, ticket, options, { open: true });
  });
});
```

The application supplies select and lookupPeople in this example. Trusted typing in the generated proxy emits a bubbling pudl:combo-query on the original select with query and ticket. Capture both from that event when starting the request. For an explicit application lookup, beginOptions(select) returns an opaque ticket or null when the select is not an available enhanced searchable select with its proxy focused. A new ticket supersedes the previous request, including another request for identical query text.

replaceOptions accepts native option elements from the current document, clones them, and returns true only while the ticket still owns the same query, source, focus and lifecycle. It returns false without mutation or reopening for stale ownership. Invalid option arrays reject with TypeError. Each successful ticket is consumed once.

The selected value/option is retained, including when absent from a result page. Query text, caret and focus stay in the proxy. Programmatic replacement does not manufacture input or change events. Passing open:true explicitly requests an open list filtered by the retained query; an empty result does not invent an available option.

Dismissal, leaving the field, query changes, source replacement/invalidation and loss of usability retire ownership. Refocusing with the same query does not revive an old ticket. These rules prevent a late lookup from reopening a dismissed menu or replacing a newer response. Existing local option behavior and data-combo-src remain supported.

A false replacement result is final for that response. Discard it; do not acquire another ticket or synthesize a key to force reopening. After deliberate dismissal a new request needs fresh typing or explicit user intent to reopen.

The [implementation note](proposals/desktop-edit-and-menu-implementation-2026-11-25.md) and focused suite tests/combo-remote-options.test.js record the lifecycle and regression coverage. Release and installed acceptance have separate evidence boundaries.
