// Notes: a Notes tab (several pages) and a pop-out notepad you can toggle from any tab (Ctrl+Shift+N).
// Both show the same notes. Lists use "- [ ] item" lines that turn into clickable checkboxes. Everything is saved on this computer only.
// Founder notes: founder and owner accounts also get a shield button next to Notes. It opens the same notepad, but its pages are
// kept by the Pathfinder service and shared by every founder and the owner (see the end of this file).
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec) return;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'n' + Math.random().toString(36).slice(2, 9);
  const LI = /^(\s*)[-*]\s\[( |x|X)\]\s?(.*)$/;
  const MAXB = 200000, MAXP = 60;

  // ---- a book of pages: the notes on this computer, or founder notes ----
  const norm = (D, first) => {
    if (!D || !Array.isArray(D.pages)) D = { pages: [], cur: '' };
    D.pages = D.pages.filter((p) => p && typeof p.id === 'string' && typeof p.b === 'string').slice(0, MAXP).map((p) => ({ id: p.id.slice(0, 20), t: String(p.t || 'Untitled').slice(0, 60), b: p.b.slice(0, MAXB), at: +p.at || Date.now() }));
    if (!D.pages.length) D.pages.push({ id: uid(), t: first, b: '', at: Date.now() });
    if (!D.pages.some((p) => p.id === D.cur)) D.cur = D.pages[0].id;
    return D;
  };
  // persist(B, now) keeps the pages; foot() is the end of the line under the editor.
  function book(D0, first, persist, foot) {
    const B = { D: norm(D0, first), first, insts: [], foot };
    B.cur = () => B.D.pages.find((p) => p.id === B.D.cur) || B.D.pages[0];
    B.save = () => persist(B, false); B.flush = () => persist(B, true);
    B.sync = (from, remote) => B.insts.forEach((i) => { if (i !== from) i.pull(remote); });
    B.stat = () => B.insts.forEach((i) => i.stat());
    return B;
  }
  let saveT = 0;
  const LB = book(lsGet('gt.notes', null), 'My notes', (B, now) => { clearTimeout(saveT); if (now) lsSet('gt.notes', B.D); else saveT = setTimeout(() => lsSet('gt.notes', B.D), 250); }, () => 'saved on this computer');
  window.addEventListener('beforeunload', () => LB.flush());

  // ---- one editor, used by the tab and by the pop-out ----
  function mk(root, side, key, B) {
    let mode = lsGet('gt.notes.mode.' + key, 'edit'), delT = 0;
    root.innerHTML = `<div class="nt-wrap${side ? ' side' : ''}">${side ? '<div class="nt-pages"></div>' : ''}<div class="nt-main"><div class="nt-top">${side ? '' : '<select class="nt-sel" aria-label="Page"></select>'}<input class="nt-title" maxlength="60" aria-label="Page title" placeholder="Page title"><button data-n="new" title="New page">+ Page</button><button data-n="del" title="Delete this page">Delete</button></div><div class="nt-bar"><button data-n="item" title="Start a checklist item on this line">&#9744; Add item</button><button data-n="clean" title="Remove ticked items">Clear done</button><span class="sp"></span><button data-n="mode"></button><button data-n="copy" title="Copy this page">Copy</button></div><textarea class="nta" spellcheck="false" placeholder="Type here. Start a line with - [ ] to make a checklist item."></textarea><div class="ntv" hidden></div><div class="nt-foot"></div></div></div>`;
    const q = (s) => root.querySelector(s), ta = q('.nta'), view = q('.ntv'), title = q('.nt-title'), foot = q('.nt-foot'), sel = q('.nt-sel'), pages = q('.nt-pages');
    const api = {};
    const lines = () => B.cur().b.split('\n');
    const touch = () => { B.cur().at = Date.now(); B.save(); B.sync(api); stat(); };
    const stat = () => { const b = B.cur().b, w = (b.match(/\S+/g) || []).length, tot = lines().filter((l) => LI.test(l)).length, done = lines().filter((l) => /^\s*[-*]\s\[[xX]\]/.test(l)).length; foot.textContent = `${w} words${tot ? ` · ${done}/${tot} items done` : ''} · ${B.foot()}`; };
    function drawView() {
      view.textContent = '';
      lines().forEach((l, i) => {
        const m = LI.exec(l), d = document.createElement(m ? 'label' : 'div');
        if (m) {
          d.className = 'ntl li' + (m[2] !== ' ' ? ' done' : ''); d.style.paddingLeft = Math.min(m[1].length, 8) * 8 + 'px';
          const c = document.createElement('input'); c.type = 'checkbox'; c.checked = m[2] !== ' '; c.dataset.i = i; d.appendChild(c);
          const s = document.createElement('span'); s.textContent = m[3]; d.appendChild(s);
        } else { d.className = 'ntl'; d.textContent = l || ' '; }
        view.appendChild(d);
      });
    }
    function draw() {
      const p = B.cur();
      if (document.activeElement !== title) title.value = p.t;
      if (document.activeElement !== ta && ta.value !== p.b) ta.value = p.b;
      ta.hidden = mode !== 'edit'; view.hidden = mode === 'edit';
      q('[data-n=mode]').textContent = mode === 'edit' ? 'Check mode' : 'Edit mode';
      if (mode !== 'edit') drawView();
      if (sel) { sel.innerHTML = B.D.pages.map((x) => `<option value="${esc(x.id)}"${x.id === B.D.cur ? ' selected' : ''}>${esc(x.t)}</option>`).join(''); }
      if (pages) { pages.innerHTML = B.D.pages.map((x) => `<button data-p="${esc(x.id)}" class="${x.id === B.D.cur ? 'on' : ''}"><b>${esc(x.t)}</b><small>${esc((x.b.split('\n').find((l) => l.trim()) || 'Empty').replace(LI, '$3').slice(0, 40))}</small></button>`).join(''); }
      const dl = q('[data-n=del]'); dl.textContent = delT ? 'Really delete?' : 'Delete'; dl.classList.toggle('warn', !!delT);
      stat();
    }
    // remote: newer founder notes arrived and nothing here is waiting to be saved, so the open page follows even while focused.
    api.pull = (remote) => {
      if (remote && document.activeElement === ta && ta.value !== B.cur().b) { const a = ta.selectionStart, z = ta.selectionEnd; ta.value = B.cur().b; ta.setSelectionRange(Math.min(a, ta.value.length), Math.min(z, ta.value.length)); }
      if (remote || (document.activeElement !== ta && document.activeElement !== title)) draw(); else stat(); // draw() leaves a focused box alone
    };
    api.stat = stat;
    api.draw = draw; api.focus = () => { (mode === 'edit' ? ta : view).focus(); };
    // typing
    ta.addEventListener('input', () => { B.cur().b = ta.value.slice(0, MAXB); touch(); });
    title.addEventListener('input', () => { B.cur().t = title.value.slice(0, 60) || 'Untitled'; touch(); if (sel) sel.querySelector('option:checked').textContent = B.cur().t; if (pages) { const b = pages.querySelector('button.on b'); if (b) b.textContent = B.cur().t; } });
    // Enter continues a checklist; Enter on an empty item ends it.
    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s), m = LI.exec(line);
      if (!m || ta.selectionEnd !== s) return;
      e.preventDefault();
      if (!m[3].trim()) { ta.setRangeText('', ls, s, 'end'); }
      else { ta.setRangeText('\n' + m[1] + '- [ ] ', s, s, 'end'); }
      ta.dispatchEvent(new Event('input'));
    });
    // buttons
    root.addEventListener('click', (e) => {
      const pb = e.target.closest('[data-p]'); if (pb) { B.D.cur = pb.dataset.p; B.flush(); B.sync(null); draw(); return; }
      const cb = e.target.closest('.ntl input[type=checkbox]');
      if (cb) { const L = lines(), i = +cb.dataset.i, m = LI.exec(L[i] || ''); if (m) { L[i] = m[1] + '- [' + (cb.checked ? 'x' : ' ') + '] ' + m[3]; B.cur().b = L.join('\n'); touch(); draw(); } return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      const n = b.dataset.n;
      if (n !== 'del') { clearTimeout(delT.t); delT = 0; }
      if (n === 'new') {
        if (B.D.pages.length >= MAXP) return;
        const p = { id: uid(), t: 'Untitled', b: '', at: Date.now() }; B.D.pages.push(p); B.D.cur = p.id; B.flush(); B.sync(null); mode = 'edit'; lsSet('gt.notes.mode.' + key, mode); draw(); title.focus(); title.select();
      } else if (n === 'del') {
        if (!delT) { delT = { t: setTimeout(() => { delT = 0; draw(); }, 3000) }; draw(); return; }
        clearTimeout(delT.t); delT = 0;
        B.D.pages = B.D.pages.filter((p) => p.id !== B.D.cur);
        if (!B.D.pages.length) B.D.pages.push({ id: uid(), t: B.first, b: '', at: Date.now() });
        B.D.cur = B.D.pages[0].id; B.flush(); B.sync(null); draw();
      } else if (n === 'item') {
        mode = 'edit'; lsSet('gt.notes.mode.' + key, mode); draw();
        const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, le = (v.indexOf('\n', s) + 1 || v.length + 1) - 1, line = v.slice(ls, le);
        if (!LI.test(line)) { ta.setRangeText('- [ ] ', ls, ls, 'end'); ta.setSelectionRange(le + 6, le + 6); }
        ta.focus(); ta.dispatchEvent(new Event('input'));
      } else if (n === 'clean') {
        B.cur().b = lines().filter((l) => !/^\s*[-*]\s\[[xX]\]/.test(l)).join('\n'); touch(); draw();
      } else if (n === 'mode') {
        mode = mode === 'edit' ? 'check' : 'edit'; lsSet('gt.notes.mode.' + key, mode); draw();
      } else if (n === 'copy') {
        const t = B.cur().b, g = window.gt;
        const done = () => { b.textContent = 'Copied'; setTimeout(draw, 1200); };
        if (g && g.writeClipboard) g.writeClipboard(t).then(done).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(done).catch(() => {});
      }
    });
    if (sel) sel.addEventListener('change', () => { B.D.cur = sel.value; B.flush(); B.sync(null); draw(); });
    B.insts.push(api); draw();
    return api;
  }

  // ---- the Notes tab ----
  const sec = document.createElement('section'); sec.id = 'notes'; sec.className = 'gdark'; vsec.parentNode.appendChild(sec);
  const nb = document.createElement('button'); nb.textContent = 'Notes'; nb.dataset.t = 'notes';
  const anchor = nav.querySelector('[data-t=check]'); nav.insertBefore(nb, anchor ? anchor.nextSibling : null);
  let tab = null;
  nb.onclick = () => { show('notes'); if (!tab) tab = mk(sec, true, 'tab', LB); else tab.draw(); setTimeout(() => tab.focus(), 30); };

  // ---- the pop-out notepad ----
  const pop = document.createElement('div'); pop.id = 'gtnp'; pop.hidden = true;
  pop.innerHTML = '<div class="nph"><b>Notes</b><span class="sp"></span><button data-pp="tab" title="Open the Notes tab">Open tab</button><button data-pp="x" title="Close (Ctrl+Shift+N)" aria-label="Close">&times;</button></div><div class="npb"></div>';
  document.body.appendChild(pop);
  let pp = lsGet('gt.notes.pop', null);
  if (!pp || typeof pp !== 'object') pp = {};
  pp = { open: !!pp.open, x: Number.isFinite(pp.x) ? pp.x : -1, y: Number.isFinite(pp.y) ? pp.y : 90, w: Math.min(900, Math.max(260, +pp.w || 330)), h: Math.min(900, Math.max(240, +pp.h || 400)) };
  const fab = document.createElement('button'); fab.id = 'gtnfab'; fab.type = 'button'; fab.title = 'Notepad (Ctrl+Shift+N)'; fab.innerHTML = '&#9998; Notes'; document.body.appendChild(fab);
  let pe = null;
  const place = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    pp.w = Math.min(pp.w, vw - 10); pp.h = Math.min(pp.h, vh - 10);
    if (pp.x < 0) pp.x = vw - pp.w - 16;
    pp.x = Math.max(0, Math.min(pp.x, vw - 80)); pp.y = Math.max(0, Math.min(pp.y, vh - 40));
    Object.assign(pop.style, { left: pp.x + 'px', top: pp.y + 'px', width: pp.w + 'px', height: pp.h + 'px' });
  };
  const savePop = () => lsSet('gt.notes.pop', pp);
  function setOpen(on) {
    pp.open = !!on; pop.hidden = !on; fab.classList.toggle('on', !!on);
    if (on) { if (!pe) pe = mk(pop.querySelector('.npb'), false, 'pop', LB); else pe.draw(); place(); setTimeout(() => pe.focus(), 30); }
    savePop();
  }
  fab.onclick = () => setOpen(pop.hidden);
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-pp]'); if (!b) return; if (b.dataset.pp === 'x') setOpen(false); else nb.onclick(); });
  document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); setOpen(pop.hidden); } else if (e.key === 'Escape' && !pop.hidden && pop.contains(document.activeElement)) { setOpen(false); } });
  // drag by the header
  pop.querySelector('.nph').addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const sx = e.clientX, sy = e.clientY, ox = pp.x, oy = pp.y; const h = e.currentTarget;
    try { h.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const mv = (m) => { pp.x = ox + m.clientX - sx; pp.y = oy + m.clientY - sy; place(); };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); savePop(); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
  });
  // remember the size after resizing
  if (window.ResizeObserver) { let t = 0; new ResizeObserver(() => { if (pop.hidden) return; clearTimeout(t); t = setTimeout(() => { const r = pop.getBoundingClientRect(); if (r.width > 100) { pp.w = Math.round(r.width); pp.h = Math.round(r.height); savePop(); } }, 300); }).observe(pop); }
  window.addEventListener('resize', () => { if (!pop.hidden) place(); });
  if (pp.open) setOpen(true);

  // ---- founder notes ----
  // One notepad for founder and owner accounts, kept by the Pathfinder service. Changes save a moment after typing stops, with
  // the version they were based on. If another founder saved in between, the service sends their version back and the two are
  // merged page by page: a page only one of you changed keeps that change; a page you both changed keeps yours and adds theirs
  // as a new page, so nothing anyone wrote is lost. While it is open it checks for others' changes every 20 seconds.
  const g = window.gt;
  if (g && g.fnotesGet && g.fnotesPut && g.pfaStatus) {
    const FN = { open: false, loaded: false, v: '', last: {}, lastS: '', busy: false, again: false, t: 0, by: '', at: 0, err: '', note: '', tries: 0 };
    const plain = (pages) => (pages || []).map((p) => ({ id: p.id, t: p.t, b: p.b, at: p.at }));
    const snap = (pages) => { const o = {}; (pages || []).forEach((p) => { o[p.id] = { t: p.t, b: p.b }; }); return o; };
    const when = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const errText = (er) => String((er && er.message) || er || 'Could not reach Pathfinder.').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    const FB = book({ pages: [], cur: lsGet('gt.fnotes.cur', '') }, 'Founder notes', (B, now) => { lsSet('gt.fnotes.cur', B.D.cur); clearTimeout(FN.t); FN.t = setTimeout(push, now ? 0 : 1200); B.stat(); },
      () => (FN.err ? 'not saved: ' + FN.err : FN.busy ? 'saving…' : JSON.stringify(plain(FB.D.pages)) !== FN.lastS ? 'not saved yet' : 'shared with founders and the owner' + (FN.at ? ' · last saved by ' + (FN.by || 'someone') + ', ' + when(FN.at) : '')) + (FN.note ? ' · ' + FN.note : ''));
    // the service's copy, as is (nothing here is waiting to be saved)
    const take = (r) => { FB.D = norm({ pages: r.pages, cur: FB.D.cur }, 'Founder notes'); FN.v = r.v || ''; FN.by = r.by || ''; FN.at = r.at || 0; FN.last = snap(FB.D.pages); FN.lastS = JSON.stringify(plain(FB.D.pages)); };
    const merge = (r) => {
      const base = FN.last, T = r.pages || [], mine = new Map(FB.D.pages.map((p) => [p.id, p])), theirs = new Map(T.map((p) => [p.id, p]));
      const changed = (p, q) => !q || p.t !== q.t || p.b !== q.b, who = r.by || 'another founder';
      const out = []; let both = 0;
      [...T.map((p) => p.id), ...FB.D.pages.map((p) => p.id).filter((id) => !theirs.has(id))].forEach((id) => {
        const m = mine.get(id), t = theirs.get(id), b = base[id];
        if (m && t) { const mc = changed(m, b), tc = changed(t, b); if (mc && tc && (m.t !== t.t || m.b !== t.b)) { both++; out.push(m, { id: uid(), t: (t.t + ' (' + who + ')').slice(0, 60), b: t.b, at: t.at || Date.now() }); } else out.push(mc ? m : t); }
        else if (m) { if (!b || changed(m, b)) out.push(m); } // new here, or changed here after they deleted it
        else if (t && (!b || changed(t, b))) out.push(t); // new there, or changed there after it was deleted here
      });
      FB.D = norm({ pages: out, cur: FB.D.cur }, 'Founder notes');
      FN.v = r.v || ''; FN.by = r.by || ''; FN.at = r.at || 0; FN.last = snap(T); FN.lastS = JSON.stringify(plain(T));
      FN.note = both ? who + ' changed the same page, so their version was added as a new page' : who + ' saved changes too; both kept';
      FB.sync(null, true);
    };
    async function push() {
      if (!FN.loaded) return;
      if (FN.busy) { FN.again = true; return; }
      const pages = plain(FB.D.pages), sNow = JSON.stringify(pages);
      if (sNow === FN.lastS) { FB.stat(); return; }
      if (sNow.length > 1000000) { FN.err = 'founder notes are full (about 1 MB). Delete a page or shorten one.'; FB.stat(); return; }
      FN.busy = true; FN.err = ''; FB.stat();
      try {
        const r = await g.fnotesPut({ pages, base: FN.v });
        if (r && r.conflict) { merge(r); FN.again = true; }
        else { FN.v = r.v || ''; FN.by = r.by || ''; FN.at = r.at || 0; FN.last = snap(pages); FN.lastS = sNow; FN.tries = 0; }
      } catch (er) { FN.err = errText(er); clearTimeout(FN.t); FN.t = setTimeout(push, 15000); }
      FN.busy = false; FB.stat();
      if (FN.again) { FN.again = false; if (++FN.tries < 6) push(); }
    }
    async function pull(asked) {
      if (FN.busy) return;
      try {
        const r = await g.fnotesGet(); FN.err = '';
        if (asked && FN.loaded) FN.note = r.v === FN.v ? 'up to date' : 'refreshed';
        if (!FN.loaded) { take(r); FN.loaded = true; body(); return; }
        if (r.v !== FN.v) { if (JSON.stringify(plain(FB.D.pages)) === FN.lastS) { take(r); if (!asked) FN.note = ''; FB.sync(null, true); } else { merge(r); push(); } }
      } catch (er) { FN.err = errText(er); if (!FN.loaded) { body(); return; } }
      FB.stat();
    }

    // the window, like the notepad's: drag by the header, resize from the corner, Esc closes
    const fp = document.createElement('div'); fp.id = 'gtfnp'; fp.hidden = true;
    const SHIELD = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
    fp.innerHTML = '<div class="nph">' + SHIELD + '<b>Founder notes</b><span class="sp"></span><button data-fp="refresh" title="Get the latest changes from the other founders">&#8635; Refresh</button><button data-fp="x" title="Close" aria-label="Close">&times;</button></div><div class="npb"></div>';
    document.body.appendChild(fp);
    const fbody = fp.querySelector('.npb');
    let fe = null;
    function body() {
      if (FN.loaded) { if (!fe) { fbody.textContent = ''; fe = mk(fbody, false, 'fpop', FB); } else fe.draw(); return; }
      fbody.innerHTML = FN.err ? `<div class="fnload"><p>Could not open founder notes: ${esc(FN.err)}</p><button data-fp="retry">Try again</button></div>` : '<div class="fnload"><p>Loading founder notes…</p></div>';
    }
    let fq = lsGet('gt.fnotes.pop', null); if (!fq || typeof fq !== 'object') fq = {};
    fq = { x: Number.isFinite(fq.x) ? fq.x : -1, y: Number.isFinite(fq.y) ? fq.y : 130, w: Math.min(900, Math.max(260, +fq.w || 360)), h: Math.min(900, Math.max(240, +fq.h || 420)) };
    const fplace = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      fq.w = Math.min(fq.w, vw - 10); fq.h = Math.min(fq.h, vh - 10);
      if (fq.x < 0) fq.x = vw - fq.w - 40;
      fq.x = Math.max(0, Math.min(fq.x, vw - 80)); fq.y = Math.max(0, Math.min(fq.y, vh - 40));
      Object.assign(fp.style, { left: fq.x + 'px', top: fq.y + 'px', width: fq.w + 'px', height: fq.h + 'px' });
    };
    const fsave = () => lsSet('gt.fnotes.pop', fq);
    const ffab = document.createElement('button'); ffab.id = 'gtfnfab'; ffab.type = 'button'; ffab.hidden = true; ffab.title = 'Founder notes: one notepad shared by founders and the owner'; ffab.setAttribute('aria-label', 'Founder notes'); ffab.innerHTML = SHIELD; document.body.appendChild(ffab);
    let pollT = 0;
    function fOpen(on) {
      FN.open = !!on; fp.hidden = !on; ffab.classList.toggle('on', !!on); clearInterval(pollT);
      if (on) { body(); fplace(); pull(); pollT = setInterval(() => { if (!document.hidden) pull(); }, 20000); if (fe) setTimeout(() => fe.focus(), 30); }
      else { clearTimeout(FN.t); push(); }
    }
    ffab.onclick = () => fOpen(fp.hidden);
    fp.addEventListener('click', (e) => { const b = e.target.closest('[data-fp]'); if (!b) return; if (b.dataset.fp === 'x') { fOpen(false); return; }
      // Refresh (or Try again): save anything typed here first, then fetch the latest from the other founders.
      FN.err = ''; if (!FN.loaded) body();
      b.disabled = true; clearTimeout(FN.t);
      (FN.loaded ? push() : Promise.resolve()).then(() => pull(true)).finally(() => { b.disabled = false; FB.stat(); clearTimeout(FN.nt); FN.nt = setTimeout(() => { if (/^(up to date|refreshed)$/.test(FN.note)) { FN.note = ''; FB.stat(); } }, 4000); });
    });
    fp.addEventListener('keydown', (e) => { if (e.key === 'Escape') fOpen(false); });
    fp.querySelector('.nph').addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const sx = e.clientX, sy = e.clientY, ox = fq.x, oy = fq.y; const h = e.currentTarget;
      try { h.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      const mv = (m) => { fq.x = ox + m.clientX - sx; fq.y = oy + m.clientY - sy; fplace(); };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); fsave(); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
    });
    if (window.ResizeObserver) { let t = 0; new ResizeObserver(() => { if (fp.hidden) return; clearTimeout(t); t = setTimeout(() => { const r = fp.getBoundingClientRect(); if (r.width > 100) { fq.w = Math.round(r.width); fq.h = Math.round(r.height); fsave(); } }, 300); }).observe(fp); }
    window.addEventListener('resize', () => { if (!fp.hidden) fplace(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { chk(); if (FN.open) pull(); } });
    window.addEventListener('beforeunload', () => { if (FN.loaded && JSON.stringify(plain(FB.D.pages)) !== FN.lastS) push(); });
    // Only founder and owner accounts see the button; a role taken away closes it (vault.js sends 'gtrole').
    const setF = (st) => { const on = !!(st && st.founder); ffab.hidden = !on; document.body.classList.toggle('gtfn', on); if (!on && FN.open) fOpen(false); if (!on) { FN.loaded = false; fe = null; fbody.textContent = ''; } };
    const chk = () => g.pfaStatus().then(setF).catch(() => {});
    window.addEventListener('gtrole', (e) => setF(e.detail));
    setTimeout(chk, 1200);
  }

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="notes"] main > #notes{max-width:none!important;margin:0!important;zoom:1!important;padding:8px 12px}
#notes .nt-wrap.side{display:grid;grid-template-columns:230px minmax(0,1fr);gap:12px;align-items:stretch;min-height:calc(100vh - 170px)}
.nt-wrap{display:flex;flex-direction:column;min-height:0;height:100%;color:#e6e7ea}
.nt-pages{display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:calc(100vh - 170px)}
@media (max-width:760px){#notes .nt-wrap.side,.nt-wrap.side{grid-template-columns:minmax(0,1fr);min-height:0;gap:10px}.nt-wrap.side .nt-pages{flex-direction:row;max-height:none;overflow-x:auto;overflow-y:hidden;padding-bottom:2px;scrollbar-width:none}.nt-wrap.side .nt-pages::-webkit-scrollbar{display:none}.nt-wrap.side .nt-pages button{flex:0 0 auto;max-width:62vw;min-width:120px}.nt-wrap.side .nta{min-height:50vh}}
.nt-pages button{text-align:left;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);color:#e6e7ea;padding:8px 10px;cursor:pointer;display:flex;flex-direction:column;gap:2px;font:inherit;border-radius:3px}
.nt-pages button b{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nt-pages button small{color:var(--mute,#9aa0a8);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nt-pages button.on{border-color:#8fb3d9;background:var(--g-accent2,#2b4a6b)}
.nt-main{display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0;flex:1}
.nt-top,.nt-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.nt-bar .sp{flex:1}
.nt-wrap button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn,#202226);padding:5px 11px;cursor:pointer;font:inherit;font-size:12px}
.nt-wrap button:hover{border-color:#cfd2d8}
.nt-wrap button.warn{background:#4a2020;border-color:#b05050;color:#fff}
.nt-title,.nt-sel{background:var(--g-inp,#0f1114);color:#fff;border:1px solid #3a3d43;padding:6px 9px;font:inherit;font-size:14px;font-weight:600;border-radius:2px;min-width:0;flex:1}
.nt-sel{flex:0 1 150px;font-weight:500}
.nta,.ntv{flex:1;min-height:160px;width:100%;box-sizing:border-box;background:var(--g-inp,#0f1114);color:#e6e7ea;border:1px solid #3a3d43;border-radius:2px;padding:10px 12px;font:inherit;font-size:14px;line-height:1.55;resize:none;outline:none}
.nta:focus{border-color:#8fb3d9}
.ntv{overflow:auto}
.ntv[hidden],.nta[hidden]{display:none}
.ntl{white-space:pre-wrap;word-break:break-word}
.ntl.li{display:flex;gap:9px;align-items:flex-start;cursor:pointer;padding:2px 0}
.ntl.li input{width:17px;height:17px;margin:3px 0 0;flex:none;accent-color:#4caf50;cursor:pointer}
.ntl.li.done span{text-decoration:line-through;color:#7b8089}
.nt-foot{color:var(--mute,#9aa0a8);font-size:11px}
#gtnfab{position:fixed;right:14px;bottom:14px;z-index:44;background:#1d2026;color:#e6e7ea;border:1px solid #4a4d54;border-radius:18px;padding:7px 14px;font:inherit;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#gtnfab:hover,#gtnfab.on{border-color:#8fb3d9;background:#26324a}
:is(#gtnp,#gtfnp){position:fixed;z-index:45;display:flex;flex-direction:column;background:var(--g-panel,#16181c);border:1px solid #4a4d54;box-shadow:0 14px 40px rgba(0,0,0,.65);resize:both;overflow:hidden;min-width:260px;min-height:240px;border-radius:4px}
:is(#gtnp,#gtfnp)[hidden]{display:none}
:is(#gtnp,#gtfnp) .nph{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 12px;background:#1d2026;border-bottom:1px solid #2b2e33;cursor:move;user-select:none;touch-action:none}
:is(#gtnp,#gtfnp) .nph b{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;font-weight:600}
:is(#gtnp,#gtfnp) .nph .sp{flex:1}
:is(#gtnp,#gtfnp) .nph button{background:none;border:1px solid #3a3d43;color:#cfd2d8;border-radius:3px;padding:2px 9px;cursor:pointer;font:inherit;font-size:12px}
:is(#gtnp,#gtfnp) .nph button:hover{border-color:#cfd2d8}
:is(#gtnp,#gtfnp) .npb{flex:1;min-height:0;padding:8px;display:flex;flex-direction:column}
:is(#gtnp,#gtfnp) .npb .nt-wrap{height:100%}
:is(#gtnp,#gtfnp) .nt-title{display:none}
:is(#gtnp,#gtfnp) .nt-sel{flex:1 1 110px}
:is(#gtnp,#gtfnp) .nt-wrap button{padding:4px 8px;font-size:11px}
:is(#gtnp,#gtfnp) .nt-top,:is(#gtnp,#gtfnp) .nt-bar{gap:5px;flex-wrap:nowrap}
:is(#gtnp,#gtfnp) .nt-main{gap:6px}
body.ovl #gtnfab,body.ovl #gtfnfab{display:none}
#gtfnfab{position:fixed;right:14px;bottom:14px;z-index:44;width:36px;height:34px;display:flex;align-items:center;justify-content:center;background:#1d2026;color:var(--g-accent,#e6e7ea);border:1px solid #4a4d54;border-radius:18px;padding:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#gtfnfab[hidden]{display:none}
#gtfnfab:hover,#gtfnfab.on{border-color:var(--g-accent,#8fb3d9);background:#26324a}
body.gtfn #gtnfab{right:58px}
body:has(#vsheet .dp) #gtfnfab{visibility:hidden}
#gtfnp{z-index:46}
#gtfnp .nph{border-bottom-color:color-mix(in srgb,var(--g-accent,#8fb3d9) 45%,#2b2e33)}
#gtfnp .nph svg{color:var(--g-accent,#8fb3d9);flex:none}
#gtfnp .fnload{padding:14px;color:#cfd2d8;font-size:13px}
#gtfnp .fnload button{background:none;border:1px solid #3a3d43;color:#cfd2d8;border-radius:3px;padding:4px 10px;cursor:pointer;font:inherit}
`;
  document.head.appendChild(css);
})();
