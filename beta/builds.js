// Builds tab: the community build gallery. Players share a loadout from the Loadouts tab (Share > Share to Builds); here
// everyone can browse them by class, subclass and what they are good for, sort by popular, newest, most liked or most
// imported, like or dislike (with a Pathfinder account), and import a build into their own loadouts. Popular = likes -
// dislikes + imports / 2, counted by the token service (/builds/*, see token-service/worker.js).
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt || !window.gt.bdList) return;
  const gt = window.gt;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (p) => (/^\/[\w./%-]{1,300}$/.test(String(p || '')) ? 'https://www.bungie.net' + p : '');
  const clean = (e) => String((e && e.message) || e || 'unknown error').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').slice(0, 220);
  const CL = ['Titan', 'Hunter', 'Warlock'];
  const ELS = [['solar', 'Solar', '#ff9a3c'], ['arc', 'Arc', '#7bd0ff'], ['void', 'Void', '#b98cff'], ['stasis', 'Stasis', '#6fa8ff'], ['strand', 'Strand', '#4ee08c'], ['prismatic', 'Prismatic', '#f08cd8']];
  const SUBN = { // what each element's subclass is called for each class
    0: { solar: 'Sunbreaker', arc: 'Striker', void: 'Sentinel', stasis: 'Behemoth', strand: 'Berserker', prismatic: 'Prismatic' },
    1: { solar: 'Gunslinger', arc: 'Arcstrider', void: 'Nightstalker', stasis: 'Revenant', strand: 'Threadrunner', prismatic: 'Prismatic' },
    2: { solar: 'Dawnblade', arc: 'Stormcaller', void: 'Voidwalker', stasis: 'Shadebinder', strand: 'Broodweaver', prismatic: 'Prismatic' },
  };
  const TAGS = [['pve', 'PvE'], ['pvp', 'PvP'], ['raid', 'Raids'], ['dungeon', 'Dungeons'], ['gm', 'Grandmasters'], ['solo', 'Solo'], ['trials', 'Trials'], ['beginner', 'Beginners']];
  const TAGN = Object.fromEntries(TAGS);
  const SORTS = [['popular', 'Popular'], ['new', 'Newest'], ['liked', 'Most liked'], ['used', 'Most imported']];
  const elOf = (k) => ELS.find((e) => e[0] === k) || ['', '', '#8e939b'];
  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago'; return new Date(t).toLocaleDateString(); };

  const s = document.createElement('section'); s.id = 'builds'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Builds'; b.dataset.t = 'builds';
  const after = nav.querySelector('[data-t=loadouts]'); nav.insertBefore(b, after ? after.nextSibling : null);
  b.onclick = () => { window.show('builds'); };

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="builds"] main > #builds{max-width:none!important;margin:0!important;zoom:1!important;padding:12px 16px 28px}
#builds{color:#e6e7ea}
#builds .bdw{max-width:1360px;margin:0 auto 32px}
#builds .bdh{display:flex;flex-direction:column;gap:12px;padding:22px 24px;border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:radial-gradient(60% 140% at 100% 0,color-mix(in srgb,var(--g-accent,#e8b84a) 13%,transparent),transparent 70%),var(--g-panel,#16181d)}
#builds .bdh h2{margin:0!important;padding:0!important;border:0!important;font-size:30px;line-height:1.1;color:#fff;letter-spacing:-.01em;text-transform:none}
#builds .bdh p{margin:0;color:#aeb4bd;font-size:14px;max-width:72ch}
#builds .bdrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#builds .bdseg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--g-line,#2b2e33);border-radius:12px;overflow:hidden}
#builds .bdseg button{border:0!important;border-radius:0!important;background:transparent;color:#cfd2d8;padding:8px 13px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
#builds .bdseg button+button{border-left:1px solid var(--g-line,#2b2e33)!important}
#builds .bdseg button.on{background:color-mix(in srgb,var(--g-accent,#e8b84a) 22%,transparent);color:#fff}
#builds .bdseg i{width:9px;height:9px;border-radius:50%;display:inline-block}
#builds .bdq{flex:1 1 240px;min-width:0;height:38px;margin:0!important;border-radius:10px!important;padding:0 12px!important;box-sizing:border-box;font-size:14px}
#builds .bdrow select{width:auto!important;flex:none;height:38px;margin:0!important;border-radius:10px;padding:0 30px 0 12px;font-size:13.5px}
#builds .bdv svg{display:block;flex:none}
#builds .bdmine{flex:none;margin:0!important;height:38px;border-radius:10px;padding:0 13px;cursor:pointer}
#builds .bdmine.on{border-color:var(--g-accent,#e8b84a)!important;color:#fff}
#builds .bdst{margin:14px 2px 10px;color:#9aa0a8;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#builds .bdst .bderr{color:#ffb4a8}
#builds .bdg{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}
#builds .bdc{position:relative;display:flex;flex-direction:column;border:1px solid var(--g-line,#2b2e33);border-radius:14px;background:var(--g-panel,#16181d);overflow:hidden;cursor:pointer;transition:border-color .15s}
#builds .bdc:hover,#builds .bdc:focus-visible{border-color:color-mix(in srgb,var(--el) 70%,#fff 0%)}
#builds .bdc:focus-visible{outline:2px solid var(--el);outline-offset:2px}
#builds .bdtop{display:flex;align-items:center;gap:12px;padding:14px 14px 12px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 26%,transparent),transparent 75%);border-bottom:1px solid color-mix(in srgb,var(--el) 30%,var(--g-line,#2b2e33))}
#builds .bdsi{width:44px;height:44px;flex:none;border-radius:10px;background:color-mix(in srgb,var(--el) 18%,#0d0f13);display:grid;place-items:center;overflow:hidden}
#builds .bdsi img{width:40px;height:40px;display:block}
#builds .bdtt{min-width:0}
#builds .bdtt b{display:block;font-size:16px;color:#fff;line-height:1.25;overflow-wrap:anywhere}
#builds .bdtt small{display:block;margin-top:2px;font-size:12px;color:color-mix(in srgb,var(--el) 70%,#fff)}
#builds .bdbody{display:flex;flex-direction:column;gap:10px;padding:12px 14px 12px;flex:1}
#builds .bdgear{display:flex;flex-wrap:wrap;gap:6px}
#builds .bdgear span{width:44px;height:44px;border-radius:6px;overflow:hidden;border:1px solid #3a3f48;background:#0d0f13}
#builds .bdgear span.x{border-color:#e8c25a;box-shadow:0 0 0 1px rgba(232,194,90,.35)}
#builds .bdgear img{width:100%;height:100%;display:block}
#builds .bdtags{display:flex;flex-wrap:wrap;gap:5px}
#builds .bdtags em{font-style:normal;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--g-line,#2b2e33);color:#cfd2d8}
#builds .bdby{font-size:12px;color:#8e939b}
#builds .bdft{display:flex;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid var(--g-line,#2b2e33)}
#builds .bdv{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:999px;font-size:13px;cursor:pointer;color:#cfd2d8;background:transparent}
#builds .bdv.on.bvu{color:#7be3a0;border-color:#3f8a5c!important;background:rgba(63,138,92,.16)}
#builds .bdv.on.bvd{color:#ffb4a8;border-color:#8a4a3f!important;background:rgba(138,74,63,.16)}
#builds .bdv[disabled]{opacity:.5;cursor:default}
#builds .bdu{font-size:12px;color:#8e939b;margin-left:4px}
#builds .bdimp{margin-left:auto;height:30px;border-radius:999px;padding:0 14px;cursor:pointer;font-weight:600}
#builds .bdmore{display:block;margin:16px auto 0;height:38px;padding:0 18px;border-radius:10px;cursor:pointer}
#builds .bdempty{padding:34px 20px;text-align:center;border:1px dashed var(--g-line,#2b2e33);border-radius:14px;color:#aeb4bd}
#builds .bdempty b{display:block;color:#fff;font-size:16px;margin-bottom:6px}
#bdm{position:fixed;inset:0;z-index:9100;background:rgba(4,6,10,.72);display:flex;align-items:flex-start;justify-content:center;padding:max(5vh,env(safe-area-inset-top)) 12px 24px;overflow:auto}
#bdm .bdmc{width:min(var(--bdw,680px),100%);border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:var(--g-panel,#16181d);box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;color:#e6e7ea}
#bdm .bdtop{display:flex;align-items:center;gap:14px;padding:18px 18px 14px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 28%,transparent),transparent 75%)}
#bdm .bdsi{width:56px;height:56px;flex:none;border-radius:12px;background:color-mix(in srgb,var(--el) 18%,#0d0f13);display:grid;place-items:center;overflow:hidden}#bdm .bdsi img{width:52px;height:52px}
#bdm h3{margin:0;font-size:22px;color:#fff;overflow-wrap:anywhere}
#bdm .bdsub{font-size:13px;color:color-mix(in srgb,var(--el) 70%,#fff);margin-top:3px}
#bdm .bdx{margin-left:auto;align-self:flex-start;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;line-height:28px;padding:0}
#bdm .bdin{padding:4px 18px 16px;display:flex;flex-direction:column;gap:12px}
#bdm .bdpic{display:block;width:100%;padding:0!important;margin:0;border:1px solid var(--g-line,#2b2e33)!important;border-radius:12px!important;overflow:hidden;background:#0c0d11;cursor:zoom-in;line-height:0}
#bdm .bdmc.big .bdpic{cursor:zoom-out}
#bdm .bdpic img{display:block;width:100%;height:auto}
#bdm .bdpic:focus-visible{outline:2px solid var(--el);outline-offset:2px}
#bdm .bdaddpic{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px dashed var(--g-line,#2b2e33);border-radius:10px;font-size:13px;color:#cfd2d8}
#bdm .bdaddpic span{flex:1 1 220px}
#bdm h4{margin:6px 0 0;font-size:11px;letter-spacing:.08em;color:#8e939b;font-weight:600}
#bdm .bdlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px}
#bdm .bdit{display:flex;align-items:center;gap:9px;font-size:13px;color:#dfe2e6;min-width:0}
#bdm .bdit span{width:38px;height:38px;flex:none;border-radius:6px;overflow:hidden;border:1px solid #3a3f48}#bdm .bdit span.x{border-color:#e8c25a}#bdm .bdit img{width:100%;height:100%;display:block}
#bdm .bdit b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bdm .bdnotes{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.55;color:#d6d9de;background:rgba(0,0,0,.18);border:1px solid var(--g-line,#2b2e33);border-radius:10px;padding:10px 12px}
#bdm .bdft{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 18px 18px;border-top:1px solid var(--g-line,#2b2e33)}
#bdm .bdmsg{flex-basis:100%;font-size:13px;color:#ffb4a8}
#bdm .bdv{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border-radius:999px;font-size:13.5px;cursor:pointer}
#bdm .bdv.on.bvu{color:#7be3a0;border-color:#3f8a5c!important;background:rgba(63,138,92,.16)}#bdm .bdv.on.bvd{color:#ffb4a8;border-color:#8a4a3f!important;background:rgba(138,74,63,.16)}
#bdm .bdimp{margin-left:auto;height:36px;padding:0 16px;border-radius:999px;font-weight:600;cursor:pointer}
#builds .bdh{position:relative}#builds .bdcreate{position:absolute;top:20px;right:22px;height:40px;padding:0 18px;border-radius:10px;font-weight:600;cursor:pointer}
#builds .bdpage{max-width:1240px}
#builds .bdback{margin:0 0 10px;height:34px;padding:0 12px;border-radius:8px;cursor:pointer}
#builds .bdhero{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:20px 22px;border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 24%,var(--g-panel,#16181d)),var(--g-panel,#16181d) 70%)}
#builds .bdsi.big{width:72px;height:72px;border-radius:14px}#builds .bdsi.big img{width:66px;height:66px}
#builds .bdht{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:6px}
#builds .bdht small{color:color-mix(in srgb,var(--el) 70%,#fff);font-size:13px}
#builds .bdht h2{margin:0!important;padding:0!important;border:0!important;font-size:28px;line-height:1.15;color:#fff;text-transform:none;letter-spacing:-.01em;overflow-wrap:anywhere}
#builds .bdha{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
#builds .bdha .bdv{height:36px;padding:0 12px}
#builds .bdha .bdimp{margin-left:6px;height:38px;padding:0 18px}
#builds .bdha button.g{height:36px;padding:0 14px;border-radius:999px;cursor:pointer}
#builds .bdmsg{flex-basis:100%;font-size:13px;color:#ffb4a8}
#builds .bdaddpic{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 0;padding:10px 14px;border:1px dashed var(--g-line,#2b2e33);border-radius:12px;font-size:13.5px;color:#cfd2d8}#builds .bdaddpic span{flex:1 1 260px}
#builds .bdcols{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:14px;margin-top:14px;align-items:start}
#builds .bdmain,#builds .bdside{display:flex;flex-direction:column;gap:14px;min-width:0}
#builds .bdbox{border:1px solid var(--g-line,#2b2e33);border-radius:14px;background:var(--g-panel,#16181d);overflow:hidden}
#builds .bdbox>h3{margin:0;padding:12px 16px;font-size:12.5px;letter-spacing:.06em;color:#e6e7ea;border-bottom:1px solid var(--g-line,#2b2e33);text-transform:uppercase;font-weight:700}
#builds .bdbb{padding:14px 16px 16px}
#builds .bdbb h4{margin:4px 0 8px;font-size:13px;color:#9aa0a8;font-weight:600}
#builds .bdbb h4:not(:first-child){margin-top:16px}
#builds .bdti{display:inline-block;flex:none;border:2px solid #3a3f48;border-radius:6px;overflow:hidden;background:#0d0f13;vertical-align:middle}#builds .bdti.rd{border-radius:50%;border-width:1px}#builds .bdti img{width:100%;height:100%;display:block}
#builds .bdsubg{display:flex;flex-wrap:wrap;gap:16px 26px}
#builds .bdsgi{display:flex;flex-direction:column;gap:8px}#builds .bdsgi.wide{flex-basis:100%}
#builds .bdsgi small{font-size:13px;color:#9aa0a8}
#builds .bdrowi{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#builds .bdnm{font-size:12.5px;color:#cfd2d8;margin-top:2px}
#builds .bdgi{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05)}#builds .bdgi:first-of-type{border-top:0}
#builds .bdgt{flex:1;min-width:0;display:flex;flex-direction:column}
#builds .bdgt b{font-size:14.5px;color:#fff;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#builds .bdgt small{font-size:12.5px;color:#9aa0a8}
#builds .bdgm{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;max-width:60%}
#builds .bdsep{display:inline-block;width:1px;height:40px;background:var(--g-line,#2b2e33);margin:0 6px}
#builds .bdsb{display:flex;align-items:center;gap:12px;padding:6px 0}#builds .bdsb b{display:block;font-size:14px;color:#fff}#builds .bdsb small{font-size:12.5px;color:#9aa0a8}
#builds .bdprio{display:flex;flex-wrap:wrap;align-items:center;gap:6px}#builds .bdprio span{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);font-size:13px;color:#fff}#builds .bdprio b{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--c);color:#111;font-size:11.5px}#builds .bdprio i{font-style:normal;color:#8e939b}
#builds .bdst1{display:grid;grid-template-columns:80px 1fr 38px;align-items:center;gap:10px;margin:5px 0;font-size:13px;color:#cfd2d8}#builds .bdst1 i{height:10px;border-radius:5px;background:#23262b;overflow:hidden}#builds .bdst1 u{display:block;height:100%;text-decoration:none}#builds .bdst1 b{text-align:right;color:#fff}
#builds .bdswb .bdbb{padding:0}#builds .bdsw{display:grid;grid-template-columns:1fr 1fr}#builds .bdsw>div{padding:14px 16px}#builds .bdsw .good{background:rgba(63,154,100,.1)}#builds .bdsw .bad{background:rgba(166,75,75,.1)}#builds .bdsw h4{margin:0 0 8px!important;font-size:15px}#builds .bdsw .good h4{color:#5fd08a}#builds .bdsw .bad h4{color:#ff7d8f}#builds .bdsw p{margin:5px 0;font-size:13.5px;color:#dfe2e6}
#builds .bdnotes{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.6;color:#d6d9de}
#builds .bdpic{display:block;width:100%;padding:0!important;border:1px solid var(--g-line,#2b2e33)!important;border-radius:10px!important;overflow:hidden;background:#0c0d11;cursor:zoom-in;line-height:0}#builds .bdpic img{display:block;width:100%;height:auto}
#builds .bdmi{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 0!important;background:transparent!important;border:0!important;border-top:1px solid rgba(255,255,255,.05)!important;border-radius:0!important;cursor:pointer;color:inherit}#builds .bdmi:first-child{border-top:0!important}#builds .bdmi>span:first-child{flex:1;min-width:0}#builds .bdmi b{display:block;font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#builds .bdmi small{font-size:12px;color:#9aa0a8}#builds .bdmg{display:flex;gap:4px}#builds .bdmg span{width:34px;height:34px;border-radius:5px;overflow:hidden;border:1px solid #3a3f48}#builds .bdmg span.x{border-color:#e8c25a}#builds .bdmg img{width:100%;height:100%;display:block}#builds .bdmi:hover b{text-decoration:underline}
#builds .bdedit .bdl{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;font-size:13px;color:#cfd2d8}#builds .bdedit input,#builds .bdedit textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;margin:0!important}
#builds .bdchips{display:flex;flex-wrap:wrap;gap:6px}#builds .bdchip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--g-line,#2b2e33);border-radius:999px;cursor:pointer;font-size:12.5px;user-select:none}#builds .bdchip input{position:absolute;opacity:0;pointer-events:none}#builds .bdchip.on{border-color:var(--g-accent,#e8b84a);color:#fff;background:color-mix(in srgb,var(--g-accent,#e8b84a) 18%,transparent)}#builds .bdchip.gd.on{border-color:#3f9a64;background:rgba(63,154,100,.2)}#builds .bdchip.bd.on{border-color:#a64b4b;background:rgba(166,75,75,.22)}#builds .bdchip em{font-style:normal;font-weight:700;font-size:11px;width:16px;height:16px;border-radius:50%;display:inline-grid;place-items:center;background:var(--g-accent,#e8b84a);color:#111}#builds .bdchip:focus-within{outline:2px solid var(--g-accent,#e8b84a);outline-offset:2px}
#builds .bdcap{display:flex;flex-direction:column;align-items:center;gap:5px;width:78px;text-align:center}#builds .bdcap span{font-size:11.5px;line-height:1.25;color:#cfd2d8}
#builds .bdlst{display:grid;gap:10px}#builds .bdlst.two{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-top:10px}
#builds .bdli{display:flex;gap:12px;align-items:flex-start}#builds .bdli b{display:block;font-size:14px;color:#fff;font-weight:600}#builds .bdli p{margin:2px 0 0;font-size:13px;line-height:1.45;color:#b9bec6}
#builds .bdgr{padding:8px 0;border-top:1px solid rgba(255,255,255,.05)}#builds .bdgr:first-of-type{border-top:0}#builds .bdgr .bdgi{padding:0;border:0}
#builds .bdex{margin:8px 0 0 64px;font-size:13px;line-height:1.45;color:#d9c98a}#builds .bdex b{color:#f0d58a}
#builds .bdnames{margin:6px 0 0 64px;font-size:12.5px;color:#b9bec6;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}#builds .bdnames span{color:#8e939b;margin-right:2px}#builds .bdnames i{font-style:normal;padding:1px 8px;border-radius:999px;background:rgba(255,255,255,.06)}
#builds .bdsb p{margin:3px 0 0;font-size:13px;line-height:1.45;color:#b9bec6}#builds .bdsb{align-items:flex-start}
#builds .bdartn{font-size:15px;color:#fff;margin-left:6px}
@media (max-width:640px){#builds .bdex,#builds .bdnames{margin-left:0}#builds .bdcap{width:64px}}
#builds .bdbtns{display:flex;gap:8px}#builds .bdbtns button{height:38px;padding:0 16px;border-radius:10px;cursor:pointer}
#bdlb{position:fixed;inset:0;z-index:9200;background:rgba(4,6,10,.88);display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out}#bdlb img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.6)}#bdlb button{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;font-size:22px;padding:0;cursor:pointer}
@media (max-width:900px){#builds .bdcols{grid-template-columns:1fr}}
@media (max-width:640px){#builds .bdcreate{position:static;align-self:flex-start}#builds .bdhero{padding:16px}#builds .bdht h2{font-size:22px}#builds .bdsw{grid-template-columns:1fr}#builds .bdgm{max-width:50%}#builds .bdha .bdimp{margin-left:0}}
@media (max-width:640px){#builds .bdq,#builds .bdrow select,#builds .bdmine{height:46px!important;font-size:16px!important}#bdm{padding-left:6px;padding-right:6px}#bdm .bdin{padding:4px 10px 14px}#builds .bdseg{flex-wrap:nowrap;overflow-x:auto;max-width:100%;scrollbar-width:none}#builds .bdseg button{flex:none;white-space:nowrap}#builds .bdrow select{flex:1 1 40%}#builds .bdh{padding:16px}#builds .bdh h2{font-size:24px}#builds .bdg{grid-template-columns:1fr}}
`;
  document.head.appendChild(css);

  const st = { sort: 'popular', cls: '', el: '', tag: '', q: '', mine: false, p: 0, list: [], more: false, busy: false, err: '', signed: 0, loaded: false };
  const SV_UP = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';
  const SV_DN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform:scaleY(-1)"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';
  const subName = (x) => (x.cls >= 0 && x.cls <= 2 && SUBN[x.cls][x.el] ? SUBN[x.cls][x.el] + (x.el === 'prismatic' ? ' ' + CL[x.cls] : '') : x.sub || '');
  const gearIcons = (x, n) => [...((x.sum && x.sum.w) || []), ...(((x.sum && x.sum.a) || []).filter((q) => q.x))].slice(0, n || 5).map((q) => `<span class="${q.x ? 'x' : ''}" title="${esc(q.n)}">${img(q.i) ? `<img src="${esc(img(q.i))}" alt="${esc(q.n)}" loading="lazy">` : ''}</span>`).join('');
  const votes = (x, big) => `<button type="button" class="bdv bvu${x.vote === 1 ? ' on' : ''}" data-bv="1" data-id="${esc(x.id)}" title="${x.mine ? 'Your build' : 'I like this build'}" aria-label="Like, ${x.likes}"${x.mine ? ' disabled' : ''}>${SV_UP}${x.likes}</button><button type="button" class="bdv bvd${x.vote === -1 ? ' on' : ''}" data-bv="-1" data-id="${esc(x.id)}" title="${x.mine ? 'Your build' : 'Not for me'}" aria-label="Dislike, ${x.dislikes}"${x.mine ? ' disabled' : ''}>${SV_DN}${x.dislikes}</button>${big ? '' : `<span class="bdu" title="Times it was added to someone's loadouts">${x.uses} import${x.uses === 1 ? '' : 's'}</span>`}`;
  const card = (x) => {
    const e = elOf(x.el), si = img(x.sum && x.sum.si);
    return `<article class="bdc" tabindex="0" data-open="${esc(x.id)}" style="--el:${e[2]}" aria-label="${esc(x.title)}"><div class="bdtop"><div class="bdsi">${si ? `<img src="${esc(si)}" alt="" loading="lazy">` : ''}</div><div class="bdtt"><b>${esc(x.title)}</b><small>${esc([CL[x.cls], subName(x)].filter(Boolean).join(' · '))}</small></div></div>
<div class="bdbody"><div class="bdgear">${gearIcons(x)}</div>${x.tags.length ? `<div class="bdtags">${x.tags.map((t) => `<em>${esc(TAGN[t] || t)}</em>`).join('')}</div>` : ''}<div class="bdby">by ${esc(x.by)} · ${esc(ago(x.at))}${x.mine ? ' · your build' : ''}</div></div>
<div class="bdft">${votes(x)}<button type="button" class="bdimp b" data-imp="${esc(x.id)}">Import</button></div></article>`;
  };
  const elSeg = () => {
    const nm = (k, l) => (st.cls !== '' && SUBN[st.cls][k] ? SUBN[st.cls][k] : l);
    return `<div class="bdseg" role="group" aria-label="Subclass"><button type="button" data-el="" class="${st.el ? '' : 'on'}">All subclasses</button>${ELS.map(([k, l, c]) => `<button type="button" data-el="${k}" class="${st.el === k ? 'on' : ''}"><i style="background:${c}"></i>${esc(nm(k, l))}</button>`).join('')}</div>`;
  };
  function draw() {
    if (OPEN) { const ae = document.activeElement, fid = ae && ae.id && s.contains(ae) ? ae.id : ''; s.innerHTML = pageHTML(OPEN); if (fid) { const i = document.getElementById(fid); if (i) { i.focus({ preventScroll: true }); if (i.setSelectionRange && typeof i.value === 'string') i.setSelectionRange(i.value.length, i.value.length); } } return; }
    const qf = document.activeElement && document.activeElement.id === 'bdq';
    s.innerHTML = `<div class="bdw"><div class="bdh"><div><h2>Builds</h2><p>Builds from the Pathfinder community. Import one straight into your loadouts, and like the ones that work. Make your own with Create build, using any weapon or armor in the game, or share one of your loadouts from its Share menu.</p></div><button type="button" class="b bdcreate" data-create="1">+ Create build</button>
<div class="bdrow"><div class="bdseg" role="group" aria-label="Class"><button type="button" data-cls="" class="${st.cls === '' ? 'on' : ''}">All classes</button>${CL.map((c, i) => `<button type="button" data-cls="${i}" class="${st.cls === i ? 'on' : ''}">${c}</button>`).join('')}</div>${elSeg()}</div>
<div class="bdrow"><input id="bdq" class="bdq" type="search" placeholder="Search builds, exotics, weapons or players" value="${esc(st.q)}" aria-label="Search builds" autocomplete="off" spellcheck="false"><select id="bdtag" aria-label="Good for"><option value="">Good for anything</option>${TAGS.map(([k, l]) => `<option value="${k}"${st.tag === k ? ' selected' : ''}>${l}</option>`).join('')}</select><select id="bdsort" aria-label="Sort">${SORTS.map(([k, l]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="bdmine${st.mine ? ' on' : ''}" data-mine="1" aria-pressed="${st.mine}">My builds</button></div></div>
<div class="bdst" aria-live="polite">${st.err ? `<span class="bderr">${esc(st.err)}</span>` : st.busy && !st.list.length ? 'Loading builds...' : st.loaded ? `${st.list.length}${st.more ? '+' : ''} build${st.list.length === 1 ? '' : 's'}` : ''}</div>
${st.loaded && !st.list.length && !st.err ? `<div class="bdempty"><b>${st.mine ? 'You have not shared a build yet' : st.cls !== '' || st.el || st.tag || st.q ? 'No builds match' : 'No builds yet'}</b>${st.cls !== '' || st.el || st.tag || st.q ? 'Try fewer filters, or be the first to share one like it.' : 'Be the first: press Create build, or share one of your loadouts from its Share menu.'}<p><button type="button" class="b" data-create="1">+ Create build</button> <button type="button" class="g" data-golo="1">Go to Loadouts</button></p></div>` : `<div class="bdg">${st.list.map(card).join('')}</div>`}
${st.more ? `<button type="button" class="bdmore" data-more="1"${st.busy ? ' disabled' : ''}>${st.busy ? 'Loading...' : 'Show more builds'}</button>` : ''}</div>`;
    if (qf) { const q = document.getElementById('bdq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  let seq = 0;
  async function load(append) {
    const my = ++seq; st.busy = true; st.err = ''; if (!append) st.p = 0; draw();
    try {
      const r = await gt.bdList({ sort: st.sort, cls: st.cls === '' ? '' : st.cls, el: st.el, tag: st.tag, q: st.q, mine: st.mine, p: st.p });
      if (my !== seq) return;
      st.list = append ? st.list.concat(r.builds || []) : r.builds || []; st.more = !!r.more; st.signed = r.signed || 0;
    } catch (er) { if (my !== seq) return; st.err = clean(er); if (!append) st.list = []; st.more = false; }
    st.busy = false; st.loaded = true; draw();
  }
  const byId = (id) => st.list.find((x) => x.id === id);
  async function vote(id, v, el) {
    const x = byId(id) || (OPEN && OPEN.id === id ? OPEN : null); if (!x || x.mine) return;
    const nv = x.vote === v ? 0 : v;
    try {
      const r = await gt.bdVote({ id, v: nv });
      [byId(id), OPEN && OPEN.id === id ? OPEN : null].forEach((o) => { if (o) Object.assign(o, { vote: nv, likes: r.likes, dislikes: r.dislikes, uses: r.uses }); });
      draw(); if (OPEN && OPEN.id === id) drawOpen();
    } catch (er) { const m = clean(er); if (OPEN && OPEN.id === id) { OPEN.msg = m; drawOpen(); } else { st.err = m; draw(); } }
  }
  async function imp(id) {
    try {
      const full = await gt.bdGet({ id });
      if (!window.__gtlo || !window.__gtlo.openBuild) throw new Error('Open the Loadouts tab once, then try again.');
      window.__gtlo.openBuild(full.code, { id: full.id, title: full.title, by: full.by });
    } catch (er) { const m = clean(er); if (OPEN) { OPEN.msg = m; drawOpen(); } else { st.err = m; draw(); } }
  }

  // ---- one build as its own page (like a build site): subclass, gear and mods, stats, set bonuses, artifact, strengths and
  // weaknesses, how to play it, the picture, and more builds like it. A refresh comes back to the same build.
  const BDS = {
    STR: { abil: 'Strong abilities', melee: 'Infinite melee', gren: 'Grenade spam', super: 'Fast super', surv: 'Strong survivability', heal: 'Lots of healing', add: 'Strong ad-clear', boss: 'Strong boss damage', champ: 'Handles champions', close: 'Strong up close', long: 'Strong at range', buff: 'Constant buffs', team: 'Supports the team', easy: 'Easy to play' },
    WEAK: { boss: 'Weak vs bosses', long: 'Weak at range', close: 'Weak up close', add: 'Slow ad-clear', surv: 'Squishy', champ: 'Struggles with champions', hard: 'Hard to play', ammo: 'Ammo hungry', team: 'Needs a team', setup: 'Slow to set up' },
    STATS: ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'],
    STC: ['#9aa0a8', '#6fbf73', '#e0b64a', '#e8a53a', '#c77dff', '#5d9ce0'],
  };
  window.__gtBD = BDS;
  const RC = { Exotic: '#ceae33', Legendary: '#8a5fb0', Rare: '#5076a3' };
  let OPEN = null, listY = 0;
  const ss = (v) => { try { if (v) sessionStorage.setItem('gt_bdopen', v); else sessionStorage.removeItem('gt_bdopen'); } catch (e) { /* not remembered */ } };
  const closeOpen = () => { if (!OPEN) return; OPEN = null; ss(''); const lb = document.getElementById('bdlb'); if (lb) lb.remove(); draw(); window.scrollTo(0, listY); };
  const drawOpen = () => draw();
  const tile = (q, sz, round) => { const u = img(q && q.i); return `<span class="bdti${round ? ' rd' : ''}" style="width:${sz}px;height:${sz}px${q && q.r && RC[q.r] ? ';border-color:' + RC[q.r] : ''}" title="${esc((q && q.n) || '')}${q && q.d ? '\n\n' + esc(q.d) : ''}">${u ? `<img src="${esc(u)}" alt="${esc((q && q.n) || '')}" loading="lazy">` : ''}</span>`; };
  function pageHTML(x) {
    const e = elOf(x.el), si = img(x.sum && x.sum.si), inf = x.info || null, sw = x.sw || { s: [], w: [], p: [] };
    const box = (title, body, cls) => `<div class="bdbox${cls ? ' ' + cls : ''}"><h3>${title}</h3><div class="bdbb">${body}</div></div>`;
    let sub = '', gear = '', stats = '', sets = '', art = '';
    if (inf) {
      const sp = inf.sp || [], k = (q, i) => (q.k !== undefined ? q.k : i === 0 ? 0 : i <= 4 ? 1 : i <= 6 ? 5 : 6);
      const grp = [['Super', sp.filter((q, i) => k(q, i) === 0)], ['Abilities', sp.filter((q, i) => { const n = k(q, i); return n >= 1 && n <= 4; })], ['Aspects', sp.filter((q, i) => k(q, i) === 5)], ['Fragments', sp.filter((q, i) => k(q, i) >= 6)]].filter((g) => g[1].length);
      // Super and abilities as icons with their names; aspects and fragments as a list with what each one does.
      const cap = (q, sz) => `<div class="bdcap">${tile(q, sz)}<span>${esc(q.n || '')}</span></div>`;
      const lst = (l, sz) => `<div class="bdlst">${l.map((q) => `<div class="bdli">${tile(q, sz)}<div><b>${esc(q.n || '')}</b>${q.d ? `<p>${esc(q.d)}</p>` : ''}</div></div>`).join('')}</div>`;
      const top = grp.filter(([t]) => t === 'Super' || t === 'Abilities'), low = grp.filter(([t]) => t === 'Aspects' || t === 'Fragments');
      if (grp.length) sub = box('Subclass' + (inf.sub && inf.sub.n ? ' · ' + esc(inf.sub.n) : ''), `${top.length ? `<div class="bdsubg">${top.map(([t, l]) => `<div class="bdsgi"><small>${t}</small><div class="bdrowi">${l.map((q) => cap(q, t === 'Super' ? 56 : 50)).join('')}</div></div>`).join('')}</div>` : ''}${low.map(([t, l]) => `<h4>${t}</h4>${lst(l, t === 'Aspects' ? 46 : 40)}`).join('')}`);
      // Every weapon: type, its frame (or exotic perk, with what it does), and its perks by name; every armor piece: archetype,
      // set, its exotic perk, and its mods by name.
      const ex = (q) => q.intr && q.intr.n ? (q.r === 'Exotic' || q.intr.d) && q.r === 'Exotic' ? `<p class="bdex"><b>${esc(q.intr.n)}</b>${q.intr.d ? ' · ' + esc(q.intr.d) : ''}</p>` : '' : '';
      const names = (l, lbl) => (l || []).length ? `<p class="bdnames"><span>${lbl}</span> ${l.map((p) => `<i title="${esc(p.d || '')}">${esc(p.n || '')}</i>`).join('')}</p>` : '';
      const wl = (inf.w || []).map((q) => `<div class="bdgr"><div class="bdgi">${tile(q, 52)}<div class="bdgt"><b>${esc(q.n)}</b><small>${esc([[q.r === 'Exotic' ? 'Exotic' : '', q.t].filter(Boolean).join(' '), q.r !== 'Exotic' && q.intr ? q.intr.n : ''].filter(Boolean).join(' · '))}</small></div><div class="bdgm">${(q.p || []).map((p) => tile(p, 34, true)).join('')}</div></div>${ex(q)}${names(q.p, 'Perks')}</div>`).join('');
      const al = (inf.a || []).map((q) => `<div class="bdgr"><div class="bdgi">${tile(q, 52)}<div class="bdgt"><small>${esc(q.s || '')}</small><b>${esc(q.n)}</b><small>${esc([q.r === 'Exotic' ? 'Exotic' : '', q.ar, q.r === 'Exotic' ? '' : q.set].filter(Boolean).join(' · '))}</small></div><div class="bdgm">${(q.m || []).map((p) => tile(p, 34)).join('')}</div></div>${ex(q)}${names(q.m, 'Mods')}</div>`).join('');
      const any = (inf.any || []).length ? `<h4>Other mods</h4><div class="bdrowi">${inf.any.map((p) => tile(p, 34)).join('')}</div>${names(inf.any, 'Mods')}` : '';
      if (wl || al) gear = box('Gear and mods', `${wl ? `<h4>Weapons</h4>${wl}` : ''}${al ? `<h4>Armor</h4>${al}` : ''}${any}`);
      if (inf.sb && inf.sb.length) sets = box('Armor set bonuses', inf.sb.map((q) => `<div class="bdsb">${tile(q, 40, true)}<div><b>${esc(q.n)}</b><small>${esc(q.rc + '-piece · ' + q.s)}</small>${q.d ? `<p>${esc(q.d)}</p>` : ''}</div></div>`).join(''));
      if (inf.art && ((inf.art.p || []).length || inf.art.i)) art = box('Artifact and perks', `<div class="bdrowi">${inf.art.i ? tile({ i: inf.art.i, n: inf.art.n }, 52) + `<b class="bdartn">${esc(inf.art.n || '')}</b>` : ''}</div>${(inf.art.p || []).length ? `<div class="bdlst two">${inf.art.p.map((p) => `<div class="bdli">${tile(p, 38, true)}<div><b>${esc(p.n || '')}</b>${p.d ? `<p>${esc(p.d)}</p>` : ''}</div></div>`).join('')}</div>` : ''}`);
    } else if (x.sum) {
      const it = (q) => `<div class="bdgi">${tile({ ...q, r: q.x ? 'Exotic' : '' }, 48)}<div class="bdgt"><b>${esc(q.n)}</b></div></div>`;
      if ((x.sum.w || []).length || (x.sum.a || []).length) gear = box('Gear', `${(x.sum.w || []).length ? `<h4>Weapons</h4>${x.sum.w.map(it).join('')}` : ''}${(x.sum.a || []).length ? `<h4>Armor</h4>${x.sum.a.map(it).join('')}` : ''}`);
    }
    const tot = inf && inf.st ? inf.st : null, hasP = !!(sw.p && sw.p.length);
    if (hasP || tot) stats = box('Stats', `${hasP ? `<h4>Priority</h4><div class="bdprio">${sw.p.map((i, n) => `${n ? '<i aria-hidden="true">›</i>' : ''}<span style="--c:${BDS.STC[i]}"><b>${n + 1}</b>${esc(BDS.STATS[i])}</span>`).join('')}</div>` : ''}${tot ? `<h4>Totals on the armor</h4>${tot.map((v, i) => `<div class="bdst1"><span>${esc(BDS.STATS[i])}</span><i><u style="width:${Math.max(0, Math.min(100, v / 2))}%;background:${BDS.STC[i]}"></u></i><b>${v}</b></div>`).join('')}` : ''}`);
    const swb = (sw.s.length || sw.w.length) ? box('Strengths and weaknesses', `<div class="bdsw"><div class="good"><h4>Strengths</h4>${sw.s.length ? sw.s.map((k2) => `<p>✓ ${esc(BDS.STR[k2] || k2)}</p>`).join('') : '<p class="mute">None picked.</p>'}</div><div class="bad"><h4>Weaknesses</h4>${sw.w.length ? sw.w.map((k2) => `<p>✕ ${esc(BDS.WEAK[k2] || k2)}</p>`).join('') : '<p class="mute">None picked.</p>'}</div></div>`, 'bdswb') : '';
    const canAdd = x.mine && window.__gtlo && window.__gtlo.buildPic && x.full && (!x.img || !inf);
    const more = x.moreList && x.moreList.length ? box(`More ${esc([subName(x), CL[x.cls]].filter(Boolean).join(' '))} builds`, x.moreList.map((m) => `<button type="button" class="bdmi" data-open="${esc(m.id)}"><span><b>${esc(m.title)}</b><small>${m.likes - m.dislikes} likes · ${m.uses} imports</small></span><span class="bdmg">${gearIcons(m, 3)}</span></button>`).join('')) : '';
    const chip = (cls, on, attr, k2, label) => `<label class="bdchip${cls}${on ? ' on' : ''}"><input type="checkbox" ${attr}="${k2}"${on ? ' checked' : ''}>${label}</label>`;
    const edit = x.editing ? `<div class="bdbox bdedit"><h3>Edit build</h3><div class="bdbb">
<label class="bdl">Name<input id="bdetitle" maxlength="60" value="${esc(x.ed.title)}"></label>
<div class="bdl">Good for (up to 4)<div class="bdchips">${TAGS.map(([k2, l2]) => chip('', x.ed.tags.includes(k2), 'data-etag', k2, esc(l2))).join('')}</div></div>
<div class="bdl">Strengths (up to 8)<div class="bdchips">${Object.entries(BDS.STR).map(([k2, l2]) => chip(' gd', x.ed.s.includes(k2), 'data-estr', k2, esc(l2))).join('')}</div></div>
<div class="bdl">Weaknesses (up to 6)<div class="bdchips">${Object.entries(BDS.WEAK).map(([k2, l2]) => chip(' bd', x.ed.w.includes(k2), 'data-eweak', k2, esc(l2))).join('')}</div></div>
<div class="bdl">Stat priority (pick them in order)<div class="bdchips">${BDS.STATS.map((l2, i) => { const at = x.ed.p.indexOf(i); return chip(' pr', at >= 0, 'data-eprio', i, (at >= 0 ? `<em>${at + 1}</em>` : '') + esc(l2)); }).join('')}</div></div>
<label class="bdl">How to play it<textarea id="bdenotes" maxlength="1200" rows="6">${esc(x.ed.notes)}</textarea></label>
<div class="bdbtns"><button type="button" class="b" data-esave="1"${x.saving ? ' disabled' : ''}>${x.saving ? 'Saving...' : 'Save changes'}</button><button type="button" class="g" data-ecancel="1">Cancel</button></div></div></div>` : '';
    return `<div class="bdw bdpage" style="--el:${e[2]}"><button type="button" class="g bdback" data-bback="1">‹ All builds</button>
<div class="bdhero"><div class="bdsi big">${si ? `<img src="${esc(si)}" alt="">` : ''}</div><div class="bdht"><small>${esc([CL[x.cls], subName(x)].filter(Boolean).join(' · '))} build</small><h2>${esc(x.title)}</h2>${x.tags.length ? `<div class="bdtags">${x.tags.map((t) => `<em>${esc(TAGN[t] || t)}</em>`).join('')}</div>` : ''}<div class="bdby">by ${esc(x.by)} · shared ${esc(new Date(x.at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }))} (${esc(ago(x.at))})</div></div>
<div class="bdha">${votes(x, true)}<span class="bdu">${x.uses} import${x.uses === 1 ? '' : 's'}</span><button type="button" class="b bdimp" data-imp="${esc(x.id)}">Import to my loadouts</button>${x.mine ? '<button type="button" class="g" data-bedit="1">Edit</button>' : ''}${x.mine || x.staff ? `<button type="button" class="g" data-bdel="${esc(x.id)}">${x.mine ? 'Delete' : 'Take down'}</button>` : ''}${x.msg ? `<div class="bdmsg">${esc(x.msg)}</div>` : ''}</div></div>
${canAdd ? `<div class="bdaddpic"><span>Add the full page to this build: the picture, subclass, perks, mods and stats, made from your gear.</span><button type="button" class="b" data-bpic="1"${x.picBusy ? ' disabled' : ''}>${x.picBusy ? 'Making it...' : 'Add picture and details'}</button></div>` : ''}
${edit}
<div class="bdcols"><div class="bdmain">${x.full ? (sub + gear + stats + sets + art + swb) || '<p class="mute">This build has no details yet.</p>' : '<p class="mute">Loading the build...</p>'}</div>
<div class="bdside">${x.notes ? box('How to play it', `<div class="bdnotes">${esc(x.notes)}</div>`) : ''}${x.img ? box('Loadout picture', `<button type="button" class="bdpic" data-bzoom="1" aria-label="Show the loadout picture full size"><img src="${esc(x.img)}" alt="The loadout: weapons, stats, armor, subclass and artifact"></button>`) : ''}${more}</div></div></div>`;
  }
  async function open(id, keepY) {
    if (!OPEN && !keepY) listY = window.scrollY;
    const x = byId(id) || { id, title: 'Build', cls: 3, el: '', sub: '', tags: [], sum: {}, at: Date.now(), likes: 0, dislikes: 0, uses: 0, by: '' };
    OPEN = { ...x, notes: '', full: false, msg: '' }; ss(id); draw(); window.scrollTo(0, 0);
    try {
      const full = await gt.bdGet({ id }); if (!OPEN || OPEN.id !== id) return;
      Object.assign(OPEN, full, { full: true }); draw();
      const r = await gt.bdList({ sort: 'popular', cls: full.cls >= 0 && full.cls <= 2 ? full.cls : '', el: full.el || '', p: 0 });
      if (OPEN && OPEN.id === id) { OPEN.moreList = (r.builds || []).filter((m) => m.id !== id).slice(0, 5); draw(); }
    } catch (er) { if (OPEN && OPEN.id === id) { OPEN.msg = clean(er); OPEN.full = true; draw(); } }
  }
  function lightbox(src) {
    let lb = document.getElementById('bdlb'); if (lb) lb.remove();
    lb = document.createElement('div'); lb.id = 'bdlb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Loadout picture');
    lb.innerHTML = `<button type="button" class="g" aria-label="Close">&times;</button><img src="${esc(src)}" alt="The loadout picture">`;
    lb.onclick = () => lb.remove(); document.body.appendChild(lb);
  }
  async function pageClick(e) {
    if (!OPEN) return;
    const t = e.target;
    if (t.closest('[data-bback]')) { closeOpen(); return; }
    if (t.closest('[data-bzoom]') && OPEN.img) { lightbox(OPEN.img); return; }
    if (t.closest('[data-bedit]')) { const sw = OPEN.sw || { s: [], w: [], p: [] }; OPEN.editing = true; OPEN.ed = { title: OPEN.title, notes: OPEN.notes || '', tags: OPEN.tags.slice(), s: sw.s.slice(), w: sw.w.slice(), p: sw.p.slice() }; draw(); return; }
    if (t.closest('[data-ecancel]')) { OPEN.editing = false; draw(); return; }
    if (t.closest('[data-esave]') && OPEN.ed) {
      const o = OPEN, ti = document.getElementById('bdetitle'), no = document.getElementById('bdenotes'); o.ed.title = ti ? ti.value : o.ed.title; o.ed.notes = no ? no.value : o.ed.notes;
      o.saving = true; o.msg = ''; draw();
      try { await gt.bdEdit({ id: o.id, title: o.ed.title.trim(), notes: o.ed.notes.trim(), tags: o.ed.tags, str: o.ed.s, weak: o.ed.w, prio: o.ed.p }); Object.assign(o, { title: o.ed.title.trim(), notes: o.ed.notes.trim(), tags: o.ed.tags, sw: { s: o.ed.s, w: o.ed.w, p: o.ed.p }, editing: false }); const li = byId(o.id); if (li) Object.assign(li, { title: o.title, tags: o.tags }); }
      catch (er) { o.msg = clean(er); }
      o.saving = false; if (OPEN === o) draw(); return;
    }
    if (t.closest('[data-bpic]') && !OPEN.picBusy) {
      const o = OPEN; o.picBusy = true; o.msg = ''; draw();
      try {
        const bp = await window.__gtlo.buildPic(o.code, o.title);
        if (!bp || !bp.img) throw new Error('The picture could not be made. Open the Loadouts tab once so your gear is loaded, then try again.');
        await gt.bdPic({ id: o.id, img: bp.img, info: bp.info || undefined }); o.img = bp.img; if (bp.info) o.info = bp.info;
      } catch (er) { o.msg = clean(er); }
      o.picBusy = false; if (OPEN === o) draw(); return;
    }
    if (t.closest('[data-bdel]')) {
      if (!OPEN.sure) { OPEN.sure = true; OPEN.msg = 'Click again to ' + (OPEN.mine ? 'delete it for good.' : 'take it down.'); draw(); return; }
      try { const id = OPEN.id; await gt.bdDel({ id }); st.list = st.list.filter((x) => x.id !== id); closeOpen(); } catch (er) { OPEN.msg = clean(er); draw(); }
    }
  }
  function editChange(e) {
    if (!OPEN || !OPEN.editing) return false; const ds = e.target.dataset || {};
    const key = ds.etag ? 'tags' : ds.estr ? 's' : ds.eweak ? 'w' : ds.eprio !== undefined ? 'p' : ''; if (!key) return false;
    const val = key === 'p' ? +ds.eprio : ds.etag || ds.estr || ds.eweak, max = { tags: 4, s: 8, w: 6, p: 6 }[key];
    const ti = document.getElementById('bdetitle'), no = document.getElementById('bdenotes'); if (ti) OPEN.ed.title = ti.value; if (no) OPEN.ed.notes = no.value;
    if (e.target.checked) { if (OPEN.ed[key].length >= max) { e.target.checked = false; OPEN.msg = 'Pick up to ' + max + '.'; draw(); return true; } OPEN.ed[key].push(val); } else OPEN.ed[key] = OPEN.ed[key].filter((v) => v !== val);
    OPEN.msg = ''; draw(); return true;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const lb = document.getElementById('bdlb'); if (lb) lb.remove(); } });

  // ---- the tab's own controls ----
  s.addEventListener('click', (e) => {
    if (OPEN) { const v0 = e.target.closest('[data-bv]'); if (v0) { vote(v0.dataset.id, +v0.dataset.bv, v0); return; } const i0 = e.target.closest('[data-imp]'); if (i0) { imp(i0.dataset.imp); return; } const o0 = e.target.closest('[data-open]'); if (o0) { open(o0.dataset.open, true); return; } pageClick(e); return; }
    if (e.target.closest('[data-create]')) { if (window.__gtlo && window.__gtlo.createBuild) window.__gtlo.createBuild(); else { st.err = 'Open the Loadouts tab once, then try again.'; draw(); } return; }
    const c = e.target.closest('[data-cls]'); if (c) { st.cls = c.dataset.cls === '' ? '' : +c.dataset.cls; load(); return; }
    const el = e.target.closest('[data-el]'); if (el) { st.el = el.dataset.el; load(); return; }
    if (e.target.closest('[data-mine]')) { st.mine = !st.mine; load(); return; }
    if (e.target.closest('[data-more]')) { st.p++; load(true); return; }
    if (e.target.closest('[data-golo]')) { window.show('loadouts'); return; }
    const v = e.target.closest('[data-bv]'); if (v) { e.stopPropagation(); vote(v.dataset.id, +v.dataset.bv, v); return; }
    const i = e.target.closest('[data-imp]'); if (i) { e.stopPropagation(); imp(i.dataset.imp); return; }
    const o = e.target.closest('[data-open]'); if (o) open(o.dataset.open);
  });
  s.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.bdc')) { e.preventDefault(); open(e.target.dataset.open); } });
  s.addEventListener('change', (e) => { if (editChange(e)) return; if (e.target.id === 'bdtag') { st.tag = e.target.value; load(); } else if (e.target.id === 'bdsort') { st.sort = e.target.value; load(); } });
  let qt = 0; s.addEventListener('input', (e) => { if (e.target.id === 'bdq') { st.q = e.target.value; clearTimeout(qt); qt = setTimeout(() => load(), 300); } });

  window.__gtBuilds = { refresh: () => { if (st.loaded) load(); } };
  // A refresh while a build was open opens it again.
  { let id0 = ''; try { id0 = window.__gtReload ? sessionStorage.getItem('gt_bdopen') || '' : ''; if (!window.__gtReload) sessionStorage.removeItem('gt_bdopen'); } catch (e) { /* none */ } if (/^[A-Za-z0-9]{8,12}$/.test(id0)) setTimeout(() => open(id0), 0); }
  new MutationObserver(() => { if (s.classList.contains('on') && !st.loaded && !st.busy) load(); }).observe(s, { attributes: true, attributeFilter: ['class'] });
  if (s.classList.contains('on')) load(); else draw();
})();
