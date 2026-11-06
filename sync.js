// Sync across devices (optional, off until you turn it on in Settings > Accounts): loadouts, tags, notes, settings,
// tracked triumphs, Home pins, hidden tabs, saved searches and wish list links. They are kept in your own token service
// (Cloudflare KV), under your Bungie.net account, and only your own sign-in can read or change them.
// Each setting carries the time it was last changed, so the newest change wins on every device.
(() => {
  'use strict';
  const gt = window.gt; if (!gt || !gt.syncGet) return;
  const raw = { get: Storage.prototype.getItem, set: Storage.prototype.setItem, rm: Storage.prototype.removeItem, key: Storage.prototype.key };
  const ls = {
    get: (k) => { try { return raw.get.call(localStorage, k); } catch (e) { return null; } },
    set: (k, v) => { try { raw.set.call(localStorage, k, v); } catch (e) { /* storage full or off */ } },
    rm: (k) => { try { raw.rm.call(localStorage, k); } catch (e) { /* storage off */ } },
  };
  const ns = () => ls.get('gt_acct_ns') || '';
  const ONK = () => 'gt.sync.on' + ns(), METAK = () => 'gt.sync.meta' + ns(), STK = () => 'gt.sync.st' + ns();
  // Local key <-> name in the synced document. Loadouts use one name everywhere (each device numbers its accounts its own way).
  const SHARED = ['gt_tags', 'gt_notes', 'gt_settings', 'gt_tpin', 'gt_savedq', 'gt.home.pins', 'gt.nav.hide', 'gt.tplan'];
  const toRemote = (k) => (k === 'gt_dimlo2' + ns() ? 'loadouts' : SHARED.includes(k) ? k : '');
  const toLocal = (r) => (r === 'loadouts' ? 'gt_dimlo2' + ns() : SHARED.includes(r) ? r : '');
  const meta = () => { try { return JSON.parse(ls.get(METAK())) || {}; } catch (e) { return {}; } };
  const saveMeta = (m) => ls.set(METAK(), JSON.stringify(m));
  const on = () => ls.get(ONK()) === '1';
  const status = () => { try { return JSON.parse(ls.get(STK())) || {}; } catch (e) { return {}; } };
  const setStatus = (o) => { ls.set(STK(), JSON.stringify(o)); window.dispatchEvent(new Event('gtsync')); };
  let pushT = 0, applying = false, busy = null;

  // Every change to a synced setting is noted (with its time) and sent a few seconds later, batched.
  function touched(k) {
    if (applying || !toRemote(k)) return;
    const m = meta(); m[toRemote(k)] = Date.now(); saveMeta(m);
    if (on()) { clearTimeout(pushT); pushT = setTimeout(() => { push().catch(() => {}); }, 8000); }
  }
  Storage.prototype.setItem = function (k, v) { raw.set.call(this, k, v); if (this === localStorage) touched(String(k)); };
  Storage.prototype.removeItem = function (k) { raw.rm.call(this, k); if (this === localStorage) touched(String(k)); };

  const clean = (e) => {
    const m = String((e && e.message) || e || '').replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
    if (/sync_not_configured/.test(m)) return 'Sync is not set up in your token service yet (see SYNC-SETUP.txt).';
    if (/sync_unavailable/.test(m)) return 'This copy of the app has no token service, so it cannot sync.';
    if (/not signed in|session expired|unauthorized/i.test(m)) return 'Sign in to sync.';
    if (/too_big/.test(m)) return 'Too much to sync (over about 800 KB).';
    return m || 'unknown error';
  };
  async function wlUrls() { try { const o = await gt.wlGet(); return ((o && o.lists) || []).map((l) => l.url).filter((u) => typeof u === 'string' && /^https:\/\//.test(u)); } catch (e) { return []; } }

  function localDoc() {
    const m = meta(), data = {};
    ['loadouts', ...SHARED].forEach((r) => { const v = ls.get(toLocal(r)); const t = m[r] || (v != null ? 1 : 0); if (t) data[r] = { v, t }; });
    return data;
  }
  async function push() {
    if (!on()) return;
    clearTimeout(pushT);
    const r = await gt.syncPut({ data: localDoc(), wl: await wlUrls() }).catch((e) => { setStatus({ ...status(), err: clean(e) }); throw e; });
    setStatus({ at: (r && r.at) || Date.now(), err: '' });
  }
  // Pull: the newer side wins for each setting. Returns how many settings changed here.
  async function pull() {
    const doc = await gt.syncGet();
    const rd = (doc && doc.data) || {}, m = meta();
    let changed = 0, needPush = false;
    applying = true;
    try {
      for (const r of new Set(['loadouts', ...SHARED, ...Object.keys(rd)])) {
        const k = toLocal(r); if (!k) continue;
        const rv = rd[r], lv = ls.get(k), lt = m[r] || (lv != null ? 1 : 0);
        if (rv && typeof rv.t === 'number' && rv.t > lt) {
          if (rv.v !== lv) { if (rv.v == null) ls.rm(k); else ls.set(k, String(rv.v)); changed++; }
          m[r] = rv.t;
        } else if (lt && (!rv || rv.t < lt || rv.v !== lv)) needPush = true;
      }
    } finally { applying = false; }
    saveMeta(m);
    // Wish list links from your other devices.
    const have = await wlUrls();
    for (const u of (Array.isArray(doc && doc.wl) ? doc.wl : []).filter((x) => typeof x === 'string' && /^https:\/\//.test(x) && !have.includes(x)).slice(0, 10)) {
      try { await gt.wlSet({ url: u }); changed++; } catch (e) { /* that list is offline right now */ }
    }
    if (!(Array.isArray(doc && doc.wl) ? doc.wl : []).every((u) => have.includes(u)) || have.some((u) => !((doc && doc.wl) || []).includes(u))) needPush = true;
    return { changed, needPush };
  }
  async function now(opts) {
    if (busy) return busy;
    busy = (async () => {
      try {
        const r = await pull();
        if (r.needPush) await push(); else setStatus({ at: Date.now(), err: '' });
        if (r.changed && (opts && opts.reload)) reloadOnce();
        return r;
      } catch (e) { setStatus({ ...status(), err: clean(e) }); throw e; } finally { busy = null; }
    })();
    return busy;
  }
  // Changes that arrived from another device show after one reload (once per start, so it can never loop).
  function reloadOnce() {
    let done = false; try { done = sessionStorage.getItem('gt.sync.rl') === '1'; sessionStorage.setItem('gt.sync.rl', '1'); } catch (e) { done = true; }
    if (!done) location.reload();
  }
  window.__gtsync = {
    on,
    status,
    async set(v) {
      ls.set(ONK(), v ? '1' : '0'); window.dispatchEvent(new Event('gtsync'));
      if (v) { try { const r = await now(); if (r && r.changed) location.reload(); } catch (e) { /* shown in Settings */ } }
    },
    now: () => now({ reload: true }),
  };
  // On start (once signed in), when you come back to the app, and every 10 minutes.
  const auto = () => { if (on() && !document.hidden) now({ reload: true }).catch(() => {}); };
  setTimeout(auto, 2500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (on() && pushT) { push().catch(() => {}); } } else auto(); });
  setInterval(auto, 600000);
})();
