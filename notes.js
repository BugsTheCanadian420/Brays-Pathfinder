// Notes: a Notes tab (several pages) and a pop-out notepad you can toggle from any tab (Ctrl+Shift+N).
// Both show the same notes. Lists use "- [ ] item" lines that turn into clickable checkboxes. Everything is saved on this computer only.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec) return;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'n' + Math.random().toString(36).slice(2, 9);
  const LI = /^(\s*)[-*]\s\[( |x|X)\]\s?(.*)$/;
  const MAXB = 200000, MAXP = 60;

  // ---- data ----
  let D = lsGet('gt.notes', null);
  if (!D || !Array.isArray(D.pages)) D = { pages: [], cur: '' };
  D.pages = D.pages.filter((p) => p && typeof p.id === 'string' && typeof p.b === 'string').slice(0, MAXP).map((p) => ({ id: p.id.slice(0, 20), t: String(p.t || 'Untitled').slice(0, 60), b: p.b.slice(0, MAXB), at: +p.at || Date.now() }));
  if (!D.pages.length) D.pages.push({ id: uid(), t: 'My notes', b: '', at: Date.now() });
  if (!D.pages.some((p) => p.id === D.cur)) D.cur = D.pages[0].id;
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => lsSet('gt.notes', D), 250); };
  const flush = () => { clearTimeout(saveT); lsSet('gt.notes', D); };
  window.addEventListener('beforeunload', flush);
  const cur = () => D.pages.find((p) => p.id === D.cur) || D.pages[0];
  const insts = [];
  const sync = (from) => insts.forEach((i) => { if (i !== from) i.pull(); });

  // ---- one editor, used by the tab and by the pop-out ----
  function mk(root, side, key) {
    let mode = lsGet('gt.notes.mode.' + key, 'edit'), delT = 0;
    root.innerHTML = `<div class="nt-wrap${side ? ' side' : ''}">${side ? '<div class="nt-pages"></div>' : ''}<div class="nt-main"><div class="nt-top">${side ? '' : '<select class="nt-sel" aria-label="Page"></select>'}<input class="nt-title" maxlength="60" aria-label="Page title" placeholder="Page title"><button data-n="new" title="New page">+ Page</button><button data-n="del" title="Delete this page">Delete</button></div><div class="nt-bar"><button data-n="item" title="Start a checklist item on this line">&#9744; Add item</button><button data-n="clean" title="Remove ticked items">Clear done</button><span class="sp"></span><button data-n="mode"></button><button data-n="copy" title="Copy this page">Copy</button></div><textarea class="nta" spellcheck="false" placeholder="Type here. Start a line with - [ ] to make a checklist item."></textarea><div class="ntv" hidden></div><div class="nt-foot"></div></div></div>`;
    const q = (s) => root.querySelector(s), ta = q('.nta'), view = q('.ntv'), title = q('.nt-title'), foot = q('.nt-foot'), sel = q('.nt-sel'), pages = q('.nt-pages');
    const api = {};
    const lines = () => cur().b.split('\n');
    const touch = () => { cur().at = Date.now(); save(); sync(api); stat(); };
    const stat = () => { const b = cur().b, w = (b.match(/\S+/g) || []).length, tot = lines().filter((l) => LI.test(l)).length, done = lines().filter((l) => /^\s*[-*]\s\[[xX]\]/.test(l)).length; foot.textContent = `${w} words${tot ? ` · ${done}/${tot} items done` : ''} · saved on this computer`; };
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
      const p = cur();
      if (document.activeElement !== title) title.value = p.t;
      if (document.activeElement !== ta && ta.value !== p.b) ta.value = p.b;
      ta.hidden = mode !== 'edit'; view.hidden = mode === 'edit';
      q('[data-n=mode]').textContent = mode === 'edit' ? 'Check mode' : 'Edit mode';
      if (mode !== 'edit') drawView();
      if (sel) { sel.innerHTML = D.pages.map((x) => `<option value="${esc(x.id)}"${x.id === D.cur ? ' selected' : ''}>${esc(x.t)}</option>`).join(''); }
      if (pages) { pages.innerHTML = D.pages.map((x) => `<button data-p="${esc(x.id)}" class="${x.id === D.cur ? 'on' : ''}"><b>${esc(x.t)}</b><small>${esc((x.b.split('\n').find((l) => l.trim()) || 'Empty').replace(LI, '$3').slice(0, 40))}</small></button>`).join(''); }
      const dl = q('[data-n=del]'); dl.textContent = delT ? 'Really delete?' : 'Delete'; dl.classList.toggle('warn', !!delT);
      stat();
    }
    api.pull = () => { if (document.activeElement !== ta && document.activeElement !== title) draw(); else { if (document.activeElement !== title) { /* typing here wins */ } } };
    api.draw = draw; api.focus = () => { (mode === 'edit' ? ta : view).focus(); };
    // typing
    ta.addEventListener('input', () => { cur().b = ta.value.slice(0, MAXB); touch(); });
    title.addEventListener('input', () => { cur().t = title.value.slice(0, 60) || 'Untitled'; touch(); if (sel) sel.querySelector('option:checked').textContent = cur().t; if (pages) { const b = pages.querySelector('button.on b'); if (b) b.textContent = cur().t; } });
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
      const pb = e.target.closest('[data-p]'); if (pb) { D.cur = pb.dataset.p; flush(); sync(null); draw(); return; }
      const cb = e.target.closest('.ntl input[type=checkbox]');
      if (cb) { const L = lines(), i = +cb.dataset.i, m = LI.exec(L[i] || ''); if (m) { L[i] = m[1] + '- [' + (cb.checked ? 'x' : ' ') + '] ' + m[3]; cur().b = L.join('\n'); touch(); draw(); } return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      const n = b.dataset.n;
      if (n !== 'del') { clearTimeout(delT.t); delT = 0; }
      if (n === 'new') {
        if (D.pages.length >= MAXP) return;
        const p = { id: uid(), t: 'Untitled', b: '', at: Date.now() }; D.pages.push(p); D.cur = p.id; flush(); sync(null); mode = 'edit'; lsSet('gt.notes.mode.' + key, mode); draw(); title.focus(); title.select();
      } else if (n === 'del') {
        if (!delT) { delT = { t: setTimeout(() => { delT = 0; draw(); }, 3000) }; draw(); return; }
        clearTimeout(delT.t); delT = 0;
        D.pages = D.pages.filter((p) => p.id !== D.cur);
        if (!D.pages.length) D.pages.push({ id: uid(), t: 'My notes', b: '', at: Date.now() });
        D.cur = D.pages[0].id; flush(); sync(null); draw();
      } else if (n === 'item') {
        mode = 'edit'; lsSet('gt.notes.mode.' + key, mode); draw();
        const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, le = (v.indexOf('\n', s) + 1 || v.length + 1) - 1, line = v.slice(ls, le);
        if (!LI.test(line)) { ta.setRangeText('- [ ] ', ls, ls, 'end'); ta.setSelectionRange(le + 6, le + 6); }
        ta.focus(); ta.dispatchEvent(new Event('input'));
      } else if (n === 'clean') {
        cur().b = lines().filter((l) => !/^\s*[-*]\s\[[xX]\]/.test(l)).join('\n'); touch(); draw();
      } else if (n === 'mode') {
        mode = mode === 'edit' ? 'check' : 'edit'; lsSet('gt.notes.mode.' + key, mode); draw();
      } else if (n === 'copy') {
        const t = cur().b, g = window.gt;
        const done = () => { b.textContent = 'Copied'; setTimeout(draw, 1200); };
        if (g && g.writeClipboard) g.writeClipboard(t).then(done).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(done).catch(() => {});
      }
    });
    if (sel) sel.addEventListener('change', () => { D.cur = sel.value; flush(); sync(null); draw(); });
    insts.push(api); draw();
    return api;
  }

  // ---- the Notes tab ----
  const sec = document.createElement('section'); sec.id = 'notes'; sec.className = 'gdark'; vsec.parentNode.appendChild(sec);
  const nb = document.createElement('button'); nb.textContent = 'Notes'; nb.dataset.t = 'notes';
  const anchor = nav.querySelector('[data-t=check]'); nav.insertBefore(nb, anchor ? anchor.nextSibling : null);
  let tab = null;
  nb.onclick = () => { show('notes'); if (!tab) tab = mk(sec, true, 'tab'); else tab.draw(); setTimeout(() => tab.focus(), 30); };

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
    if (on) { if (!pe) pe = mk(pop.querySelector('.npb'), false, 'pop'); else pe.draw(); place(); setTimeout(() => pe.focus(), 30); }
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

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="notes"] main > #notes{max-width:none!important;margin:0!important;zoom:1!important;padding:8px 12px}
#notes .nt-wrap.side{display:grid;grid-template-columns:230px minmax(0,1fr);gap:12px;align-items:stretch;min-height:calc(100vh - 170px)}
.nt-wrap{display:flex;flex-direction:column;min-height:0;height:100%;color:#e6e7ea}
.nt-pages{display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:calc(100vh - 170px)}
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
#gtnp{position:fixed;z-index:45;display:flex;flex-direction:column;background:var(--g-panel,#16181c);border:1px solid #4a4d54;box-shadow:0 14px 40px rgba(0,0,0,.65);resize:both;overflow:hidden;min-width:260px;min-height:240px;border-radius:4px}
#gtnp[hidden]{display:none}
#gtnp .nph{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 12px;background:#1d2026;border-bottom:1px solid #2b2e33;cursor:move;user-select:none;touch-action:none}
#gtnp .nph b{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;font-weight:600}
#gtnp .nph .sp{flex:1}
#gtnp .nph button{background:none;border:1px solid #3a3d43;color:#cfd2d8;border-radius:3px;padding:2px 9px;cursor:pointer;font:inherit;font-size:12px}
#gtnp .nph button:hover{border-color:#cfd2d8}
#gtnp .npb{flex:1;min-height:0;padding:8px;display:flex;flex-direction:column}
#gtnp .npb .nt-wrap{height:100%}
#gtnp .nt-title{display:none}
#gtnp .nt-sel{flex:1 1 110px}
#gtnp .nt-wrap button{padding:4px 8px;font-size:11px}
#gtnp .nt-top,#gtnp .nt-bar{gap:5px;flex-wrap:nowrap}
#gtnp .nt-main{gap:6px}
body.ovl #gtnfab{display:none}
`;
  document.head.appendChild(css);
})();
