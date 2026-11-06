// Desktop app or website: the same pages say "this computer" or "this device".
var GT_HERE = window.__GT_WEB__ ? 'this device' : 'this computer';
(() => {
  const nav = document.getElementById('nav'), sec = document.getElementById('vault');
  document.querySelectorAll('section').forEach((x) => x.classList.add('gdark')); // one dark look for every tab
  const g = (id) => document.getElementById(id);
  // Ctrl+V / C / X / A (and Shift+Insert) in text boxes, handled here so they work even when the window menu shortcuts do not.
  // After pasting or cutting, the box also gets a "change" event: a script edit does not send one by itself, so boxes that save on change (names, notes, settings) never saw the pasted text.
  document.addEventListener('keydown', async (e) => {
    const ins = e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'Insert';
    if (!ins && (!(e.ctrlKey || e.metaKey) || e.altKey)) return;
    if (!window.gt || !window.gt.writeClipboard) return;
    const t = e.target; if (!t || !(t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && ['text', 'password', 'search', 'url', 'email', ''].includes(t.type)))) return;
    if (t.readOnly || t.disabled) return;
    const k = ins ? 'v' : (e.key.length === 1 ? e.key.toLowerCase() : '') || (e.code === 'KeyV' ? 'v' : e.code === 'KeyC' ? 'c' : e.code === 'KeyX' ? 'x' : e.code === 'KeyA' ? 'a' : '');
    const fire = () => { t.dispatchEvent(new Event('input', { bubbles: true })); if (t.id !== 'vnotebox') t.dispatchEvent(new Event('change', { bubbles: true })); };
    if (k === 'v') {
      e.preventDefault();
      let txt = ''; try { txt = await window.gt.readClipboard(); } catch (er) { txt = ''; }
      if (txt) { if (t.tagName === 'INPUT') txt = String(txt).replace(/[\r\n]+/g, ' '); t.focus(); t.setRangeText(txt, t.selectionStart, t.selectionEnd, 'end'); fire(); }
      else { try { document.execCommand('paste'); } catch (er) { /* nothing to paste */ } }
    } else if (k === 'c' || k === 'x') {
      const sel = t.value.slice(t.selectionStart, t.selectionEnd); if (!sel) return;
      e.preventDefault(); try { await window.gt.writeClipboard(sel); } catch (er) { return; }
      if (k === 'x') { t.setRangeText('', t.selectionStart, t.selectionEnd, 'end'); fire(); }
    } else if (k === 'a' && !ins) { e.preventDefault(); t.select(); }
  }, true);
  const tabBtn = document.createElement('button'); tabBtn.textContent = 'Vault'; tabBtn.dataset.t = 'vault'; tabBtn.onclick = () => show('vault');
  nav.insertBefore(tabBtn, nav.children[0]);
  const loSec = document.createElement('section'); loSec.id = 'loadouts'; loSec.className = 'gdark'; sec.after(loSec);
  const loBtn = document.createElement('button'); loBtn.textContent = 'Loadouts'; loBtn.dataset.t = 'loadouts'; loBtn.onclick = () => { show('loadouts'); if (window.__gtl) window.__gtl.render(); };
  nav.insertBefore(loBtn, nav.children[1]);
  // Tab menu (top left) and a tab row that scales with the window.
  const navCss = document.createElement('style');
  navCss.textContent = `
nav{padding-left:56px!important;padding-right:12px!important}
nav button:not(#gtmenu){font-size:clamp(8px,.86vw,16px)!important;letter-spacing:.16em!important;padding:0 .85em!important}
nav button.on::after{bottom:.45em!important}
header h1{font-size:clamp(14px,1.5vw,26px)!important;letter-spacing:clamp(2px,.35vw,7px)!important}
#gtmenu{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:36px;height:34px;padding:0!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:var(--g-btn,#1d1f23)!important;border:1px solid #3a3d43!important;border-radius:3px!important;cursor:pointer;letter-spacing:0!important}
#gtmenu:hover,#gtmenu.open{border-color:#cfd2d8!important}
#gtmenu i{display:block;width:16px;height:2px;background:#e6e7ea}
#gtmenup{position:fixed;left:10px;min-width:230px;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);box-shadow:0 10px 30px rgba(0,0,0,.6);z-index:50;display:none;padding:4px 0}
#gtmenup.open{display:block}
#gtmenup div{padding:10px 18px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#aeb2b9;cursor:pointer;display:flex;align-items:center;gap:10px}
#gtmenup div:hover{background:rgba(255,255,255,.07);color:#fff}
#gtmenup div.on{color:#fff}#gtmenup div.on::before{content:"";width:6px;height:6px;background:#fff;transform:rotate(45deg);flex:none}
#gtmenup div:not(.on)::before{content:"";width:6px;flex:none}
#gtcur{display:none;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#fff;margin:0 auto;padding:14px 0}
@media (max-width:700px){nav button:not(#gtmenu):not(#gtmore):not(.gtset){display:none!important}#gtcur{display:block}}`;
  document.head.appendChild(navCss);
  const mBtn = document.createElement('button'); mBtn.id = 'gtmenu'; mBtn.type = 'button'; mBtn.title = 'Menu'; mBtn.innerHTML = '<i></i><i></i><i></i>';
  const mPan = document.createElement('div'); mPan.id = 'gtmenup';
  const mCur = document.createElement('span'); mCur.id = 'gtcur';
  nav.appendChild(mBtn); document.body.appendChild(mPan); nav.appendChild(mCur);
  const tabBtns = () => [...nav.querySelectorAll('button')].filter((b) => b.id !== 'gtmenu');
  const mSync = () => { const on = tabBtns().find((b) => b.classList.contains('on')); const t = on ? on.textContent : ''; if (mCur.textContent !== t) mCur.textContent = t; };
  const mClose = () => { mPan.classList.remove('open'); mBtn.classList.remove('open'); };
  mBtn.onclick = (e) => {
    e.stopPropagation();
    if (mPan.classList.contains('open')) { mClose(); return; }
    mPan.innerHTML = tabBtns().map((b, i) => `<div data-i="${i}"${b.classList.contains('on') ? ' class="on"' : ''}>${b.textContent}</div>`).join('');
    mPan.style.top = (nav.getBoundingClientRect().bottom + 2) + 'px';
    mPan.classList.add('open'); mBtn.classList.add('open');
  };
  mPan.onclick = (e) => { const d = e.target.closest('[data-i]'); if (!d) return; const b = tabBtns()[+d.dataset.i]; mClose(); if (b) b.click(); };
  document.addEventListener('click', (e) => { if (!mPan.contains(e.target) && e.target !== mBtn) mClose(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') mClose(); });
  new MutationObserver(mSync).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  mSync();
  const sub = document.querySelector('h1 small'); if (sub) sub.textContent = 'Your keys and data stay on ' + GT_HERE + '.';

  const st = document.createElement('style');
  st.textContent = `
/* DIM-style dark skin, only while the Vault tab is open */
/* shared look for the older tabs (Resets, Helpful, Checklist, Wishlist...) so every tab matches */
:root[data-dark="1"] main > section:not(#vault):not(#loadouts):not(#organizer):not(#optimizer):not(#triumphs){max-width:1000px;margin-left:auto;margin-right:auto;zoom:var(--gt-z,1)}
section.gdark .card{background:var(--g-panel);border:1px solid var(--g-line);border-radius:3px;box-shadow:none;color:#e6e7ea}
section.gdark .card::before,section.gdark .card::after{display:none!important}
section.gdark h2{color:#f1f1f1;border-bottom-color:var(--g-line)}
section.gdark input:not([type=checkbox]):not([type=range]):not([type=color]),section.gdark select,section.gdark textarea{background:var(--g-deep);border:1px solid #3a3d43;color:#fff;border-radius:3px}
section.gdark input::placeholder,section.gdark textarea::placeholder{color:#7d8088}
section.gdark button:not(.b):not(.g){border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn)}
section.gdark button:not(.b):not(.g):hover{background:#2e3035;color:#fff}
section.gdark table{color:#e6e7ea}

:root[data-dark="1"]{--bg:var(--g-bg);--panel:var(--g-solid);--line:#34363b;--text:#f1f1f1;--mute:#9b9ea5;--gold:#e5c158;--arc:var(--g-accent);--inp:var(--g-deep);color-scheme:dark}
:root[data-dark="1"] body{background:var(--g-bg)!important;background-image:none!important}
:root[data-dark="1"] header,:root[data-dark="1"] nav{background:var(--g-bg)!important;background-image:none!important;border-color:var(--g-line)!important}
:root[data-dark="1"] header{padding:4px 16px 0}
:root[data-dark="1"] header h1{font-size:14px;letter-spacing:4px;color:#f1f1f1;margin:0}
:root[data-dark="1"] header h1 small,:root[data-dark="1"] header img:not(.plogo){display:none}
:root[data-dark="1"] header{flex-direction:row;justify-content:center;gap:12px;max-width:none;margin:0;width:100%;box-sizing:border-box}
:root[data-dark="1"] header>svg{display:block;width:34px;height:34px;color:inherit;filter:drop-shadow(0 0 6px rgba(122,123,255,.55))}
:root[data-dark="1"] nav{padding:4px 16px}
:root[data-dark="1"] main{max-width:none!important;margin:0!important;padding:6px 12px 30px!important}
body{--t:48px}
body.vdragging,body.vdragging *{cursor:grabbing!important;user-select:none!important}#vgrid .vt{user-select:none;-webkit-user-drag:none;touch-action:none}.vghost{box-shadow:0 10px 26px rgba(0,0,0,.6);border-radius:7px;transition:none!important}
#vault,#loadouts{--t:var(--gt-t,44px);zoom:var(--gt-z,1)}
.mtile{display:inline-block;flex:none;vertical-align:middle}.mtile .vt{cursor:pointer}
#settings{zoom:var(--gt-z,1)}
#vault .card{background:var(--g-panel);border:1px solid var(--g-line);border-radius:3px;box-shadow:none;margin-bottom:8px;padding:10px 12px}
#vault .card::before,#vault .card::after{display:none!important}
#vault .vbar{display:flex;gap:8px;align-items:center}
#vault .vbar span{font-size:12px;letter-spacing:3px;color:var(--mute);text-transform:uppercase;white-space:nowrap}
#vault .vbar input{flex:1;margin:0;background:var(--g-deep);border:1px solid #3a3d43;border-radius:3px;padding:6px 10px;font-size:14px;color:#fff}
#vault .vbar input:focus{outline:0;border-color:var(--g-accent)}
#vault button.g{border-radius:3px;border-color:#3a3d43;color:#cfd2d8;background:var(--g-btn);padding:4px 10px}
#vault button.g:hover{background:#2e3035;color:#fff}
#vault button.b{border-radius:3px;background:var(--g-accent2);color:var(--g-on-accent,#fff);padding:5px 10px}
#vnote{position:fixed;left:14px;bottom:14px;z-index:70;margin:0;max-width:46vw;font-size:13px;background:#1b1c1f;border:1px solid #3a3d43;border-radius:3px;padding:6px 10px;box-shadow:0 4px 14px rgba(0,0,0,.5);pointer-events:none;contain:layout paint;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vlo summary{cursor:pointer;margin-top:4px;letter-spacing:2px;text-transform:uppercase;font-size:11px;color:var(--mute)}
#vault details{border:0!important;background:none!important;padding:0!important}
.lo{display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap}.lo b{flex:1;min-width:120px}
.dgrid{display:grid;grid-template-columns:repeat(var(--n),calc(var(--t)*4 + 20px)) minmax(300px,1fr);column-gap:16px;row-gap:2px;align-items:start}
@media (max-width:1100px){.dgrid{grid-template-columns:1fr 1fr}}
.dh{display:flex;align-items:center;gap:8px;height:44px;padding:0 10px;background:linear-gradient(90deg,var(--cc,#3a3d43),rgba(0,0,0,0) 90%) center/cover;border:1px solid var(--g-line);text-shadow:0 1px 3px #000}
.dh.em{background-size:cover;background-position:left center}
.dh b{font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#fff}
.dh .pw{margin-left:auto;font-size:22px;font-weight:600;color:#f5dc7a}.dh .pw:not(.n)::before{content:"\\2726";font-size:12px;margin-right:4px;opacity:.8}
.dh .pw.n{color:#cfd2d8;font-size:17px}
.dn{display:flex;flex-direction:column;line-height:1.1;min-width:0}.dn small{font-size:10px;letter-spacing:1px;color:#d8dbe0;font-style:italic;text-transform:none;white-space:nowrap}
.dh{height:auto;min-height:44px;padding-top:3px;padding-bottom:3px}
.dn small.ds{display:flex;gap:3px;font-style:normal;font-size:9px;white-space:nowrap;letter-spacing:0;color:#9da1a8;margin-top:1px}.dn small.ds b{color:#e6e7ea;font-weight:600;margin-left:1px}
#gtctx{position:fixed;z-index:60;min-width:210px;background:var(--g-panel,#1a1c20);border:1px solid #4a4d54;box-shadow:0 10px 30px rgba(0,0,0,.7);padding:3px 0;font-size:13px;display:none}
#gtctx.open{display:block}
#gtctx div{padding:6px 14px;cursor:pointer;color:#d6d8dc;white-space:nowrap}#gtctx div:hover{background:rgba(255,255,255,.09);color:#fff}
#gtctx .ch{cursor:default;color:#fff;font-weight:600;border-bottom:1px solid var(--g-line,#2b2e33);margin-bottom:3px;max-width:300px;overflow:hidden;text-overflow:ellipsis}#gtctx .ch:hover{background:none}
#gtctx .cs{cursor:default;color:#7d8088;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:5px 14px 2px}#gtctx .cs:hover{background:none;color:#7d8088}
#gtctx .ct{display:flex;gap:4px;padding:4px 10px}#gtctx .ct span{width:28px;height:26px;display:flex;align-items:center;justify-content:center;border:1px solid #3a3d43;border-radius:3px;cursor:pointer;color:var(--tc)}#gtctx .ct span:hover{border-color:var(--tc)}#gtctx .ct span.on{background:var(--tc);border-color:var(--tc);color:#111}#gtctx .ct span.on{background:rgba(255,255,255,.14)}
.pmsg{margin:6px 12px;font-size:12px;color:#e6c46a}.pmsg.bad{color:#ef8a8a}
#vqs{position:fixed;z-index:9700;background:var(--g-solid,#17181b);border:1px solid #3a3d43;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.6);padding:4px;max-height:60vh;overflow:auto;font-size:13px}
#vqs .qs{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:4px;cursor:pointer;color:#e6e7ea}#vqs .qs span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:12.5px}#vqs .qs em{font-style:normal;font-size:11px;color:#8b8f97;text-transform:uppercase;letter-spacing:1px}
#vqs .qs.on,#vqs .qs:hover{background:rgba(255,255,255,.08)}#vqs .qsh{padding:6px 10px 3px;font-size:11px;color:#6f747c;border-top:1px solid #2b2e33;margin-top:3px}
#vhelp{display:none;font-size:12px;color:#b9bcc3;line-height:1.7;padding:6px 4px}#vhelp.open{display:block}#vhelp code{background:#0d0e11;padding:1px 5px;border-radius:2px;color:#e6e7ea}
.vcur{display:flex;flex-wrap:wrap;gap:4px 16px;padding:4px 2px 0;font-size:12px;color:#cfd2d8}.vcur span{display:flex;align-items:center;gap:5px}.vcur img{width:16px;height:16px}
.dsub{grid-column:1/-1;margin:8px 0 2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9da1a8}
.xg{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:calc(var(--t)*.12);max-width:900px}
.dsec{grid-column:1/-1;margin:10px 0 2px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;cursor:default;display:flex;gap:8px;align-items:center}
.dsec small{color:#7c7f86;letter-spacing:1px}
.dsec.tg{cursor:pointer}
.dc{display:flex;gap:calc(var(--t)*.12);align-items:flex-start;padding:2px 0 8px;min-height:calc(var(--t)*1.27)}
.dc.v{flex-wrap:wrap;gap:calc(var(--t)*.12);align-content:flex-start}
.dc.over,.eq.over{outline:2px solid #fff;outline-offset:1px}
/* while dragging, every place the item can go lights up (like DIM); the one under the pointer lights up more */
.dc.dz{background:rgba(255,255,255,.09);box-shadow:inset 0 0 0 1px rgba(255,255,255,.10);border-radius:2px}
.dc.dz.over{background:rgba(255,255,255,.18);outline:0}
.dc.dz .eq.over{outline:2px solid #fff}
.eq{flex:none;width:var(--t);min-height:calc(var(--t)*1.27);background:rgba(255,255,255,.03);display:flex}
.eq .vt{width:100%}
.dc>.eq{align-self:stretch;flex-direction:column;align-items:center;gap:calc(var(--t)*.14);padding-bottom:4px;border-radius:3px;background:none!important;box-shadow:none}
.eq .eqp{width:calc(var(--t)*.44);height:calc(var(--t)*.44);margin-top:calc(var(--t)*.08);flex:none;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.55);background:rgba(255,255,255,.12);font-size:calc(var(--t)*.34);font-weight:700;font-style:normal;line-height:1;border-radius:50%;box-sizing:border-box;cursor:pointer;opacity:.55}
.eq .eqp:hover{color:#fff;background:rgba(255,255,255,.22);opacity:1}
.dc.dz{background:none!important;box-shadow:none!important}
.dc.dz>.inv{background:rgba(255,255,255,.09);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);border-radius:3px;align-self:stretch}
.dc.dz.over{outline:0!important}.dc.dz.over>.inv{background:rgba(255,255,255,.18);outline:2px solid #fff;outline-offset:1px}
.dc.dz>.eq.eqok{background:rgba(122,184,232,.16)!important;box-shadow:inset 0 0 0 1px rgba(122,184,232,.55)}
.dc.dz>.eq.eqok.over{background:rgba(122,184,232,.32)!important;outline:2px solid #fff;outline-offset:1px}
.dc.dz>.eq.eqok .eqp{width:var(--t);height:calc(var(--t)*.5);border-radius:3px;opacity:1;color:#cfe6ff;background:rgba(122,184,232,.18);font-size:calc(var(--t)*.22);letter-spacing:.5px}
.dc.dz>.eq.eqok .eqp::after{content:'Equip';margin-left:3px}
#eqpick{position:fixed;z-index:9300;background:var(--g-solid,#17181b);border:1px solid #3a3d43;border-radius:6px;box-shadow:0 14px 34px rgba(0,0,0,.6);padding:8px;max-width:min(440px,94vw);max-height:60vh;overflow:auto}
#eqpick h6{margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9aa0a8}#eqpick .eqg{display:flex;flex-wrap:wrap;gap:4px}#eqpick .eqg .vt{cursor:pointer}#eqpick p{margin:4px 0 0;font-size:12px;color:#8b8f97}
.inv{display:grid;grid-template-columns:repeat(3,var(--t));gap:calc(var(--t)*.12);min-height:calc(var(--t)*1.27);align-content:start}
.vt{position:relative;width:var(--t);height:var(--t);border:1px solid #455565;background:#455565;cursor:pointer;overflow:hidden;flex:none}
.vt:hover{outline:2px solid #fff;outline-offset:-1px;z-index:1}
.vt img{width:100%;height:100%;display:block}
.vt>img:first-child{height:auto;aspect-ratio:1/1}.vt.hf{height:calc(var(--t)*1.27)}
.vt .ft{position:absolute;bottom:0;left:0;right:0;height:calc(var(--t)*.27);display:flex;align-items:center;justify-content:flex-end;gap:calc(var(--t)*.05);padding:0 calc(var(--t)*.06) 0 calc(var(--t)*.05);background:#455565;color:#f0f2f4;font:500 calc(var(--t)*.24)/1 'Open Sans','Segoe UI',system-ui,sans-serif;letter-spacing:-.01em}.vt .ft .pn{position:relative;top:1px}.vt .ft svg{display:block;width:calc(var(--t)*.22);height:calc(var(--t)*.22)}
.vt .ft .lf{margin-right:auto;display:flex;align-items:center;gap:3px}
.vt .ft .wl{display:inline-flex;font-style:normal;color:#fff;background:none;padding:0;position:static}.vt .ft .wl.dn{color:#e05b5b;background:none}.vt .ft .wl.dn svg{transform:rotate(180deg)}
.vt .ft .tg{position:static;background:none;font-style:normal;padding:0;font-size:12px;line-height:15px}
.vt .ft img.el{width:calc(var(--t)*.22);height:calc(var(--t)*.22);display:block}
.vt img.wm{position:absolute;top:0;left:0;width:100%;height:auto;aspect-ratio:1/1;pointer-events:none}
.vt .bk{position:absolute;top:1px;right:1px;width:calc(var(--t)*.24);height:calc(var(--t)*.24);background:#fff;border-radius:2px;display:flex;align-items:center;justify-content:center}
.vt .bk img{width:88%;height:88%;filter:brightness(0)}
.vt .tp{position:absolute;left:0;top:0;bottom:calc(var(--t)*.27);width:calc(var(--t)*.27);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:calc(var(--t)*.045);padding-bottom:calc(var(--t)*.08);background:linear-gradient(90deg,rgba(0,0,0,.34),rgba(0,0,0,.2));pointer-events:none;text-decoration:none}.vt .tp i{width:calc(var(--t)*.115);height:calc(var(--t)*.115);background:#fcfea0;border-radius:50%;box-shadow:0 0 1px rgba(0,0,0,.6)}
.vt .lk{position:absolute;right:2px;bottom:calc(var(--t)*.27 + 2px);width:calc(var(--t)*.22);height:calc(var(--t)*.22);pointer-events:none}.vt .lk svg{display:block;width:100%;height:100%;fill:#3ff175}
.vt.mw{border:1px solid #cf9a24;background:#cf9a24}.vt.mw .ft{background:#cf9a24;color:#17130a}.vt.mw .ft .wl,.vt.mw .ft .tg{color:#17130a}
.dpsb .dpbar i.mb{background:#5aa9e6}.dpsb .dpbar i.mwb{background:#e5c653}.dpsb.tot{border-top:1px solid #2b2d31;margin-top:3px;padding-top:3px}.dpsi{width:12px;height:12px;vertical-align:-2px;margin-right:4px;filter:brightness(0) invert(1)}.dpen{display:flex;align-items:center;gap:8px;margin:6px 0;padding:0 10px;font-size:11px;color:#c3c7ce}.dpen div{display:flex;gap:2px}.dpen i{display:block;width:9px;height:9px;border:1px solid #6b6e75;transform:rotate(45deg)}.dpen i.f{background:#8fb3d9;border-color:#8fb3d9}.dpen i.u{background:#e5c653;border-color:#e5c653}.dpar{display:flex;gap:8px;margin:6px 0;padding:0 10px;font-size:11px;color:#c3c7ce}.dpar b{display:block;color:#fff}.dpar span{display:block;opacity:.85}.dpar .dpi0 img{width:28px;height:28px}.dpset h5{margin:8px 10px 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9aa0a8}.dpob{display:flex;align-items:center;gap:8px;margin:6px 0;padding:0 10px;font-size:12px;color:#c3c7ce;justify-content:space-between}.dpob img{width:16px;height:16px;vertical-align:-3px;margin-right:6px}.dpob.lv .dpbar{flex:1;height:6px;background:#34363b}.dpob.lv .dpbar i{display:block;height:100%}.dpmr.cos{opacity:.9}.vt.of.Exotic{background:#ceae33}.vt.of.Legendary{background:#522f65}.vt.of.Rare{background:#5076a3}.vt.of.Uncommon{background:#366f42}.vt.of.Common,.vt.of.Basic{background:#c3bcb4}
.vt .cl{position:absolute;top:calc(var(--t)*.03);right:calc(var(--t)*.03);width:calc(var(--t)*.2);height:calc(var(--t)*.2);color:#fff;pointer-events:none;z-index:1}.vt .cl svg{display:block;width:100%;height:100%;overflow:visible}.vt .cl svg path{stroke:rgba(0,0,0,.85);stroke-width:2.2px;paint-order:stroke fill;stroke-linejoin:round}.dph .hw{width:16px;height:16px;display:inline-flex}.dph .hw svg{width:16px;height:16px}.dprb{background:#a52a2a;color:#fff;padding:7px 10px;margin:8px 0;font-size:13px;border-radius:2px}.vt .wl{position:absolute;top:0;left:0;font-style:normal;font-size:11px;line-height:13px;padding:0 2px;background:#2e7d32;color:#fff;border-bottom-right-radius:4px}.vt .wl.dn{background:#8a2c2c}
.pwl{border:1px solid;border-radius:3px;padding:6px 8px;margin:6px 0;font-size:13px}.pwi{display:inline-flex;vertical-align:-2px;color:#4caf50}.pwi.dn{color:#e05b5b}.pwi.dn svg{transform:rotate(180deg)}.pwi svg{width:15px;height:15px}
.wll{display:flex;flex-direction:column;gap:6px;margin:8px 0}.wlr{display:flex;align-items:center;gap:10px;background:#1c1e22;border:1px solid #33363c;border-radius:4px;padding:8px 10px}.wlr.bad{border-color:#7a5a20}.wlk{display:flex;flex:none}.wlt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.wlt b{font-size:14px}.wlt span,.wlt small{font-size:12px;color:#9aa0a8;overflow:hidden;text-overflow:ellipsis}.wlt .er{color:#e0a030;font-style:normal}.wlmsg{font-weight:600;color:#9ecb9e}.wlmsg.bad{color:#e0a030}
.pc{position:relative;overflow:visible}.pc>img{border-radius:50%}.pc .pwb{position:absolute;right:-4px;bottom:-4px;width:15px;height:15px;border-radius:50%;background:#2e7d32;color:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #111;pointer-events:none}.pc .pwb svg{width:9px;height:9px}
.vt .tg{position:absolute;top:1px;right:1px;width:13px;height:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#111;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 1px 3px rgba(0,0,0,.6);font-style:normal}.vt .tg svg{display:block}
.ptags{display:flex;gap:4px;margin:6px 0;flex-wrap:wrap}.ptags button{padding:3px 8px;font-size:12px}.ptags button.on{outline:2px solid var(--g-acc,#e8b84a)}
.vsp{height:5px;background:#2d3139;border-radius:3px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;margin:0 6px}.vsp i{display:block;height:100%;background:var(--g-acc,#e8b84a)}
.mkr{font-size:11px;padding:1px 6px;margin-left:6px}
.phead{align-items:flex-start;padding:10px 12px}.phead img{width:40px;height:40px}.phead h2{font-size:16px;letter-spacing:.8px}.phead .mute{font-size:12px;margin-top:2px}.phead .pw{font-size:26px;line-height:1}
.pcols{display:flex;gap:14px;justify-content:center;padding:12px 12px 8px}
.pcol{display:flex;flex-direction:column;gap:8px}
.pc{width:38px;height:38px;border-radius:50%;background:#1c1e22;border:2px solid #3a3d43;overflow:hidden;cursor:pointer;opacity:.75;transition:opacity .1s}
.pc img{width:100%;height:100%;display:block}
.pc:hover{opacity:1;border-color:#fff}
.pc.eqp{background:#46799f;border-color:#8cb4d6;opacity:1}
.pc.sel:not(.eqp){border-color:#fff;opacity:1;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.pdesc{margin:2px 12px 10px;padding:8px 10px;background:#15171a;border-left:3px solid #8cb4d6;font-size:13px;color:#cfd2d8}.pdesc b{color:#fff;display:block}.pdesc small{color:#9b9ea5}.pdesc span{display:block;margin-top:2px;line-height:1.3}
.sbs{padding:10px 14px 6px}.sbar{grid-template-columns:104px 28px 1fr;margin:3px 0}
.frm{border-top:0;background:none;padding:6px 14px}
.ptags{display:flex;gap:4px;margin:0;padding:6px 12px;border-bottom:1px solid #2b2d31;align-items:center}.ptags button{padding:0;width:26px;height:26px;font-size:14px;line-height:1;border-radius:3px}.ptags .cmpb{width:auto;margin-left:auto;padding:0 10px;font-size:12px}
.acts{width:132px;padding:8px;gap:4px}.acts .ah{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7d8088;margin:6px 0 1px}.acts .ah:first-child{margin-top:0}
.acts button{padding:5px 8px!important;font-size:12px;letter-spacing:.5px;text-transform:none;border-radius:3px}
.pnote{border-top:1px solid #2b2d31;border-bottom:0;color:#9b9ea5;padding:8px 14px}
.pwl{margin:6px 12px}
.ib{width:30px;padding:0!important;text-align:center;font-size:16px;line-height:1}
.dh{position:relative}.dh .mkr{opacity:0;position:absolute;right:62px;top:50%;transform:translateY(-50%);margin:0;font-size:11px;padding:1px 6px;transition:opacity .15s;background:rgba(0,0,0,.6)}.dh:hover .mkr{opacity:1}
.dh{gap:6px;padding:0 8px;min-width:0;overflow:hidden}.dh b{font-size:13px;letter-spacing:1.5px;white-space:nowrap}.dh .pw{margin-left:8px;font-size:18px!important;white-space:nowrap}.dh .pw.n{font-size:15px!important}.dh .vsp+.pw{margin-left:auto}
#vnote:empty{display:none}
#loadouts .card{background:var(--g-panel);border:1px solid var(--g-line);border-radius:3px;box-shadow:none}#loadouts .card::before,#loadouts .card::after{display:none!important}#loadouts .lhead h3{margin:0;font-size:16px}#loadouts button.g{padding:4px 10px;font-size:12px;border-radius:3px}
#vlo{margin-top:0}#vlo summary{margin-top:2px;float:right}.vbar+#vnote+#vlo{clear:both}
.vt.fade{opacity:.15}.vt.dragging{opacity:.35}
.pmc{display:flex;flex-direction:column;gap:4px;padding-bottom:6px;align-items:flex-start}.pmn{font-size:13px;color:#cfd2d8;letter-spacing:1px}.pmb{white-space:nowrap;display:inline-flex;gap:6px;align-items:center;font-size:13px}.pmb b{background:#d1792f;color:#fff;border-radius:9px;padding:0 6px;font-size:12px}.pmc .row1{display:flex;gap:2px;flex-wrap:wrap}
.pmc .row1:empty{display:none;min-height:0}.pmc .none{color:#6d7077;font-size:13px}.pmeg{font-size:11px;color:#9b9ea5;max-width:220px;line-height:1.3}
.lc{display:flex;flex-wrap:wrap;gap:3px;padding-bottom:6px}
.lb{position:relative;width:46px;height:46px;border:1px solid #4a4d54;background:var(--g-btn) center/cover no-repeat;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.lb:hover{outline:2px solid #fff;outline-offset:-1px}
.lb img{width:38px;height:38px;display:block}
.lb i{position:absolute;right:2px;bottom:0;font-size:11px;font-style:normal;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
.lb.empty{opacity:.55}.lb.sel{outline:2px solid #fff;outline-offset:1px;opacity:1}
#vsheet{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px}
#vsheet .pop{width:min(370px,100%);max-height:92vh;overflow:auto;margin:0;padding:0;background:var(--g-solid);border:1px solid #4a4d54;border-radius:0}
#vsheet .pop.wide{width:min(520px,100%)}
.pb{padding:8px 12px 10px}
.pb button{display:inline-block;margin:6px 6px 0 0;font-size:13px}
.phead{display:flex;gap:10px;align-items:center;padding:8px 12px;background:#3b3d42}
.phead.Exotic{background:#ceae33;color:#111}.phead.Legendary{background:#522f65;color:#fff}.phead.Rare{background:#5076a3;color:#fff}.phead.Uncommon{background:#366c4c;color:#fff}
.phead img{width:44px;height:44px;border:1px solid rgba(0,0,0,.5)}
.phead h2{margin:0;border:0;padding:0;font-size:17px;letter-spacing:1px;text-transform:uppercase;color:inherit;line-height:1.1}
.phead .mute{color:inherit;opacity:.8;font-size:13px}
.phead .pw{margin-left:auto;font-size:24px;font-weight:600;color:inherit}
.sbar{display:grid;grid-template-columns:110px 30px 1fr;gap:8px;align-items:center;font-size:13px;margin:1px 0;color:#d6d8dc;line-height:1.25}
.sbar span:first-child{text-align:right}
.sbar b{color:#fff;font-weight:600}
.sbar .tr{height:7px;background:#34363b}.sbar .tr i{display:block;height:100%;background:#f1f1f1}
.sbs{padding:8px 12px 4px}
.prow{display:flex;align-items:center;gap:8px;padding:4px 12px;border-top:1px solid var(--g-line);font-size:14px}
.prow .pi{width:30px;height:30px;border-radius:50%;background:#35566f;border:1px solid var(--g-accent);overflow:hidden;flex:none}
.prow .pi img{width:100%;height:100%;display:block}
.prow span.nm{flex:1;color:#fff}
.prow .alt{display:flex;gap:3px}.prow .alt div{width:22px;height:22px;border-radius:50%;background:#2a2c30;border:1px solid #4a4d54;overflow:hidden;opacity:.7}
.prow .alt img{width:100%;height:100%;display:block}
.lpk{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin:6px 0}
.lpk .sw{height:26px;border:2px solid transparent;background:center/cover;cursor:pointer}.lpk .sw.on{border-color:#fff}
.lpk .ic{height:34px;background:#2a2c30;border:2px solid transparent;cursor:pointer;display:flex;align-items:center;justify-content:center}.lpk .ic.on{border-color:#fff}.lpk .ic img{width:26px;height:26px}
.pb label{margin-top:8px;font-size:12px;letter-spacing:1px;text-transform:uppercase}
.pb select{padding:5px;font-size:14px}


/* themes */
:root{--g-solid:var(--g-panel);--g-bg:#0e0f11;--g-panel:#1b1c1f;--g-col:#17181b;--g-line:#26282c;--g-deep:#101113;--g-btn:#232529;--g-accent:#7ab8e8;--g-accent2:#3d6f96}
:root[data-gt="black"]{--g-bg:#000;--g-panel:#0b0b0c;--g-col:#050506;--g-line:#1c1d1f;--g-deep:#000;--g-btn:#121314}
:root[data-gt="blue"]{--g-bg:#0a1018;--g-panel:#121c2a;--g-col:#0e1622;--g-line:#22344a;--g-deep:#0a121c;--g-btn:#182638}
:root[data-gt="ember"]{--g-bg:#120d0b;--g-panel:#1f1713;--g-col:#19120f;--g-line:#33251d;--g-deep:#120d0b;--g-btn:#2a1d16}
:root[data-gt="void"]{--g-bg:#0f0a14;--g-panel:#1b1424;--g-col:#150f1d;--g-line:#2f2340;--g-deep:#0f0a14;--g-btn:#241a30}
:root[data-gt="forest"]{--g-bg:#0b110d;--g-panel:#141f17;--g-col:#101a13;--g-line:#223325;--g-deep:#0b110d;--g-btn:#1a2a1d}
:root[data-gcompact="1"] .dc{padding-bottom:3px}
.popwrap{display:flex;align-items:flex-start;gap:0;max-width:96vw}
.acts{width:158px;background:var(--g-solid);border:1px solid #4a4d54;border-left:0;padding:8px;display:flex;flex-direction:column;gap:6px}
.acts button{width:100%;margin:0!important;text-align:left;font-size:13px}
.acts .mute{font-size:12px}
.tabs{display:flex;border-bottom:1px solid #34363b}.tabs span{flex:1;text-align:center;padding:5px;font-size:13px;color:#9b9ea5;border-bottom:2px solid transparent}.tabs span.on{color:#fff;border-bottom-color:var(--g-accent)}
.pnote{padding:5px 12px;font-size:13px;color:#cfd2d8;border-bottom:1px solid #2b2d31;cursor:pointer}
.pnote textarea{width:100%;height:50px;font-size:13px;margin:0}
.sbar .tr{display:flex}.sbar .tr u{display:block;height:100%;text-decoration:none}.sbar .tr u.up{background:#6fcf97}.sbar .tr u.dn{background:#e07a7a}
.sbar b.up{color:#6fcf97}.sbar b.dn{color:#e07a7a}
.frm{display:flex;gap:10px;align-items:center;padding:8px 12px;border-top:1px solid #2b2d31;background:rgba(255,255,255,.03)}
.frm .pi{width:34px;height:34px;border-radius:50%;background:#35566f;border:1px solid var(--g-accent);overflow:hidden;flex:none}.frm .pi img{width:100%;height:100%}
.frm b{display:block;font-size:14px;color:#fff}.frm span{font-size:12px;color:#9b9ea5;line-height:1.2;display:block}
.prow{flex-wrap:wrap}.prow .pd{flex-basis:100%;font-size:12px;color:#9b9ea5;padding-left:38px;margin-top:-2px}
.prow .alt div{cursor:pointer}.prow .alt div:hover{opacity:1;border-color:#fff}
.mrow{display:flex;gap:4px;padding:6px 12px 8px;border-top:1px solid #2b2d31}.mrow div{width:28px;height:28px;background:#2a2c30;border:1px solid #4a4d54;overflow:hidden}.mrow img{width:100%;height:100%;display:block}
.rst{padding:2px 12px 6px;font-size:12px;color:var(--g-accent);cursor:pointer}
/* loadouts tab */
.ltab{display:flex;gap:16px;align-items:flex-start}
.lsidec{width:200px;display:flex;flex-direction:column;gap:6px;flex:none}
.lside{display:flex;align-items:center;gap:8px;height:50px;padding:0 12px;background:linear-gradient(90deg,var(--cc,#3a3d43),rgba(0,0,0,0) 90%) center/cover;border:1px solid var(--g-line);cursor:pointer;opacity:.6;text-shadow:0 1px 3px #000}
.lside.em{background-size:cover;background-position:left center}
.lside.on{opacity:1;border-color:var(--g-accent)}.lside b{text-transform:uppercase;letter-spacing:2px;font-size:15px}.lside span{margin-left:auto;font-size:18px;color:#f5dc7a}
.lmain{flex:1;min-width:0}
.lslots{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}
.lpanel{margin-bottom:12px}
.lhead{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.lhead>div:first-child{flex:1;min-width:180px}
.lhead h3{margin:0;font-size:20px;letter-spacing:1px}
.lbtns{display:flex;gap:6px;flex-wrap:wrap}
.lgrp{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7c7f86;margin:8px 0 4px}
.ap{display:inline-block;width:34px;height:34px;border-radius:50%;background:#1c1e22;border:2px solid #3a3d43;overflow:hidden;flex:none}.ap img{width:100%;height:100%;display:block}.ap.big{border-radius:4px;width:40px;height:40px}.ap.empty{opacity:.35;border-style:dashed}
.arow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}
#apm{position:fixed;left:0;right:0;bottom:0;height:64vh;z-index:80;background:#14161a;border-top:1px solid #4a4d54;display:flex;flex-direction:column;color:#e6e7ea;box-shadow:0 -8px 30px rgba(0,0,0,.6)}
#apm .aph{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:14px;letter-spacing:1px;text-transform:uppercase}#apm button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:#23262b;padding:4px 10px;cursor:pointer}#apm button.b{background:var(--g-accent2,#3a6ea5);color:var(--g-on-accent,#fff)}
#apm .apq{padding:0 14px 8px}#apm .apq input{width:100%;background:#0e1013;border:1px solid #3a3d43;border-radius:3px;padding:7px 10px;color:#fff}
#apm .apt{padding:6px 14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:13px;border-top:1px solid #2b2d31}
#apm .apg{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;padding:10px 14px;align-content:start}
#apm .apc{border:1px solid #2d3139;padding:10px;cursor:pointer;opacity:.55;display:grid;grid-template-columns:46px 1fr;gap:2px 10px}#apm .apc:hover{opacity:.85}#apm .apc.on{opacity:1;border-color:#d9502f}
#apm .apc .ap{grid-row:span 2;width:44px;height:44px}#apm .apc b{color:#fff;font-size:14px}#apm .apc .d{font-size:12px;color:#aab0ba;line-height:1.3}
#apm .apb{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid #2b2d31;background:#0e1013}#apm .apb .arow{margin:0}
.amn{display:inline-flex;align-items:center;gap:6px;margin:0 12px 6px 0;font-size:12px;color:#cfd2d8}
.artg{display:flex;flex-direction:column;gap:4px;margin:4px 0}.art{display:flex;gap:4px}.am{width:38px;height:38px;border-radius:50%;padding:3px;background:#1d2026;border:2px solid #2d3139;opacity:.55;cursor:pointer}.am img{width:100%;height:100%;border-radius:50%;display:block}.am.on{opacity:1;border-color:#9aa4b2}.am.pick{opacity:1;border-color:var(--g-acc,#e8b84a);box-shadow:0 0 6px var(--g-acc,#e8b84a)}
.ltiles{display:flex;gap:4px;flex-wrap:wrap}
.led{border-top:1px solid var(--g-line);padding:8px 0;margin-bottom:8px}
.lpk.ic{grid-template-columns:repeat(auto-fill,minmax(42px,1fr));max-height:230px;overflow:auto}
.lpk.ic .ic{height:42px}.lpk.ic .ic img{width:34px;height:34px}
.lpk .sw{height:30px}
@media (max-width:900px){.ltab{flex-direction:column}.lsidec{width:100%;flex-direction:row}.lside{flex:1}}
/* settings page */
#settings .card{max-width:760px;margin-left:auto;margin-right:auto}#settings .acl{display:flex;flex-direction:column;gap:6px;margin:10px 0}#settings .acr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--g-line,#2b2e33);border-radius:6px;background:rgba(255,255,255,.03)}#settings .acr.on{border-color:var(--g-accent,#7ab8e8)}#settings .acr b{flex:1;min-width:140px;color:#fff}#settings .acr b span{color:#8b8f97;font-weight:400;margin-left:2px}#settings .acr em{font-style:normal;font-size:12px;color:var(--g-accent,#7ab8e8)}#settings .syst{color:#cfd2d8}#settings .acr small{flex-basis:100%;color:#e0b64a;font-size:11.5px}.acswm{position:fixed;inset:0;z-index:100000;background:rgba(8,9,12,.85);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;letter-spacing:1px}#settings .navtg{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#settings .navtg .chip{opacity:.55}#settings .navtg .chip.on{opacity:1}#settings .navtg .chip:disabled{cursor:default;opacity:.8}
#settings h2{font-size:15px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;margin:0 0 10px}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.th{border:2px solid var(--g-line);padding:8px;cursor:pointer;background:var(--g-btn);text-align:center;font-size:14px}
.th.on{border-color:var(--g-accent)}
.th i{display:block;height:26px;margin-bottom:6px}
.sr{display:flex;align-items:center;gap:12px;padding:7px 0;border-top:1px solid var(--g-line)}.sr:first-of-type{border-top:0}
.sr label{flex:1;color:#e8e8e8;font-size:15px}.sr input[type=range]{width:200px;margin:0;padding:0}
.sr output{width:48px;text-align:right;color:#9b9ea5}
.sr input[type=checkbox]{width:20px;height:20px;margin:0}.sr input[type=color]{width:46px;height:30px;padding:0;margin:0;background:none;border:1px solid #3a3d43}
.toast{position:fixed;right:14px;bottom:14px;z-index:90;background:#1b1c1f;border:1px solid #4a4d54;padding:10px 14px;display:none;gap:10px;align-items:center;font-size:14px;color:#fff}
.toast.on{display:flex}
:root[data-gpower="0"] .vt .pn{display:none}
`;
  document.head.appendChild(st);
  const st2 = document.createElement('style');
  st2.textContent = `
/* roomier layout: more air between items and in the character headers */
.dgrid{grid-template-columns:repeat(var(--n),calc(var(--t)*4.65 + 8px)) minmax(300px,1fr);column-gap:30px;row-gap:6px}
.dc,.dc.v,.xg,.ltiles{gap:calc(var(--t)*.2)}
.inv{gap:calc(var(--t)*.2)}
.dc{padding:4px 0 14px}
.dh{min-height:66px!important;padding:8px 14px!important;gap:10px}
.dh .dn{gap:0}
.dh b{font-size:15px!important;letter-spacing:2px!important}
.dh .dn small{font-size:12px;margin-top:2px}
.dn small.ds{gap:12px!important;font-size:12px!important;margin-top:6px!important;color:#c3c7ce!important}
.dn small.ds b{font-size:12px!important;letter-spacing:0!important;margin-left:2px!important}
.dh .pw{font-size:22px!important}
.dsec{margin:18px 0 6px}
.vt .bk{width:calc(var(--t)*.22);height:calc(var(--t)*.22)}
.dgrid{grid-template-columns:repeat(var(--n),calc(var(--t)*4.9 + 10px)) minmax(300px,1fr)}
.dn small.ds{flex-wrap:nowrap;gap:7px!important;font-size:10.5px!important}.dn small.ds b{font-size:10.5px!important}
.dh:has(.dn){align-items:flex-start!important}.dh:has(.dn) .pw{margin-top:2px}.dh:has(.dn) .dn{flex:1}
/* item pop-up, laid out like DIM */
#vsheet .pop{width:min(400px,100%)}
#vsheet .pop>*{flex:none}
.phead{align-items:center!important;padding:12px 14px!important}
.phead h2{font-size:17px!important}
.phead .phi{display:flex;gap:6px;align-items:center;margin-left:auto;margin-right:8px}
.phead .phi img{width:22px!important;height:22px!important;border:0!important;filter:drop-shadow(0 0 1px rgba(0,0,0,.6))}
.phead .phi img.phb{filter:brightness(0) invert(1) drop-shadow(0 0 1px rgba(0,0,0,.6))}
.phead.Exotic .phi img.phb{filter:brightness(0) drop-shadow(0 0 1px rgba(255,255,255,.4))}
.phead .pw{margin-left:0!important}
.sbs{padding:10px 16px 8px!important}
.sbar{margin:3px 0!important;gap:10px!important;grid-template-columns:112px 30px 1fr!important}
.sbar .tr{height:8px!important;display:flex!important;padding:0!important;gap:0!important;border:0!important;opacity:1!important;align-items:stretch!important}
.frm{padding:12px 16px!important;gap:12px!important}
.prows{padding:6px 0;border-top:1px solid #2b2d31}
.prow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;min-height:46px;border-bottom:1px solid rgba(255,255,255,.04)}
.prow .psel{display:flex;align-items:center;gap:12px;cursor:pointer;min-width:0}
.prow .psel b{font-size:15px;color:#fff;font-weight:500}
.prow .palt{display:flex;gap:8px;align-items:center}
.prow .palt .pc{width:30px;height:30px;opacity:.6}
.prow .pc{width:38px;height:38px;flex:none}
.prow.open{align-items:flex-start;background:rgba(255,255,255,.03)}
.prow .popts{display:flex;flex-direction:column;gap:8px;flex:none}
.prow .pinfo{flex:1;min-width:0;cursor:pointer;color:#cfd2d8;font-size:13px;line-height:1.4}
.prow .pinfo b{display:inline;color:#fff;font-size:15px;font-weight:600}
.prow .pinfo small{color:#9b9ea5}
.prow .pinfo .pds{display:block;margin-top:4px}
.prow .pinfo .pbn{color:#9b9ea5;margin-top:6px}
.pc.sel:not(.eqp){border-color:#fff;opacity:1}
.mrow{padding:10px 14px!important;gap:8px!important}
.pbtns{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px 12px;border-top:1px solid #2b2d31}
.pbtns .pbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px!important;font-size:13px;border-radius:3px;text-transform:none;letter-spacing:0}
.pbtns .pbtn svg{width:15px;height:15px}
.pbtns .pnoap{font-size:12px}
.rst{padding:4px 14px 8px!important}
.ptags{padding:8px 14px!important;gap:6px!important}
.pnote{padding:10px 16px!important}
`;
  document.head.appendChild(st2);
  const stp = document.createElement('style');
  stp.textContent = `
/* item tile, laid out like DIM: season icon top-left with the tier diamonds below it, lock and tag bottom-right, champion + element + power in the footer */
.vt .bk{display:none!important}
.vt .tp{top:0;bottom:calc(var(--t)*.27);width:calc(var(--t)*.2);gap:calc(var(--t)*.03);padding-bottom:calc(var(--t)*.045);background:linear-gradient(90deg,rgba(0,0,0,.22),rgba(0,0,0,.1))}
.vt .tp i{width:calc(var(--t)*.1);height:calc(var(--t)*.1);border-radius:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:none}
.vt .br{position:absolute;right:calc(var(--t)*.03);bottom:calc(var(--t)*.27 + var(--t)*.03);display:flex;align-items:flex-end;gap:calc(var(--t)*.02);pointer-events:none;z-index:1}
.vt .br .lk{position:static;width:calc(var(--t)*.24);height:calc(var(--t)*.24);display:block}
.vt .br .tg{position:static;background:none;padding:0;font-style:normal;font-weight:700;font-size:calc(var(--t)*.24);line-height:1;text-shadow:0 0 2px #000,0 0 2px #000}
.vt .ft img.bkf{width:calc(var(--t)*.22);height:calc(var(--t)*.22);display:block;filter:brightness(0) invert(1)}
.vt.mw .ft img.bkf,.vt.Exotic .ft img.bkf{filter:brightness(0)}
/* the footer (champion, element, power) used to overflow narrow tiles and cut the champion icon off; keep it all inside */
.vt .ft{gap:calc(var(--t)*.02);padding:0 calc(var(--t)*.04) 0 calc(var(--t)*.03);font-size:calc(var(--t)*.19);letter-spacing:-.04em;overflow:hidden}.vt .ft .wl svg{width:calc(var(--t)*.16);height:calc(var(--t)*.16)}
.vt .tp.cr{background:linear-gradient(90deg,rgba(214,64,56,.5),rgba(214,64,56,.18))}.vt .tp .crf{display:block;flex:none;width:calc(var(--t)*.17);height:calc(var(--t)*.17);color:#ff8a80;filter:drop-shadow(0 0 1px #000)}.vt .tp .crf svg{display:block;width:100%;height:100%}
.vt .fr{position:absolute;top:calc(var(--t)*.03);right:calc(var(--t)*.03);width:calc(var(--t)*.26);height:calc(var(--t)*.26);box-sizing:border-box;padding:calc(var(--t)*.02);background:#fff;border-radius:calc(var(--t)*.045);pointer-events:none;z-index:1}.vt .fr img{display:block;width:100%;height:100%;object-fit:contain;filter:url(#gtfr)}
.vt .ft .elv{display:block;flex:none;width:calc(var(--t)*.16);height:calc(var(--t)*.16)}.vt .ft .elv svg{display:block;width:100%;height:100%;color:inherit}
.vt .ft img.bkf,.vt .ft img.el{width:calc(var(--t)*.16);height:calc(var(--t)*.16);flex:none;object-fit:contain}
.vt .ft .pn{flex:none;white-space:nowrap}
.vt .ft .lf{flex:none}
/* item pop-up: compact card that sits next to the tile, like DIM */
#vsheet{position:fixed;inset:0;z-index:60;background:none;display:block;padding:0;pointer-events:none}
#vsheet .dp{position:fixed;display:flex;align-items:flex-start;pointer-events:auto;font-size:12px;line-height:1.35;color:#d6d8dc;filter:drop-shadow(0 6px 16px rgba(0,0,0,.7))}
.dpm{width:262px;background:#1b1c1f;border:1px solid #4a4d54;overflow:auto;overflow-x:hidden}
.dph{padding:7px 10px 6px;background:#3b3d42;color:#fff}
.dph.Exotic{background:#ceae33;color:#111}.dph.Legendary{background:#522f65}.dph.Rare{background:#5076a3}.dph.Uncommon{background:#366c4c}.dph.Common,.dph.Basic{background:#c3bcb4;color:#111}
.dph .r1{display:flex;align-items:center;gap:6px}
.dph h2{margin:0;border:0;padding:0;font-size:14px;letter-spacing:.5px;text-transform:uppercase;color:inherit;line-height:1.15;flex:1;min-width:0;overflow-wrap:anywhere;font-weight:700}
.dph .el img{width:16px;height:16px;display:block}
.dph .pw{font-size:20px;font-weight:600;line-height:1;color:inherit}
.dph .r2{display:flex;align-items:center;gap:6px;font-size:11px;margin-top:2px;opacity:.9}
.dph .r2 .wh{margin-left:auto;opacity:.75}
.dph .phb{width:14px;height:14px;filter:brightness(0) invert(1)}.dph.Exotic .phb,.dph.Common .phb,.dph.Basic .phb{filter:brightness(0)}
.dpt{display:flex;gap:14px;padding:0 10px;border-bottom:1px solid #34363b}
.dpt span{padding:5px 0 4px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#9b9ea5;cursor:pointer;border-bottom:2px solid transparent}
.dpt span.on{color:#fff;border-bottom-color:#fff}
.dpn{padding:4px 10px;font-size:11px;color:#9b9ea5;cursor:pointer;border-bottom:1px solid #2b2d31}.dpn textarea{width:100%;height:44px;font-size:12px;margin:0}
.dpw{border:1px solid;border-radius:3px;padding:4px 8px;margin:6px 10px;font-size:11px}
.dpss{padding:6px 10px 4px}
.dpsb{display:grid;grid-template-columns:92px 24px 1fr;gap:6px;align-items:center;margin:1px 0;font-size:11px;line-height:1.3;color:#c3c7ce}
.dpsb>span:first-child{text-align:right}.dpsb b{color:#fff;font-weight:600;text-align:right}
.dpsb .dpbar{height:6px;background:#34363b;display:flex;align-items:stretch}.dpsb .dpbar i{display:block;height:100%;background:#f1f1f1}.dpsb .dpbar u{display:block;height:100%;text-decoration:none}.dpsb .dpbar u.up{background:#6fcf97}.dpsb .dpbar u.dn{background:#e07a7a}
.dpsb b.up{color:#6fcf97}.dpsb b.dn{color:#e07a7a}
.dpsb.cust{margin-top:3px;border-top:1px solid #2b2d31;padding-top:3px}.dpsb.cust i{font-style:normal;color:#8b8f97;font-size:10px}
.dpfr{display:flex;gap:8px;align-items:center;padding:6px 10px;border-top:1px solid #2b2d31;background:rgba(255,255,255,.03)}
.dpfr .dpi0{width:24px;height:24px;border-radius:50%;background:#35566f;border:1px solid var(--g-accent,#7ab8e8);overflow:hidden;flex:none}.dpfr .dpi0 img{width:100%;height:100%;display:block}
.dpfr b{display:block;font-size:12px;color:#fff;font-weight:600}.dpfr span{display:block;font-size:11px;color:#9b9ea5;line-height:1.25}
.dpp{border-top:1px solid #2b2d31;padding:2px 0}
.dpr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:5px 8px;padding:5px 12px}
.dpr.open{background:rgba(255,255,255,.03)}
.dpr .cur{display:flex;align-items:center;gap:7px;min-width:0;cursor:pointer;flex:1 1 110px}
.dpr .cur b{font-size:13.5px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpr .alt{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.dpc{position:relative;width:30px;height:30px;border-radius:50%;background:#1c1e22;border:2px solid #3a3d43;cursor:pointer;opacity:.75;flex:none;box-sizing:border-box}
.dpc>img{width:100%;height:100%;display:block;border-radius:50%}
.dpc:hover{opacity:1;border-color:#fff}
.dpsk{min-height:330px;padding:10px 12px;display:flex;flex-direction:column;gap:9px}.dpsk i,.dpsk b{display:block;height:12px;border-radius:3px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.11),rgba(255,255,255,.05));background-size:200% 100%;animation:dpsk 1.1s linear infinite}.dpsk i:nth-child(odd){width:82%}.dpsk b{height:30px;margin-top:6px}@keyframes dpsk{to{background-position:-200% 0}}
.dpc.eqp{background:#46799f;border-color:#8cb4d6;opacity:1}
.dpc.sel:not(.eqp){border-color:#fff;opacity:1}
.dpc .pwb{position:absolute;right:-4px;bottom:-4px;width:15px;height:15px;border-radius:50%;background:#2e7d32;color:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #111;pointer-events:none}.dpc .pwb svg{width:8px;height:8px}
.dpi{padding:5px 12px 9px 50px;font-size:12.5px;line-height:1.45;color:#cfd2d8;cursor:pointer;background:rgba(255,255,255,.03)}
.dpi b{color:#fff;font-size:13.5px}.dpi small{color:#9b9ea5}.dpi .pds{display:block;margin-top:2px}.dpi .pbn{color:#9b9ea5;margin-top:3px}
.dpmr{display:flex;flex-wrap:wrap;gap:4px;padding:6px 10px;border-top:1px solid #2b2d31}.dpmr div{width:26px;height:26px;background:#2a2c30;border:1px solid #4a4d54;overflow:hidden}.dpmr img{width:100%;height:100%;display:block}
.dpbt{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 10px 8px;border-top:1px solid #2b2d31}
.dpbt .pbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 9px!important;font-size:11px!important;border-radius:3px;text-transform:none!important;letter-spacing:0!important}.dpbt .pbtn svg{width:13px;height:13px}
.dpbt .pnoap{font-size:11px}
.dpm .rst{padding:2px 10px 4px;font-size:11px;color:var(--g-accent,#7ab8e8);cursor:pointer}
.dpm .pmsg{margin:6px 10px;font-size:11px;color:#9ecb9e}.dpm .pmsg.bad{color:#ef8a8a}
.dpmu{margin:0;padding:8px 10px;font-size:11px;color:#8b8f97}
.dpd{margin:0;padding:8px 10px 4px;font-size:12px;color:#d6d8dc;line-height:1.4}
.dpfl{margin:0;padding:2px 10px 6px;font-size:11px;font-style:italic;color:#9b9ea5;line-height:1.4}
.dpkv{padding:4px 10px 8px;border-top:1px solid #2b2d31;margin-top:4px}.dpkv div{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:1px 0}.dpkv span{color:#8b8f97}.dpkv b{color:#e6e7ea;font-weight:500;text-align:right}
.dpq{padding:4px 0 6px}.dpq h4{margin:6px 10px 3px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#7d8088;font-weight:600}
.dptr{display:flex;gap:8px;align-items:center;padding:3px 10px;cursor:pointer}.dptr:hover{background:rgba(255,255,255,.05)}.dptr>img{width:30px;height:30px;border:1px solid #4a4d54;flex:none}.dptr b{color:#fff;font-size:13px}.dptr span{font-size:11px;color:#9b9ea5}.dptr small{display:block;font-size:10px;color:#7d8088;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
.dplo{padding:2px 10px;font-size:12px;color:#cfd2d8}
.dpm .pfx{margin:6px 10px}.dpm .pfx .pfb button{padding:3px 8px;font-size:11px;border-radius:3px;text-transform:none;letter-spacing:0}
.dps{width:104px;background:#1b1c1f;border:1px solid #4a4d54;border-left:0;display:flex;flex-direction:column;padding:4px;gap:3px;overflow:auto}
.dps button{display:flex;align-items:center;gap:6px;height:24px;padding:0 6px!important;margin:0!important;width:100%;font:inherit;font-size:11px!important;text-align:left;background:#23262b;border:1px solid #33363c;color:#cfd2d8;border-radius:2px;cursor:pointer;text-transform:none!important;letter-spacing:0!important;box-sizing:border-box}
.dps button:hover{border-color:#8b8f97;color:#fff}.dps button.on{outline:1px solid #fff;outline-offset:-2px}
.dps .ic{width:14px;text-align:center;flex:none;font-size:12px}
.dps h6{margin:5px 0 1px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#7d8088;font-weight:600}
.dps .dpsr{display:flex;gap:3px}.dps .dpsr button{justify-content:center;flex:1}
.dps .tgs{display:grid;grid-template-columns:repeat(5,1fr);gap:2px}.dps .tgs button.tgb{justify-content:center;padding:0!important;width:auto;height:22px;color:var(--tc);background:#202227;border-color:#33363c}.dps .tgs button.tgb:hover{border-color:var(--tc);color:var(--tc)}.dps .tgs button.tgb.on{background:var(--tc);border-color:var(--tc);color:#111;outline:0}.dps .tgn{letter-spacing:.5px;text-transform:none;font-size:10px}

/* ===== Interface styles ===== */
.uis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 10px}
.uic{border:1px solid var(--g-line,#2b2e33);background:var(--g-btn,#232529);padding:8px;cursor:pointer;border-radius:3px;display:flex;flex-direction:column;gap:2px}
.uic.on{border-color:var(--g-accent)}.uic b{font-size:13px;color:#fff}.uic small{font-size:11px;color:#9b9ea5;line-height:1.3}
.uic i{display:block;height:34px;margin-bottom:4px;border-radius:2px}
.uic.u-pf i{background:linear-gradient(90deg,#1b1c1f 0 30%,#2b4a6b 30% 34%,#1b1c1f 34%),#1b1c1f}
.uic.u-d2 i{background:linear-gradient(180deg,rgba(255,255,255,.08),transparent),radial-gradient(circle at 50% 0,#3a4656,#0b0e13 75%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.uic.u-dim i{background:linear-gradient(90deg,#1e222a 0 70%,#d56520 70% 74%,#1e222a 74%)}


/* --- Pathfinder: soft, rounded and glowing (its own look) --- */
:root[data-ui="pf"] .vt{border-radius:7px;border-color:transparent}
:root[data-ui="pf"] .vt>img:first-child{border-radius:6px}
:root[data-ui="pf"] .vt:hover{box-shadow:0 0 0 2px var(--g-accent),0 0 14px color-mix(in srgb,var(--g-accent) 55%,transparent)}
:root[data-ui="pf"] .cht{border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.35)}
:root[data-ui="pf"] .chm{border-radius:10px}
:root[data-ui="pf"] .card,:root[data-ui="pf"] section.gdark .card{border-radius:12px!important;box-shadow:0 6px 24px rgba(0,0,0,.28)!important}
:root[data-ui="pf"] header.gtbar nav button{border-radius:999px!important;height:34px!important;margin:7px 2px!important;letter-spacing:1.5px!important}
:root[data-ui="pf"] header.gtbar nav button.on{box-shadow:none!important;background:color-mix(in srgb,var(--g-accent) 22%,transparent)!important;color:#fff!important}
:root[data-ui="pf"] header.gtbar nav button:hover{background:rgba(255,255,255,.07)!important}
:root[data-ui="pf"] .dsec:not(.tg)::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--g-accent);box-shadow:0 0 8px var(--g-accent);flex:none}
:root[data-ui="pf"] section.gdark button,:root[data-ui="pf"] #vault button.g,:root[data-ui="pf"] #vault button.b{border-radius:999px!important}
:root[data-ui="pf"] .dpm{border-radius:12px 0 0 12px;box-shadow:0 12px 40px rgba(0,0,0,.6)}
:root[data-ui="pf"] .dps{border-radius:0 12px 12px 0}
:root[data-ui="pf"] .dph{border-radius:11px 0 0 0}
:root[data-ui="pf"] .dps button{border-radius:8px!important}
:root[data-ui="pf"] .pms{opacity:.8}

/* --- In-game: a few layout changes on top of the frosted look --- */
:root[data-ui="d2"] header.gtbar{justify-content:center!important}
:root[data-ui="d2"] header.gtbar nav button{height:52px!important;padding:0 18px!important}
:root[data-ui="d2"] .cht{height:60px!important;padding:0 14px!important;background-size:cover!important}
:root[data-ui="d2"] .chnm b{font-size:17px;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
:root[data-ui="d2"] .chp{font-size:26px;font-weight:400;color:#f0c84a;letter-spacing:.02em}
:root[data-ui="d2"] .dc,:root[data-ui="d2"] .xg{gap:calc(var(--t)*.16)!important}
:root[data-ui="d2"] .dsec{margin-top:24px!important}
:root[data-ui="d2"] .dph{border-top:2px solid rgba(255,255,255,.65)}
:root[data-ui="d2"] .dph h2{text-transform:uppercase;font-weight:600;font-size:19px}
:root[data-ui="d2"] .dpsb .dpbar{height:10px!important;background:rgba(255,255,255,.12)!important}
:root[data-ui="d2"] .pms{clip-path:none;border-radius:0;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}

/* --- DIM: flat, tight and compact --- */
:root[data-ui="dim"] header.gtbar{background:#000!important;height:44px!important}
:root[data-ui="dim"] header.gtbar nav button{height:44px!important;padding:0 12px!important}
:root[data-ui="dim"] .vt{border-color:transparent}
:root[data-ui="dim"] .dc,:root[data-ui="dim"] .xg{gap:calc(var(--t)*.08)!important}
:root[data-ui="dim"] .dgrid{column-gap:14px!important}
:root[data-ui="dim"] .dsec{margin:10px 0 4px!important;padding:4px 6px;background:rgba(255,255,255,.06)}
:root[data-ui="dim"] .dsec:not(.tg)::before{content:"▾";font-size:12px;color:#aaa}
:root[data-ui="dim"] .cht{height:42px!important}
:root[data-ui="dim"] .chp{color:#fff!important;font-size:19px}
:root[data-ui="dim"] .chnm b{font-size:16px}
:root[data-ui="dim"] .dph{border-radius:0}
/* --- DIM: Destiny Item Manager's own dark theme --- */
:root[data-ui="dim"]{--g-bg:#1e222a!important;--g-panel:rgba(0,0,0,.4)!important;--g-solid:#161a20!important;--g-col:transparent!important;--g-line:#2f343d!important;--g-deep:#333!important;--g-btn:rgba(255,255,255,.1)!important;--g-accent:#d56520!important;--g-accent2:#d56520!important;--g-layers:none!important}
:root[data-ui="dim"] body{font-family:'Open Sans',Helvetica,Arial,sans-serif!important;background:#1e222a!important}
:root[data-ui="dim"] body::before{display:none!important}
:root[data-ui="dim"] header.gtbar{background:#1e222a!important;backdrop-filter:none!important;border-bottom:1px solid #000!important}
:root[data-ui="dim"] header.gtbar nav button{text-transform:none!important;letter-spacing:0!important;font-size:14px!important;font-weight:600!important;color:#bbb!important}
:root[data-ui="dim"] header.gtbar nav button.on,:root[data-ui="dim"] header.gtbar nav button:hover{color:#fff!important}
:root[data-ui="dim"] header.gtbar nav button.on{box-shadow:inset 0 -2px 0 #d56520!important;background:none!important}
:root[data-ui="dim"] .dsec{text-transform:none;letter-spacing:0;font-size:14px;font-weight:600;color:#efefef}
:root[data-ui="dim"] .card,:root[data-ui="dim"] section.gdark .card{border-radius:0!important;backdrop-filter:none!important;border-color:transparent!important;background:rgba(0,0,0,.4)!important}
:root[data-ui="dim"] section.gdark button,:root[data-ui="dim"] #vault button.g,:root[data-ui="dim"] #vault button.b,:root[data-ui="dim"] button.g,:root[data-ui="dim"] button.b{border-radius:0!important;border:0!important;background:rgba(255,255,255,.1)!important;color:#efefef!important;text-transform:none!important;letter-spacing:0!important}
:root[data-ui="dim"] section.gdark button:hover,:root[data-ui="dim"] button.g:hover,:root[data-ui="dim"] button.b:hover{background:#d56520!important;color:#fff!important}
:root[data-ui="dim"] section.gdark input:not([type=checkbox]):not([type=range]):not([type=color]),:root[data-ui="dim"] section.gdark select,:root[data-ui="dim"] section.gdark textarea{background:#333!important;border:1px solid transparent!important;border-radius:0!important}
:root[data-ui="dim"] .dpm{background:#0d0f14!important;border-color:#222!important}
:root[data-ui="dim"] .dps{background:#161616!important;border-color:#222!important}
:root[data-ui="dim"] .dps button{background:rgba(255,255,255,.08)!important;border:0!important;border-radius:0!important}
:root[data-ui="dim"] .cht{border-radius:0!important}

/* --- In-game: Destiny 2 menus (frosted panels, thin white frames, square buttons, wide uppercase labels) --- */
:root[data-ui="d2"]{--g-panel:rgba(10,13,18,.58)!important;--g-col:rgba(255,255,255,.03)!important;--g-line:rgba(255,255,255,.16)!important;--g-btn:rgba(255,255,255,.05)!important;--g-deep:rgba(0,0,0,.45)!important;--gold:#f0c84a}
:root[data-ui="d2"] body{font-family:'Barlow','Helvetica Neue',Arial,sans-serif!important;letter-spacing:.015em}
:root[data-ui="d2"]:not([data-gx="1"]) body{background:radial-gradient(1400px 800px at 50% -15%,#33404f 0%,#141a22 45%,#07090c 100%) fixed!important}
:root[data-ui="d2"] header.gtbar{background:linear-gradient(180deg,rgba(0,0,0,.65),rgba(0,0,0,.35))!important;border-bottom:1px solid rgba(255,255,255,.12)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
:root[data-ui="d2"] header.gtbar nav button{text-transform:uppercase!important;letter-spacing:.22em!important;font-weight:500!important;font-size:12.5px!important;color:rgba(255,255,255,.62)!important}
:root[data-ui="d2"] header.gtbar nav button.on,:root[data-ui="d2"] header.gtbar nav button:hover{color:#fff!important}
:root[data-ui="d2"] header.gtbar nav button.on{box-shadow:inset 0 -2px 0 #fff!important;background:rgba(255,255,255,.06)!important}
:root[data-ui="d2"] .dsec{text-transform:uppercase;letter-spacing:.32em;font-weight:500;font-size:12px;color:rgba(255,255,255,.78)}
:root[data-ui="d2"] .dsec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.35),rgba(255,255,255,0))}
:root[data-ui="d2"] .card,:root[data-ui="d2"] section.gdark .card{border-radius:0!important;background:rgba(10,13,18,.58)!important;border:1px solid rgba(255,255,255,.14)!important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
:root[data-ui="d2"] section.gdark h2,:root[data-ui="d2"] .card h2{text-transform:uppercase;letter-spacing:.28em;font-weight:500}
:root[data-ui="d2"] section.gdark button,:root[data-ui="d2"] #vault button.g,:root[data-ui="d2"] #vault button.b,:root[data-ui="d2"] button.g,:root[data-ui="d2"] button.b{border-radius:0!important;border:1px solid rgba(255,255,255,.4)!important;background:rgba(255,255,255,.04)!important;color:#f2f2f2!important;text-transform:uppercase;letter-spacing:.12em}
:root[data-ui="d2"] section.gdark button:hover,:root[data-ui="d2"] button.g:hover,:root[data-ui="d2"] button.b:hover,:root[data-ui="d2"] #vault button.g:hover{background:#f2f2f2!important;color:#111!important;border-color:#fff!important}
:root[data-ui="d2"] section.gdark input:not([type=checkbox]):not([type=range]):not([type=color]),:root[data-ui="d2"] section.gdark select,:root[data-ui="d2"] section.gdark textarea{border-radius:0!important;background:rgba(0,0,0,.45)!important;border:1px solid rgba(255,255,255,.25)!important}
:root[data-ui="d2"] .vt{outline:1px solid rgba(255,255,255,.22);outline-offset:-1px}
:root[data-ui="d2"] .vt:hover{outline:2px solid #fff;outline-offset:0}
:root[data-ui="d2"] .cht{border-radius:0!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
:root[data-ui="d2"] .dpm{background:rgba(9,11,15,.86)!important;border:1px solid rgba(255,255,255,.22)!important;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
:root[data-ui="d2"] .dps{background:rgba(9,11,15,.86)!important;border:1px solid rgba(255,255,255,.22)!important}
:root[data-ui="d2"] .dps button{border-radius:0!important;border:1px solid rgba(255,255,255,.3)!important;background:transparent!important;text-transform:uppercase;letter-spacing:.08em}
:root[data-ui="d2"] .dps button:hover{background:#f2f2f2!important;color:#111!important}
:root[data-ui="d2"] .dph h2{letter-spacing:.08em}
:root[data-ui="d2"] .dpt{background:transparent!important;border-bottom:1px solid rgba(255,255,255,.18)!important}
:root[data-ui="d2"] .chip,:root[data-ui="d2"] .tgs button,:root[data-ui="d2"] .dpsr button{text-transform:none!important;letter-spacing:0!important}
:root[data-ui="d2"] .dpt span{text-transform:uppercase;letter-spacing:.2em;font-size:11px}

/* ---- item pop-up: DIM look ---- */
.dpm{width:296px;background:#0c0d10;border:1px solid #5a5d65}
.dph{padding:8px 10px 7px}
.dph h2{font-size:17px;letter-spacing:.3px;font-weight:700}
.dph .pw{font-size:18px;font-weight:500}
.dph .r2{font-size:12px;opacity:.85}
.dpt{gap:0;padding:0;background:#000;border-bottom:1px solid #26282d}
.dpt span{flex:1;text-align:center;font-size:12px;letter-spacing:0;text-transform:none;color:#fff;padding:8px 0 6px;border-bottom:2px solid transparent;opacity:.75}
.dpt span.on{opacity:1;border-bottom-color:#fff}
.dpn{padding:7px 10px;font-size:12px;font-weight:700;color:#fff;border-bottom:0}
.dpss{padding:4px 10px 6px}
.dpsb{grid-template-columns:78px 30px 14px 1fr;gap:5px;margin:2px 0;font-size:12px;color:#fff;align-items:center}
.dpsb>span:first-child{text-align:right;color:#e3e5e8}
.dpsb.pri>span:first-child,.dpsb.pri>b{font-weight:800}
.dpsb b{font-weight:500;text-align:right}
.dpsb>i{display:block;width:14px;height:14px;font-style:normal}
.dpsb .dpsi{width:12px;height:12px;margin:0;vertical-align:top;display:block;opacity:.9}
.dpsb .dpbar{height:14px;background:#2c2e33}
.dpsb .dpbar i{background:#fff}.dpsb .dpbar i.mb{background:#4aa3c9}.dpsb .dpbar i.mwb{background:#e8a53a}
.dpsb.tot{border-top:0;margin-top:4px;padding-top:0}
.dpsb.tot>b{text-decoration:underline;text-underline-offset:3px}
.dpsb.tot .tbd{font-size:12px;color:#fff;white-space:nowrap}.dpsb.tot .tbd u{text-decoration:none}.dpsb.tot .bl{color:#4aa3c9}.dpsb.tot .or{color:#e8a53a}
.dpen{display:block;margin:8px 10px 6px;padding:0}
.dpen b{display:block;font-size:12px;font-weight:700;margin-bottom:3px;color:#fff}
.dpen div{display:flex;gap:2px}
.dpen i{flex:1;height:11px;border:1px solid #fff;background:none;transform:none;border-radius:0}
.dpen i.u{background:#fff;border-color:#fff}
.dpar{display:flex;align-items:center;gap:10px;margin:10px 10px 8px;padding:0;color:#9a9ea6}
.dpar .dpi0{width:32px;height:32px;flex:none}.dpar .dpi0 img{width:32px;height:32px;filter:brightness(0) invert(1)}
.dpar b{font-size:13px;font-weight:500;color:#fff}
.dpar span{font-size:12px;color:#8d9199}
.dpset{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 10px}
.dpill{display:flex;align-items:center;gap:6px;background:#23262c;padding:6px 7px;font-size:11px;color:#fff;min-width:0;cursor:default}
.dpill .dpi0{width:20px;height:20px;border-radius:50%;background:#35566f;border:1px solid #8cb4d6;flex:none;overflow:hidden}.dpill .dpi0 img{width:100%;height:100%;display:block}
.dpill b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dph5{margin:8px 10px 3px;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:#c8cbd0;font-weight:500}
.dpmr{gap:5px;padding:2px 10px 4px;border-top:0}
.dpmr div{width:32px;height:32px;background:#16181c;border:1px solid #6a6d75}
.dpmr div.tun{border-color:#e8a53a}
.dpmr.cos div{border-color:#6f4f8a}
.dps .dpe{margin:2px 0;font-size:10px;color:#8b8f97;line-height:1.3}
.dps .stq{display:flex;gap:3px}.dps .stq input{width:100%;min-width:0;height:24px;margin:0;padding:0 4px;font-size:11px;background:#0e1013;border:1px solid #33363c;color:#fff;box-sizing:border-box}.dps .stq button{width:auto}
.dp.sc .dps{width:40px}.dp.sc .dps .lbl,.dp.sc .dps h6,.dp.sc .dps .dpe,.dp.sc .dps .stq{display:none}.dp.sc .dps .tgs{grid-template-columns:1fr}.dp.sc .dps .dpsr{flex-direction:column}.dp.sc .dps button{justify-content:center;padding:0!important}.dp.sc .dps .ic{width:auto;font-size:11px;font-weight:700}.dp.sc .dps hr{display:block;width:100%;border:0;border-top:1px solid #33363c;margin:3px 0}.dps hr{display:none}
@media (max-width:639px){.dpm{width:min(262px,calc(100vw - 110px))}}
`;
  document.head.appendChild(stp);
  const st3 = document.createElement('style');
  st3.textContent = `
/* inventory width, vault grouping, vault header */
.inv{grid-template-columns:repeat(var(--iw,3),var(--t))}
.dgrid{grid-template-columns:repeat(var(--n),calc(var(--t)*(var(--iw,3) + 1.9) + 10px)) minmax(240px,1fr)}
.dgrid.under{grid-template-columns:repeat(var(--n),calc(var(--t)*(var(--iw,3) + 1.9) + 10px))}
.dgrid.under .dc.v,.dgrid.under .ch.vlt{grid-column:1/-1}
.dc.v.under{padding-top:0}
.dh.vlt{flex-direction:column;align-items:stretch!important;justify-content:center;gap:5px!important;background:linear-gradient(90deg,#2b2e34,rgba(0,0,0,0) 92%)}
.dh.vlt .vtp{display:flex;align-items:center;gap:8px;min-width:0}
.dh.vlt .vtp .pw{margin-left:auto!important}
.dh.vlt .vcur{padding:0;gap:1px 14px;font-size:11.5px;color:#cfd2d8;text-shadow:none}
.dh.vlt .vcur img{width:14px;height:14px}
.dc.v.grouped{display:block}
/* each character cell stretches to the height of its row (set by the tall vault cell), so the empty space under a character's items is a drop zone too */
.dgrid>.dc{align-self:stretch}
.vg{margin:0 0 12px}.vg:last-child{margin-bottom:0}
.vgl{display:flex;align-items:center;gap:8px;margin:0 0 5px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9da1a8}
.vgl::after{content:"";flex:1;height:1px;background:var(--g-line)}
.vgt{display:flex;flex-wrap:wrap;gap:calc(var(--t)*.2)}
/* settings page */
#settings{--t:var(--gt-t,44px)}
:root[data-gsec="settings"] main{max-width:none!important;padding:14px 16px 40px!important}
#settings.on{max-width:1600px!important;width:100%;box-sizing:border-box;margin:0 auto}
#settings .scols{display:flex;gap:16px;align-items:flex-start}#settings .scol{flex:1 1 0;min-width:0}
#settings .sg{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px}#settings .th{padding:6px 6px 7px;font-size:12.5px}#settings .th i{height:20px;margin-bottom:5px}
#settings .uis{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
#settings .setgrid{display:contents}
#settings .card{max-width:none;margin:0 0 16px;break-inside:avoid;padding:14px 18px}
#settings .card h2{padding-bottom:8px;margin-bottom:4px;border-bottom:1px solid var(--g-line)}
/* saved sets: opened from the button in the top bar */
#vlo summary{display:none}
#vlo[open]{background:var(--g-solid);border:1px solid var(--g-line);padding:6px 12px 10px;margin:0 0 10px}
.pvw{display:flex;gap:calc(var(--t)*.2);justify-content:center;flex-wrap:wrap;padding:12px 8px;margin:8px 0 4px;background:#0e0f11;border:1px solid var(--g-line)}
.sx{display:flex;align-items:center;gap:18px;padding:11px 0;border-top:1px solid var(--g-line)}
.sc h2+.sx,.pvw+.sx,.sg+.sx{border-top:0}
.sx .sxt{flex:1;min-width:0}
.sx .sxt b{display:block;font-weight:600;font-size:14.5px;color:#eceef0}
.sx .sxt small{display:block;margin-top:3px;font-size:12px;line-height:1.45;color:#8d9097}
.sx .sxc{display:flex;align-items:center;gap:10px;flex:none}
.sx.wide{flex-direction:column;align-items:stretch;gap:9px}
.sx.wide .sxc{flex-direction:column;align-items:stretch;gap:6px}
.sx select{width:auto;min-width:170px;margin:0;padding:6px 8px;font-size:14px;background:var(--g-deep,#101113);border:1px solid #3a3d43;color:#e6e7ea;border-radius:3px}
.sx input[type=range]{width:180px;margin:0;padding:0;accent-color:var(--g-accent)}
.sx output{min-width:46px;text-align:right;color:#aab0b8;font-size:13px}
.sx input[type=color]{width:46px;height:30px;padding:0;margin:0;background:none;border:1px solid #3a3d43}
.tgl{position:relative;display:inline-block;width:42px;height:24px;flex:none;cursor:pointer}
.tgl input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}
.tgl i{position:absolute;inset:0;border-radius:12px;background:#3a3d43;transition:background .15s}
.tgl i::after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#cfd2d8;transition:transform .15s,background .15s}
.tgl input:checked+i{background:var(--g-accent2,#2b6a9b)}
.tgl input:checked+i::after{transform:translateX(18px);background:var(--g-on-accent,#fff)}
.tgl input:focus-visible+i{outline:2px solid var(--g-accent);outline-offset:2px}
.rad{display:flex;align-items:center;gap:8px;font-size:14px;color:#dfe1e4;cursor:pointer;padding:2px 0}
.rad input{width:16px;height:16px;margin:0;accent-color:var(--g-accent)}
.cord{display:flex;flex-direction:column;gap:4px;margin:4px 0 0 24px}
.cord>div{display:flex;align-items:center;gap:6px;font-size:13px;color:#cfd2d8}.cord span{flex:1}
.cord button{padding:1px 8px!important;font-size:11px}
.sortl{display:flex;flex-direction:column;border:1px solid var(--g-line);background:#0e0f11}
.sri{display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.05);cursor:grab;color:#8d9097;font-size:14px}
.sri:last-child{border-bottom:0}
.sri.on{color:#eceef0}
.sri .grip{color:#5f636b;letter-spacing:-3px;font-size:13px;user-select:none}
.sri label{flex:1;display:flex;align-items:center;gap:8px;cursor:pointer}
.sri input{width:16px;height:16px;margin:0;accent-color:var(--g-accent)}
.sri button{padding:0 8px!important;font-size:11px;height:22px}
.cstr{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.cstr .chip{padding:2px 7px;font-size:11.5px}.cstr{flex-wrap:nowrap!important}@media (max-width:520px){.cstr{flex-wrap:wrap!important}.cstr b{width:100%}}.cstr b{width:72px;flex:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#cfd2d8}
.chip{padding:3px 9px;font-size:12px;border:1px solid #3a3d43;background:var(--g-btn);color:#9da1a8;border-radius:11px;cursor:pointer;font-family:inherit}
.chip.on{background:var(--g-accent2,#2b4a6b);border-color:#8fb3d9;color:var(--g-on-accent,#fff)}
.clr{display:block;margin:8px 0 0;padding:8px 10px;border-left:3px solid #6aa6e0;background:rgba(106,166,224,.07);font-size:13px;line-height:1.5;color:#d3d7dd}
.clr small{display:block;letter-spacing:1.5px;text-transform:uppercase;font-size:10px;color:#8fb3d9;margin-bottom:3px}
.clr p{margin:0 0 4px}
.cust{display:flex;align-items:center;gap:8px;font-size:13px;color:#cfd2d8}.cust b{color:#fff}
`;
  document.head.appendChild(st3);

  const st4 = document.createElement('style');
  st4.textContent = `
/* character headers, vault and postmaster: laid out like DIM */
.dgrid{row-gap:4px}
/* titles in their in-game colours: purple, gold once gilded */
.chnm small.ttl{color:#d9a6ff!important;text-shadow:0 1px 2px rgba(0,0,0,.8)}.chnm small.ttl.gld{color:#f1cc4f!important}
.dgrid>*{min-width:0}
.ch{display:flex;flex-direction:column;gap:8px;min-width:0;padding-bottom:6px}
.chb{display:flex;align-items:stretch;gap:3px}
.cht{position:relative;flex:1;min-width:0;height:46px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px 0 9px;background:linear-gradient(90deg,var(--cc,#3a3d43),rgba(0,0,0,0) 92%) left center/cover;border:0;text-shadow:0 1px 3px #000;overflow:hidden}
.cht .chn{position:absolute;left:0;top:0;width:0;height:0;border-style:solid;border-width:9px 9px 0 0;border-color:#e0542c transparent transparent transparent}
.chnm{display:flex;flex-direction:column;min-width:0;line-height:1.05}
.chnm b{font-size:18px;font-weight:600;letter-spacing:.2px;text-transform:none;color:#fff;white-space:nowrap}
.chnm small{display:flex;align-items:center;gap:4px;margin-top:2px;font-size:12px;font-style:italic;color:#ececec;white-space:nowrap}
.chnm small .sl{width:11px;height:11px;color:#f1d98a;flex:none}
.chp{display:inline-flex;align-items:center;gap:3px;font-size:21px;font-weight:500;color:#f3d97a;white-space:nowrap}
.dgrid.phone{grid-template-columns:minmax(0,1fr)!important}.dgrid.phone .dc.v,.dgrid.phone .ch.vlt{grid-column:1/-1}
.phsw{grid-column:1/-1;display:flex;gap:6px;margin:0 0 8px;position:sticky;top:calc(48px + env(safe-area-inset-top,0px));z-index:6;padding:6px 0;background:var(--g-bg,#101216)}
#vault .phsw button{flex:1 1 0!important;width:auto!important;height:auto!important;min-height:48px;display:flex!important;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px!important;border-radius:10px!important;background:linear-gradient(90deg,var(--cc),rgba(0,0,0,.25))!important;border:1px solid rgba(255,255,255,.12)!important;color:#fff!important;text-transform:none!important;letter-spacing:0!important;opacity:.6;min-width:0}
.phsw button b{font-size:14px;font-weight:700;line-height:1.1}.phsw button span{display:inline-flex;align-items:center;gap:3px;color:#f3d97a;font-size:13px}.phsw button span svg{width:11px;height:11px}
#vault .phsw button.on{opacity:1;border-color:var(--g-accent,#7ab8e8)!important;box-shadow:0 0 0 1px var(--g-accent,#7ab8e8)}
.vrf{margin-left:10px;flex:none;width:30px;height:30px;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center;border-radius:50%!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.14)!important;color:#d6d9de!important;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.vrf:hover{background:rgba(255,255,255,.14)!important;color:#fff!important;border-color:var(--g-accent,#7ab8e8)!important}
.vrf.spin svg{animation:vrfspin .8s linear infinite}@keyframes vrfspin{to{transform:rotate(360deg)}}
.chp .lg{width:11px;height:14px;margin-top:2px}
.chm{width:26px;flex:none;border:0;border-radius:0;background:rgba(6,6,8,.94);color:#e8e8ec;font-size:19px;line-height:1;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.chm:hover{background:#1c1d22;color:#fff}
.chr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;min-height:30px}
.chx{display:inline-flex;align-items:center;gap:8px;font-size:21px;font-weight:500;color:#f2f3f5}
.chx .hm{width:19px;height:19px;color:#c9ccd2}
.chs{display:flex;gap:6px}
.cbn{width:28px;height:28px;border-radius:50%;border:2px solid #d3dbe9;background:#0b1118;display:flex;align-items:center;justify-content:center;box-sizing:border-box;flex:none}
.cbn img{width:18px;height:18px;display:block}
.cst{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px 4px;padding:0 3px;font-size:12px;color:#e9ebee;align-items:center;max-width:100%;overflow:hidden}
.cst span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;min-width:0;font-variant-numeric:tabular-nums}
.cst img{width:13px;height:13px;display:block;opacity:.92}
.cst em{font-style:normal;font-size:10px;color:#9da1a8}
.ch.vlt .cht.vh{justify-content:flex-start;gap:10px;background:linear-gradient(90deg,#34373e,rgba(0,0,0,0) 94%)}
.vlg{width:26px;height:26px;color:#dfe2e8;flex:none}
.vcg{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:8px 20px;padding:0 4px;font-size:12px;color:#e3e5e9}
.vcg span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.vcg img{width:15px;height:15px;display:block}
.vcg .hm{width:14px;height:14px;color:#c9ccd2}
#chpop{background:#1b1c20;border:1px solid var(--g-line);box-shadow:0 6px 20px rgba(0,0,0,.6);padding:4px;min-width:230px}
#chpop button{display:block;width:100%;text-align:left;background:none;border:0;color:#e6e7ea;font-size:13px;padding:8px 10px;cursor:pointer;border-radius:0}
#chpop button:hover{background:#2c2e34}
#chpop.sqm{width:300px;max-height:70vh;overflow:auto}#chpop .sqh{font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:#8b8f97;padding:8px 10px 3px}#chpop .sqr{display:flex;align-items:center}#chpop .sqr button{flex:1;font-family:ui-monospace,Consolas,monospace;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#chpop .sqr b{cursor:pointer;color:#8b8f97;padding:4px 10px;font-weight:400}#chpop .sqr b:hover{color:#fff}
.vbar .ib.on{background:var(--g-accent2,#2b4a6b);color:var(--g-on-accent,#fff);border-color:#8fb3d9}
#junkm{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px}#junkm .jk{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);width:min(720px,100%);max-height:86vh;overflow:auto;padding:14px 18px;box-shadow:0 10px 40px rgba(0,0,0,.6)}#junkm .jkh{display:flex;align-items:baseline;gap:12px}#junkm .jkh b{font-size:16px;color:#fff}#junkm .jkh button{margin-left:auto}#junkm .jkl{display:flex;flex-direction:column;gap:4px;margin:8px 0}#junkm .jkr{display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;padding:4px;border:1px solid transparent;cursor:pointer}#junkm .jkr:hover{border-color:var(--g-line,#3a3d43);background:rgba(255,255,255,.03)}#junkm .jkr .vt{--t:48px;width:48px;height:48px;pointer-events:none}#junkm .jkr small{display:block;color:#b9bec6;font-size:12px}#junkm .jkb{position:sticky;bottom:-14px;background:var(--g-panel,#1a1c20);padding:10px 0;margin:0}
.pmh{display:flex;align-items:baseline;gap:6px;margin:16px 0 0;min-height:18px}
.pmh .dsec{display:inline-flex;grid-column:auto;margin:0;font-size:13px;letter-spacing:1.5px;color:#d9dce1}
.pmh .pmn{font-size:13px;letter-spacing:.5px;color:#d9dce1}
.pmc{display:flex;flex-direction:column;gap:6px;padding-bottom:10px;align-items:flex-start}
.pml{display:flex;gap:3px;flex-wrap:nowrap;width:100%}
.pms{display:block;flex:1 1 0;min-width:0;max-width:27px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.07),rgba(255,255,255,.035) 70%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)}
.pmc .row1{display:flex;gap:calc(var(--t)*.2);flex-wrap:wrap;margin-top:2px}
.pmc .row1 .vt{position:relative}
.pmw{position:absolute;top:-3px;right:-3px;color:#f3c42c;font-size:13px;line-height:1;text-shadow:0 0 2px #000;font-weight:400}

.vt.eng{background:none!important;border:0!important;box-shadow:none!important}
.vt.eng img:first-child{filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
.vt.full .ft{background:#d6454b!important;color:#fff!important}
.pml{align-items:center}.pml .vt{flex:none;width:27px!important;height:27px!important;margin:0}.pml .vt .ft,.pml .vt .br,.pml .vt .tp{display:none}
.xg2{margin-top:10px}
.vcm{position:relative;cursor:default}
.vcm .mpop{display:none;position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:6px;z-index:70;width:380px;max-width:92vw;background:#17181c;border:1px solid var(--g-line);box-shadow:0 8px 24px rgba(0,0,0,.65);padding:8px 12px 12px;white-space:normal}
.vcm:hover .mpop{display:block}
.mpop h4{margin:0 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#fff;border-bottom:1px solid #3a3d44;padding-bottom:6px}
.mpg{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}
.mpg div{display:flex;align-items:center;gap:6px;font-size:12px;color:#e3e5e9;min-width:0}.mpg b{min-width:28px;text-align:right;font-weight:600}.mpg img{width:18px;height:18px}.mpg span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Tighter spacing (Settings): clearly smaller gaps between items, buckets and sections, in every theme (kept last so it wins) */
:root[data-gcompact="1"] .dc,:root[data-gcompact="1"] .dc.v,:root[data-gcompact="1"] .xg,:root[data-gcompact="1"] .ltiles{gap:2px!important}
:root[data-gcompact="1"] .dc{padding:1px 0 3px!important;min-height:0!important}
:root[data-gcompact="1"] .dsec{margin:4px 0 2px!important}
:root[data-gcompact="1"] .dgrid{column-gap:8px!important;row-gap:0!important}
/* Emblems: the name starts after the emblem's own picture (its left square), like DIM, so both stay readable */
:root .ch.em .cht{padding-left:52px!important}
:root[data-ui="dim"] .ch.em .cht{padding-left:46px!important}
:root[data-ui="d2"] .ch.em .cht{padding-left:66px!important}
`;
  document.head.appendChild(st4);


  // ---------------- settings, update toast ----------------
  const DEFSET = { theme: 'dim', accent: '#7ab8e8', accentUser: '', bgdim: 45, tile: 44, scale: 100, power: true, emblems: true, postmaster: true, compact: false, sort: 'rarity',
    ui: 'pf', ornaments: true, locksync: false, clarity: 'both', single: false, charsort: 'recent', charorder: [], vgroup: 'none', armorsep: false, vaultunder: false, invw: 3, hidecollect: false, pmbadge: true, farmspaces: 3, sortkeys: null, cst: { 0: [0, 0, 0, 0, 0, 0], 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0] } };
  // Item sort rules, like DIM: a checked list in order. d = 1 normal, -1 flipped.
  const SORTK = [['power', 'Power level'], ['name', 'Name'], ['type', 'Type'], ['rarity', 'Rarity'], ['stack', 'Stack size'], ['class', 'Required class'], ['tag', 'Tag (favorite, keep, junk, infuse, archive)'], ['season', 'Season'], ['dmg', 'Damage type'], ['champ', 'Anti-champion type'], ['mw', 'Masterworked'], ['crafted', 'Crafted'], ['tier', 'Tier']];
  const sortFromOld = (m) => { const on = m === 'power' ? ['power', 'rarity', 'name'] : m === 'name' ? ['name', 'power'] : m === 'tag' ? ['tag', 'power', 'rarity', 'name'] : ['rarity', 'power', 'name']; return [...on.map((k) => ({ k, d: 1, on: true })), ...SORTK.filter((q) => !on.includes(q[0])).map((q) => ({ k: q[0], d: 1, on: false }))]; };
  const fresh = () => JSON.parse(JSON.stringify(DEFSET));
  let SET = fresh();
  try { SET = { ...fresh(), ...(JSON.parse(localStorage.getItem('gt_settings')) || {}) }; } catch (e) { /* defaults */ }
  const fixSort = () => {
    const ok = Array.isArray(SET.sortkeys) && SET.sortkeys.every((q) => q && SORTK.some((z) => z[0] === q.k));
    if (!ok) SET.sortkeys = sortFromOld(SET.sort);
    SORTK.forEach((z) => { if (!SET.sortkeys.some((q) => q.k === z[0])) SET.sortkeys.push({ k: z[0], d: 1, on: false }); });
    SET.sortkeys = SET.sortkeys.map((q) => ({ k: q.k, d: q.d === -1 ? -1 : 1, on: !!q.on }));
    if (!SET.cst || typeof SET.cst !== 'object') SET.cst = { ...DEFSET.cst };
    [0, 1, 2].forEach((i) => { if (!Array.isArray(SET.cst[i]) || SET.cst[i].length !== 6) SET.cst[i] = [0, 0, 0, 0, 0, 0]; });
    SET.invw = Math.max(3, Math.min(6, +SET.invw || 3));
    if (!Array.isArray(SET.charorder)) SET.charorder = [];
  };
  fixSort();
  const saveSet = () => { try { localStorage.setItem('gt_settings', JSON.stringify(SET)); } catch (e) { /* storage unavailable */ } };
  // ---- themes ----
  // Each theme is a colour family (hue h, saturation s) that fills the panel, button and line colours. Some also paint a background:
  // glow = coloured light behind the page, img = a Destiny 2 picture bundled in app/themes, an = slow drift.
  const rg = (at, h, s, l, a, w, ht) => `radial-gradient(${Math.round((w || 900) * 1.3)}px ${Math.round((ht || 520) * 1.4)}px at ${at},hsl(${h} ${s}% ${l}% / ${Math.min(.8, +(a * 1.7).toFixed(2))}),transparent 72%)`;
  const TGRP = { b: 'Beta', c: 'Classic', e: 'Gradient', s: 'Shader inspired', d: 'Destiny 2 art' };
  const TL = [
    // id, name, group, hue, sat, accent, glow layers, extras
    // Beta: the experimental theme (more of it is in app/beta.css). Expect it to change a lot.
    ['beta', 'Beta', 'b', 245, 32, '#5eead4', [rg('12% -12%', 250, 90, 62, .30, 1200, 620), rg('100% 110%', 170, 85, 52, .22), 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px) 0 0/44px 44px', 'linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px) 0 0/44px 44px']],
    ['solar', 'Solar', 'e', 22, 35, '#ff8a3d', [rg('85% 105%', 24, 95, 50, .38), rg('8% -8%', 42, 95, 55, .16)]],
    ['arc', 'Arc', 'e', 207, 45, '#6fc7ff', [rg('50% -10%', 205, 100, 60, .30, 1100, 560), rg('100% 100%', 215, 90, 55, .14)]],
    ['stasis', 'Stasis', 'e', 212, 40, '#7fe0ff', [rg('80% -5%', 190, 90, 70, .25), rg('0% 100%', 225, 80, 60, .18)]],
    ['strand', 'Strand', 'e', 150, 38, '#3fe08a', [rg('10% 110%', 150, 80, 45, .30), rg('90% -10%', 165, 70, 50, .20)]],
    ['prism', 'Prismatic', 'e', 265, 30, '#c9a6ff', [rg('15% 20%', 280, 90, 60, .30), rg('85% 25%', 185, 90, 55, .26), rg('50% 95%', 45, 95, 58, .22)], { an: 1 }],
    ['aurora', 'Aurora', 'e', 170, 30, '#6dffc0', [rg('20% 10%', 160, 95, 50, .30, 1000, 500), rg('80% 30%', 280, 85, 60, .26), rg('50% 100%', 200, 90, 50, .18)], { an: 1 }],
    ['nebula', 'Nebula', 'e', 290, 32, '#ff7ad9', [rg('25% 30%', 320, 90, 55, .30), rg('75% 70%', 230, 90, 60, .28), rg('55% 0%', 270, 90, 55, .18)], { an: 1 }],
    ['midnight', 'Midnight', 'e', 232, 38, '#8fa0ff', [rg('50% -15%', 235, 90, 60, .28, 1200, 600)]],
    ['synth', 'Synthwave', 'e', 275, 40, '#ff5fa8', ['linear-gradient(180deg,transparent 55%,hsl(320 90% 50% / .20) 100%)', rg('50% 105%', 20, 100, 55, .28, 1100, 420), rg('50% -10%', 270, 90, 55, .20)]],
    ['dawning', 'Dawning Frost', 'e', 212, 38, '#ffd27a', [rg('50% -10%', 205, 80, 60, .24, 1200, 560), rg('90% 110%', 38, 95, 60, .24)]],
    ['slate', 'Slate', 'e', 215, 12, '#9fb0c4', null],
    // Shader inspired: dyed-gear looks. Saturated chrome and a real surface (metal sheen, stripes, mesh, spores, swirl), not a soft glow.
    ['gilded', 'Gilded Cabal', 's', 42, 62, '#f2c14e', ['linear-gradient(118deg,transparent 18%,hsl(46 100% 72% / .20) 34%,transparent 48%,hsl(40 100% 60% / .10) 66%,transparent 80%)', 'repeating-linear-gradient(135deg,hsl(42 90% 55% / .09) 0 2px,transparent 2px 16px)', 'linear-gradient(160deg,hsl(42 90% 42% / .42),hsl(30 70% 8% / .6) 70%)']],
    ['legion', 'Crimson Legion', 's', 355, 62, '#ff4b3e', ['repeating-linear-gradient(60deg,hsl(355 90% 55% / .10) 0 1px,transparent 1px 18px)', 'repeating-linear-gradient(-60deg,hsl(355 90% 55% / .10) 0 1px,transparent 1px 18px)', 'linear-gradient(180deg,transparent 40%,hsl(355 90% 40% / .38))', rg('0% 0%', 0, 90, 45, .18)]],
    ['hive', 'Hive Rot', 's', 112, 50, '#a6e24c', ['radial-gradient(circle at 18% 28%,hsl(112 70% 32% / .40) 0 5%,transparent 6%)', 'radial-gradient(circle at 72% 62%,hsl(95 70% 30% / .38) 0 7%,transparent 8%)', 'radial-gradient(circle at 44% 86%,hsl(280 50% 30% / .40) 0 6%,transparent 7%)', 'radial-gradient(circle at 86% 14%,hsl(112 70% 32% / .34) 0 4%,transparent 5%)', rg('20% 105%', 105, 80, 30, .30)]],
    ['vex', 'Vex Chrome', 's', 196, 26, '#c3eef8', ['linear-gradient(105deg,transparent 22%,hsl(190 80% 88% / .13) 36%,transparent 50%)', 'linear-gradient(105deg,transparent 58%,hsl(190 80% 88% / .08) 70%,transparent 82%)', 'repeating-linear-gradient(90deg,hsl(190 40% 90% / .045) 0 1px,transparent 1px 3px)', 'linear-gradient(180deg,hsl(196 30% 40% / .26),hsl(196 30% 8% / .5))']],
    ['taken', 'Taken Dusk', 's', 178, 58, '#35e3cf', ['conic-gradient(from 20deg at 50% 45%,hsl(178 85% 32% / .30),transparent 22%,hsl(285 60% 32% / .26) 48%,transparent 72%,hsl(178 85% 32% / .30))', 'radial-gradient(60% 55% at 50% 45%,transparent 30%,hsl(178 60% 4% / .75) 100%)']],
    ['fallen', 'Fallen Rust', 's', 17, 60, '#ff7b2e', ['repeating-linear-gradient(45deg,hsl(17 95% 48% / .13) 0 14px,transparent 14px 30px)', 'linear-gradient(0deg,hsl(17 90% 38% / .40),transparent 60%)', rg('100% 0%', 195, 70, 40, .14)]],
    ['dreaming', 'Dreaming Pastel', 's', 292, 46, '#f3a9ff', ['radial-gradient(circle,hsl(300 100% 90% / .18) 0 1.5px,transparent 2px)', 'linear-gradient(135deg,hsl(300 90% 72% / .30),hsl(185 90% 68% / .26) 45%,hsl(55 95% 74% / .24))'], { an: 1 }],
    ['a_lantern', 'Lantern Gate', 'd', 22, 38, '#ff8a4a', [], { img: 'lantern-gate' }],
    ['a_blossom', 'Blossom Tower', 'd', 235, 36, '#e070b0', [], { img: 'blossom-tower' }],
    ['a_memorial', 'Memorial Garden', 'd', 228, 30, '#8aa8ff', [], { img: 'memorial-garden' }],
    ['a_rust', 'Rust Yard', 'd', 18, 34, '#e08a50', [], { img: 'rust-yard' }],
    ['a_europa', 'Lunar Frost', 'd', 205, 30, '#9ad8ff', [], { img: 'europa-frost' }],
    ['a_spire', 'Crimson Spire', 'd', 355, 30, '#ff5a5a', [], { img: 'crimson-spire' }],
    ['a_mist', 'Cube Mist', 'd', 215, 25, '#9fc3e8', [], { img: 'cube-mist' }],
    ['a_grove', 'Aurora Grove', 'd', 160, 30, '#6fe0b0', [], { img: 'aurora-grove' }],
    ['a_vortex', 'Vortex', 'd', 215, 40, '#7fb4ff', [], { img: 'vortex' }],
    ['a_lake', 'Emerald Lake', 'd', 175, 35, '#4fd0b8', [], { img: 'emerald-lake' }],
    ['a_gardens', 'Hanging Gardens', 'd', 125, 28, '#8fd070', [], { img: 'hanging-gardens' }],
  ].map(([id, n, g, h, s, a, glow, x]) => ({ id, n, g, h, s, a, glow, ...(x || {}) }));
  const OLD = [['dim', 'DIM Dark', '#1b1c1f'], ['black', 'Black', '#000'], ['blue', 'Destiny Blue', '#121c2a'], ['ember', 'Ember', '#2a1d16'], ['void', 'Void', '#241a30'], ['forest', 'Forest', '#1a2a1d']];
  const THEMES = OLD.map(([id, n, c]) => [id, n, c]).concat(TL.map((t) => [t.id, t.n, `hsl(${t.h} ${t.s}% 12%)`]));
  const hs = (t, l, a) => `hsl(${t.h} ${t.s}% ${l}%${a ? ' / ' + a : ''})`;
  const hasBg = (t) => !!(t.img || (t.glow && t.glow.length));
  (() => {
    const cs = TL.map((t) => {
      const gx = hasBg(t), fb = t.glow && t.glow.length ? t.glow.join(',') : rg('50% -10%', t.h, 80, 50, .30, 1100, 560) + ',' + rg('100% 100%', t.h, 70, 40, .2);
      const layers = t.img
        ? `linear-gradient(180deg,${hs(t, 4, 'calc(var(--g-dim,.45) - .15)')},${hs(t, 4, 'min(.97,calc(var(--g-dim,.45) + .12))')}),url("themes/${t.img}.jpg"),${fb}`
        : (t.glow ? t.glow.join(',') : 'none');
      return `:root[data-gt="${t.id}"]{--g-bg:${hs(t, 5)};--g-panel:${hs(t, 9.5, gx ? .74 : '')};--g-col:${hs(t, 7.5, gx ? .66 : '')};--g-line:${hs(t, 19)};--g-deep:${hs(t, 4.5, gx ? .8 : '')};--g-btn:${hs(t, 13)};--g-solid:${hs(t, 9.5)};--g-layers:${layers}}`;
    }).join('\n');
    const el = document.createElement('style'); el.id = 'gtth';
    el.textContent = cs + `
:root[data-gx="1"] body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:var(--g-layers);background-size:cover;background-position:center;background-repeat:no-repeat}
:root[data-gx="1"][data-gan="1"] body::before{inset:-25%;will-change:transform;animation:gtdrift 48s ease-in-out infinite alternate}
@keyframes gtdrift{from{transform:translate3d(-4%,-3%,0) scale(1.04)}to{transform:translate3d(4%,3%,0) scale(1.16)}}
@media (prefers-reduced-motion:reduce){:root[data-gx="1"][data-gan="1"] body::before{animation:none;inset:0}}
:root[data-gx="1"][data-dark="1"] header,:root[data-gx="1"][data-dark="1"] nav{background:var(--g-panel)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
:root[data-gx="1"] #vault .card,:root[data-gx="1"] #loadouts .card,:root[data-gx="1"] #triumphs .card,:root[data-gx="1"] #organizer .card,:root[data-gx="1"] #optimizer .card,:root[data-gx="1"] #settings .card,:root[data-gx="1"] section.gdark .card{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.thh{grid-column:1/-1;margin:10px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--mute)}.thh:first-child{margin-top:0}`;
    document.head.appendChild(el);
  })();
  const tById = (id) => TL.find((t) => t.id === id);
  function applySet() {
    const r = document.documentElement, t = tById(SET.theme);
    if (SET.theme === 'dim') r.removeAttribute('data-gt'); else r.setAttribute('data-gt', SET.theme);
    r.setAttribute('data-gx', t && hasBg(t) ? '1' : '0'); r.setAttribute('data-gan', t && t.an ? '1' : '0');
    r.style.setProperty('--g-dim', String(Math.max(.25, Math.min(.9, (+SET.bgdim || 45) / 100))));
    r.setAttribute('data-ui', ['pf', 'd2', 'dim', 'beta'].includes(SET.ui) ? SET.ui : 'pf');
    r.setAttribute('data-gcompact', SET.compact ? '1' : '0'); r.setAttribute('data-gpower', SET.power ? '1' : '0');
    r.style.setProperty('--gt-t', SET.tile + 'px'); r.style.setProperty('--gt-z', SET.scale / 100);
    // The accent's dark partner (selected tabs, switches, chips). Mixing a light colour like yellow with black turns it olive,
    // so light accents are used as they are with dark text on top, and darker accents get a deeper shade of the same hue.
    const ac = /^#[0-9a-f]{6}$/i.test(String(SET.accent)) ? SET.accent : '#7ab8e8', rgb = [1, 3, 5].map((i) => parseInt(ac.slice(i, i + 2), 16));
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }, lum = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const light = lum > 0.45, a2 = light ? ac : '#' + rgb.map((c) => Math.round(c * 0.62).toString(16).padStart(2, '0')).join('');
    r.style.setProperty('--g-accent', ac); r.style.setProperty('--g-accent2', a2); r.style.setProperty('--g-on-accent', light ? '#15171b' : '#ffffff');
    r.style.setProperty('--g-accent-soft', 'rgba(' + rgb.join(',') + ',.16)');
  }
  applySet();
  let UPD = { state: 'idle', current: '', canUpdate: false };
  const toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast);
  function drawToast() {
    const u = UPD;
    if (u.state === 'ready') { toast.innerHTML = 'Update ' + esc(u.version) + ' is ready. <button class="b" id="tinst">Restart to install</button>'; toast.classList.add('on'); const b = document.getElementById('tinst'); if (b) b.onclick = () => window.gt.updInstall(); }
    else if (u.state === 'downloading') { toast.textContent = 'Downloading update ' + (u.version || '') + ' ' + (u.pct || 0) + '%'; toast.classList.add('on'); }
    else toast.classList.remove('on');
  }
  const settingsSec = document.createElement('section'); settingsSec.id = 'settings'; settingsSec.className = 'gdark';
  document.querySelector('main').appendChild(settingsSec);
  const sBtn = document.createElement('button'); sBtn.textContent = 'Settings'; sBtn.dataset.t = 'settings'; sBtn.onclick = () => { const had = settingsSec.firstChild; if (!had) drawSettings(); show('settings'); if (had) requestAnimationFrame(() => setTimeout(drawSettings, 0)); }; nav.appendChild(sBtn);
  let WL = null, WLMSG = '', WLV = 0;
  const WLD = { wlurl: '', wltext: '' }; // what you typed or pasted, kept across redraws (update checks redraw this page)
  const WLPRE = [['Voltron (big community list)', 'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt'], ['Choosy Voltron (stricter)', 'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/choosy_voltron.txt']];
  const wlClean = (er) => String((er && er.message) || er).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
  const wlLoad = () => { if (window.gt && window.gt.wlGet) window.gt.wlGet().then((o) => { WL = o && o.lists && o.lists.length ? o : null; WLV++; drawSettings(); if (window.__gtRender) window.__gtRender(); }).catch(() => {}); };
  const wcache = {};
  // 1 = wish list roll (thumbs up), -1 = trash roll (thumbs down), 0 = no opinion.
  // Also keeps the notes, tags and the perks that appear in a wish list roll for this weapon.
  function wish(x) {
    const r = wish0(x), T = window.__gtt, h = T && T.hit ? T.hit(x) : null;
    if (!h) return r;
    return { v: 1, notes: ['Target: ' + h.name].concat(r.v === 1 ? r.notes : []).slice(0, 3), tags: r.tags, perks: new Set([...r.perks, ...h.perks]) };
  }
  function wish0(x) {
    if (!WL || !x.pk) return { v: 0, notes: [], tags: [], perks: new Set() };
    const k = x.id + ':' + WLV; if (wcache[k]) return wcache[k];
    const P = new Set(x.pk), good = [], bad = [], tg = [], perks = new Set();
    for (const r of [...(WL.rolls[x.h] || []), ...(WL.rolls['*'] || [])]) {
      if (typeof r[0] === 'string') r[0] = r[0] ? r[0].split(',').map(Number) : [];
      if (r[0].every((h) => P.has(h))) { (r[2] ? bad : good).push(typeof r[1] === 'number' ? (WL.notes || [])[r[1]] || '' : r[1]); if (r[3]) tg.push(...r[3].split(',')); if (!r[2]) r[0].forEach((h) => { perks.add(h); const nm = D && D.pn && D.pn[h]; if (nm) perks.add(nm); }); }
    }
    const v = good.length ? 1 : bad.length ? -1 : 0;
    const seenN = new Set(), short = (v === 1 ? good : bad).filter(Boolean).filter((n) => { const key = n.slice(0, 50); if (seenN.has(key)) return false; seenN.add(key); return true; }).map((n) => (n.length > 170 ? n.slice(0, 167) + '...' : n));
    return (wcache[k] = { v, notes: short.slice(0, 2), tags: [...new Set(tg)], perks });
  }
  const wlAgo = (t) => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 120 ? m + ' minutes ago' : m < 2880 ? Math.round(m / 60) + ' hours ago' : Math.round(m / 1440) + ' days ago'; };
  const WL_OK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4caf50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
  const WL_BAD = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#e0a030" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v9M12 18.5v.5"/></svg>';
  function wlCard() {
    const lists = (WL && WL.lists) || [];
    const have = new Set(lists.map((l) => l.url).filter(Boolean));
    const rows = lists.map((l) => `<div class="wlr${l.err ? ' bad' : ''}"><span class="wlk" title="${l.err ? esc(l.err) : 'Loaded'}">${l.err ? WL_BAD : WL_OK}</span><div class="wlt"><b>${esc(l.title || (l.url ? l.url.split('/').pop() : 'Wish list'))}</b>${l.desc ? `<span>${esc(l.desc)}</span>` : ''}<small>${l.n} rolls &middot; ${l.url ? 'updated ' + wlAgo(l.at) : 'pasted or uploaded'}${l.err ? ' &middot; <i class="er">' + esc(String(l.err).replace(/\.$/, '')) + '. Using the saved copy.</i>' : ''}</small></div><button class="g" data-sa="wlrm" data-id="${esc(l.id)}" title="Remove this list">Remove</button></div>`).join('');
    return `<div class="card"><h2>Wish lists</h2><p class="mute">Weapons with a roll from one of your lists get a thumbs up in the vault and in the weapon's perk list, like DIM. Trash rolls get a thumbs down. Search with <code>is:wishlist</code>, <code>is:trashlist</code> or <code>wishlistnotes:word</code>. Lists are saved on ${GT_HERE} and linked ones refresh on their own every few hours.</p>
    ${lists.length ? `<div class="wll">${rows}</div><p class="mute">${WL.n} rolls in total from ${lists.length} list${lists.length === 1 ? '' : 's'}.</p>` : '<p class="mute"><b>No wish lists yet.</b> Add one below.</p>'}
    ${WLMSG ? `<p class="wlmsg${/^(Could not|Enter|Paste|Nothing|No |That|The |Wish|Failed|https)/.test(WLMSG) ? ' bad' : ''}">${esc(WLMSG)}</p>` : ''}
    <div class="sg">${WLPRE.map((p, i) => `<div class="th${have.has(p[1]) ? ' on' : ''}" data-wp="${i}">${have.has(p[1]) ? '&#10003; ' : '+ '}${esc(p[0])}</div>`).join('')}</div>
    <div class="sr"><label>Link</label><input id="wlurl" placeholder="https://.../wishlist.txt (one or several links)" value="${esc(WLD.wlurl)}" style="flex:1"><button class="g" data-sa="wlpl">Paste</button><button class="b" data-sa="wlload">Add list</button></div>
    <p><button class="g" data-sa="wlfile">Upload a file...</button> <button class="g" data-sa="wlrefresh">Refresh all</button> ${lists.length ? '<button class="g" data-sa="wlclear">Remove all</button>' : ''}<input type="file" id="wlfile" accept=".txt,text/plain" hidden></p>
    <textarea id="wltext" placeholder="Or paste wish list text here (lines starting with dimwishlist:)" style="width:100%;height:56px">${esc(WLD.wltext)}</textarea><p><button class="g" data-sa="wlpt">Paste from clipboard</button> <button class="g" data-sa="wlpaste">Add pasted text</button></p></div>`;
  }
  const CSTN = ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'];
  const NUMK = new Set(['invw', 'farmspaces']);
  function themeGrid() {
    const sw = (id, n, bg, on) => `<div class="th${on ? ' on' : ''}" data-th="${id}"><i style="background:${bg}"></i>${esc(n)}</div>`;
    let h = `<div class="thh">${TGRP.c}</div>` + THEMES.slice(0, OLD.length).map(([id, n, c]) => sw(id, n, c, SET.theme === id)).join('');
    ['b', 'e', 's', 'd'].forEach((g) => {
      h += `<div class="thh">${TGRP[g]}</div>`;
      TL.filter((t) => t.g === g).forEach((t) => {
        const grad = `linear-gradient(135deg,${hs(t, 8)} 45%,${t.a})`;
        h += sw(t.id, t.n, t.img ? `center/cover url(themes/${t.img}_t.jpg),${grad}` : t.g === 's' && t.glow ? t.glow.join(',') + ',' + hs(t, 12) : grad, SET.theme === t.id);
      });
    });
    return h;
  }
  function pickTheme(id) {
    const t = tById(id), prev = tById(SET.theme);
    if (t && t.a) { if (!(prev && prev.a)) SET.accentUser = SET.accent; SET.accent = t.a; }
    else if (prev && prev.a && SET.accentUser) { SET.accent = SET.accentUser; SET.accentUser = ''; }
    SET.theme = id; applySet(); saveSet();
    // Only move the highlight and the accent box; rebuilding the whole settings page made every pick feel slow.
    settingsSec.querySelectorAll('[data-th]').forEach((n) => n.classList.toggle('on', n.dataset.th === id));
    const ac = settingsSec.querySelector('input[data-sk="accent"]'); if (ac) ac.value = SET.accent;
  }
  // ---- saved Bungie accounts ----
  let ACL = null, aclBusy = false;
  function aclHTML() {
    if (!window.gt || !gt.acctList) return '';
    if (!ACL) { if (!aclBusy) { aclBusy = true; gt.acctList().then((r) => { ACL = r; aclBusy = false; if (settingsSec.classList.contains('on')) drawSettings(); }).catch(() => { aclBusy = false; }); } return '<p class="mute">Loading accounts...</p>'; }
    return ACL.list.map((a) => `<div class="acr${a.on ? ' on' : ''}"><b>${esc(a.n)}${a.code ? `<span>#${esc(a.code)}</span>` : ''}</b>${a.on ? '<em>Active</em>' : `<button class="g" data-acsw="${esc(a.mid)}">Switch</button>`}<button class="g" data-acrm="${esc(a.mid)}" title="Remove this account from ${GT_HERE}">Remove</button>${a.ok ? '' : '<small>Sign-in expired: switching asks you to sign in again</small>'}</div>`).join('');
  }
  const acctNs = (mid, prim) => (prim && mid && String(mid) !== String(prim) ? '@' + mid : '');
  function afterAcct(r) {
    if (r && r.reload) { location.reload(); return; }
    if (r && r.restart) { sec.innerHTML = ''; document.body.insertAdjacentHTML('beforeend', '<div class="acswm"><div>Switching account...</div></div>'); }
  }
  function syncHTML(sx) {
    const S = window.__gtsync; if (!S) return '';
    const st = S.status(), onv = S.on();
    const when = st.at ? new Date(st.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    const line = !onv ? 'Off. Everything stays on ' + GT_HERE + ' only.' : st.err ? 'Last try did not work: ' + esc(st.err) : when ? 'Last synced ' + esc(when) + '.' : 'Syncing...';
    return sx('Sync across devices', 'Keeps loadouts, tags, notes, settings, tracked triumphs, Home pins and wish list links the same on every device where you turn this on, for this Bungie account. Stored in your own token service. <br><span class="syst">' + line + '</span>' + (onv ? ' <button class="g" data-sa="syncnow" style="margin-left:6px">Sync now</button>' : ''), `<label class="tgl"><input type="checkbox" data-syncon${onv ? ' checked' : ''}><i></i></label>`);
  }
  window.addEventListener('gtsync', () => { if (settingsSec.classList.contains('on')) drawSettings(); });
  function drawSettings() {
    const sx = (title, desc, ctl, wide) => `<div class="sx${wide ? ' wide' : ''}"><div class="sxt"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</div><div class="sxc">${ctl}</div></div>`;
    const tgl = (k) => `<label class="tgl"><input type="checkbox" data-sk="${k}"${SET[k] ? ' checked' : ''}><i></i></label>`;
    const rng = (k, min, max, unit) => `<input type="range" data-sk="${k}" min="${min}" max="${max}" value="${SET[k]}"><output>${SET[k]}${unit}</output>`;
    const opt = (k, list) => `<select data-sk="${k}"${NUMK.has(k) ? ' data-num="1"' : ''}>${list.map((o) => `<option value="${o[0]}"${String(SET[k]) === String(o[0]) ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const g = window.gt || {};
    let upd = '';
    if (g.updInfo) {
      const st = { idle: 'Up to date.', current: 'You have the latest version.', checking: 'Checking...', downloading: 'Downloading ' + (UPD.pct || 0) + '%...', ready: 'Update ready. Restart to install.', error: 'Could not check: ' + (UPD.error || 'unknown error') }[UPD.state] || '';
      upd = `<div class="card sc"><h2>Updates</h2><p class="mute">Version ${esc(UPD.current || '')}. ${window.__GT_WEB__ ? 'This is the website: it is always the latest version when you open or reload it.' : UPD.canUpdate ? esc(st) : 'Updates work in the installed app.'}</p>${UPD.canUpdate ? '<button class="g" data-sa="upd">Check for updates</button>' : ''}${UPD.state === 'ready' ? ' <button class="b" data-sa="inst">Restart to install</button>' : ''}</div>`;
    }
    const wlc = window.gt && window.gt.wlGet ? wlCard() : '';
    let pv = '';
    try {
      if (D) {
        const its = D.items.filter((x) => !x.pm && (WEAPON.has(x.b) || ARMOR.has(x.b)));
        const pick = [...its.filter((x) => x.e && WEAPON.has(x.b)).slice(0, 2), ...its.filter((x) => x.e && ARMOR.has(x.b)).slice(0, 2), ...its.filter((x) => !x.e).slice(0, 2)].slice(0, 5);
        pv = `<div class="pvw">${pick.map(tile).join('')}</div>`;
      }
    } catch (e) { pv = ''; }
    let cl = [];
    try { cl = sortedChars(); } catch (e) { cl = []; }
    const charList = SET.charsort === 'custom' ? `<div class="cord">${cl.map((c, i) => `<div><span>${esc(CL[c.cls] || 'Guardian')} ${c.light}</span><button class="g" data-co="${esc(c.id)}" data-d="-1"${i ? '' : ' disabled'} title="Move earlier">&#9650;</button><button class="g" data-co="${esc(c.id)}" data-d="1"${i < cl.length - 1 ? '' : ' disabled'} title="Move later">&#9660;</button></div>`).join('')}</div>` : '';
    const csort = [['recent', 'Most recent character'], ['rrecent', 'Most recent character (reversed)'], ['age', 'Character age'], ['custom', 'Custom sort']].map((o) => `<label class="rad"><input type="radio" name="csort" data-sk="charsort" value="${o[0]}"${SET.charsort === o[0] ? ' checked' : ''}> ${o[1]}</label>`).join('');
    const sortList = `<div class="sortl">${SET.sortkeys.map((q, i) => `<div class="sri${q.on ? ' on' : ''}" draggable="true" data-si="${i}"><span class="grip" title="Drag to reorder">&#8942;&#8942;</span><label><input type="checkbox" data-sc="${i}"${q.on ? ' checked' : ''}> ${esc((SORTK.find((z) => z[0] === q.k) || [0, q.k])[1])}</label><button class="g" data-sd="${i}" title="${q.d === 1 ? 'Default order. Click to flip it' : 'Flipped. Click to go back'}">${q.d === 1 ? '&#9650;' : '&#9660;'}</button></div>`).join('')}</div>`;
    const cst = [0, 1, 2].map((c) => `<div class="cstr"><b>${CL[c]}</b>${CSTN.map((n, i) => `<button class="chip${SET.cst[c][i] ? ' on' : ''}" data-cst="${c}:${i}">${n}</button>`).join('')}</div>`).join('');
    const navL = window.__gtnav ? window.__gtnav.list() : [];
    const tabsCard = navL.length ? `<div class="card sc"><h2>Tabs</h2><p class="mute">Turn off the tabs you don't use. The bar re-fits the rest. Inventory and Settings always stay.</p><div class="navtg">${navL.map(([id, n, h, lock]) => `<button class="chip${h ? '' : ' on'}" data-navt="${esc(id)}"${lock ? ' disabled title="Always shown"' : ''}>${esc(n)}</button>`).join('')}</div></div>` : '';
    const acct = `<div class="card sc"><h2>Accounts</h2><p class="mute">${D && D.name ? 'Signed in as <b>' + esc(D.name) + '</b>.' : 'Signed in with Bungie.'} Add your alts, or a friend's account if they sign in here themselves, and switch between them. Switching ${window.__GT_WEB__ ? 'reloads the page' : 'restarts the app'}. Tags and notes are shared; loadouts are kept per account.</p><div class="acl">${aclHTML()}</div>${syncHTML(sx)}<p><button class="b" data-sa="addacct">Add another account</button> <button class="g" data-sa="out">Sign out of this account</button></p>${window.__GT_WEB__ ? '<p class="mute" style="font-size:12px">If Bungie signs you straight back in as the same account, sign out on bungie.net first, then press Add another account again.</p>' : ''}</div>`;
    settingsSec.innerHTML = `<div class="setgrid">
    <div class="card sc"><h2>Item display</h2>${pv}
      ${sx('Item size', 'An item size of 50px looks sharpest.', rng('tile', 32, 72, 'px'))}
      ${sx('Show power level on items', '', tgl('power'))}
      ${sx('Show ornaments on item tiles', 'Off shows the plain weapon or armor art instead of its ornament.', tgl('ornaments'))}
      ${sx('Community perk insights', 'What perks really do, from the Clarity community database. Shown when you open a perk in the item pop-up.', opt('clarity', [['both', 'Both descriptions'], ['clarity', 'Community insights only'], ['bungie', 'Bungie descriptions only']]))}
      ${sx('Sync item lock state with tag', 'Favorite, keep and archive lock the item. Junk and infuse unlock it. Crafted items stay unlocked so you can reshape them. The lock icon is hidden on tagged items.', tgl('locksync'))}
      ${sx('Custom stat total', 'Pick the armor stats you care about for each class. The total shows in the item pop-up, and you can search customtotal:&gt;=60.', cst, true)}
    </div>
    <div class="card sc"><h2>Inventory display</h2>
      ${sx('Single-character view', 'Show only the most recently played character. Items held by the others appear with the vault if this character can use them.', tgl('single'))}
      ${sx('Sort characters by', '', csort + charList, true)}
      ${sx('Group vault weapons by', '', opt('vgroup', [['none', 'None'], ['type', 'Type'], ['rarity', 'Rarity'], ['element', 'Element'], ['tag', 'Tag']]))}
      ${sx('Separate armor on different lines by class', '', tgl('armorsep'))}
      ${sx('Show vaulted items under equipped items', 'Puts the vault below the characters instead of beside them.', tgl('vaultunder'))}
      ${sx('Sort items by', 'Tick the rules to use and drag them into order. The arrow flips a rule.', sortList, true)}
      ${sx('Character inventory width', '', opt('invw', [[3, '3 items'], [4, '4 items'], [5, '5 items'], [6, '6 items']]))}
      ${sx('Hide the Collect Postmaster button', '', tgl('hidecollect'))}
      ${sx('Show the number of postmaster items on the taskbar icon', 'For the first character shown. Windows only.', tgl('pmbadge'))}
      ${sx('Empty spaces to make when using Farming Mode', 'Farming Mode keeps this many slots free in each slot on every character.', opt('farmspaces', [[1, '1 space'], [2, '2 spaces'], [3, '3 spaces'], [4, '4 spaces'], [5, '5 spaces']]))}
    </div>
    <div class="card sc"><h2>Appearance</h2>
      <div class="thh">Interface style</div>
      <div class="uis">${[['pf', 'Pathfinder', 'The current look.'], ['d2', 'In-game', 'Looks like the Destiny 2 menus.'], ['dim', 'DIM', 'Looks like Destiny Item Manager.'], ['beta', 'Beta', 'Experimental. Changes often.']].map(([k, n, d]) => `<div class="uic u-${k}${(SET.ui || 'pf') === k ? ' on' : ''}" data-uis="${k}"><i></i><b>${n}</b><small>${d}</small></div>`).join('')}</div>
      <div class="sg">${themeGrid()}</div>
      ${sx('Background picture dimming', 'For themes with a picture or glow. Higher is darker and easier to read.', rng('bgdim', 25, 90, '%'))}
      ${sx('Accent color', '', `<input type="color" data-sk="accent" value="${esc(SET.accent)}">`)}
    </div>
    <div class="card sc"><h2>Display</h2>
      ${sx('Interface scale', 'Makes everything bigger or smaller.', rng('scale', 80, 140, '%'))}
      ${sx('Show emblems on characters', '', tgl('emblems'))}
      ${sx('Show postmaster', '', tgl('postmaster'))}
      ${sx('Tighter spacing', 'Packs items, rows and sections closer together so more fits on screen.', tgl('compact'))}
      <p><button class="g" data-sa="reset">Reset display settings</button></p>
    </div>${tabsCard}${wlc}${upd}${acct}</div>`;
  }
  // Settings cards in even columns: each card, in a sensible order, goes into whichever column is shortest, so no side runs
  // far longer than the other. Re-done when cards are added (Farming, Reminders... come from another file) or the window resizes.
  const SORD = ['Accounts', 'Item display', 'Inventory display', 'Appearance', 'Display', 'Tabs', 'Wish lists', 'My wish list', 'Farming', 'Reminders', 'Backup', 'Updates'];
  let balT = 0, balN = 0;
  function balanceSettings(force) {
    const root = settingsSec; if (!root || !root.isConnected || !root.classList.contains('on')) return;
    const cards = [...root.querySelectorAll('.card')].filter((c) => c.parentElement && (c.parentElement === root || c.parentElement.classList.contains('setgrid') || c.parentElement.classList.contains('scol')));
    if (!cards.length) return;
    const n = Math.max(1, Math.min(3, Math.floor((root.clientWidth + 16) / 436)));
    const loose = cards.some((c) => !c.parentElement.classList.contains('scol'));
    if (!force && !loose && n === balN) return;
    balN = n;
    const key = (c) => { const h = (c.querySelector('h2') || {}).textContent || ''; const i = SORD.indexOf(h.trim()); return i < 0 ? 99 : i; };
    cards.sort((a, b) => key(a) - key(b));
    let wrap = root.querySelector(':scope > .scols'); if (!wrap) { wrap = document.createElement('div'); wrap.className = 'scols'; root.appendChild(wrap); }
    wrap.replaceChildren(); const cols = Array.from({ length: n }, () => { const d = document.createElement('div'); d.className = 'scol'; wrap.appendChild(d); return d; });
    cards.forEach((c) => { const col = cols.reduce((a, b) => (b.offsetHeight < a.offsetHeight ? b : a)); col.appendChild(c); });
    root.querySelectorAll(':scope > .setgrid').forEach((g2) => { if (!g2.children.length) g2.remove(); });
  }
  new MutationObserver(() => { clearTimeout(balT); balT = setTimeout(() => balanceSettings(false), 30); }).observe(settingsSec, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => { clearTimeout(balT); balT = setTimeout(() => balanceSettings(false), 120); });
  async function wlDo(arg) {
    try {
      WLMSG = 'Loading...'; drawSettings();
      const o = await window.gt.wlSet(arg); WL = o && o.lists && o.lists.length ? o : null;
      WLMSG = o && o.warn ? 'Added, but: ' + o.warn : 'Added.';
      if (arg.url) WLD.wlurl = ''; if (arg.text) WLD.wltext = '';
    } catch (er) { WLMSG = wlClean(er); }
    WLV++; drawSettings(); if (window.__gtRender) window.__gtRender();
  }
  settingsSec.addEventListener('change', (e) => {
    if (e.target.id !== 'wlfile' || !e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    if (f.size > 150e6) { WLMSG = 'That file is too big to be a wish list.'; drawSettings(); return; }
    const rd = new FileReader(); rd.onload = () => wlDo({ text: String(rd.result || ''), name: f.name.replace(/\.[^.]+$/, '') }); rd.onerror = () => { WLMSG = 'Could not read that file.'; drawSettings(); }; rd.readAsText(f);
  });
  settingsSec.addEventListener('click', async (e) => {
    const wp = e.target.closest('[data-wp]');
    if (wp) { const u = WLPRE[+wp.dataset.wp][1]; if ((WL && WL.lists || []).some((l) => l.url === u)) return; await wlDo({ url: u }); return; }
    const co = e.target.closest('[data-co]');
    if (co) { const ids = sortedChars().map((c) => c.id), i = ids.indexOf(co.dataset.co), j = i + +co.dataset.d; if (i >= 0 && j >= 0 && j < ids.length) { [ids[i], ids[j]] = [ids[j], ids[i]]; SET.charorder = ids; saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); } return; }
    const sdb = e.target.closest('[data-sd]');
    if (sdb) { const q = SET.sortkeys[+sdb.dataset.sd]; if (q) { q.d = -q.d; saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); } return; }
    const cs = e.target.closest('[data-cst]');
    if (cs) { const [c, i] = cs.dataset.cst.split(':').map(Number); SET.cst[c][i] = SET.cst[c][i] ? 0 : 1; saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); return; }
    const uis = e.target.closest('[data-uis]'); if (uis) { SET.ui = uis.dataset.uis; applySet(); saveSet(); settingsSec.querySelectorAll('[data-uis]').forEach((n) => n.classList.toggle('on', n.dataset.uis === SET.ui)); return; }
    const th = e.target.closest('[data-th]'); if (th) { pickTheme(th.dataset.th); return; }
    const nt = e.target.closest('[data-navt]'); if (nt && window.__gtnav && !nt.disabled) { const cur = window.__gtnav.list().find((x) => x[0] === nt.dataset.navt); if (cur) window.__gtnav.set(cur[0], !cur[2]); drawSettings(); return; }
    const asw = e.target.closest('[data-acsw]');
    if (asw) { try { localStorage.setItem('gt_acct_ns', acctNs(asw.dataset.acsw, ACL && ACL.prim)); } catch (er) { /* storage off */ } try { afterAcct(await gt.acctSwitch({ mid: asw.dataset.acsw })); } catch (er) { alert(clean(er)); } return; }
    const arm = e.target.closest('[data-acrm]');
    if (arm) { const a1 = ACL && ACL.list.find((x) => x.mid === arm.dataset.acrm); if (!confirm('Remove ' + ((a1 && a1.n) || 'this account') + ' from ' + GT_HERE + '? You can add it again any time.')) return; try { afterAcct(await gt.acctRemove({ mid: arm.dataset.acrm })); } catch (er) { alert(clean(er)); } return; }
    const b = e.target.closest('[data-sa]'); if (!b) return;
    const a = b.dataset.sa;
    if (a === 'syncnow') { if (window.__gtsync) window.__gtsync.now().catch(() => {}); return; }
    if (a === 'addacct') { try { afterAcct(await gt.acctAdd()); } catch (er) { const m1 = clean(er); if (!/closed/i.test(m1)) alert('Could not add the account: ' + m1); ACL = null; drawSettings(); } return; }
    if (a === 'wlpl' || a === 'wlpt') {
      try { const v = ((await window.gt.readClipboard()) || '').trim(); const id = a === 'wlpl' ? 'wlurl' : 'wltext'; WLD[id] = v; const el = document.getElementById(id); if (el) el.value = v; WLMSG = v ? 'Pasted ' + v.length + ' characters.' : 'The clipboard is empty. Copy the wish list first.'; }
      catch (er) { WLMSG = 'Could not read the clipboard.'; }
      drawSettings(); return;
    }
    if (a === 'out') { if (!confirm('Sign out of this Bungie account? Your tags, notes and loadouts stay on ' + GT_HERE + '.')) return; let r = null; try { r = await gt.logout(); } catch (er) { /* sign-in screen shows next */ } if (r && r.switched) { afterAcct(r); return; } sel = null; ACL = null; show('vault'); init(); return; }
    if (a === 'wlfile') { const f = document.getElementById('wlfile'); if (f) f.click(); return; }
    if (a === 'wlload') { const url = ((document.getElementById('wlurl') || {}).value || WLD.wlurl).trim(); if (!url) { WLMSG = 'Enter a link or pick one above.'; drawSettings(); return; } await wlDo({ url }); return; }
    if (a === 'wlpaste') { const text = (document.getElementById('wltext') || {}).value || WLD.wltext; if (!text.trim()) { WLMSG = 'Paste the wish list text first.'; drawSettings(); return; } await wlDo({ text }); return; }
    if (a === 'wlrm' || a === 'wlrefresh' || a === 'wlclear') {
      try {
        WLMSG = a === 'wlrefresh' ? 'Refreshing...' : ''; if (WLMSG) drawSettings();
        const o = a === 'wlrm' ? await window.gt.wlRemove({ id: b.dataset.id }) : a === 'wlrefresh' ? await window.gt.wlRefresh() : (await window.gt.wlClear(), null);
        WL = o && o.lists && o.lists.length ? o : null; WLMSG = a === 'wlrefresh' ? 'Refreshed.' : '';
      } catch (er) { WLMSG = wlClean(er); }
      WLV++; drawSettings(); if (window.__gtRender) window.__gtRender(); return;
    }
    if (a === 'reset') { SET = fresh(); fixSort(); applySet(); saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); if (window.gt && gt.farmSet) gt.farmSet({ spaces: SET.farmspaces }).catch(() => {}); }
    else if (a === 'upd') window.gt.updCheck();
    else if (a === 'inst') window.gt.updInstall();
  });
  settingsSec.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('[data-syncon]') && window.__gtsync) { window.__gtsync.set(e.target.checked); return; }
    const c = e.target.dataset && e.target.dataset.sc;
    if (c !== undefined) { SET.sortkeys[+c].on = e.target.checked; saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); }
  });
  let sdrag = -1;
  settingsSec.addEventListener('dragstart', (e) => { const r = e.target.closest && e.target.closest('[data-si]'); if (!r) return; sdrag = +r.dataset.si; try { e.dataTransfer.setData('text/plain', 'sort'); e.dataTransfer.effectAllowed = 'move'; } catch (er) { /* ignore */ } });
  settingsSec.addEventListener('dragover', (e) => { if (sdrag >= 0 && e.target.closest('[data-si]')) e.preventDefault(); });
  settingsSec.addEventListener('drop', (e) => {
    const r = e.target.closest('[data-si]'); if (!r || sdrag < 0) return; e.preventDefault();
    const to = +r.dataset.si, from = sdrag; sdrag = -1;
    if (to !== from) { const [m] = SET.sortkeys.splice(from, 1); SET.sortkeys.splice(to, 0, m); saveSet(); drawSettings(); if (window.__gtRender) window.__gtRender(); }
  });
  settingsSec.addEventListener('dragend', () => { sdrag = -1; });
  const CSSONLY = new Set(['accent', 'bgdim', 'tile', 'scale']);
  let cssRaf = 0, cssSave = 0;
  settingsSec.addEventListener('input', (e) => {
    if (e.target.id === 'wlurl' || e.target.id === 'wltext') { WLD[e.target.id] = e.target.value; return; }
    const k = e.target.dataset.sk; if (!k) return;
    SET[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.dataset.num ? +e.target.value : e.target.value;
    const o = e.target.nextElementSibling; if (o && o.tagName === 'OUTPUT') o.textContent = SET[k] + (k === 'tile' ? 'px' : '%');
    if (k === 'accent') SET.accentUser = SET.accent;
    // Interface scale resizes the whole window, which moves the slider under the pointer, so it only applies when the slider is let go (see the change listener below).
    if (k === 'scale') return;
    // Colour, size and dimming sliders only change CSS values: apply them once per frame, save once they stop, and never rebuild the vault for them.
    if (CSSONLY.has(k)) {
      if (!cssRaf) cssRaf = requestAnimationFrame(() => { cssRaf = 0; applySet(); });
      clearTimeout(cssSave); cssSave = setTimeout(saveSet, 300);
      return;
    }
    applySet(); saveSet(); if (window.__gtRender) window.__gtRender();
    if (e.target.type !== 'range' && e.target.type !== 'color') drawSettings();
    if (k === 'farmspaces' && window.gt && gt.farmSet) gt.farmSet({ spaces: SET.farmspaces }).catch(() => {});
    if (k === 'clarity') clarLoad();
  });
  settingsSec.addEventListener('change', (e) => {
    if (e.target.dataset.sk !== 'scale') return;
    SET.scale = +e.target.value; applySet(); saveSet();
  });
  if (window.gt && window.gt.updInfo) {
    window.gt.updInfo().then((u) => { UPD = { ...UPD, ...u }; drawSettings(); drawToast(); }).catch(() => {});
    window.gt.onUpdate((u) => { UPD = { ...UPD, ...u }; drawSettings(); drawToast(); });
  }

  const gt = window.gt;
  if (!gt) { sec.innerHTML = '<div class="card"><h2>Vault</h2><p class="mute">The vault needs the desktop app. Run it with npm start. See README.txt.</p></div>'; return; }

  const VCAP = 1300; // vault size, same as DIM shows
  const CL = ['Titan', 'Hunter', 'Warlock'];
  const SL = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power'], [3448274439, 'Helmet'], [3551918588, 'Gauntlets'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class item'], [4023194814, 'Ghost'], [2025709351, 'Sparrow']];
  const GROUPS = [['Weapons', SL.slice(0, 3).map((s) => s[0])], ['Armor', SL.slice(3, 8).map((s) => s[0])], ['General', SL.slice(8).map((s) => s[0])]];
  const WEAPON = new Set(SL.slice(0, 3).map((s) => s[0]));
  // Read-only rows in the General section, shown only when you own something of that kind.
  const XROWS = [[3284755031, 'Subclass'], [284967655, 'Ship'], [4274335291, 'Emblem'], [3683254069, 'Finisher'], [3054419239, 'Emote'], [4292445962, 'Clan banner']];
  const ENGR = 375726501;
  const ARMOR = new Set(SL.slice(3, 8).map((s) => s[0]));
  const slotName = (h) => (SL.find((s) => s[0] === h) || XROWS.find((s) => s[0] === h) || [0, ''])[1];
  const TIER = { Exotic: 0, Legendary: 1, Rare: 2, Uncommon: 3, Common: 4, Basic: 4 };
  const TAGORD = ['favorite', 'keep', 'infuse', 'junk', 'archive'];
  const byName = (a, b) => String(a.n).localeCompare(b.n);
  const SORTV = {
    power: (x) => -(x.p || 0), name: (x) => String(x.n || '').toLowerCase(), type: (x) => String(x.t || '').toLowerCase(),
    rarity: (x) => (TIER[x.r] !== undefined ? TIER[x.r] : 5), stack: (x) => -(x.q || 0), class: (x) => (x.c === undefined ? 4 : x.c),
    tag: (x) => { const i = TAGORD.indexOf(TAGS()[x.id]); return i < 0 ? 9 : i; }, season: (x) => String(x.wm || ''), dmg: (x) => x.el || 0,
    champ: (x) => x.bt || 9, mw: (x) => (x.mw ? 0 : 1), crafted: (x) => (x.cr ? 0 : 1), tier: (x) => -(x.gt || 0),
  };
  const sortI = (a, b) => {
    for (const q of SET.sortkeys) {
      if (!q.on) continue;
      const f = SORTV[q.k], va = f(a), vb = f(b);
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      if (c) return c * q.d;
    }
    return byName(a, b);
  };
  const icon = (p) => { p = String(p); return p.startsWith('data:image/') ? p : /^\/[\w./%-]*$/.test(p) ? 'https://www.bungie.net' + p : ''; };

  let D = null, q = '', busy = '', sel = null, dragId = null;
  let resync = 0, Q = Promise.resolve(), qn = 0, qbad = '';
  // Plain moves of different items run side by side (up to 3 at once, like DIM), so dragging several items does not make each
  // one wait for the last. Equips, loadouts and anything else still run one at a time, after the moves in progress.
  const PAR = new Set(), ITQ = {}; let parN = 0; const parWait = [];
  const parSlot = () => (parN < 3 ? (parN++, Promise.resolve()) : new Promise((r) => parWait.push(r)));
  const parFree = () => { const n = parWait.shift(); if (n) n(); else parN--; };
  // Runs fn over a list, 3 at a time; every item gets its turn, then the first error (if any) is reported.
  async function pmap(list, fn) { let i = 0, err = null; await Promise.all([0, 1, 2].map(async () => { while (i < list.length) { const x = list[i++]; try { await fn(x); } catch (e) { if (!err) err = e; } } })); if (err) throw err; }
  const LEDGER = {}, LED_MS = 90000;
  const DET = {};
  const allI = () => D.items.concat(D.gen || []);
  const byId = (id) => D && (D.items.find((x) => x.id === id) || (D.gen || []).find((x) => x.id === id) || aggOf(id));
  // The Inventory tiles (consumables, mods, shaders, materials) add up everything you own; this rebuilds that total with its per-place pieces.
  function aggOf(id) {
    if (typeof id !== 'string' || id.slice(0, 2) !== 'a:' || !D) return null;
    const h = +id.slice(2), parts = (D.gen || []).filter((x) => x.h === h && x.id.slice(0, 2) === 's:');
    return parts.length ? { ...parts[0], id, q: parts.reduce((a, x) => a + x.q, 0), agg: parts } : null;
  }
  const slim = (x) => ({ id: x.id, h: x.h, n: x.n, e: x.e, loc: x.loc, inst: x.inst, q: x.q, eg: x.eg, b: x.b, ex: x.r === 'Exotic' ? 1 : 0 });

  const TGP = {
    favorite: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    keep: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    infuse: 'M7 2v11h3v9l7-12h-4l4-8z',
    junk: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z',
  };
  const tagSvg = (k, z) => `<svg viewBox="0 0 24 24" width="${z || 12}" height="${z || 12}" fill="currentColor" aria-hidden="true"><path d="${TGP[k] || ''}"/></svg>`;
  // [id, icon, color, label]. The icon is an inline SVG so it looks the same everywhere.
  const TG = [['favorite', tagSvg('favorite'), '#e8b84a', 'Favorite'], ['keep', tagSvg('keep'), '#4caf50', 'Keep'], ['infuse', tagSvg('infuse'), '#4aa3df', 'Infuse'], ['junk', tagSvg('junk'), '#d9534f', 'Junk'], ['archive', tagSvg('archive'), '#9a7bd1', 'Archive']];
  const TAGS = () => { try { return JSON.parse(localStorage.getItem('gt_tags')) || {}; } catch (e) { return {}; } };
  const saveTAGS = (o) => { const old = TAGS(); try { localStorage.setItem('gt_tags', JSON.stringify(o)); } catch (e) { /* storage unavailable */ } if (SET.locksync) lockSync(old, o); };
  // "Sync item lock state with tag": favorite, keep and archive lock the item; junk and infuse unlock it. Crafted items stay unlocked so they can be reshaped.
  async function lockSync(old, now) {
    if (!D || !window.gt || !gt.itemLock) return;
    const want = {};
    for (const id of Object.keys(now)) { if (old[id] !== now[id]) want[id] = ['favorite', 'keep', 'archive'].includes(now[id]); }
    const its = Object.keys(want).map((id) => byId(id)).filter((x) => x && !x.ro && !x.pm && /^\d+$/.test(x.id) && !(want[x.id] && x.cr) && !!x.lk !== want[x.id]);
    for (const x of its) { try { await gt.itemLock({ id: x.id, state: want[x.id], char: charFor(x) }); x.lk = want[x.id] ? 1 : 0; } catch (e) { /* leave it as it was */ } }
    if (its.length) renderGrid();
  }
  const STN = ['weapons', 'health', 'class', 'grenade', 'super', 'melee'];
  const clean = (e) => String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const noBar = () => { const sl = document.getElementById('gtsrch'); if (sl) sl.replaceChildren(); };
  const msg = (t, err) => { noBar(); sec.innerHTML = `<div class="card"><h2>Vault</h2><p class="${err ? '' : 'mute'}">${esc(t)}</p>${err ? (/sign-?in|session expired|not signed|authoriz|token/i.test(t) ? '<button class="b" data-act="out">Sign in again</button> ' : '') + '<button class="g" data-act="retry">Try again</button>' : ''}</div>`; };
  let noteT = 0;
  const setNote = (t) => { const n = g('vnote'); if (!n) return; n.textContent = t || ''; clearTimeout(noteT); if (t && !/^Working/.test(t)) noteT = setTimeout(() => { if (n.textContent === t) n.textContent = ''; }, /^Failed/.test(t) ? 9000 : 3500); };
  gt.onProgress((m) => { if (sec.dataset.busy) msg(m); });

  async function init() { const c = await gt.cfgGet(); try { localStorage.setItem('gt_acct_ns', acctNs(c.mid, c.prim)); } catch (e) { /* storage off */ } ACL = null; c.signedIn ? load() : setup(c); }
  function setup(c, err) {
    noBar();
    const note = err ? `<p class="pmsg bad" style="margin:0 0 10px">Sign-in did not finish: ${esc(err)}</p>` : '';
    if (c.preset) {
      sec.innerHTML = `<div class="card" style="max-width:520px;margin:40px auto;text-align:center"><h2>Welcome to Pathfinder</h2>${note}<p class="mute">Sign in with your own Bungie account to see your characters, vault, loadouts and triumphs. Everything stays on ${GT_HERE}, and nothing is shared with anyone.</p><p><button class="b" data-act="presetlogin" style="padding:10px 22px;font-size:15px">Sign in with Bungie</button></p></div>`;
      // Accounts saved here (for example after cancelling "Add another account"): one click to go back to one.
      if (gt.acctList) gt.acctList().then((r) => {
        const l = (r && r.list) || []; if (!l.length || !sec.querySelector('.card')) return;
        const box = document.createElement('div'); box.className = 'card'; box.style.cssText = 'max-width:520px;margin:-24px auto 40px;text-align:center';
        box.innerHTML = '<p class="mute">Or switch to an account saved on ' + GT_HERE + ':</p>' + l.map((a) => `<button class="g" data-acsw2="${esc(a.mid)}" style="margin:3px">${esc(a.n)}${a.code ? ' #' + esc(a.code) : ''}</button>`).join('');
        box.onclick = async (e) => { const bt = e.target.closest('[data-acsw2]'); if (!bt) return; try { localStorage.setItem('gt_acct_ns', acctNs(bt.dataset.acsw2, r.prim)); } catch (er) { /* storage off */ } try { afterAcct(await gt.acctSwitch({ mid: bt.dataset.acsw2 })); } catch (er) { alert(clean(er)); } };
        sec.appendChild(box);
      }).catch(() => {});
      return;
    }
    sec.innerHTML = '<div class="card" style="max-width:560px;margin:40px auto"><h2>Bungie app not set up in this copy</h2><p class="mute">This copy of the toolkit was built without its Bungie app details, so it cannot offer a sign-in. Nothing is wrong with your account.</p><p class="mute">To fix it, run <b>set-bungie-app.bat</b> (in the toolkit folder), paste your Bungie app\u2019s API key and client ID, then run <b>update.bat</b> to build and install the new version. Use an app whose OAuth client type is <b>Public</b>, so no secret is ever needed.</p><p><button class="g" data-act="retry">Check again</button></p></div>';
  }
  // Quick reload: fetch in the background and redraw in place, keeping your scroll, search and open sections.
  // Moves still waiting on Bungie are kept (fetchD reconciles them). Falls back to the full load when nothing is on screen yet.
  let qload = false;
  async function quickLoad() {
    if (!D) { load(); return; }
    if (qload) return; qload = true;
    sec.querySelectorAll('.vrf').forEach((b) => b.classList.add('spin')); setNote('Reloading your vault...');
    try { D = await fetchD(true); Object.keys(DET).forEach((k) => delete DET[k]); renderGrid(); renderLoTab(); setNote('Vault reloaded ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.'); }
    catch (e) { setNote('Could not reload: ' + clean(e)); }
    qload = false; sec.querySelectorAll('.vrf').forEach((b) => b.classList.remove('spin'));
  }
  window.__gtVaultReload = quickLoad;
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey && sec.classList.contains('on') && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) && !e.target.isContentEditable) { e.preventDefault(); quickLoad(); }
  });
  async function load() {
    // Speed, like DIM: draw the vault saved last time straight away, then swap in Bungie's answer as soon as it arrives.
    if (!D && gt.vaultCached) {
      let c = null; try { c = await gt.vaultCached(); } catch (e) { c = null; }
      if (c && Array.isArray(c.items) && c.items.length && !D) {
        D = c; sel = null; shell(); setNote('Showing your vault from ' + new Date(c.cachedAt || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '. Updating...');
        try {
          D = await fetchD(true); Object.keys(DET).forEach((k) => delete DET[k]); // keeps any move you made in the meantime renderGrid(); renderLoTab(); if (window.__gtl) window.__gtl.reset();
          setNote('Vault up to date.'); setTimeout(() => { const v = document.getElementById('vnote'); if (v && /up to date/.test(v.textContent)) setNote(''); }, 2500);
        } catch (e) {
          const t = clean(e);
          if (/sign-?in|session expired|not signed|authoriz|token/i.test(t)) { D = null; msg(t, true); } else setNote('Could not update from Bungie (' + t + '). Showing your vault from last time.');
        }
        return;
      }
    }
    sec.dataset.busy = 1; msg('Loading your vault...');
    try { Object.keys(LEDGER).forEach((k) => { delete LEDGER[k]; }); D = await gt.loadVault(); sel = null; Object.keys(DET).forEach((k) => delete DET[k]); delete sec.dataset.busy; shell(); if (window.__gtl) window.__gtl.reset(); }
    catch (e) { delete sec.dataset.busy; msg(clean(e), true); }
  }

  // ---------------- search, like DIM ----------------
  // Words are ANDed; "or" between words ORs them; a leading minus (or not:) excludes; "quotes" keep words together.
  // Plain words match the item's name, type, perks (weapon perks and their options, armor perks and mods, subclass aspects and
  // fragments), ornament, notes and tag. Filters: is:/not:, perk:, exactperk:, name:, exactname:, notes:, tag:, element:, slot:,
  // class:, ammo:, breaker:, power:/light:, stat:<name>:, total:, customtotal:, energy:, tier:, hash:, target:, wishlistnotes:.
  const nz = (v) => String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, '');
  const cmpN = (v, op, n) => (op === '>' ? v > n : op === '>=' ? v >= n : op === '<' ? v < n : op === '<=' ? v <= n : op === '!=' ? v !== n : v === n);
  const ELN = { kinetic: 1, arc: 2, solar: 3, void: 4, stasis: 6, strand: 7 };
  const AMMO = { primary: 1, special: 2, heavy: 3 };
  const BRKQ = { barrier: 1, antibarrier: 1, shieldpiercing: 1, overload: 2, disruption: 2, unstoppable: 3, stagger: 3 };
  // Short names DIM accepts for weapon and armor types (the full type name always works too, without spaces: is:handcannon).
  const TYA = { hc: 'handcannon', auto: 'autorifle', ar: 'autorifle', pulse: 'pulserifle', scout: 'scoutrifle', smg: 'submachinegun', bow: 'combatbow', sniper: 'sniperrifle', fusion: 'fusionrifle', lfr: 'linearfusionrifle', linear: 'linearfusionrifle', gl: 'grenadelauncher', grenade: 'grenadelauncher', rocket: 'rocketlauncher', rl: 'rocketlauncher', mg: 'machinegun', lmg: 'machinegun', trace: 'tracerifle', cloak: 'hunter cloak', mark: 'titanmark', bond: 'warlockbond' };
  const SLOTA = { kinetic: 1498876634, kineticslot: 1498876634, energy: 2465295065, energyslot: 2465295065, power: 953998645, powerslot: 953998645, heavyslot: 953998645, helmet: 3448274439, gauntlets: 3551918588, arms: 3551918588, chest: 14239492, legs: 20886954, leg: 20886954, classitem: 1585787867, class: 1585787867, ghost: 4023194814, sparrow: 2025709351, vehicle: 2025709351, ship: 284967655, emblem: 4274335291, subclass: 3284755031, finisher: 3683254069, emote: 3054419239 };
  const STA = { weapons: 0, weapon: 0, health: 1, hp: 1, class: 2, grenade: 3, super: 4, melee: 5 };
  const inLo = () => {
    const s2 = new Set(); try { Object.values(D.lo || {}).forEach((l) => l.forEach((L) => (L.items || []).forEach((id) => s2.add(id)))); } catch (e) { /* none */ }
    try { const ns = localStorage.getItem('gt_acct_ns') || ''; (JSON.parse(localStorage.getItem('gt_dimlo2' + ns)) || []).forEach((l) => (l.it || []).forEach((q) => s2.add(q.id))); } catch (e) { /* none */ }
    return s2;
  };
  let LOSET = null, LOSETq = '';
  // Tags and notes read once per moment, not once per item (a search runs over every item).
  let QC = { t: 0, tags: {}, notes: {} };
  const qc = () => { const n = Date.now(); if (n - QC.t > 400) QC = { t: n, tags: TAGS(), notes: NOTES() }; return QC; };
  // Per item, worked out once: its words (name, type, ornament) and the names of its perks.
  const SX = new WeakMap();
  const sx = (x) => {
    let o = SX.get(x); if (o) return o;
    const pn = D.pn || {}, names = [...new Set([...(x.pk || []), ...(x.ap || [])].map((h) => pn[h]).filter(Boolean))];
    o = { w: (x.n + ' ' + (x.t || '') + ' ' + (x.orn || '')).toLowerCase(), p: names.map((n) => n.toLowerCase()), pz: names.map(nz) };
    SX.set(x, o); return o;
  };
  const isOf = (x, v) => {
    if (v === 'weapon' || v === 'weapons') return WEAPON.has(x.b);
    if (v === 'armor') return ARMOR.has(x.b);
    if (v === 'equipped') return !!x.e;
    if (v === 'unequipped') return !x.e;
    if (v === 'locked') return !!x.lk;
    if (v === 'unlocked') return !x.lk;
    if (v === 'crafted') return !!x.cr;
    if (v === 'masterwork' || v === 'masterworked' || v === 'mw') return !!x.mw;
    if (v === 'deepsight' || v === 'pattern') return !!x.ds;
    if (v === 'adept') return /\((adept|timelost|harrowed)\)/i.test(x.n);
    if (v === 'tagged') return !!qc().tags[x.id];
    if (v === 'untagged') return !qc().tags[x.id];
    if (v === 'hasnotes' || v === 'notes') return !!qc().notes[x.id];
    if (v === 'duplicate' || v === 'dupe' || v === 'dupes') return D.items.filter((o) => o.h === x.h).length > 1;
    if (v === 'vault') return x.loc === 'vault';
    if (v === 'postmaster') return !!x.pm;
    if (v === 'target') return !!(window.__gtt && window.__gtt.hit(x));
    if (v === 'wishlist') return wish(x).v === 1;
    if (v === 'trashlist') return wish(x).v === -1;
    if (v === 'inloadout') { if (!LOSET || LOSETq !== q) { LOSET = inLo(); LOSETq = q; } return LOSET.has(x.id); }
    if (v === 'prismatic') return /prismatic/i.test(x.n);
    if (ELN[v]) return x.el === ELN[v] || (x.b === 3284755031 && x.n.toLowerCase().includes(v));
    if (AMMO[v]) return x.am === AMMO[v];
    if (BRKQ[v]) return x.bt === BRKQ[v];
    const ci = CL.findIndex((c) => c.toLowerCase() === v); if (ci >= 0) return x.c === ci;
    if (SLOTA[v] !== undefined && v !== 'class') return x.b === SLOTA[v];
    if (['exotic', 'legendary', 'rare', 'uncommon', 'common'].includes(v)) return String(x.r).toLowerCase() === v;
    const ty = nz(x.t), want = TYA[v] ? nz(TYA[v]) : v;
    return !!ty && (ty === want || (want.length > 3 && ty.endsWith(want)));
  };
  function ok(x, t) {
    let m;
    const u = (v) => v.replace(/^"|"$/g, '');
    if ((m = t.match(/^(is|not):(\w+)$/))) return m[1] === 'not' ? !isOf(x, m[2]) : isOf(x, m[2]);
    if ((m = t.match(/^target:(\w+)$/))) return !!(window.__gtt && window.__gtt.hitBy(x, m[1]));
    if ((m = t.match(/^wishlistnotes:(.+)$/))) return wish(x).notes.some((n) => n.toLowerCase().includes(u(m[1])));
    if ((m = t.match(/^tag:(\w+)$/))) { const tg = qc().tags[x.id] || 'none'; return tg === m[1]; }
    if ((m = t.match(/^element:(\w+)$/))) return isOf(x, m[1]);
    if ((m = t.match(/^ammo:(\w+)$/))) return !!AMMO[m[1]] && x.am === AMMO[m[1]];
    if ((m = t.match(/^breaker:(\w+)$/))) return !!BRKQ[m[1]] && x.bt === BRKQ[m[1]];
    if ((m = t.match(/^(perk|perkname):(.+)$/))) { const w = u(m[2]), wz = nz(w); return sx(x).p.some((n) => n.includes(w)) || (!!wz && sx(x).pz.some((n) => n.includes(wz))); }
    if ((m = t.match(/^exactperk:(.+)$/))) { const wz = nz(u(m[1])); return sx(x).pz.includes(wz); }
    if ((m = t.match(/^name:(.+)$/))) return x.n.toLowerCase().includes(u(m[1]));
    if ((m = t.match(/^exactname:(.+)$/))) return nz(x.n) === nz(u(m[1]));
    if ((m = t.match(/^notes?:(.+)$/))) return (qc().notes[x.id] || '').toLowerCase().includes(u(m[1]));
    if ((m = t.match(/^hash:(\d+)$/))) return String(x.h) === m[1];
    if ((m = t.match(/^(?:stat|basestat):(\w+):(>=|<=|!=|[<>=]?)(\d+)$/))) { const i = STA[m[1]] !== undefined ? STA[m[1]] : STN.indexOf(m[1]); if (i < 0 || !x.st) return false; return cmpN(x.st[i], m[2], +m[3]); }
    if ((m = t.match(/^total:(>=|<=|!=|[<>=]?)(\d+)$/))) { if (!x.st) return false; return cmpN(x.st.reduce((a, b) => a + b, 0), m[1], +m[2]); }
    if ((m = t.match(/^customtotal:(>=|<=|!=|[<>=]?)(\d+)$/))) { const v = cTot(x); return v !== null && cmpN(v, m[1], +m[2]); }
    if ((m = t.match(/^energy:(>=|<=|!=|[<>=]?)(\d+)$/))) return !!x.en && cmpN(x.en, m[1], +m[2]);
    if ((m = t.match(/^tier:(>=|<=|!=|[<>=]?)(\d+)$/))) return !!x.gt && cmpN(x.gt, m[1], +m[2]);
    if ((m = t.match(/^slot:(\w+)$/))) return SLOTA[m[1]] !== undefined ? x.b === SLOTA[m[1]] : nz(slotName(x.b)) === m[1];
    if ((m = t.match(/^(?:power|light):(>=|<=|!=|[<>=]?)(\d+)$/))) return cmpN(x.p || 0, m[1], +m[2]);
    if ((m = t.match(/^class:(\w+)$/))) { const i = CL.findIndex((c) => c.toLowerCase() === m[1]); return i >= 0 && x.c === i; }
    // plain words (or a "quoted phrase"): name, type, ornament, perks, notes, tag
    const w = u(t); if (!w) return true;
    const o = sx(x); if (o.w.includes(w) || o.p.some((n) => n.includes(w))) return true;
    const wz = nz(w); if (wz.length > 2 && o.pz.some((n) => n.includes(wz))) return true;
    const nt = qc().notes[x.id]; if (nt && nt.toLowerCase().includes(w)) return true;
    const tg = qc().tags[x.id]; return !!tg && tg === w;
  }
  // The search, split once per change: "or" groups of words that must all match. Half-typed filters ("is:", "power:>") are skipped, like DIM.
  let QP = { q: null, g: [] };
  const qparts = () => {
    if (QP.q === q) return QP.g;
    const toks = (q.match(/-?[a-z]+:"[^"]*"?|-?"[^"]*"?|\S+/g) || []).filter((t) => t && t !== '-' && !/^-?[^:"]*:[<>=!]*$/.test(t));
    const g2 = [[]]; toks.forEach((t) => { if (t === 'or' || t === '|') g2.push([]); else if (t !== 'and') g2[g2.length - 1].push(t); });
    QP = { q, g: g2.filter((l) => l.length) }; return QP.g;
  };
  const one = (x, t) => ((t[0] === '-' && t.length > 1) ? !ok(x, t.slice(1)) : ok(x, t));
  const match = (x) => { if (!q) return true; const G = qparts(); return !G.length || G.some((l) => l.every((t) => one(x, t))); };

  // ---- suggestions under the search box (like DIM): filters, values, perk names and item names as you type ----
  const SKEYS = ['is:', 'not:', 'perk:', 'exactperk:', 'name:', 'exactname:', 'notes:', 'tag:', 'element:', 'slot:', 'class:', 'ammo:', 'breaker:', 'power:>=', 'stat:', 'total:>=', 'customtotal:>=', 'energy:>=', 'tier:>=', 'target:', 'wishlistnotes:'];
  const ISV = () => {
    const ty = [...new Set(D.items.filter((x) => (WEAPON.has(x.b) || ARMOR.has(x.b)) && x.t).map((x) => nz(x.t)))];
    return [...new Set(['exotic', 'legendary', 'rare', 'weapon', 'armor', 'equipped', 'unequipped', 'locked', 'unlocked', 'crafted', 'masterwork', 'deepsight', 'adept', 'duplicate', 'wishlist', 'trashlist', 'tagged', 'untagged', 'hasnotes', 'inloadout', 'vault', 'postmaster', 'target', 'kinetic', 'arc', 'solar', 'void', 'stasis', 'strand', 'prismatic', 'primary', 'special', 'heavy', 'barrier', 'overload', 'unstoppable', 'titan', 'hunter', 'warlock', 'kineticslot', 'energyslot', 'powerslot', 'helmet', 'gauntlets', 'chest', 'legs', 'classitem', 'ghost', 'sparrow', 'ship', 'subclass', ...ty])];
  };
  const SVALS = { tag: () => ['favorite', 'keep', 'infuse', 'junk', 'archive', 'none'], element: () => Object.keys(ELN), slot: () => ['kinetic', 'energy', 'power', 'helmet', 'gauntlets', 'chest', 'legs', 'classitem', 'ghost', 'sparrow', 'ship', 'subclass'], class: () => ['titan', 'hunter', 'warlock'], ammo: () => Object.keys(AMMO), breaker: () => ['barrier', 'overload', 'unstoppable'], stat: () => STN.map((n) => n + ':>='), target: () => [] };
  let SUG = { list: [], i: -1 };
  function sugList(tok) {
    const t = tok.replace(/^-/, ''), neg = tok[0] === '-' ? '-' : '', out = [], add = (v, hint) => { if (out.length < 12 && !out.some((o) => o.v === v)) out.push({ v: neg + v, hint }); };
    const quote = (n) => (/\s/.test(n) ? '"' + n + '"' : n);
    const perks = () => [...new Set(Object.values(D.pn || {}))].filter(Boolean);
    const m = t.match(/^([a-z]+):(.*)$/);
    if (m) {
      const k = m[1], v = m[2].replace(/^"/, '').toLowerCase();
      if (k === 'is' || k === 'not') ISV().filter((o) => o.startsWith(v)).slice(0, 12).forEach((o) => add(k + ':' + o));
      else if (k === 'perk' || k === 'exactperk' || k === 'perkname') { const l = perks().filter((n) => n.toLowerCase().includes(v)).sort((a, b) => (a.toLowerCase().startsWith(v) ? 0 : 1) - (b.toLowerCase().startsWith(v) ? 0 : 1) || a.localeCompare(b)); l.slice(0, 12).forEach((n) => add(k + ':' + quote(n.toLowerCase()), 'perk')); }
      else if (k === 'name' || k === 'exactname') [...new Set(D.items.map((x) => x.n))].filter((n) => n.toLowerCase().includes(v)).slice(0, 12).forEach((n) => add(k + ':' + quote(n.toLowerCase()), 'item'));
      else if (SVALS[k]) SVALS[k]().filter((o) => o.startsWith(v)).forEach((o) => add(k + ':' + o));
      return out;
    }
    if (!t) return out;
    { const M = acMap(), hit = M[nz(t)]; if (hit) add(hit, 'filter'); }
    SKEYS.filter((k) => k.startsWith(t)).forEach((k) => add(k, 'filter'));
    ISV().filter((o) => o.startsWith(t) || (t.length > 2 && o.includes(t))).slice(0, 5).forEach((o) => add('is:' + o));
    if (t.length > 1) {
      perks().filter((n) => n.toLowerCase().includes(t)).sort((a, b) => (a.toLowerCase().startsWith(t) ? 0 : 1) - (b.toLowerCase().startsWith(t) ? 0 : 1)).slice(0, 5).forEach((n) => add('perk:' + quote(n.toLowerCase()), 'perk'));
      [...new Set(D.items.map((x) => x.n))].filter((n) => n.toLowerCase().includes(t)).slice(0, 4).forEach((n) => add('name:' + quote(n.toLowerCase()), 'item'));
    }
    return out;
  }
  // ---- autocorrect: a finished word (or two or three) that names a filter becomes that filter, like "arc " -> "is:arc ",
  // "anti barrier " -> "is:barrier ", "hand cannon " -> "is:handcannon ". Backspace right after puts back what you typed.
  let ACM = null, ACMn = 0, LASTAC = null;
  const acMap = () => {
    if (ACM && ACMn === D.items.length) return ACM;
    const m = {}, put = (k, v) => { k = nz(k); if (k && !m[k]) m[k] = v; };
    ['arc', 'solar', 'void', 'stasis', 'strand', 'kinetic', 'prismatic', 'exotic', 'legendary', 'crafted', 'deepsight', 'adept', 'masterwork', 'masterworked', 'locked', 'unlocked', 'equipped', 'wishlist', 'trashlist', 'titan', 'hunter', 'warlock', 'barrier', 'overload', 'unstoppable', 'primary', 'special', 'heavy', 'helmet', 'gauntlets', 'subclass'].forEach((w) => put(w, 'is:' + w));
    [['anti barrier', 'barrier'], ['antibarrier', 'barrier'], ['shield piercing', 'barrier'], ['disruption', 'overload'], ['stagger', 'unstoppable'], ['dupe', 'duplicate'], ['dupes', 'duplicate'], ['duplicates', 'duplicate'], ['duplicate', 'duplicate'], ['class item', 'classitem'], ['chest armor', 'chest'], ['leg armor', 'legs'], ['in loadout', 'inloadout'], ['deep sight', 'deepsight'], ['red border', 'deepsight']].forEach(([k, v]) => put(k, 'is:' + v));
    Object.keys(TYA).forEach((k) => { if (k.length > 1 && !['grenade', 'class', 'mark', 'bond', 'cloak', 'auto', 'pulse', 'scout', 'linear', 'rocket', 'trace', 'fusion', 'sniper', 'bow'].includes(k)) put(k, 'is:' + nz(TYA[k])); });
    [...new Set(D.items.filter((x) => WEAPON.has(x.b) && x.t).map((x) => x.t))].forEach((t) => { put(t, 'is:' + nz(t)); put(t + 's', 'is:' + nz(t)); });
    ACM = m; ACMn = D.items.length; return m;
  };
  function autoFix(inp, e) {
    if (!D || !e || e.inputType !== 'insertText' || e.data !== ' ') return false;
    const v = inp.value, pos = inp.selectionStart; if (pos !== v.length) return false;
    const head = v.slice(0, -1); if ((head.match(/"/g) || []).length % 2) return false; // inside quotes: leave it
    const words = head.split(/\s+/), M = acMap();
    for (let n = Math.min(3, words.length); n >= 1; n--) {
      const part = words.slice(-n); if (part.some((w) => !w || /[:"]/.test(w) || (w[0] === '-' && w !== part[0]))) continue;
      const neg = part[0][0] === '-' ? '-' : '', key = nz(part.join(' ').replace(/^-/, '')), to = M[key];
      if (!to) continue;
      const rest = words.slice(0, -n).join(' '), nv = (rest ? rest + ' ' : '') + neg + to + ' ';
      LASTAC = { before: v, after: nv }; inp.value = nv; inp.setSelectionRange(nv.length, nv.length);
      setNote('Searching ' + neg + to + ' (Backspace puts back "' + part.join(' ') + '")');
      return true;
    }
    return false;
  }
  function sugDraw(inp) {
    let box = document.getElementById('vqs');
    const val = inp.value, caret = inp.selectionStart == null ? val.length : inp.selectionStart, before = val.slice(0, caret), mt = before.match(/(-?[a-z]+:"[^"]*|-?"[^"]*|\S*)$/), tok = mt ? mt[0] : '';
    SUG = { list: D ? sugList(tok.toLowerCase()) : [], i: -1, tok, start: caret - tok.length, end: caret };
    // "anti bar", "hand can": offer the filter for the whole phrase, replacing those words.
    if (D && tok && !/[:"]/.test(tok)) {
      const M = acMap(), ws = before.trimEnd().split(/\s+/);
      for (let n = 3; n >= 2; n--) {
        if (ws.length < n) continue; const part = ws.slice(-n); if (part.some((w) => /[:"]/.test(w) || w[0] === '-')) continue;
        const key = nz(part.join(' ')); if (key.length < 4) continue;
        const hits = [...new Set(Object.keys(M).filter((k) => k.startsWith(key)).map((k) => M[k]))].slice(0, 3);
        if (hits.length) { const st0 = before.length - part.join(' ').length; SUG.list = hits.map((v) => ({ v, hint: 'filter', st: st0 })).concat(SUG.list.filter((o) => !hits.includes(o.v))).slice(0, 12); break; }
      }
    }
    if (!SUG.list.length || document.activeElement !== inp) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'vqs'; document.body.appendChild(box); box.addEventListener('pointerdown', (e) => { const r = e.target.closest('[data-qs]'); if (!r) return; e.preventDefault(); sugPick(inp, +r.dataset.qs); }); }
    const r = inp.getBoundingClientRect();
    const bw = Math.min(Math.max(r.width, 280), innerWidth - 16), bl = Math.max(8, Math.min(r.left, innerWidth - bw - 8));
    box.style.cssText = `left:${Math.round(bl)}px;top:${Math.round(r.bottom + 4)}px;width:${Math.round(bw)}px`;
    box.innerHTML = SUG.list.map((o, i) => `<div class="qs${i === SUG.i ? ' on' : ''}" data-qs="${i}"><span>${esc(o.v)}</span>${o.hint ? `<em>${esc(o.hint)}</em>` : ''}</div>`).join('') + '<div class="qsh">Tab or Enter to use &middot; &uarr;&darr; to choose &middot; see ? for every filter</div>';
  }
  function sugPick(inp, i) {
    const o = SUG.list[i]; if (!o) return;
    const v = inp.value, add = o.v + (/[:<>=]$/.test(o.v) ? '' : ' '), st0 = o.st !== undefined ? o.st : SUG.start;
    inp.value = v.slice(0, st0) + add + v.slice(SUG.end).replace(/^\S*/, '');
    const pos = st0 + add.length; inp.setSelectionRange(pos, pos); inp.focus();
    q = inp.value.toLowerCase(); renderGrid(); sugDraw(inp);
  }
  function sugKey(e) {
    const inp = e.target, box = document.getElementById('vqs');
    if (e.key === 'Backspace' && LASTAC && inp.value === LASTAC.after) { e.preventDefault(); const b0 = LASTAC.before.replace(/ $/, ''); LASTAC = null; inp.value = b0; inp.setSelectionRange(b0.length, b0.length); q = b0.toLowerCase(); renderGrid(); sugDraw(inp); setNote(''); return; }
    if (e.key === 'Escape') { if (box) { box.remove(); e.stopPropagation(); } return; }
    if (!box || !SUG.list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); SUG.i = (SUG.i + (e.key === 'ArrowDown' ? 1 : -1) + SUG.list.length) % SUG.list.length; box.querySelectorAll('.qs').forEach((n, k) => n.classList.toggle('on', k === SUG.i)); return; }
    if (e.key === 'Tab' || (e.key === 'Enter' && SUG.i >= 0)) { e.preventDefault(); sugPick(inp, SUG.i >= 0 ? SUG.i : 0); }
  }
  const CC = ['#4a5a78', '#5c6b49', '#7a5a3f'];
  // ---- saved searches (kept on this computer) ----
  const SQ = () => { try { const a = JSON.parse(localStorage.getItem('gt_savedq')); return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, 30) : []; } catch (e) { return []; } };
  const saveSQ = (a) => { try { localStorage.setItem('gt_savedq', JSON.stringify(a.slice(0, 30))); } catch (e) { /* storage off */ } };
  const SQPRE = ['is:duplicate -is:locked', 'is:wishlist -is:locked', 'is:trashlist', 'is:weapon is:crafted', 'is:armor total:>=65', 'tag:junk'];
  function savqMenu(t) {
    const old = document.getElementById('chpop'); if (old) { const same = old.dataset.c === 'savq'; old.remove(); if (same) return; }
    const r = t.getBoundingClientRect(), m = document.createElement('div'); m.id = 'chpop'; m.dataset.c = 'savq'; m.className = 'sqm';
    m.style.cssText = 'position:fixed;z-index:60;top:' + (r.bottom + 2) + 'px;left:' + Math.max(8, r.right - 300) + 'px';
    const cur = (g('vq') && g('vq').value.trim()) || '', list = SQ(), has = cur && list.includes(cur);
    m.innerHTML = (cur ? `<button data-sq="${has ? 'del' : 'add'}" data-v="${esc(cur)}">${has ? '&#9734; Remove' : '&#9733; Save'} "${esc(cur.length > 34 ? cur.slice(0, 33) + '…' : cur)}"</button>` : '<div class="sqh">Type a search, then save it here.</div>')
      + (list.length ? '<div class="sqh">Saved</div>' + list.map((v) => `<div class="sqr"><button data-sq="go" data-v="${esc(v)}">${esc(v)}</button><b data-sq="del" data-v="${esc(v)}" title="Remove">&times;</b></div>`).join('') : '')
      + '<div class="sqh">Ideas</div>' + SQPRE.filter((v) => !list.includes(v)).map((v) => `<div class="sqr"><button data-sq="go" data-v="${esc(v)}">${esc(v)}</button></div>`).join('');
    m.onclick = (e) => {
      const b = e.target.closest('[data-sq]'); if (!b) return; e.stopPropagation();
      const v = b.dataset.v, a = b.dataset.sq;
      if (a === 'go') { const i = g('vq'); if (i) i.value = v; q = v.toLowerCase(); renderGrid(); m.remove(); return; }
      let l = SQ().filter((x) => x !== v); if (a === 'add') l = [v, ...l]; saveSQ(l); m.remove(); savqMenu(t);
    };
    document.body.appendChild(m);
  }
  // ---- farming mode toggle (the Farming card in Settings has the details) ----
  let FARM = { on: false };
  if (gt && gt.farmGet) { gt.farmGet().then((m) => { FARM = m || FARM; const b = document.querySelector('.vbar [data-act=farm]'); if (b) b.classList.toggle('on', !!FARM.on); }).catch(() => {}); }
  if (gt && gt.onFarm) gt.onFarm((m) => { const was = FARM.on; FARM = m || FARM; if (was !== !!FARM.on) { const b = document.querySelector('.vbar [data-act=farm]'); if (b) b.classList.toggle('on', !!FARM.on); } });
  // ---- junk finder: copies you could dismantle ----
  const tot = (o) => (o.st ? o.st.reduce((a, b) => a + b, 0) : 0);
  function junkScan() {
    const T = TAGS(), byH = {}, out = [];
    D.items.forEach((o) => { if ((WEAPON.has(o.b) || ARMOR.has(o.b)) && !o.pm && !o.ro) (byH[o.h] = byH[o.h] || []).push(o); });
    const score = (o) => [wish(o).v === 1 ? 1 : 0, o.cr ? 1 : 0, o.lk ? 1 : 0, o.mw ? 1 : 0, ARMOR.has(o.b) ? tot(o) : 0, o.p || 0];
    const better = (a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
    for (const x of D.items) {
      if (!(WEAPON.has(x.b) || ARMOR.has(x.b)) || x.pm || x.ro || x.e || x.lk || ['favorite', 'keep'].includes(T[x.id])) continue;
      const w = wish(x);
      if (w.v === -1) { out.push({ x, why: 'Trash roll on your wish list' }); continue; }
      if (w.v === 1) continue;
      const grp = byH[x.h] || [];
      if (grp.length < 2) continue;
      const best = grp.reduce((a, b) => (better(b, a) ? b : a));
      if (best === x) continue;
      if (ARMOR.has(x.b)) { if (tot(x) < tot(best)) out.push({ x, why: `Duplicate with lower stats (total ${tot(x)}, your best copy has ${tot(best)})` }); }
      else out.push({ x, why: best.lk || best.cr || wish(best).v === 1 ? 'Duplicate: you have a better copy' + (wish(best).v === 1 ? ' (a wish list roll)' : best.cr ? ' (crafted)' : ' (locked)') : 'Duplicate: you have a copy with higher power' });
    }
    return out.sort((a, b) => (a.x.n < b.x.n ? -1 : a.x.n > b.x.n ? 1 : 0));
  }
  function junkOpen() {
    let m = g('junkm'); if (m) m.remove();
    const list = junkScan(), T = TAGS(), tagged = list.filter((o) => T[o.x.id] === 'junk').length;
    m = document.createElement('div'); m.id = 'junkm';
    const whereTxt = (o) => { if (o.loc === 'vault') return 'Vault'; const c = D.chars.find((k) => k.id === o.loc); return c ? CL[c.cls] || 'Guardian' : ''; };
    m.innerHTML = `<div class="jk"><div class="jkh"><b>Junk finder</b><span class="mute">${list.length} item${list.length === 1 ? '' : 's'} you could dismantle${tagged ? ' &middot; ' + tagged + ' already tagged junk' : ''}</span><button class="g" data-jk="x" title="Close">&#10005;</button></div>
<p class="mute">Unlocked, unequipped copies that are a trash roll on your wish lists, or a duplicate of something better you already own. Locked items, wish list rolls and anything tagged Favorite or Keep are never listed. Nothing is dismantled here: tag them, then dismantle them in game.</p>
${list.length ? `<div class="jkl">${list.map((o) => `<div class="jkr" data-jid="${esc(o.x.id)}">${tile(o.x)}<div><b>${esc(o.x.n)}</b><small>${esc(o.why)}</small></div><span class="mute">${esc(whereTxt(o.x))}</span></div>`).join('')}</div>
<p class="jkb"><button class="b" data-jk="tag">Tag all ${list.length} as junk</button> <button class="g" data-jk="show">Show tagged junk in the vault</button></p>` : '<p><b>Nothing to clean up.</b> No duplicates or trash rolls found.</p>'}</div>`;
    m.onclick = (e) => {
      if (e.target === m) { m.remove(); return; }
      const b = e.target.closest('[data-jk]'), r = e.target.closest('[data-jid]');
      if (r && !b) { m.remove(); openPop(r.dataset.jid); return; }
      if (!b) return;
      if (b.dataset.jk === 'x') { m.remove(); return; }
      if (b.dataset.jk === 'tag') { const o = TAGS(); list.forEach((j) => { o[j.x.id] = 'junk'; }); saveTAGS(o); renderGrid(); junkOpen(); setNote(list.length + ' item' + (list.length === 1 ? '' : 's') + ' tagged junk.'); return; }
      if (b.dataset.jk === 'show') { m.remove(); const i = g('vq'); if (i) i.value = 'tag:junk'; q = 'tag:junk'; renderGrid(); }
    };
    document.body.appendChild(m);
  }

  const SV_UP = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';
  const SV_LK = '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
  // Our own Arc / Solar / Void marks (drawn in the footer's text colour), so they never depend on the Bungie icon files.
  const ELSVG = {
    1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4.6" stroke-width="2.6"/><path d="M19.2 12.0L22.8 12.0M17.1 17.1L19.6 19.6M12.0 19.2L12.0 22.8M6.9 17.1L4.4 19.6M4.8 12.0L1.2 12.0M6.9 6.9L4.4 4.4M12.0 4.8L12.0 1.2M17.1 6.9L19.6 4.4" stroke-width="3"/></svg>',
    2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 1 4.5 13.5h6L9 23l10.5-14h-6.4z"/></svg>',
    3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="4.4"/><path d="M12 1.5v4.2M12 18.3v4.2M1.5 12h4.2M18.3 12h4.2M4.6 4.6l3 3M16.4 16.4l3 3M4.6 19.4l3-3M16.4 7.6l3-3"/></svg>',
    4: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm0 3.2a7.3 7.3 0 1 1 0 14.6 7.3 7.3 0 0 1 0-14.6z"/><path d="M12 7.6a4.4 4.4 0 1 0 4.4 4.4A3 3 0 1 1 12 7.6z"/></svg>'
  };
  // Crafted weapons: a small red mark under the tier pips, like the in-game and DIM marker.
  const CRSVG = '<span class="crf" title="Crafted"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="M12 8.4 15.6 12 12 15.6 8.4 12z" fill="currentColor"/></svg></span>';
  // Turns a frame icon (light glyph on a dark or see-through badge) into a clean black glyph, whatever the file looks like.
  try { if (!document.getElementById('gtfrsvg')) (document.body || document.documentElement).insertAdjacentHTML('beforeend', '<svg id="gtfrsvg" width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true"><filter id="gtfr" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .85 2.86 .29 4 -6"/></filter></svg>'); } catch (e) { /* the badge just stays plain */ }
  const CLSV = ['<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 6v7c0 4 3.6 7.4 9 9 5.4-1.6 9-5 9-9V6zM12 5.2l6 2.6v5c0 2.7-2.3 5-6 6.3-3.7-1.3-6-3.6-6-6.3v-5z"/><path d="M12 8l3.5 1.6v3.1c0 1.6-1.4 3-3.5 3.8-2.1-.8-3.5-2.2-3.5-3.8V9.6z"/></svg>', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2.5 20h4.2L12 9.6 17.3 20h4.2z"/><path d="M12 14.5 9.6 20h4.8z"/></svg>', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 9 9 2.5 7l3 8L12 21l6.5-6 3-8L15 9zM12 8.2l1.6 2.8L12 18l-1.6-7z"/></svg>'];
  const tile = (x) => {
    const w = wish(x), tgv = TAGS()[x.id], tgd = tgv && TG.find((t) => t[0] === tgv), ic = (D && D.ic) || {};
    const bkI = x.bt && ic.bk && ic.bk[x.bt], elI = x.el && x.el !== 1 && ic.el && ic.el[x.el];
    const num = x.q > 1 ? x.q : x.p ? x.p : '';
    const left = w.v ? `<i class="wl${w.v < 0 ? ' dn' : ''}">${SV_UP}</i>` : '';
    const elS = ELSVG[x.el], elH = elS ? `<span class="elv" title="${esc((ELEM[x.el] || [''])[0])}">${elS}</span>` : (elI ? `<img class="el" src="${esc(icon(elI))}" alt="">` : '');
    const foot = left || bkI || elH || num !== '' ? `<div class="ft"><span class="lf">${left}</span>${bkI ? `<img class="bkf" src="${esc(icon(bkI))}" alt="" title="${esc(BRK[x.bt] || 'Champion')}" draggable="false">` : ''}${elH}${num !== '' ? `<span class="pn">${num}</span>` : ''}</div>` : '';
    const lockH = x.lk && !(SET.locksync && tgv) ? `<b class="lk">${SV_LK}</b>` : '', tagH = tgd ? `<em class="tg" style="background:${tgd[2]}" title="${tgd[3]}">${tagSvg(tgd[0], 9)}</em>` : '';
    const badge = lockH || tagH ? `<div class="br">${lockH}${tagH}</div>` : '';
    return `<div class="vt ${esc(x.r)}${x.of && SET.ornaments !== false ? ' of' : ''}${x.b === ENGR || x.eg ? ' eng' : ''}${x.mx && x.q >= x.mx ? ' full' : ''}${foot ? ' hf' : ''}${x.mw ? ' mw' : ''}${window.__gtf && window.__gtf.isSel(x.id) ? ' bsel' : ''}${q && !match(x) ? ' fade' : ''}"${(x.e || x.pm || x.ro) ? '' : ' draggable="true"'} data-id="${esc(x.id)}" title="${esc(x.n)} - ${esc(x.r)} ${esc(x.t)}${w.v ? (w.v > 0 ? ' - WISH LIST ROLL' : ' - trash roll') : ''}${w.notes.length ? ' - ' + esc(w.notes.join(' / ')) : ''}${x.orn ? ' (ornament: ' + esc(x.orn) + ')' : ''}"><img src="${esc(icon(SET.ornaments === false && x.bi ? x.bi : x.i))}" alt="" draggable="false">${x.wm ? `<img class="wm" src="${esc(icon(x.wm))}" alt="" draggable="false">` : ''}${x.fr && x.r !== 'Exotic' ? `<span class="fr"><img src="${esc(icon(x.fr))}" alt="" draggable="false"></span>` : ''}${ARMOR.has(x.b) && x.c >= 0 && x.c < 3 ? `<span class="cl" title="${CL[x.c] || ''}">${CLSV[x.c]}</span>` : ''}${x.gt > 0 || x.cr ? `<u class="tp${x.cr ? ' cr' : ''}">${x.gt > 0 ? '<i></i>'.repeat(Math.min(5, x.gt)) : ''}${x.cr ? CRSVG : ''}</u>` : ''}${badge}${foot}</div>`;
  };
  let plast = null, pmOpen = true;

  // Total of the six armor stats on what this character is wearing (like the numbers under each character in DIM).
  const STL = [['W', 'Weapons'], ['H', 'Health'], ['C', 'Class'], ['G', 'Grenade'], ['S', 'Super'], ['M', 'Melee']];
  const SV_HELM = '<svg class="hm" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c-4.6 0-7.8 3.3-7.8 7.9v5.6c0 .7.3 1.3.8 1.7l3.2 2.4h7.6l3.2-2.4c.5-.4.8-1 .8-1.7v-5.6c0-4.6-3.2-7.9-7.8-7.9z"/><path d="M7.4 10h9.2v2.3l-1.7 1.7h-1.5v2.6h-2.8V14H9.1l-1.7-1.7z" fill="#0c0d10"/></svg>';
  const SV_LIGHT = '<svg class="lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2.5 17 12 12 21.5 7 12z"/></svg>';
  const SV_TRI = '<svg class="hm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5 21 20H3z"/><path d="M12 9.5 16.4 18H7.6z" fill="currentColor"/></svg>';
  const SV_MODS = '<svg class="hm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3"/></svg>';
  const SV_SEAL = '<svg class="sl" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4.5 5v6c0 5 3.2 8.6 7.5 11 4.3-2.4 7.5-6 7.5-11V5z" fill-opacity=".92"/><path d="M12 6.5 15.2 12 12 17.5 8.8 12z" fill="#1b1d22"/></svg>';
  // The highest power you could reach with the best item you own in each of the eight gear slots.
  function maxPow(c) {
    let t = 0;
    [...WEAPON, ...ARMOR].forEach((b) => { let m = 0; allI().forEach((x) => { if (x.b === b && !x.pm && (WEAPON.has(b) || x.c === 3 || x.c === undefined || x.c === c.cls) && (x.p || 0) > m) m = x.p; }); t += m; });
    return Math.floor(t / 8);
  }
  function armorStats(c) {
    const w = D.items.filter((x) => x.loc === c.id && x.e && x.st);
    if (!w.length) return '';
    const t = [0, 0, 0, 0, 0, 0]; w.forEach((x) => x.st.forEach((v, i) => { t[i] += v; }));
    const ic = D.sti || [];
    return `<div class="cst" title="Armor stats: ${STL.map((q, i) => q[1] + ' ' + t[i]).join(', ')}">${t.map((v, i) => `<span title="${STL[i][1]}">${ic[i] ? `<img src="${esc(icon(ic[i]))}" alt="">` : `<em>${STL[i][0]}</em>`}${v}</span>`).join('')}</div>`;
  }
  // Characters in the order chosen in Settings. Single-character view keeps only the first one.
  const idCmp = (a, b) => { try { const x = BigInt(a.id), y = BigInt(b.id); return x < y ? -1 : x > y ? 1 : 0; } catch (e) { return 0; } };
  function sortedChars() {
    const a = D.chars.slice(), m = SET.charsort;
    if (m === 'recent') a.sort((x, y) => (y.dp || 0) - (x.dp || 0));
    else if (m === 'rrecent') a.sort((x, y) => (x.dp || 0) - (y.dp || 0));
    else if (m === 'age') a.sort(idCmp);
    else if (m === 'custom') { const o = SET.charorder || []; a.sort((x, y) => { const i = o.indexOf(x.id), j = o.indexOf(y.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); }
    return a;
  }
  // Phone-width screens show one character at a time (pick it with the switcher above the grid) with the vault underneath, like DIM on a phone.
  const PHONE = window.matchMedia ? window.matchMedia('(max-width:760px)') : { matches: false };
  let phChar = '';
  const visChars = () => { const a = sortedChars(); if (PHONE.matches) { const c = a.find((x) => x.id === phChar) || a[0]; return c ? [c] : []; } return SET.single ? a.slice(0, 1) : a; };
  if (PHONE.addEventListener) PHONE.addEventListener('change', () => { if (D) { renderGrid(); requestAnimationFrame(fitTiles); } });
  // With single-character view, items held by the other characters show up with the vault if this character can use them.
  const hiddenUsable = (x) => {
    if (!SET.single || x.loc === 'vault' || x.e || x.pm) return false;
    const vis = visChars(); if (!vis.length || vis.some((c) => c.id === x.loc)) return false;
    return x.c === 3 || x.c === undefined || x.c === vis[0].cls;
  };
  const inVault = (x) => x.loc === 'vault' || hiddenUsable(x);
  function charCell(c, h) {
    const mine = allI().filter((x) => x.loc === c.id && !x.pm && x.b === h);
    const eq = mine.find((x) => x.e), inv = mine.filter((x) => !x.e).sort(sortI);
    // Like DIM: the equipped item has its own box (drop here to equip), with a + under it to pick something to equip.
    return `<div class="dc" data-drop="char" data-loc="${esc(c.id)}" data-b="${h}"><div class="eq" title="${esc(slotName(h))}: drop here to equip" data-drop="eq" data-loc="${esc(c.id)}" data-b="${h}">${eq ? tile(eq) : ''}<i class="eqp" data-act="eqpick" data-c="${esc(c.id)}" data-b="${h}" title="Choose something to equip">+</i></div><div class="inv">${inv.map(tile).join('')}</div></div>`;
  }
  function vaultCell(h) {
    const its = allI().filter((x) => x.b === h && inVault(x)).sort(sortI), under = SET.vaultunder || PHONE.matches ? ' under' : '';
    const grp = (label, arr) => `<div class="vg"><div class="vgl">${esc(label)}</div><div class="vgt">${arr.map(tile).join('')}</div></div>`;
    const split = (key, order) => { const m = new Map(); its.forEach((x) => { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m.entries()].sort(order); };
    let body = its.map(tile).join(''), cls = '';
    if (WEAPON.has(h) && SET.vgroup !== 'none' && its.length) {
      const keys = { type: (x) => x.t || 'Other', rarity: (x) => x.r || 'Other', element: (x) => (ELEM[x.el] || [])[0] || 'Kinetic', tag: (x) => { const t = TAGS()[x.id]; return t ? t[0].toUpperCase() + t.slice(1) : 'No tag'; } };
      const ord = SET.vgroup === 'rarity' ? (a, b) => (TIER[a[0]] !== undefined ? TIER[a[0]] : 5) - (TIER[b[0]] !== undefined ? TIER[b[0]] : 5) : (a, b) => String(a[0]).localeCompare(b[0]);
      body = split(keys[SET.vgroup] || keys.type, ord).map(([k, a]) => grp(k, a)).join(''); cls = ' grouped';
    } else if (ARMOR.has(h) && SET.armorsep && its.length) {
      body = split((x) => (x.c === undefined || x.c === 3 ? 3 : x.c), (a, b) => a[0] - b[0]).map(([k, a]) => grp(CL[k] || 'Any class', a)).join(''); cls = ' grouped';
    }
    return `<div class="dc v${cls}${under}" data-drop="vault" data-loc="vault" data-b="${h}">${body}</div>`;
  }
  function pmCell(c) {
    const its = D.items.filter((x) => x.loc === c.id && x.pm);
    const can = its.filter((x) => !x.eg);
    const eg = (D.gen || []).filter((x) => x.loc === c.id && x.b === ENGR).sort(sortI).slice(0, 10);
    const slots = eg.map(tile).join('') + '<i class="pms"></i>'.repeat(Math.max(0, 10 - eg.length));
    return `<div class="pmc"><div class="pml">${slots}</div><div class="row1">${its.map((x) => x.eg ? tile(x).replace(/<\/div>$/, '<b class="pmw" title="Engrams can only be opened at the Tower in game">&#9888;</b></div>') : tile(x)).join('')}</div>${can.length && !SET.hidecollect ? `<button class="g pmb" data-act="collect" data-c="${esc(c.id)}">&#9993; <b>${can.length}</b> Collect Postmaster</button>` : ''}</div>`;
  }
  function mkRoom(ch) {
    const its = D.items.filter((o) => o.loc === ch && !o.e && !o.pm && (WEAPON.has(o.b) || ARMOR.has(o.b))), snaps = its.map(slim);
    if (!its.length) { setNote('Nothing to move off this character.'); return; }
    if (!confirm('Move ' + its.length + ' unequipped weapons and armor from this character to the vault?')) return;
    act('make room (' + its.length + ' items)', () => its.forEach((o) => { o.loc = 'vault'; }), () => pmap(snaps, (s) => gt.move({ item: s, from: ch, to: 'vault' })), true);
  }
  let dragPend = false;
  // Narrow or portrait screens: shrink the item tiles just enough that the characters and the vault fit the window, instead of scrolling sideways.
  let fitT = 0;
  function fitTiles() {
    const v = document.getElementById('vault'), g0 = v && v.querySelector('#vgrid'); if (!v || !g0 || !D || !v.classList.contains('on')) return;
    const avail = g0.clientWidth; if (!avail) return;
    const ph = PHONE.matches; // phone: one character at a time, vault underneath, so nothing else needs room beside the character
    const n = visChars().length, iw = +SET.invw || 3, gap = ph ? 0 : 30, vmin = SET.vaultunder || ph ? 0 : 240;
    const want = +SET.tile || 44, per = n * (iw + 1.9), fit = Math.floor((avail - n * (10 + gap) - vmin) / per);
    const t = Math.max(26, Math.min(want, fit));
    if (t !== fitT) { fitT = t; if (t < want) v.style.setProperty('--t', t + 'px'); else v.style.removeProperty('--t'); }
  }
  { const vs = document.getElementById('vault'); if (vs) new MutationObserver(() => { if (vs.classList.contains('on')) requestAnimationFrame(fitTiles); }).observe(vs, { attributes: true, attributeFilter: ['class'] }); }
  let fitQ = 0; window.addEventListener('resize', () => { cancelAnimationFrame(fitQ); fitQ = requestAnimationFrame(fitTiles); });
  // Replace only the cells that changed, so a move does not rebuild (and re-decode) every item picture.
  let lastGridHTML = '';
  function patchGrid(el, html) {
    if (html === lastGridHTML && el.firstElementChild) return; // nothing changed: skip parsing and painting entirely
    lastGridHTML = html;
    const t = document.createElement('template'); t.innerHTML = html;
    const nu = t.content.firstElementChild, old = el.firstElementChild;
    if (!old || !nu || el.children.length !== 1 || old.className !== nu.className) { el.replaceChildren(t.content); return; }
    if (old.getAttribute('style') !== nu.getAttribute('style')) old.setAttribute('style', nu.getAttribute('style') || '');
    const a = old.children, b = nu.children;
    if (a.length !== b.length) { el.replaceChildren(t.content); return; }
    for (let i = a.length - 1; i >= 0; i--) if (!a[i].isEqualNode(b[i])) a[i].replaceWith(b[i]);
  }
  function renderGrid() {
    if (dragId) { dragPend = true; return; } // never rebuild the page under a drag in progress
    const y = window.scrollY, el = g('vgrid'); if (!el || !D) return;
    const vc = D.items.filter((x) => x.loc === 'vault').length, vis = visChars(), under = SET.vaultunder || PHONE.matches;
    let h = `<div class="dgrid${under ? ' under' : ''}${PHONE.matches ? ' phone' : ''}" style="--n:${vis.length};--iw:${SET.invw}">`;
    if (PHONE.matches) { const all = sortedChars(), on = vis[0] && vis[0].id; h += `<div class="phsw" role="tablist">${all.map((c) => `<button type="button" role="tab" data-act="phch" data-c="${esc(c.id)}" class="${c.id === on ? 'on' : ''}" style="--cc:${CC[c.cls] || '#3a3d43'}"><b>${esc(CL[c.cls] || 'Guardian')}</b><span>${SV_LIGHT}${c.light}</span></button>`).join('')}</div>`; }
    const curAll = (D.cur || []).slice(), cell = (c) => `<span title="${esc(c.n)}"><img src="${esc(icon(c.i))}" alt="">${Number(c.q).toLocaleString()}</span>`;
    const pick = (re) => { const k = curAll.findIndex((c) => re.test(c.n)); return k < 0 ? null : curAll.splice(k, 1)[0]; };
    const top3 = [pick(/glimmer/i), pick(/chronolog|legendary shard/i), pick(/bright dust/i)].filter(Boolean);
    while (top3.length < 3 && curAll.length) top3.push(curAll.shift());
    const vcell = `<span title="${vc} of ${VCAP} vault spaces">${SV_HELM}${vc}/${VCAP}</span>`, kinds = new Map();
    (D.gen || []).filter((x) => x.b === 1469714392 || x.b === 3865314626).forEach((x) => kinds.set(x.h, { n: x.n, i: x.i, q: (kinds.has(x.h) ? kinds.get(x.h).q : 0) + (x.q || 1) }));
    const modsN = new Set((D.gen || []).filter((x) => x.b === 3313201758).map((x) => x.h)).size;
    const mpop = [...kinds.values()].sort((a, b) => b.q - a.q).map((k) => `<div><b>${Number(k.q).toLocaleString()}</b><img src="${esc(icon(k.i))}" alt=""><span>${esc(k.n)}</span></div>`).join('');
    const vgrid = top3.map(cell).join('') + vcell + `<span class="vcm" title="Consumables and materials">${SV_TRI}${kinds.size}/50<div class="mpop"><h4>Material counts</h4><div class="mpg">${mpop}</div></div></span><span title="Modifications">${SV_MODS}${modsN}/50</span>`;
    const maxAll = Math.max(0, ...vis.map(maxPow));
    const lastP = D.chars.reduce((m, c) => Math.max(m, c.dp || 0), 0);
    h += vis.map((c) => `<div class="ch${SET.emblems && c.em ? ' em' : ''}" style="--cc:${CC[c.cls] || '#3a3d43'}"><div class="chb"><div class="cht" style="${SET.emblems && c.em ? `background-image:linear-gradient(90deg,rgba(0,0,0,.05),rgba(0,0,0,.45)),url(${esc(icon(c.em))})` : ''}">${lastP && c.dp === lastP ? '<i class="chn" title="Last played"></i>' : ''}<div class="chnm"><b>${esc(CL[c.cls] || 'Guardian')}</b>${c.tt ? `<small class="ttl${c.gl ? ' gld' : ''}">${esc(c.tt)}${c.gl ? SV_SEAL : ''}</small>` : ''}</div><span class="chp" title="Light level">${SV_LIGHT}${c.light}</span></div><button class="chm" data-act="chmenu" data-c="${esc(c.id)}" title="Character menu">&#8942;</button></div><div class="chr"><span class="chx" title="Highest power level you could reach with the gear you own">${SV_HELM}${maxPow(c)}</span><span class="chs">${(c.sb || []).map((q) => `<span class="cbn" title="${esc((q.sn ? q.sn + ' - ' : '') + q.n + (q.d ? '\n' + q.d : ''))}"><img src="${esc(icon(q.i))}" alt="" draggable="false"></span>`).join('')}</span></div>${armorStats(c)}</div>`).join('') + `<div class="ch vlt"><div class="chb"><div class="cht vh"><svg class="vlg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="6"/><path d="M16 4v6M16 22v6M4 16h6M22 16h6" stroke-linecap="round"/></svg><div class="chnm"><b>Vault</b></div><span class="chp" title="Highest power level you could reach">${SV_LIGHT}${maxAll}</span><button class="vrf${qload ? ' spin' : ''}" data-act="qrefresh" title="Reload your vault from Bungie (R)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg></button></div></div><div class="vcg">${vgrid}</div></div>`;
    if (SET.postmaster) {
      h += vis.map((c, k) => { const n = D.items.filter((x) => x.loc === c.id && x.pm).length; return `<div class="pmh">${k === 0 ? `<span class="dsec tg" data-tg="1">${pmOpen ? '&#9662;' : '&#9656;'} Postmaster</span>` : ''}<span class="pmn">(${n}/21)</span></div>`; }).join('') + (under ? '' : '<div></div>');
      if (pmOpen) h += vis.map(pmCell).join('') + (under ? '' : '<div></div>');
    }
    const owned = new Set(allI().map((x) => x.b));
    GROUPS.forEach(([label, ids]) => {
      h += `<div class="dsec">${label}</div>`;
      if (label === 'General') ids = [3284755031, ...ids, ...XROWS.slice(1).map((r) => r[0])].filter((b) => SL.some((s) => s[0] === b) || owned.has(b));
      ids.forEach((b) => { h += vis.map((c) => charCell(c, b)).join('') + vaultCell(b); });
    });
    // Inventory: engrams per character, then the account-wide stacks (consumables, mods, shaders, materials).
    const gen = D.gen || [];
    if (gen.length) {
      h += '<div class="dsec">Inventory</div>';
      // One grid of consumables and materials, then one of mods and shaders. (The seasonal artifact is not shown here; it has its own page.)
      const merge = (bs) => { const m = {}; gen.filter((x) => bs.includes(x.b)).forEach((x) => { if (m[x.h]) m[x.h] = { ...m[x.h], q: m[x.h].q + x.q }; else m[x.h] = { ...x, id: 'a:' + x.h }; }); return Object.values(m).sort(sortI); };
      const g1 = merge([1469714392, 3865314626]), g2 = merge([3313201758, 2973005342]);
      if (g1.length) h += `<div class="xg">${g1.map(tile).join('')}</div>`;
      if (g2.length) h += `<div class="xg xg2">${g2.map(tile).join('')}</div>`;
    }
    patchGrid(el, h + '</div>');
    fitTiles();
    window.scrollTo(0, y);
    try { pmBadge(vis); } catch (e) { /* badge is optional */ }
    if (window.__gtf) { try { window.__gtf.after(); } catch (e) { console.error('features: ' + (e && e.stack || e)); } }
  }
  // Postmaster count of the first character, drawn on the taskbar icon (Windows).
  let lastBadge = -1;
  function pmBadge(vis) {
    if (!window.gt || !gt.badge) return;
    const c = vis[0], n = SET.pmbadge && c && D ? Math.min(99, D.items.filter((x) => x.loc === c.id && x.pm).length) : 0;
    if (n === lastBadge) return; lastBadge = n;
    let png = '';
    if (n) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 32; const cx = cv.getContext('2d');
      cx.fillStyle = '#d9502f'; cx.beginPath(); cx.arc(16, 16, 15, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#fff'; cx.font = 'bold ' + (n > 9 ? 17 : 22) + 'px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(n), 16, 17);
      png = cv.toDataURL('image/png');
    }
    gt.badge({ n, png }).catch(() => {});
  }
  window.__gtRender = () => { if (D) { renderGrid(); renderLoTab(); } };
  // What the extra features (features.js) need from the vault screen.
  window.__gtv = {
    D: () => D, byId: (id) => byId(id), act: (...a) => act(...a), slim: (x) => slim(x), tile: (x) => tile(x), gt: () => gt, esc,
    TAGS: () => TAGS(), saveTAGS: (o) => saveTAGS(o), charFor: (x) => charFor(x), WEAPON: () => WEAPON, ARMOR: () => ARMOR, CL: () => CL, icon: (p) => icon(p),
    q: () => q, match: (x) => match(x), render: () => renderGrid(), pop: () => renderPop(), open: (id, el) => openPop(id, el), sel: () => sel, psel: () => psel, plast: () => plast,
    chars: () => sortedChars(), ent: (id) => ent(id), CC, clean: (e) => clean(e), set: () => SET, sortI: (a, b) => sortI(a, b),
    sync: async () => { D = await fetchD(); renderGrid(); renderLoTab(); },
    det: (id) => DET[id], pn: () => (D && D.pn) || {}, note: (t) => setNote(t), busy: () => busy, pmap: (l, f) => pmap(l, f), wish: (x) => wish(x), wlOn: () => !!WL, wlReload: () => wlLoad(), load: () => load(), PMSG: (t) => { PMSG = t; renderPop(); },
  };
  function shell() {
    const hp = '<b>Search</b> works like DIM. Plain words match names, types and every perk (weapon perks and their options, armor perks and mods, subclass aspects and fragments). Words are all required; <code>or</code> between words means either; a leading <code>-</code> excludes; use quotes for phrases. Suggestions appear as you type (Tab or Enter to use one).<br>'
      + '<b>is:</b> <code>is:exotic</code> <code>is:handcannon</code> <code>is:smg</code> <code>is:sword</code> <code>is:solar</code> <code>is:strand</code> <code>is:prismatic</code> <code>is:primary</code> <code>is:heavy</code> <code>is:barrier</code> <code>is:crafted</code> <code>is:deepsight</code> <code>is:adept</code> <code>is:masterwork</code> <code>is:locked</code> <code>is:equipped</code> <code>is:inloadout</code> <code>is:duplicate</code> <code>is:wishlist</code> <code>is:trashlist</code> <code>is:tagged</code> <code>is:hasnotes</code> <code>is:subclass</code> <code>is:titan</code> <code>not:locked</code><br>'
      + '<b>Filters:</b> <code>perk:rampage</code> <code>perk:\"kill clip\"</code> <code>exactperk:\"firefly\"</code> <code>name:ace</code> <code>notes:pvp</code> <code>tag:junk</code> <code>element:void</code> <code>slot:kinetic</code> <code>ammo:special</code> <code>breaker:overload</code> <code>power:&gt;=550</code> <code>stat:health:&gt;=30</code> <code>total:&gt;=65</code> <code>customtotal:&gt;=60</code> <code>energy:&gt;=10</code> <code>tier:5</code> <code>class:titan</code> <code>is:shotgun or is:sniper</code><br><b>Mouse:</b> click an item for details and perks, right-click for the item menu, drag to move or equip. <b>Keys:</b> <code>/</code> search, <code>Esc</code> close, <code>L</code> lock (item open), <code>Shift+1..5</code> tags (item open).';
    const bar = `<div class="vbar"><span class="vnm" title="Signed in as ${esc(D.name || '')}">${esc(D.name || '')}</span><input id="vq" placeholder="Search names, perks, subclasses, is:handcannon, perk:rampage, is:solar..." value="${esc(q)}" autocomplete="off" spellcheck="false"><span class="vtg"><button class="g ib" data-act="savq" title="Saved searches"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg></button></span><span class="vtg"><button class="g ib${FARM.on ? ' on' : ''}" data-act="farm" title="${FARM.on ? 'Farming mode is on: unequipped weapons and armor go to the vault so your inventory never fills. Click to stop.' : 'Farming mode: keep moving unequipped weapons and armor to the vault while you play'}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v10M8 10.5l4 4 4-4M4.5 15.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3.5"/></svg></button><button class="g ib" data-act="junk" title="Junk finder: duplicates and trash rolls you could dismantle"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V7M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12M10 11v5.5M14 11v5.5"/></svg></button><button class="g ib" data-f="bulk" title="Select several items at once (Ctrl+click works any time)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/></svg></button></span><span class="vtg"><button class="g ib" data-act="sets" title="Loadouts"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7h11M8 12h11M8 17h11"/><circle cx="4.6" cy="7" r=".6" fill="currentColor"/><circle cx="4.6" cy="12" r=".6" fill="currentColor"/><circle cx="4.6" cy="17" r=".6" fill="currentColor"/></svg></button><button class="g ib" data-act="help" title="Search and shortcut help"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 16.9v.2"/></svg></button><button class="g ib" data-act="refresh" title="Reload from Bungie"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/></svg></button></span></div>`;
    const slot = document.getElementById('gtsrch');
    sec.innerHTML = `${slot ? '' : '<div class="card vcard">' + bar + '</div>'}<div id="vfx"></div><div id="vhelp" class="card">${hp}</div><p id="vnote" class="mute"></p><div id="vgrid"></div><div id="vpop"></div>`;
    if (slot) { slot.replaceChildren(); slot.insertAdjacentHTML('beforeend', bar); slot.querySelector('.vbar').onclick = (e) => sec.onclick(e); }
    const vqi = g('vq');
    vqi.oninput = (e) => { if (!autoFix(e.target, e)) LASTAC = null; q = e.target.value.toLowerCase(); renderGrid(); sugDraw(e.target); };
    vqi.onkeydown = sugKey;
    vqi.onfocus = (e) => sugDraw(e.target);
    vqi.onblur = () => setTimeout(() => { const bx = document.getElementById('vqs'); if (bx && document.activeElement !== g('vq')) bx.remove(); }, 120);
    renderGrid();
  }

  // ---- actions (optimistic: the screen updates at once, then Bungie confirms) ----
  // Every action is applied on screen immediately and its calls to Bungie wait in a line, one after another, so you can keep
  // dragging while earlier moves are still going. A short "ledger" remembers where Bungie has been told things went, because
  // Bungie's profile lags behind for a while; without it a reload brought back items that had already been moved (ghosts).
  const stamp = (x) => (x.loc || '') + '|' + (x.e ? 1 : 0) + '|' + (x.pm ? 1 : 0);
  function reconcile(n) {
    const now = Date.now(), ids = Object.keys(LEDGER); if (!ids.length) return n;
    const by = new Map(n.items.map((x) => [x.id, x]));
    ids.forEach((id) => {
      const l = LEDGER[id];
      // An item taken out of the postmaster can never go back into it, so that one is remembered longer (Bungie can lag for minutes).
      if (l.at && now - l.at > (l.pmx ? 600000 : LED_MS)) { delete LEDGER[id]; return; }
      const s = by.get(id);
      if (!s) return; // gone from Bungie's list (dismantled or deleted): leave it gone
      if (stamp(s) === l.k) { if (l.at) delete LEDGER[id]; return; } // Bungie has caught up
      s.loc = l.loc; s.e = l.e; s.pm = l.pm; // Bungie is still showing the old place
    });
    return n;
  }
  // Loads the vault from Bungie. An older copy than the one on screen is ignored, so a lagging reply cannot undo what you just did.
  async function fetchD(force) {
    const n = await gt.loadVault();
    if (!force && D && n.ts && D.ts && n.ts < D.ts) return D;
    return reconcile(n);
  }
  function qNote(label) { setNote(qn > 1 ? 'Working: ' + label + ' (' + (qn - 1) + ' more waiting)...' : 'Working: ' + label + '...'); }
  function act(label, apply, call, refresh, par) {
    sel = null; renderPop();
    const before = new Map(D.items.map((x) => [x.id, { loc: x.loc, e: x.e, pm: x.pm, k: stamp(x) }]));
    apply();
    const led = [];
    D.items.forEach((x) => { const b = before.get(x.id); if (b && b.k !== stamp(x)) { led.push({ id: x.id, b }); LEDGER[x.id] = { loc: x.loc, e: x.e ? 1 : 0, pm: x.pm ? 1 : 0, k: stamp(x), at: 0, pmx: b.pm && !x.pm ? 1 : 0 }; } });
    qn++; busy = label; qNote(label);
    if (lazyNext) { lazyNext = false; requestAnimationFrame(() => setTimeout(() => { renderGrid(); renderLoTab(); }, 0)); } else { renderGrid(); renderLoTab(); }
    const run = async () => {
      qNote(label);
      let good = true, why = '';
      let part = null;
      try { part = await call(); } catch (e) { good = false; why = clean(e); }
      // A call may report that only some of its items worked: those (and the items they pushed aside) go back to what Bungie says.
      if (good && part && Array.isArray(part.revert) && part.revert.length) {
        const bad = new Set(part.revert), slots = new Set();
        bad.forEach((id) => { const o = byId(id); if (o) slots.add(o.b + '|' + o.loc); });
        led.forEach((l) => { const o = byId(l.id); if (bad.has(l.id) || (o && l.b.e && slots.has(o.b + '|' + o.loc))) delete LEDGER[l.id]; });
        try { D = await fetchD(true); } catch (e) { part.revert.forEach((id) => { const l = led.find((q) => q.id === id), o = byId(id); if (l && o) { o.loc = l.b.loc; o.e = l.b.e; o.pm = l.b.pm; } }); }
      }
      qn--;
      if (good) { const t = Date.now(); led.forEach((l) => { if (LEDGER[l.id]) LEDGER[l.id].at = t; }); }
      else {
        led.forEach((l) => { delete LEDGER[l.id]; });
        // Put those items back where Bungie says they are; if Bungie cannot be reached, put them back where they were.
        try { D = await fetchD(true); } catch (e) { led.forEach((l) => { const o = byId(l.id); if (o) { o.loc = l.b.loc; o.e = l.b.e; o.pm = l.b.pm; } }); }
        qbad = why;
      }
      if (good && refresh && qn === 0) { try { D = await fetchD(); } catch (e) { /* keep screen state */ } }
      if (qn === 0) busy = '';
      renderGrid(); renderLoTab();
      const pnote = part && Array.isArray(part.failed) && part.failed.length ? 'Done, except ' + part.failed.slice(0, 3).map((f) => f.n + ' (' + f.why.replace(/^.*?:\s*/, '') + ')').join(', ') + (part.failed.length > 3 ? ' and ' + (part.failed.length - 3) + ' more' : '') : '';
      if (qn === 0) { setNote(qbad ? 'Failed: ' + qbad : pnote || 'Done: ' + label); qbad = ''; }
      else if (pnote) setNote(pnote);
      else if (!good) setNote('Failed: ' + why);
      if (good) { clearTimeout(resync); resync = setTimeout(async () => { if (qn > 0 || sel) return; try { D = await fetchD(); renderGrid(); renderLoTab(); } catch (e) { /* ignore */ } }, 8000); }
      return good;
    };
    if (par) {
      const prevQ = Q, prevIt = ITQ[par] || Promise.resolve();
      const p = Promise.all([prevQ.catch(() => {}), prevIt.catch(() => {})]).then(parSlot).then(() => run().finally(parFree));
      PAR.add(p); ITQ[par] = p;
      p.finally(() => { PAR.delete(p); if (ITQ[par] === p) delete ITQ[par]; });
      return p;
    }
    Q = Q.then(() => Promise.allSettled([...PAR])).then(run, run);
    return Q;
  }
  // Keep up with what happens in game: reload quietly when you come back to the window and every minute while it is open,
  // but never while moves are still going, a menu is open, or a loadout is being edited.
  let lastSync = Date.now();
  async function autoSync(why) {
    if (!D || qn > 0 || sel || document.hidden || !sec.classList.contains('on') && !document.getElementById('loadouts').classList.contains('on')) return;
    if (document.getElementById('dlmod') || document.getElementById('apm') || document.getElementById('dled')) return;
    if (Date.now() - lastSync < (why === 'focus' ? 15000 : 55000)) return;
    lastSync = Date.now();
    try { D = await fetchD(); renderGrid(); renderLoTab(); } catch (e) { /* try again next time */ }
  }
  window.addEventListener('focus', () => autoSync('focus'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) autoSync('focus'); });
  setInterval(() => autoSync('timer'), 60000);
  const charFor = (x) => (x.loc === 'vault' || !ent(x.loc) ? sortedChars()[0].id : x.loc);
  async function toggleLock(x) {
    const want = x.lk ? 0 : 1, id = x.id;
    x.lk = want; PMSG = ''; renderPop(); renderGrid(); renderLoTab();
    try { await gt.itemLock({ id, state: !!want, char: charFor(x) }); PMSG = want ? 'Locked.' : 'Unlocked.'; }
    catch (er) { x.lk = want ? 0 : 1; PMSG = 'Failed: ' + clean(er); }
    renderPop(); renderGrid(); renderLoTab();
  }
  function setTag(x, v) { const o = TAGS(); if (o[x.id] === v) delete o[x.id]; else o[x.id] = v; saveTAGS(o); renderPop(); renderGrid(); renderLoTab(); }
  // Put the dragged tile where it is going right away (same frame as the drop); the full redraw follows a moment later.
  let lazyNext = false;
  function quickPlace(it, loc, equip) {
    try {
      const t = sec.querySelector('#vgrid .vt[data-id="' + CSS.escape(String(it.id)) + '"]'); if (!t) return;
      let dst = null;
      const eq = loc !== 'vault' ? sec.querySelector('#vgrid .eq[data-loc="' + CSS.escape(loc) + '"][data-b="' + it.b + '"]') : null;
      if (equip && eq) { const old = eq.querySelector('.vt'), inv = eq.parentElement.querySelector('.inv'); if (old && inv) inv.prepend(old); dst = eq; }
      else if (loc === 'vault') { const v = sec.querySelector('#vgrid .dc.v[data-b="' + it.b + '"]'); dst = v && (v.querySelector('.vgt') || v); }
      else if (eq) dst = eq.parentElement.querySelector('.inv');
      if (dst) { dst.appendChild(t); t.classList.remove('dragging'); lastGridHTML = ''; lazyNext = true; }
    } catch (e) { /* the full redraw puts it right */ }
  }
  function doMove(it, to) {
    quickPlace(it, to, false);
    const s = slim(it), from = it.loc;
    act('move ' + it.n, () => { it.loc = to; }, () => gt.move({ item: s, from, to }), false, String(it.id));
  }
  // The + under an equipped item: everything you could equip in that slot on that character, best power first. One click equips it.
  function eqPick(t) {
    const old = document.getElementById('eqpick'); if (old) { const same = old.dataset.k === t.dataset.c + t.dataset.b; old.remove(); if (same) return; }
    const c = D.chars.find((x) => x.id === t.dataset.c), b = +t.dataset.b; if (!c) return;
    const list = D.items.filter((x) => x.b === b && !x.pm && !x.ro && !(x.loc === c.id && x.e) && (x.c === 3 || x.c === undefined || x.c === c.cls) && match(x)).sort((p, q2) => (q2.r === 'Exotic') - (p.r === 'Exotic') || (q2.p || 0) - (p.p || 0)).slice(0, 60);
    const m = document.createElement('div'); m.id = 'eqpick'; m.dataset.k = t.dataset.c + t.dataset.b;
    m.innerHTML = `<h6>Equip on ${esc(CL[c.cls] || 'Guardian')}: ${esc(slotName(b))}</h6>${list.length ? `<div class="eqg">${list.map((x) => tile(x).replace(' draggable="true"', '')).join('')}</div>` : '<p>Nothing else you own fits this slot' + (q ? ' with this search' : '') + '.</p>'}${q ? '<p>Only items matching your search are listed.</p>' : ''}`;
    const r = t.getBoundingClientRect(); document.body.appendChild(m);
    const w = m.offsetWidth, hgt = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px'; m.style.top = (r.bottom + hgt + 8 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - hgt - 4)) + 'px';
    m.addEventListener('click', (e) => { const v = e.target.closest('.vt[data-id]'); if (!v) return; e.stopPropagation(); const it = byId(v.dataset.id); m.remove(); if (it) doEquip(it, c.id); });
    setTimeout(() => { const off = (e) => { if (!m.contains(e.target) && !e.target.closest('[data-act=eqpick]')) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; document.addEventListener('pointerdown', off, true); }, 0);
  }
  function doEquip(it, to) {
    quickPlace(it, to, true);
    const s = slim(it);
    act('equip ' + it.n, () => {
      it.loc = to;
      D.items.forEach((o) => { if (o !== it && o.loc === to && o.b === it.b && o.e) o.e = 0; });
      it.e = 1;
    }, () => gt.equip({ item: s, to }));
  }

  // ---- drag and drop ----
  // Drop on a character's equipped slot to equip. Drop anywhere else on a character column to move it there. Drop on the vault column to vault it.
  let overEl = null, dzEls = [];
  const clearDz = () => { dzEls.forEach((z) => z.classList.remove('dz', 'eqok')); dzEls = []; };
  const clearOver = () => { if (overEl) overEl.classList.remove('over'); overEl = null; };
  function dropInfo(zone) {
    const it = byId(dragId); if (!it || it.e || it.pm || it.ro) return null;
    const kind = zone.dataset.drop, loc = zone.dataset.loc;
    if (kind === 'eq') {
      const c = D.chars.find((x) => x.id === loc);
      if (!c || +zone.dataset.b !== it.b) return null;
      if (!(it.c === 3 || it.c === undefined || it.c === c.cls)) return null;
      return { kind: 'equip', loc };
    }
    return it.loc === loc ? null : { kind: 'move', loc };
  }
  function zoneFor(el) {
    let z = el && el.closest ? el.closest('[data-drop]') : null;
    while (z) { const info = dropInfo(z); if (info) return { z, info }; z = z.parentElement ? z.parentElement.closest('[data-drop]') : null; }
    return null;
  }
  // Dragging items: done with the mouse directly (like DIM's feel) instead of the browser's built-in drag and drop, which on Windows
  // waits on the system drag loop and can add half a second before a drop lands. A press that moves less than 5px is still a click.
  let pd = null, swallowClick = false;
  const lightZones = (it) => { dzEls = [...sec.querySelectorAll('#vgrid .dc[data-b="' + it.b + '"]')].filter((z) => z.dataset.drop === 'vault' || dropInfo(z) || z.dataset.loc === it.loc); dzEls.forEach((z) => { z.classList.add('dz'); const q = z.querySelector(':scope > .eq'); if (q && dropInfo(q)) { q.classList.add('eqok'); dzEls.push(q); } }); };
  sec.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || !D) return;
    if (e.pointerType === 'touch' && PHONE.matches) return; // on a phone a finger on an item scrolls the page; items move with the buttons in the item sheet
    const t = e.target.closest && e.target.closest('#vgrid .vt'); if (!t) return;
    const it = byId(t.dataset.id); if (!it || it.e || it.pm || it.ro) return;
    pd = { id: it.id, t, x: e.clientX, y: e.clientY, on: false, g: null, raf: 0, lx: e.clientX, ly: e.clientY };
  });
  function pdMove(e) {
    if (!pd) return;
    if (!pd.on) {
      if (Math.abs(e.clientX - pd.x) + Math.abs(e.clientY - pd.y) < 5) return;
      const it = byId(pd.id); if (!it) { pd = null; return; }
      pd.on = true; dragId = it.id; pd.t.classList.add('dragging'); document.body.classList.add('vdragging'); lightZones(it);
      const r = pd.t.getBoundingClientRect(), g = pd.t.cloneNode(true); g.classList.add('vghost'); g.classList.remove('dragging');
      g.style.cssText = 'position:fixed;left:0;top:0;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;z-index:9999;pointer-events:none;opacity:.9';
      pd.ox = r.width / 2; pd.oy = r.height / 2; pd.g = g; document.body.appendChild(g);
    }
    e.preventDefault();
    pd.lx = e.clientX; pd.ly = e.clientY;
    if (!pd.raf) pd.raf = requestAnimationFrame(() => {
      if (!pd) return; pd.raf = 0;
      pd.g.style.transform = 'translate3d(' + (pd.lx - pd.ox) + 'px,' + (pd.ly - pd.oy) + 'px,0) scale(1.06)';
      const el = document.elementFromPoint(pd.lx, pd.ly), r = el ? zoneAt({ target: el, clientX: pd.lx, clientY: pd.ly }) : null;
      if (!r) clearOver(); else if (overEl !== r.z) { clearOver(); r.z.classList.add('over'); overEl = r.z; }
    });
  }
  function pdEnd(e, cancel) {
    if (!pd) return;
    const p = pd; pd = null;
    if (p.raf) cancelAnimationFrame(p.raf);
    if (!p.on) return; // it was a click
    swallowClick = true; setTimeout(() => { swallowClick = false; }, 0);
    const el = cancel ? null : document.elementFromPoint(e.clientX, e.clientY), r = el ? zoneAt({ target: el, clientX: e.clientX, clientY: e.clientY }) : null, it = byId(dragId);
    if (p.g) p.g.remove(); p.t.classList.remove('dragging'); document.body.classList.remove('vdragging');
    clearOver(); clearDz(); dragId = null;
    if (r && it) { r.info.kind === 'equip' ? doEquip(it, r.info.loc) : doMove(it, r.info.loc); }
    if (dragPend) { dragPend = false; renderGrid(); }
  }
  window.addEventListener('pointermove', pdMove, { passive: false });
  window.addEventListener('pointerup', (e) => pdEnd(e, false));
  window.addEventListener('pointercancel', (e) => pdEnd(e, true));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pd && pd.on) pdEnd(e, true); });
  sec.addEventListener('click', (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
  sec.addEventListener('dragstart', (e) => {
    if (e.isTrusted && e.target.closest && e.target.closest('#vgrid .vt')) { e.preventDefault(); return; } // real drags use the mouse code above
    const t = e.target.closest && e.target.closest('.vt'); if (!t || !D) return;
    const it = byId(t.dataset.id);
    if (!it || it.e || it.pm || it.ro) { e.preventDefault(); return; }
    dragId = it.id; t.classList.add('dragging');
    // light up every column this item can be dropped in, right away
    dzEls = [...sec.querySelectorAll('#vgrid .dc[data-b="' + it.b + '"]')].filter((z) => { return z.dataset.drop === 'vault' || dropInfo(z) || z.dataset.loc === it.loc; });
    dzEls.forEach((z) => z.classList.add('dz'));
    try {
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.id);
      const im = t.querySelector('img'); if (im && im.width) e.dataTransfer.setDragImage(im, im.width / 2, im.height / 2); // small picture: much faster than snapshotting the whole tile
    } catch (er) { /* ignore */ }
  });
  sec.addEventListener('dragend', () => {
    dragId = null; clearOver(); clearDz(); sec.querySelectorAll('.dragging').forEach((n) => n.classList.remove('dragging'));
    if (dragPend) { dragPend = false; renderGrid(); }
  });
  // The zone under the pointer, or (in the small gaps between columns) the lit-up column nearest to it, so a drop never just fails.
  function zoneAt(e) {
    const r = zoneFor(e.target); if (r) return r;
    let best = null, bd = 40;
    for (const z of dzEls) {
      const b = z.getBoundingClientRect(); if (e.clientY < b.top - 16 || e.clientY > b.bottom + 16) continue;
      const d = e.clientX < b.left ? b.left - e.clientX : e.clientX > b.right ? e.clientX - b.right : 0;
      if (d < bd) { bd = d; best = z; }
    }
    if (!best) return null; const info = dropInfo(best); return info ? { z: best, info } : null;
  }
  sec.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const r = zoneAt(e);
    if (!r) { clearOver(); return; }
    e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (er) { /* ignore */ }
    if (overEl !== r.z) { clearOver(); r.z.classList.add('over'); overEl = r.z; }
  });
  sec.addEventListener('drop', (e) => {
    if (!dragId) return;
    const r = zoneAt(e), it = byId(dragId);
    dragId = null; clearOver(); clearDz();
    if (!r || !it) return;
    e.preventDefault();
    r.info.kind === 'equip' ? doEquip(it, r.info.loc) : doMove(it, r.info.loc);
  });

  // ---- click menu: stats and perks, laid out like DIM ----
  const ELEM = { 1: ['Kinetic', '#d0d0d0'], 2: ['Arc', '#7ac7f2'], 3: ['Solar', '#f58a3a'], 4: ['Void', '#b58be8'], 6: ['Stasis', '#7fa9e6'], 7: ['Strand', '#59d18a'] };
  let psel = {}, noteEdit = false, PMSG = '', pex = '';
  const BRK = { 1: 'Barrier (shield-piercing)', 2: 'Overload (disruption)', 3: 'Unstoppable (stagger)' };
  const NOTES = () => { try { return JSON.parse(localStorage.getItem('gt_notes')) || {}; } catch (e) { return {}; } };
  const pimg = (p) => (p && p.i ? `<img src="${esc(icon(p.i))}" alt="">` : '');
  // "Preview Wishlist Perks": the one wish list roll (or Farming target) that suits this weapon best, perk by perk, instead of
  // mixing perks from different rolls. Best = names the most columns, then needs the fewest changes, then comes first in the list.
  function bestRoll(x, d) {
    const P = new Set(x.pk || []), name = (h) => (D && D.pn && D.pn[h]) || '';
    const cols = []; d.groups.forEach((gr, gi) => { if (gr.label !== 'Perks') return; gr.cols.forEach((col, ci) => cols.push({ k: gi + '-' + ci, col, on: col.find((p) => p.on) || col[0] })); });
    const cand = [];
    const T = window.__gtt, th = T && T.hit ? T.hit(x) : null;
    if (th && th.perks && th.perks.size) cand.push({ hs: [...th.perks].filter((v) => typeof v === 'number'), names: [...th.perks].filter((v) => typeof v === 'string'), note: 'Farming target: ' + th.name, pri: 1 });
    if (WL && x.pk) for (const r of [...(WL.rolls[x.h] || []), ...(WL.rolls['*'] || [])]) {
      if (typeof r[0] === 'string') r[0] = r[0] ? r[0].split(',').map(Number) : [];
      if (r[2] || !r[0].length || !r[0].every((h) => P.has(h))) continue;
      cand.push({ hs: r[0], names: [], note: typeof r[1] === 'number' ? (WL.notes || [])[r[1]] || '' : r[1] || '', pri: 0 });
    }
    let best = null;
    const allH = new Set(); cols.forEach(({ col }) => col.forEach((p) => { if (p.h) allH.add(p.h); }));
    cand.forEach((c, order) => {
      // by hash; by name only for a perk this copy has in its other version (enhanced or not), so names never match the wrong column
      const want = new Set(c.hs), wantN = new Set([...c.hs.filter((h) => !allH.has(h)).map(name).filter(Boolean), ...c.names.filter(() => c.pri)]), pick = {}; let spec = 0, keep = 0, can = 0;
      cols.forEach(({ k, col, on }) => {
        const hits = col.filter((p) => want.has(p.h) || wantN.has(p.n)); if (!hits.length) return;
        spec++;
        // what is already in the weapon first; otherwise one Bungie lets you put in (the enhanced one if both are there)
        const ch = hits.find((p) => p === on) || hits.filter((p) => p.ci).pop() || hits[hits.length - 1];
        if (ch === on) keep++; if (ch === on || ch.ci) can++;
        pick[k] = col.indexOf(ch);
      });
      if (!spec) return;
      const score = c.pri * 1e6 + spec * 1e4 + can * 100 + keep - order * 1e-3;
      if (!best || score > best.score) best = { score, pick, note: c.note, spec, keep, n: cand.length };
    });
    return best;
  }
  // Stats after the perks you have clicked: current stats, minus the active perk's bonus, plus the previewed perk's bonus.
  function liveStats(d) {
    const delta = {};
    d.groups.forEach((gr, gi) => gr.cols.forEach((col, ci) => {
      const k = gi + '-' + ci, on = col.find((p) => p.on), pick = psel[k] !== undefined ? col[psel[k]] : on;
      if (!pick || pick === on) return;
      (pick.s || []).forEach(([h, v]) => { delta[h] = (delta[h] || 0) + v; });
      ((on && on.s) || []).forEach(([h, v]) => { delta[h] = (delta[h] || 0) - v; });
    }));
    return d.stats.map((s) => { const dv = delta[s.h] || 0; return { ...s, nv: Math.max(0, s.num ? s.v + dv : Math.min(s.max || 100, s.v + dv)), dv }; });
  }
  // After a perk change, Bungie keeps sending the old perk for a few seconds. Show the new perk right away, then check with Bungie
  // a little later and take its answer once it agrees (or once enough time has passed that it must be right).
  function markPlug(id, si, h) {
    const d = DET[id], x = byId(id);
    if (d && d.groups) d.groups.forEach((gr) => gr.cols.forEach((col) => { if (col.some((q) => q.si === si && q.h === h)) { const old = col.find((q) => q.on); col.forEach((q) => { q.on = q.h === h; }); if (x && x.pk && old && old.h !== h) { const i = x.pk.indexOf(old.h); if (i >= 0) x.pk[i] = h; else x.pk.push(h); } } }));
    if (x) { Object.keys(wcache).forEach((k) => { if (k.startsWith(id + ':')) delete wcache[k]; }); }
  }
  function confirmPlugs(id, h, want) {
    if (!want.length) return;
    const agrees = (d) => want.every(([si, ph]) => d && d.groups && d.groups.some((gr) => gr.cols.some((col) => col.some((q) => q.si === si && q.h === ph && q.on))));
    [6000, 20000].forEach((ms, n) => setTimeout(async () => {
      let d; try { d = await gt.itemDetail({ id, h }); } catch (er) { return; }
      if (agrees(d) || n === 1) { DET[id] = d; if (!agrees(d)) want.forEach(([si, ph]) => markPlug(id, si, ph)); if (sel === id) renderPop(); }
    }, ms));
  }
  // Perks you have clicked that differ from what is equipped right now.
  function psChanges(d) {
    const out = [];
    d.groups.forEach((gr, gi) => { if (gr.label !== 'Perks') return; gr.cols.forEach((col, ci) => {
      const k = gi + '-' + ci, on = col.find((p) => p.on) || col[0];
      if (psel[k] === undefined || !col[psel[k]] || col[psel[k]] === on) return;
      out.push({ k, si: col[psel[k]].si, h: col[psel[k]].h, ci: !!col[psel[k]].ci });
    }); });
    return out;
  }
  // Clarity community perk descriptions (hash -> text), fetched once by the main process.
  let CLAR = null, CLARQ = false;
  function clarLoad() {
    if (SET.clarity === 'bungie' || CLAR || CLARQ || !window.gt || !gt.clarity) return;
    CLARQ = true;
    gt.clarity().then((o) => { CLAR = o && typeof o === 'object' ? o : {}; CLARQ = false; renderPop(); }).catch(() => { CLAR = {}; CLARQ = false; });
  }
  // Custom stat total: the armor stats picked for this item's class in Settings.
  const cRow = (x) => (x && ARMOR.has(x.b) && x.c >= 0 && x.c <= 2 && SET.cst && SET.cst[x.c] && SET.cst[x.c].some(Boolean) ? SET.cst[x.c] : null);
  const cTot = (x) => { const r = cRow(x); return r && x.st ? x.st.reduce((a, v, i) => a + (r[i] ? v : 0), 0) : null; };
  function customRow(x, stats) {
    const r = cRow(x); if (!r) return '';
    const names = CSTN.filter((n, i) => r[i]);
    let v = 0, n = 0;
    names.forEach((nm) => { const z = stats.find((q) => String(q.n).toLowerCase() === nm.toLowerCase()); if (z) { v += z.nv; n++; } });
    if (!n) { const t = cTot(x); if (t === null) return ''; v = t; }
    return `<div class="dpsb cust" title="${esc(names.join(' + '))}"><span>Custom Total</span><b>${v}</b><i>${esc(names.map((z) => z.slice(0, 3)).join(' + '))}</i></div>`;
  }
  // Things that can be worn or used from the inventory (not just stored): subclass, ghost, sparrow, ship, emblem.
  const EQB = new Set([3284755031, 284967655, 4274335291, 4023194814, 2025709351]);
  const NOMOVE = new Set([3865314626, 375726501]); // materials and engrams cannot be moved between places
  const isStack = (x) => !!(x && x.ro && typeof x.id === 'string' && /^[sa]:/.test(x.id));
  let ptab = 'ov', scol = false, stq = 0, popEl = null;
  const INFO = {};
  function detailHTML(d, x) {
    clarLoad();
    const stats = liveStats(d);
    const isA = !!(x && ARMOR.has(x.b)), sti = (D && D.sti) || [], SHI = [2996146975, 392767087, 1943323491, 1735777505, 144602215, 4244567218];
    const SHORT = { 'Rounds Per Minute': 'RPM', 'Airborne Effectiveness': 'Airborne', 'Aim Assistance': 'Aim Assist', 'Ammo Generation': 'Ammo Gen', 'Charge Time': 'Charge Time', 'Blast Radius': 'Blast Radius' };
    const DORD = [392767087, 4244567218, 1735777505, 144602215, 1943323491, 2996146975]; // health, melee, grenade, super, class, weapons (DIM's armor order)
    const prim = new Set(); if (d.arche && d.arche.d) { const m1 = /Primary Stat:\s*([A-Za-z ]+)/i.exec(d.arche.d), m2 = /Secondary Stat:\s*([A-Za-z ]+)/i.exec(d.arche.d); [m1, m2].forEach((m) => { if (m) prim.add(m[1].trim().toLowerCase()); }); }
    const seg = (s, mx) => {
      const mb = s.mb || 0, mw = s.mw || 0, base = Math.max(0, Math.min(s.v, s.nv) - mb - mw), diff = Math.abs(s.nv - s.v);
      const w = (n) => (n / mx * 100) + '%', cls = s.nv > s.v ? 'up' : 'dn';
      return `<div class="dpbar"><i style="width:${w(base)}"></i>${mb ? `<i class="mb" style="width:${w(mb)}"></i>` : ''}${mw ? `<i class="mwb" style="width:${w(mw)}"></i>` : ''}${diff ? `<u class="${cls}" style="width:${w(diff)}"></u>` : ''}</div>`;
    };
    const ord = isA ? stats.slice().sort((p, q) => DORD.indexOf(p.h) - DORD.indexOf(q.h)) : stats;
    const rows = ord.length ? '<div class="dpss' + (isA ? ' arm' : '') + '">' + ord.map((s) => {
      const cls = s.nv > s.v ? 'up' : s.nv < s.v ? 'dn' : '', si = SHI.indexOf(s.h), ic = isA && si >= 0 && sti[si] ? `<img class="dpsi" src="${esc(icon(sti[si]))}" alt="">` : '';
      if (s.num) return `<div class="dpsb"><span>${esc(SHORT[s.n] || s.n)}</span><b class="${cls}">${s.nv}</b><i></i><div></div></div>`;
      return `<div class="dpsb${prim.has(s.n.toLowerCase()) ? ' pri' : ''}"><span title="${esc(s.n)}">${esc(SHORT[s.n] || s.n)}</span><b class="${cls}">${isA ? '+' : ''}${s.nv}</b><i>${ic}</i>${seg(s, isA ? 45 : (s.max || 100))}</div>`;
    }).join('') + (isA && d.tot ? (() => { const tv = ord.reduce((t, z) => t + z.nv, 0), mbt = ord.reduce((t, z) => t + (z.mb || 0), 0), mwt = ord.reduce((t, z) => t + (z.mw || 0), 0); return `<div class="dpsb tot"><span>Total</span><b>${tv}</b><i></i><div class="tbd">${tv - mbt - mwt}${mbt ? ` <u class="bl">+${mbt}</u>` : ''}${mwt ? ` <u class="or">+${mwt}</u>` : ''}</div></div>`; })() : '') + customRow(x, stats) + '</div>' : '';
    const energy = d.energy ? `<div class="dpen"><b>${d.energy.cap} ENERGY</b><div>${Array.from({ length: Math.max(10, d.energy.cap) }, (_, i) => `<i class="${i < d.energy.used ? 'u' : ''}"></i>`).join('')}</div></div>` : '';
    const arche = d.arche ? `<div class="dpar"><div class="dpi0">${pimg(d.arche)}</div><div><b>${esc(d.arche.n)}</b>${esc(d.arche.d || '').split(/\n+/).filter((l) => /stat:/i.test(l)).map((l) => `<span>${l}</span>`).join('') || `<span>${esc(d.arche.d || '')}</span>`}</div></div>` : '';
    const setb = d.set && d.set.perks.length ? `<div class="dpset">${d.set.perks.map((q) => `<div class="dpill" title="${esc(q.rc + '-Piece: ' + q.d)}"><span class="dpi0">${q.i ? `<img src="${esc(icon(q.i))}" alt="">` : ''}</span><b>${esc(q.n)}</b></div>`).join('')}</div>` : '';
    const cosm = d.cos && d.cos.length ? `<h5 class="dph5">${isA ? 'Armor' : 'Weapon'} Cosmetics</h5><div class="dpmr cos">${d.cos.map((o) => `<div title="${esc(o.n)}">${pimg(o)}</div>`).join('')}</div>` : '';
    const objs = (d.obj || []).map((o) => {
      if (o.k === 'tr' || /enem|kill|defeat/i.test(o.n) && o.c <= 1 ) return `<div class="dpob"><span>${o.i ? `<img src="${esc(icon(o.i))}" alt="">` : ''}${esc(o.n || o.pn || 'Kills')}</span><b>${(o.p || 0).toLocaleString()}</b></div>`;
      if (o.c > 1) { const pc = Math.min(100, o.p / o.c * 100); return `<div class="dpob lv"><span>${esc(o.n)}</span><div class="dpbar"><i style="width:${pc}%;background:#e5c653"></i></div><b>${pc.toFixed(1)}%</b></div>`; }
      return '';
    }).join('');
    const frame = d.frame ? `<div class="dpfr"><div class="dpi0">${pimg(d.frame)}</div><div><b>${esc(d.frame.n)}</b><span>${esc(d.frame.d || '')}</span></div></div>` : '';
    const wp = x ? wish(x).perks : new Set(), wpHas = (p) => !!p && (wp.has(p.h) || wp.has(p.n)), ch = psChanges(d), changed = ch.length, canApply = x && x.id && !x.ro ? ch.filter((c) => c.ci).length : 0;
    const nm = (h) => { const q = d.stats.find((z) => z.h === h); return q ? q.n : ''; };
    const clr = (p) => (SET.clarity !== 'bungie' && CLAR && p && CLAR[p.h]) || '';
    const prow = [];
    d.groups.forEach((gr, gi) => { if (gr.label !== 'Perks') return; gr.cols.forEach((col, ci) => {
      const k = gi + '-' + ci, on = col.find((p) => p.on) || col[0];
      const si = psel[k] !== undefined && col[psel[k]] ? psel[k] : col.indexOf(on), cur = col[si] || on;
      const ico = (p, i) => `<div class="dpc${i === si ? ' sel' : ''}${p === on ? ' eqp' : ''}" data-pk="${k}" data-pi="${i}" title="${esc(p.n)}${wpHas(p) ? ' (in a wish list roll)' : ''}">${pimg(p)}${wpHas(p) ? `<i class="pwb">${SV_UP}</i>` : ''}</div>`;
      let h = `<div class="dpr${pex === k ? ' open' : ''}"><div class="cur" data-px="${k}">${ico(cur, si)}<b>${esc(cur.n)}</b></div><div class="alt">${col.slice(0, 10).map((p, i) => (i === si ? '' : ico(p, i))).join('')}</div></div>`;
      if (pex === k) {
        const bonus = (cur.s || []).map(([hh, v]) => (nm(hh) ? `<div class="pbn">${v > 0 ? '+' : ''}${v} ${esc(nm(hh))}</div>` : '')).join('');
        h += `<div class="dpi" data-px="${k}"><b>${esc(cur.n)}</b>${cur === on ? '' : ' <small>(preview)</small>'}${wpHas(cur) ? ` <span class="pwi">${SV_UP}</span>` : ''}<span class="pds">${SET.clarity === 'clarity' && clr(cur) ? '' : esc(cur.d || '')}</span>${clr(cur) ? `<div class="clr"><small>Community insight</small>${clr(cur).split(/\n+/).map((l) => '<p>' + esc(l) + '</p>').join('')}</div>` : ''}${bonus}</div>`;
      }
      prow.push(h);
    }); });
    const hasWp = x && wp.size && prow.length;
    const pbtn = (hasWp ? `<button class="g pbtn" data-a="wlp">${SV_UP} Preview Wishlist Perks</button>` : '') + (canApply ? `<button class="b pbtn" data-a="applyp">&#10003; Apply Perks</button>` : changed ? '<span class="mute pnoap">Preview only: Bungie does not let this item change perks in game.</span>' : '');
    const perks = prow.length ? `<div class="dpp">${prow.join('')}</div>` : '';
    const mrows = d.groups.filter((gr) => gr.label === 'Mods').map((gr) => gr.cols.map((col) => { const on = col.find((p) => p.on) || col[0]; return `<div${/tuning/i.test(on.c || '') ? ' class="tun"' : ''} title="${esc(on.n)}${on.d ? ' - ' + esc(on.d) : ''}">${pimg(on)}</div>`; }).join('')).join('');
    const mods = mrows ? `<h5 class="dph5">${isA ? 'Armor' : 'Weapon'} Mods</h5><div class="dpmr">${mrows}</div>` : '';
    return rows + energy + arche + setb + frame + objs + perks + mods + cosm + (changed ? '<div class="rst" data-a="rst">Reset perk preview</div>' : '') + (pbtn ? `<div class="dpbt">${pbtn}</div>` : '') || '<p class="dpmu">No stats or perks to show for this item.</p>';
  }
  const ent = (id) => D.chars.find((c) => c.id === id);
  const whereOf = (o) => { const c = ent(o.loc); return o.loc === 'vault' ? 'Vault' : (CL[c && c.cls] || '') + (o.e ? ' (equipped)' : ''); };
  // Triage: your other copies of this item, and the saved loadouts that use it.
  function triageHTML(x) {
    const same = D.items.filter((o) => o.h === x.h && o.id !== x.id && !o.pm);
    const sum = (o) => (o.st ? 'Armor stat total ' + o.st.reduce((a, v) => a + v, 0) : o.ep && o.ep.length ? o.ep.slice(0, 6).join(', ') : '');
    const row = (o) => `<div class="dptr" data-open="${esc(o.id)}"><span class="mtile" style="--t:40px">${tile(o).replace(' draggable="true"', '')}</span><div><b>${o.p || ''}</b> <span>${esc(whereOf(o))}</span><small>${esc(sum(o))}</small></div></div>`;
    let los = []; try { los = window.__gtl && window.__gtl._all ? window.__gtl._all() : []; } catch (e) { los = []; }
    const inLo = los.filter((l) => (l.it || []).some((i) => i.id === x.id));
    return `<div class="dpq"><h4>Other copies (${same.length})</h4>${same.length ? same.slice(0, 12).map(row).join('') : '<p class="dpmu">This is the only copy you have.</p>'}<h4>Used in loadouts (${inLo.length})</h4>${inLo.length ? inLo.map((l) => `<div class="dplo">${esc(l.n || 'Loadout')}</div>`).join('') : '<p class="dpmu">Not part of any saved loadout.</p>'}</div>`;
  }
  const sbtn = (a, t, lbl, ic, on, tip) => `<button class="${on ? 'on' : ''}" data-a="${a}"${t !== undefined ? ` data-t="${esc(t)}"` : ''}${tip ? ` title="${esc(tip)}"` : ''}><span class="ic">${ic}</span><span class="lbl">${lbl}</span></button>`;
  function sideHTML(x) {
    const s = [`<div class="dpsr"><button data-a="scol" title="${scol ? 'Expand' : 'Collapse'} this panel">${scol ? '&raquo;' : '&laquo;'}</button><button data-a="close" title="Close (Esc)">&#10005;</button></div>`];
    const chars = sortedChars();
    if (x.pm) {
      s.push('<h6>Postmaster</h6>');
      if (x.eg) { s.push('<p class="dpe">Engrams cannot be collected from here. Open them at the Tower in game, then they leave the postmaster.</p>'); return s.join(''); }
      D.chars.filter((c) => c.id === x.loc).forEach((c) => s.push(sbtn('pull', c.id, 'Pull to ' + esc(CL[c.cls]), '&#8681;', false, 'Pull to ' + (CL[c.cls] || ''))));
      return s.join('');
    }
    if (!x.ro && x.id) s.push(sbtn('lock', undefined, x.lk ? 'Locked' : 'Lock', x.lk ? '&#128274;' : '&#128275;', !!x.lk, (x.lk ? 'Locked. Click to unlock' : 'Unlocked. Click to lock') + ' (L)'));
    if (!x.ro) { const ct = TG.find((t) => t[0] === TAGS()[x.id]); s.push(`<h6>Tag${ct ? ` <span class="tgn" style="color:${ct[2]}">${ct[3]}</span>` : ''}</h6><div class="tgs">` + TG.map((t) => `<button class="tgb${TAGS()[x.id] === t[0] ? ' on' : ''}" data-a="tag" data-v="${t[0]}" style="--tc:${t[2]}" title="${t[3]}${TAGS()[x.id] === t[0] ? ' (click again to remove)' : ''}">${t[1]}</button>`).join('') + '</div>'); }
    if (!x.ro && window.__gtx) s.push(sbtn('cmp', undefined, 'Compare', '&#8644;', false, 'Compare with similar items'));
    if (!x.ro && x.id && /^\d+$/.test(String(x.id)) && window.__gth) s.push(window.__gth.btn('item', x.id, x.n, 'side'));
    if (isStack(x)) {
      if (NOMOVE.has(x.b)) s.push('<p class="dpe">This kind of item stays where it is.</p>');
      else {
        s.push(`<h6>Amount</h6><div class="stq"><input id="vstq" type="number" min="1" placeholder="All" value="${stq > 0 ? stq : ''}" title="How many to move (empty moves the whole stack)"><button data-a="stmax" title="Move the whole stack">All</button></div>`);
        (x.agg || [x]).forEach((pt) => {
          const to = ['vault', ...chars.map((c) => c.id)].filter((t) => t !== pt.loc);
          s.push(`<h6>From ${pt.loc === 'vault' ? 'Vault' : esc(CL[(ent(pt.loc) || {}).cls] || '')} (${pt.q.toLocaleString()})</h6>`);
          to.forEach((t) => s.push(`<button data-a="smv" data-f="${esc(pt.loc)}" data-t="${esc(t)}" title="Move to ${t === 'vault' ? 'the vault' : esc(CL[ent(t).cls] || '')}"><span class="ic">&#9656;</span><span class="lbl">${t === 'vault' ? 'Vault' : esc(CL[ent(t).cls] || '')}</span></button>`));
        });
      }
      return s.join('');
    }
    if (!x.ro || EQB.has(x.b)) {
      const eq = chars.filter((c) => (x.c === 3 || x.c === undefined || x.c === c.cls) && !(x.e && x.loc === c.id));
      if (eq.length) { s.push('<h6>Equip on</h6>' + (scol ? '<hr>' : '')); eq.forEach((c) => s.push(sbtn('eq', c.id, esc(CL[c.cls] || 'Character'), scol ? '&#9650;' + esc((CL[c.cls] || '?')[0]) : '&#9650;', false, 'Equip on ' + (CL[c.cls] || '')))); }
    }
    if (x.e) s.push('<p class="dpe">Equipped. Equip something else in this slot to move it.</p>');
    else { s.push('<h6>Store in</h6>' + (scol ? '<hr>' : '')); ['vault', ...chars.map((c) => c.id)].filter((t) => t !== x.loc).forEach((t) => s.push(sbtn('mv', t, t === 'vault' ? 'Vault' : esc(CL[ent(t).cls] || ''), scol ? (t === 'vault' ? 'V' : '&#9656;' + esc((CL[ent(t).cls] || '?')[0])) : (t === 'vault' ? '&#9644;' : '&#9656;'), false, 'Store in ' + (t === 'vault' ? 'the vault' : CL[ent(t).cls] || '')))); }
    return s.join('');
  }
  function roBody(x) {
    const f = INFO[x.h], d = DET[sel];
    const rows = [];
    if (isStack(x)) {
      rows.push(['Total', x.q.toLocaleString() + (f && f.mx > 1 ? ' (stacks of up to ' + f.mx.toLocaleString() + ')' : '')]);
      (x.agg || [x]).forEach((pt) => rows.push([whereOf(pt), pt.q.toLocaleString()]));
    } else rows.push(['Location', whereOf(x)]);
    const engBan = x.b === ENGR || x.eg ? '<div class="dprb">You must visit the postmaster in game to retrieve this item.</div>' : '';
    const info = engBan + (!f ? '<p class="dpmu">Loading...</p>' : (f.d ? `<p class="dpd">${esc(f.d)}</p>` : '') + (f.fl ? `<p class="dpfl">${esc(f.fl)}</p>` : '') + (!f.d && !f.fl ? '<p class="dpmu">This item has no description.</p>' : ''));
    const det = d && !d.err && d.groups ? detailHTML(d, x) : '';
    return info + `<div class="dpkv">${rows.map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>` + (det.includes('dpmu') ? '' : det);
  }
  function itemPop(x) {
    const ro = !!x.ro, stack = isStack(x);
    const here = ent(x.loc), ic0 = (D && D.ic) || {}, elI = x.el && ic0.el && ic0.el[x.el], el = ELEM[x.el], bkI = x.bt && ic0.bk && ic0.bk[x.bt];
    const pw = stack ? (x.q > 1 ? '&times;' + x.q.toLocaleString() : '') : (x.p || '');
    const sub = esc((ARMOR.has(x.b) && x.c >= 0 && x.c < 3 ? CL[x.c] + ' ' : '') + x.t) + (x.pm ? ' &middot; postmaster' : '');
    const head = `<div class="dph ${esc(x.r)}"><div class="r1"><h2>${esc(x.n)}</h2>${elI ? `<span class="el"><img src="${esc(icon(elI))}" alt="${esc(el ? el[0] : '')}" title="${esc(el ? el[0] : '')}"></span>` : ''}${pw ? `<span class="pw">${pw}</span>` : ''}${!ro && x.pk && wish(x).v ? `<span class="pwi hw${wish(x).v < 0 ? ' dn' : ''}" title="${wish(x).v > 0 ? 'Wish list roll' : 'Trash roll'}">${SV_UP}</span>` : ''}</div><div class="r2"><span>${sub}</span>${bkI ? `<img class="phb" src="${esc(icon(bkI))}" alt="" title="${esc(BRK[x.bt] || '')}">` : ''}${here || x.loc === 'vault' ? `<span class="wh">${esc(whereOf(x))}</span>` : ''}</div></div>`;
    let main;
    if (ro || noInst(x)) main = roBody(x);
    else {
      const d = DET[sel];
      const detail = !d ? '<div class="dpsk" aria-label="Loading"><i></i><i></i><i></i><i></i><i></i><i></i><b></b><b></b><b></b></div>' : d.err ? `<p class="dpmu">Could not load details: ${esc(d.err)}</p>` : detailHTML(d, x);
      const note = (NOTES()[x.id] || '');
      const noteHTML = noteEdit ? `<div class="dpn"><textarea id="vnotebox" placeholder="Notes about this item">${esc(note)}</textarea></div>` : `<div class="dpn" data-a="note">${note ? esc(note) : '&#9998; Add notes'}</div>`;
      const w = wish(x);
      const wl = w.v ? `<div class="dpw" style="border-color:${w.v > 0 ? '#2e7d32' : '#8a2c2c'}"><span class="pwi${w.v < 0 ? ' dn' : ''}">${SV_UP}</span> ${w.v > 0 ? 'Wish list roll' : 'Trash roll'}${w.notes.length ? ': ' + esc(w.notes.join(' / ')) : ''}</div>` : '';
      const tabs = x.pm ? '' : `<div class="dpt"><span class="${ptab === 'ov' ? 'on' : ''}" data-a="ptab" data-v="ov">Overview</span><span class="${ptab === 'tr' ? 'on' : ''}" data-a="ptab" data-v="tr">Triage</span></div>`;
      main = tabs + (ptab === 'tr' && !x.pm ? triageHTML(x) : noteHTML + wl + detail + (window.__gtf ? window.__gtf.pop(x) : ''));
    }
    return `<div class="dp${scol ? ' sc' : ''}"><div class="dpm">${head}${main}${PMSG ? `<div class="pmsg${/^Could not|^Failed/.test(PMSG) ? ' bad' : ''}">${esc(PMSG)}</div>` : ''}</div><div class="dps acts">${sideHTML(x)}</div></div>`;
  }
  // Put the pop-up next to the tile that was clicked (right side, or left when there is no room), like DIM.
  function anchorEl() {
    if (popEl && popEl.isConnected && popEl.offsetParent !== null) return popEl;
    if (!sel) return null;
    const all = document.querySelectorAll('.vt'); for (const t of all) if (t.dataset.id === sel && t.offsetParent !== null) return t;
    return null;
  }
  // The pop-up is placed once, next to the item, and then stays put: it moves with the item when the page scrolls, and when its
  // contents change (a perk opened, details arriving) it only shifts up if it would run off the bottom of the window.
  let POS = null;
  function placePop(why) {
    const dp = document.querySelector('#vsheet .dp'); if (!dp) return;
    const vw = innerWidth, vh = innerHeight;
    dp.querySelectorAll('.dpm,.dps').forEach((n) => { n.style.maxHeight = (vh - 16) + 'px'; });
    const w = dp.offsetWidth, h = dp.offsetHeight, t = anchorEl();
    let L, T;
    if (!t || vw < 640) { L = Math.max(8, (vw - w) / 2); T = Math.max(8, (vh - h) / 2); POS = null; }
    else {
      const r = t.getBoundingClientRect();
      if (POS && POS.id === sel && POS.w === w) {
        L = POS.L; T = r.top + POS.dy;
        if (why !== 'scroll' && T + h > vh - 8) { T = Math.max(8, vh - h - 8); POS.dy = T - r.top; }
      } else {
        L = r.right + 8; if (L + w > vw - 8) L = r.left - 8 - w; if (L < 8) L = Math.max(8, vw - w - 8);
        T = Math.max(8, Math.min(r.top - 4, vh - h - 8));
        POS = { id: sel, L, w, dy: T - r.top };
      }
    }
    dp.style.left = Math.round(L) + 'px'; dp.style.top = Math.round(T) + 'px';
  }
  function renderPop() {
    const box = g('vpop'); if (!box) return;
    const x = sel && byId(sel);
    if (x) {
      const old = box.querySelector('.dpm'), top = old ? old.scrollTop : 0;
      box.innerHTML = `<div id="vsheet">${itemPop(x)}</div>`;
      const nw = box.querySelector('.dpm'); if (nw && top) nw.scrollTop = top;
      placePop(); return;
    }
    sel = null;
    box.innerHTML = '';
  }
  // Postmaster engrams and other things without an instance id: Bungie has no per-item details for them, only the description.
  const noInst = (x) => !!(x && (x.eg || !/^\d+$/.test(String(x.id))));
  async function openPop(id, el) {
    const x = byId(id); if (!x) return;
    sel = id; psel = {}; plast = null; pex = ''; noteEdit = false; PMSG = ''; ptab = 'ov'; stq = 0; popEl = el || null;
    // Wait a moment for the details (usually already on their way from the hover) so the pop-up opens once, at its full size.
    if (!x.ro && !noInst(x) && !DET[id]) { const p = fetchDet(x); await Promise.race([p, new Promise((r) => setTimeout(r, 350))]); if (sel !== id) return; }
    renderPop();
    if (x.ro || noInst(x)) {
      const num = /^\d+$/.test(String(x.id));
      if (!INFO[x.h] && window.gt && gt.itemInfo) { try { INFO[x.h] = await gt.itemInfo({ h: x.h }); } catch (e) { INFO[x.h] = { d: '', fl: '', mx: 1 }; } if (sel === id) renderPop(); }
      if (num && !DET[id] && !x.pm && x.b !== ENGR) { try { DET[id] = await gt.itemDetail({ id, h: x.h }); } catch (e) { DET[id] = { err: clean(e) }; } if (sel === id) renderPop(); }
      return;
    }
    if (DET[id]) return;
    await fetchDet(x);
    if (sel === id) renderPop();
  }
  // Details are fetched once per item, shared between the hover prefetch and the click.
  const PEND = {};
  function fetchDet(x) {
    const id = x.id; if (DET[id]) return Promise.resolve(DET[id]);
    if (!PEND[id]) PEND[id] = gt.itemDetail({ id, h: x.h }).then((d) => (DET[id] = d), (e) => (DET[id] = { err: clean(e) })).finally(() => { delete PEND[id]; });
    return PEND[id];
  }
  // Point at an item for a moment and its details start loading, so the pop-up usually opens complete instead of filling in a second later.
  let preT = 0;
  sec.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !D) return; const v = e.target.closest && e.target.closest('.vt[data-id]'); if (!v) return;
    clearTimeout(preT); preT = setTimeout(() => { const x = byId(v.dataset.id); if (x && !x.ro && !noInst(x) && !DET[x.id] && v.matches(':hover')) fetchDet(x); }, 140);
  });
  // The Loadouts tab lives in loadouts.js; this just asks it to redraw.
  function renderLoTab() { const l = document.getElementById('loadouts'); if (l && !l.classList.contains('on')) return; if (window.__gtl) window.__gtl.render(); } // hidden tab redraws itself when opened

  sec.onclick = async (e) => {
    if (window.__gtf && window.__gtf.onClick(e)) return;
    if (e.target.id === 'vsheet') { sel = null; renderPop(); return; }
    const vt = e.target.closest('.vt');
    if (vt && D) { openPop(vt.dataset.id, vt); return; }
    const op = e.target.closest('[data-open]');
    if (op && sel) { openPop(op.dataset.open, popEl); return; }
    const ptb = e.target.closest('[data-a="ptab"]');
    if (ptb && sel) { ptab = ptb.dataset.v; renderPop(); return; }
    const tg = e.target.closest('[data-tg]');
    if (tg && D) { pmOpen = !pmOpen; renderGrid(); return; }
    const pk = e.target.closest('[data-pk]');
    if (pk && sel) { psel[pk.dataset.pk] = +pk.dataset.pi; plast = pk.dataset.pk + '|' + pk.dataset.pi; pex = pk.dataset.pk; renderPop(); return; }
    const px = e.target.closest('[data-px]');
    if (px && sel) { pex = pex === px.dataset.px ? '' : px.dataset.px; renderPop(); return; }
    if (e.target.closest('[data-a="rst"]')) { psel = {}; pex = ''; renderPop(); return; }
    if (e.target.closest('[data-a="note"]')) { noteEdit = true; renderPop(); const nb = g('vnotebox'); if (nb) nb.focus(); return; }
    const ep = e.target.closest('[data-act="eqpick"]'); if (ep && D) { eqPick(ep); return; }
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.paste) {
      const el = g(t.dataset.paste), note = g('p' + t.dataset.paste);
      try { const v = ((await gt.readClipboard()) || '').trim(); el.value = v; note.textContent = v ? 'Pasted ' + v.length + ' characters' : 'Clipboard is empty. Copy the value first.'; }
      catch (er) { note.textContent = 'Could not read the clipboard.'; }
      return;
    }
    const x = D && byId(sel);
    if (t.dataset.a === 'close') { sel = null; renderPop(); return; }
    if (t.dataset.a === 'scol') { scol = !scol; renderPop(); return; }
    if (t.dataset.a === 'stmax' && x) { stq = 0; renderPop(); return; }
    if (t.dataset.a === 'smv' && x && isStack(x)) {
      const pt = (x.agg || [x]).find((z) => z.loc === t.dataset.f); if (!pt) return;
      const inp = g('vstq'), n = Math.max(1, Math.min(pt.q, parseInt(inp && inp.value, 10) || pt.q)), to = t.dataset.t, from = pt.loc, h = x.h;
      return act('move ' + n + ' ' + x.n, () => {}, () => gt.moveStack({ h, from, to, q: n }), true);
    }
    if (t.dataset.a === 'pull' && x) { const it = slim(x), ch = t.dataset.t; return act('pull ' + x.n, () => { const o = byId(it.id); o.pm = 0; o.loc = ch; o.e = 0; }, () => gt.pmPull({ items: [it], char: ch })); }
    if (t.dataset.a === 'lock' && x) return toggleLock(x);
    if (t.dataset.a === 'wlp' && x) {
      const d = DET[sel]; if (!d) return;
      const b = bestRoll(x, d);
      psel = {}; pex = '';
      if (!b) { PMSG = 'None of your wish list rolls fits this weapon.'; renderPop(); return; }
      Object.assign(psel, b.pick);
      const nt = String(b.note || '').replace(/\s+/g, ' ').trim();
      PMSG = (b.keep === b.spec ? 'This weapon already has the best wish list roll.' : 'Showing the best wish list roll' + (b.n > 1 ? ' (of ' + b.n + ' that fit)' : '') + '. Press Apply Perks to put it in.') + (nt ? ' ' + (nt.length > 110 ? nt.slice(0, 107) + '...' : nt) : '');
      renderPop(); return;
    }
    if (t.dataset.a === 'applyp' && x) {
      const d = DET[sel], id = x.id, list = d && !x.ro ? psChanges(d).filter((c) => c.ci) : []; if (!list.length) return;
      // One perk at a time, a short pause between them (Bungie refuses changes sent back to back), carrying on past a refusal.
      // Afterwards the item is always read again, so the pop-up shows what is really equipped, not the preview.
      const bad = [], done = []; let ok = 0;
      for (let k = 0; k < list.length; k++) {
        const c = list[k]; PMSG = 'Applying ' + (k + 1) + ' of ' + list.length + '...'; renderPop();
        let tries = 0;
        for (;;) {
          try { await gt.itemPlug({ id, char: charFor(x), socket: c.si, plug: c.h }); ok++; done.push([c.si, c.h]); break; }
          catch (er) { if (++tries < 2) { await new Promise((r) => setTimeout(r, 1200)); continue; } bad.push(clean(er)); break; }
        }
        if (k < list.length - 1) await new Promise((r) => setTimeout(r, 450));
      }
      const locked = psChanges(d).filter((c) => !c.ci).length;
      psel = {}; plast = null; pex = '';
      PMSG = (bad.length ? (ok ? ok + ' of ' + list.length + ' perks changed. ' : '') + 'Failed: ' + bad[0] : 'Done. The perks were changed in game.') + (locked ? ' ' + locked + ' picked perk' + (locked > 1 ? 's are' : ' is') + ' not unlocked on this copy, so ' + (locked > 1 ? 'they were' : 'it was') + ' left as is.' : '');
      done.forEach(([si, ph]) => markPlug(id, si, ph));
      renderPop(); renderGrid();
      confirmPlugs(id, x.h, done);
      return;
    }
    if (t.dataset.a === 'plug' && x) {
      const id = x.id; PMSG = 'Applying...'; renderPop();
      try { await gt.itemPlug({ id, char: charFor(x), socket: +t.dataset.s, plug: +t.dataset.h }); PMSG = 'Done. The perk was changed in game.'; psel = {}; plast = null; markPlug(id, +t.dataset.s, +t.dataset.h); renderPop(); renderGrid(); confirmPlugs(id, x.h, [[+t.dataset.s, +t.dataset.h]]); }
      catch (er) { PMSG = 'Failed: ' + clean(er); renderPop(); }
      return;
    }
    if (t.dataset.a === 'eq' && x) return doEquip(x, t.dataset.t);
    if (t.dataset.a === 'tag' && x) { const o = TAGS(), v = t.dataset.v; if (o[x.id] === v) delete o[x.id]; else o[x.id] = v; saveTAGS(o); renderPop(); renderGrid(); return; }
    if (t.dataset.a === 'cmp' && x && window.__gtx) { const id = x.id; sel = null; renderPop(); window.__gtx.compare(id); return; }
    if (t.dataset.a === 'mv' && x) return doMove(x, t.dataset.t);
    const a = t.dataset.act;
    if (a === 'help') { const hp = g('vhelp'); if (hp) hp.classList.toggle('open'); return; }
    if (a === 'sets') { show('loadouts'); renderLoTab(); return; }
    if (a === 'savq') { savqMenu(t); return; }
    if (a === 'junk') { junkOpen(); return; }
    if (a === 'farm') { if (!gt.farmSet) return; gt.farmSet({ on: !FARM.on }).then((m) => { FARM = m || FARM; t.classList.toggle('on', !!FARM.on); setNote(FARM.on ? 'Farming mode on: unequipped weapons and armor will go to the vault every 20 seconds.' : 'Farming mode off.'); renderGrid(); }).catch((e) => setNote(clean(e))); return; }
    if (a === 'chmenu') {
      const old = document.getElementById('chpop'); if (old) { const same = old.dataset.c === t.dataset.c; old.remove(); if (same) return; }
      const r = t.getBoundingClientRect(), m = document.createElement('div'); m.id = 'chpop'; m.dataset.c = t.dataset.c;
      m.style.cssText = 'position:fixed;z-index:60;top:' + (r.bottom + 2) + 'px;left:' + Math.max(8, r.right - 230) + 'px';
      m.innerHTML = '<button>Make room: move unequipped gear to the vault</button>';
      m.firstChild.onclick = () => { m.remove(); mkRoom(t.dataset.c); };
      document.body.appendChild(m); return;
    }
    { const pp = document.getElementById('chpop'); if (pp) pp.remove(); }
    if (a === 'phch') { phChar = t.dataset.c; renderGrid(); return; }
    if (a === 'mkroom') {
      mkRoom(t.dataset.c);
    } else if (a === 'collect') {
      const ch = t.dataset.c, its = D.items.filter((o) => o.loc === ch && o.pm && !o.eg), snaps = its.map(slim);
      if (!its.length) return;
      act('collect postmaster', () => its.forEach((o) => { o.pm = 0; }), () => gt.pmPull({ items: snaps, char: ch }), true);
    } else if (a === 'presetlogin') {
      try { sec.dataset.busy = 1; msg('Waiting for Bungie sign-in...'); await gt.login(); load(); } catch (er) { delete sec.dataset.busy; let c = { preset: true }; try { c = await gt.cfgGet(); } catch (e2) { /* welcome anyway */ } setup(c, clean(er)); }
    }
    else if (a === 'refresh' || a === 'qrefresh') quickLoad();
    else if (a === 'retry') init();
    else if (a === 'out') { await gt.logout(); init(); }
  };
  sec.onchange = (e) => {
    if (e.target.id === 'vnotebox' && sel) { const n = NOTES(); const v = e.target.value.trim(); if (v) n[sel] = v; else delete n[sel]; try { localStorage.setItem('gt_notes', JSON.stringify(n)); } catch (er) { /* ignore */ } noteEdit = false; setTimeout(renderPop, 0); }
  };
  const matchQ = (x, qq) => !qq || qq.split(/\s+/).filter(Boolean).every((t) => (t[0] === '-' && t.length > 1) ? !ok(x, t.slice(1)) : ok(x, t));
  window.__gtx = {
    D: () => D, esc, icon, CL, ent, TAGS, TG, tagSvg, wish, ELEM, STN, WEAPON, ARMOR,
    match: matchQ, open: (id) => { if (D) openPop(id); }, tile: (x) => tile(x),
    detail: async (x) => { if (!DET[x.id]) DET[x.id] = await gt.itemDetail({ id: x.id, h: x.h }); return DET[x.id]; },
    equip: async (ids, ch) => { const its = ids.map(byId).filter(Boolean); if (!its.length) return; await act('apply armor set', () => {}, () => gt.applyLoadout({ items: its.map(slim), char: ch }), true); },
  };
  // ---- right-click menu on any item, and keyboard shortcuts like DIM ----
  const ctx = document.createElement('div'); ctx.id = 'gtctx'; document.body.appendChild(ctx);
  const ctxClose = () => ctx.classList.remove('open');
  function ctxOpen(x, px, py) {
    const rows = [`<div class="ch">${esc(x.n)}</div>`, '<div data-c="info">Show details</div>'];
    if (!x.ro && x.id && !x.pm) rows.push(`<div data-c="lock">${x.lk ? 'Unlock' : 'Lock'}</div>`);
    if (x.pm && !x.eg) D.chars.filter((c) => c.id === x.loc).forEach((c) => rows.push(`<div data-c="pull:${esc(c.id)}">Pull to ${esc(CL[c.cls])}</div>`));
    else if (!x.ro) {
      const eq = sortedChars().filter((c) => (x.c === 3 || x.c === undefined || x.c === c.cls) && !(x.e && x.loc === c.id));
      if (eq.length) { rows.push('<div class="cs">Equip on</div>'); eq.forEach((c) => rows.push(`<div data-c="eq:${esc(c.id)}">${esc(CL[c.cls] || 'Character')}</div>`)); }
      if (!x.e) { rows.push('<div class="cs">Store in</div>'); ['vault', ...sortedChars().map((c) => c.id)].filter((t) => t !== x.loc).forEach((t) => rows.push(`<div data-c="mv:${esc(t)}">${t === 'vault' ? 'Vault' : esc(CL[ent(t).cls] || '')}</div>`)); }
    }
    if (!x.ro && !x.pm) {
      const cur = TAGS()[x.id];
      rows.push('<div class="cs">Tag</div><div class="ct">' + TG.map((t) => `<span data-c="tag:${t[0]}" class="${cur === t[0] ? 'on' : ''}" style="--tc:${t[2]}" title="${t[3]}">${t[1]}</span>`).join('') + '</div>');
      if (window.__gtx) rows.push('<div data-c="cmp">Compare with similar</div>');
      rows.push('<div data-c="note">Add notes</div>');
    }
    if (!x.ro || x.h) rows.push('<div data-c="web">Open on light.gg</div>');
    rows.push('<div data-c="copy">Copy name</div>');
    ctx.innerHTML = rows.join(''); ctx.dataset.id = x.id; ctx.classList.add('open');
    const w = ctx.offsetWidth, h = ctx.offsetHeight;
    ctx.style.left = Math.max(4, Math.min(px, innerWidth - w - 6)) + 'px'; ctx.style.top = Math.max(4, Math.min(py, innerHeight - h - 6)) + 'px';
  }
  document.addEventListener('contextmenu', (e) => {
    const vt = e.target.closest && e.target.closest('.vt'); if (!vt || !D || !vt.dataset.id) return;
    const x = byId(vt.dataset.id); if (!x) return;
    e.preventDefault(); ctxOpen(x, e.clientX, e.clientY);
  });
  ctx.addEventListener('click', (e) => {
    const d = e.target.closest('[data-c]'); if (!d) return;
    const x = byId(ctx.dataset.id), [k, v] = d.dataset.c.split(':'); ctxClose(); if (!x) return;
    if (k === 'info') openPop(x.id);
    else if (k === 'lock') toggleLock(x);
    else if (k === 'eq') doEquip(x, v);
    else if (k === 'mv') doMove(x, v);
    else if (k === 'pull') { const it = slim(x); act('pull ' + x.n, () => { const o = byId(it.id); o.pm = 0; o.loc = v; o.e = 0; }, () => gt.pmPull({ items: [it], char: v })); }
    else if (k === 'tag') setTag(x, v);
    else if (k === 'cmp' && window.__gtx) window.__gtx.compare(x.id);
    else if (k === 'note') { openPop(x.id); noteEdit = true; renderPop(); const nb = g('vnotebox'); if (nb) nb.focus(); }
    else if (k === 'web') window.open('https://www.light.gg/db/items/' + x.h + '/');
    else if (k === 'copy') gt.writeClipboard(x.n);
  });
  document.addEventListener('click', (e) => { if (!ctx.contains(e.target)) ctxClose(); });
  window.addEventListener('blur', ctxClose); window.addEventListener('scroll', ctxClose, true);
  // The pop-up has no dark backdrop: clicking anywhere else closes it, and it follows its tile when the page moves.
  document.addEventListener('click', (e) => {
    if (!sel || !e.target.closest) return;
    if (e.target.closest('.dp, .vt, #gtctx, #apm, #dled, #dlmod, .gtmodal')) return;
    sel = null; renderPop();
  }, true);
  window.addEventListener('scroll', (e) => { if (sel && !(e.target && e.target.closest && e.target.closest('#vsheet'))) placePop('scroll'); }, true); // scrolling inside the pop-up must not move it
  window.addEventListener('resize', () => { POS = null; if (sel) placePop(); });
  sec.addEventListener('input', (e) => {
    if (!e.target) return;
    if (e.target.id === 'vstq') stq = parseInt(e.target.value, 10) || 0;
    // Item notes save as you type or paste (they used to save only when the box lost focus).
    if (e.target.id === 'vnotebox' && sel) { const n = NOTES(), v = e.target.value.trim(); if (v) n[sel] = v; else delete n[sel]; try { localStorage.setItem('gt_notes', JSON.stringify(n)); } catch (er) { /* ignore */ } }
  });
  const TAGKEYS = { '!': 'favorite', '@': 'keep', '#': 'infuse', '$': 'junk', '%': 'archive' };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { ctxClose(); if (sel) { sel = null; renderPop(); } return; }
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') || e.ctrlKey || e.metaKey || e.altKey || !D) return;
    if (e.key === '/' && sec.classList.contains('on')) { const q1 = g('vq'); if (q1) { e.preventDefault(); q1.focus(); q1.select(); } return; }
    const x = sel && byId(sel); if (!x) return;
    if (e.key.toLowerCase() === 'l' && !x.pm && !x.ro) { e.preventDefault(); toggleLock(x); }
    else if (TAGKEYS[e.key] && !x.pm && !x.ro) { e.preventDefault(); setTag(x, TAGKEYS[e.key]); }
  });
  drawSettings(); wlLoad();
  if (window.gt && gt.farmSet && SET.farmspaces !== 3) gt.farmSet({ spaces: SET.farmspaces }).catch(() => {});
  init();
  show('vault');
})();
