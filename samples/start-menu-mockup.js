/* Interaction study; this creates no public PUDL API or persisted usage data. */
(() => {
  const panel = document.getElementById('launcher');
  const start = document.getElementById('start');
  const input = document.getElementById('app-search');
  const rows = [...panel.querySelectorAll('[data-application]')];
  const categories = [...panel.querySelectorAll('[data-category-link]')];
  const title = document.getElementById('list-title');
  const clear = document.getElementById('clear-search');
  let category = 'all';
  function matches(row, query) {
    const text = row.textContent + ' ' + row.dataset.keywords;
    return query.split(/\s+/).every(word => text.toLocaleLowerCase().includes(word));
  }
  function inCategory(row, key) {
    return key === 'all' || (key === 'pinned' ? row.dataset.pinned === 'true' : row.dataset.category === key);
  }
  function draw(updateAddress = true, push = false) {
    const query = input.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const row of rows) {
      const hidden = !(matches(row, query) && inCategory(row, category));
      if (row.hidden !== hidden) row.hidden = hidden;
      if (!hidden) count++;
    }
    for (const link of categories) {
      if (link.dataset.categoryLink === category) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      const count = rows.filter(row => matches(row, query) && inCategory(row, link.dataset.categoryLink)).length;
      link.querySelector('.category-count').textContent = count;
    }
    const label = categories.find(a => a.dataset.categoryLink === category).querySelector('span:not(.glyph)').textContent;
    title.textContent = query ? (category === 'all' ? 'Search results' : label + ' matches') : label;
    const summary = count + (count === 1 ? ' application' : ' applications');
    document.getElementById('result-count').textContent = summary;
    document.getElementById('announcement').textContent = summary + (query ? ' found' : ' in ' + label);
    document.getElementById('no-results').hidden = count !== 0;
    document.getElementById('empty-message').textContent = 'No applications' + (category !== 'all' ? ' in ' + label : '') + ' match “' + input.value.trim() + '”.';
    clear.hidden = !input.value;
    if (updateAddress) {
      const url = new URL(location.href);
      if (category === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', category);
      if (input.value) url.searchParams.set('q', input.value); else url.searchParams.delete('q');
      history[push ? 'pushState' : 'replaceState'](null, '', url);
    }
  }
  function restore() {
    const params = new URL(location.href).searchParams;
    category = categories.some(a => a.dataset.categoryLink === params.get('category')) ? params.get('category') : 'all';
    input.value = params.get('q') || '';
    draw(false);
  }
  function reset() { input.value = ''; category = 'all'; draw(); input.focus(); }
  input.addEventListener('input', () => { category = 'all'; draw(); });
  clear.addEventListener('click', reset);
  document.getElementById('reset').addEventListener('click', reset);
  categories.forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); category = link.dataset.categoryLink; draw(true, true);
    panel.querySelector('.application-list').scrollTop = 0;
  }));
  const visibleLinks = () => rows.filter(row => !row.hidden).map(row => row.querySelector('a'));
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && visibleLinks().length) { event.preventDefault(); visibleLinks()[0].focus(); }
  });
  panel.querySelector('.application-list').addEventListener('keydown', event => {
    const list = visibleLinks(), at = list.indexOf(event.target);
    if (at < 0 || event.ctrlKey || event.altKey || event.metaKey) return;
    let next;
    if (event.key === 'ArrowDown') next = Math.min(at + 1, list.length - 1);
    else if (event.key === 'ArrowUp') next = at - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else return;
    event.preventDefault(); if (next < 0) input.focus(); else list[next].focus();
  });
  panel.querySelector('.category-nav').addEventListener('keydown', event => {
    const at = categories.indexOf(event.target);
    if (at < 0 || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); categories[Math.max(0, Math.min(categories.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  document.querySelector('.search-form').addEventListener('submit', event => {
    event.preventDefault(); const first = visibleLinks()[0]; if (first) first.click();
  });
  panel.addEventListener('toggle', event => {
    start.setAttribute('aria-expanded', String(event.newState === 'open'));
    if (event.newState === 'open') input.focus({preventScroll:true});
  });
  function close() { panel.hidePopover(); start.focus({preventScroll:true}); }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.matches(':popover-open')) { event.preventDefault(); close(); }
  });
  panel.querySelector('[popovertargetaction="hide"]').addEventListener('click', event => {
    event.preventDefault(); close();
  });
  document.getElementById('theme').addEventListener('click', event => {
    const light = document.documentElement.getAttribute('data-theme') !== 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    event.currentTarget.textContent = light ? 'Dark theme' : 'Light theme';
  });
  window.addEventListener('popstate', restore);
  restore();
  if (panel.showPopover) { start.focus(); panel.showPopover(); }
})();
