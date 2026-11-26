// Finder tab (like destiny.report): look up any weapon in the game to see every perk it can actually roll today, column by
// column, or look up a perk to see every weapon that can roll it. Same look as the God rolls tab (cards, then a weapon view).
// The data comes from main.js (fd:find, fd:weapon, fd:perk), which reads the game's own perk pools from the item data.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt || !window.gt.fdFind) return;
  const gt = window.gt;
  const V = () => window.__gtv || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (p) => (/^\/[\w./%-]{1,300}$/.test(String(p || '')) ? 'https://www.bungie.net' + p : '');
  const clean = (e) => String((e && e.message) || e || 'unknown error').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').slice(0, 220);
  const ELEM = { 1: ['Kinetic', '#d8dde4'], 2: ['Arc', '#7bd0ff'], 3: ['Solar', '#ff9a3c'], 4: ['Void', '#b98cff'], 6: ['Stasis', '#6fa8ff'], 7: ['Strand', '#4ee08c'] };
  const AMMO = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
  const RCOL = (r) => (/exotic/i.test(r) ? '#e8c25a' : '#b07cff');
  // "How to get": one or two short lines, no filler. Bungie's Collections line (cleaned up), the harder version an Adept
  // (Timelost, Harrowed) copy needs, and for exotic quests the quest's name plus what has to be done before it opens.
  // EXQ: exotic quest/mission weapons -> [quest or mission, what is needed first]. Bungie's own line for these only says
  // "An Exotic quest or challenge", so it is replaced. Campaign requirements are listed only where known for sure.
  const EXQ = {
    'xenophage': ['Exotic quest "The Journey"', 'Finish the Shadowkeep campaign first.'],
    'the lament': ['Exotic quest "Lost Lament" from Banshee-44 in the Tower', 'Finish the Beyond Light campaign first.'],
    'deathbringer': ['Exotic quest "Symphony of Death"', 'Needs Shadowkeep.'],
    'divinity': ['Exotic quest "Divine Fragmentation" (Garden of Salvation raid)', 'Needs Shadowkeep.'],
    'salvation\'s grip': ['Exotic quest "The Stasis Prototype"', 'Needs Beyond Light.'],
    'the chaperone': ['Exotic quest "Tex Mechanica Tournament"', 'Needs Beyond Light.'],
    'dead man\'s tale': ['Exotic mission "Presage"', 'Needs Beyond Light.'],
    'parasite': ['Exotic quest "Of Queens and Worms"', 'Needs The Witch Queen.'],
    'dead messenger': ['Exotic mission "Vox Obscura"', 'Needs The Witch Queen.'],
    'revision zero': ['Exotic mission "Operation: Seraph\'s Shield"', 'Needs The Witch Queen.'],
    'deterministic chaos': ['Exotic quest "Unfinished Business"', 'Needs Lightfall.'],
    'winterbite': ['Exotic quest "Strider"', 'Needs Lightfall.'],
    'final warning': ['Exotic quest "The Final Strand"', 'Needs Lightfall.'],
    'wish-keeper': ['Exotic mission "Starcrossed"', 'Needs Lightfall.'],
    'arbalest': ['Exotic quest "Another Last City"', 'Needs Lightfall.'],
    'ergo sum': ['Exotic quest "Hope"', 'Needs The Final Shape.'],
    'still hunt': ['Exotic quest "Wild Card"', 'Needs The Final Shape.'],
    'choir of one': ['Exotic mission "Encore"', ''],
    'slayer\'s fang': ['Exotic mission "Kell\'s Fall"', ''],
    'barrow-dyad': ['Exotic quest "Derealize"', ''],
    'wolfsbane': ['Exotic quest "Heliostat"', 'Needs The Edge of Fate.'],
    'praxic blade': ['Exotic quest "Fire and Ice"', 'Needs Renegades.'],
    'wish-ender': ['Exotic quest "Hunter\'s Remembrance"', 'Needs Forsaken.'],
    'gjallarhorn': ['Exotic mission "And Out Fly the Wolves"', 'Needs the 30th Anniversary Pack.'],
    'cull\'s shadow': ['Exotic quest "Oblation: Bloodline"', ''],
    'necrochasm': ['Exotic quest "Bottomless Pit"', ''],
    'wicked implement': ['Exotic quest "Whetstone"', ''],
    'heir apparent': ['Exotic quest "Top of Class"', ''],
    'riskrunner': ['Exotic quest "A Spark of Hope"', ''],
    'malfeasance': ['Exotic quest "Darkness in the Light"', ''],
    'sweet business': ['Exotic quest "The Queen Beckons"', ''],
    'forerunner': ['Exotic quest "Magnum Opus"', ''],
    'outbreak perfected': ['Exotic mission "Zero Hour"', ''],
    'whisper of the worm': ['Exotic mission "The Whisper"', ''],
  };
  const tidySrc = (t) => t.replace(/\s+/g, ' ').replace(/"([^"]+)"\s+Raid\b/g, '"$1" raid').replace(/"([^"]+)"\s+Dungeon\b/g, '"$1" dungeon').replace(/^(Complete|Completing) /i, '').replace(/[.\s]+$/, '');
  // When Bungie gives no source, the origin trait often tells where a weapon drops (these are the ones known for sure).
  const ORIGIN = [[/vanguard/i, 'Vanguard Ops (strikes)'], [/^skulking wolf$/i, 'Iron Banner'], [/^alacrity$/i, 'Trials of Osiris'], [/^nadir focus$/i, 'Gambit'], [/crucible/i, 'Crucible']];
  const GONE = /no longer (?:available|obtainable|drops|be obtained)|not currently (?:available|obtainable)|cannot be (?:earned|obtained)\b|retired|sunset/i;
  const isOld = (d) => !!(d.versions && d.versions.length > 1 && d.versions[0].h !== d.h);
  function howTo(d) {
    // "Random Perks: This item cannot be reacquired from Collections." says nothing about where it drops, so it is dropped
    const raw = String(d.src || '').replace(/^source:\s*/i, '').replace(/^random perks:\s*/i, '').replace(/this item cannot be reacquired from (?:the )?collections\.?/i, '').trim(), name = String(d.n || '').trim();
    const base = name.replace(/\s*\((adept|timelost|harrowed)\)\s*$/i, '').toLowerCase();
    const q = EXQ[base];
    if (q && !isOld(d)) return { t: q[0] + '.', pre: q[1] };
    if (GONE.test(raw) || isOld(d)) return { t: 'No longer drops.', pre: isOld(d) ? 'The newest version does: pick Newest above.' : '', gone: 1 };
    if (!raw) {
      const oc = (d.cols || []).find((c) => /origin/i.test(c.label || '')), on = oc && oc.opts && oc.opts[0] ? oc.opts[0].n : '', hit = on && ORIGIN.find(([re]) => re.test(on));
      return hit ? { t: hit[1] + '.', pre: `Going by its ${on} origin trait.` } : null;
    }
    let t = tidySrc(raw);
    // Adept (and the older Timelost / Harrowed) copies come from the hardest version of the activity
    if (/\((adept|timelost|harrowed)\)\s*$/i.test(name)) {
      if (/trials/i.test(t)) t = 'Trials of Osiris: go Flawless (the Lighthouse)';
      else if (/nightfall|grandmaster/i.test(t)) t = 'Grandmaster Nightfalls';
      else if (/raid|dungeon/i.test(t)) t += ', on Master difficulty';
      else t += ' (the hardest version, like Master)';
    }
    return { t: t + '.', pre: '', how: howDo(t, /\((adept|timelost|harrowed)\)\s*$/i.test(name)) };
  }
  // What to actually do there, one short sentence (only for activity types where it is the same for every weapon)
  function howDo(t, adept) {
    if (/\braid\b/i.test(t)) return adept ? 'Adept copies only drop there: finish its encounters on Master (the weekly featured raid can drop it more often).' : 'It drops in that raid: finish its encounters (the weekly featured raid can drop it more often).';
    if (/\bdungeon\b/i.test(t)) return adept ? 'Adept copies only drop there: finish its encounters on Master (the weekly featured dungeon can drop it more often).' : 'It drops in that dungeon: finish its encounters (the weekly featured dungeon can drop it more often).';
    if (/trials/i.test(t)) return adept ? 'Win seven matches on one card without a loss, then open the chest at the Lighthouse.' : 'Win Trials matches and rank up with Saint-14 in the Tower.';
    if (/grandmaster/i.test(t)) return 'Finish Grandmaster Nightfalls while this is the weekly Nightfall weapon.';
    if (/nightfall/i.test(t)) return 'Finish Nightfall strikes while this is the weekly Nightfall weapon.';
    if (/iron banner/i.test(t)) return 'Play Iron Banner matches while it is on and rank up with Saladin.';
    if (/gambit/i.test(t)) return 'Play Gambit matches and rank up with the Drifter.';
    if (/crucible/i.test(t)) return 'Play Crucible matches and rank up with Lord Shaxx.';
    if (/vanguard|strike/i.test(t)) return 'Play Vanguard Ops and rank up with Zavala.';
    if (/exotic engram|xûr|xur/i.test(t)) return 'Open Exotic engrams, or check what Xûr is selling this weekend.';
    return '';
  }
  const SUGGEST = ['Rampage', 'Kill Clip', 'Incandescent', 'Repulsor Brace', 'Chill Clip', 'Bait and Switch', 'Destabilizing Rounds', 'Hand Cannon'];

  const s = document.createElement('section'); s.id = 'finder'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Finder'; b.dataset.t = 'finder';
  const after = nav.querySelector('[data-t=wishmaker]') || nav.querySelector('[data-t=godrolls]'); nav.insertBefore(b, after ? after.nextSibling : null);
  b.onclick = () => { window.show('finder'); };

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="finder"] main > #finder{max-width:none!important;margin:0!important;zoom:1!important;padding:12px 16px 28px}
#finder{color:#e6e7ea}
#finder .fdw{max-width:1280px;margin:0 auto 32px}
#finder .fdh{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:14px;padding:22px 24px;border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:radial-gradient(70% 140% at 100% 0,color-mix(in srgb,#5ec8e5 14%,transparent),transparent 60%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0)),var(--g-panel,#16181c)}
#finder .fdh h2{margin:0 0 4px!important;padding:0!important;border:0!important;font-size:30px;line-height:1.1;color:#fff;letter-spacing:-.01em;text-transform:none}
#finder .fdh p{margin:0;color:#aeb4bd;font-size:14px;max-width:70ch}
#finder .fdq{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#finder .fdq input{flex:1 1 320px;min-width:0;height:44px;margin:0!important;font-size:15px;border-radius:12px!important;padding:0 14px!important;box-sizing:border-box}
#finder .fdm{display:inline-flex;border:1px solid var(--g-line,#2b2e33);border-radius:12px;overflow:hidden}
#finder .fdm button{border:0!important;border-radius:0!important;padding:0 14px!important;height:42px;font-size:13.5px;font-weight:600;letter-spacing:0!important;text-transform:none!important;background:transparent!important;color:#aeb4bd!important}
#finder .fdm button.on{background:color-mix(in srgb,#5ec8e5 18%,transparent)!important;color:#fff!important}
#finder .fdsug{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:#8b929c}
#finder .fdsug button{border-radius:999px!important;padding:4px 12px!important;font-size:12.5px;letter-spacing:0!important;text-transform:none!important}
#finder h3.fdt{margin:22px 2px 10px!important;padding:0!important;border:0!important;font-size:15px;font-weight:700;color:#cfd5de;text-transform:none;letter-spacing:0}
#finder h3.fdt small{font-weight:500;color:#8b929c;margin-left:6px}
#finder .fdgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
#finder .fdc{--gc:#b07cff;position:relative;display:flex;flex-direction:column;gap:10px;padding:14px 16px 15px;border-radius:16px;border:1px solid var(--g-line,#2b2e33);background:radial-gradient(90% 70% at 100% 0,color-mix(in srgb,var(--gc) 12%,transparent),transparent 65%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0)),var(--g-panel,#16181c);cursor:pointer;text-align:left;color:inherit;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease}
#finder .fdc:hover,#finder .fdc:focus-visible{transform:translateY(-2px);border-color:color-mix(in srgb,var(--gc) 55%,var(--g-line,#2b2e33));box-shadow:0 10px 26px rgba(0,0,0,.35);outline:none}
#finder .fdct{display:flex;gap:12px;align-items:center}
#finder .fdic{position:relative;flex:none;width:56px;height:56px;border-radius:6px;overflow:hidden;border:2px solid var(--gc);background:#0d0f13}
#finder .fdic img{width:100%;height:100%;display:block}
#finder .fdic img.wm{position:absolute;inset:0}
#finder .fdn{min-width:0}
#finder .fdn b{display:block;font-size:17px;color:#fff;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#finder .fdn small{display:block;margin-top:2px;color:#9aa1ab;font-size:12.5px}
#finder .fdn small i{font-style:normal;margin:0 5px;opacity:.6}
#finder .fdtags{display:flex;flex-wrap:wrap;gap:6px}
#finder .fdtag{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:#cfd3da;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
#finder .fdtag.col{color:#35e3cf;border-color:color-mix(in srgb,#35e3cf 40%,transparent);background:color-mix(in srgb,#35e3cf 10%,transparent)}
#finder .fdtag.old{color:#ffd27a;border-color:color-mix(in srgb,#ffd27a 40%,transparent);background:color-mix(in srgb,#ffd27a 9%,transparent)}
#finder .fdtag.gone,#fdm .tag.gone{color:#ff9b93;border-color:color-mix(in srgb,#ff6b5e 45%,transparent);background:color-mix(in srgb,#ff6b5e 11%,transparent)}
#finder .fdtag.own{color:#9fe0a8;border-color:color-mix(in srgb,#5fd38a 40%,transparent);background:color-mix(in srgb,#5fd38a 9%,transparent)}
#finder .fdp{--gc:#5ec8e5}
#finder .fdp .fdic{border-radius:50%;border-width:1px;border-color:rgba(255,255,255,.18)}
#finder .fdp p{margin:0;font-size:12.5px;line-height:1.45;color:#9aa1ab;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
#finder .fdempty{padding:40px 20px;text-align:center;color:#9aa1ab;border:1px dashed var(--g-line,#2b2e33);border-radius:16px;margin-top:18px}
#finder .fdback{display:inline-flex;align-items:center;gap:6px;margin:16px 0 0;border-radius:10px!important;padding:6px 12px!important;font-size:13px;letter-spacing:0!important;text-transform:none!important}
#finder .fdph{display:flex;gap:16px;align-items:flex-start;margin-top:14px;padding:18px 20px;border-radius:16px;border:1px solid color-mix(in srgb,#5ec8e5 40%,var(--g-line,#2b2e33));background:radial-gradient(70% 120% at 100% 0,color-mix(in srgb,#5ec8e5 14%,transparent),transparent 60%),var(--g-panel,#16181c)}
#finder .fdph img{width:64px;height:64px;border-radius:50%;flex:none;background:#0d0f13;border:1px solid rgba(255,255,255,.18)}
#finder .fdph h3{margin:0!important;padding:0!important;border:0!important;font-size:24px;color:#fff;text-transform:none;letter-spacing:0}
#finder .fdph small{display:block;color:#8fd9ea;font-size:12.5px;font-weight:700;margin:2px 0 6px}
#finder .fdph p{margin:0;color:#c3c9d2;font-size:14px;line-height:1.5;max-width:80ch}
#finder .fdfl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 0}
#finder .fdfl select{width:auto!important;min-height:40px;height:auto!important;margin:0!important;padding:6px 32px 6px 12px!important;line-height:1.3;box-sizing:border-box}#finder .fdfl input{margin:0!important}
#finder .fdfl label{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#aeb4bd;white-space:nowrap;cursor:pointer}#finder .fdfl label input{width:16px!important;height:16px!important;min-width:0!important;flex:none;padding:0!important}
#finder .fdl{padding:30px;text-align:center;color:#9aa1ab}
#fdm{position:fixed;inset:0;z-index:70;background:rgba(4,6,10,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:calc(max(24px,4vh) + var(--gt-sat,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px));overflow:auto}
#fdm .fvp{--gc:#b07cff;position:relative;width:min(1080px,100%);border-radius:20px;border:1px solid color-mix(in srgb,var(--gc) 40%,var(--g-line,#2b2e33));background:radial-gradient(70% 60% at 100% 0,color-mix(in srgb,var(--gc) 14%,transparent),transparent 65%),linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0) 30%),var(--g-panel,#15171b);box-shadow:0 30px 80px rgba(0,0,0,.6);padding:20px 22px 22px;color:#e8ecf2}
#fdm.enter .fvp{animation:fdIn .18s ease-out}
@keyframes fdIn{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
#fdm button{letter-spacing:0!important;text-transform:none!important;font-family:inherit}
#fdm .fvh{display:flex;gap:16px;align-items:center}
#fdm .fvh .fdic{position:relative;flex:none;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid var(--gc);background:#0d0f13}
#fdm .fvh .fdic img{width:100%;height:100%;display:block}
#fdm .fvh .fdic img.wm{position:absolute;inset:0}
#fdm .fvn{flex:1;min-width:0}
#fdm .fvn h3{margin:0;font-size:24px;line-height:1.15;color:#fff;font-weight:800;text-transform:none;border:0;padding:0;letter-spacing:.01em}
#fdm .fvn small{display:block;margin:3px 0 8px;color:#a3aab4;font-size:13px}
#fdm .fvn small i{font-style:normal;margin:0 5px;opacity:.6}
#fdm .fvb{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#fdm .pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--gc);background:color-mix(in srgb,var(--gc) 16%,transparent);border:1px solid color-mix(in srgb,var(--gc) 45%,transparent)}
#fdm .tag{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#cfd5de;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#fdm .tag img{width:16px;height:16px}
#fdm .fvx{align-self:flex-start;flex:none;width:38px;height:38px;border-radius:12px;padding:0!important;font-size:16px}
#fdm .fvv{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:14px 0 0;font-size:12.5px;color:#9aa1ab}
#fdm .fvv button{display:inline-flex;align-items:center;gap:6px;border-radius:10px!important;padding:4px 10px!important;font-size:12.5px;min-height:30px}
#fdm .fvv button img{width:18px;height:18px;border-radius:3px}
#fdm .fvv button.on{border-color:var(--gc)!important;background:color-mix(in srgb,var(--gc) 14%,transparent)!important;color:#fff!important}
#fdm .fvfr{margin:14px 0 0;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid var(--g-line,#2b2e33);border-left:3px solid var(--gc);font-size:13.5px;line-height:1.5;color:#cdd3dc}
#fdm .fvfr b{color:#fff}
#fdm .fvget{margin-top:14px}
#fdm .fvcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px;margin:16px 0 0}
#fdm .fvc{min-width:0;display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:14px;background:rgba(0,0,0,.18);border:1px solid var(--g-line,#2b2e33)}
#fdm .fvc h5{margin:0 0 2px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9aa1ab}
#fdm .fvc h5 small{font-weight:600;letter-spacing:0;text-transform:none;color:#6f7782;margin-left:4px}
#fdm .fvos{display:flex;flex-direction:column;gap:5px}
#fdm .fvo{display:flex;align-items:center;gap:9px;width:100%;min-height:40px;padding:5px 8px!important;border-radius:10px!important;border:1px solid transparent!important;background:rgba(255,255,255,.03)!important;color:#dfe4ea!important;text-align:left;font-size:13.5px;font-weight:600;cursor:pointer}
#fdm .fvo:hover{background:rgba(255,255,255,.07)!important}
#fdm .fvo img{width:30px;height:30px;border-radius:50%;flex:none;background:#0d0f13;border:1px solid rgba(255,255,255,.14)}
#fdm .fvo span{flex:1;min-width:0;line-height:1.2;overflow-wrap:break-word;word-break:normal;hyphens:auto}
#fdm .fvo.on{border-color:color-mix(in srgb,var(--gc) 55%,transparent)!important;background:color-mix(in srgb,var(--gc) 10%,transparent)!important;color:#fff!important}
#fdm .fvo.hl{border-color:#35e3cf!important;background:color-mix(in srgb,#35e3cf 9%,transparent)!important}
#fdm .fvget .fvpre{color:#cfd5de;font-weight:600}#fdm .fvget .fvhow{color:#b9c0ca}#fdm .fvd{overflow-wrap:anywhere;margin:4px 2px 0;font-size:12.5px;line-height:1.45;color:#a3aab4}
#fdm .fvd a{display:inline-block;margin-top:6px;color:#8fd9ea;font-weight:600;cursor:pointer;text-decoration:none}
#fdm .fvd a:hover{text-decoration:underline}
#fdm .fva{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:16px 0 0}
#fdm .fva button{border-radius:12px!important;padding:9px 16px!important;font-weight:700;font-size:14px}
#fdm .fvhint{margin:12px 2px 0;font-size:12.5px;color:#8b929c}
#fdm .fdl{padding:28px;text-align:center;color:#a3aab4}
@media (max-width:760px){#finder .fdgrid{grid-template-columns:1fr}#finder .fdh{padding:18px 16px}#finder .fdh h2{font-size:24px}}
@media (max-width:560px){#fdm{padding:0;z-index:9200}#fdm .fvp{border-radius:0;min-height:100%;padding:calc(var(--gt-sat,0px) + 16px) 14px calc(28px + env(safe-area-inset-bottom,0px));border-left:0;border-right:0}#fdm .fvh{padding-right:50px}#fdm .fvx{position:fixed!important;top:calc(var(--gt-sat,0px) + 10px)!important;right:12px!important;z-index:3;width:44px;height:44px;background:rgba(20,22,28,.92)!important;box-shadow:0 4px 14px rgba(0,0,0,.5)}#fdm .fvh .fdic{width:56px;height:56px}#fdm .fvn h3{font-size:20px}#fdm .fvcols{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}#fdm .fvc{padding:9px}#fdm .fvo{font-size:12.5px;min-height:38px}#fdm .fvo img{width:26px;height:26px}}
@media (prefers-reduced-motion:reduce){#finder .fdc,#fdm.enter .fvp{transition:none;animation:none}}
`;
  document.head.appendChild(css);

  const st = { q: '', mode: 'all', res: null, busy: 0, err: '', perk: null, pbusy: 0, ptype: '', pnew: 0, wv: null };
  let qT = 0, seq = 0;

  // how many copies of a weapon (any of its versions) you have
  const owned = (hs) => { try { const D = V().D && V().D(); if (!D || !D.items) return 0; const set = new Set((hs || []).map(Number)); return D.items.filter((x) => set.has(Number(x.h))).length; } catch (e) { return 0; } };
  const elem = (e) => (ELEM[e] ? `<span style="color:${ELEM[e][1]}">${ELEM[e][0]}</span>` : '');
  const icon = (w) => `<span class="fdic">${img(w.i) ? `<img src="${esc(img(w.i))}" alt="" loading="lazy">` : ''}${img(w.wm) ? `<img class="wm" src="${esc(img(w.wm))}" alt="" loading="lazy">` : ''}</span>`;
  const sub = (w) => [esc(w.t), elem(w.e), AMMO[w.am] ? esc(AMMO[w.am]) : ''].filter(Boolean).join('<i>·</i>');
  const wCard = (w, extra) => {
    const n = owned(w.hs);
    return `<button type="button" class="fdc" style="--gc:${RCOL(w.r)}" data-fw="${w.h}" data-hs="${esc((w.hs || []).join(','))}">
<div class="fdct">${icon(w)}<div class="fdn"><b>${esc(w.n)}</b><small>${sub(w)}</small></div></div>
<div class="fdtags">${w.fr ? `<span class="fdtag">${esc(w.fr)}</span>` : ''}${w.gone ? '<span class="fdtag gone">No longer drops</span>' : ''}${extra || ''}${n ? `<span class="fdtag own">You have ${n}</span>` : ''}</div></button>`;
  };
  const pCard = (p) => `<button type="button" class="fdc fdp" data-fp="${esc(p.n)}">
<div class="fdct"><span class="fdic">${img(p.i) ? `<img src="${esc(img(p.i))}" alt="" loading="lazy">` : ''}</span><div class="fdn"><b>${esc(p.n)}</b><small>${esc(p.kind)}<i>·</i>on ${p.cnt} weapon${p.cnt === 1 ? '' : 's'}</small></div></div>
${p.d ? `<p>${esc(p.d)}</p>` : ''}</button>`;

  function head() {
    return `<div class="fdh"><div><h2>Finder</h2><p>Look up any weapon to see every perk it can roll today, column by column. Or look up a perk to see every weapon that can roll it. Perks that no longer drop are left out.</p></div>
<div class="fdq"><input id="fdq" type="search" placeholder="Search a weapon, perk or frame (for example Rampage, Fatebringer, lightweight hand cannon)" value="${esc(st.q)}" autocomplete="off" spellcheck="false" aria-label="Search weapons, perks and frames">
<div class="fdm" role="tablist">${[['all', 'All'], ['weapons', 'Weapons'], ['perks', 'Perks']].map(([k, l]) => `<button type="button" data-fm="${k}" class="${st.mode === k ? 'on' : ''}" role="tab" aria-selected="${st.mode === k}">${l}</button>`).join('')}</div></div>
${!st.q && !st.perk ? `<div class="fdsug">Try: ${SUGGEST.map((t) => `<button type="button" data-fs="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}</div>`;
  }
  function results() {
    if (st.err) return `<div class="fdempty">${esc(st.err)}</div>`;
    if (st.q.trim().length < 2) return `<div class="fdempty">Type at least two letters of a weapon or perk name.</div>`;
    if (!st.res) return '<div class="fdl">Searching…</div>';
    const { weapons, perks } = st.res, sw = st.mode !== 'perks', sp = st.mode !== 'weapons';
    let h = '';
    if (sp && perks.length) h += `<h3 class="fdt">Perks<small>${perks.length}${perks.length >= 40 ? '+' : ''}</small></h3><div class="fdgrid">${perks.map(pCard).join('')}</div>`;
    if (sw && weapons.length) h += `<h3 class="fdt">Weapons<small>${weapons.length}${weapons.length >= 80 ? '+' : ''}</small></h3><div class="fdgrid">${weapons.map((w) => wCard(w)).join('')}</div>`;
    return h || `<div class="fdempty">Nothing matches "${esc(st.q)}"${st.mode !== 'all' ? ' in ' + st.mode : ''}. Check the spelling, or try fewer words.</div>`;
  }
  function perkPage() {
    const p = st.perk;
    if (st.pbusy || !p) return '<div class="fdl">Finding every weapon that can roll it…</div>';
    if (p.err) return `<div class="fdempty">${esc(p.err)}</div>`;
    const types = [...new Set(p.weapons.map((w) => w.t))].sort();
    const list = p.weapons.filter((w) => (!st.ptype || w.t === st.ptype) && (!st.pnew || w.newest));
    return `<div class="fdph">${img(p.i) ? `<img src="${esc(img(p.i))}" alt="">` : ''}<div><h3>${esc(p.n)}</h3><small>${esc(p.kind)} · on ${p.weapons.length} weapon${p.weapons.length === 1 ? '' : 's'}</small>${p.d ? `<p>${esc(p.d)}</p>` : ''}</div></div>
<div class="fdfl"><select id="fdpt" aria-label="Weapon type"><option value="">Every weapon type</option>${types.map((t) => `<option ${t === st.ptype ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
<label><input type="checkbox" id="fdpn" ${st.pnew ? 'checked' : ''}> Only the newest version of each weapon</label></div>
<h3 class="fdt">Weapons that can roll ${esc(p.n)}<small>${list.length}</small></h3>
${list.length ? `<div class="fdgrid">${list.map((w) => wCard(w, `${w.col ? `<span class="fdtag col">${esc(w.col)}</span>` : ''}${w.newest ? '' : '<span class="fdtag old" title="Only an older version of this weapon rolls it, and older versions no longer drop">Older version, no longer drops</span>'}`)).join('')}</div>` : '<div class="fdempty">No weapons of that type.</div>'}`;
  }
  function draw() {
    const foc = document.activeElement && document.activeElement.id === 'fdq', sel = foc ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    s.innerHTML = `<div class="fdw">${head()}${st.perk ? `<button type="button" class="fdback" data-fback>&#8592; Back${st.q ? ' to results' : ''}</button>${perkPage()}` : results()}</div>`;
    if (foc) { const i = document.getElementById('fdq'); if (i) { i.focus(); try { i.setSelectionRange(sel[0], sel[1]); } catch (e) { /* type=search */ } } }
  }
  async function search() {
    const q = st.q.trim(), my = ++seq;
    if (q.length < 2) { st.res = null; st.err = ''; draw(); return; }
    try { const r = await gt.fdFind({ q }); if (my !== seq) return; st.res = r; st.err = ''; } catch (e) { if (my !== seq) return; st.err = 'Could not search: ' + clean(e); }
    draw();
  }
  async function openPerk(n) {
    st.perk = { n }; st.pbusy = 1; st.ptype = ''; draw(); window.scrollTo({ top: 0 });
    try { st.perk = await gt.fdPerk({ n }); } catch (e) { st.perk = { n, err: clean(e) }; }
    st.pbusy = 0; draw();
  }

  // ---------- weapon view ----------
  const WV = { d: null, sel: {}, hl: '', hs: [], busy: 0, err: '' };
  async function openWeapon(h, hs, hl) {
    WV.d = null; WV.sel = {}; WV.hl = hl || ''; WV.hs = hs; WV.busy = 1; WV.err = ''; wDraw(true);
    try { WV.d = await gt.fdWeapon({ h, hs }); } catch (e) { WV.err = clean(e); }
    WV.busy = 0; wDraw();
  }
  // Switching tabs (the bar at the bottom on phones) closes the view, so it can never be left stuck on top.
  new MutationObserver(() => { const m = document.getElementById('fdm'); if (m && m.dataset.sec !== document.documentElement.dataset.gsec) wClose(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-gsec'] });
  function wClose() { const m = document.getElementById('fdm'); if (m) m.remove(); WV.d = null; document.removeEventListener('keydown', wKey, true); }
  function wKey(e) { if (e.key === 'Escape' && document.getElementById('fdm')) { e.stopPropagation(); e.preventDefault(); wClose(); } }
  function wDraw(fresh) {
    let m = document.getElementById('fdm');
    if (!m) { m = document.createElement('div'); m.id = 'fdm'; m.dataset.sec = document.documentElement.dataset.gsec || ''; m.className = 'enter'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); document.addEventListener('keydown', wKey, true); m.addEventListener('animationend', () => m.classList.remove('enter'), { once: true }); }
    else if (fresh) m.className = '';
    const d = WV.d;
    if (!d) { m.innerHTML = `<div class="fvp"><button type="button" class="fvx" data-fx aria-label="Close" style="position:absolute;right:18px;top:18px">&#10005;</button><div class="fdl">${WV.err ? esc(WV.err) : 'Reading the perk pools…'}</div></div>`; m.setAttribute('aria-label', 'Weapon'); return; }
    m.setAttribute('aria-label', d.n);
    const n = owned(WV.hs);
    const vers = d.versions.length > 1 ? `<div class="fvv">Versions:${d.versions.map((v, i) => `<button type="button" data-fv="${v.h}" class="${v.h === d.h ? 'on' : ''}" title="${i === 0 ? 'Newest version' : 'Older version'}">${img(v.wm) ? `<img src="${esc(img(v.wm))}" alt="">` : ''}${i === 0 ? 'Newest' : 'Older ' + i}</button>`).join('')}</div>` : '';
    const hl = WV.hl.toLowerCase();
    const cols = d.cols.map((c, ci) => {
      const selN = WV.sel[ci] !== undefined ? WV.sel[ci] : Math.max(0, c.opts.findIndex((o) => o.n.toLowerCase() === hl));
      const o = c.opts[selN] || c.opts[0];
      const opts = c.opts.map((x, i) => `<button type="button" class="fvo${i === selN ? ' on' : ''}${x.n.toLowerCase() === hl ? ' hl' : ''}" data-fo="${ci}:${i}" title="${esc(x.n)}">${img(x.i) ? `<img src="${esc(img(x.i))}" alt="" loading="lazy">` : '<span class="fvi"></span>'}<span>${esc(x.n)}</span></button>`).join('');
      return `<div class="fvc"><h5>${esc(c.label)}<small>${c.opts.length === 1 ? 'fixed' : c.opts.length + ' options'}</small></h5><div class="fvos">${opts}</div>${o ? `<p class="fvd">${esc(o.d || '')}${o.d ? '<br>' : ''}<a data-fpk="${esc(o.n)}">Every weapon with ${esc(o.n)} &#8250;</a></p>` : ''}</div>`;
    }).join('');
    const am = AMMO[d.am] ? esc(AMMO[d.am]) + ' ammo' : '';
    m.innerHTML = `<div class="fvp" style="--gc:${RCOL(d.r)}">
<div class="fvh">${icon({ i: d.i, wm: d.wm })}<div class="fvn"><h3>${esc(d.n)}</h3><small>${[esc(d.t), elem(d.e), am].filter(Boolean).join('<i>·</i>')}</small>
<div class="fvb"><span class="pill">${esc(d.r || 'Weapon')}</span>${(howTo(d) || {}).gone ? '<span class="tag gone">No longer drops</span>' : ''}${d.fr ? `<span class="tag">${img(d.fr.i) ? `<img src="${esc(img(d.fr.i))}" alt="">` : ''}${esc(d.fr.n)}</span>` : ''}${img(d.bi) ? `<span class="tag"><img src="${esc(img(d.bi))}" alt="">Champion</span>` : ''}${n ? `<span class="tag">You have ${n}</span>` : ''}</div></div>
<button type="button" class="fvx" data-fx aria-label="Close">&#10005;</button></div>
${vers}
${d.fr && d.fr.d ? `<div class="fvfr"><b>${esc(d.fr.n)}:</b> ${esc(d.fr.d)}</div>` : ''}
${d.cols.length ? `<div class="fvcols">${cols}</div>` : '<div class="fdl">This weapon has no random perks.</div>'}
${(() => { const g = howTo(d); return `<div class="fvfr fvget"><b>How to get:</b> ${g ? `${esc(g.t)}${g.pre ? ` <span class="fvpre">${esc(g.pre)}</span>` : ''}${g.how ? ` <span class="fvhow">${esc(g.how)}</span>` : ''}` : 'Bungie does not say where this drops. It may be from an event, a past season or a reissue.'}</div>`; })()}
<p class="fvhint">Every perk this version can drop with today. Click a perk for what it does.</p>
<div class="fva">${n ? `<button type="button" data-finv>Show my copies in Inventory</button>` : ''}${window.__gtTabLocked && !window.__gtTabLocked('wishmaker') ? '<button type="button" data-fwm>Make a wish list roll</button>' : ''}</div></div>`;
  }
  document.addEventListener('click', async (e) => {
    const m = document.getElementById('fdm'); if (!m || !m.contains(e.target)) return;
    if (e.target === m || e.target.closest('[data-fx]')) { wClose(); return; }
    const o = e.target.closest('[data-fo]'); if (o) { const [ci, i] = o.dataset.fo.split(':').map(Number); WV.sel[ci] = i; wDraw(); return; }
    const v = e.target.closest('[data-fv]'); if (v && WV.d && +v.dataset.fv !== WV.d.h) { const hs = WV.hs; WV.d = null; WV.sel = {}; wDraw(); try { WV.d = await gt.fdWeapon({ h: +v.dataset.fv, hs }); } catch (er) { WV.err = clean(er); } wDraw(); return; }
    const pk = e.target.closest('[data-fpk]'); if (pk) { const n = pk.dataset.fpk; wClose(); if (!s.classList.contains('on')) window.show('finder'); openPerk(n); return; }
    if (e.target.closest('[data-finv]') && WV.d) { const n = WV.d.n; wClose(); window.show('vault'); const q = document.getElementById('vq'); if (q) { q.value = '"' + n + '"'; q.dispatchEvent(new Event('input', { bubbles: true })); } return; }
    if (e.target.closest('[data-fwm]') && WV.d) { const n = WV.d.n; wClose(); window.show('wishmaker'); setTimeout(() => { const q = document.querySelector('#wishmaker input[type=search], #wishmaker input'); if (q) { q.value = n; q.dispatchEvent(new Event('input', { bubbles: true })); } }, 200); }
  });

  // ---------- page events ----------
  s.addEventListener('input', (e) => {
    if (e.target.id === 'fdq') { st.q = e.target.value; st.perk = null; st.res = null; clearTimeout(qT); qT = setTimeout(search, 220); if (st.q.trim().length < 2) draw(); return; }
  });
  s.addEventListener('change', (e) => {
    if (e.target.id === 'fdpt') { st.ptype = e.target.value; draw(); }
    if (e.target.id === 'fdpn') { st.pnew = e.target.checked ? 1 : 0; draw(); }
  });
  s.addEventListener('keydown', (e) => { if (e.target.id === 'fdq' && e.key === 'Enter') { clearTimeout(qT); search(); } });
  s.addEventListener('click', (e) => {
    const fm = e.target.closest('[data-fm]'); if (fm) { st.mode = fm.dataset.fm; draw(); return; }
    const fs = e.target.closest('[data-fs]'); if (fs) { st.q = fs.dataset.fs; st.perk = null; st.res = null; draw(); search(); return; }
    if (e.target.closest('[data-fback]')) { st.perk = null; draw(); return; }
    const fp = e.target.closest('[data-fp]'); if (fp) { openPerk(fp.dataset.fp); return; }
    const fw = e.target.closest('[data-fw]'); if (fw) { const hs = (fw.dataset.hs || '').split(',').map(Number).filter(Boolean); openWeapon(+fw.dataset.fw, hs, st.perk && st.perk.n); }
  });
  new MutationObserver(() => { if (s.classList.contains('on') && !s.firstChild) draw(); }).observe(s, { attributes: true, attributeFilter: ['class'] });
  if (s.classList.contains('on')) draw();
})();
