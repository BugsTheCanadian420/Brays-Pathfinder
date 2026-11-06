/* Pathfinder website on a phone: an iOS-style tab bar at the bottom (Home, Inventory, Loadouts, Activity, More)
   and a "More" sheet with every other page. The pages themselves are the same ones the desktop app shows. */
(function () {
  'use strict';
  const nav = document.getElementById('nav'); if (!nav) return;
  const I = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    vault: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="12" cy="12" r="3.2"/><path d="M12 8.8V7M12 17v-1.8M8.8 12H7M17 12h-1.8"/>',
    loadouts: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6"/>',
    activity: '<path d="M4 18V9M9.5 18V5M15 18v-6M20.5 18v-9"/>',
    more: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  const TABS = [['home', 'Home'], ['vault', 'Inventory'], ['loadouts', 'Loadouts'], ['activity', 'Activity']];
  const bar = document.createElement('div'); bar.id = 'gtw-tabs'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Pages');
  bar.innerHTML = TABS.map(([id, n]) => `<button type="button" data-wt="${id}">${svg(id)}<span>${n}</span></button>`).join('') + `<button type="button" data-wt="more">${svg('more')}<span>More</span></button>`;
  document.body.appendChild(bar);
  const sheet = document.createElement('div'); sheet.id = 'gtw-more'; sheet.innerHTML = '<div class="bk"></div><div class="sh" role="menu"><i class="grab"></i><div class="ls"></div></div>';
  document.body.appendChild(sheet);
  const pageBtn = (id) => nav.querySelector('button[data-t="' + id + '"]');
  const go = (id) => { const b = pageBtn(id); if (b) b.click(); window.scrollTo(0, 0); };
  const label = (b) => (b.dataset.t === 'settings' ? 'Settings' : (b.textContent || '').trim());
  function openMore() {
    const main = new Set(TABS.map((t) => t[0]));
    const cur = nav.querySelector('button.on[data-t]'), curId = cur && cur.dataset.t;
    const items = [...nav.querySelectorAll('button[data-t]')].filter((b) => !main.has(b.dataset.t));
    sheet.querySelector('.ls').innerHTML = items.map((b) => `<button type="button" role="menuitem" data-wg="${b.dataset.t}" class="${b.dataset.t === curId ? 'on' : ''}"><b>${label(b).replace(/[<>&]/g, '')}</b>${b.title && b.dataset.t !== 'settings' ? `<small>${b.title.replace(/[<>&"]/g, '')}</small>` : ''}</button>`).join('');
    sheet.classList.add('open');
  }
  const closeMore = () => sheet.classList.remove('open');
  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-wt]'); if (!b) return; if (b.dataset.wt === 'more') { if (sheet.classList.contains('open')) closeMore(); else openMore(); return; } closeMore(); go(b.dataset.wt); });
  sheet.addEventListener('click', (e) => { const b = e.target.closest('[data-wg]'); if (b) { closeMore(); go(b.dataset.wg); return; } if (e.target.closest('.bk')) closeMore(); });
  function sync() {
    const cur = nav.querySelector('button.on[data-t]'), id = cur ? cur.dataset.t : '';
    const inMain = TABS.some((t) => t[0] === id);
    bar.querySelectorAll('[data-wt]').forEach((b) => b.classList.toggle('on', b.dataset.wt === id || (b.dataset.wt === 'more' && !!id && !inMain)));
  }
  new MutationObserver(sync).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  sync();
})();
