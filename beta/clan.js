// Clan tab: everything the Destiny 2 companion app's clan page does.
//  - the clan's banner, name, motto, level and this week's clan XP
//  - the roster: ranks, who is online and what they are playing, power, emblem, when they joined, weekly clan XP
//  - for admins: promote, demote, kick, ban, hand over founder, join requests, invites, bans and the clan's details
// Bungie decides who may do what (an admin can only act on lower ranks). The data comes from main.js (clan:*).
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt || !window.gt.clanGet) return;
  const gt = window.gt;
  const V = () => window.__gtv || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (p) => (/^\/[\w./%-]{1,300}$/.test(String(p || '')) ? 'https://www.bungie.net' + p : '');
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  const clean = (e) => String((e && e.message) || e || 'unknown error').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').slice(0, 220);
  const ago = (t) => {
    if (!t) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 2) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(h / 24); if (d < 45) return d + (d === 1 ? ' day ago' : ' days ago');
    const mo = Math.round(d / 30); return mo < 18 ? mo + ' months ago' : Math.round(mo / 12) + ' years ago';
  };
  const since = (t) => { if (!t) return ''; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };
  const day = (t) => (t ? new Date(t).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '');
  const CLS = ['Titan', 'Hunter', 'Warlock'];
  const RANK = { 0: 'Not a member', 1: 'Beginner', 2: 'Member', 3: 'Admin', 4: 'Acting founder', 5: 'Founder' };
  const JOIN = { 0: 'Approval needed', 1: 'Open to anyone', 2: 'Closed' };
  const BANLEN = [[8, 'Forever'], [7, '1 year'], [6, '6 months'], [5, '3 months'], [4, '1 month'], [2, '2 weeks'], [1, '1 week']];
  const BNET = (id) => 'https://www.bungie.net/en/ClanV2?groupid=' + encodeURIComponent(id);

  const s = document.createElement('section'); s.id = 'clan'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Clan'; b.dataset.t = 'clan';
  const after = nav.querySelector('[data-t=activity]'); nav.insertBefore(b, after ? after.nextSibling : null);
  b.onclick = () => { window.show('clan'); };

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="clan"] main > #clan{max-width:none!important;margin:0!important;zoom:1!important;padding:12px 16px 28px}
#clan{--cl-line:var(--g-line,#2b2e33);--cl-panel:var(--g-panel,#1a1c20);--cl-acc:var(--g-accent,#7ab8e8);color:#e6e7ea}
#clan .clw{max-width:1500px;margin:0 auto}
#clan button{font:inherit;font-size:13px;border-radius:4px;border:1px solid #3a3d43;color:#d6d8dc;background:var(--g-btn,#202226);padding:6px 12px;cursor:pointer;min-height:32px;white-space:nowrap;letter-spacing:0;text-transform:none}
#clan a.btn{display:inline-flex;align-items:center;font-size:13px;border-radius:4px;border:1px solid #3a3d43;color:#d6d8dc;background:var(--g-btn,#202226);padding:6px 12px;min-height:32px;box-sizing:border-box;white-space:nowrap;text-decoration:none}#clan a.btn:hover{border-color:var(--cl-acc);color:#fff}
#clan button:hover:not(:disabled){border-color:var(--cl-acc);color:#fff}#clan button:disabled{opacity:.5;cursor:default}
#clan button.pri{background:var(--g-accent2,#2b4a6b);border-color:var(--cl-acc);color:var(--g-on-accent,#fff)}
#clan button.dan{border-color:#7a3434;color:#f0b4b4}#clan button.dan:hover:not(:disabled){background:#5a2020;border-color:#d9534f;color:#fff}
#clan input,#clan select,#clan textarea{font:inherit;font-size:14px;background:var(--g-inp,#0f1114);color:#e6e7ea;border:1px solid #3a3d43;border-radius:4px;padding:7px 10px;box-sizing:border-box;min-height:34px}
#clan textarea{width:100%;resize:vertical;min-height:90px;line-height:1.45}
#clan .mute{color:var(--mute,#9aa0a8)}
#clan .clhero{position:relative;overflow:hidden;border:1px solid var(--cl-line);border-radius:6px;background:#0d0f12;min-height:150px;display:flex;align-items:flex-end}
#clan .clhero .clbg{position:absolute;inset:0;background:center/cover no-repeat;opacity:.55}
#clan .clhero::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,9,12,.95),rgba(8,9,12,.35) 75%)}
#clan .clhi{position:relative;z-index:1;display:flex;align-items:flex-end;gap:16px;padding:18px 20px;width:100%;box-sizing:border-box;flex-wrap:wrap}
#clan .clav{width:72px;height:72px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:#14161a center/cover no-repeat;flex:none}
#clan .clnm{flex:1;min-width:220px}
#clan .clnm h2{margin:0;font-size:clamp(22px,2.4vw,32px);line-height:1.1;color:#fff;letter-spacing:.01em;text-transform:none;border:0;padding:0}
#clan .clnm h2 small{font-size:.55em;color:var(--cl-acc);margin-left:8px;letter-spacing:.08em;vertical-align:middle}
#clan .clnm p{margin:6px 0 0;color:#d0d3d8;font-size:14px;max-width:70ch}
#clan .clmeta{display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:#aab0b8}
#clan .clmeta b{color:#fff;font-weight:600}
#clan .clhb{display:flex;gap:8px;align-items:center}
#clan .clrow{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:12px;margin:12px 0}
#clan .clcard{background:var(--cl-panel);border:1px solid var(--cl-line);border-radius:6px;padding:14px 16px}
#clan .clcard h3{margin:0 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#cfd2d8;font-weight:600}
#clan .lv{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
#clan .lv b{font-size:30px;color:#fff;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
#clan .clbar{height:8px;background:#0d0f12;border-radius:4px;overflow:hidden;margin:8px 0 4px}#clan .clbar i{display:block;height:100%;background:var(--cl-acc);border-radius:4px}
#clan .clbar.wk i{background:#e0b64a}
#clan .pgl{display:grid;gap:12px}
#clan .rws{display:flex;flex-wrap:wrap;gap:8px}
#clan .rw{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--cl-line);border-radius:4px;font-size:13px;background:rgba(0,0,0,.2)}
#clan .rw img{width:26px;height:26px;border-radius:3px}#clan .rw.got{border-color:#2f6b3a}#clan .rw.got b{color:#7be08c}
#clan .ctabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 12px}
#clan .ctabs button{border-radius:999px;padding:6px 14px}
#clan .ctabs button.on{background:var(--g-accent2,#2b4a6b);border-color:var(--cl-acc);color:#fff}
#clan .ctabs button i{font-style:normal;margin-left:6px;font-size:11.5px;color:#cfd2d8;background:rgba(255,255,255,.1);border-radius:999px;padding:1px 7px}
#clan .ctabs button i.hot{background:#d9534f;color:#fff}
#clan .tbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
#clan .tbar input,#clan .tbar select{width:auto}#clan .tbar input[type=search]{flex:1 1 220px;min-width:0}
#clan .chips{display:flex;gap:6px;flex-wrap:wrap}
#clan .chips button{border-radius:999px;padding:4px 12px;min-height:30px;font-size:12.5px}
#clan .chips button.on{background:var(--g-accent2,#2b4a6b);border-color:var(--cl-acc);color:#fff}
#clan .rost{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr));gap:8px}
#clan .mem{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr) auto auto;gap:12px;align-items:center;min-height:68px;padding:10px 12px;border:1px solid var(--cl-line);border-radius:6px;background:#121418;overflow:hidden;box-sizing:border-box}
#clan .mem .eb{position:absolute;inset:0;background:left center/cover no-repeat;opacity:.38;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,#000 30%,transparent 85%);mask-image:linear-gradient(90deg,#000 30%,transparent 85%)}
#clan .mem>*:not(.eb){position:relative}
#clan .mem .clic{width:44px;height:44px;border-radius:4px;background:#1c1f24 center/cover no-repeat;border:1px solid rgba(255,255,255,.12)}
#clan .mem .mnm{display:flex;align-items:center;gap:8px;min-width:0}
#clan .mem .mnm b{color:#fff;font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clan .mem .mnm small{color:#8b8f97;font-size:12px}
#clan .mem .st{font-size:12.5px;color:#aab0b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clan .mem .st .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#5c6068;margin-right:6px;vertical-align:1px}
#clan .mem.on .st .dot{background:#4cd964;box-shadow:0 0 0 3px rgba(76,217,100,.18)}#clan .mem.on .st{color:#d8f5de}
#clan .mem .rt{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;font-size:12px;color:#aab0b8}
#clan .mem .rt .clpw{color:#e8d27a;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums}
#clan .mem .xp{color:#e0b64a;font-variant-numeric:tabular-nums}
#clan .rk{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;border:1px solid #4a4e55;color:#cfd2d8;flex:none}
#clan .rk.r5,#clan .rk.r4{border-color:#c9a43a;color:#f2d47a;background:rgba(201,164,58,.12)}#clan .rk.r3{border-color:var(--cl-acc);color:#cfe6fa;background:rgba(122,184,232,.12)}#clan .rk.r1{color:#9aa0a8;border-style:dashed}
#clan .more{min-width:34px;padding:4px 8px!important;font-size:16px!important;line-height:1}
#clan .mnu{position:absolute;right:8px;top:calc(100% - 6px);z-index:30;min-width:200px;background:#16191e;border:1px solid #3a3d43;border-radius:6px;box-shadow:0 18px 40px rgba(0,0,0,.6);padding:6px;display:flex;flex-direction:column;gap:2px}
#clan .mnu button{border:0;background:none;text-align:left;justify-content:flex-start;width:100%}#clan .mnu button:hover{background:rgba(255,255,255,.07)}
#clan .mnu hr{border:0;border-top:1px solid #2b2e33;margin:4px 0}
#clan .mem.menu{z-index:20;overflow:visible}
#clan .lst{display:flex;flex-direction:column;gap:8px}
#clan .clli{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--cl-line);border-radius:6px;background:#121418}
#clan .clli .clic{width:40px;height:40px;border-radius:4px;background:#1c1f24 center/cover no-repeat}
#clan .clli b{color:#fff;font-weight:600}#clan .clli p{margin:3px 0 0;font-size:12.5px;color:#aab0b8;white-space:pre-wrap}
#clan .clli .bt{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
#clan .msg{padding:28px 16px;text-align:center;color:var(--mute,#9aa0a8)}
#clan .note{font-size:12.5px;color:var(--mute,#9aa0a8);margin:10px 0 0}
#clan .warn{border:1px solid #6b5a2a;background:rgba(224,182,74,.08);color:#f0dfa8;border-radius:6px;padding:10px 14px;font-size:13px;margin:0 0 12px}
#clan .err{border-color:#7a3434;background:rgba(217,83,79,.1);color:#f4c0bf}
#clan .good{border-color:#2f6b3a;background:rgba(76,175,80,.1);color:#c7efcb}
#clan .clfrm{display:grid;gap:12px;max-width:760px}
#clan .clfrm label{display:grid;gap:5px;font-size:13px;color:#cfd2d8}
#clan .clfrm .two{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px}
#clan .about{white-space:pre-wrap;line-height:1.55;color:#d0d3d8;max-width:80ch}
#clan .skel{height:68px;border-radius:6px;background:linear-gradient(90deg,#14161a,#1b1e23,#14161a);background-size:200% 100%;animation:clsk 1.4s ease-in-out infinite}
@keyframes clsk{0%{background-position:100% 0}100%{background-position:-100% 0}}
@media (prefers-reduced-motion:reduce){#clan .skel{animation:none}}
#clan .dlg{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
#clan .dlg>div{width:min(460px,100%);background:#16191e;border:1px solid #3a3d43;border-radius:8px;padding:18px 20px;box-shadow:0 30px 70px rgba(0,0,0,.7)}
#clan .dlg h4{margin:0 0 8px;font-size:17px;color:#fff}#clan .dlg p{margin:0 0 12px;color:#c6cad1;font-size:13.5px;line-height:1.5}
#clan .dlg .clbtns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
#clan .dlg label{display:grid;gap:5px;font-size:13px;margin-top:8px}#clan .dlg select,#clan .dlg input{width:100%}
#clan .clres{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:8px;margin-top:10px}
@media (max-width:860px){#clan .clrow{grid-template-columns:1fr}}
@media (max-width:560px){
:root[data-gsec="clan"] main > #clan{padding:10px 12px 24px}
#clan .clhi{padding:14px}#clan .clav{width:56px;height:56px}#clan .clhb{width:100%}#clan .clhb button{flex:1}
#clan .mem{grid-template-columns:40px minmax(0,1fr) auto auto;gap:10px}#clan .mem .clic{width:40px;height:40px}
#clan .mem .rt .jn{display:none}#clan .mem .mnm small{display:none}#clan .tbar select{flex:1}
#clan .clli{grid-template-columns:36px minmax(0,1fr)}#clan .clli .bt{grid-column:1/-1;justify-content:flex-start}
#clan .clfrm .two{grid-template-columns:1fr}
#clan .ctabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:6px -12px 12px;padding:0 12px}#clan .ctabs::-webkit-scrollbar{display:none}#clan .ctabs button{flex:none}
}
`;
  document.head.appendChild(css);

  const st = {
    g: null, err: '', busy: 0, tab: 'roster', q: '', rf: 'all', sort: 'rank', prof: {}, xp: null, xpBusy: 0, menu: '', note: null,
    lists: {}, listErr: {}, listBusy: {}, find: { q: '', res: null, busy: 0, err: '' }, srch: { q: '', res: null, busy: 0, err: '' }, edit: null, saving: 0,
  };
  const isMe = (m) => st.g && m.mid === st.g.me.mid;
  const my = () => (st.g && st.g.me.type) || 0;
  const admin = () => my() >= 3;
  const canAct = (m) => admin() && !isMe(m) && m.type < my();
  const scopeMsg = () => `Bungie has not given Pathfinder permission to manage clans yet, so this has to be done on Bungie.net for now. <a href="${esc(BNET(st.g ? st.g.id : ''))}" target="_blank" rel="noopener">Open your clan on Bungie.net</a>.`;
  const errHtml = (e) => (e === 'SCOPE' ? scopeMsg() : esc(e));
  const say = (t, kind) => { st.note = { t, kind: kind || 'ok', at: Date.now() }; draw(); setTimeout(() => { if (st.note && Date.now() - st.note.at >= 5900) { st.note = null; draw(); } }, 6000); };

  // ---------- loading ----------
  async function load(force) {
    if (st.busy) return;
    st.busy = 1; if (!st.g) draw();
    try { st.g = await gt.clanGet({ force: !!force }); st.err = ''; } catch (e) { st.err = clean(e); }
    st.busy = 0; draw();
    if (st.g && !st.g.none) profs(force);
    if (st.g && !st.g.none && admin() && !st.lists.pending) list('pending', true);
  }
  // Each member's emblem, power and activity: online members first, then everyone else, in small batches so rows fill in steadily.
  let profBusy = 0;
  async function profs(force) {
    if (profBusy || !st.g || st.g.none) return; profBusy = 1;
    // main.js keeps each member for 3 minutes, so asking again for online members is cheap until their copy is stale.
    const want = st.g.members.slice().sort((a, b) => b.on - a.on || b.seen - a.seen).filter((x) => x.on || !st.prof[x.mid] || (force && Date.now() - (st.prof[x.mid].at || 0) > 180000));
    for (let i = 0; i < want.length; i += 20) {
      try { Object.assign(st.prof, await gt.clanProf({ list: want.slice(i, i + 20).map((x) => ({ mt: x.mt, mid: x.mid })) })); } catch (e) { /* the rows show what the roster knows */ }
      if (s.classList.contains('on')) draw();
    }
    profBusy = 0;
  }
  async function list(k, quiet) {
    st.listBusy[k] = 1; if (!quiet) draw();
    try { st.lists[k] = await gt.clanList({ k }); st.listErr[k] = ''; } catch (e) { st.listErr[k] = clean(e); }
    st.listBusy[k] = 0; draw();
  }
  async function act(a, m, extra) {
    try {
      await gt.clanAct({ a, mt: m && m.mt, mid: m && m.mid, ...(extra || {}) });
      const n = m ? m.n : '';
      const done = { rank: `${n} is now ${RANK[extra && extra.type] || 'updated'}.`, kick: `${n} was removed from the clan.`, ban: `${n} was banned.`, unban: `${n} was unbanned.`, approve: `${n} joined the clan.`, deny: `${n}'s request was declined.`, approveall: 'Every request was approved.', denyall: 'Every request was declined.', invite: `Invite sent to ${n}.`, uninvite: `Invite to ${n} cancelled.`, founder: `${n} is now the founder.` }[a];
      say(esc(done || 'Done.'));
      if (['approve', 'deny', 'approveall', 'denyall'].includes(a)) list('pending', true);
      if (['invite', 'uninvite'].includes(a)) list('invited', true);
      if (['ban', 'unban'].includes(a) && st.lists.banned) list('banned', true);
      await load(true);
    } catch (e) { const t = clean(e); say(t === 'SCOPE' ? scopeMsg() : 'Bungie said no: ' + esc(t), 'err'); }
  }

  // ---------- drawing ----------
  const rank = (t) => `<span class="rk r${t}">${esc(RANK[t] || 'Member')}</span>`;
  function head(g) {
    const lv = g.prog.find((p) => p.h === 584850370) || g.prog[0];
    return `<div class="clhero"><div class="clbg" style="${g.banner ? `background-image:url('${esc(img(g.banner))}')` : ''}"></div><div class="clhi">
<div class="clav" style="${g.avatar ? `background-image:url('${esc(img(g.avatar))}')` : ''}"></div>
<div class="clnm"><h2>${esc(g.name)}${g.call ? `<small>[${esc(g.call)}]</small>` : ''}</h2>${g.motto ? `<p>${esc(g.motto)}</p>` : ''}
<div class="clmeta"><span><b>${num(g.count)}</b> / ${num(g.max)} members</span><span><b>${num(g.members.filter((m) => m.on).length)}</b> online</span>${lv ? `<span>Level <b>${num(lv.lv)}</b></span>` : ''}${g.created ? `<span>Founded ${esc(day(g.created))}</span>` : ''}<span>You: <b>${esc(RANK[g.me.type] || 'Member')}</b></span><span>${esc(JOIN[g.join] || '')}</span></div></div>
<div class="clhb"><button data-c="refresh"${st.busy ? ' disabled' : ''}>${st.busy ? 'Refreshing…' : '&#8635; Refresh'}</button><a class="btn" href="${esc(BNET(g.id))}" target="_blank" rel="noopener">Bungie.net</a></div>
</div></div>`;
  }
  function progress(g) {
    if (!g.prog.length && !g.rw.length) return '';
    const pc = (a, b2) => (b2 ? Math.min(100, Math.round((a / b2) * 100)) : 0);
    const prog = g.prog.map((p) => {
      const max = p.cap && p.lv >= p.cap;
      return `<div><div class="lv"><span class="mute">${esc(p.n)}</span><b>${num(p.lv)}</b>${p.cap ? `<span class="mute">of ${num(p.cap)}${max ? ' · max level' : ''}</span>` : ''}</div>
${!max && p.next ? `<div class="clbar"><i style="width:${pc(p.cur, p.next)}%"></i></div><div class="mute" style="font-size:12px">${num(p.cur)} / ${num(p.next)} XP to the next level</div>` : ''}
${p.wkl ? `<div class="clbar wk"><i style="width:${pc(p.wk, p.wkl)}%"></i></div><div class="mute" style="font-size:12px">This week: ${num(p.wk)} / ${num(p.wkl)} clan XP</div>` : ''}</div>`;
    }).join('');
    const rw = g.rw.length ? `<div class="clcard"><h3>Weekly clan rewards</h3><div class="rws">${g.rw.map((r) => `<div class="rw${r.got ? ' got' : ''}">${r.i ? `<img src="${esc(img(r.i))}" alt="" loading="lazy">` : ''}<span>${esc(r.n)}</span><b>${r.got ? 'Earned' : 'Not yet'}</b></div>`).join('')}</div></div>` : '';
    return `<div class="clrow"${!rw ? ' style="grid-template-columns:1fr"' : ''}>${prog ? `<div class="clcard"><h3>Clan progress</h3><div class="pgl">${prog}</div></div>` : ''}${rw}</div>`;
  }
  function tabs(g) {
    const pend = (st.lists.pending || []).length;
    const T = [['roster', 'Roster', g.members.length], ...(admin() ? [['req', 'Join requests', pend, pend > 0], ['inv', 'Invites', (st.lists.invited || []).length || ''], ['ban', 'Banned', (st.lists.banned || []).length || '']] : []), ['info', admin() ? 'Clan details' : 'About']];
    return `<div class="ctabs" role="tablist">${T.map(([k, n, c, hot]) => `<button role="tab" data-ct="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${n}${c !== undefined && c !== '' ? `<i class="${hot ? 'hot' : ''}">${num(c)}</i>` : ''}</button>`).join('')}</div>`;
  }
  const RF = [['all', 'Everyone', () => true], ['on', 'Online', (m) => m.on], ['adm', 'Founder and admins', (m) => m.type >= 3], ['mem', 'Members', (m) => m.type === 2], ['beg', 'Beginners', (m) => m.type === 1]];
  const SORTS = [['rank', 'Rank'], ['on', 'Online first'], ['name', 'Name'], ['seen', 'Last online'], ['joined', 'Newest members'], ['power', 'Power'], ['xp', 'Clan XP this week']];
  function roster(g) {
    const q = st.q.trim().toLowerCase();
    const f = (RF.find((r) => r[0] === st.rf) || RF[0])[2];
    const pw = (m) => (st.prof[m.mid] && st.prof[m.mid].clpw) || 0, xp = (m) => (st.xp && st.xp.by[m.mid]) || 0;
    const cmp = {
      rank: (a, b2) => b2.type - a.type || b2.on - a.on || a.n.localeCompare(b2.n), on: (a, b2) => b2.on - a.on || b2.seen - a.seen, name: (a, b2) => a.n.localeCompare(b2.n),
      seen: (a, b2) => b2.on - a.on || b2.seen - a.seen, joined: (a, b2) => b2.joined - a.joined, power: (a, b2) => pw(b2) - pw(a), xp: (a, b2) => xp(b2) - xp(a),
    }[st.sort] || ((a, b2) => 0);
    const L = g.members.filter((m) => f(m) && (!q || (m.n + '#' + m.code).toLowerCase().includes(q))).sort(cmp);
    const cnt = (r) => g.members.filter(r[2]).length;
    const bar = `<div class="tbar"><input type="search" id="clq" placeholder="Search members" value="${esc(st.q)}" aria-label="Search members"><select id="clsort" aria-label="Sort members">${SORTS.map(([k, n]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select><button data-c="xp"${st.xpBusy ? ' disabled' : ''} title="Looks up how much clan XP each member earned since the weekly reset">${st.xpBusy ? 'Loading clan XP…' : st.xp ? '&#8635; Clan XP' : 'Show clan XP this week'}</button></div>
<div class="tbar chips">${RF.map((r) => `<button data-rf="${r[0]}" class="${st.rf === r[0] ? 'on' : ''}">${r[1]} ${num(cnt(r))}</button>`).join('')}</div>`;
    const xpNote = st.xp && !st.xp.ok ? '<p class="note">Bungie did not share clan XP for this clan right now.</p>' : '';
    return bar + xpNote + (L.length ? `<div class="rost">${L.map(row).join('')}</div>` : '<div class="msg">Nobody matches that.</div>');
  }
  function row(m) {
    const p = st.prof[m.mid], cls = p && p.cls != null ? CLS[p.cls] : '';
    let status;
    if (m.on) status = p && p.act ? `${esc(p.act.md && p.act.n && p.act.md !== p.act.n ? p.act.md + ': ' + p.act.n : p.act.n || p.act.md || 'In orbit')}${p.act.t ? ' · ' + esc(since(p.act.t)) : ''}` : 'Online';
    else status = 'Last online ' + esc(ago(m.seen || (p && p.last)) || 'a while ago');
    const xp = st.xp && st.xp.by[m.mid] != null ? `<span class="xp">${num(st.xp.by[m.mid])} XP</span>` : '';
    const menu = st.menu === m.mid ? menuHtml(m) : '';
    return `<div class="mem${m.on ? ' on' : ''}${menu ? ' menu' : ''}" data-mid="${esc(m.mid)}"><div class="eb"${p && p.emb ? ` style="background-image:url('${esc(img(p.emb))}')"` : ''}></div>
<div class="clic"${m.icon ? ` style="background-image:url('${esc(img(m.icon))}')"` : ''}></div>
<div style="min-width:0"><div class="mnm"><b title="${esc(m.n)}#${esc(m.code)}">${esc(m.n)}</b><small>#${esc(m.code)}</small>${rank(m.type)}${isMe(m) ? '<small>(you)</small>' : ''}</div><div class="st"><span class="dot"></span>${status}</div></div>
<div class="rt">${p && p.pw ? `<span class="clpw">&#9670; ${num(p.pw)}</span>` : p && p.priv ? '<span class="mute">Private</span>' : '<span class="mute">&nbsp;</span>'}<span>${esc(cls)}<span class="jn">${cls && m.joined ? ' · ' : ''}${m.joined ? 'Joined ' + esc(day(m.joined)) : ''}</span></span>${xp}</div>
${canAct(m) || (my() === 5 && !isMe(m)) ? `<button class="more" data-menu="${esc(m.mid)}" aria-label="Actions for ${esc(m.n)}" title="Actions">&#8943;</button>` : ''}${menu}</div>`;
  }
  function menuHtml(m) {
    const o = [];
    if (canAct(m)) {
      if (m.type === 1) o.push(['rank', 'Promote to Member', 2]);
      if (m.type === 2 && my() >= 4) o.push(['rank', 'Promote to Admin', 3]);
      if (m.type === 3 && my() >= 4) o.push(['rank', 'Demote to Member', 2]);
      if (m.type === 2) o.push(['rank', 'Demote to Beginner', 1]);
    }
    const ops = o.map(([a, n, t]) => `<button data-ma="${a}" data-type="${t}">${n}</button>`).join('');
    const dang = canAct(m) ? '<hr><button data-ma="kick">Remove from clan…</button><button data-ma="ban">Ban…</button>' : '';
    const fnd = my() === 5 && !isMe(m) && m.type >= 2 ? '<hr><button data-ma="founder">Make founder…</button>' : '';
    return `<div class="mnu" role="menu">${ops}${dang}${fnd}</div>`;
  }
  function personList(k, items, btns, empty) {
    if (st.listErr[k]) return `<div class="warn err">${errHtml(st.listErr[k])}</div>`;
    if (!items) return '<div class="lst">' + '<div class="skel"></div>'.repeat(3) + '</div>';
    if (!items.length) return `<div class="msg">${empty}</div>`;
    return `<div class="lst">${items.map((x) => `<div class="clli" data-mt="${x.mt}" data-mid="${esc(x.mid)}" data-n="${esc(x.n)}"><div class="clic"${x.icon ? ` style="background-image:url('${esc(img(x.icon))}')"` : ''}></div><div style="min-width:0"><b>${esc(x.n)}</b> <span class="mute">#${esc(x.code)}</span>${extraLine(k, x)}</div><div class="bt">${btns(x)}</div></div>`).join('')}</div>`;
  }
  function extraLine(k, x) {
    if (k === 'pending') return `<p>${x.at ? 'Asked ' + esc(ago(x.at)) : ''}${x.msg ? '\n“' + esc(x.msg) + '”' : ''}</p>`;
    if (k === 'invited') return `<p>${x.at ? 'Invited ' + esc(ago(x.at)) : ''}</p>`;
    if (k === 'banned') return `<p>Banned ${esc(day(x.at))}${x.exp && x.exp < Date.now() + 50 * 365 * 864e5 ? ' · until ' + esc(day(x.exp)) : ' · forever'}${x.msg ? '\nReason: ' + esc(x.msg) : ''}</p>`;
    return '';
  }
  function reqTab() {
    const L = st.lists.pending;
    const top = L && L.length > 1 ? `<div class="tbar"><button class="pri" data-ca="approveall">Approve all ${num(L.length)}</button><button class="dan" data-ca="denyall">Decline all</button><span class="sp"></span><button data-c="reload-pending">&#8635; Refresh</button></div>` : `<div class="tbar"><button data-c="reload-pending">&#8635; Refresh</button></div>`;
    return top + personList('pending', L, () => '<button class="pri" data-la="approve">Approve</button><button class="dan" data-la="deny">Decline</button>', 'No one is waiting to join.');
  }
  function invTab() {
    const f = st.find;
    const res = f.err ? `<div class="warn err">${errHtml(f.err)}</div>` : f.res ? (f.res.length ? `<div class="clres">${f.res.map((x) => `<div class="clli" data-mt="${x.mt}" data-mid="${esc(x.mid)}" data-n="${esc(x.n)}"><div class="clic"${x.icon ? ` style="background-image:url('${esc(img(x.icon))}')"` : ''}></div><div style="min-width:0"><b>${esc(x.n)}</b> <span class="mute">#${esc(x.code)}</span></div><div class="bt">${st.g.members.some((m) => m.mid === x.mid) ? '<span class="mute">In the clan</span>' : '<button class="pri" data-la="invite">Invite</button>'}</div></div>`).join('')}</div>` : '<div class="msg">No player found. Check the name and the 4 numbers after #.</div>') : '';
    return `<div class="clcard" style="margin-bottom:12px"><h3>Invite a player</h3><div class="tbar"><input type="search" id="clfind" placeholder="Bungie name, e.g. Guardian#1234" value="${esc(f.q)}" aria-label="Bungie name to invite"><button class="pri" data-c="find"${f.busy ? ' disabled' : ''}>${f.busy ? 'Searching…' : 'Find'}</button></div>${res}</div>
<h3 class="mute" style="font-size:13px;margin:4px 0 8px">Invites waiting for an answer</h3>${personList('invited', st.lists.invited, () => '<button data-la="uninvite">Cancel invite</button>', 'No invites waiting.')}`;
  }
  function banTab() { return `<div class="tbar"><button data-c="reload-banned">&#8635; Refresh</button></div>` + personList('banned', st.lists.banned, () => '<button data-la="unban">Unban</button>', 'Nobody is banned.'); }
  function infoTab(g) {
    const view = `<div class="clcard"><h3>About ${esc(g.name)}</h3>${g.about ? `<div class="about">${esc(g.about)}</div>` : '<p class="mute">This clan has no description yet.</p>'}<p class="note">Joining: ${esc(JOIN[g.join] || '')}.${g.locale ? ' Language: ' + esc(g.locale) + '.' : ''}</p></div>`;
    if (!admin()) return view;
    const e = st.edit || { name: g.name, call: g.call, motto: g.motto, about: g.about, join: g.join };
    return `<div class="clcard"><h3>Clan details</h3><div class="clfrm">
<div class="two"><label>Name<input id="cle-name" maxlength="80" value="${esc(e.name)}"${my() >= 4 ? '' : ' disabled title="Only the founder can rename the clan"'}></label><label>Tag (callsign)<input id="cle-call" maxlength="8" value="${esc(e.call)}"${my() >= 4 ? '' : ' disabled title="Only the founder can change the tag"'}></label></div>
<label>Motto<input id="cle-motto" maxlength="200" value="${esc(e.motto)}"></label>
<label>About<textarea id="cle-about" maxlength="2000" rows="6">${esc(e.about)}</textarea></label>
<label>Who can join<select id="cle-join">${[1, 0, 2].map((k) => `<option value="${k}"${+e.join === k ? ' selected' : ''}>${JOIN[k]}</option>`).join('')}</select></label>
<div class="tbar"><button class="pri" data-c="save"${st.saving ? ' disabled' : ''}>${st.saving ? 'Saving…' : 'Save changes'}</button><button data-c="revert">Undo changes</button></div></div></div>`;
  }
  function noClan(g) {
    const sr = st.srch;
    const inv = (g.inv || []).length ? `<div class="clcard" style="margin-bottom:12px"><h3>Waiting for you</h3><div class="lst">${g.inv.map((x) => `<div class="clli"><div class="clic"></div><div><b>${esc(x.n)}</b><p>${x.st === 2 ? 'invited you' : 'you asked to join'}</p></div><div class="bt"><a class="btn" href="${esc(BNET(x.id))}" target="_blank" rel="noopener">Open on Bungie.net</a></div></div>`).join('')}</div></div>` : '';
    const res = sr.err ? `<div class="warn err">${errHtml(sr.err)}</div>` : sr.res ? (sr.res.length ? `<div class="clres">${sr.res.map((c) => `<div class="clli"><div class="clic"${c.avatar ? ` style="background-image:url('${esc(img(c.avatar))}')"` : ''}></div><div style="min-width:0"><b>${esc(c.n)}</b>${c.call ? ` <span class="mute">[${esc(c.call)}]</span>` : ''}<p>${num(c.count)} members · ${esc(JOIN[c.join] || '')}${c.motto ? '\n' + esc(c.motto) : ''}</p></div><div class="bt"><a class="btn" href="${esc(BNET(c.id))}" target="_blank" rel="noopener">View and join</a></div></div>`).join('')}</div>` : '<div class="msg">No clans with that name.</div>') : '';
    return `<div class="clcard" style="margin-bottom:12px"><h3>You are not in a clan</h3><p class="mute" style="margin:0 0 10px">Find one by name. Joining happens on Bungie.net, because Bungie does not let other apps send join requests.</p><div class="tbar"><input type="search" id="clsrch" placeholder="Clan name" value="${esc(sr.q)}" aria-label="Clan name"><button class="pri" data-c="search"${sr.busy ? ' disabled' : ''}>${sr.busy ? 'Searching…' : 'Search'}</button></div>${res}</div>${inv}`;
  }
  let drawn = '';
  function draw() {
    if (!s.classList.contains('on') && drawn) return;
    const g = st.g;
    let h;
    if (!g) h = st.err ? `<div class="warn err">Could not load your clan: ${esc(st.err)} <button data-c="refresh">Try again</button></div>` : `<div class="clhero"></div><div style="height:12px"></div><div class="rost">${'<div class="skel"></div>'.repeat(8)}</div>`;
    else if (g.none) h = noClan(g);
    else {
      const body = st.tab === 'req' && admin() ? reqTab() : st.tab === 'inv' && admin() ? invTab() : st.tab === 'ban' && admin() ? banTab() : st.tab === 'info' ? infoTab(g) : roster(g);
      h = head(g) + (st.err ? `<div class="warn err" style="margin-top:12px">Could not refresh: ${esc(st.err)}</div>` : '') + progress(g) + tabs(g) + body;
    }
    const note = st.note ? `<div class="warn ${st.note.kind === 'err' ? 'err' : 'good'}" role="status">${st.note.t}</div>` : '';
    // keep the cursor and scroll where they were: redrawing replaces the search box
    const fo = document.activeElement && s.contains(document.activeElement) ? document.activeElement.id : '', pos = fo && document.activeElement.selectionStart;
    const html = `<div class="clw">${note}${h}</div>`;
    if (html === drawn) return;
    s.innerHTML = html; drawn = html;
    if (fo) { const n = document.getElementById(fo); if (n) { n.focus(); try { if (pos != null) n.setSelectionRange(pos, pos); } catch (e) { /* not a text box */ } } }
  }

  // ---------- dialogs ----------
  function ask(title, text, okLabel, extra, onOk) {
    const d = document.createElement('div'); d.className = 'dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<div><h4>${title}</h4><p>${text}</p>${extra || ''}<div class="clbtns"><button data-d="no">Cancel</button><button class="dan" data-d="ok">${okLabel}</button></div></div>`;
    s.appendChild(d);
    const close = () => { d.remove(); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    d.addEventListener('click', (e) => { const t = e.target.closest('[data-d]'); if (e.target === d || (t && t.dataset.d === 'no')) close(); else if (t && t.dataset.d === 'ok') { const vals = {}; d.querySelectorAll('[data-v]').forEach((n) => { vals[n.dataset.v] = n.value; }); close(); onOk(vals); } });
    const f = d.querySelector('[data-d=no]'); if (f) f.focus();
  }

  // ---------- events ----------
  s.addEventListener('click', (e) => {
    const t = e.target.closest('button,[data-ct],[data-rf]'); if (!t || !s.contains(t)) { if (st.menu) { st.menu = ''; draw(); } return; }
    if (t.closest('.dlg')) return;
    const g = st.g;
    if (t.dataset.ct) { st.tab = t.dataset.ct; st.menu = ''; draw(); if (t.dataset.ct === 'inv' && !st.lists.invited) list('invited'); if (t.dataset.ct === 'ban' && !st.lists.banned) list('banned'); if (t.dataset.ct === 'req') list('pending', !!st.lists.pending); return; }
    if (t.dataset.rf) { st.rf = t.dataset.rf; draw(); return; }
    if (t.dataset.menu) { st.menu = st.menu === t.dataset.menu ? '' : t.dataset.menu; draw(); return; }
    if (t.dataset.ma) {
      const m = g.members.find((x) => x.mid === st.menu); st.menu = ''; draw(); if (!m) return;
      const a = t.dataset.ma;
      if (a === 'rank') act('rank', m, { type: +t.dataset.type });
      else if (a === 'kick') ask(`Remove ${esc(m.n)}?`, `${esc(m.n)} leaves the clan. They can ask to join again later.`, 'Remove', '', () => act('kick', m));
      else if (a === 'ban') ask(`Ban ${esc(m.n)}?`, `${esc(m.n)} is removed and cannot rejoin while the ban lasts.`, 'Ban', `<label>How long<select data-v="len">${BANLEN.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label>Reason (only admins see it)<input data-v="msg" maxlength="300" placeholder="Optional"></label>`, (v) => act('ban', m, { len: +v.len, msg: v.msg || '' }));
      else if (a === 'founder') ask(`Make ${esc(m.n)} the founder?`, `You hand the clan over to ${esc(m.n)} and become an admin. Only the new founder can undo this.`, 'Make founder', '', () => act('founder', m));
      return;
    }
    if (t.dataset.la) {
      const li = t.closest('.clli'); if (!li) return;
      const x = { mt: +li.dataset.mt, mid: li.dataset.mid, n: li.dataset.n };
      const a = t.dataset.la;
      if (a === 'deny') ask(`Decline ${esc(x.n)}?`, 'They are told their request was declined.', 'Decline', '', () => act('deny', x));
      else if (a === 'unban') ask(`Unban ${esc(x.n)}?`, 'They can ask to join the clan again.', 'Unban', '', () => act('unban', x));
      else act(a, x);
      return;
    }
    if (t.dataset.ca === 'approveall') { act('approveall', null); return; }
    if (t.dataset.ca === 'denyall') { ask('Decline every request?', `All ${num((st.lists.pending || []).length)} people waiting are told their request was declined.`, 'Decline all', '', () => act('denyall', null)); return; }
    const c = t.dataset.c;
    if (c === 'refresh') { load(true); if (admin()) list('pending', true); }
    else if (c === 'xp') loadXp();
    else if (c === 'reload-pending') list('pending');
    else if (c === 'reload-banned') list('banned');
    else if (c === 'find') find();
    else if (c === 'search') search();
    else if (c === 'save') save();
    else if (c === 'revert') { st.edit = null; draw(); }
  });
  s.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'clq') { st.q = t.value; draw(); }
    else if (t.id === 'clfind') st.find.q = t.value;
    else if (t.id === 'clsrch') st.srch.q = t.value;
    else if (/^cle-/.test(t.id)) { const g = st.g; st.edit = st.edit || { name: g.name, call: g.call, motto: g.motto, about: g.about, join: g.join }; st.edit[t.id.slice(4)] = t.value; }
  });
  s.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'clsort') { st.sort = t.value; if (t.value === 'xp' && !st.xp) loadXp(); draw(); }
    else if (t.id === 'cle-join') { const g = st.g; st.edit = st.edit || { name: g.name, call: g.call, motto: g.motto, about: g.about, join: g.join }; st.edit.join = +t.value; }
  });
  s.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'clfind') { e.preventDefault(); find(); } else if (e.target.id === 'clsrch') { e.preventDefault(); search(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.menu && s.classList.contains('on')) { st.menu = ''; draw(); } });

  async function loadXp() {
    if (st.xpBusy || !st.g || st.g.none) return; st.xpBusy = 1; draw();
    try { st.xp = await gt.clanXp({ list: st.g.members.map((m) => ({ mt: m.mt, mid: m.mid })) }); if (st.xp.ok && st.sort === 'rank') st.sort = 'xp'; } catch (e) { say('Could not load clan XP: ' + esc(clean(e)), 'err'); }
    st.xpBusy = 0; draw();
  }
  async function find() {
    const f = st.find; if (f.busy || f.q.trim().length < 2) return;
    f.busy = 1; f.err = ''; draw();
    try { f.res = await gt.clanFind({ q: f.q.trim() }); } catch (e) { f.err = clean(e); f.res = null; }
    f.busy = 0; draw();
  }
  async function search() {
    const r = st.srch; if (r.busy || r.q.trim().length < 2) return;
    r.busy = 1; r.err = ''; draw();
    try { r.res = await gt.clanSearch({ q: r.q.trim() }); } catch (e) { r.err = clean(e); r.res = null; }
    r.busy = 0; draw();
  }
  async function save() {
    const g = st.g, e = st.edit; if (!e || st.saving) { say('Nothing changed.'); return; }
    const ch = {};
    ['name', 'call', 'motto', 'about'].forEach((k) => { if (String(e[k]) !== String(g[k])) ch[k] = String(e[k]); });
    if (+e.join !== +g.join) ch.join = +e.join;
    if (ch.name !== undefined && !ch.name.trim()) { say('The clan needs a name.', 'err'); return; }
    if (!Object.keys(ch).length) { say('Nothing changed.'); return; }
    st.saving = 1; draw();
    try { await gt.clanEdit(ch); st.edit = null; say('Clan details saved.'); await load(true); } catch (er) { const t = clean(er); say(t === 'SCOPE' ? scopeMsg() : 'Bungie said no: ' + esc(t), 'err'); }
    st.saving = 0; draw();
  }

  // ---------- when the tab opens ----------
  let tick = 0;
  const onOpen = () => { drawn = ''; draw(); if (!st.g || st.err || Date.now() - (st.g.at || 0) > 60000) load(false); else profs(false); };
  new MutationObserver(() => { if (s.classList.contains('on')) onOpen(); }).observe(s, { attributes: true, attributeFilter: ['class'] });
  // While the tab is open: who is online changes, so check again every 2 minutes (Bungie's copy changes about that often).
  setInterval(() => { if (!s.classList.contains('on') || document.hidden || st.busy || st.menu || document.querySelector('#clan .dlg')) return; if (++tick % 2 === 0) load(false); }, 60000);
  if (s.classList.contains('on')) onOpen();
})();
