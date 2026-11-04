const { launch, ROOT } = require('./lib');
const assert = require('assert');
(async () => {
  const browser = await launch();
  try {
    const p = await browser.newPage();
    await p.goto(ROOT + '/tests/fixtures/tree-indent.html');
    await p.evaluate(async () => {
      document.body.innerHTML = '<div class="row-list" id="rows"><div class="md-row"><a href="#a" class="md-item">A</a></div><div class="md-row"><a href="#b" class="md-item">B</a></div></div><ul class="tree" data-tree-toggles="buttons" id="t"><li><a href="#c" aria-expanded="true">Parent</a><ul><li><a href="#d">Child</a></li></ul></li></ul>';
      if (!window.pudlMd) await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '/dist/pudl-md.js'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
      pudlTree.enhance(document.getElementById('t'));
      await new Promise(r => setTimeout(r, 0));
    });
    const unchanged = await p.evaluate(async () => {
      const records = []; const observer = new MutationObserver(rs => records.push(...rs));
      observer.observe(document.body, {subtree:true,attributes:true,childList:true});
      pudlTree.enhance(document.getElementById('t'));
      document.querySelector('#rows a').firstChild.data = 'A changed';
      document.querySelector('#rows a').textContent = 'A changed';
      await new Promise(r => setTimeout(r,0)); observer.disconnect();
      return records.filter(r => r.type === 'attributes').map(r=>r.attributeName);
    });
    assert.deepStrictEqual(unchanged, [], 'unchanged semantics produce no attribute writes');
    await p.focus('#t > li > a'); await p.keyboard.press('ArrowDown');
    assert.strictEqual(await p.evaluate(()=>document.activeElement.textContent), 'Child');
    const dynamic = await p.evaluate(() => {
      const tree = document.getElementById('t'), parent = tree.querySelector('a');
      parent.setAttribute('data-tree-label','Renamed'); parent.setAttribute('aria-expanded','false');
      const li=document.createElement('li'); li.innerHTML='<a href="#new">New</a>'; tree.appendChild(li); pudlTree.enhance(tree);
      return { name:parent.querySelector('.tree-toggle').getAttribute('aria-label'), role:li.firstChild.getAttribute('role'), level:li.firstChild.getAttribute('aria-level'), stops:tree.querySelectorAll('a[tabindex="0"]').length };
    });
    assert.deepStrictEqual(dynamic,{name:'Expand Renamed',role:'treeitem',level:'1',stops:1});
    await p.focus('#rows a'); await p.keyboard.press('ArrowDown');
    assert.strictEqual(await p.evaluate(()=>document.activeElement.textContent), 'B');
    console.log('PASS unchanged writes, tree navigation, dynamic insertion and toggle labels, row navigation');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
