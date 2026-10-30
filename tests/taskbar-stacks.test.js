const assert = require('assert/strict');
const { launch, ROOT, engine, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = ROOT + '/tests/fixtures/taskbar-stacks.html';
    const roots = ['a1', 'b1', 'a2', 'b2', 'a3', 'spare'];
    async function load(suffix = '') {
      await page.goto(fixture + suffix);
      await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
    }
    const state = () => page.evaluate(() => pudlWindows.state());
    const atlas = dock => page.locator(dock).getByRole('button', { name: /^Atlas,/ });

    await load('?no-stacks');
    assert.deepEqual(await page.locator('#all > [data-win-tab]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-win-tab'))), roots);
    assert.equal(await page.locator('#all').getByRole('button', { name: /^Atlas,/ }).count(), 0);
    console.log('PASS absent opt-in retains individual root links');

    await load();
    assert.equal(await page.evaluate(() => typeof pudlWindows.group), 'function', 'the group query is public');
    const initial = await state();
    assert.deepEqual(initial.taskbarOrder, roots);
    assert.deepEqual(await page.evaluate(() => pudlWindows.group('alpha')), ['a1', 'a2', 'a3']);
    assert.deepEqual(await page.evaluate(() => pudlWindows.group('beta')), ['b1', 'b2'], 'child metadata cannot change root membership');
    assert.equal(await page.evaluate(() => {
      const first = pudlWindows.group('alpha');
      first.length = 0;
      return pudlWindows.group('alpha').length;
    }), 3, 'query arrays are detached');
    assert.deepEqual(await state(), initial, 'queries do not change window state');
    assert.deepEqual(await page.evaluate(() => {
      const detached = document.createElement('nav');
      detached.setAttribute('data-win-dock', '');
      return [undefined, null, detached, document.body, {}, false].map(dock => pudlWindows.group('alpha', dock));
    }), [[], [], [], [], [], []]);
    assert.deepEqual(await page.evaluate(() => [pudlWindows.group('missing'), pudlWindows.group('bad key'), pudlWindows.group('')]), [[], [], []]);
    console.log('PASS logical queries exclude children and reject invalid supplied docks');

    await atlas('#all').waitFor();
    const name = await atlas('#all').getAttribute('aria-label');
    assert.match(name, /3/);
    assert.match(name, /5/);
    assert.match(name, /working/i);
    assert.doesNotMatch(name, /45/, 'descendant attention is not counted');
    assert.equal(await page.locator('#all > [data-win-tab="spare"]').count(), 1);
    assert.deepEqual((await state()).taskbarOrder, roots, 'projection preserves interleaving');
    console.log('PASS stacks combine root status without rewriting canonical order');

    await page.evaluate(() => pudlWindows.dock('a3', 'left'));
    await page.waitForFunction(() => pudlWindows.group('alpha', document.querySelector('#filtered')).length === 2);
    assert.deepEqual(await page.evaluate(() => pudlWindows.group('alpha', document.querySelector('#filtered'))), ['a1', 'a2']);
    assert.deepEqual(await page.evaluate(() => pudlWindows.group('alpha', document.querySelector('#all'))), ['a1', 'a2', 'a3']);
    console.log('PASS mirrored docks query their own represented membership');

    const beforeExpansion = await state();
    const address = page.url();
    await page.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-group-open', 'alpha'));
    await page.locator('#all > [data-win-tab="a1"]').waitFor();
    assert.equal(await atlas('#all').count(), 0);
    assert.deepEqual(await state(), beforeExpansion, 'expansion changes presentation only');
    assert.equal(page.url(), address);
    await page.evaluate(() => document.querySelector('[data-win-layer]').removeAttribute('data-win-group-open'));
    await atlas('#all').waitFor();
    console.log('PASS expanded groups preserve state and address');

    await atlas('#all').focus();
    const historyBeforePopup = await page.evaluate(() => history.length);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active && active.tagName === 'A' && active.closest('[popover]');
    });
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Atlas one/);
    await page.keyboard.press('Escape');
    assert.equal(await atlas('#all').evaluate(element => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => history.length), historyBeforePopup);
    console.log('PASS keyboard popup opening and dismissal restore focus without history');

    async function groupCommand(verb) {
      await atlas('#filtered').click({ button: 'right' });
      await page.getByRole('menuitem', { name: new RegExp(verb + ' these 2 windows', 'i') }).click();
    }
    const omitted = await page.evaluate(() => {
      const current = pudlWindows.state();
      return { min: !!current.min.a3, place: current.place.a3 };
    });
    const beforeMinimize = await page.evaluate(() => history.length);
    await groupCommand('minimi[sz]e');
    let afterCommand = await state();
    assert.equal(afterCommand.min.a1, true);
    assert.equal(afterCommand.min.a2, true);
    assert.equal(!!afterCommand.min.a3, omitted.min);
    assert.deepEqual(afterCommand.place.a3, omitted.place);
    assert.equal(await page.evaluate(() => history.length), beforeMinimize + 1);
    await groupCommand('restore');
    afterCommand = await state();
    assert.equal(!!afterCommand.min.a1, false);
    assert.equal(!!afterCommand.min.a2, false);
    assert.equal(!!afterCommand.min.a3, omitted.min);
    assert.deepEqual(afterCommand.place.a3, omitted.place);
    console.log('PASS filtered minimize and restore preserve omitted root state');

    await page.evaluate(() => {
      document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => {
        document.querySelector('[data-win="a2"]').setAttribute('data-win-group', 'beta');
      }, { once: true });
    });
    await groupCommand('close');
    afterCommand = await state();
    assert.equal(afterCommand.open.includes('a1'), false);
    assert.equal(afterCommand.open.includes('child'), false, 'children follow their closing root');
    assert.equal(afterCommand.open.includes('a2'), true, 'synchronous regrouping excludes a later target');
    assert.equal(afterCommand.open.includes('a3'), true, 'omitted roots survive group close');
    assert.deepEqual(afterCommand.place.a3, omitted.place);
    console.log('PASS close rechecks live membership before each remaining root');

    let failures = 0;
    async function scenario(name, action) {
      try { await load(); await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }
    const popup = () => page.getByRole('dialog', { name: 'Atlas', exact: true });
    async function closeAllAtlas() {
      await atlas('#all').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Close these 3 windows', exact: true }).click();
    }
    await scenario('keyboard stack moves gather interleaved logical members once', async () => {
      const original = await state();
      const history = await page.evaluate(() => window.history.length);
      await atlas('#all').focus();
      await page.keyboard.press('Alt+Shift+ArrowRight');
      assert.deepEqual((await state()).taskbarOrder, ['b1', 'b2', 'a1', 'a2', 'a3', 'spare']);
      assert.equal(await page.evaluate(() => window.history.length), history + 1);
      const moved = await state();
      for (const field of ['open', 'top', 'min', 'place', 'recent']) assert.deepEqual(moved[field], original[field], field);
      await page.goBack();
      await page.waitForFunction(() => pudlWindows.state().taskbarOrder[0] === 'a1');
      assert.deepEqual((await state()).taskbarOrder, roots);
    });
    await scenario('expanded destination moves target one represented key', async () => {
      await page.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-group-open', 'beta'));
      await page.locator('#all > [data-win-tab="b1"]').waitFor();
      await atlas('#all').focus();
      await page.keyboard.press('Alt+Shift+ArrowRight');
      assert.deepEqual((await state()).taskbarOrder, ['b1', 'a1', 'a2', 'a3', 'b2', 'spare']);
    });
    await scenario('internal moves permute group slots and retain the popup', async () => {
      await atlas('#all').click();
      const row = popup().getByRole('link', { name: /^Atlas two/ });
      await row.click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Taskbar order', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Move earlier', exact: true }).click();
      assert.deepEqual((await state()).taskbarOrder, ['a2', 'b1', 'a1', 'b2', 'a3', 'spare']);
      assert.equal(await popup().isVisible(), true);
    });
    await scenario('hover preview preserves editor focus and Escape writes no history', async () => {
      await page.locator('#outside').focus();
      const history = await page.evaluate(() => window.history.length);
      await atlas('#all').hover();
      await popup().waitFor();
      assert.equal(await page.locator('#outside').evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Escape');
      await popup().waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#outside').evaluate(node => node === document.activeElement), true);
      assert.equal(await page.evaluate(() => window.history.length), history);
    });
    await scenario('hover preview pins on click and closes on a second click', async () => {
      await atlas('#all').hover();
      await popup().waitFor();
      await atlas('#all').click();
      await page.locator('#outside').hover();
      // Wait beyond the specified hover transit allowance to distinguish pinned state.
      await page.waitForTimeout(400);
      assert.equal(await popup().isVisible(), true);
      await atlas('#all').click();
      await popup().waitFor({ state: 'hidden' });
    });
    await scenario('live status and title updates preserve the focused row instance', async () => {
      await atlas('#all').focus(); await page.keyboard.press('Enter');
      const row = popup().getByRole('link', { name: /^Atlas two/ });
      await row.focus();
      await row.evaluate(node => { window.savedStackRow = node; });
      await page.evaluate(() => {
        pudlWindows.retitle('a2', 'Renamed window');
        document.querySelector('[data-win="a2"]').setAttribute('data-win-attention', '7');
      });
      await page.waitForFunction(() => document.activeElement.getAttribute('aria-label').includes('Renamed window'));
      assert.equal(await page.evaluate(() => savedStackRow === document.activeElement), true);
      assert.match(await atlas('#all').getAttribute('aria-label'), /9 needing attention/);
      assert.deepEqual(await popup().getByRole('heading').allTextContents(), ['Chats', 'Documents', 'Chats']);
    });
    await scenario('closing a focused row transfers focus to the next member', async () => {
      await atlas('#all').focus(); await page.keyboard.press('Enter');
      await popup().getByRole('button', { name: 'Close Atlas two', exact: true }).focus();
      await page.keyboard.press('Enter');
      assert.equal((await state()).open.includes('a2'), false);
      assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label') || ''), /^Atlas three/);
    });
    await scenario('rekeyed later close targets survive', async () => {
      await page.evaluate(() => document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => pudlWindows.rekey('a2', 'renamed'), { once: true }));
      await closeAllAtlas();
      assert.equal((await state()).open.includes('renamed'), true);
      assert.equal((await state()).open.includes('a3'), false);
    });
    await scenario('removing the originating dock stops later closes', async () => {
      await page.evaluate(() => document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => document.querySelector('#all').remove(), { once: true }));
      await closeAllAtlas();
      const current = await state();
      assert.equal(current.open.includes('a1'), false);
      assert.equal(current.open.includes('a2'), true);
      assert.equal(current.open.includes('a3'), true);
    });
    await scenario('synchronous docking skips a later filtered close target', async () => {
      await page.evaluate(() => {
        pudlWindows.dock('a3', 'left');
        document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => pudlWindows.dock('a2', 'left'), { once: true });
      });
      await groupCommand('close');
      const current = await state();
      assert.equal(current.open.includes('a1'), false);
      assert.equal(current.open.includes('a2'), true);
      assert.equal(current.open.includes('a3'), true);
    });
    await scenario('a different instance under a snapshotted key survives', async () => {
      await page.evaluate(() => {
        document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => {
          pudlWindows.rekey('a2', 'retired');
          pudlWindows.rekey('spare', 'a2');
          const replacement = document.querySelector('[data-win="a2"]');
          replacement.setAttribute('data-win-group', 'alpha');
          replacement.setAttribute('data-win-group-label', 'Atlas');
        }, { once: true });
      });
      await closeAllAtlas();
      const current = await state();
      assert.equal(current.open.includes('a2'), true);
      assert.equal(current.open.includes('retired'), true);
      assert.equal(current.open.includes('a3'), false);
      assert.equal(await page.locator('[data-win="a2"] .win-title').textContent(), 'Independent');
    });
    await scenario('newly regrouped roots are excluded from a close snapshot', async () => {
      await page.evaluate(() => {
        document.querySelector('[data-win="a1"]').addEventListener('pudl:window-closing', () => {
          document.querySelector('[data-win="b1"]').setAttribute('data-win-group', 'alpha');
        }, { once: true });
      });
      await closeAllAtlas();
      const current = await state();
      assert.equal(current.open.includes('b1'), true);
      for (const key of ['a1', 'a2', 'a3']) assert.equal(current.open.includes(key), false);
    });
    await scenario('regrouping an already-started close introduces no implicit veto', async () => {
      await page.evaluate(() => {
        const root = document.querySelector('[data-win="a1"]');
        root.addEventListener('pudl:window-closing', () => root.setAttribute('data-win-group', 'beta'), { once: true });
      });
      await closeAllAtlas();
      assert.equal((await state()).open.includes('a1'), false);
    });
    await scenario('a child veto preserves its family while other roots close', async () => {
      await page.evaluate(() => document.querySelector('[data-win="child"]').addEventListener('pudl:window-closing', event => event.preventDefault()));
      await closeAllAtlas();
      const current = await state();
      for (const key of ['a1', 'child']) assert.equal(current.open.includes(key), true);
      for (const key of ['a2', 'a3']) assert.equal(current.open.includes(key), false);
    });
    await scenario('open stack context menu updates counts without losing focused command', async () => {
      await atlas('#all').click({ button: 'right' });
      const command = page.getByRole('menuitem', { name: 'Minimize these 3 windows', exact: true });
      await command.focus();
      await page.evaluate(() => document.querySelector('[data-win="a3"]').setAttribute('data-win-group', 'beta'));
      const updated = page.getByRole('menuitem', { name: 'Minimize these 2 windows', exact: true });
      await updated.waitFor();
      assert.equal(await updated.evaluate(node => node === document.activeElement), true,
        'focus after count update: ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0,300)));
      await page.keyboard.press('Enter');
      const current = await state();
      assert.equal(current.min.a1, true);
      assert.equal(current.min.a2, true);
      assert.equal(!!current.min.a3, false);
    });
    async function openOverflowAtlas() {
      await page.evaluate(() => {
        pudlWindows.raise('spare');
        const bar = document.querySelector('#all').parentElement;
        bar.style.width = '230px'; bar.style.right = 'auto';
      });
      const more = page.locator('#all').locator('..').getByRole('button', { name: /more/ });
      await more.waitFor();
      await more.click();
      await page.getByRole('menuitem', { name: /^Atlas,/ }).click();
    }
    await scenario('group minimize moves focus away from an active member family', async () => {
      await page.evaluate(() => pudlWindows.raise('child'));
      const history = await page.evaluate(() => window.history.length);
      await atlas('#all').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Minimize these 3 windows', exact: true }).click();
      const current = await state();
      for (const key of ['a1', 'a2', 'a3']) assert.equal(current.min[key], true);
      assert.equal(['a1', 'a2', 'a3', 'child'].includes(current.top), false);
      assert.equal(await page.evaluate(() => window.history.length), history + 1);
    });
    await scenario('group restore selects a visible member when recorded top stays hidden', async () => {
      await page.evaluate(() => { pudlWindows.raise('spare'); pudlWindows.minimizeAll(); });
      await atlas('#all').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Restore these 3 windows', exact: true }).click();
      const current = await state();
      for (const key of ['a1', 'a2', 'a3']) assert.equal(!!current.min[key], false);
      assert.equal(!!current.min.spare, true);
      assert.equal(['a1', 'a2', 'a3', 'child'].includes(current.top), true);
    });
    await scenario('More exposes window commands and retains open submenus through retitling', async () => {
      await openOverflowAtlas();
      const commands = page.getByRole('menuitem', { name: 'Commands for Atlas two', exact: true });
      await commands.click();
      const close = page.getByRole('menuitem', { name: 'Close', exact: true });
      await close.focus();
      await page.evaluate(() => pudlWindows.retitle('a2', 'Revised member'));
      await page.getByRole('menuitem', { name: 'Commands for Revised member', exact: true }).waitFor();
      assert.equal(await close.isVisible(), true);
      assert.equal(await close.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Enter');
      assert.equal((await state()).open.includes('a2'), false);
      assert.equal((await state()).open.includes('a1'), true);
    });
    await scenario('More activation restores a member and uses the current group scope', async () => {
      await page.evaluate(() => pudlWindows.minimize('a2'));
      await openOverflowAtlas();
      await page.getByRole('menuitem', { name: /^Atlas two/ }).click();
      assert.equal(!!(await state()).min.a2, false);
      assert.equal((await state()).top, 'a2');
      assert.equal(await page.getByRole('menu').count(), 0);
    });
    await scenario('emptying a group dismisses its open context menu', async () => {
      await atlas('#all').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Close these 3 windows', exact: true }).focus();
      await page.evaluate(() => {
        for (const key of ['a1', 'a2', 'a3']) document.querySelector('[data-win="' + key + '"]').setAttribute('data-win-group', 'beta');
      });
      await page.getByRole('menuitem', { name: 'Close these 3 windows', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('menu').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.isConnected && document.activeElement !== document.body), true);
    });
    await scenario('removing an open submenu parent dismisses its stale commands', async () => {
      await openOverflowAtlas();
      await page.getByRole('menuitem', { name: 'Commands for Atlas two', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Close', exact: true }).focus();
      await page.evaluate(() => document.querySelector('[data-win="a2"]').setAttribute('data-win-group', 'beta'));
      await page.getByRole('menuitem', { name: 'Commands for Atlas two', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('menuitem', { name: 'Close', exact: true }).count(), 0);
      assert.equal((await state()).open.includes('a2'), true);
      assert.equal(await page.evaluate(() => document.activeElement.isConnected && document.activeElement !== document.body), true);
    });
    await scenario('RTL keyboard stack movement follows physical arrow direction', async () => {
      await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
      await atlas('#all').focus();
      await page.keyboard.press('Alt+Shift+ArrowLeft');
      assert.deepEqual((await state()).taskbarOrder, ['b1', 'b2', 'a1', 'a2', 'a3', 'spare']);
    });
    await scenario('pointer stack dragging commits once without activation', async () => {
      const original = await state();
      const history = await page.evaluate(() => window.history.length);
      const source = await atlas('#all').boundingBox();
      const target = await page.locator('#all').getByRole('button', { name: /^Beacon,/ }).boundingBox();
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width - 2, target.y + target.height / 2, { steps: 8 });
      await page.mouse.up();
      assert.deepEqual((await state()).taskbarOrder, ['b1', 'b2', 'a1', 'a2', 'a3', 'spare']);
      assert.equal((await state()).top, original.top);
      assert.equal(await page.evaluate(() => window.history.length), history + 1);
    });
    await scenario('Escape cancels a pointer stack move without history', async () => {
      const history = await page.evaluate(() => window.history.length);
      const source = await atlas('#all').boundingBox();
      const target = await page.locator('#all').getByRole('button', { name: /^Beacon,/ }).boundingBox();
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width - 2, target.y + target.height / 2, { steps: 8 });
      await page.keyboard.press('Escape'); await page.mouse.up();
      assert.deepEqual((await state()).taskbarOrder, roots);
      assert.equal(await page.evaluate(() => window.history.length), history);
    });
    await scenario('top taskbar popups fit the viewport in both themes and forced colors', async () => {
      await page.setViewportSize({ width: 720, height: 700 });
      await page.evaluate(() => {
        document.querySelector('.filtered-bar').hidden = true;
        const bar = document.querySelector('#all').parentElement;
        bar.setAttribute('data-win-bar-edge', 'top');
        bar.style.top = '0'; bar.style.bottom = 'auto';
        pudlWindows.raise('a1');
      });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
        await atlas('#all').click();
        const bounds = await popup().boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 721 && bounds.y + bounds.height <= 701);
        await page.screenshot({ path: out('taskbar-stacks-top-' + theme + '.png') });
        await page.keyboard.press('Escape');
      }
      await page.emulateMedia({ forcedColors: 'active' });
      await atlas('#all').focus(); await page.keyboard.press('Enter');
      const outline = await popup().getByRole('link').first().evaluate(node => getComputedStyle(node).outlineStyle);
      assert.equal(outline, 'solid');
      await page.screenshot({ path: out('taskbar-stacks-forced.png') });
      await page.emulateMedia({ forcedColors: 'none' });
      await page.setViewportSize({ width: 1500, height: 1000 });
    });
    if (engine !== 'firefox') await scenario('touch can open, activate and directly close stack members', async () => {
      const touch = await browser.newPage({ viewport: { width: 720, height: 900 }, hasTouch: true });
      try {
        await touch.goto(fixture);
        await touch.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
        const trigger = touch.locator('#all').getByRole('button', { name: /^Atlas,/ });
        await trigger.tap();
        const panel = touch.getByRole('dialog', { name: 'Atlas', exact: true });
        await panel.getByRole('link', { name: /^Atlas two/ }).tap();
        assert.equal(await touch.evaluate(() => pudlWindows.state().top), 'a2');
        await trigger.tap();
        await panel.getByRole('button', { name: 'Close Atlas two', exact: true }).tap();
        assert.equal(await touch.evaluate(() => pudlWindows.state().open.includes('a2')), false);
      } finally { await touch.close(); }
    });
    await scenario('localized stack and list templates preserve literal host text', async () => {
      const label = 'Atlas $& $$ {n} {label}';
      const title = 'Member $& $$ {title} {n}';
      await page.evaluate(({ label, title }) => {
        const layer = document.querySelector('[data-win-layer]');
        layer.setAttribute('data-win-text-stack-name', 'Group {label} / {label}: {n}/{n}');
        layer.setAttribute('data-win-text-stack-attention', ', {attention}/{attention} alert');
        layer.setAttribute('data-win-text-state-count-working', '{n} busy');
        layer.setAttribute('data-win-text-stack-list', '{label} / {label}');
        layer.setAttribute('data-win-text-stack-close-window', 'Close {title} / {title}');
        for (const key of ['a1', 'a2', 'a3']) document.querySelector('[data-win="' + key + '"]').setAttribute('data-win-group-label', label);
        pudlWindows.retitle('a2', title);
      }, { label, title });
      const trigger = page.locator('#all').getByRole('button', { name: 'Group ' + label + ' / ' + label + ': 3/3, 5/5 alert, 1 busy', exact: true });
      await trigger.waitFor();
      await trigger.click();
      const panel = page.getByRole('dialog', { name: label + ' / ' + label, exact: true });
      await panel.waitFor();
      assert.equal(await panel.getByRole('button', { name: 'Close ' + title + ' / ' + title, exact: true }).count(), 1);
      await page.keyboard.press('Escape');
      await trigger.focus(); await page.keyboard.press('Alt+Shift+ArrowRight');
      const announcement = await page.locator('[role="status"]').last().textContent();
      assert.ok(announcement.includes(label), 'move announcements preserve host labels literally');
    });
    await scenario('More member-command templates fill repeated titles literally', async () => {
      const title = 'Member $& $$ {title} {n}';
      await page.evaluate(title => {
        document.querySelector('[data-win-layer]').setAttribute('data-win-text-stack-window-commands', 'Commands {title} / {title}');
        pudlWindows.retitle('a2', title);
      }, title);
      await openOverflowAtlas();
      const commands = page.getByRole('menuitem', { name: 'Commands ' + title + ' / ' + title, exact: true });
      await commands.waitFor();
      await commands.click();
      assert.equal(await page.getByRole('menuitem', { name: 'Close', exact: true }).isVisible(), true);
    });
    await scenario('More visible and accessible counts fill repeated placeholders', async () => {
      await page.evaluate(() => {
        const layer = document.querySelector('[data-win-layer]');
        layer.setAttribute('data-win-text-more-stacks', '{entries}/{entries} more ({windows}/{windows} windows)');
        layer.setAttribute('data-win-text-more-stacks-name', 'More entries {entries}/{entries}, windows {windows}/{windows}');
        pudlWindows.raise('spare');
        const bar = document.querySelector('#all').parentElement;
        bar.style.width = '230px'; bar.style.right = 'auto';
      });
      const more = page.locator('#all').locator('..').getByRole('button', { name: /^More entries/ });
      await more.waitFor();
      const visible = (await more.textContent()).match(/^(\d+)\/\1 more \((\d+)\/\2 windows\)$/);
      assert.ok(visible, 'both visible count tokens are substituted everywhere');
      assert.equal(await more.getAttribute('aria-label'), 'More entries ' + visible[1] + '/' + visible[1] + ', windows ' + visible[2] + '/' + visible[2]);
    });
    await scenario('reordering canonical members preserves the same focused stack link', async () => {
      await atlas('#all').focus(); await page.keyboard.press('Enter');
      const link = popup().getByRole('link', { name: /^Atlas two/ });
      await link.focus();
      await link.evaluate(node => { window.focusedMemberBeforeMove = node; });
      const before = await state();
      assert.equal(await page.evaluate(() => pudlWindows.reorderTaskbar('a2', { before: 'a1' })), true);
      assert.deepEqual((await state()).taskbarOrder, ['a2', 'a1', 'b1', 'b2', 'a3', 'spare']);
      assert.equal(await popup().getByRole('link').first().evaluate(node => node === window.focusedMemberBeforeMove), true);
      assert.equal(await page.evaluate(() => document.activeElement === window.focusedMemberBeforeMove), true);
      const after = await state();
      for (const field of ['open', 'top', 'min', 'place', 'recent']) assert.deepEqual(after[field], before[field], field);
    });
    await scenario('owned context menu stable ID reordering preserves focused row identity', async () => {
      await page.evaluate(() => {
        const owner = document.querySelector('#outside');
        window.focusMenuRows = [
          { id: 'first', label: 'First action', run: () => { window.focusMenuChosen = 'first'; } },
          { id: 'second', label: 'Second action', run: () => { window.focusMenuChosen = 'second'; } },
          { id: 'third', label: 'Third action', run: () => { window.focusMenuChosen = 'third'; } }
        ];
        pudlMenu.openAt(200, 100, window.focusMenuRows, { owner, for: owner });
      });
      const action = page.getByRole('menuitem', { name: 'Second action', exact: true });
      await action.focus();
      await action.evaluate(node => { window.focusedActionBeforeMove = node; });
      assert.equal(await page.evaluate(() => {
        const rows = window.focusMenuRows;
        return pudlMenu.updateContext([rows[1], rows[2], rows[0]], document.querySelector('#outside'));
      }), true);
      assert.deepEqual(await page.getByRole('menuitem').allTextContents(), ['Second action', 'Third action', 'First action']);
      assert.equal(await action.evaluate(node => node === window.focusedActionBeforeMove), true);
      assert.equal(await page.evaluate(() => document.activeElement === window.focusedActionBeforeMove), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.focusMenuChosen), 'second');
    });
    assert.equal(failures, 0, 'extended scenarios must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
