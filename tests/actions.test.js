/* Applet actions (0.68.0, specification 0.28.0 chapter 9): the note
   sample's manifest and its request verb in the catalog, schemas checked
   at both ends, a module's pure action, the open editor's live actions,
   the grant and the confirm hook, a question for the reader, an
   idempotent second call, a command that names its action, and the
   deprecated pudlActions name. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await p.goto(ROOT + '/samples/commands.html');
  await p.waitForSelector('.applet-toolbars .toolbar [data-command="bold"] .glyph');

  const r = await p.evaluate(async () => {
    const out = {};
    const cat = await pudlApplets.catalog();
    out.refs = cat.flatMap(m => m.actions.map(a => a.ref));
    out.problems = await pudlApplets.problems();
    out.request = cat.find(m => m.id === 'notes').actions[0];
    out.stats = await pudlApplets.run('sample.notes/stats@1', { text: '# One\ntwo three' });
    try { await pudlApplets.run('sample.notes/stats@1', { text: 7 }); } catch (e) { out.badInput = e.message; }
    try { await pudlApplets.run('sample.notes/stats@1', { text: 'a', extra: 1 }); } catch (e) { out.extraInput = e.message; }
    out.read = await pudlApplets.run('sample.notes/read@1', {});
    out.resolved = await pudlApplets.run('sample.notes/resolve-comment@1', { line: 2 });
    out.again = await pudlApplets.run('sample.notes/resolve-comment@1', { line: 2 });
    try { await pudlApplets.run('there.is/none@1', {}); } catch (e) { out.missing = e.message; }
    /* With no confirm hook, an agent without a grant is refused. */
    const hook = pudlApplets.confirm;
    pudlApplets.confirm = undefined;
    try { await pudlApplets.run('sample.notes/save@1', {}, { owner: { kind: 'agent' } }); } catch (e) { out.refused = e.message; }
    out.granted = await pudlApplets.run('sample.notes/save@1', {}, { grant: ['notification.post'] });
    pudlApplets.confirm = hook;
    /* The same identity twice is one call. */
    const a = await pudlApplets.invoke('sample.notes/stats@1', { text: 'x y' }, { id: 'same-call' });
    const b = await pudlApplets.invoke('sample.notes/stats@1', { text: 'x y' }, { id: 'same-call' });
    out.idempotent = a.id === b.id && pudlApplets.invocations().filter(v => v.id === 'same-call').length === 1;
    try { await pudlApplets.invoke('sample.notes/stats@1', { text: 'z' }, { id: 'same-call' }); } catch (e) { out.otherCall = e.message; }
    out.oldName = (await pudlActions.run('sample.notes/stats@1', { text: 'a b c' })).words;
    return out;
  });
  check('the catalog holds the manifest\'s actions and the request verb', ['sample.notes/stats@1', 'sample.notes/read@1', 'sample.notes/save@1', 'sample.notes/resolve-comment@1', 'sample.notes/ask-title@1', 'notes/open-note@1'].every(x => r.refs.includes(x)) && !r.problems.length, JSON.stringify(r.refs));
  check('the request verb is an action that needs window.open and runs once', r.request.ref === 'notes/open-note@1' && r.request.capabilities.join() === 'window.open' && r.request.replay === 'once', JSON.stringify(r.request));
  check('a module\'s pure action answers', JSON.stringify(r.stats) === '{"words":3,"lines":2,"headings":1}', JSON.stringify(r.stats));
  check('input of the wrong type is refused, saying where', /invalid input to sample\.notes\/stats@1 at text/.test(r.badInput || ''), r.badInput);
  check('input the schema does not allow is refused', /invalid input/.test(r.extraInput || ''), r.extraInput);
  check('the open editor answers a live action', typeof r.read.text === 'string' && r.read.comments.length === 2, JSON.stringify(r.read).slice(0, 120));
  check('a live action changes the open note, once', r.resolved.resolved === true && r.again.resolved === false, JSON.stringify([r.resolved, r.again]));
  check('a missing action is named', r.missing === 'there is no action there.is/none@1', r.missing);
  check('an agent with no grant is refused a capability, saying which', /needs notification\.post, which this caller was not granted/.test(r.refused || ''), r.refused);
  check('a caller granted the capability may run it', r.granted && typeof r.granted.saved === 'boolean', JSON.stringify(r.granted));
  check('a second call with the same identity is the first', r.idempotent && /was a different call/.test(r.otherCall || ''), r.otherCall);
  check('the deprecated name still works, and says so once', r.oldName === 3 && warnings.filter(w => /pudlActions is deprecated/.test(w)).length === 1, JSON.stringify(warnings));

  /* The confirm hook asks the reader, and Don't Allow refuses. */
  await p.click('textarea');
  await p.keyboard.type(' more');
  const denied = p.evaluate(() => pudlApplets.run('sample.notes/save@1', {}, { owner: { kind: 'agent', id: 'a test' } }).then(() => 'ran', e => e.message));
  await p.waitForSelector('#confirm-dialog[open]');
  const asked = await p.textContent('#confirm-body');
  await p.click('#confirm-dialog button[value="no"]');
  check('the confirm hook asks the reader, naming who and what', /a test wants to run Save the Open Note/.test(asked) && /notification\.post/.test(asked), asked);
  check('not allowing it refuses the call', /which was not allowed/.test(await denied));

  /* A human action asks in a PUDL dialog. */
  const named = p.evaluate(() => pudlApplets.run('sample.notes/ask-title@1', { suggestion: 'Groceries' }, { grant: ['attention.request'] }));
  await p.waitForSelector('dialog.applet-ask[open]');
  await p.fill('dialog.applet-ask textarea', 'Groceries');
  await p.click('dialog.applet-ask button[type="submit"]');
  const answer = await named;
  check('a human action asks the reader and gives the answer', answer.response && answer.response.title === 'Groceries', JSON.stringify(answer));

  /* A command naming an action: Word Count runs it and says the result. */
  await p.evaluate(() => pudlCommands.run('word-count', undefined, document.querySelector('[data-applet="notes"]')));
  await p.waitForTimeout(150);
  const status = await p.textContent('.notes-status');
  check('a command that calls its action shows the result', /\d+ words, \d+ lines, \d+ headings?\./.test(status), status);
  const listed = await p.evaluate(() => pudlCommands.list(document.querySelector('[data-applet="notes"]')).find(c => c.id === 'save').action);
  check('a command lists the action it presents', listed === 'sample.notes/save@1', listed);
  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
