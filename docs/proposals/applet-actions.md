# Proposal: applet actions in PUDL, and one vocabulary for actions, commands and requests

Status: proposed 2026-10-20, awaiting the maintainer's decisions on the questions at the end. the maintainer asked whether the command table of the toolbar proposal could serve as a registry of applet functions for AI, noted that something like it already exists, and asked whether the two should be harmonized. He set the goal on the same day: PUDL is AI-native, as its applet API is, and every feature considers its agent side where it has one (specification chapter 1, "Agents"). He will pilot this on reader.com and example.com, since an application has become too important to experiment on.

This proposal takes in example.com's `Architecture/pudl-proposal-applet-actions.md` of 17 October, which asks PUDL to adopt the site's action broker, and answers its three questions.

## What exists today

Three mechanisms let something other than a person's pointer use an applet, and they were built separately.

**Requests** are PUDL's. An applet declares in `define()` the verbs it answers, such as `open` for a path, and a caller asks for a verb with `pudlApplets.request(verb, req)` without knowing which applet answers. The answer is always a window, and nothing comes back to the caller.

**Actions** are not PUDL's, although PUDL sites run them. an application designed the contract and has run its agents and flows on it for months: an applet publishes a manifest of actions, each with a reference such as `example.dice/roll@1`, JSON Schema for its input and its output, the capabilities it needs from a closed list, and a replay rule; a broker checks both ends and records every invocation. example.com took the contract into the page as `js/applet-actions.js`, published as `window.pudlActions`, and runs pure actions on its server in a sandboxed JavaScript engine, so its MCP server can offer them to Claude and Codex as `applet_discover`, `applet_invoke`, `applet_status`, `applet_cancel` and `applet_artifact`. The manifest's format is written down in pudl-applet-packages, and its `hello` example calls `pudlActions.provide`. an application's own broker is in Go and offers the same five tools. So the contract is shared by two hosts and a package format, and PUDL, the thing they share, does not define it.

**Commands** are PUDL's: today the rows an applet's `commands()` and `menus()` return, without ids, and in the toolbar proposal a command table with ids, words, glyphs, keys and state, which `pudlCommands.list` and `pudlCommands.run` open to agents in the page.

## How the three relate

They are three views of one idea, at three layers.

- An **action** is the contract an agent calls. It has a stable versioned reference, a schema for what goes in and comes out, declared effects, and a replay rule, and it needs no window: it can run in the page, on a server, or in a sandbox, and a person can be asked a question in the middle of it.
- A **command** is how a person reaches something in a live window: words, a glyph, a key, and its state at this moment, such as whether Bold is on where the cursor is. Some commands present an action (Save, Resolve a Comment), and some only mean anything with a window in front of somebody (Bold, Next Comment), so they have no action and need none.
- A **request** is an action whose work is to bring an applet's window to the reader with something in it. Asteroids' `play` action on example.com is already one: it carries `"handles": "play"` and no handler, and the broker answers it with the window.

Harmonizing them means one vocabulary across the three, so that nothing is declared twice and an agent can always find the deepest layer that does what it wants.

## The proposal

### 1. Actions become part of PUDL

Chapter 9 of the specification gains actions, as a contract any host implements: the manifest, references, schemas, capabilities, replay, the result, and invocations. The web implementation gains `dist/pudl-actions.js`, the page broker, taken from example.com's with its `pc` names made PUDL's. It stays a separate file, loaded where a page uses actions, since it is about 600 lines with its dialog and its schema validator; that answers the site's second question.

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

**Validation** uses JSON Schema draft 2020-12, with a `$ref` outside its own schema refused. PUDL vendors `@cfworker/json-schema` (MIT), as both sites do, because it checks without compiling schemas to code, which a strict content security policy forbids.

### 2. Requests become actions

Every verb an applet declares in `handles` is published in the catalog as an action of that applet, `<applet>/<verb>@1`, whose input is the request (`path`, `kind`, and the verb's extra parameters) and whose output says whether a window or a tab was opened. A caller that knows the verb still calls `request`; an agent that only reads the catalog finds the same thing as an action. `handles` in `define()` stays as the short way to write such an action.

An action never navigates the page that called it. On a page without windows, where `request` today goes to the applet's page in the same tab, a request made through an action opens the applet's page in a new tab, as example.com's broker already does, and `request` gains an option, `{ newTab: true }`, for any caller that wants the same. That answers the site's third question.

### 3. Commands present actions

A command may name the action it presents, with `action: 'example.notes/save@1'`. Its `run` may then be left out, and pressing it runs the action with the input its `input` field gives, a value or a function. `pudlCommands.list` reports each command's action, so an agent in the page can choose the command, with its state now, or the action, with its schema, and an agent with no page uses the action alone.

The commands with no action are the ones that mean something only in a live window, and the specification says so plainly, so a project does not invent actions for Bold or Next Comment to look complete. an application's rule that "every UI operation has an exported equivalent" becomes checkable for the commands that do have one, since the link is data rather than a policy.

### 4. One binding for agents outside the page

The five MCP tools an application and example.com both offer, `applet_discover`, `applet_invoke`, `applet_status`, `applet_cancel` and `applet_artifact`, become the specification's recommended binding of the contract to MCP, in a note rather than a requirement, so that an agent that has used one PUDL host's applets can use another's. a desktop host would offer the same five tools beside its own `open` and `submit`.

### What an agent can do, layer by layer

| Where the agent is | What it uses | What it gets |
|---|---|---|
| In the page, beside a person | `pudlCommands.list` and `run` | Every command, with its state now; runs one as pressing it would |
| In the page or anywhere else | `pudlActions.catalog` and `run`, or the MCP tools | Every action, with its schema, effects and replay; runs one with checked input and output |
| Speaking to the server | The representation's links and forms | Whatever changes what the server holds, by the same form a person submits |

## The pilots

**example.com first.** The site already runs everything in section 1, so it is the cheapest proof. The steps are to replace `js/applet-actions.js` with `pudl-actions.js`, delete the `define()` wrapper that `js/applets.js` marks as a workaround, keep `files.read` and `files.write` as the site's own capabilities, and change nothing in its manifests, its server runner or its MCP tools. Then link the Terminal's and the chat's commands to their actions, and try the folding toolbar on one applet.

**reader.com second,** as a site that starts from nothing: publish one action from one of its applets, give that applet a command table and a folding toolbar, and see what a newcomer finds hard. What it finds goes into the specification before 1.0.

**an application last,** once both pilots have settled the contract, since its Go broker already implements it and its move is mostly mapping: the Editor's key table to a command table, its document-type actions to the manifest, and its CLI's verbs to the actions they duplicate.

## Questions for the maintainer

1. **`pudlActions` as its own global, beside `pudlCommands`,** rather than methods on `pudlApplets` as the site's proposal suggested? I recommend the separate global, since the site and the package format already use it and it keeps `pudl-applets.js` small.
2. **Ship the schema validator in PUDL?** I recommend yes, inside `pudl-actions.js` with its MIT notice, so every PUDL site checks schemas the same way. The alternative leaves each project to bring one.
3. **Who an agent's grant comes from.** Today the site's chat is granted every capability. I recommend that a caller with no grant get none but `artifact.create`, and that a host may set `pudlActions.confirm`, a function PUDL calls before an action needing a capability outside the caller's standing grant, to ask the person; the site's chat would ask once per capability, with "always" remembered. This keeps a person in charge of what an agent does on their behalf without asking about every pure action.
4. **The MCP tool names as a recommended binding in the specification?** I recommend yes, as a non-normative note.
