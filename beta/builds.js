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
/* the rarity colour sits behind each icon (like the loadout picture), so icons with a see-through or black background (ornaments)
   still look like the item: purple for legendary, gold for exotic */
#builds .bdgear span{width:44px;height:44px;border-radius:6px;overflow:hidden;border:1px solid #8a5fb0;background:linear-gradient(180deg,rgba(82,47,101,.9),#14161b)}
#builds .bdgear span.x{border-color:#e8c25a;box-shadow:0 0 0 1px rgba(232,194,90,.35);background:linear-gradient(180deg,rgba(206,174,51,.9),#14161b)}
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
#builds .bdcols.solo{grid-template-columns:1fr}#builds .bdpicbig{cursor:zoom-in}#builds .bdsw.one{grid-template-columns:1fr}
html.bdv-open{overflow:hidden}
#bdv{position:fixed;inset:0;z-index:9100;background:rgba(4,6,10,.8);overflow:auto;padding:max(3vh,env(safe-area-inset-top)) 16px 32px;display:flex;justify-content:center;align-items:flex-start}
#bdv .bdvc{width:min(1080px,100%);display:flex;flex-direction:column;gap:12px;color:#e6e7ea}
#bdv .bdvh{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:16px 56px 16px 18px;border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 24%,var(--g-panel,#16181d)),var(--g-panel,#16181d) 70%);box-shadow:0 20px 60px rgba(0,0,0,.5)}
#bdv .bdsi{width:60px;height:60px;flex:none;border-radius:12px;background:color-mix(in srgb,var(--el) 18%,#0d0f13);display:grid;place-items:center;overflow:hidden}#bdv .bdsi img{width:56px;height:56px;display:block}
#bdv .bdht{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:5px}
#bdv .bdht small{color:color-mix(in srgb,var(--el) 70%,#fff);font-size:13px}
#bdv .bdht h2{margin:0!important;padding:0!important;border:0!important;font-size:26px;line-height:1.15;color:#fff;text-transform:none;letter-spacing:-.01em;overflow-wrap:anywhere}
#bdv .bdtags{display:flex;flex-wrap:wrap;gap:5px}#bdv .bdtags em{font-style:normal;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--g-line,#2b2e33);color:#cfd2d8}
#bdv .bdby{font-size:12px;color:#8e939b}
#bdv .bdx{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;padding:0;font-size:22px;line-height:1;cursor:pointer}
#bdv .bdha{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
#bdv .bdv{display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 12px;border-radius:999px;font-size:13.5px;cursor:pointer;color:#cfd2d8;background:transparent}
#bdv .bdv svg{display:block;flex:none}#bdv .bdv.on.bvu{color:#7be3a0;border-color:#3f8a5c!important;background:rgba(63,138,92,.16)}#bdv .bdv.on.bvd{color:#ffb4a8;border-color:#8a4a3f!important;background:rgba(138,74,63,.16)}#bdv .bdv[disabled]{opacity:.5;cursor:default}
#bdv .bdu{font-size:12.5px;color:#8e939b}
#bdv .bdimp{height:38px;padding:0 18px;border-radius:999px;font-weight:600;cursor:pointer}
#bdv .bdha button.g{height:36px;padding:0 14px;border-radius:999px;cursor:pointer}
#bdv .bdmsg{flex-basis:100%;font-size:13px;color:#ffb4a8}
#bdv .bdvb{display:flex;flex-direction:column;gap:12px}
#bdv .bdpic{display:block;width:100%;padding:0!important;border:1px solid var(--g-line,#2b2e33)!important;border-radius:14px!important;overflow:hidden;background:#0c0d11;cursor:zoom-in;line-height:0;box-shadow:0 20px 60px rgba(0,0,0,.5)}#bdv .bdpic img{display:block;width:100%;height:auto}
#bdv .bdload{padding:30px;text-align:center}
#bdv .bdbox{border:1px solid var(--g-line,#2b2e33);border-radius:14px;background:var(--g-panel,#16181d);overflow:hidden}
#bdv .bdbox>h3{margin:0;padding:12px 16px;font-size:12.5px;letter-spacing:.06em;color:#e6e7ea;border-bottom:1px solid var(--g-line,#2b2e33);text-transform:uppercase;font-weight:700}
#bdv .bdbb{padding:14px 16px 16px}#bdv .bdbb h4{margin:4px 0 8px;font-size:13px;color:#9aa0a8;font-weight:600}
#bdv .bdnotes{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14.5px;line-height:1.6;color:#d6d9de}
#bdv .bdsw{display:grid;grid-template-columns:1fr 1fr}#bdv .bdsw.one{grid-template-columns:1fr}#bdv .bdsw>div{padding:14px 16px}#bdv .bdsw .good{background:rgba(63,154,100,.1)}#bdv .bdsw .bad{background:rgba(166,75,75,.1)}#bdv .bdsw h4{margin:0 0 8px;font-size:15px}#bdv .bdsw .good h4{color:#5fd08a}#bdv .bdsw .bad h4{color:#ff7d8f}#bdv .bdsw p{margin:5px 0;font-size:14px;color:#dfe2e6}
#bdv .bdgi{display:flex;align-items:center;gap:12px;padding:6px 0}#bdv .bdti{display:inline-block;flex:none;border:2px solid #8a5fb0;border-radius:6px;overflow:hidden;background:linear-gradient(180deg,rgba(82,47,101,.9),#14161b)}#bdv .bdti img{width:100%;height:100%;display:block}#bdv .bdgt b{font-size:14px;color:#fff}
#bdv .bdaddpic{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border:1px dashed var(--g-line,#2b2e33);border-radius:12px;background:var(--g-panel,#16181d);font-size:13.5px;color:#cfd2d8}#bdv .bdaddpic span{flex:1 1 240px}
#bdv .bdedit .bdl{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;font-size:13px;color:#cfd2d8}#bdv .bdedit input,#bdv .bdedit textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;margin:0!important}
#bdv .bdchips{display:flex;flex-wrap:wrap;gap:6px}#bdv .bdchip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--g-line,#2b2e33);border-radius:999px;cursor:pointer;font-size:12.5px;user-select:none}#bdv .bdchip input{position:absolute;opacity:0;pointer-events:none}#bdv .bdchip.on{border-color:var(--g-accent,#e8b84a);color:#fff;background:color-mix(in srgb,var(--g-accent,#e8b84a) 18%,transparent)}#bdv .bdchip.gd.on{border-color:#3f9a64;background:rgba(63,154,100,.2)}#bdv .bdchip.bd.on{border-color:#a64b4b;background:rgba(166,75,75,.22)}#bdv .bdchip:focus-within{outline:2px solid var(--g-accent,#e8b84a);outline-offset:2px}
#bdv .bdbtns{display:flex;gap:8px}#bdv .bdbtns button{height:38px;padding:0 16px;border-radius:10px;cursor:pointer}
@media (max-width:640px){#bdv{padding:8px 6px 24px}#bdv .bdvh{padding:14px 50px 14px 14px}#bdv .bdht h2{font-size:21px}#bdv .bdsw{grid-template-columns:1fr}}
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
  const subName = (x) => (x.cls >= 0 && x.cls <= 2 && SUBN[x.cls][x.el] ? SUBN[x.cls][x.el] : String(x.sub || '').replace(/^Prismatic\s+(Titan|Hunter|Warlock)$/i, 'Prismatic'));
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

  // ---- one build, opened from the list as a pop-up: the loadout picture big, and under it how to play it (when written) and
  // strengths and weaknesses (when picked). Clicking outside it, the X, Escape or the browser's Back goes back to the list.
  const BDS = {
    STR: { abil: 'Strong abilities', melee: 'Infinite melee', gren: 'Grenade spam', super: 'Fast super', surv: 'Strong survivability', heal: 'Lots of healing', add: 'Strong ad-clear', boss: 'Strong boss damage', champ: 'Handles champions', close: 'Strong up close', long: 'Strong at range', buff: 'Constant buffs', team: 'Supports the team', easy: 'Easy to play' },
    WEAK: { boss: 'Weak vs bosses', long: 'Weak at range', close: 'Weak up close', add: 'Slow ad-clear', surv: 'Squishy', champ: 'Struggles with champions', hard: 'Hard to play', ammo: 'Ammo hungry', team: 'Needs a team', setup: 'Slow to set up' },
    STATS: ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'],
    STC: ['#9aa0a8', '#6fbf73', '#e0b64a', '#e8a53a', '#c77dff', '#5d9ce0'],
  };
  window.__gtBD = BDS;
  let OPEN = null, pushed = false;
  const ss = (v) => { try { if (v) sessionStorage.setItem('gt_bdopen', v); else sessionStorage.removeItem('gt_bdopen'); } catch (e) { /* not remembered */ } };
  function closeOpen(fromBack) {
    if (!OPEN) return; OPEN = null; ss('');
    ['bdv', 'bdlb'].forEach((id) => { const n = document.getElementById(id); if (n) n.remove(); });
    document.documentElement.classList.remove('bdv-open');
    if (pushed && !fromBack) { pushed = false; try { history.back(); } catch (e) { /* no history */ } }
    pushed = false;
  }
  window.addEventListener('popstate', () => { if (OPEN) closeOpen(true); });
  const tile = (q, sz) => { const u = img(q && q.i); return `<span class="bdti" style="width:${sz}px;height:${sz}px${q && q.x ? ';border-color:#ceae33;background:linear-gradient(180deg,rgba(206,174,51,.9),#14161b)' : ''}" title="${esc((q && q.n) || '')}">${u ? `<img src="${esc(u)}" alt="${esc((q && q.n) || '')}" loading="lazy">` : ''}</span>`; };
  function viewHTML(x) {
    const e = elOf(x.el), si = img(x.sum && x.sum.si), sw = x.sw || { s: [], w: [] };
    const ss2 = (sw.s || []).filter((k2) => BDS.STR[k2]), ww2 = (sw.w || []).filter((k2) => BDS.WEAK[k2]);
    const swb = ss2.length || ww2.length ? `<div class="bdbox bdswb"><h3>${ss2.length && ww2.length ? 'Strengths and weaknesses' : ss2.length ? 'Strengths' : 'Weaknesses'}</h3><div class="bdsw${ss2.length && ww2.length ? '' : ' one'}">${ss2.length ? `<div class="good">${ww2.length ? '<h4>Strengths</h4>' : ''}${ss2.map((k2) => `<p>✓ ${esc(BDS.STR[k2])}</p>`).join('')}</div>` : ''}${ww2.length ? `<div class="bad">${ss2.length ? '<h4>Weaknesses</h4>' : ''}${ww2.map((k2) => `<p>✕ ${esc(BDS.WEAK[k2])}</p>`).join('')}</div>` : ''}</div></div>` : '';
    const notes = x.notes ? `<div class="bdbox"><h3>How to play it</h3><div class="bdbb"><div class="bdnotes">${esc(x.notes)}</div></div></div>` : '';
    const it = (q) => `<div class="bdgi">${tile(q, 48)}<div class="bdgt"><b>${esc(q.n)}</b></div></div>`;
    const gear = x.sum && ((x.sum.w || []).length || (x.sum.a || []).length) ? `<div class="bdbox"><h3>Gear</h3><div class="bdbb">${(x.sum.w || []).length ? `<h4>Weapons</h4>${x.sum.w.map(it).join('')}` : ''}${(x.sum.a || []).length ? `<h4>Armor</h4>${x.sum.a.map(it).join('')}` : ''}</div></div>` : '';
    const canAdd = x.mine && window.__gtlo && window.__gtlo.buildPic && x.full && !x.img;
    const chip = (cls, on, attr, k2, label) => `<label class="bdchip${cls}${on ? ' on' : ''}"><input type="checkbox" ${attr}="${k2}"${on ? ' checked' : ''}>${label}</label>`;
    const edit = x.editing ? `<div class="bdbox bdedit"><h3>Edit build</h3><div class="bdbb">
<label class="bdl">Name<input id="bdetitle" maxlength="60" value="${esc(x.ed.title)}"></label>
<div class="bdl">Good for (up to 4)<div class="bdchips">${TAGS.map(([k2, l2]) => chip('', x.ed.tags.includes(k2), 'data-etag', k2, esc(l2))).join('')}</div></div>
<div class="bdl">Strengths (optional, up to 8)<div class="bdchips">${Object.entries(BDS.STR).map(([k2, l2]) => chip(' gd', x.ed.s.includes(k2), 'data-estr', k2, esc(l2))).join('')}</div></div>
<div class="bdl">Weaknesses (optional, up to 6)<div class="bdchips">${Object.entries(BDS.WEAK).map(([k2, l2]) => chip(' bd', x.ed.w.includes(k2), 'data-eweak', k2, esc(l2))).join('')}</div></div>
<label class="bdl">How to play it (optional)<textarea id="bdenotes" maxlength="1200" rows="6">${esc(x.ed.notes)}</textarea></label>
<div class="bdbtns"><button type="button" class="b" data-esave="1"${x.saving ? ' disabled' : ''}>${x.saving ? 'Saving...' : 'Save changes'}</button><button type="button" class="g" data-ecancel="1">Cancel</button></div></div></div>` : '';
    const pic = !x.full ? '<p class="mute bdload">Loading the build...</p>' : x.img ? `<button type="button" class="bdpic" data-bzoom="1" aria-label="Show the loadout picture full size"><img src="${esc(x.img)}" alt="The loadout: weapons, stats, armor, subclass and artifact"></button>` : gear || '<p class="mute">This build has no picture yet.</p>';
    return `<div class="bdvc" style="--el:${e[2]}">
<div class="bdvh"><div class="bdsi">${si ? `<img src="${esc(si)}" alt="">` : ''}</div><div class="bdht"><small>${esc([CL[x.cls], subName(x)].filter(Boolean).join(' · '))}</small><h2>${esc(x.title)}</h2>${x.tags.length ? `<div class="bdtags">${x.tags.map((t) => `<em>${esc(TAGN[t] || t)}</em>`).join('')}</div>` : ''}<div class="bdby">by ${esc(x.by)} · shared ${esc(new Date(x.at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }))}</div></div><button type="button" class="bdx g" data-bx="1" aria-label="Close and go back to the builds">&times;</button>
<div class="bdha">${votes(x, true)}<span class="bdu">${x.uses} import${x.uses === 1 ? '' : 's'}</span><button type="button" class="b bdimp" data-imp="${esc(x.id)}">Import to my loadouts</button>${x.mine || x.mod === 2 ? `<button type="button" class="g" data-bedit="1"${x.mine ? '' : ` title="Change ${esc(x.by)}'s build (founders and the owner can)"`}>Edit</button>` : ''}${x.mine && x.img && x.full && window.__gtlo && window.__gtlo.buildPic ? `<button type="button" class="g" data-bpic="1" title="Make the picture again from your gear, with the stats in the game's order"${x.picBusy ? ' disabled' : ''}>${x.picBusy ? 'Making it...' : 'Remake picture'}</button>` : ''}${x.mine || x.mod ? `<button type="button" class="g" data-bdel="${esc(x.id)}">${x.mine || x.mod === 2 ? 'Delete' : 'Take down'}</button>` : ''}${x.msg ? `<div class="bdmsg">${esc(x.msg)}</div>` : ''}</div></div>
${canAdd ? `<div class="bdaddpic"><span>This build has no picture yet. Make one from your gear.</span><button type="button" class="b" data-bpic="1"${x.picBusy ? ' disabled' : ''}>${x.picBusy ? 'Making it...' : 'Add picture'}</button></div>` : ''}
${edit}<div class="bdvb">${pic}${notes}${swb}</div></div>`;
  }
  function drawOpen() {
    if (!OPEN) return; let m = document.getElementById('bdv');
    if (!m) { m = document.createElement('div'); m.id = 'bdv'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); m.addEventListener('click', viewClick); m.addEventListener('change', editChange); document.documentElement.classList.add('bdv-open'); }
    m.setAttribute('aria-label', OPEN.title || 'Build');
    const ae = document.activeElement, fid = ae && ae.id && m.contains(ae) ? ae.id : '', top = (m.querySelector('.bdvc') || {}).scrollTop || m.scrollTop;
    m.innerHTML = viewHTML(OPEN); m.scrollTop = top;
    if (fid) { const i = document.getElementById(fid); if (i) { i.focus({ preventScroll: true }); if (i.setSelectionRange && typeof i.value === 'string') i.setSelectionRange(i.value.length, i.value.length); } } else if (!m.contains(document.activeElement)) { const x = m.querySelector('[data-bx]'); if (x) x.focus({ preventScroll: true }); }
  }
  async function open(id) {
    const x = byId(id) || { id, title: 'Build', cls: 3, el: '', sub: '', tags: [], sum: {}, at: Date.now(), likes: 0, dislikes: 0, uses: 0, by: '' };
    OPEN = { ...x, notes: '', full: false, msg: '' }; ss(id);
    if (!pushed) { try { history.pushState({ bdv: id }, ''); pushed = true; } catch (e) { /* Back just leaves the page */ } }
    drawOpen();
    try { const full = await gt.bdGet({ id }); if (OPEN && OPEN.id === id) { Object.assign(OPEN, full, { full: true }); drawOpen(); } }
    catch (er) { if (OPEN && OPEN.id === id) { OPEN.msg = clean(er); OPEN.full = true; drawOpen(); } }
  }
  function lightbox(src) {
    let lb = document.getElementById('bdlb'); if (lb) lb.remove();
    lb = document.createElement('div'); lb.id = 'bdlb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Loadout picture');
    lb.innerHTML = `<button type="button" class="g" aria-label="Close">&times;</button><img src="${esc(src)}" alt="The loadout picture">`;
    lb.onclick = () => lb.remove(); document.body.appendChild(lb);
  }
  async function viewClick(e) {
    if (!OPEN) return; const t = e.target;
    if (t.id === 'bdv' || t.closest('[data-bx]')) { closeOpen(); return; }
    const v = t.closest('[data-bv]'); if (v) { vote(v.dataset.id, +v.dataset.bv, v); return; }
    const im = t.closest('[data-imp]'); if (im) { const id = im.dataset.imp; closeOpen(); imp(id); return; }
    if (t.closest('[data-bzoom]') && OPEN.img) { lightbox(OPEN.img); return; }
    if (t.closest('[data-bedit]')) { const sw = OPEN.sw || { s: [], w: [], p: [] }; OPEN.editing = true; OPEN.ed = { title: OPEN.title, notes: OPEN.notes || '', tags: OPEN.tags.slice(), s: (sw.s || []).slice(), w: (sw.w || []).slice(), p: (sw.p || []).slice() }; drawOpen(); return; }
    if (t.closest('[data-ecancel]')) { OPEN.editing = false; drawOpen(); return; }
    if (t.closest('[data-esave]') && OPEN.ed) {
      const o = OPEN, ti = document.getElementById('bdetitle'), no = document.getElementById('bdenotes'); o.ed.title = ti ? ti.value : o.ed.title; o.ed.notes = no ? no.value : o.ed.notes;
      o.saving = true; o.msg = ''; drawOpen();
      try { await gt.bdEdit({ id: o.id, title: o.ed.title.trim(), notes: o.ed.notes.trim(), tags: o.ed.tags, str: o.ed.s, weak: o.ed.w, prio: o.ed.p }); Object.assign(o, { title: o.ed.title.trim(), notes: o.ed.notes.trim(), tags: o.ed.tags, sw: { s: o.ed.s, w: o.ed.w, p: o.ed.p }, editing: false }); const li = byId(o.id); if (li) { Object.assign(li, { title: o.title, tags: o.tags }); draw(); } }
      catch (er) { o.msg = clean(er); }
      o.saving = false; if (OPEN === o) drawOpen(); return;
    }
    if (t.closest('[data-bpic]') && !OPEN.picBusy) {
      const o = OPEN; o.picBusy = true; o.msg = ''; drawOpen();
      try {
        const bp = await window.__gtlo.buildPic(o.code, o.title);
        if (!bp || !bp.img) throw new Error('The picture could not be made. Open the Loadouts tab once so your gear is loaded, then try again.');
        await gt.bdPic({ id: o.id, img: bp.img, info: bp.info || undefined }); o.img = bp.img;
      } catch (er) { o.msg = clean(er); }
      o.picBusy = false; if (OPEN === o) drawOpen(); return;
    }
    if (t.closest('[data-bdel]')) {
      if (!OPEN.sure) { OPEN.sure = true; OPEN.msg = 'Click again to ' + (OPEN.mine ? 'delete it for good.' : OPEN.mod === 2 ? 'delete ' + OPEN.by + "'s build for good." : 'take it down.'); drawOpen(); return; }
      try { const id = OPEN.id; await gt.bdDel({ id }); st.list = st.list.filter((x) => x.id !== id); closeOpen(); draw(); } catch (er) { OPEN.msg = clean(er); drawOpen(); }
    }
  }
  function editChange(e) {
    if (!OPEN || !OPEN.editing) return false; const ds = e.target.dataset || {};
    const key = ds.etag ? 'tags' : ds.estr ? 's' : ds.eweak ? 'w' : ''; if (!key) return false;
    const val = ds.etag || ds.estr || ds.eweak, max = { tags: 4, s: 8, w: 6 }[key];
    const ti = document.getElementById('bdetitle'), no = document.getElementById('bdenotes'); if (ti) OPEN.ed.title = ti.value; if (no) OPEN.ed.notes = no.value;
    if (e.target.checked) { if (OPEN.ed[key].length >= max) { e.target.checked = false; OPEN.msg = 'Pick up to ' + max + '.'; drawOpen(); return true; } OPEN.ed[key].push(val); } else OPEN.ed[key] = OPEN.ed[key].filter((v) => v !== val);
    OPEN.msg = ''; drawOpen(); return true;
  }
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; const lb = document.getElementById('bdlb'); if (lb) { lb.remove(); return; } if (OPEN && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) closeOpen(); });
  new MutationObserver(() => { if (OPEN && document.documentElement.dataset.gsec !== 'builds') closeOpen(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-gsec'] });

  // ---- the tab's own controls ----
  s.addEventListener('click', (e) => {
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
  s.addEventListener('change', (e) => { if (e.target.id === 'bdtag') { st.tag = e.target.value; load(); } else if (e.target.id === 'bdsort') { st.sort = e.target.value; load(); } });
  let qt = 0; s.addEventListener('input', (e) => { if (e.target.id === 'bdq') { st.q = e.target.value; clearTimeout(qt); qt = setTimeout(() => load(), 300); } });

  window.__gtBuilds = { refresh: () => { if (st.loaded) load(); } };
  // A refresh while a build was open opens it again.
  { let id0 = ''; try { id0 = window.__gtReload ? sessionStorage.getItem('gt_bdopen') || '' : ''; if (!window.__gtReload) sessionStorage.removeItem('gt_bdopen'); } catch (e) { /* none */ } if (/^[A-Za-z0-9]{8,12}$/.test(id0)) setTimeout(() => open(id0), 0); }
  new MutationObserver(() => { if (s.classList.contains('on') && !st.loaded && !st.busy) load(); }).observe(s, { attributes: true, attributeFilter: ['class'] });
  if (s.classList.contains('on')) load(); else draw();
})();
