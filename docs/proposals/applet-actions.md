# Proposal: applet actions in PUDL, and one vocabulary for actions, commands and requests

Status: accepted 2026-10-20, with the decisions at the end, which change the calling surface in section 1. The question behind it is whether the command table of the toolbar proposal could serve as a registry of applet functions for AI, given that something like it already exists, and whether the two should be harmonized. The goal, set the same day, is that PUDL is AI-native, as its applet API is, and that every feature considers its agent side where it has one (specification chapter 1, "Agents"). The design is piloted on two sites before any application that people already depend on moves to it.

This proposal takes in a site's proposal of 17 October, which asks PUDL to adopt the action broker the site built, and it answers that proposal's three questions.

## What exists today

Three mechanisms let something other than a person's pointer use an applet, and they were built separately.

**Requests** are PUDL's. An applet declares in `define()` the verbs it answers, such as `open` for a path, and a caller asks for a verb with `pudlApplets.request(verb, req)` without knowing which applet answers. The answer is always a window, and nothing comes back to the caller.

**Actions** are not PUDL's, although PUDL sites run them. The contract was designed in one application, which has run its agents and flows on it for months: an applet publishes a manifest of actions, each with a reference such as `example.dice/roll@1`, JSON Schema for its input and its output, the capabilities it needs from a closed list, and a replay rule; a broker checks both ends and records every invocation. A site then took the contract into the page as a script of its own, published as `window.pudlActions`, and runs pure actions on its server in a sandboxed JavaScript engine, so its MCP server can offer them to AI agents as `applet_discover`, `applet_invoke`, `applet_status`, `applet_cancel` and `applet_artifact`. The manifest's format is written down in pudl-applet-packages, and its `hello` example calls `pudlActions.provide`. The application's own broker is in Go and offers the same five tools. So the contract is shared by two hosts and a package format, and PUDL, the thing they share, does not define it.

**Commands** are PUDL's: today the rows an applet's `commands()` and `menus()` return, without ids, and in the toolbar proposal a command table with ids, words, glyphs, keys and state, which `pudlCommands.list` and `pudlCommands.run` open to agents in the page.

## How the three relate

They are three views of one idea, at three layers.

- An **action** is the contract an agent calls. It has a stable versioned reference, a schema for what goes in and comes out, declared effects, and a replay rule, and it needs no window: it can run in the page, on a server, or in a sandbox, and a person can be asked a question in the middle of it.
- A **command** is how a person reaches something in a live window: words, a glyph, a key, and its state at this moment, such as whether Bold is on where the cursor is. Some commands present an action (Save, Resolve a Comment), and some only mean anything with a window in front of somebody (Bold, Next Comment), so they have no action and need none.
- A **request** is an action whose work is to bring an applet's window to the reader with something in it. The `play` action of a game applet on that site is already one: it carries `"handles": "play"` and no handler, and the broker answers it with the window.

Harmonizing them means one vocabulary across the three, so that nothing is declared twice and an agent can always find the deepest layer that does what it wants.

## The proposal

### 1. Actions become part of PUDL

Chapter 9 of the specification gains actions, as a contract any host implements: the manifest, references, schemas, capabilities, replay, the result, and invocations. The web implementation gains `dist/pudl-actions.js`, the page broker, taken from the site's with its site-specific names made PUDL's. It stays a separate file, loaded where a page uses actions, since it is about 600 lines with its dialog and its schema validator; that answers the site's second question.

The declaration is the site's, unchanged: `define()` gains `actions`, the address of the manifest, which the runtime stamps with `ver` as it does `src`. That answers the site's first question; the word says what the file is for, and a manifest's role is clear from its contents.

The calling surface keeps the global the site and the package format already use, `pudlActions`, so the `hello` package and the site's manifests work unchanged:

```js
pudlActions.provide('example.dice', { 'roll@1': function (input, ctx) { return { output: { values: [4, 2], total: 6 } }; } });
pudlActions.catalog()                    // the manifests, as callers see them
pudlActions.run(ref, input, opts)        // the output, or an error saying why not
pudlActions.invoke(ref, input, opts)     // the record: running, waiting for a person, done, failed or cancelled
pudlActions.status(id), wait(id), cancel(id), artifact(id), invocations()
```

**Replay** gets the definitions the contract only implies today. A `pure` action has no effect outside its result and may run anywhere, any number of times, including on a server or in a sandbox. A `once` action has effects, such as writing a file or opening a window, and a host never runs it again without being asked; a caller that might retry passes an idempotency key. A `human` action asks a person a question and waits for the answer, which PUDL asks in a dialog.

**Capabilities.** PUDL owns the mechanism: a manifest naming a capability the project has not listed is refused, an action runs only for a caller whose grant covers its capabilities, and a handler is handed only the services it declared. The list belongs to the project, as `handles` verbs do, and PUDL ships a starting list: `artifact.create`, `attention.request`, `notification.post` and `window.open`. The site's `files.read` and `files.write` stay the site's.

**Validation** uses JSON Schema draft 2020-12, with a `$ref` outside its own schema refused. PUDL vendors `@cfworker/json-schema` (MIT), as both existing hosts do, because it checks without compiling schemas to code, which a strict content security policy forbids.

### 2. Requests become actions

Every verb an applet declares in `handles` is published in the catalog as an action of that applet, `<applet>/<verb>@1`, whose input is the request (`path`, `kind`, and the verb's extra parameters) and whose output says whether a window or a tab was opened. A caller that knows the verb still calls `request`; an agent that only reads the catalog finds the same thing as an action. `handles` in `define()` stays as the short way to write such an action.

An action never navigates the page that called it. On a page without windows, where `request` today goes to the applet's page in the same tab, a request made through an action opens the applet's page in a new tab, as the site's broker already does, and `request` gains an option, `{ newTab: true }`, for any caller that wants the same. That answers the site's third question.

### 3. Commands present actions

A command may name the action it presents, with `action: 'example.notes/save@1'`. Its `run` may then be left out, and pressing it runs the action with the input its `input` field gives, a value or a function. `pudlCommands.list` reports each command's action, so an agent in the page can choose the command, with its state now, or the action, with its schema, and an agent with no page uses the action alone.

The commands with no action are the ones that mean something only in a live window, and the specification says so plainly, so a project does not invent actions for Bold or Next Comment to look complete. A host's rule that "every UI operation has an exported equivalent" becomes checkable for the commands that do have one, since the link is data rather than a policy.

### 4. One binding for agents outside the page

The five MCP tools both existing hosts offer, `applet_discover`, `applet_invoke`, `applet_status`, `applet_cancel` and `applet_artifact`, become the specification's recommended binding of the contract to MCP, in a note rather than a requirement, so that an agent that has used one PUDL host's applets can use another's. A host may offer tools of its own beside the five.

### What an agent can do, layer by layer

| Where the agent is | What it uses | What it gets |
|---|---|---|
| In the page, beside a person | `pudlCommands.list` and `run` | Every command, with its state now; runs one as pressing it would |
| In the page or anywhere else | `pudlActions.catalog` and `run`, or the MCP tools | Every action, with its schema, effects and replay; runs one with checked input and output |
| Speaking to the server | The representation's links and forms | Whatever changes what the server holds, by the same form a person submits |

## The pilots

**The site that built the broker goes first.** It already runs everything in section 1, so it is the cheapest proof. The steps are to replace its own broker script with `pudl-actions.js`, delete the `define()` wrapper it marks as a workaround, keep `files.read` and `files.write` as its own capabilities, and change nothing in its manifests, its server runner or its MCP tools. Then it links its terminal's and its chat's commands to their actions and tries the folding toolbar on one applet.

**A second site goes next,** one that starts from nothing. It publishes one action from one of its applets, gives that applet a command table and a folding toolbar, and shows what a newcomer finds hard. What it finds goes into the specification before 1.0.

**The application that designed the contract goes last,** once both pilots have settled the contract, since its Go broker already implements it and its move is mostly mapping: its editor's key table to a command table, its document-type actions to the manifest, and its CLI's verbs to the actions they duplicate.

## Decisions, 20 October 2026

1. **Actions belong to `pudlApplets`.** The calling surface is `pudlApplets.provide`, `catalog`, `describe`, `invoke`, `run`, `status`, `wait`, `cancel`, `artifact` and `invocations`, as the site's own proposal suggested, since an action is something an applet publishes. `window.pudlActions` stays as a deprecated name for the same functions, so the site's code and the `hello` package keep working, and it goes at 1.0; it says so once in the console the first time a page uses it. `pudlCommands` stays its own global, because a page with no applets declares commands too. The examples in section 1 read with `pudlApplets` in place of `pudlActions`.
2. **PUDL ships the schema validator,** inside `pudl-actions.js`, with its MIT notice.
3. **A caller with no grant gets none but `artifact.create`,** and a host may set `pudlApplets.confirm`, which PUDL calls before an action that needs a capability outside the caller's grant, to ask the person.
4. **The five MCP tool names are the specification's recommended binding,** in a note.

## As built, 20 October 2026

Released in PUDL 0.68.0 with specification 0.28.0. Building it added four small things to the design above.

- **`live` on an action.** An action the open applet answers is marked `"live": true` and needs no module: the broker hands the call to the newest handlers the running applet attached. The site wrote a module handler that called `attached()` by hand for each such action; that still works.
- **`pudlApplets.publish(url)`** adds a manifest that belongs to no applet, which a site needs for actions that belong to the page as a whole.
- **`pudlApplets.capability(name, give)`** is how a project adds a capability and the services it hands a handler, which is how the site keeps `files.read` and `files.write`.
- **`grant: "all"`** is how a caller acting for the person says it holds everything; a command a person presses passes it.

The note editor sample (`samples/commands.html`) publishes five actions, one of each kind, and its request verb appears in the catalog as `notes/open-note@1`.
