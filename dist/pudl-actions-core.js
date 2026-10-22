/* The rules of applet actions (PUDL specification chapter 9, "Actions"),
   shared by every host that runs them: the page's broker,
   pudl-actions.js, and any server or sandbox that runs pure actions, such
   as a JavaScript engine behind an MCP server. It touches nothing of its
   host's: no window, document, fetch or TextEncoder. What it needs from
   one is passed in: the JSON Schema library (@cfworker/json-schema, in
   vendor/), the list of capabilities the project offers, and for
   artifacts a describe(data) that measures and hashes them.

   It defines globalThis.pudlActionsCore:
     CAPABILITIES                   PUDL's starting list
     MAX_JSON
     compile(lib, schema, where)    a validator, or throws
     check(validator, value, what)  throws with the first specific error
     asJSON(value, what)            the value, round-tripped as JSON
     checkManifest(lib, m, ids, declares, capabilities)
                                    the manifest's actions as entries
                                    { action, local, provider, input, output },
                                    or throws; declares(verb) says whether
                                    the applet has that handles verb
     publicAction(a), publicManifest(m)   what callers see
     accept(rec, entry, result, describe) the output a handler's result
                                    becomes, with its artifacts recorded on rec
     checkRequest(q)                a person's question, checked */
(function (global) {
  'use strict';

  var CAPABILITIES = ['artifact.create', 'attention.request', 'notification.post', 'window.open'];
  var REPLAYS = ['pure', 'human', 'once'];
  var PROVIDER_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
  var ACTION_ID = /^[a-z][a-z0-9-]*@[1-9][0-9]*$/;
  var OUTPUT_KEY = /^[A-Za-z][A-Za-z0-9_]*$/;
  var FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
  var SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  var MAX_JSON = 1 << 20, MAX_ARTIFACT = 4 << 20, MAX_ARTIFACTS = 32;

  /* === Schemas ============================================================ */

  /* Every $ref stays inside its schema; nothing is fetched. */
  function closed(schema, where) {
    if (Array.isArray(schema)) { schema.forEach(function (s) { closed(s, where); }); return; }
    if (!schema || typeof schema !== 'object') return;
    Object.keys(schema).forEach(function (k) {
      var v = schema[k];
      if ((k === '$ref' || k === '$dynamicRef' || k === '$recursiveRef') && (typeof v !== 'string' || v.charAt(0) !== '#')) {
        throw new Error(where + ' refers outside itself (' + k + ': ' + v + ')');
      }
      if (k !== 'enum' && k !== 'const' && k !== 'default' && k !== 'examples') closed(v, where);
    });
  }

  function compile(lib, schema, where) {
    if (schema === undefined) schema = true;
    if (schema === true || schema === false) return new lib.Validator(schema, '2020-12', false);
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error(where + ' is not a schema');
    closed(schema, where);
    var v = new lib.Validator(schema, '2020-12', false);
    /* A reference that does not resolve throws on first use, so it is used
       once here, where a broken manifest is found. */
    try { v.validate(null); } catch (err) { throw new Error(where + ': ' + err.message); }
    return v;
  }

  var WRAPPERS = ['properties', 'patternProperties', 'items', 'prefixItems', 'allOf', '$ref', '$dynamicRef', 'false', 'if', 'then', 'else', 'dependentSchemas', 'unevaluatedProperties', 'unevaluatedItems', 'contains'];
  function located(at) {
    var p = String(at || '#').replace(/^#\/?/, '');
    return p ? p.split('/').map(function (s) { return s.replace(/~1/g, '/').replace(/~0/g, '~'); }).join('.') : '';
  }
  function check(validator, value, what) {
    var r = validator.validate(value);
    if (r.valid) return;
    var errs = r.errors || [];
    var e = errs.filter(function (x) { return WRAPPERS.indexOf(x.keyword) < 0; })[0] || errs[0] || { error: 'it does not match its schema' };
    var at = located(e.instanceLocation);
    throw new Error('invalid ' + what + (at ? ' at ' + at : '') + ': ' + String(e.error).replace(/\.$/, ''));
  }

  /* JSON, round-tripped, so nothing but JSON reaches a handler or a caller. */
  function asJSON(value, what) {
    var text;
    try { text = JSON.stringify(value); } catch (err) { throw new Error(what + ' is not JSON: ' + err.message); }
    if (text === undefined) throw new Error(what + ' is not JSON');
    if (text.length > MAX_JSON) throw new Error(what + ' is larger than 1 MB');
    return JSON.parse(text);
  }

  /* === Manifests ========================================================== */

  function checkManifest(lib, m, ids, declares, capabilities) {
    var caps = capabilities || CAPABILITIES;
    if (!m || typeof m !== 'object') throw new Error('the manifest is not an object');
    if (!PROVIDER_ID.test(m.id || '') || ids[m.id]) throw new Error('invalid or duplicate provider id');
    if (m.apiVersion !== 1) throw new Error('apiVersion must be 1');
    if (!SEMVER.test(m.version || '')) throw new Error('version is not a semantic version');
    if (typeof m.title !== 'string' || !m.title) throw new Error('the manifest has no title');
    if (!Array.isArray(m.actions) || !m.actions.length) throw new Error('the manifest has no actions');
    if (m.module != null && typeof m.module !== 'string') throw new Error('module must be a path');
    var seen = {};
    return m.actions.map(function (a) {
      var local = a && typeof a.ref === 'string' && a.ref.indexOf(m.id + '/') === 0 ? a.ref.slice(m.id.length + 1) : null;
      if (!local || !ACTION_ID.test(local) || seen[a.ref]) throw new Error('invalid or duplicate action ' + (a && a.ref));
      seen[a.ref] = true;
      if (typeof a.title !== 'string' || !a.title || typeof a.description !== 'string' || !a.description) throw new Error(a.ref + ' needs a title and a description');
      if (REPLAYS.indexOf(a.replay) < 0) throw new Error(a.ref + ' has no valid replay policy');
      if (!Array.isArray(a.capabilities)) throw new Error(a.ref + ' lists no capabilities');
      a.capabilities.forEach(function (c) { if (caps.indexOf(c) < 0) throw new Error(a.ref + ' asks for an unsupported capability, ' + c); });
      if (a.inputSchema && a.inputSchema.type !== 'object') throw new Error(a.ref + ': an action\'s input is an object');
      var input = compile(lib, a.inputSchema, a.ref + ' input schema');
      var output = compile(lib, a.outputSchema, a.ref + ' output schema');
      if (a.handles != null) {
        if (!declares(a.handles)) throw new Error(a.ref + ' handles ' + a.handles + ', which the applet does not declare');
        if (a.capabilities.indexOf('window.open') < 0) throw new Error(a.ref + ' opens a window without window.open');
      } else if (!m.module && !a.live) {
        throw new Error(a.ref + ' has no module to run it');
      }
      return { action: a, local: local, provider: m, input: input, output: output };
    });
  }

  var PUBLIC_ACTION = ['ref', 'title', 'description', 'inputSchema', 'outputSchema', 'capabilities', 'replay'];
  function publicAction(a) {
    var out = {};
    PUBLIC_ACTION.forEach(function (k) { if (a[k] !== undefined) out[k] = a[k]; });
    return JSON.parse(JSON.stringify(out));
  }
  function publicManifest(m) {
    return { id: m.id, version: m.version, title: m.title, description: m.description || '', apiVersion: 1, actions: m.actions.map(publicAction) };
  }

  /* === Results ============================================================ */

  /* The handler's result, as the output the schema sees: artifacts become
     descriptors under their keys, and a question leaves response empty
     until it is answered. describe(data) resolves to { size, sha256, keep }:
     the data's length in bytes, its SHA-256 in hex or null where the host
     cannot hash, and what the host keeps of it. */
  async function accept(rec, e, result, describe) {
    if (!result || typeof result !== 'object') throw new Error('the action gave no result');
    var output = asJSON(result.output == null ? {} : result.output, 'the action\'s output');
    if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('the action\'s output must be an object');
    var caps = e.action.capabilities, arts = result.artifacts || [];
    if (arts.length && caps.indexOf('artifact.create') < 0) throw new Error('the action made artifacts it did not declare');
    if (arts.length > MAX_ARTIFACTS) throw new Error('the action made too many artifacts');
    for (var i = 0; i < arts.length; i++) {
      var a = arts[i];
      if (!a || !OUTPUT_KEY.test(a.key || '') || Object.prototype.hasOwnProperty.call(output, a.key)) throw new Error('the action made an artifact with an invalid key');
      if (a.data == null) throw new Error('artifact ' + a.key + ' has no data');
      var m = await describe(a.data);
      if (!m) throw new Error('artifact ' + a.key + ' has no data');
      if (m.size > MAX_ARTIFACT) throw new Error('artifact ' + a.key + ' is larger than 4 MB');
      var d = { id: rec.id + '.' + a.key, invocationId: rec.id, name: String(a.name || a.key), mime: String(a.mime || 'application/octet-stream'), size: m.size };
      if (m.sha256) d.sha256 = m.sha256;
      rec.artifacts.push({ descriptor: d, data: m.keep });
      output[a.key] = d;
    }
    if (result.request) {
      if (caps.indexOf('attention.request') < 0 || e.action.replay !== 'human') throw new Error('the action asked a question it did not declare');
      if (Object.prototype.hasOwnProperty.call(output, 'response')) throw new Error('an action cannot answer its own question');
      output.response = null;
    }
    return output;
  }

  function checkRequest(q) {
    q = asJSON(q, 'the question');
    if (!q || typeof q.title !== 'string' || !q.title) throw new Error('the question has no title');
    (q.fields || []).forEach(function (f) {
      if (!f || !FIELD_NAME.test(f.name || '') || ['text', 'boolean', 'choice'].indexOf(f.type) < 0) throw new Error('the question has an invalid field');
      if (f.type === 'choice' && !(Array.isArray(f.choices) && f.choices.length)) throw new Error('field ' + f.name + ' has no choices');
    });
    return { title: q.title, body: String(q.body || ''), fields: q.fields || [] };
  }

  global.pudlActionsCore = Object.freeze({
    CAPABILITIES: CAPABILITIES.slice(), MAX_JSON: MAX_JSON,
    compile: compile, check: check, asJSON: asJSON,
    checkManifest: checkManifest, publicAction: publicAction, publicManifest: publicManifest,
    accept: accept, checkRequest: checkRequest
  });
})(typeof window !== 'undefined' ? window : globalThis);
