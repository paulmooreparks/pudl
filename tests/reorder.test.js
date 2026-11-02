/* 0.97.0: reorderable lists. Grips on movable items only, the keys, the
   pointer, fixed items keeping their places, the event and its cancel,
   the mode switching on and off by attribute, Escape and a Done control,
   focus kept on the moved item's grip, and a right-to-left row. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/reorder.html');
  await p.waitForFunction(() => window.pudlReorder && document.querySelector('#modelled .reorder-grip'));
  const order = id => p.evaluate(id => [...document.getElementById(id).children].map(li => li.getAttribute('data-reorder-id') || li.textContent.trim().split(/\s+/)[0]), id);
  const events = () => p.evaluate(() => { const r = __events.slice(); __events.length = 0; return r; });
  const focusedGrip = () => p.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('reorder-grip') ? (a.closest('li').getAttribute('data-reorder-id') || a.closest('li').textContent.trim().split(/\s+/)[0]) : (a && (a.id || a.tagName)); });
  const live = () => p.evaluate(() => new Promise(r => setTimeout(() => { const l = [...document.querySelectorAll('[role=status][aria-live=polite]')].pop(); r(l ? l.textContent : ''); }, 120)));

  /* Off, then on. */
  check('a list that is off has no grips', await p.evaluate(() => !document.querySelector('#list .reorder-grip') && !document.getElementById('list').hasAttribute('data-reorder-active')));
  await p.evaluate(() => pudlReorder.on(document.getElementById('list')));
  await p.waitForFunction(() => document.querySelectorAll('#list .reorder-grip').length === 3);
  const dressed = await p.evaluate(() => {
    const l = document.getElementById('list'), gs = [...l.querySelectorAll('.reorder-grip')];
    return { active: l.getAttribute('data-reorder-active'), role: l.getAttribute('aria-roledescription'), pinned: !!l.children[0].querySelector('.reorder-grip'),
      labels: gs.map(g => g.getAttribute('aria-label')), slot: gs[0].parentElement.hasAttribute('data-reorder-grip'), desc: !!document.getElementById(gs[0].getAttribute('aria-describedby')),
      item: l.children[1].getAttribute('aria-roledescription'), modes: __modes.slice() };
  });
  check('turning it on gives each movable item a grip named by its visible words, leaving out hidden text and buttons, and the fixed one none', dressed.active === 'y' && !dressed.pinned && JSON.stringify(dressed.labels) === '["Move Sources","Move Chats","Move Files"]', dressed);
  check('a grip goes into the item\'s grip slot, and has a description of its keys', dressed.slot && dressed.desc, dressed);
  check('the list and its items are described as reorderable for a screen reader', dressed.role === 'reorderable list' && dressed.item === 'movable item', dressed);
  check('pudl:reorder-mode says the mode started', dressed.modes.includes('list:true'), dressed.modes);

  /* Keys. */
  await p.focus('#list > li:nth-child(3) .reorder-grip');
  await p.keyboard.press('ArrowUp');
  let ev = await events();
  check('Up moves the item one place and fires pudl:reorder with the new order, an item without an id by its former place', JSON.stringify(await order('list')) === '["pinned","chats","sources","Files"]' && ev.length === 1 && JSON.stringify(ev[0].order) === '["pinned","chats","sources",3]' && ev[0].item === 'Chats', { o: await order('list'), ev });
  check('focus stays on the moved item\'s grip', await focusedGrip() === 'chats');
  check('the move is announced with its new position', /Chats moved to position 2 of 4/.test(await live()), await live());
  await p.keyboard.press('ArrowUp');
  check('a fixed first item is never displaced, and a move that changes nothing fires nothing', JSON.stringify(await order('list')) === '["pinned","chats","sources","Files"]' && (await events()).length === 0);
  await p.keyboard.press('End');
  check('End moves the item to the end', JSON.stringify(await order('list')) === '["pinned","sources","Files","chats"]' && await focusedGrip() === 'chats', await order('list'));
  await p.keyboard.press('Home');
  check('Home moves it to the first movable place, after the fixed item', JSON.stringify(await order('list')) === '["pinned","chats","sources","Files"]', await order('list'));
  await events();

  /* Pointer. */
  const grip = sel => p.locator(sel + ' .reorder-grip').boundingBox();
  const gb = await grip('#list > li:nth-child(2)'), lb = await p.locator('#list').boundingBox();
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2 + (lb.y + lb.height + 10 - gb.y) * i / 8);
  const during = await p.evaluate(() => ({ dragging: !!document.querySelector('#list > .dragging'), listMark: document.getElementById('list').hasAttribute('data-drop-target') }));
  await p.mouse.up();
  ev = await events();
  check('dragging by the grip marks the list as the landing place past the end', during.dragging && during.listMark, during);
  check('letting go moves the item there and fires one event', JSON.stringify(await order('list')) === '["pinned","sources","Files","chats"]' && ev.length === 1, { o: await order('list'), ev });
  check('the drag leaves no marks behind', await p.evaluate(() => !document.querySelector('#list [data-drop-target], #list .dragging, #list[data-drop-target]') && !document.querySelector('#list > li[style]')));

  const gb2 = await grip('#list > li:nth-child(4)');
  await p.mouse.move(gb2.x + gb2.width / 2, gb2.y + gb2.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(gb2.x + gb2.width / 2, gb2.y - 60 * i / 6);
  await p.keyboard.press('Escape');
  await p.mouse.up();
  check('Escape during a drag puts the item back', JSON.stringify(await order('list')) === '["pinned","sources","Files","chats"]' && (await events()).length === 0 && await p.evaluate(() => document.getElementById('list').getAttribute('data-reorder') === 'on'));

  const gb3 = await grip('#list > li:nth-child(3)');
  const pb = await p.locator('#list > li:nth-child(1)').boundingBox();
  await p.mouse.move(gb3.x + gb3.width / 2, gb3.y + gb3.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(gb3.x + gb3.width / 2, gb3.y + (pb.y - 4 - gb3.y) * i / 8);
  await p.mouse.up();
  check('an item dropped above a fixed item lands after it, in the first movable place', JSON.stringify(await order('list')) === '["pinned","Files","sources","chats"]', await order('list'));
  await events();

  /* A host that draws the list itself cancels the move. */
  await p.focus('#modelled > li:nth-child(1) .reorder-grip');
  await p.keyboard.press('ArrowDown');
  ev = await events();
  check('a cancelled pudl:reorder leaves the elements where they were, with the event saying the new order', JSON.stringify(await order('modelled')) === '["a","b","c"]' && ev.length === 1 && JSON.stringify(ev[0].order) === '["b","a","c"]', { o: await order('modelled'), ev });

  /* A row, right to left: Left moves forward. */
  check('a list laid out in a row is read as x', await p.evaluate(() => document.getElementById('row').getAttribute('data-reorder-active')) === 'x');
  await p.focus('#row > li:nth-child(1) .reorder-grip');
  await p.keyboard.press('ArrowLeft');
  check('in a right-to-left row, Left moves the item later', JSON.stringify(await order('row')) === '["two","one","three"]', await order('row'));
  await p.keyboard.press('ArrowRight');
  check('and Right moves it earlier', JSON.stringify(await order('row')) === '["one","two","three"]', await order('row'));
  await events();

  /* Ending the mode. */
  await p.focus('#list > li[data-reorder-id="sources"] .reorder-grip');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !document.querySelector('#list .reorder-grip'));
  const ended = await p.evaluate(() => ({ attr: document.getElementById('list').getAttribute('data-reorder'), active: document.getElementById('list').hasAttribute('data-reorder-active'), focus: document.activeElement.id, role: document.getElementById('list').getAttribute('aria-roledescription'), modes: __modes.slice() }));
  check('Escape on a grip ends the mode, removes the grips and moves focus into its item', ended.attr === 'off' && !ended.active && ended.focus === 'open-sources' && ended.role === null && ended.modes.includes('list:false'), ended);
  await p.evaluate(() => pudlReorder.on(document.getElementById('list')));
  await p.waitForFunction(() => document.querySelectorAll('#list .reorder-grip').length === 3);
  await p.click('#done');
  await p.waitForFunction(() => !document.querySelector('#list .reorder-grip'));
  check('the Done control ends the mode', await p.evaluate(() => document.getElementById('list').getAttribute('data-reorder') === 'off'));
  check('pudlReorder.order gives the order', JSON.stringify(await p.evaluate(() => pudlReorder.order(document.getElementById('list')))) === '["pinned","Files","sources","chats"]'.replace('"Files"', '1'), await p.evaluate(() => pudlReorder.order(document.getElementById('list'))));

  /* A list drawn by script, already on, is taken in. */
  await p.evaluate(() => { const u = document.createElement('ul'); u.id = 'late'; u.setAttribute('data-reorder', 'on'); u.innerHTML = '<li data-reorder-id="x">X</li><li data-reorder-id="y">Y</li>'; document.body.appendChild(u); });
  await p.waitForFunction(() => document.querySelectorAll('#late .reorder-grip').length === 2).then(() => true, () => false).then(ok => check('a list added to the page already on gains its grips', ok));
  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
