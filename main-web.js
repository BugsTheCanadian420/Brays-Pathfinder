/* Pathfinder 0.3.4: main.js, run in the browser by web/shims.js */
window.__GT_MAIN__ = function (require, module, exports, __dirname, __filename) {
const { app, BrowserWindow, ipcMain, safeStorage, shell, Menu, clipboard, session, Notification, nativeImage, dialog } = require('electron');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const BASE = 'https://www.bungie.net';
// Weapon and armor bucket hashes: kinetic, energy, power, helmet, gauntlets, chest, legs, class item
const TF_WB0 = new Set([1498876634, 2465295065, 953998645]);
const BUCKETS = new Set([1498876634, 2465295065, 953998645, 3448274439, 3551918588, 14239492, 20886954, 1585787867, 4023194814, 2025709351]);
// Other buckets shown read-only in the Vault tab: subclass, ships, emblems, finishers, emotes, clan banners, engrams, consumables, mods, shaders, materials.
const XB = new Set([1506418338, 3284755031, 284967655, 4274335291, 3683254069, 3054419239, 4292445962, 375726501, 1469714392, 3313201758, 2973005342, 3865314626]);
// Websites the Hub tab may show (everything else opens in your normal browser).
const HUBRE = /^https:\/\/([a-z0-9-]+\.)?(d2checkpoint\.com|raid\.report|dungeon\.report|destiny\.report|d2lostsector\.report|lostsector\.report|caldera\.report|mobalytics\.gg|blueberries\.gg|paracausality\.com|builders\.gg)(\/|$)/i;
let win, M = null;
// The same file also runs inside the web version (web/ folder): there the browser stand-ins set __GT_WEB__ and provide the window.
const WEB = !!globalThis.__GT_WEB__;
if (WEB) win = globalThis.__GT_WEB__.win;
const cfgPath = () => path.join(app.getPath('userData'), 'config.json');
// app-config.json ships with the app: update/revocation addresses and, optionally, a ready-made Bungie app so friends only have to sign in.
const appCfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'app-config.json'), 'utf8')); } catch { return {}; } })();
const preset = appCfg.bungie && appCfg.bungie.apiKey && appCfg.bungie.clientId ? appCfg.bungie : null;
// Sign-in tokens and the app secret are only ever written to disk encrypted by the operating system (Windows DPAPI).
// If that is not available they stay in memory only, so you sign in again next launch instead of leaving them in a readable file.
let memSecret = {}, lastGood = null, PEND_PART = '';
// The settings file is read (and decrypted) on every Bungie request; keep the last result until the file changes.
let RDC = null;
function rd() {
  let k = 'none'; try { const st = fs.statSync(cfgPath()); k = st.mtimeMs + ':' + st.size; } catch (e) { /* not saved yet */ }
  if (RDC && RDC.k === k) return JSON.parse(RDC.v);
  const o = rd0(); RDC = { k, v: JSON.stringify(o) }; return o;
}
function rd0() {
  let o = {};
  try {
    const j = JSON.parse(fs.readFileSync(cfgPath(), 'utf8'));
    if (j.enc && safeStorage.isEncryptionAvailable()) o = JSON.parse(safeStorage.decryptString(Buffer.from(j.enc, 'base64')));
    else if (j.plain) { const { tok, clientSecret, ...rest } = j.plain; o = rest; }
  } catch { o = lastGood ? JSON.parse(lastGood) : {}; } // a file that is mid-write or briefly locked must not look like a sign-out
  if (o && o.apiKey) lastGood = JSON.stringify(o);
  if (!safeStorage.isEncryptionAvailable()) { if (memSecret.tok) o.tok = memSecret.tok; if (memSecret.clientSecret) o.clientSecret = memSecret.clientSecret; }
  if (preset) {
    // The Bungie app comes only from app-config.json. Anything saved by older versions is ignored.
    delete o.own;
    o = { ...o, apiKey: preset.apiKey, clientId: preset.clientId, redirect: preset.redirect || 'https://localhost/redirect', clientSecret: '' };
    // A login made with some other Bungie app does not work with the shared one: ask for a fresh sign-in.
    if (o.tok && o.tok.cid !== preset.clientId) delete o.tok;
  }
  return o;
}
function wr(o) {
  RDC = null;
  let j;
  if (safeStorage.isEncryptionAvailable()) { j = { enc: safeStorage.encryptString(JSON.stringify(o)).toString('base64') }; memSecret = {}; }
  else { const { tok, clientSecret, ...rest } = o; memSecret = { tok, clientSecret }; j = { plain: rest }; }
  const tmp = cfgPath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(j), { mode: 0o600 });
  fs.renameSync(tmp, cfgPath()); // never leave a half-written settings file behind
  lastGood = JSON.stringify(o); RDC = null;
}
// Only our own window's main page may call these. Anything else (a Hub website, a stray frame) is refused.
const trusted = (e) => {
  if (WEB) return true; // in the browser, the page and this code are the same page
  try {
    if (!win || win.isDestroyed() || e.sender !== win.webContents || e.senderFrame !== win.webContents.mainFrame) return false;
    const u = new URL(e.senderFrame.url);
    return u.protocol === 'file:' && decodeURIComponent(u.pathname).replace(/\\/g, '/').endsWith('/app/index.html');
  } catch (er) { return false; }
};
const H = (ch, fn) => ipcMain.handle(ch, (e, ...a) => { if (!trusted(e)) throw new Error('Blocked: this request did not come from the app.'); return fn(e, ...a); });
// Everything the page sends is checked here before it is used in a Bungie address or request.
const bad = () => new Error('Invalid request.');
const ID = (v) => { const s = String(v); if (!/^\d{1,20}$/.test(s)) throw bad(); return s; };
const HASH = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 0 || n > 4294967295) throw bad(); return n; };
const INT = (v, lo, hi) => { const n = Number(v); if (!Number.isInteger(n) || n < lo || n > hi) throw bad(); return n; };
const LOC = (v) => (v === 'vault' ? 'vault' : ID(v));
const TXT = (v, max) => { if (typeof v !== 'string' || v.length > max) throw bad(); return v; };
const OBJ = (v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw bad(); return v; };
const ARR = (v, max) => { if (!Array.isArray(v) || v.length > max) throw bad(); return v; };
const PITEM = (it) => { const o = ITEM({ ...OBJ(it), id: '1' }); if (typeof it.id !== 'string' || !/^[\w:]{1,80}$/.test(it.id)) throw bad(); o.id = it.id; if (it.eg) o.eg = 1; return o; };
// An item as sent by the page: only the fields we use, each checked.
const ITEM = (it) => { OBJ(it); return { id: ID(it.id), h: HASH(it.h), loc: LOC(it.loc), n: typeof it.n === 'string' ? it.n.slice(0, 80) : 'item', q: it.q ? INT(it.q, 1, 100000) : 1, inst: it.inst ? ID(it.inst) : undefined }; };
const send = (m) => win && win.webContents.send('progress', m);

const UA = 'GuardianToolkit/0.1.0 (local desktop app)';
// Read a reply as JSON, but report the HTTP status and body instead of crashing on empty or non-JSON replies.
// Big manifest tables are read entry by entry while they download, so the whole file is never held in memory at once
// (a phone browser closes a page that uses too much memory). Only one big table downloads at a time.
let TBLQ = Promise.resolve();
async function streamTable(url, fn) {
  const r = await fetch(BASE + url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Bungie returned HTTP ' + r.status + ' for the item data');
  if (!r.body || !r.body.getReader || typeof TextDecoder === 'undefined') { const o = await readJson(r); for (const k in o) fn(k, o[k]); return; }
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = '', i = 0, depth = 0, inStr = false, esc = false, ks = -1, vs = -1, key = '', n = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const L = buf.length;
    for (; i < L; i++) {
      const c = buf.charCodeAt(i);
      if (inStr) { if (esc) esc = false; else if (c === 92) esc = true; else if (c === 34) { inStr = false; if (depth === 1 && vs < 0) key = buf.slice(ks + 1, i); } continue; }
      if (c === 34) { inStr = true; if (depth === 1 && vs < 0) ks = i; }
      else if (c === 123 || c === 91) { if (depth === 1 && vs < 0) vs = i; depth++; }
      else if (c === 125 || c === 93) { depth--; if (depth === 1 && vs >= 0) { fn(key, JSON.parse(buf.slice(vs, i + 1))); vs = -1; n++; } }
    }
    const cut = vs >= 0 ? vs : inStr && depth === 1 ? ks : i;
    if (cut > 0) { buf = buf.slice(cut); i -= cut; if (vs >= 0) vs -= cut; if (ks >= 0) ks -= cut; }
  }
  if (depth !== 0 || !n) throw new Error('The item data download was cut off. Try again.');
}
function table(url, fn) {
  const run = TBLQ.then(() => streamTable(url, fn));
  TBLQ = run.catch(() => { /* the next table still runs */ });
  return run;
}
async function tableObj(url) { const o = {}; await table(url, (k, x) => { o[k] = x; }); return o; }

async function readJson(r) {
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) {
    throw new Error('Bungie returned HTTP ' + r.status + (t ? ' with a non-JSON reply: ' + t.replace(/\s+/g, ' ').slice(0, 200) : ' with an empty reply'));
  }
}

async function tokenReq(params) {
  const c = rd();
  let j, status;
  if (preset && preset.tokenUrl && /^https:\/\//i.test(preset.tokenUrl)) {
    // The Bungie app is a confidential one: its secret lives only on the token service, never in this app. The service swaps a sign-in
    // code (or a refresh token) for tokens and hands them back, which is what lets a sign-in last 90 days instead of an hour.
    const isRef = params.grant_type === 'refresh_token';
    const r = await fetch(preset.tokenUrl.replace(/\/+$/, '') + (isRef ? '/refresh' : '/token'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Accept: 'application/json' },
      body: JSON.stringify(isRef ? { refresh_token: params.refresh_token } : { code: params.code }),
    });
    j = await readJson(r); status = r.status;
  } else {
    const r = await fetch(BASE + '/Platform/App/OAuth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(c.clientSecret ? { Authorization: 'Basic ' + Buffer.from(c.clientId + ':' + c.clientSecret).toString('base64') } : {}),
        'X-API-Key': c.apiKey,
        'User-Agent': UA,
        Accept: 'application/json',
      },
      body: new URLSearchParams(c.clientSecret ? params : { ...params, client_id: c.clientId }),
    });
    j = await readJson(r); status = r.status;
  }
  if (!j.access_token) throw new Error((j.error_description || j.Message || j.error || 'Token request failed') + ' (HTTP ' + status + ')');
  const prev = c.tok || {}, same = String(prev.mid || '') === String(j.membership_id || '');
  c.tok = {
    access: j.access_token, refresh: j.refresh_token,
    exp: Date.now() + j.expires_in * 1000,
    rexp: Date.now() + (j.refresh_expires_in || 7776000) * 1000,
    mid: j.membership_id, cid: c.clientId,
    part: PEND_PART || (same ? prev.part : '') || '', m: same ? prev.m : undefined, n: same ? prev.n : '',
  };
  PEND_PART = '';
  wr(c);
}
async function fresh() {
  const c = rd();
  if (!c.tok) throw new Error('Not signed in');
  if (Date.now() < c.tok.exp - 60000) return;
  if (c.tok.refresh && Date.now() < c.tok.rexp) {
    try { await tokenReq({ grant_type: 'refresh_token', refresh_token: c.tok.refresh }); return; } catch (e) { /* fall back to a silent sign-in */ }
  }
  // Bungie gives public apps no refresh token, so the sign-in lasts an hour. The Bungie web login is remembered,
  // so sign in again quietly in a hidden window; only ask the person if Bungie wants them to log in.
  if (!(await silentAuth())) throw new Error('Session expired. Sign in again.');
}
// Diagnostic: the names and lifetimes (never values) of the Bungie web login cookies, so a login that is not remembered can be explained.
async function cookieLog(tag) {
  try {
    const cs = await session.fromPartition('persist:bungie').cookies.get({});
    const now = Date.now() / 1000;
    const l = cs.filter((c) => /bungie\.net$/i.test(c.domain || '')).map((c) => c.name + (c.session ? ':session' : ':' + Math.round(((c.expirationDate || 0) - now) / 60) + 'min') + (c.httpOnly ? ':http' : '') + (c.secure ? ':sec' : '') + ':' + String(c.sameSite || '')).join(', ');
    fs.appendFileSync(path.join(app.getPath('userData'), 'auth-log.txt'), new Date().toISOString() + ' cookies ' + tag + ': ' + (l || '(none)') + '\n');
  } catch (e) { /* log only */ }
}
let SILENT = null;
function silentAuth() {
  if (WEB) return Promise.resolve(false); // a website cannot sign in quietly in a hidden window; the page asks you to sign in again
  if (SILENT) return SILENT;
  const alog = (m) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'auth-log.txt'), new Date().toISOString() + ' ' + m + '\n'); } catch (e) { /* log only */ } };
  SILENT = new Promise((res) => {
    const c = rd();
    cookieLog('at silent start');
    alog('silent sign-in start; preset=' + !!preset + ' clientId=' + !!c.clientId + ' redirect=' + (c.redirect || '(none)'));
    if (!preset || !c.clientId) { alog('no app set up'); return res(false); }
    let w; try { w = new BrowserWindow({ show: false, width: 520, height: 780, webPreferences: { partition: (c.tok && c.tok.part) || 'persist:bungie', backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } }); } catch (e) { alog('window error ' + e.message); return res(false); }
    const state = crypto.randomBytes(12).toString('hex'), origin = new URL(c.redirect || 'https://localhost/redirect').origin;
    let done = false;
    const fin = (ok, why) => { if (done) return; done = true; clearTimeout(t); alog('finish ok=' + ok + (why ? ' ' + why : '')); try { w.destroy(); } catch (e) { /* gone */ } res(ok); };
    // If Bungie does not hand back a code within 12s it wants something from the person (log in or press Allow): show the page so they can do it right there.
    let t = setTimeout(() => {
      let u = ''; try { u = w.webContents.getURL().replace(/[?#].*$/, ''); } catch (e) { /* gone */ }
      alog('silent sign-in needs the person; page=' + u);
      try { w.setTitle('Bungie sign-in'); w.show(); } catch (e) { /* gone */ }
      t = setTimeout(() => fin(false, 'sign-in window timed out'), 180000);
    }, 12000);
    w.on('closed', () => fin(false, 'window closed'));
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    w.webContents.on('did-navigate', (ev, u) => alog('page ' + String(u).replace(/[?#].*$/, '')));
    w.webContents.on('did-fail-load', (ev, code, desc, u) => { if (code !== -3) alog('load failed ' + code + ' ' + desc + ' ' + String(u).replace(/[?#].*$/, '')); });
    w.webContents.session.webRequest.onBeforeRequest({ urls: [origin + '/*'] }, (d, cb) => {
      cb({ cancel: true });
      const u = new URL(d.url); if (u.searchParams.get('state') !== state || done) return;
      const code = u.searchParams.get('code');
      if (!code) return fin(false, 'Bungie sent back ' + (u.searchParams.get('error') || 'no code') + ' ' + (u.searchParams.get('error_description') || ''));
      tokenReq({ grant_type: 'authorization_code', code }).then(async () => { await cookieLog('after silent sign-in'); fin(true); }, (e) => fin(false, 'token error ' + e.message));
    });
    w.loadURL(`${BASE}/en/OAuth/Authorize?client_id=${encodeURIComponent(c.clientId)}&response_type=code&state=${state}`).catch(() => { /* redirect cancelled on purpose */ });
  }).finally(() => { setTimeout(() => { SILENT = null; }, 1000); });
  return SILENT;
}
async function api(p, auth = true) {
  if (auth) await fresh();
  const c = rd();
  const h = { 'X-API-Key': c.apiKey, 'User-Agent': UA };
  if (auth) h.Authorization = 'Bearer ' + c.tok.access;
  const r = await fetch(BASE + '/Platform' + p, { headers: h });
  const j = await readJson(r);
  if (j.ErrorCode !== 1) throw new Error(j.Message || 'Bungie error ' + j.ErrorCode);
  return j.Response;
}
let DEFS = null;
// Speed: the manifest index (which game version is live) is asked for once every 10 minutes, not before every lookup.
let MFQ = null;
function manifest() {
  if (MFQ && Date.now() - MFQ.at < 600000) return MFQ.p;
  const p = api('/Destiny2/Manifest/', false); MFQ = { at: Date.now(), p };
  p.catch(() => { if (MFQ && MFQ.p === p) MFQ = null; });
  return p;
}
async function defs() {
  const f = path.join(app.getPath('userData'), 'defs6.json');
  const m = await manifest();
  const v = m.version + '.12';
  if (DEFS && DEFS.v === v) return DEFS;
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === v) return (DEFS = o); } catch (e) { /* download below */ }
  send('Downloading item data. This only happens on the first run and after game updates.');
  const P = m.jsonWorldComponentContentPaths.en;
  const get = (k) => tableObj(P[k]);
  const opt = async (k) => { try { return P[k] ? await get(k) : {}; } catch (e) { return {}; } };
  const sbRaw = await opt('DestinySandboxPerkDefinition'), stRaw = await get('DestinyStatDefinition'), sgRaw = await get('DestinyStatGroupDefinition'), dtRaw = await opt('DestinyDamageTypeDefinition'), btRaw = await opt('DestinyBreakerTypeDefinition');
  // Champion types: a weapon's built-in frame carries a perk named [Shield-Piercing] Barrier, [Disruption] Overload or [Stagger] Unstoppable (same data DIM reads).
  const brk = {};
  for (const k in sbRaw) { const n = (sbRaw[k].displayProperties || {}).name || '', q = n.match(/^\[(Disruption|Shield[- ]Piercing|Stagger)\]/i); if (q) brk[k] = /^dis/i.test(q[1]) ? 2 : /^shield/i.test(q[1]) ? 1 : 3; }
  const plugBrk = {}, needBrk = [];
  const d = {}, p = {}, st = {}, sg = {}, ar = {}, gx = {}, W = [], dm = {}, bk = {};
  const wi = (q) => { if (!q) return -1; let i = W.indexOf(q); if (i < 0) { W.push(q); i = W.length - 1; } return i; };
  await table(P.DestinyInventoryItemDefinition, (k, x) => {
    if (x.perks) for (const q of x.perks) if (brk[q.perkHash]) { plugBrk[k] = brk[q.perkHash]; break; }
    const dp = x.displayProperties;
    if (!dp || !dp.name) return;
    const b = x.inventory && x.inventory.bucketTypeHash;
    if (b === 1506418338 || x.itemTypeDisplayName === 'Artifact') ar[k] = 1;
    if (XB.has(b)) gx[k] = { n: dp.name, i: dp.icon, r: (x.inventory && x.inventory.tierTypeName) || 'Common', t: x.itemTypeDisplayName || '', b, c: x.classType, mx: (x.inventory && x.inventory.maxStackSize > 1) ? x.inventory.maxStackSize : undefined };
    if (BUCKETS.has(b)) {
      d[k] = { n: dp.name, i: dp.icon, r: x.inventory.tierTypeName, t: x.itemTypeDisplayName, b, c: x.classType, g: x.stats && x.stats.statGroupHash };
      // Season watermark (top-left of the tile) and champion-breaker type (barrier / overload / unstoppable, top-right).
      const wv = ((x.quality && x.quality.displayVersionWatermarkIcons) || []).map(wi);
      if (wv.length) d[k].wl = wv; else if (x.iconWatermark) d[k].w = wi(x.iconWatermark);
      if (x.breakerType) d[k].bt = x.breakerType;
      else if (TF_WB0.has(b)) { const hs = ((x.sockets && x.sockets.socketEntries) || []).map((e) => e.singleInitialItemHash).filter(Boolean); if (hs.length) needBrk.push([k, hs]); }
      const ifc = x.quality && x.quality.infusionCategoryHashes; if (ifc && ifc.length) d[k].f = ifc[0];
      const amt = x.equippingBlock && x.equippingBlock.ammoType; if (amt) d[k].am = amt; // 1 primary, 2 special, 3 heavy (is:primary and so on in search)
    }
    else if (x.plug) p[k] = { n: dp.name, i: dp.icon, d: dp.description, c: x.plug.plugCategoryIdentifier, s: (x.investmentStats || []).filter((q) => q.value && !q.isConditionallyActive).map((q) => [q.statTypeHash, q.value]) };
  });
  needBrk.forEach(([k, hs]) => { for (const h of hs) if (plugBrk[h]) { d[k].bt = plugBrk[h]; break; } });
  for (const k in dtRaw) { const q = dtRaw[k]; if (q.enumValue !== undefined && q.displayProperties && q.displayProperties.icon) dm[q.enumValue] = q.displayProperties.icon; }
  for (const k in btRaw) { const q = btRaw[k]; if (q.enumValue && q.displayProperties && q.displayProperties.icon) bk[q.enumValue] = q.displayProperties.icon; }
  for (const k in stRaw) { const x = stRaw[k]; if (x.displayProperties && x.displayProperties.name) st[k] = { n: x.displayProperties.name, o: x.index }; }
  for (const k in sgRaw) sg[k] = (sgRaw[k].scaledStats || []).map((q) => ({ h: q.statHash, max: q.maximumValue || 100, num: !!q.displayAsNumeric }));
  const o = { v, d, p, st, sg, a: ar, g: gx, W, dm, bk };
  fs.writeFileSync(f, JSON.stringify(o));
  return (DEFS = o);
}

// In-game loadout names, colors and icons (small, cached separately so a failure here never blocks the vault).
let LODEFS = null;
async function lodefs() {
  const m = await manifest();
  if (LODEFS && LODEFS.v === m.version) return LODEFS;
  const f = path.join(app.getPath('userData'), 'lodefs.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === m.version) return (LODEFS = o); } catch (e) { /* download below */ }
  const P = m.jsonWorldComponentContentPaths.en;
  const get = async (k) => (P[k] ? tableObj(P[k]) : {});
  const nm = await get('DestinyLoadoutNameDefinition'), co = await get('DestinyLoadoutColorDefinition'), ic = await get('DestinyLoadoutIconDefinition');
  const o = { v: m.version, names: {}, colors: {}, icons: {} };
  for (const k in nm) o.names[k] = (nm[k].name || (nm[k].displayProperties && nm[k].displayProperties.name) || '');
  for (const k in co) o.colors[k] = co[k].colorImagePath || '';
  for (const k in ic) o.icons[k] = ic[k].iconImagePath || '';
  fs.writeFileSync(f, JSON.stringify(o));
  return (LODEFS = o);
}

H('cfg:get', () => { const c = rd(); return { apiKey: !!c.apiKey, clientId: c.clientId || '', redirect: c.redirect || 'https://localhost/redirect', secret: !!c.clientSecret, signedIn: !!c.tok, preset: !!preset, mid: c.tok ? String(c.tok.mid || '') : '', prim: String(c.prim || '') }; });
H('clip:read', () => clipboard.readText());
H('clip:write', (e, t) => { clipboard.writeText(String(t || '')); return true; });
// Signing out also forgets the Bungie web login, so the next person (or account) gets a fresh sign-in page.
H('auth:logout', async () => {
  const c = rd(), part = (c.tok && c.tok.part) || 'persist:bungie'; delete c.tok; M = null; farm.on = false; clearInterval(farm.t);
  const next = Object.keys(c.accts || {})[0];
  if (next) { c.tok = c.accts[next]; delete c.accts[next]; }
  wr(c);
  try { await session.fromPartition(part).clearStorageData(); } catch (e) { /* nothing stored */ }
  return next ? { switched: 1, ...(await restartApp()) } : true;
});
const loginWin = (part) => new Promise((res, rej) => {
  const c = rd();
  if (!preset) return rej(new Error('This copy of the app has no Bungie app set up yet.'));
  if (WEB) {
    // Website: go to Bungie's sign-in page; Bungie sends the browser back to the site with a code, which the site hands to auth:webcode.
    const st = crypto.randomBytes(12).toString('hex');
    globalThis.__GT_WEB__.authRedirect(`${BASE}/en/OAuth/Authorize?client_id=${encodeURIComponent(c.clientId)}&response_type=code&state=${st}`, st);
    return; // the page navigates away, so this never resolves
  }
  const w = new BrowserWindow({ width: 520, height: 780, parent: win, modal: true, webPreferences: { partition: part || 'persist:bungie', sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false } });
  // The Bungie sign-in page only: https only, no pop-up windows, no permissions (camera, location...).
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (ev, u) => { if (!/^https:\/\//i.test(u)) ev.preventDefault(); });
  w.webContents.session.setPermissionRequestHandler((wc, p, cb) => cb(false));
  const state = crypto.randomBytes(12).toString('hex');
  const origin = new URL(c.redirect || 'https://localhost/redirect').origin;
  if (!origin.startsWith('https://')) return rej(new Error('The redirect address must start with https://'));
  let done = false;
  w.webContents.session.webRequest.onBeforeRequest({ urls: [origin + '/*'] }, (d, cb) => {
    cb({ cancel: true });
    if (done) return;
    const u = new URL(d.url);
    if (u.searchParams.get('state') !== state) return;
    done = true;
    const code = u.searchParams.get('code');
    w.close();
    tokenReq({ grant_type: 'authorization_code', code }).then(async () => { await cookieLog('after sign-in'); res(true); }, rej);
  });
  w.on('closed', () => { if (!done) rej(new Error('Sign-in window was closed.')); });
  w.loadURL(`${BASE}/en/OAuth/Authorize?client_id=${encodeURIComponent(c.clientId)}&response_type=code&state=${state}`);
});
// ---- sync across devices: a small JSON document kept by your own token service (needs a KV namespace bound as SYNC) ----
const syncUrl = () => (preset && preset.tokenUrl && /^https:\/\//i.test(preset.tokenUrl) ? preset.tokenUrl.replace(/\/+$/, '') + '/sync' : '');
async function syncReq(method, body) {
  const u = syncUrl(); if (!u) throw new Error('sync_unavailable');
  await fresh();
  const r = await fetch(u, { method, headers: { Authorization: 'Bearer ' + rd().tok.access, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body } : {}) });
  const j = await readJson(r).catch(() => ({}));
  if (!r.ok) throw new Error((j && j.error) || 'HTTP ' + r.status);
  return j;
}
H('sync:get', () => syncReq('GET'));
H('sync:put', (e, v) => { OBJ(v); const body = JSON.stringify({ data: OBJ(v.data), wl: Array.isArray(v.wl) ? v.wl.filter((x) => typeof x === 'string').slice(0, 20) : [] }); if (body.length > 850000) throw new Error('too_big'); return syncReq('PUT', body); });
// ---- share links like DIM's (https://d2pathfinder.com/abc1234/Equipped): the loadout is kept by the token service under a short code ----
const WEBDOM = (() => { try { return require('./package.json').webDomain || 'd2pathfinder.com'; } catch (e) { return 'd2pathfinder.com'; } })();
const shareUrl = () => (preset && preset.tokenUrl && /^https:\/\//i.test(preset.tokenUrl) ? preset.tokenUrl.replace(/\/+$/, '') + '/share' : '');
const siteBase = () => { const lc = globalThis.location; return WEB && lc ? (lc.origin + lc.pathname.replace(/[^/]*$/, '')).replace(/\/+$/, '') : 'https://' + WEBDOM; };
const slugOf = (n) => String(n || 'Loadout').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'Loadout';
const SHERR = { share_not_configured: 'Share links are not switched on in your token service yet (see SHARE-SETUP.txt).', share_unavailable: 'This copy of the app has no token service, so it cannot make share links.', too_many_today: 'You have made a lot of share links today. Try again tomorrow.', unauthorized: 'Sign in again to share.' };
H('lo:share', async (e, v) => {
  OBJ(v); const c = TXT(v.c, 65000), n = TXT(v.n || 'Loadout', 80);
  if (!/^GTL1:[A-Za-z0-9+/=]+$/.test(c)) throw bad();
  const u = shareUrl(); if (!u) throw new Error(SHERR.share_unavailable);
  await fresh();
  const r = await fetch(u, { method: 'POST', headers: { Authorization: 'Bearer ' + rd().tok.access, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ c, n }) });
  const j = await readJson(r).catch(() => ({}));
  if (!r.ok || !j || !/^[A-Za-z0-9]{5,12}$/.test(String(j.code || ''))) throw new Error(SHERR[j && j.error] || (j && j.error) || 'HTTP ' + r.status);
  return { url: siteBase() + '/' + j.code + '/' + encodeURIComponent(slugOf(n)), code: j.code };
});
H('lo:shareget', async (e, v) => {
  OBJ(v); const code = TXT(v.code, 20); if (!/^[A-Za-z0-9]{5,12}$/.test(code)) throw bad();
  const u = shareUrl(); if (!u) throw new Error(SHERR.share_unavailable);
  const r = await fetch(u + '/' + code, { headers: { Accept: 'application/json' } });
  const j = await readJson(r).catch(() => ({}));
  if (!r.ok || !j || typeof j.c !== 'string') throw new Error(r.status === 404 ? 'That share link does not exist (or it was typed wrong).' : SHERR[j && j.error] || (j && j.error) || 'HTTP ' + r.status);
  return { c: j.c, n: String(j.n || '') };
});
H('auth:login', () => loginWin((rd().tok || {}).part || 'persist:bungie'));
// ---- more than one Bungie account (your alts, or a friend who shares their login): each keeps its own sign-in, tags stay shared ----
// The active account is c.tok; the others wait in c.accts. Switching restarts the app so nothing from one account leaks into another.
function restartApp() {
  if (WEB) { const f = globalThis.__GT_WEB__ && globalThis.__GT_WEB__.flush; return f ? f().then(() => ({ reload: 1 }), () => ({ reload: 1 })) : { reload: 1 }; } // the switch is saved before the page reloads
  setTimeout(() => { try { app.relaunch(); } catch (e) { /* manual start */ } app.exit(0); }, 200);
  return { restart: 1 };
}
const acctRow = (t, on) => ({ mid: String(t.mid || ''), n: t.n || (t.m && (t.m.bungieGlobalDisplayName || t.m.displayName)) || 'Bungie account', code: t.m && t.m.bungieGlobalDisplayNameCode ? String(t.m.bungieGlobalDisplayNameCode).padStart(4, '0') : '', on: on ? 1 : 0, ok: t.refresh && Date.now() < (t.rexp || 0) ? 1 : 0 });
H('acct:list', () => {
  const c = rd(), out = [];
  if (c.tok) out.push(acctRow(c.tok, true));
  Object.values(c.accts || {}).forEach((t) => { if (t && t.mid && (!c.tok || String(t.mid) !== String(c.tok.mid))) out.push(acctRow(t, false)); });
  return { list: out, prim: String(c.prim || (c.tok && c.tok.mid) || ''), web: WEB ? 1 : 0 };
});
H('acct:add', async () => {
  const c = rd();
  if (!preset) throw new Error('This copy of the app has no Bungie app set up yet.');
  const keep = c.tok || null;
  if (keep) { c.prim = c.prim || String(keep.mid); c.accts = c.accts || {}; c.accts[keep.mid] = keep; }
  delete c.tok; wr(c); M = null;
  // A fresh, empty Bungie sign-in page (its own cookie jar), so you can log in as someone else while the first login stays remembered.
  PEND_PART = 'persist:bungie-' + crypto.randomBytes(6).toString('hex');
  if (WEB) {
    const st = crypto.randomBytes(12).toString('hex');
    globalThis.__GT_WEB__.authRedirect(`${BASE}/en/OAuth/Authorize?client_id=${encodeURIComponent(c.clientId)}&response_type=code&state=${st}&reauth=true`, st);
    return new Promise(() => {}); // the page navigates away
  }
  try { await loginWin(PEND_PART); }
  catch (e) { PEND_PART = ''; const c2 = rd(); if (!c2.tok && keep) { c2.tok = keep; if (c2.accts) delete c2.accts[keep.mid]; wr(c2); } throw e; }
  const c3 = rd();
  if (c3.tok && c3.accts) delete c3.accts[c3.tok.mid]; // the same account signed in again: keep just one copy
  wr(c3);
  return restartApp();
});
H('acct:switch', (e, v) => {
  OBJ(v); const mid = ID(v.mid), c = rd();
  if (c.tok && String(c.tok.mid) === mid) return { same: 1 };
  const t = c.accts && c.accts[mid]; if (!t) throw new Error('That account is no longer saved here.');
  c.accts = c.accts || {};
  if (c.tok) { c.prim = c.prim || String(c.tok.mid); c.accts[c.tok.mid] = c.tok; }
  c.tok = t; delete c.accts[mid]; wr(c); M = null;
  return restartApp();
});
H('acct:remove', async (e, v) => {
  OBJ(v); const mid = ID(v.mid), c = rd();
  let part = '';
  if (c.tok && String(c.tok.mid) === mid) {
    part = c.tok.part || 'persist:bungie'; delete c.tok;
    const next = Object.keys(c.accts || {})[0];
    if (next) { c.tok = c.accts[next]; delete c.accts[next]; }
  } else if (c.accts && c.accts[mid]) { part = c.accts[mid].part || ''; delete c.accts[mid]; }
  wr(c); M = null;
  if (part && !WEB) { try { await session.fromPartition(part).clearStorageData(); } catch (er) { /* nothing stored */ } }
  return restartApp();
});
// Website only: the sign-in code Bungie sent back to the site (its state was already checked by the page).
if (WEB) H('auth:webcode', async (e, v) => { OBJ(v); await tokenReq({ grant_type: 'authorization_code', code: TXT(v.code, 4000) }); const c = rd(); if (c.tok && c.accts && c.accts[c.tok.mid]) { delete c.accts[c.tok.mid]; wr(c); } return true; });
const PMDEF = {}, TITLES = {}, ENTC = {}, OVR = {};
// A character's equipped title (Immortal, Conqueror...), looked up once and remembered.
// Whether a character's title is gilded (the small gold seal DIM shows next to it). Looked up from the account's records, kept for a few minutes.
let GILD = { at: 0, v: {} };
async function gildedSet() {
  if (Date.now() - GILD.at < 600000) return GILD.v;
  try {
    await ensureM();
    const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=900`);
    GILD = { at: Date.now(), v: (pr.profileRecords && pr.profileRecords.data && pr.profileRecords.data.records) || {} };
  } catch (e) { GILD.at = Date.now() - 540000; }
  return GILD.v;
}
async function titleOf(x) {
  const h = x.titleRecordHash; if (!h) return '';
  if (TITLES[h] === undefined) {
    try { const o = await api('/Destiny2/Manifest/DestinyRecordDefinition/' + h + '/', false); const t = (o.titleInfo && o.titleInfo.titlesByGender) || {}; TITLES[h] = { Male: t.Male || '', Female: t.Female || t.Male || '', g: (o.titleInfo && o.titleInfo.gildingTrackingRecordHash) || 0 }; }
    catch (e) { TITLES[h] = { Male: '', Female: '' }; }
  }
  return TITLES[h][x.genderType === 1 ? 'Female' : 'Male'] || '';
}
let GLC = null;
const glcSave = () => { try { fs.writeFileSync(apath('gild.json'), JSON.stringify(GLC || {})); } catch (e) { /* remembered next time */ } };
async function isGilded(x) {
  const h = x.titleRecordHash, t = h && TITLES[h]; if (!t || !t.g) return 0;
  if (!GLC) { try { GLC = JSON.parse(fs.readFileSync(apath('gild.json'), 'utf8')) || {}; } catch (e) { GLC = {}; } }
  const val = () => { const r = GILD.v[t.g]; return r && r.completedCount > 0 ? 1 : 0; };
  const fresh1 = GILD.at && Date.now() - GILD.at < 600000;
  if (!fresh1 && GLC[t.g] !== undefined) { gildedSet().then(() => { const v2 = val(); if (GLC[t.g] !== v2) { GLC[t.g] = v2; glcSave(); } }).catch(() => {}); return GLC[t.g]; }
  await gildedSet(); const v = val(); if (GLC[t.g] !== v) { GLC[t.g] = v; glcSave(); } return v;
}
async function ent(type, h) { return api('/Destiny2/Manifest/' + type + '/' + h + '/', false); }
// The seasonal artifact: which mods are unlocked right now, with names and icons.
// Speed: ornament and title lookups are kept on disk (per game version), so a fresh start never repeats them.
let XDL = '';
function xdLoad(df) {
  if (XDL === df.v) return; XDL = df.v;
  try { const o = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'xdefs.json'), 'utf8')); if (o && o.v === df.v) { Object.assign(OVR, o.o || {}); Object.assign(TITLES, o.t || {}); } } catch (e) { /* first run */ }
}
let XDN = -1;
function xdSave(df) {
  const n = Object.keys(OVR).length + Object.keys(TITLES).length; if (n === XDN) return; XDN = n;
  fs.promises.writeFile(path.join(app.getPath('userData'), 'xdefs.json'), JSON.stringify({ v: df.v, o: OVR, t: TITLES })).catch(() => {});
}
// Files that belong to one Bungie account. The first account keeps the old places; others get their own folder.
function apath(name) {
  const c = rd(), mid = c.tok && c.tok.mid;
  if (mid && c.prim && String(mid) !== String(c.prim)) {
    const d = path.join(app.getPath('userData'), 'acct-' + String(mid).replace(/\D/g, ''));
    try { fs.mkdirSync(d, { recursive: true }); } catch (e) { /* exists */ }
    return path.join(d, name);
  }
  return path.join(app.getPath('userData'), name);
}
// Speed, like DIM: the last vault is saved, shown instantly on the next start, and replaced as soon as Bungie answers.
H('vault:cached', () => {
  try {
    const o = JSON.parse(fs.readFileSync(apath('vcache.json'), 'utf8')), t = rd().tok;
    if (!o || !o.d || !t || String(o.mid) !== String(t.mid) || Date.now() - o.at > 14 * 864e5) return null;
    return { ...o.d, stale: 1, cachedAt: o.at };
  } catch (e) { return null; }
});
H('vault:load', async () => {
  const m = await memb();
  const ldP = lodefs().catch(() => ({ names: {}, colors: {}, icons: {} })); // in parallel with the profile, not after it
  const [df, pr] = await Promise.all([defs(), api(`/Destiny2/${m.membershipType}/Profile/${m.membershipId}/?components=102,103,200,201,205,206,300,304,305,310`)]);
  xdLoad(df);
  const d = df.d;
  const ld = await ldP; // names fall back to numbers
  const inst = (pr.itemComponents && pr.itemComponents.instances && pr.itemComponents.instances.data) || {};
  const sk = (pr.itemComponents && pr.itemComponents.sockets && pr.itemComponents.sockets.data) || {};
  // Equipped ornament: its plug icon replaces the item's icon, like DIM.
  const orn = (id) => {
    const so = id && sk[id]; if (!so) return null;
    for (const q of so.sockets || []) {
      const pl = q.plugHash && df.p[q.plugHash];
      if (pl && pl.i && /skin|ornament/i.test(pl.c || '') && !/shader/i.test(pl.c || '') && !/^default|^no |empty/i.test(pl.n)) return pl;
    }
    return null;
  };
  const rp = (pr.itemComponents && pr.itemComponents.reusablePlugs && pr.itemComponents.reusablePlugs.data) || {};
  const WB = new Set([1498876634, 2465295065, 953998645]);
  // Every perk a weapon could have (rolled options plus equipped ones), for wish list matching.
  // Wish lists often name the base version of a perk while the gun has the enhanced one (or the reverse),
  // so every perk also counts as the other plugs with the same name in the same category.
  if (!df.ix) { df.ix = {}; for (const k in df.p) { const q = df.p[k], key = (q.c || '') + '|' + q.n; (df.ix[key] = df.ix[key] || []).push(+k); } }
  const perks = (id) => {
    const o = new Set();
    ((sk[id] && sk[id].sockets) || []).forEach((q) => q.plugHash && o.add(q.plugHash));
    const r = rp[id] && rp[id].plugs; if (r) for (const k in r) r[k].forEach((q) => q.plugItemHash && o.add(q.plugItemHash));
    [...o].forEach((h) => { const q = df.p[h]; if (q && q.n && !/^(empty|default)/i.test(q.n)) (df.ix[(q.c || '') + '|' + q.n] || []).forEach((x) => o.add(x)); });
    return [...o];
  };
  const ist = (pr.itemComponents && pr.itemComponents.stats && pr.itemComponents.stats.data) || {};
  const ARB = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);
  const SH = [2996146975, 392767087, 1943323491, 1735777505, 144602215, 4244567218]; // weapons, health, class, grenade, super, melee
  const astats = (id) => { const o = ist[id] && ist[id].stats; return o ? SH.map((h) => (o[h] && o[h].value) || 0) : undefined; };
  // Armor and subclasses: only the plugs in their sockets right now (archetype, exotic perk, mods, aspects, fragments...), for search.
  // Kept apart from pk (weapon perks and their options), which the wish lists and targets read.
  const SUBB = 3284755031;
  const aplugs = (id) => { const o = []; ((sk[id] && sk[id].sockets) || []).forEach((q) => { const pl = q.plugHash && df.p[q.plugHash]; if (pl && pl.n && !/^(empty|default)\b/i.test(pl.n) && !/shader|ornament|skin|memento|tracker/i.test(pl.c || '')) o.push(q.plugHash); }); return o.length ? o : undefined; };
  const epl = (id) => ((sk[id] && sk[id].sockets) || []).map((q) => q.plugHash && df.p[q.plugHash]).filter((pl) => pl && pl.n && !/shader|masterwork|tracker|memento|skin|ornament|crafting|empty|default/i.test((pl.c || '') + ' ' + pl.n)).map((pl) => pl.n).slice(0, 9);
  // The weapon's frame (Adaptive, Rapid-Fire, Precision ...) icon, shown in the tile's top-right corner like DIM.
  const frI = (id) => { for (const q of (sk[id] && sk[id].sockets) || []) { const pl = q.plugHash && df.p[q.plugHash]; if (pl && pl.c === 'intrinsics' && pl.i) return pl.i; } return undefined; };
  const mk = (it) => {
    const f = d[it.itemHash]; if (!f) return null;
    // The applied ornament: Bungie names it directly on the item (overrideStyleItemHash, what DIM uses); the socket scan is the fallback.
    const oh = it.overrideStyleItemHash && it.overrideStyleItemHash !== it.itemHash ? it.overrideStyleItemHash : 0;
    const ovd = oh ? (OVR[oh] && (OVR[oh].fg || OVR[oh].i) ? OVR[oh] : (df.p[oh] || d[oh] || (df.g && df.g[oh]))) : null;
    // Like DIM: an ornament is drawn as its see-through foreground on the item's own rarity colour (its plug icon has a grey/blue backdrop baked in).
    const o = ovd && (ovd.fg || ovd.i) ? { n: ovd.n, i: ovd.fg || ovd.i, fg: !!ovd.fg } : orn(it.itemInstanceId);
    const s = it.itemInstanceId && inst[it.itemInstanceId] && inst[it.itemInstanceId].primaryStat;
    const wmi = f.wl && f.wl.length ? f.wl[Math.min(it.versionNumber || 0, f.wl.length - 1)] : f.w, stt = it.state || 0, gti = it.itemInstanceId && inst[it.itemInstanceId] && inst[it.itemInstanceId].gearTier;
    return { wm: wmi >= 0 && df.W ? df.W[wmi] : undefined, bt: f.bt || undefined, fc: f.f || undefined, lk: stt & 1 ? 1 : undefined, mw: stt & 4 ? 1 : undefined, cr: stt & 8 ? 1 : undefined, gt: gti || undefined, id: it.itemInstanceId, h: it.itemHash, n: f.n, i: o ? o.i : f.i, bi: o ? f.i : undefined, orn: o ? o.n : undefined, of: o && o.fg ? 1 : undefined, pk: WB.has(f.b) && it.itemInstanceId ? perks(it.itemInstanceId) : undefined, fr: WB.has(f.b) && it.itemInstanceId ? frI(it.itemInstanceId) : undefined, ep: WB.has(f.b) && it.itemInstanceId ? epl(it.itemInstanceId) : undefined, st: ARB.has(f.b) && it.itemInstanceId ? astats(it.itemInstanceId) : undefined, ap: (ARB.has(f.b) || f.b === SUBB) && it.itemInstanceId ? aplugs(it.itemInstanceId) : undefined, am: f.am || undefined, en: (ARB.has(f.b) && inst[it.itemInstanceId] && inst[it.itemInstanceId].energy && inst[it.itemInstanceId].energy.energyCapacity) || undefined, ds: stt & 16 ? 1 : undefined, r: f.r, t: f.t, b: f.b, c: f.c, p: s ? s.value : 0, el: (inst[it.itemInstanceId] && inst[it.itemInstanceId].damageType) || 0 };
  };
  { // ornament definitions the cached item data does not have (new universal ornaments): look them up once
    const all = [...((pr.profileInventory.data || {}).items || [])]; for (const k in pr.characterEquipment.data) all.push(...(pr.characterEquipment.data[k].items || [])); for (const k in pr.characterInventories.data) all.push(...(pr.characterInventories.data[k].items || []));
    const miss = [...new Set(all.map((it) => it.itemInstanceId && it.overrideStyleItemHash !== it.itemHash && it.overrideStyleItemHash).filter((h) => h && !OVR[h]))].slice(0, 300);
    await pool(miss, 8, async (h) => {
      try {
        const o = await ent('DestinyInventoryItemDefinition', h), dp = o.displayProperties || {};
        if (o.plug && o.plug.isDummyPlug) { OVR[h] = { n: '', i: '' }; return; }
        let fg = '';
        if (dp.iconHash) { try { const ic = await ent('DestinyIconDefinition', dp.iconHash); fg = (ic && ic.foreground) || ''; } catch (er) { /* use the plain icon */ } }
        OVR[h] = { n: dp.name || '', i: dp.icon || '', fg };
      } catch (er) { OVR[h] = { n: '', i: '' }; }
    });
  }
  const chars = await Promise.all(Object.values(pr.characters.data).map(async (x) => ({ id: x.characterId, cls: x.classType, light: x.light, em: x.emblemBackgroundPath || '', dp: Date.parse(x.dateLastPlayed) || 0, mp: Number(x.minutesPlayedTotal) || 0, tt: await titleOf(x), gl: await isGilded(x) })));
  const items = [], gen = [], gst = {};
  const POSTMASTER = 215593132;
  const pm = {}, pmRaw = [];
  const add = (a, loc, e) => (a || []).forEach((it) => {
    const lost = it.bucketHash === POSTMASTER;
    if (lost) pm[loc] = (pm[loc] || 0) + 1;
    const x = it.itemInstanceId && mk(it);
    if (x) { x.loc = loc; x.e = e; if (lost) { x.pm = 1; x.inst = it.itemInstanceId; } items.push(x); }
    else if (lost) pmRaw.push({ it, loc });
    else if (df.g && df.g[it.itemHash]) {
      const f = df.g[it.itemHash], inst1 = it.itemInstanceId && it.itemInstanceId !== '0';
      if (inst1) gen.push({ id: it.itemInstanceId, h: it.itemHash, n: f.n, i: f.i, r: f.r, t: f.t, b: f.b, c: f.c, p: 0, el: 0, q: 1, loc, e, ro: 1, ap: f.b === SUBB ? aplugs(it.itemInstanceId) : undefined });
      else {
        // Stackable things (materials, consumables): one tile per kind and place, with the total.
        const k = loc + ':' + it.itemHash + ':' + e;
        if (gst[k]) gst[k].q += it.quantity || 1;
        else { gst[k] = { id: 's:' + k, h: it.itemHash, n: f.n, i: f.i, r: f.r, t: f.t, b: f.b, c: 3, p: 0, el: 0, q: it.quantity || 1, mx: f.mx, loc, e, ro: 1 }; gen.push(gst[k]); }
      }
    }
  });
  add(pr.profileInventory.data.items, 'vault', 0);
  for (const ch of chars) {
    add(pr.characterEquipment.data[ch.id].items, ch.id, 1);
    add(pr.characterInventories.data[ch.id].items, ch.id, 0);
  }
  // Postmaster things that are not weapons or armor (materials, engrams...): look up just their names and icons.
  const need = [...new Set(pmRaw.map((r) => r.it.itemHash))].filter((h) => !PMDEF[h]);
  await Promise.all(need.map(async (h) => {
    try { const o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + h + '/', false); PMDEF[h] = { n: (o.displayProperties && o.displayProperties.name) || 'Item', i: (o.displayProperties && o.displayProperties.icon) || '', r: (o.inventory && o.inventory.tierTypeName) || 'Common', t: o.itemTypeDisplayName || '', eg: o.itemType === 8 || (o.inventory && o.inventory.bucketTypeHash === 375726501) || /engram/i.test(o.itemTypeDisplayName || '') ? 1 : 0 }; }
    catch (e) { PMDEF[h] = { n: 'Item', i: '', r: 'Common', t: '' }; }
  }));
  pmRaw.forEach(({ it, loc }, k) => {
    const f = PMDEF[it.itemHash]; if (!f) return;
    items.push({ id: 'pm' + k + ':' + it.itemHash, inst: it.itemInstanceId || '0', q: it.quantity || 1, h: it.itemHash, n: f.n, i: f.i, r: f.r, t: f.t, b: 0, c: 3, p: 0, el: 0, loc, e: 0, pm: 1, eg: f.eg ? 1 : undefined });
  });
  const cl = (pr.characterLoadouts && pr.characterLoadouts.data) || {};
  const lo = {};
  for (const ch of chars) {
    lo[ch.id] = ((cl[ch.id] && cl[ch.id].loadouts) || []).map((l, i) => ({
      i, nh: l.nameHash, ch: l.colorHash, ih: l.iconHash,
      n: ld.names[l.nameHash] || '', c: ld.colors[l.colorHash] || '', ic: ld.icons[l.iconHash] || '',
      items: (l.items || []).map((q) => q.itemInstanceId).filter((q) => q && q !== '0'),
    }));
  }
  // Currencies shown above the vault (glimmer, shards...), like DIM.
  const cur = [];
  const curItems = (pr.profileCurrencies && pr.profileCurrencies.data && pr.profileCurrencies.data.items) || [];
  await Promise.all(curItems.map(async (q) => {
    if (!PMDEF[q.itemHash]) {
      try { const o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + q.itemHash + '/', false); PMDEF[q.itemHash] = { n: (o.displayProperties && o.displayProperties.name) || 'Item', i: (o.displayProperties && o.displayProperties.icon) || '', r: 'Common', t: o.itemTypeDisplayName || '' }; }
      catch (e) { PMDEF[q.itemHash] = { n: 'Item', i: '', r: 'Common', t: '' }; }
    }
    if (PMDEF[q.itemHash].i) cur.push({ n: PMDEF[q.itemHash].n, i: PMDEF[q.itemHash].i, q: q.quantity });
  }));
  cur.sort((a, b) => b.q - a.q);
  // Armor set bonuses (the two round icons under each character in DIM) and the six stat icons. Everything is looked up once and kept.
  const ARM = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);
  const ent1 = async (tbl, h) => { const k = tbl + h; if (ENTC[k] !== undefined) return ENTC[k]; try { ENTC[k] = await api('/Destiny2/Manifest/' + tbl + '/' + h + '/', false); } catch (e) { ENTC[k] = null; } return ENTC[k]; };
  for (const ch of chars) {
    try {
      const worn = items.filter((x) => x.loc === ch.id && x.e && !x.pm && ARM.has(x.b));
      const cnt = {};
      await Promise.all(worn.map(async (x) => { const o = await ent1('DestinyInventoryItemDefinition', x.h), sh = o && o.equippingBlock && o.equippingBlock.equipableItemSetHash; if (sh) cnt[sh] = (cnt[sh] || 0) + 1; }));
      const sb = [];
      for (const sh of Object.keys(cnt)) {
        const sd = await ent1('DestinyEquipableItemSetDefinition', sh); if (!sd) continue;
        for (const sp of sd.setPerks || []) {
          if (cnt[sh] < (sp.requiredSetCount || 99)) continue;
          const pd = await ent1('DestinySandboxPerkDefinition', sp.sandboxPerkHash), dp = pd && pd.displayProperties;
          if (dp && dp.icon) sb.push({ n: dp.name || '', d: dp.description || '', i: dp.icon, rc: sp.requiredSetCount || 0, sn: (sd.displayProperties && sd.displayProperties.name) || '' });
        }
      }
      ch.sb = sb.sort((p, q) => p.rc - q.rc).slice(0, 2);
    } catch (e) { ch.sb = []; }
  }
  const sti = [];
  for (const h of SH) { const o = await ent1('DestinyStatDefinition', h); sti.push((o && o.displayProperties && o.displayProperties.icon) || ''); }
  let art = null;
  art = null; // the old artifact list is stale; see art:get
  const pn = {};
  [...items, ...gen].forEach((x) => [...(x.pk || []), ...(x.ap || [])].forEach((h) => { if (!pn[h] && df.p[h]) pn[h] = df.p[h].n; }));
  const res = { ts: Date.parse(pr.responseMintedTimestamp) || 0, chars, sti, items, gen, cur, ic: { el: df.dm || {}, bk: df.bk || {} }, pm, lo, art, pn, name: m.bungieGlobalDisplayName || m.displayName };
  xdSave(df);
  { const mid = (rd().tok || {}).mid, f = apath('vcache.json'); setTimeout(() => { fs.promises.writeFile(f, JSON.stringify({ v: 1, at: Date.now(), mid, d: res })).catch(() => {}); }, 50); }
  return res;
});

// Stats and perks for one item (opened from the click menu).
const entDef = async (tbl, h) => { const k = tbl + h; if (ENTC[k] !== undefined) return ENTC[k]; try { ENTC[k] = await api('/Destiny2/Manifest/' + tbl + '/' + h + '/', false); } catch (e) { ENTC[k] = null; } return ENTC[k]; };
const ARSH = [2996146975, 392767087, 1943323491, 1735777505, 144602215, 4244567218]; // weapons, health, class, grenade, super, melee
H('item:detail', async (e, v) => { await ensureM();
  OBJ(v); const id = ID(v.id), h = v.h !== undefined ? HASH(v.h) : 0;
  const df = await defs();
  const r = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/Item/${id}/?components=300,301,304,305,309,310`);
  const out = { stats: [], groups: [], cos: [] };
  const sv = (r.stats && r.stats.data && r.stats.data.stats) || {};
  const inst = (r.instance && r.instance.data) || {};
  const idf = await entDef('DestinyInventoryItemDefinition', h);
  const isArmor = !!(idf && idf.itemType === 2);
  const socks = (r.sockets && r.sockets.data && r.sockets.data.sockets) || [];
  const rp = (r.reusablePlugs && r.reusablePlugs.data && r.reusablePlugs.data.plugs) || {};
  const HIDE = /shader|skin|ornament|hologram|memento|tracker|transmat|emote|projection|finisher|clan_banner/i;
  const COS = /shader|skin|ornament|holofoil/i;
  const MODS = /mod|enhancement|masterwork|tuning|catalyst/i;
  // Stat bonuses that come from plugged mods and the masterwork (the coloured part of the stat bar in DIM).
  const mbn = {}, mwn = {};
  socks.forEach((s) => {
    const act = s.plugHash && df.p[s.plugHash]; if (!act) return;
    if (/intrinsic|armor_archetypes/i.test(act.c || '')) return;
    const isMw = /masterwork|tuning/i.test(act.c || '');
    (act.s || []).forEach(([sh, val]) => { const t = isMw ? mwn : mbn; t[sh] = (t[sh] || 0) + val; });
  });
  let grp = (df.d[h] && df.sg[df.d[h].g]) || [];
  if (!grp.length && isArmor) grp = ARSH.map((sh) => ({ h: sh, max: 42, num: false }));
  for (const q of grp) {
    const cur = sv[q.h], def = df.st[q.h];
    if (cur && def) out.stats.push({ h: q.h, n: def.n, v: cur.value, max: q.max, num: q.num, o: def.o, mb: Math.max(0, Math.min(cur.value, mbn[q.h] || 0)), mw: Math.max(0, Math.min(cur.value, mwn[q.h] || 0)) });
  }
  out.stats.sort((a, b) => (isArmor ? ARSH.indexOf(a.h) - ARSH.indexOf(b.h) : a.o - b.o));
  if (isArmor) out.tot = out.stats.reduce((t, q) => t + q.v, 0);
  if (inst.energy && inst.energy.energyCapacity) out.energy = { cap: inst.energy.energyCapacity, used: inst.energy.energyUsed || 0 };
  if (inst.primaryStat) out.pw = inst.primaryStat.value;
  const perks = [], mods = [];
  socks.forEach((s, idx) => {
    if (!s.isVisible || !s.plugHash) return;
    const act = df.p[s.plugHash];
    if (act && /intrinsic/i.test(act.c || '') && !out.frame) out.frame = { n: act.n, i: act.i, d: act.d };
    if (act && act.c === 'armor_archetypes' && !out.arche) { out.arche = { n: act.n, i: act.i, d: act.d }; return; }
    if (act && COS.test(act.c || '') && !/memento|tracker/i.test(act.c || '')) { out.cos.push({ h: s.plugHash, si: idx, n: act.n, i: act.i, d: act.d, c: act.c }); return; }
    if (!act || /intrinsic/i.test(act.c || '') || /^(empty|default)\b/i.test(act.n) || HIDE.test(act.c || '')) return;
    const opts = (rp[idx] || []).map((o) => ({ h: o.plugItemHash, ci: o.canInsert !== false && o.enabled !== false, ...df.p[o.plugItemHash] })).filter((o) => o.n);
    if (!opts.some((o) => o.h === s.plugHash)) opts.unshift({ h: s.plugHash, ci: false, ...act });
    const col = opts.map((o) => ({ h: o.h, si: idx, ci: !!o.ci, n: o.n, i: o.i, d: o.d, s: o.s || [], c: o.c || '', on: o.h === s.plugHash }));
    (MODS.test(act.c || '') ? mods : perks).push(col);
  });
  if (perks.length) out.groups.push({ label: 'Perks', cols: perks });
  if (mods.length) out.groups.push({ label: 'Mods', cols: mods });
  // Set bonuses (2 and 4 piece) for armor.
  try {
    const sh = idf && idf.equippingBlock && idf.equippingBlock.equipableItemSetHash;
    const sd = sh && await entDef('DestinyEquipableItemSetDefinition', sh);
    if (sd) {
      const sp = [];
      for (const q of sd.setPerks || []) { const pd = await entDef('DestinySandboxPerkDefinition', q.sandboxPerkHash), dp = pd && pd.displayProperties; if (dp) sp.push({ n: dp.name || '', d: dp.description || '', i: dp.icon || '', rc: q.requiredSetCount || 0 }); }
      out.set = { n: (sd.displayProperties && sd.displayProperties.name) || '', h: +sh, perks: sp.sort((a, b) => a.rc - b.rc) };
    }
  } catch (er) { /* set bonus not shown */ }
  // Kill tracker, crafted weapon level and any other counters on the item.
  try {
    const od = async (oh) => { const o = await entDef('DestinyObjectiveDefinition', oh); return o ? { n: (o.progressDescription || (o.displayProperties && o.displayProperties.name) || '').slice(0, 80), cv: o.completionValue || 0 } : null; };
    const obj = [];
    const po = (r.plugObjectives && r.plugObjectives.data && r.plugObjectives.data.objectivesPerPlug) || {};
    for (const ph of Object.keys(po).slice(0, 12)) {
      const pd = df.p[ph];
      for (const o of po[ph].slice(0, 3)) { const d = await od(o.objectiveHash); if (d) obj.push({ k: /tracker/i.test((pd && pd.c) || '') ? 'tr' : 'pl', pn: (pd && pd.n) || '', i: (pd && pd.i) || '', n: d.n, p: o.progress || 0, c: o.completionValue || d.cv }); }
    }
    const io = (r.objectives && r.objectives.data && r.objectives.data.objectives) || [];
    for (const o of io.slice(0, 8)) { const d = await od(o.objectiveHash); if (d) obj.push({ k: 'it', pn: '', i: '', n: d.n, p: o.progress || 0, c: o.completionValue || d.cv }); }
    if (obj.length) out.obj = obj;
  } catch (er) { /* counters not shown */ }
  return out;
});

// Description and stack size for items that are not weapons or armor (consumables, mods, shaders, ghosts...). Looked up on click and remembered.
const INFO = {};
H('item:info', async (e, v) => {
  OBJ(v); const h = HASH(v.h);
  if (INFO[h]) return INFO[h];
  try {
    const o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + h + '/', false), dp = o.displayProperties || {};
    return (INFO[h] = { n: dp.name || '', i: dp.icon || '', d: String(dp.description || '').slice(0, 1200), fl: String(o.flavorText || '').slice(0, 600), mx: (o.inventory && o.inventory.maxStackSize) || 1, ty: o.itemTypeDisplayName || '', ti: o.itemTypeAndTierDisplayName || '' });
  } catch (er) { return { n: '', i: '', d: '', fl: '', mx: 1, ty: '', ti: '' }; }
});
// Move part of a stack (consumables). Stacks have no instance id, so the item hash and amount identify them.
const xferStack = (h, char, toVault, q) => post('/Destiny2/Actions/Items/TransferItem/', { itemReferenceHash: h, stackSize: q, transferToVault: toVault, itemId: '0', characterId: char });
H('item:stack', async (e, v) => {
  OBJ(v); const h = HASH(v.h), from = LOC(v.from), to = LOC(v.to), q = INT(v.q, 1, 1000000);
  if (from === to) return true;
  if (from !== 'vault') await step('moving to the vault', () => xferStack(h, from, true, q));
  if (to !== 'vault') await step('moving out of the vault', () => xferStack(h, to, false, q));
  return true;
});

// Lock or unlock an item (the padlock in the game). Needs a character to act through, even for vault items.
H('item:lock', async (e, v) => { OBJ(v); const id = ID(v.id), char = ID(v.char), state = v.state; await post('/Destiny2/Actions/Items/SetLockState/', { state: !!state, itemId: id, characterId: char }); return true; });
// Put a perk into a socket for free. Bungie only allows this where the game does (crafted weapons, armor mods you own...).
H('item:plug', async (e, v) => { await ensureM(); OBJ(v); const id = ID(v.id), char = ID(v.char), socket = INT(v.socket, 0, 200), plug = HASH(v.plug); await post('/Destiny2/Actions/Items/InsertSocketPlugFree/', { plug: { socketIndex: socket, socketArrayType: 0, plugItemHash: plug }, itemId: id, characterId: char }); return true; });

async function post(p, body) {
  for (let t = 0; ; t++) {
    await fresh(); if (!M) await ensureM();
    const c = rd();
    const r = await fetch(BASE + '/Platform' + p, {
      method: 'POST',
      headers: { 'X-API-Key': c.apiKey, 'User-Agent': UA, Authorization: 'Bearer ' + c.tok.access, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, membershipType: M.membershipType }),
    });
    const j = await readJson(r);
    if (j.ErrorCode === 1) return j;
    // Too many actions at once: Bungie says how long to wait. Wait and try again instead of failing the move.
    const thr = (j.ThrottleSeconds || 0) > 0 || /throttl/i.test(String(j.ErrorStatus || '')) || [36, 51, 1672].includes(j.ErrorCode);
    if (thr && t < 3) { await new Promise((res) => setTimeout(res, Math.min(5000, Math.max(600, (j.ThrottleSeconds || 1) * 1000)))); continue; }
    throw new Error(j.Message || 'Bungie error ' + j.ErrorCode);
  }
}
const xfer = (it, char, toVault) => post('/Destiny2/Actions/Items/TransferItem/', { itemReferenceHash: it.h, stackSize: 1, transferToVault: toVault, itemId: it.id, characterId: char });
// Where is this item right now? Asks Bungie instead of trusting what the screen last showed.
async function locate(id) {
  const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=102,201,205`);
  if ((pr.profileInventory.data.items || []).some((x) => x.itemInstanceId === id)) return { loc: 'vault', e: 0 };
  for (const [ch, o] of Object.entries(pr.characterInventories.data)) if (o.items.some((x) => x.itemInstanceId === id)) return { loc: ch, e: 0 };
  for (const [ch, o] of Object.entries(pr.characterEquipment.data)) if (o.items.some((x) => x.itemInstanceId === id)) return { loc: ch, e: 1 };
  return null;
}
const step = async (what, fn) => { try { return await fn(); } catch (e) { throw new Error(what + ': ' + e.message); } };
// Moving between two characters goes through the vault: character -> vault -> character.
// Trusts where the screen says the item is and goes straight to the transfer (no extra look-up first, which cost a second or more per move).
// Only if that fails does it ask Bungie where the item really is and try once more from there.
async function mvRaw(it, from, to) {
  if (from !== 'vault') await step('moving ' + it.n + ' to the vault', () => xfer(it, from, true));
  if (to !== 'vault') {
    try { await step('moving ' + it.n + ' out of the vault', () => xfer(it, to, false)); }
    catch (e) { await new Promise((r) => setTimeout(r, 900)); await step('moving ' + it.n + ' out of the vault (retry)', () => xfer(it, to, false)); }
  }
}
async function mv(it, from, to) {
  if (from === to) return;
  try { await mvRaw(it, from, to); return; }
  catch (first) {
    const now = await locate(it.id);
    if (!now) throw new Error(it.n + ' was not found on this account any more (it may be in the postmaster or was dismantled). Press Refresh.');
    if (now.e) throw new Error(it.n + ' is equipped. Equip something else in that slot first.');
    if (now.loc === to) return;
    if (now.loc === from) throw first;
    await mvRaw(it, now.loc, to);
  }
}
H('item:move', async (e, v) => { OBJ(v); await mv(ITEM(v.item), LOC(v.from), LOC(v.to)); return true; });
H('item:equip', async (e, v) => {
  OBJ(v); const item = ITEM(v.item), to = ID(v.to);
  if (item.loc !== to) await mv(item, item.loc, to);
  await post('/Destiny2/Actions/Items/EquipItem/', { itemId: item.id, characterId: to });
  return true;
});
// Putting a set of gear on one character, the way DIM does it:
//  1. anything that is equipped on ANOTHER character first gets a stand-in equipped there (an equipped item cannot be moved);
//  2. everything else is moved here, and one item that cannot move never stops the others;
//  3. non-exotics are equipped before exotics (otherwise swapping one exotic for another is refused), then Bungie's answer for
//     EACH item is read, because Bungie says "OK" for the whole request even when some items were refused;
//  4. refused items get one more try on their own.
// What could not be done comes back by name so it can be shown instead of silently left out.
const LITEM = (it) => ({ ...ITEM(it), ex: it.ex ? 1 : 0, b: it.b ? HASH(it.b) : 0 });
const equipOne = (id, char) => post('/Destiny2/Actions/Items/EquipItem/', { itemId: id, characterId: char });
const EQ_WHY = { 1641: 'only one exotic weapon and one exotic armor piece can be worn at once', 1642: 'there was no room for it', 1634: 'the game does not allow equipping right now (go to orbit, a social space, or get out of combat)', 1671: 'the game does not allow equipping right now (go to orbit, a social space, or get out of combat)', 1623: 'it was not found on the character', 1660: 'that character cannot use it' };
const LOLOG = (t) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'loadout-log.txt'), new Date().toISOString() + ' ' + t + '\n'); } catch (e) { /* log only */ } };
// Applying a loadout, planned here from a FRESH read of the account (never from what the screen last showed), the way DIM does it:
//  1. gear equipped on ANOTHER character gets a stand-in equipped there first (an equipped item cannot be moved);
//  2. when a character's slot is full (9 items besides the equipped one), the least useful item that is not in the loadout goes to the vault to make room;
//  3. an exotic already worn in a slot the loadout does not change is swapped for a non-exotic first, otherwise the loadout's exotic is refused;
//  4. one request equips everything (non-exotics before exotics); Bungie's answer for EACH item is read and refused items get one more try alone.
// Everything is written to loadout-log.txt, and what could not be done comes back by name with the reason.
const GEARB = new Set([1498876634, 2465295065, 953998645, 3448274439, 3551918588, 14239492, 20886954, 1585787867, 4023194814, 2025709351, 284967655]);
const WGRP = new Set([1498876634, 2465295065, 953998645]), AGRP = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);
const SUBB = 3284755031, PMB = 215593132, SLOTCAP = 9;
const UNDO = {}; // what each character wore before the last loadout, for one-click undo
H('loadout:apply', (e, v) => applyLo(v));
H('loadout:undo', async (e, v) => {
  OBJ(v); const char = ID(v.char), u = UNDO[char];
  if (!u) throw new Error('There is nothing to undo on this character.');
  const r = await applyLo({ items: u.items, carry: [], char, undo: 1 });
  delete UNDO[char];
  return r;
});
H('loadout:canUndo', (e, v) => { OBJ(v); const u = UNDO[ID(v.char)]; return u ? { at: u.at, n: u.items.length } : null; });
async function applyLo(v) {
  OBJ(v); await ensureM();
  const want = ARR(v.items, 20).map(LITEM), char = ID(v.char), carryIn = ARR(v.carry || [], 40).map(LITEM);
  const failed = [], note = (it, why) => { failed.push({ id: it.id, n: it.n, why }); LOLOG('apply: PROBLEM ' + it.n + ': ' + why); };
  const df = await defs();
  const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=102,200,201,205,300`);
  const inst = (pr.itemComponents && pr.itemComponents.instances && pr.itemComponents.instances.data) || {};
  const clsOf = {}; for (const [k, c] of Object.entries((pr.characters && pr.characters.data) || {})) clsOf[k] = c.classType;
  if (clsOf[char] === undefined) throw new Error('That character was not found on this account.');
  const W = new Map();
  const add = (it, loc, eq) => {
    if (!it.itemInstanceId || it.bucketHash === PMB) return;
    const d = df.d[it.itemHash] || df.g[it.itemHash] || {};
    W.set(it.itemInstanceId, { id: it.itemInstanceId, h: it.itemHash, b: d.b || it.bucketHash, loc, e: eq, ex: d.r === 'Exotic', cls: d.c === undefined ? 3 : d.c, lk: !!(it.state & 1), n: d.n || 'item', p: ((inst[it.itemInstanceId] || {}).primaryStat || {}).value || 0 });
  };
  ((pr.profileInventory && pr.profileInventory.data && pr.profileInventory.data.items) || []).forEach((it) => add(it, 'vault', 0));
  for (const [ch, o] of Object.entries((pr.characterInventories && pr.characterInventories.data) || {})) (o.items || []).forEach((it) => add(it, ch, 0));
  for (const [ch, o] of Object.entries((pr.characterEquipment && pr.characterEquipment.data) || {})) (o.items || []).forEach((it) => add(it, ch, 1));
  const before = [...W.values()].filter((x) => x.loc === char && x.e && GEARB.has(x.b)).map((x) => ({ id: x.id, h: x.h, n: x.n, loc: char, b: x.b, ex: x.ex ? 1 : 0 }));
  const live = (it) => { const x = W.get(it.id); if (!x) note(it, 'it is not on this account any more (dismantled, or in the postmaster). Press Refresh.'); return x; };
  const eqList = want.map(live).filter(Boolean), carry = carryIn.map(live).filter(Boolean);
  const keep = new Set([...eqList, ...carry].map((x) => x.id));
  const fits = (x, c) => !AGRP.has(x.b) || x.cls === 3 || x.cls === clsOf[c];
  LOLOG('apply: ---- ' + eqList.length + ' to equip, ' + carry.length + ' to carry, on ' + char.slice(-4));
  const unequippedIn = (loc, b) => { let n = 0; for (const x of W.values()) if (x.loc === loc && x.b === b && !x.e) n++; return n; };
  async function makeRoom(loc, b) {
    const pool = [...W.values()].filter((x) => x.loc === loc && x.b === b && !x.e && !keep.has(x.id)).sort((p, q) => (p.lk - q.lk) || (p.ex - q.ex) || (p.p - q.p));
    if (!pool[0]) throw new Error('there is no room in that slot on the character and everything there is part of the loadout');
    await step('making room (moving ' + pool[0].n + ' to the vault)', () => xfer(pool[0], loc, true)); pool[0].loc = 'vault';
    LOLOG('apply: made room, moved ' + pool[0].n + ' to the vault');
  }
  async function move(x, to) {
    if (x.loc === to) return;
    if (x.e) throw new Error('it is equipped on another character');
    if (x.loc !== 'vault') { await step('moving it to the vault', () => xfer(x, x.loc, true)); x.loc = 'vault'; }
    if (to !== 'vault') {
      if (GEARB.has(x.b) && unequippedIn(to, x.b) >= SLOTCAP) await makeRoom(to, x.b);
      try { await step('moving it to the character', () => xfer(x, to, false)); }
      catch (er) { if (GEARB.has(x.b)) { await makeRoom(to, x.b).catch(() => {}); await step('moving it to the character (retry)', () => xfer(x, to, false)); } else throw er; }
      x.loc = to;
    }
    LOLOG('apply: moved ' + x.n + ' to ' + (to === 'vault' ? 'the vault' : to.slice(-4)));
  }
  const setEquipped = (x, c) => { for (const o of W.values()) if (o.loc === c && o.b === x.b && o.e) o.e = 0; x.loc = c; x.e = 1; };
  // A stand-in can come from this character, the vault, or another character's inventory (nearest first).
  const near = (o, c) => (o.loc === c ? 0 : o.loc === 'vault' ? 1 : 2);
  const standIn = (b, c, notEx) => [...W.values()].filter((o) => o.b === b && !o.e && !keep.has(o.id) && o.b !== SUBB && fits(o, c) && (!notEx || !o.ex))
    .sort((p, q) => (p.ex - q.ex) || (near(p, c) - near(q, c)) || (q.p - p.p))[0];
  // 1. stand-ins on other characters
  for (const x of [...eqList, ...carry]) {
    if (!x.e || x.loc === char) continue;
    const oc = x.loc, r = standIn(x.b, oc, true) || standIn(x.b, oc, false);
    if (!r) { note(x, 'it is equipped on another character and nothing else could be put on in its place'); keep.delete(x.id); continue; }
    try { await move(r, oc); await step('equipping a stand-in', () => equipOne(r.id, oc)); setEquipped(r, oc); x.e = 0; LOLOG('apply: stand-in ' + r.n + ' equipped on ' + oc.slice(-4)); }
    catch (er) { note(x, 'it is equipped on another character and the stand-in failed: ' + er.message); keep.delete(x.id); }
  }
  // 2. bring everything here
  const here = [];
  for (const x of [...carry, ...eqList]) {
    if (!keep.has(x.id)) continue;
    if (x.loc === char) { if (eqList.includes(x)) here.push(x); continue; }
    if (x.b === SUBB) { note(x, 'subclasses cannot move between characters'); continue; }
    try { await move(x, char); if (eqList.includes(x)) here.push(x); }
    catch (er) { note(x, String(er.message || er)); }
  }
  // 3. exotic rules: one exotic weapon and one exotic armor piece
  const extra = [];
  for (const grp of [WGRP, AGRP]) {
    const lx = here.filter((x) => grp.has(x.b) && x.ex);
    lx.slice(1).forEach((x) => { note(x, 'only one exotic ' + (grp === WGRP ? 'weapon' : 'armor piece') + ' can be worn at once'); here.splice(here.indexOf(x), 1); });
    if (!lx.length) continue;
    const covered = new Set(here.map((x) => x.b));
    for (const o of [...W.values()]) {
      if (o.loc !== char || !o.e || !o.ex || !grp.has(o.b) || covered.has(o.b)) continue;
      const r = standIn(o.b, char, true);
      if (!r) { LOLOG('apply: no non-exotic found to replace ' + o.n); continue; }
      try { await move(r, char); extra.push(r); covered.add(o.b); LOLOG('apply: swapping out exotic ' + o.n + ' for ' + r.n); } catch (er) { LOLOG('apply: could not bring ' + r.n + ': ' + er.message); }
    }
  }
  // 4. equip
  const need = here.filter((x) => !(x.e && x.loc === char)); // already worn: nothing to do
  const toEq = [...extra, ...need.filter((x) => !x.ex), ...need.filter((x) => x.ex)];
  let bad = [];
  if (toEq.length) {
    const r = await step('equipping', () => post('/Destiny2/Actions/Items/EquipItems/', { itemIds: toEq.map((x) => x.id), characterId: char }));
    const res = (r.Response && r.Response.equipResults) || [];
    LOLOG('apply: equip results ' + JSON.stringify(res));
    bad = res.filter((q) => q.equipStatus !== 1);
  }
  for (const q of bad) {
    const x = toEq.find((o) => o.id === q.itemInstanceId) || { id: q.itemInstanceId, n: 'An item' };
    try { await equipOne(x.id, char); LOLOG('apply: retry equipped ' + x.n); }
    catch (er) { if (here.includes(x)) note(x, EQ_WHY[q.equipStatus] || String(er.message || er)); }
  }
  LOLOG('apply: done, ' + failed.length + ' problem(s)');
  if (!v.undo && toEq.length && before.length) UNDO[char] = { items: before, at: Date.now() };
  return { failed, undo: !v.undo && !!UNDO[char] && toEq.length > 0 };
}

H('lo:defs', async () => { const o = await lodefs(); const arr = (m) => Object.keys(m).filter((k) => m[k]).map((k) => ({ h: +k, v: m[k] })); return { names: arr(o.names), colors: arr(o.colors), icons: arr(o.icons) }; });
const LV = (v) => { OBJ(v); const o = { index: INT(v.index, 0, 50), char: ID(v.char) }; for (const k of ['ch', 'ih', 'nh']) if (v[k] !== undefined && v[k] !== null) o[k] = HASH(v[k]); return o; };
// In-game loadout actions are logged too, so a refusal from Bungie can be read afterwards.
const lolog = (what, v, pr) => pr.then((r) => { LOLOG('ingame: ' + what + ' slot ' + (v.index + 1) + ' on ' + v.char.slice(-4) + ': ok'); return r; }, (er) => { LOLOG('ingame: ' + what + ' slot ' + (v.index + 1) + ' on ' + v.char.slice(-4) + ': FAILED ' + er.message); throw er; });
const lopost = (what, p, v) => { v = LV(v); return lolog(what, v, step(what, () => post(p, { loadoutIndex: v.index, characterId: v.char, colorHash: v.ch, iconHash: v.ih, nameHash: v.nh }))); };
H('lo:equip', (e, v) => { v = LV(v); return lolog('equip', v, step('equipping the loadout', () => post('/Destiny2/Actions/Loadouts/EquipLoadout/', { loadoutIndex: v.index, characterId: v.char }))).then(() => true); });
H('lo:snap', (e, v) => lopost('saving the loadout', '/Destiny2/Actions/Loadouts/SnapshotLoadout/', v).then(() => true));
H('lo:ident', (e, v) => lopost('renaming the loadout', '/Destiny2/Actions/Loadouts/UpdateLoadoutIdentifiers/', v).then(() => true));
H('lo:clear', (e, v) => { v = LV(v); return lolog('clear', v, step('clearing the loadout', () => post('/Destiny2/Actions/Loadouts/ClearLoadout/', { loadoutIndex: v.index, characterId: v.char }))).then(() => true); });
// Pull items out of the postmaster onto a character.
H('pm:pull', async (e, v) => {
  OBJ(v); const items = ARR(v.items, 50).map(PITEM), char = ID(v.char);
  // Each item on its own: one that cannot come out (a full slot, for example) no longer stops the rest, and the page is told
  // exactly which ones stayed, so only those go back into the postmaster on screen.
  let n = 0; const failed = [];
  for (const it of items) {
    if (it.eg) continue;
    try { await step('pulling ' + it.n + ' from the postmaster', () => post('/Destiny2/Actions/Items/PullFromPostmaster/', { itemReferenceHash: it.h, stackSize: it.q || 1, itemId: it.inst || it.id, characterId: char })); n++; }
    catch (e) { failed.push({ id: it.id, n: it.n, why: String((e && e.message) || e).slice(0, 160) }); }
  }
  if (!n && failed.length) throw new Error(failed[0].why);
  return { n, revert: failed.map((f) => f.id), failed };
});

// ---------------- updates ----------------
let updater = null;
try { updater = require('electron-updater').autoUpdater; } catch (e) { /* only present in the installed app */ }
const upd = { state: 'idle', version: '', pct: 0 };
const pushUpd = (o) => { Object.assign(upd, o); if (win && !win.isDestroyed()) win.webContents.send('upd', upd); };
function setupUpdater() {
  if (!updater || !app.isPackaged) return;
  updater.autoDownload = true;
  updater.allowDowngrade = false; updater.allowPrerelease = false;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => pushUpd({ state: 'checking' }));
  updater.on('update-available', (i) => pushUpd({ state: 'downloading', version: i.version, pct: 0 }));
  updater.on('update-not-available', () => pushUpd({ state: 'current' }));
  updater.on('download-progress', (p) => pushUpd({ state: 'downloading', pct: Math.round(p.percent || 0) }));
  updater.on('update-downloaded', (i) => pushUpd({ state: 'ready', version: i.version }));
  updater.on('error', (e) => pushUpd({ state: 'error', error: String((e && e.message) || e).slice(0, 200) }));
  const chk = () => updater.checkForUpdates().catch(() => {});
  chk(); setInterval(chk, 4 * 3600 * 1000);
}
H('upd:info', () => ({ ...upd, current: app.getVersion(), packaged: app.isPackaged, canUpdate: !!updater && app.isPackaged }));
H('upd:check', () => { if (updater && app.isPackaged) updater.checkForUpdates().catch(() => {}); return true; });
H('upd:install', () => { if (updater) updater.quitAndInstall(true, true); return true; });

// One copy of the app at a time (two copies would fight over the saved settings).
try { app.setPath('userData', path.join(app.getPath('appData'), 'guardian-toolkit')); } catch (e) { /* keep default */ }
// Windows: the app's own ID (the one the installer puts on its shortcuts), so the taskbar button, its right-click menu and
// pins all belong to the installed Pathfinder and show its current icon, not an old icon Windows cached for the program file.
const AUMID = 'local.guardian.toolkit';
if (process.platform === 'win32' && !WEB) { try { app.setAppUserModelId(AUMID); } catch (e) { /* older Windows */ } }
if (!app.requestSingleInstanceLock()) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
// No website or page inside the app may ask for the camera, microphone, location, notifications and so on.
// The one exception: Hub sites may put text on the clipboard (their "copy" buttons, like copying a checkpoint bot's name). Reading the clipboard stays blocked.
const CLIPW = (p) => p === 'clipboard-sanitized-write';
app.on('session-created', (s) => { s.setPermissionRequestHandler((wc, p, cb) => cb(CLIPW(p))); s.setPermissionCheckHandler((wc, p) => CLIPW(p)); });
// Keep the app light on disk: a small picture cache, and old leftovers removed on start.
app.commandLine.appendSwitch('disk-cache-size', String(64 * 1024 * 1024));
function tidyDisk() {
  const ud = app.getPath('userData');
  // item data from older versions of the app (replaced by defs6.json)
  for (const f of ['defs.json', 'defs2.json', 'defs3.json', 'defs4.json', 'defs5.json']) { try { fs.unlinkSync(path.join(ud, f)); } catch (e) { /* not there */ } }
  // logs never grow past a few hundred KB
  for (const f of ['loadout-log.txt', 'art-log.txt', 'auth-log.txt']) { try { const p = path.join(ud, f), st = fs.statSync(p); if (st.size > 300 * 1024) { const t = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, t.slice(-100 * 1024)); } } catch (e) { /* not there */ } }
  // installers the updater downloaded for versions that are already installed
  try {
    const dir = path.join(process.env.LOCALAPPDATA || '', 'guardian-toolkit-updater', 'pending'), cur = app.getVersion().split('.').map(Number);
    const older = (v) => { const a = v.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (cur[i] || 0)) return (a[i] || 0) < (cur[i] || 0); } return true; };
    for (const f of fs.readdirSync(dir)) { const m = /(\d+\.\d+\.\d+)/.exec(f); if (m && older(m[1])) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) { /* in use */ } } }
  } catch (e) { /* no updater folder */ }
}
// The .ico carries simplified small sizes (the dotted ring is dropped at 16-32 px), so the title bar and taskbar stay crisp.
function winIcon() { const ico = path.join(__dirname, 'build', 'icon.ico'); return process.platform === 'win32' && fs.existsSync(ico) ? ico : path.join(__dirname, 'build', 'icon.png'); }
app.whenReady().then(async () => {
  if (app.isPackaged) setTimeout(tidyDisk, 15000);
  // Bungie's web login cookies are "session" cookies, which Electron throws away when the app closes, so every restart forgot the login
  // and the quiet hourly re-sign-in had to ask again. Give those cookies a long life so the login is remembered like in a normal browser.
  try {
    const bs = session.fromPartition('persist:bungie');
    bs.cookies.on('changed', (ev, c, cause, removed) => {
      if (removed || !c.session || !/(^|\.)bungie\.net$/i.test(c.domain || '')) return;
      const host = String(c.domain).replace(/^\./, '');
      bs.cookies.set({ url: 'https://' + host + (c.path || '/'), name: c.name, value: c.value, domain: c.domain, path: c.path || '/', secure: !!c.secure, httpOnly: !!c.httpOnly, sameSite: c.sameSite, expirationDate: Date.now() / 1000 + 60 * 86400 }).catch(() => { /* leave it as a session cookie */ });
    });
  } catch (e) { /* cookies stay session-only */ }
  session.defaultSession.setPermissionRequestHandler((wc, p, cb) => cb(CLIPW(p))); session.defaultSession.setPermissionCheckHandler((wc, p) => CLIPW(p));
  session.fromPartition('persist:hub').setPermissionRequestHandler((wc, p, cb) => cb(CLIPW(p))); session.fromPartition('persist:hub').setPermissionCheckHandler((wc, p) => CLIPW(p));
  // Keep an Edit menu (never shown) so Ctrl+C/V/X/A/Z work in text fields.
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Edit', submenu: [
    { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
    { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
  ] }]));
  win = new BrowserWindow({ width: 1200, height: 850, backgroundColor: '#07090e', title: 'Pathfinder', icon: winIcon(), autoHideMenuBar: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: true, spellcheck: false } });
  // Alt used to pop the Edit menu up in the top-left corner. Keep the menu (so Ctrl+C/V/X/A/Z still work) but never show its bar.
  win.setMenuBarVisibility(false);
  // The icon Windows shows for this window's right-click menu and for pins made from it. Windows cannot read a file inside
  // the app package and keeps old icons by file path, so the icon is copied out under a name that changes with its contents.
  if (process.platform === 'win32' && !WEB) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, 'build', 'icon.ico'));
      const dst = path.join(app.getPath('userData'), 'pathfinder-' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10) + '.ico');
      if (!fs.existsSync(dst)) fs.writeFileSync(dst, buf);
      win.setAppDetails({ appId: AUMID, appIconPath: dst, appIconIndex: 0, relaunchCommand: '"' + process.execPath + '"', relaunchDisplayName: 'Pathfinder' });
    } catch (e) { /* the window keeps its normal icon */ }
  }
  // The app window never leaves its own page. Links open in your normal browser (web addresses only).
  const openExt = (u) => { try { const p = new URL(u); if (p.protocol === 'https:' || p.protocol === 'http:') shell.openExternal(p.href); } catch (er) { /* ignore */ } };
  win.webContents.on('will-navigate', (ev, u) => { ev.preventDefault(); openExt(u); });
  win.webContents.setWindowOpenHandler(({ url }) => { openExt(url); return { action: 'deny' }; });
  // The Hub tab shows a few Destiny websites in locked-down embedded pages: no Node access, only that site, links open in your browser.
  win.webContents.on('will-attach-webview', (e, prefs, params) => {
    delete prefs.preload; delete prefs.preloadURL; prefs.nodeIntegration = false; prefs.nodeIntegrationInSubFrames = false; prefs.contextIsolation = true; prefs.sandbox = true; prefs.webSecurity = true; prefs.allowRunningInsecureContent = false;
    params.allowpopups = 'false'; if (!/^persist:hub-[a-z]{1,12}$/.test(params.partition || '')) params.partition = 'persist:hub';
    if (!HUBRE.test(params.src || '')) e.preventDefault();
  });
  // Right-click menu for text fields and selected text.
  win.webContents.on('context-menu', (e, params) => {
    if (!params.isEditable && !params.selectionText) return;
    Menu.buildFromTemplate([{ role: 'cut', enabled: params.isEditable }, { role: 'copy' }, { role: 'paste', enabled: params.isEditable }, { type: 'separator' }, { role: 'selectAll' }]).popup();
  });
  await win.loadFile(path.join(__dirname, 'app', 'index.html'));
  setupUpdater();
});
app.on('web-contents-created', (e, wc) => {
  if (wc.getType() !== 'webview') return;
  const ext = (u) => { try { const p = new URL(u); if (p.protocol === 'https:' || p.protocol === 'http:') shell.openExternal(p.href); } catch (er) { /* ignore */ } };
  // Present as a normal browser (no Electron or app name in the user agent) so sites don't treat the embedded page as a bot.
  try {
    const nm = String(app.getName() || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let ua = wc.getUserAgent().replace(/\sElectron\/\S+/i, '');
    if (nm) ua = ua.replace(new RegExp('\\s' + nm + '\\/\\S+', 'i'), '');
    wc.setUserAgent(ua);
  } catch (er) { /* keep default */ }
  // Links that would open a new tab stay inside the page when they go to one of the Hub sites (loot tables and the like); anything else opens in your browser.
  wc.setWindowOpenHandler(({ url }) => {
    if (HUBRE.test(url)) setTimeout(() => { try { if (!wc.isDestroyed()) wc.loadURL(url); } catch (er) { /* ignore */ } }, 0);
    else ext(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (ev, u) => { if (!HUBRE.test(u)) { ev.preventDefault(); ext(u); } });
  // Some sites mark every link as "new tab"; turn those into normal clicks so you can move around inside the Hub.
  wc.on('dom-ready', () => {
    const code = '(()=>{if(window.__gtl)return;window.__gtl=1;const ok=new RegExp(' + JSON.stringify(HUBRE.source) + ',"i");document.addEventListener("click",function(e){try{if(e.defaultPrevented||e.button!==0)return;const a=e.target&&e.target.closest&&e.target.closest("a[href]");if(a&&(a.target==="_blank"||a.target==="_new")&&ok.test(a.href)){e.preventDefault();location.href=a.href}}catch(x){}},true)})()';
    try { wc.executeJavaScript(code).catch(() => {}); } catch (er) { /* ignore */ }
  });
});
app.on('window-all-closed', () => app.quit());

// ---------------- DIM wish lists (several lists, saved on this computer) ----------------
const wlPath = () => path.join(app.getPath('userData'), 'wishlist.json');
function parseWL(text) {
  const rolls = {}; let block = '', n = 0, title = '', desc = '';
  for (let line of String(text).replace(/^﻿/, '').split(/\r?\n/)) {
    line = line.trim();
    if (!line) { block = ''; continue; }
    if (line.startsWith('//')) { const q = line.match(/^\/\/\s*notes:\s*(.*)$/i); if (q) block = q[1].trim(); continue; }
    let q;
    if ((q = line.match(/^title:\s*(.*)$/i))) { if (!title) title = q[1].trim().slice(0, 120); continue; }
    if ((q = line.match(/^description:\s*(.*)$/i))) { if (!desc) desc = q[1].trim().slice(0, 300); continue; }
    // DIM wish list lines start with "dimwishlist:" (older files use "dimwish:").
    const pre = line.match(/^dimwish(?:list)?:/i); if (!pre) continue;
    let note = block, tags = '', body = line.slice(pre[0].length);
    const hi = body.indexOf('#notes:');
    if (hi >= 0) { const nt = body.slice(hi + 7); const ti = nt.indexOf('|tags:'); note = (ti >= 0 ? nt.slice(0, ti) : nt).trim() || block; if (ti >= 0) tags = nt.slice(ti + 6).trim().slice(0, 40); body = body.slice(0, hi); }
    else if (body.indexOf('#') >= 0) body = body.slice(0, body.indexOf('#'));
    let item = 0, pk = [];
    for (const kv of body.split('&')) {
      const [k, v] = kv.split('=');
      if (k === 'item') item = parseInt(v, 10);
      else if (k === 'perks') pk = (v || '').split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0);
    }
    if (!item) continue;
    const wild = item === -69420, trash = item < 0 && !wild, key = wild ? '*' : Math.abs(item);
    if (wild && !pk.length) continue;
    (rolls[key] = rolls[key] || []).push([pk, note.slice(0, 200), trash ? 1 : 0, tags]);
    n++;
  }
  return { n, rolls, title, desc };
}
// Only public https addresses: no localhost, no private network ranges, capped size and time.
function badHost(h) {
  h = String(h).replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) { const [a, b2] = h.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b2 === 254) || (a === 172 && b2 >= 16 && b2 <= 31) || (a === 192 && b2 === 168) || (a === 100 && b2 >= 64 && b2 <= 127) || a >= 224; }
  if (h.includes(':')) return h === '::1' || h === '::' || /^f[cd]/.test(h) || h.startsWith('fe80') || h.startsWith('::ffff');
  return false;
}
const WL_MAX = 150e6;
async function wlDownload(u) {
  let url; try { url = new URL(u); } catch (e) { throw new Error('That is not a valid link.'); }
  if (url.protocol !== 'https:') throw new Error('Wish list links must start with https://');
  if (badHost(url.hostname)) throw new Error('That address is not allowed.');
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 90000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal, redirect: 'follow' });
    if (r.url) { const f = new URL(r.url); if (f.protocol !== 'https:' || badHost(f.hostname)) throw new Error('The link redirected somewhere that is not allowed.'); }
    if (!r.ok) throw new Error('Could not download it (HTTP ' + r.status + ').');
    if ((+r.headers.get('content-length') || 0) > WL_MAX) throw new Error('That file is too big to be a wish list.');
    const parts = []; let size = 0;
    for await (const c of r.body) { size += c.length; if (size > WL_MAX) throw new Error('That file is too big to be a wish list.'); parts.push(c); }
    return Buffer.concat(parts).toString('utf8');
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('The download took too long.');
    throw e;
  } finally { clearTimeout(to); }
}
// Wish lists are big (a few hundred thousand rolls) and most rolls repeat the same few thousand notes. On disk each note is stored once
// and the file is compressed, so it takes a couple of MB instead of 100+. They are read once and then kept in memory.
const wlPath2 = () => path.join(app.getPath('userData'), 'wishlist.dat');
let WLC = null;
function wlPack(lists) {
  const notes = [], ix = new Map(), ni = (n) => { n = n || ''; let i = ix.get(n); if (i === undefined) { i = notes.length; notes.push(n); ix.set(n, i); } return i; };
  const out = lists.map((l) => {
    const rolls = {};
    for (const k in l.rolls || {}) rolls[k] = l.rolls[k].map((r) => { const o = [r[0].join(','), ni(r[1])]; if (r[2] || r[3] || r[4]) { o.push(r[2] ? 1 : 0); if (r[3] || r[4]) o.push(r[3] || ''); if (r[4]) o.push(r[4]); } return o; });
    return { ...l, rolls };
  });
  return { v: 3, notes, lists: out };
}
function wlUnpack(j) {
  const nt = j.notes || [];
  return j.lists.map((l) => {
    const rolls = {};
    for (const k in l.rolls || {}) rolls[k] = l.rolls[k].map((o) => [o[0] ? String(o[0]).split(',').map(Number) : [], nt[o[1]] || '', o[2] ? 1 : 0, o[3] || '', ...(o[4] ? [o[4]] : [])]);
    return { ...l, rolls };
  });
}
function wlRead() {
  if (WLC) return WLC.slice();
  try {
    const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(wlPath2())).toString('utf8'));
    if (j && Array.isArray(j.lists)) { WLC = wlUnpack(j); return WLC.slice(); }
  } catch (e) { /* not saved in the new format yet */ }
  try {
    const j = JSON.parse(fs.readFileSync(wlPath(), 'utf8'));
    let lists = null;
    if (Array.isArray(j.lists)) lists = j.lists;
    else if (j.rolls && j.n) { // older single-list file
      const src = (j.src || []).filter(Boolean);
      lists = src.length ? src.map((u, i) => ({ id: 'm' + i, url: u, title: '', desc: '', n: 0, at: 0, rolls: i === 0 && src.length === 1 ? j.rolls : {} }))
        : [{ id: 'm0', url: '', title: 'Pasted wish list', desc: '', n: j.n, at: j.at || 0, rolls: j.rolls }];
    }
    if (lists) { wlWrite(lists, true); return lists.slice(); } // move the old big file to the small format
  } catch (e) { /* none saved yet */ }
  return [];
}
let wlQ = Promise.resolve();
function wlWrite(lists, dropOld) {
  WLC = lists.slice();
  const data = JSON.stringify(wlPack(lists));
  wlQ = wlQ.then(() => new Promise((res) => zlib.gzip(data, { level: 6 }, async (er, buf) => {
    if (!er) {
      try {
        const tmp = wlPath2() + '.tmp'; await fs.promises.writeFile(tmp, buf); await fs.promises.rename(tmp, wlPath2());
        if (dropOld) await fs.promises.unlink(wlPath()).catch(() => {});
      } catch (e) { console.error('wish list save', e && e.message); }
    }
    res();
  })));
}
// What the app window gets: every note once, each roll points to its note by number, and perks are sent as text (sending it all as-is was ~100 MB).
function wlPub(lists) {
  const rolls = {}, notes = [], ix = new Map(); let n = 0;
  const ni = (s) => { s = s || ''; let i = ix.get(s); if (i === undefined) { i = notes.length; notes.push(s); ix.set(s, i); } return i; };
  for (const l of lists) for (const k in l.rolls || {}) { const dst = (rolls[k] = rolls[k] || []); for (const r of l.rolls[k]) dst.push([r[0].join(','), ni(r[1]), r[2], r[3]]); n += l.rolls[k].length; }
  return { n, rolls, notes, lists: lists.map(({ rolls: _r, ...meta }) => meta) };
}
async function wlRefreshOne(l) {
  try {
    const o = parseWL(await wlDownload(l.url));
    if (!o.n) throw new Error('No wish list rolls found. A wish list file has lines that start with dimwishlist:');
    Object.assign(l, { title: o.title || l.title || '', desc: o.desc || l.desc || '', n: o.n, rolls: o.rolls, at: Date.now(), err: '' });
  } catch (e) { l.err = String((e && e.message) || e).slice(0, 200); }
}
const wlId = () => 'w' + crypto.randomBytes(5).toString('hex');
// Lists loaded from links refresh themselves every few hours (like DIM); if that fails, the saved copy keeps working.
H('wl:get', async () => {
  const lists = wlRead();
  const stale = lists.filter((l) => l.url && Date.now() - (l.at || 0) > 6 * 3600 * 1000);
  if (stale.length) {
    try { await Promise.race([Promise.all(stale.map(wlRefreshOne)), new Promise((_, rj) => setTimeout(() => rj(new Error('slow')), 12000))]); wlWrite(lists); } catch (e) { /* keep saved copies */ }
  }
  return wlPub(lists);
});
// Adds list(s): links (one or several), or pasted wish list text. Existing lists stay.
H('wl:set', async (e, v) => {
  OBJ(v); const url = v.url === undefined ? '' : TXT(v.url, 5000), text = v.text === undefined ? '' : TXT(v.text, 26e6), name = v.name === undefined ? '' : TXT(v.name, 200);
  const splitUrls = (s) => String(s || '').split(/\s+/).filter((x) => /^https?:\/\//i.test(x));
  const raw = String(text || '').trim();
  let urls = splitUrls(url), t = '';
  if (raw) { const u = splitUrls(raw); if (u.length && u.length === raw.split(/\s+/).filter(Boolean).length) urls = urls.concat(u); else t = raw; }
  if (!urls.length && !t) throw new Error('Enter a link or paste the wish list text.');
  if (t.length > WL_MAX) throw new Error('That text is too big to be a wish list.');
  let lists = wlRead(); const errs = []; let added = 0;
  for (const u of [...new Set(urls)].slice(0, 10)) {
    const l = { id: wlId(), url: u, title: '', desc: '', n: 0, at: 0, rolls: {} };
    await wlRefreshOne(l);
    if (l.err) { errs.push(u + ' - ' + l.err); continue; }
    lists = lists.filter((x) => x.url !== u); lists.push(l); added++;
  }
  if (t) {
    const o = parseWL(t);
    if (!o.n) errs.push('The pasted text has no wish list rolls (lines starting with dimwishlist:).');
    else { lists.push({ id: wlId(), url: '', title: String(name || o.title || 'Pasted wish list').slice(0, 120), desc: o.desc, n: o.n, at: Date.now(), rolls: o.rolls }); added++; }
  }
  if (!added) throw new Error(errs.join(' ') || 'Nothing was added.');
  if (lists.length > 20) lists = lists.slice(-20);
  wlWrite(lists); wlTouch();
  const pub = wlPub(lists); if (errs.length) pub.warn = errs.join(' ');
  return pub;
});
H('wl:remove', (e, v) => { const id = TXT(OBJ(v).id, 20); const lists = wlRead().filter((l) => l.id !== id); wlWrite(lists); wlTouch(); return wlPub(lists); });
H('wl:refresh', async () => { const lists = wlRead(); await Promise.all(lists.filter((l) => l.url).map(wlRefreshOne)); wlWrite(lists); return wlPub(lists); });
H('wl:clear', async () => { WLC = null; wlTouch(); wlQ = wlQ.then(() => Promise.all([wlPath(), wlPath2()].map((f) => fs.promises.unlink(f).catch(() => {})))); await wlQ; return true; });

// ---------------- wish list maker: "My wish list" is a list you build from your own weapons ----------------
const mineOf = (lists) => { let l = lists.find((x) => x.id === 'mine'); if (!l) { l = { id: 'mine', url: '', title: 'My wish list', desc: 'Rolls you picked in the item popup', n: 0, at: Date.now(), rolls: {} }; lists.push(l); } return l; };
const mineCount = (l) => { l.n = Object.values(l.rolls).reduce((a, r) => a + r.length, 0); l.at = Date.now(); };
H('wl:addRoll', (e, v) => {
  OBJ(v); const h = HASH(v.h); if (!h) throw bad();
  const perks = ARR(v.perks, 12).map(HASH).filter((x) => x > 0);
  const note = v.note === undefined ? '' : TXT(v.note, 200), tags = v.tags === undefined ? '' : TXT(v.tags, 40), name = v.name === undefined ? '' : TXT(v.name, 80);
  if (tags && !/^[a-z,]*$/.test(tags)) throw bad();
  if (!perks.length) throw new Error('Pick at least one perk first.');
  const lists = wlRead(), l = mineOf(lists);
  const arr = (l.rolls[h] = l.rolls[h] || []);
  const key = perks.slice().sort().join(',');
  const i = arr.findIndex((r) => r[0].slice().sort().join(',') === key && !!r[2] === !!v.trash);
  const roll = [perks, note.replace(/[\r\n#|]/g, ' '), v.trash ? 1 : 0, tags, name];
  if (i >= 0) arr[i] = roll; else arr.push(roll);
  mineCount(l); wlWrite(lists); wlTouch(); return wlPub(lists);
});
H('wl:delRoll', (e, v) => {
  OBJ(v); const h = HASH(v.h), i = INT(v.i, 0, 10000);
  const lists = wlRead(), l = mineOf(lists);
  if (l.rolls[h]) { l.rolls[h].splice(i, 1); if (!l.rolls[h].length) delete l.rolls[h]; }
  mineCount(l); wlWrite(lists); wlTouch(); return wlPub(lists);
});
// ---- wish lists across devices: the set of lists (links, pasted lists, My wish list) travels with Sync, newest change wins ----
const wlSyncPath = () => path.join(app.getPath('userData'), 'wlsync.json');
// t: when the lists last changed here. s: this device has taken lists from another device at least once (until then, lists merge).
// k: lists too big to travel, which stay on this device only.
const wlSS = () => { try { const o = JSON.parse(fs.readFileSync(wlSyncPath(), 'utf8')); return { t: Number(o.t) || 0, s: o.s ? 1 : 0, k: Array.isArray(o.k) ? o.k.filter((x) => typeof x === 'string') : [] }; } catch (e) { return { t: 0, s: 0, k: [] }; } };
const wlT = () => wlSS().t;
const wlSave = (o) => { try { fs.writeFileSync(wlSyncPath(), JSON.stringify(o)); } catch (e) { /* kept in memory only */ } };
const wlSetT = (t, s) => { const o = wlSS(); wlSave({ ...o, t, s: s === undefined ? o.s : s }); };
function wlTouch() { wlSetT(Date.now()); }
const WLS_MAX = 600000; // the whole Sync document must stay under about 850 KB
const packRolls = (rolls) => { const o = {}; for (const k in rolls || {}) o[k] = rolls[k].map((r) => [r[0].join(','), r[1] || '', r[2] ? 1 : 0, r[3] || '', r[4] || '']); return o; };
function unpackRolls(o, cap) {
  const out = {}; let n = 0;
  if (!o || typeof o !== 'object') return { rolls: out, n };
  for (const k of Object.keys(o).slice(0, 20000)) {
    if (k !== '*' && !/^\d{1,10}$/.test(k)) continue;
    const arr = Array.isArray(o[k]) ? o[k].slice(0, 200) : [];
    for (const r of arr) {
      if (!Array.isArray(r) || n >= cap) continue;
      const pk = String(r[0] || '').split(',').map(Number).filter((x) => Number.isInteger(x) && x > 0 && x <= 4294967295).slice(0, 12);
      (out[k] = out[k] || []).push([pk, String(r[1] || '').slice(0, 200), r[2] ? 1 : 0, /^[a-z,]{0,40}$/.test(String(r[3] || '')) ? String(r[3] || '') : '', String(r[4] || '').slice(0, 80)]); n++;
    }
  }
  return { rolls: out, n };
}
H('wl:syncGet', () => {
  const lists = wlRead();
  let t = wlT(); if (!t && lists.length) t = 1; // lists made before syncing existed: send them once
  const doc = { links: [], pasted: [], mine: null, left: 0 };
  for (const l of lists) {
    if (l.id === 'mine') doc.mine = packRolls(l.rolls);
    else if (l.url) doc.links.push({ id: l.id, url: l.url });
    else doc.pasted.push({ id: l.id, title: l.title || '', desc: l.desc || '', rolls: packRolls(l.rolls) });
  }
  // Big pasted or uploaded lists cannot travel (Sync holds a few hundred KB); the biggest are left out first.
  const size = () => JSON.stringify(doc).length;
  const left = [];
  while (doc.pasted.length && size() > WLS_MAX) { let bi = 0; doc.pasted.forEach((x, i) => { if (JSON.stringify(x).length > JSON.stringify(doc.pasted[bi]).length) bi = i; }); left.push(doc.pasted[bi].id); doc.pasted.splice(bi, 1); doc.left++; }
  if (size() > WLS_MAX) { doc.mine = null; doc.left++; }
  const ss = wlSS(); if (JSON.stringify(ss.k) !== JSON.stringify(left)) wlSave({ ...ss, k: left });
  return { t, doc: JSON.stringify(doc), synced: ss.s };
});
// Applies the lists from another device. merge (first sync on this device): nothing here is dropped, theirs is added.
H('wl:syncApply', async (e, v) => {
  OBJ(v); const t = Number(v.t) || 0, merge = !!v.merge; let d;
  try { d = JSON.parse(TXT(v.doc, 900000)); } catch (er) { throw bad(); }
  if (!d || typeof d !== 'object') throw bad();
  const okId = (x) => typeof x === 'string' && /^[\w-]{1,20}$/.test(x);
  const links = (Array.isArray(d.links) ? d.links : []).filter((x) => x && okId(x.id) && typeof x.url === 'string' && /^https:\/\//i.test(x.url) && x.url.length < 2000).slice(0, 20);
  const pasted = (Array.isArray(d.pasted) ? d.pasted : []).filter((x) => x && okId(x.id) && x.id !== 'mine').slice(0, 20);
  let lists = wlRead(); const old = lists.slice(); let changed = 0; const kLeft = wlSS().k;
  const keep = merge ? old : old.filter((l) => (l.id === 'mine') || (l.url ? links.some((x) => x.url === l.url) : pasted.some((x) => x.id === l.id) || (!l.url && kLeft.includes(l.id))));
  if (keep.length !== old.length) changed++;
  lists = keep;
  for (const x of links) {
    if (lists.some((l) => l.url === x.url)) continue;
    const l = { id: x.id, url: x.url, title: '', desc: '', n: 0, at: 0, rolls: {} };
    await wlRefreshOne(l); if (l.err && !l.n) { l.at = 0; } lists.push(l); changed++;
  }
  for (const x of pasted) {
    if (lists.some((l) => l.id === x.id)) continue;
    const u = unpackRolls(x.rolls, 400000); if (!u.n) continue;
    lists.push({ id: x.id, url: '', title: String(x.title || 'Pasted wish list').slice(0, 120), desc: String(x.desc || '').slice(0, 300), n: u.n, at: Date.now(), rolls: u.rolls }); changed++;
  }
  if (d.mine && typeof d.mine === 'object') {
    const u = unpackRolls(d.mine, 20000), l = mineOf(lists), before = JSON.stringify(l.rolls);
    if (merge) { for (const k in u.rolls) { const arr = (l.rolls[k] = l.rolls[k] || []); for (const r of u.rolls[k]) { const key = r[0].slice().sort().join(',') + '|' + r[2]; if (!arr.some((q) => q[0].slice().sort().join(',') + '|' + (q[2] ? 1 : 0) === key)) arr.push(r); } } }
    else l.rolls = u.rolls;
    mineCount(l); if (JSON.stringify(l.rolls) !== before) changed++;
    if (!l.n) lists = lists.filter((q) => q !== l);
  }
  if (lists.length > 20) lists = lists.slice(-20);
  if (changed) wlWrite(lists);
  wlSetT(merge ? Date.now() : t, 1);
  return { changed };
});
H('wl:mine', () => { const l = wlRead().find((x) => x.id === 'mine'); return { rolls: l ? l.rolls : {} }; });
// The list as a standard DIM wish list file (mine, or any list you loaded) so you can share it or load it in DIM.
H('wl:export', (e, v) => {
  const id = v && v.id ? TXT(v.id, 20) : 'mine', l = wlRead().find((x) => x.id === id);
  if (!l) throw new Error('That list was not found.');
  const out = ['title:' + (l.title || 'Pathfinder wish list'), 'description:' + (l.desc || 'Exported from Pathfinder'), ''];
  for (const k of Object.keys(l.rolls)) for (const r of l.rolls[k]) {
    const item = k === '*' ? -69420 : (r[2] ? -Number(k) : Number(k));
    out.push('dimwishlist:item=' + item + '&perks=' + r[0].join(',') + (r[1] || r[3] ? '#notes:' + (r[1] || '') + (r[3] ? '|tags:' + r[3] : '') : ''));
  }
  return out.join('\n') + '\n';
});

// ---------------- small desktop helpers ----------------
H('app:notify', (e, v) => {
  OBJ(v); const title = TXT(v.title, 80), body = TXT(v.body, 200);
  if (Notification.isSupported()) new Notification({ title, body, silent: false }).show();
  return true;
});
// Overlay mode: a small always-on-top window you can leave on a second screen.
let ovlSaved = null;
H('overlay:set', (e, v) => {
  OBJ(v); if (!win || win.isDestroyed()) return false;
  if (v.on && !ovlSaved) { ovlSaved = { b: win.getBounds(), max: win.isMaximized() }; if (ovlSaved.max) win.unmaximize(); win.setAlwaysOnTop(true, 'floating'); win.setBounds({ x: ovlSaved.b.x, y: ovlSaved.b.y, width: 520, height: 760 }); }
  else if (!v.on && ovlSaved) { win.setAlwaysOnTop(false); win.setBounds(ovlSaved.b); if (ovlSaved.max) win.maximize(); ovlSaved = null; }
  return !!ovlSaved;
});
// Farming mode: every 20 seconds, move unequipped, unlocked weapons and armor from your characters to the vault so your inventory never fills while you farm.
const FARMB = new Set([1498876634, 2465295065, 953998645, 3448274439, 3551918588, 14239492, 20886954, 1585787867]);
const farm = { on: false, moved: 0, last: '', t: null, busy: false, spaces: 3 };
async function farmTick() {
  if (farm.busy || !M) return; farm.busy = true;
  try {
    const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=201,300`);
    const eq = new Set(); // equipped items are in a separate list, so everything here is unequipped
    let n = 0;
    // Keep this many empty slots in every slot (the Farming Mode setting). Each slot holds 9 unequipped items.
    const keep = 9 - farm.spaces;
    for (const [ch, o] of Object.entries((pr.characterInventories && pr.characterInventories.data) || {})) {
      const by = {};
      for (const it of o.items || []) { if (it.itemInstanceId && FARMB.has(it.bucketHash)) (by[it.bucketHash] = by[it.bucketHash] || []).push(it); }
      for (const list of Object.values(by)) {
        let extra = list.length - keep;
        for (const it of list) {
          if (extra <= 0 || n >= 8) break;
          if ((it.state & 1) || eq.has(it.itemInstanceId)) continue;
          await xfer({ id: it.itemInstanceId, h: it.itemHash }, ch, true); n++; farm.moved++; extra--;
        }
      }
    }
    farm.last = n ? 'Moved ' + n + ' item' + (n === 1 ? '' : 's') + ' to the vault' : 'Watching...';
  } catch (er) { farm.last = 'Paused: ' + String((er && er.message) || er).slice(0, 120); }
  farm.busy = false;
  if (win && !win.isDestroyed()) win.webContents.send('farm', { on: farm.on, moved: farm.moved, last: farm.last });
}
H('farm:set', (e, v) => {
  OBJ(v);
  if (v.spaces !== undefined) farm.spaces = INT(v.spaces, 1, 9);
  if (v.on === undefined) return { on: farm.on, moved: farm.moved, last: farm.last };
  if (v.on) { if (!M) throw new Error('Open the Vault tab first so the app is signed in.'); farm.on = true; farm.moved = 0; farm.last = 'Starting...'; clearInterval(farm.t); farm.t = setInterval(farmTick, 20000); farmTick(); }
  else { farm.on = false; clearInterval(farm.t); farm.last = ''; }
  return { on: farm.on, moved: farm.moved, last: farm.last };
});
H('farm:get', () => ({ on: farm.on, moved: farm.moved, last: farm.last }));

// ---------------- triumphs ----------------
let TRD = null;
async function trdefs() {
  const m = await manifest();
  const v = m.version + '.t3';
  if (TRD && TRD.v === v) return TRD;
  const f = path.join(app.getPath('userData'), 'triumphs.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === v) return (TRD = o); } catch (e) { /* download below */ }
  send('Downloading triumph data. This only happens on the first run and after game updates.');
  const P = m.jsonWorldComponentContentPaths.en;
  const ob = {};
  await table(P.DestinyObjectiveDefinition, (k, x) => { ob[k] = { progressDescription: x.progressDescription, completionValue: x.completionValue }; });
  const o = { v, rec: {}, node: {}, obj: {} };
  await table(P.DestinyRecordDefinition, (k, x) => {
    const dp = x.displayProperties; if (!dp || !dp.name) return;
    o.rec[k] = { n: dp.name, d: dp.description || '', i: dp.icon || '', o: x.objectiveHashes || [], s: (x.completionInfo && x.completionInfo.ScoreValue) || 0, t: x.titleInfo && x.titleInfo.hasTitle ? 1 : 0, ti: (x.titleInfo && x.titleInfo.titlesByGender && (x.titleInfo.titlesByGender.Male || x.titleInfo.titlesByGender.Female)) || '', gl: (x.titleInfo && x.titleInfo.gildingTrackingRecordHash) || 0, rw: (x.rewardItems || []).filter((q) => q && q.itemHash).slice(0, 6).map((q) => [q.itemHash, q.quantity || 1]), ex: x.expirationInfo && x.expirationInfo.hasExpiration ? String(x.expirationInfo.description || '').slice(0, 300) : '', ty: x.recordTypeName || '' };
    (x.objectiveHashes || []).forEach((h) => { if (!o.obj[h] && ob[h]) o.obj[h] = { d: ob[h].progressDescription || '', m: ob[h].completionValue || 1 }; });
  });
  await table(P.DestinyPresentationNodeDefinition, (k, x) => {
    const dp = x.displayProperties; if (!dp || !dp.name) return;
    const ch = x.children || {};
    o.node[k] = { n: dp.name, i: dp.icon || '', c: (ch.presentationNodes || []).map((q) => q.presentationNodeHash), r: (ch.records || []).map((q) => q.recordHash), cr: x.completionRecordHash || 0 };
  });
  fs.writeFileSync(f, JSON.stringify(o));
  return (TRD = o);
}
H('tr:defs', () => trdefs());
H('tr:state', async () => {
  if (!M) { const ms = await api('/User/GetMembershipsForCurrentUser/'); M = ms.destinyMemberships.find((x) => x.membershipId === ms.primaryMembershipId) || ms.destinyMemberships[0]; }
  const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=900`);
  const p = (pr.profileRecords && pr.profileRecords.data) || {}, recs = {};
  const put = (h, r) => { if (recs[h] && !(recs[h][0] & 4)) return; recs[h] = [r.state, (r.objectives || []).map((q) => [q.objectiveHash, q.progress || 0, q.completionValue || 1, q.complete ? 1 : 0]), r.completedCount || 0]; };
  for (const h in (p.records || {})) put(h, p.records[h]);
  const cr = (pr.characterRecords && pr.characterRecords.data) || {};
  for (const ch in cr) for (const h in (cr[ch].records || {})) put(h, cr[ch].records[h]);
  return { score: { active: p.activeScore || 0, lifetime: p.lifetimeScore || 0, legacy: p.legacyScore || 0 }, cat: p.recordCategoriesRootNodeHash, seals: p.recordSealsRootNodeHash, tracked: p.trackedRecordHash ? [p.trackedRecordHash] : [], recs };
});

// ---------------- friends and clan on a triumph (like Braytech): who has it done ----------------
// Loaded once (every clan member and Bungie.net friend, then each one's public triumphs) and kept for 30 minutes,
// so opening any triumph after that is instant. Nothing about other people is written to disk.
let WHO = null;
const pad4 = (c) => (c || c === 0 ? String(c).padStart(4, '0') : '');
async function whoLoad() {
  const W = { at: Date.now(), st: 'loading', done: 0, total: 0, people: [], err: {}, clan: '' }; WHO = W;
  await ensureM(); const me = M;
  const list = new Map();
  const add = (mt, mid, n, code, src) => {
    if (!mid || !mt || mt === 254) return;
    const k = mt + ':' + mid, o = list.get(k);
    if (o) { if (!o.src.includes(src)) o.src.push(src); return; }
    list.set(k, { k, mt, mid: String(mid), n: String(n || 'Guardian').slice(0, 40), code: pad4(code), src: [src] });
  };
  await Promise.all([
    (async () => {
      try {
        const g = await api(`/GroupV2/User/${me.membershipType}/${me.membershipId}/0/1/`);
        const grp = g && g.results && g.results[0] && g.results[0].group;
        if (!grp) { W.err.clan = 'none'; return; }
        W.clan = grp.name || '';
        const r = await api(`/GroupV2/${grp.groupId}/Members/?currentpage=1`);
        (r.results || []).forEach((m) => { const u = m.destinyUserInfo || {}; add(u.membershipType, u.membershipId, u.bungieGlobalDisplayName || u.displayName, u.bungieGlobalDisplayNameCode, 'clan'); });
      } catch (e) { W.err.clan = e.message; }
    })(),
    (async () => {
      try {
        const f = await api('/Social/Friends/');
        await pool((f && f.friends) || [], 6, async (x) => {
          const bn = x.bungieNetUser && x.bungieNetUser.membershipId;
          let mt = x.lastSeenAsBungieMembershipType, mid = x.lastSeenAsMembershipId;
          if (bn) {
            try {
              const ms = await api(`/User/GetMembershipsById/${bn}/254/`, false), dm = (ms && ms.destinyMemberships) || [];
              const p = dm.find((d) => ms.primaryMembershipId && d.membershipId === ms.primaryMembershipId) || dm.find((d) => !d.crossSaveOverride || d.crossSaveOverride === d.membershipType) || dm[0];
              if (p) { mt = p.membershipType; mid = p.membershipId; }
            } catch (e) { /* use the last seen account */ }
          }
          add(mt, mid, x.bungieGlobalDisplayName || (x.bungieNetUser && x.bungieNetUser.uniqueName), x.bungieGlobalDisplayNameCode, 'friend');
        });
      } catch (e) { W.err.friends = /scope|privilege|permission|authoriz|access/i.test(e.message) ? 'scope' : e.message; }
    })(),
  ]);
  list.delete(me.membershipType + ':' + me.membershipId);
  W.people = [...list.values()]; W.total = W.people.length;
  await pool(W.people, 8, async (p) => {
    try {
      const pr = await api(`/Destiny2/${p.mt}/Profile/${p.mid}/?components=900`);
      const set = new Set(), put = (h, r) => { if (r && !(r.state & 4)) set.add(+h); };
      const pd = pr.profileRecords && pr.profileRecords.data;
      if (!pd) p.priv = 1; else for (const h in pd.records || {}) put(h, pd.records[h]);
      const cr = (pr.characterRecords && pr.characterRecords.data) || {};
      for (const c in cr) for (const h in cr[c].records || {}) put(h, cr[c].records[h]);
      p.set = set;
    } catch (e) { p.priv = 1; }
    W.done++;
  });
  W.st = 'ready'; W.at = Date.now();
}
H('tr:who', async (e, v) => {
  OBJ(v); const h = HASH(v.h);
  if (v.reload || !WHO || WHO.st === 'error' || (WHO.st === 'ready' && Date.now() - WHO.at > 1800000)) {
    whoLoad().catch((er) => { WHO = { st: 'error', err: { all: er.message }, people: [], done: 0, total: 0, at: Date.now() }; });
  }
  const W = WHO;
  if (W.st !== 'ready') return { st: W.st, done: W.done, total: W.total, err: W.err };
  return { st: 'ready', clan: W.clan, err: W.err, people: W.people.map((p) => ({ n: p.n, c: p.code, s: p.src, priv: p.priv ? 1 : 0, d: p.set && p.set.has(h) ? 1 : 0 })) };
});

// ---------------- seasonal artifact (an equippable item with perk sockets) ----------------
const ARTP = {};
async function plugInfo(hs) {
  await Promise.all(hs.filter((h) => h && !ARTP[h]).map(async (h) => {
    try { const o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + h + '/', false), dp = o.displayProperties || {}; ARTP[h] = { n: dp.name || 'Perk', i: dp.icon || '', d: dp.description || '', c: (o.plug && o.plug.plugCategoryIdentifier) || '' }; }
    catch (e) { ARTP[h] = { n: 'Perk', i: '', d: '', c: '' }; }
  }));
}
// Speed: the account's Destiny membership is remembered with the sign-in, so loading the vault starts with the profile request
// instead of waiting for a membership lookup first.
async function memb() {
  if (M) return M;
  const t = rd().tok;
  if (t && t.mid && t.m && String(t.m.bid) === String(t.mid) && t.m.membershipId) { M = t.m; return M; }
  const ms = await api('/User/GetMembershipsForCurrentUser/');
  M = ms.destinyMemberships.find((x) => x.membershipId === ms.primaryMembershipId) || ms.destinyMemberships[0];
  try { const c = rd(); if (c.tok) { c.tok.m = { membershipType: M.membershipType, membershipId: M.membershipId, displayName: M.displayName || '', bungieGlobalDisplayName: M.bungieGlobalDisplayName || '', bungieGlobalDisplayNameCode: M.bungieGlobalDisplayNameCode || 0, bid: c.tok.mid }; c.tok.n = c.tok.n || M.bungieGlobalDisplayName || M.displayName || ''; wr(c); } } catch (e) { /* remembered next time */ }
  return M;
}
async function ensureM() {
  if (M) return;
  await memb();
}
const ALOG = (t) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'art-log.txt'), t + '\n'); } catch (e) { /* log only */ } };
// ---- Seasonal artifacts, the way DIM handles them: the artifacts are items you own (one slot per character), each with its own perk slots. ----
const PSETS = {};
async function plugSet(h) {
  if (!PSETS[h]) { try { PSETS[h] = (await api('/Destiny2/Manifest/DestinyPlugSetDefinition/' + h + '/', false)).reusablePlugItems.map((q) => q.plugItemHash); } catch (e) { PSETS[h] = []; } }
  return PSETS[h];
}
// Perk slots of one artifact item, with the options each slot can hold (from the item's definition plus what Bungie lists live).
async function artOne(f) {
  const r = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/Item/${f.id}/?components=300,305,310`);
  const socks = (r.sockets && r.sockets.data && r.sockets.data.sockets) || [];
  const rp = (r.reusablePlugs && r.reusablePlugs.data && r.reusablePlugs.data.plugs) || {};
  let entries = [];
  try { entries = ((await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + f.h + '/', false)).sockets || {}).socketEntries || []; } catch (e) { /* use live data only */ }
  const n = Math.max(socks.length, entries.length), raw = [];
  for (let i = 0; i < n; i++) {
    const e = entries[i] || {}, sh = e.reusablePlugSetHash || e.randomizedPlugSetHash;
    const fromSet = sh ? await plugSet(sh) : [];
    const live = (rp[i] || []).map((x) => x.plugItemHash);
    raw.push({ idx: i, cur: socks[i] && socks[i].plugHash, opts: [...new Set([...fromSet, ...live])] });
  }
  const all = new Set([f.h]);
  raw.forEach((q) => { if (q.cur) all.add(q.cur); q.opts.forEach((h) => all.add(h)); });
  await plugInfo([...all]);
  const ps = raw.map((q) => ({ ...q, opts: q.opts.filter((h) => !/reset/i.test(ARTP[h].n + ' ' + ARTP[h].c)) })).filter((q) => q.opts.length > 1);
  return { f, ps, dbg: 'sockets ' + socks.length + ', definition entries ' + entries.length + ', perk slots ' + ps.length };
}
// Every character's artifact items (cheap: no perk lookups yet).
H('art:get', async () => {
  await ensureM();
  const A = (await defs()).a || {};
  const pr = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/?components=102,200,201,205`);
  const hit = (it) => it.itemInstanceId && (it.bucketHash === 1506418338 || A[it.itemHash]);
  const by = {}, all = new Set();
  for (const ch of Object.keys((pr.characters && pr.characters.data) || {})) {
    const items = [];
    (((pr.characterEquipment && pr.characterEquipment.data || {})[ch] || {}).items || []).filter(hit).forEach((it) => { items.push({ id: it.itemInstanceId, h: it.itemHash, eq: 1 }); all.add(it.itemHash); });
    (((pr.characterInventories && pr.characterInventories.data || {})[ch] || {}).items || []).filter(hit).forEach((it) => { items.push({ id: it.itemInstanceId, h: it.itemHash, eq: 0 }); all.add(it.itemHash); });
    by[ch] = { items };
  }
  await plugInfo([...all]);
  let log = new Date().toISOString() + ' artifacts per character\n';
  for (const ch of Object.keys(by)) { by[ch].items.forEach((x) => { x.n = (ARTP[x.h] || {}).n || 'Artifact'; x.i = (ARTP[x.h] || {}).i || ''; }); log += ch.slice(-4) + ': ' + by[ch].items.map((x) => (x.eq ? '[equipped] ' : '') + x.n).join(', ') + '\n'; }
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'art-log.txt'), log); } catch (e) { /* log only */ }
  return { all: 1, by };
});
// Perk slots and options of one artifact item.
H('art:item', async (e, v) => {
  OBJ(v); await ensureM();
  const f = { id: ID(v.id), h: HASH(v.h), ch: ID(v.ch) };
  const o = await artOne(f);
  const hs = new Set(); o.ps.forEach((q) => { if (q.cur) hs.add(q.cur); q.opts.forEach((h) => hs.add(h)); });
  const plugs = {}; hs.forEach((h) => { plugs[h] = ARTP[h]; });
  ALOG(f.ch.slice(-4) + ' ' + ((ARTP[f.h] || {}).n || f.h) + ': ' + o.dbg + '; current: ' + o.ps.map((q) => (ARTP[q.cur] || {}).n).join(', '));
  return { item: { id: f.id, h: f.h, n: (ARTP[f.h] || {}).n || 'Artifact', i: (ARTP[f.h] || {}).i || '' }, socks: o.ps, plugs };
});
H('art:apply', async (e, v) => {
  OBJ(v); await ensureM();
  const f = { id: ID(v.id), h: HASH(v.h), ch: ID(v.ch) }, picks = ARR(v.picks, 20).map(HASH);
  if (v.equip) { try { await equipOne(f.id, f.ch); ALOG('equipped artifact ' + f.id); } catch (er) { ALOG('could not equip artifact: ' + er.message); } }
  const st = await artOne(f);
  ALOG('apply on ' + f.ch.slice(-4) + ': wanted ' + picks.map((h) => (ARTP[h] || {}).n || h).join(', ') + ' (' + st.dbg + ')');
  const want = new Set(picks);
  if (want.size > st.ps.length) throw new Error('This artifact only has ' + st.ps.length + ' perk slots.');
  const have = new Set(st.ps.map((q) => q.cur));
  const need = [...want].filter((h) => !have.has(h));
  const free = st.ps.filter((q) => !want.has(q.cur));
  need.sort((a, b) => free.filter((q) => q.opts.includes(a)).length - free.filter((q) => q.opts.includes(b)).length);
  for (const h of need) {
    const q = free.find((x) => !x.done && x.opts.includes(h));
    if (!q) throw new Error((ARTP[h] ? ARTP[h].n : 'That perk') + ' cannot go in any open slot.');
    try { await step('setting ' + (ARTP[h] ? ARTP[h].n : 'a perk'), () => post('/Destiny2/Actions/Items/InsertSocketPlugFree/', { plug: { socketIndex: q.idx, socketArrayType: 0, plugItemHash: h }, itemId: f.id, characterId: f.ch })); ALOG('   set ' + (ARTP[h] || {}).n + ' in socket ' + q.idx + ' ok'); }
    catch (er) { ALOG('   FAILED socket ' + q.idx + ' plug ' + h + ': ' + er.message); throw er; }
    q.done = 1;
  }
  return true;
});

// ---------------- activity: rotations, bounties, vendors, weapon stats, clears, fireteam ----------------
// Everything here only reads from Bungie with your own sign-in. Nothing is written back to the game.
async function acct() {
  if (!M) { const ms = await api('/User/GetMembershipsForCurrentUser/'); M = ms.destinyMemberships.find((x) => x.membershipId === ms.primaryMembershipId) || ms.destinyMemberships[0]; }
  return M;
}
const pbase = (m) => `/Destiny2/${m.membershipType}/Profile/${m.membershipId}/`;
async function charList(m) {
  const pr = await api(pbase(m) + '?components=200');
  const c = (pr.characters && pr.characters.data) || {};
  return Object.keys(c).sort((a, b) => String(c[b].dateLastPlayed).localeCompare(String(c[a].dateLastPlayed)));
}
async function pickChar(m, want) {
  const l = await charList(m);
  if (!l.length) throw new Error('No characters found on this account.');
  return want && l.includes(want) ? want : l[0];
}
// Small helper: run an async function over a list, a few at a time.
async function pool(list, n, fn) {
  const out = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k]); } catch (e) { out[k] = null; } } }));
  return out;
}
const ITD = {}, ACTD = {}, ATYPE = {}, OBJD = {};
async function itemInfo(h) {
  if (ITD[h] && !ITD[h].bad) return ITD[h];
  for (let t = 0; t < 2; t++) {
    try {
      const x = await ent('DestinyInventoryItemDefinition', h), dp = x.displayProperties || {};
      return (ITD[h] = { n: dp.name || 'Item', i: dp.icon || '', d: dp.description || '', t: x.itemTypeDisplayName || '', r: (x.inventory && x.inventory.tierTypeName) || '', it: x.itemType || 0, pv: (x.preview && x.preview.previewVendorHash) || 0, ct: x.classType === undefined ? 3 : x.classType, cat: x.itemCategoryHashes || [], ob: (x.objectives && x.objectives.objectiveHashes) || [] });
    } catch (e) { /* tried twice, then given up for now */ }
  }
  // Not cached for good: a network hiccup is retried next time instead of showing "Item" until the app restarts.
  return (ITD[h] = { n: 'Item', i: '', d: '', t: '', r: '', it: 0, cat: [], ob: [], bad: 1 });
}
async function objInfo(h) {
  if (OBJD[h] !== undefined) return OBJD[h];
  try { const x = await ent('DestinyObjectiveDefinition', h); return (OBJD[h] = x.progressDescription || ''); } catch (e) { return (OBJD[h] = ''); }
}
async function actInfo(h) {
  if (ACTD[h]) return ACTD[h];
  try {
    const x = await ent('DestinyActivityDefinition', h), dp = x.displayProperties || {};
    let tn = '';
    if (x.activityTypeHash) {
      if (ATYPE[x.activityTypeHash] === undefined) { try { const t = await ent('DestinyActivityTypeDefinition', x.activityTypeHash); ATYPE[x.activityTypeHash] = (t.displayProperties && t.displayProperties.name) || ''; } catch (e) { ATYPE[x.activityTypeHash] = ''; } }
      tn = ATYPE[x.activityTypeHash];
    }
    // "Customize" is the pick-your-own-feats version of an activity: show the real name and flag it.
    const rawN = dp.name || '', cz = /\s*[:\-]\s*customi[sz]e\s*$/i.test(rawN);
    return (ACTD[h] = { n: cz ? rawN.replace(/\s*[:\-]\s*customi[sz]e\s*$/i, '').trim() : rawN, cz: cz ? 1 : 0, d: dp.description || '', tn, lvl: x.activityLightLevel || 0, img: x.pgcrImage || '' });
  } catch (e) { return (ACTD[h] = { n: '', d: '', tn: '', lvl: 0, img: '' }); }
}

// Today's rotations: whatever Bungie lists as available to the character right now.
const OBJN = {};
async function objName(h) {
  if (OBJN[h] !== undefined) return OBJN[h];
  try { const x = await ent('DestinyObjectiveDefinition', h), dp = x.displayProperties || {}; return (OBJN[h] = String(dp.name || x.progressDescription || '').replace(/\bItem\s*\[?\d{6,}\]?\s*/gi, '').trim()); } catch (e) { return (OBJN[h] = ''); }
}
const baseName = (n) => String(n).replace(/\s*[:(\-–]\s*(normal|master|prestige|legend|contest|standard|expert|hard|heroic|epic|explorer|eternity|ultimatum)\b.*$/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
H('act:rot', async (e, v) => {
  const m = await acct(), c = await pickChar(m, v && v.char ? ID(v.char) : '');
  const pr = await api(pbase(m) + `?components=200,204`);
  // A character keeps last week's activity list until it is played after the weekly reset (Tuesday 17:00 UTC),
  // so only characters played since the last reset count; Bungie's public weekly milestones are always current.
  const wk = Math.floor((Date.now() - Date.UTC(1970, 0, 6, 17)) / 604800000), resetAt = Date.UTC(1970, 0, 6, 17) + wk * 604800000;
  const cdat = (pr.characters || {}).data || {}, fresh = (id) => (Date.parse((cdat[id] || {}).dateLastPlayed) || 0) >= resetAt;
  const actD = (pr.characterActivities || {}).data || {};
  const av = fresh(c) ? ((actD[c] || {}).availableActivities || []) : [];
  const out = []; // the full 'available to your character' list was removed on purpose
  // Featured raids and dungeons are the ones carrying a live "Weekly Raid Challenge" or "Weekly Dungeon Challenge".
  // Completing something on one character hides its weekly challenge for that character only, so look at every character, and at Bungie's public weekly milestones too.
  const allAv = Object.keys(actD).filter(fresh).flatMap((id) => actD[id].availableActivities || []);
  const withCh = allAv.concat(av).filter((a) => a.activityHash && Array.isArray(a.challenges) && a.challenges.length).slice(0, 120);
  let pubCh = [];
  try { const pm = await api('/Destiny2/Milestones/'); Object.values(pm || {}).forEach((ms) => (ms.activities || []).forEach((a) => { if (a.activityHash && (a.challengeObjectiveHashes || []).length) pubCh.push({ activityHash: a.activityHash, challenges: a.challengeObjectiveHashes.map((h) => ({ objective: { objectiveHash: h } })) }); })); } catch (e) { pubCh = []; }
  withCh.push(...pubCh.slice(0, 80));
  const seenA = new Set(); const withCh2 = withCh.filter((a) => (seenA.has(a.activityHash) ? false : seenA.add(a.activityHash)));
  const feat = {};
  await pool(withCh2, 6, async (a) => {
    let kind = '';
    for (const q of a.challenges.slice(0, 4)) {
      const h = q && q.objective && q.objective.objectiveHash; if (!h) continue;
      const nm = await objName(h), mt = /weekly\s+(raid|dungeon)\s+challenge/i.exec(nm);
      if (mt) { kind = mt[1].toLowerCase() === 'raid' ? 'Raid' : 'Dungeon'; break; }
    }
    if (!kind) return;
    const f = await actInfo(a.activityHash); if (!f.n) return;
    const b = baseName(f.n), k = kind + '|' + b.toLowerCase();
    if (!feat[k]) feat[k] = { k: kind, n: b, img: f.img || '' };
    else if (!feat[k].img && f.img) feat[k].img = f.img;
  });
  // Once a featured raid or dungeon is finished Bungie stops listing its weekly challenge, so it used to vanish from the page.
  // Remember this week's featured ones (they change at weekly reset, Tuesday 17:00 UTC) and show the finished ones as completed.
  const nowF = Object.values(feat);
  let sv = {}; try { sv = JSON.parse(fs.readFileSync(apath('rotfeat.json'), 'utf8')) || {}; } catch (e) { sv = {}; }
  if (sv.wk !== wk || !sv.f || sv.v !== 2) sv = { v: 2, wk, f: {} };
  nowF.forEach((x) => { sv.f[x.k + '|' + x.n.toLowerCase()] = { k: x.k, n: x.n, img: x.img || (sv.f[x.k + '|' + x.n.toLowerCase()] || {}).img || '' }; });
  try { fs.writeFileSync(apath('rotfeat.json'), JSON.stringify(sv)); } catch (e) { /* disk full or locked */ }
  const featAll = Object.keys(sv.f).map((k) => ({ ...sv.f[k], dn: 0 }));
  // Pantheon: the week's featured Reprise and Encore bosses (the game lists them as "Featured Reprise: <boss>" / "Featured Encore: <boss>").
  try {
    const ad = await actsDefs(), seenP = new Set(), pan = {};
    allAv.concat(av).forEach((a) => {
      const h = String(a.activityHash || ''); if (!h || seenP.has(h)) return; seenP.add(h);
      const d = ad.a[h], mt = d && /featured\s+(reprise|encore)\s*[:\-]\s*(.+)$/i.exec(d.n); if (!mt) return;
      const nm = baseName(mt[2]), sub = mt[1].charAt(0).toUpperCase() + mt[1].slice(1).toLowerCase(), k = 'pan|' + nm.toLowerCase();
      if (!pan[k]) pan[k] = { k: 'Pantheon', n: nm, s: sub, img: d.img || '', dn: 0 };
    });
    featAll.push(...Object.values(pan));
  } catch (e) { /* Pantheon is optional: the raids and dungeons above still show */ }
  return { rot: out, feat: featAll };
});

// Bounties and the objectives inside them.
const BAGS = {
  weapon: ['auto rifle', 'hand cannon', 'pulse rifle', 'scout rifle', 'sidearm', 'submachine gun', 'shotgun', 'sniper rifle', 'fusion rifle', 'linear fusion rifle', 'grenade launcher', 'rocket launcher', 'trace rifle', 'bow', 'glaive', 'sword', 'machine gun'],
  element: ['solar', 'arc', 'void', 'stasis', 'strand'],
  mode: ['strike', 'nightfall', 'crucible', 'gambit', 'lost sector', 'dungeon', 'raid', 'patrol', 'public event', 'vanguard', 'iron banner', 'trials', 'exotic mission', 'battleground', 'onslaught'],
  how: ['precision', 'finisher', 'melee', 'grenade', 'super', 'ability'],
};
const tagsOf = (text) => {
  const t = ' ' + String(text).toLowerCase() + ' ', out = [];
  for (const k of Object.keys(BAGS)) for (const w of BAGS[k]) if (new RegExp('\\b' + w.replace(/ /g, '\\s+') + 's?\\b').test(t)) out.push(w);
  return [...new Set(out)];
};
H('act:bounties', async (e, v) => {
  const m = await acct(), c = await pickChar(m, v && v.char ? ID(v.char) : '');
  const pr = await api(pbase(m) + '?components=201,301');
  const items = (((pr.characterInventories || {}).data || {})[c] || {}).items || [];
  const ob = (pr.itemComponents && pr.itemComponents.objectives && pr.itemComponents.objectives.data) || {};
  const cand = items.filter((x) => x.bucketHash === 1345459588 && x.itemInstanceId).slice(0, 80);
  const defsA = await pool(cand, 8, (x) => itemInfo(x.itemHash));
  const out = [];
  for (let k = 0; k < cand.length; k++) {
    const x = cand[k], d = defsA[k];
    if (!d || !(d.it === 26 || d.cat.includes(1784235469))) continue;
    const os = ((ob[x.itemInstanceId] || {}).objectives) || [];
    const ds = await pool(os, 4, (o) => objInfo(o.objectiveHash));
    const obj = os.map((o, j) => ({ t: ds[j] || '', p: o.progress || 0, m: o.completionValue || 1, c: o.complete ? 1 : 0 }));
    out.push({ id: x.itemInstanceId, h: x.itemHash, n: d.n, d: d.d, i: d.i, e: x.expirationDate ? Date.parse(x.expirationDate) || 0 : 0, obj, tags: tagsOf(d.n + ' ' + d.d + ' ' + obj.map((o) => o.t).join(' ')) });
  }
  return { bounties: out };
});

// Vendors: every vendor Bungie lists for the character, with their full inventory grouped the way the game groups it.
const VENDORS = { xur: 2190858386 }, VDEF = {};
async function vendorDef(h) {
  if (VDEF[h]) return VDEF[h];
  try {
    const x = await ent('DestinyVendorDefinition', h), dp = x.displayProperties || {};
    return (VDEF[h] = { n: dp.name || '', sub: dp.subtitle || '', id: x.vendorIdentifier || '', cats: (x.displayCategories || []).map((c) => (c.displayProperties && c.displayProperties.name) || ''), fail: x.failureStrings || [], dst: [...new Set((x.locations || []).map((q) => q.destinationHash).filter(Boolean))].slice(0, 4) });
  } catch (e) { return (VDEF[h] = { n: '', sub: '', id: '', cats: [], fail: [], dst: [] }); }
}
// Bungie lists a lot of back-office vendors (subclass unlocks, focusing, attunement). Sort them into plain groups with clear names.
const vtitle = (t) => String(t).toLowerCase().split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
function vkind(d) {
  if (/^SUBCLASS_/.test(d.id)) return 'skip';
  if (/FOCUSING|ATTUNEMENT|DECODING/.test(d.id) || /attunement|decoding/i.test(d.n)) return 'focus';
  if (/exotic archive/i.test(d.sub)) return 'arch';
  return d.sub ? 'npc' : 'other';
}
function vlabel(d) {
  const m = /^(.+)_(WEAPON|ARMOR)_FOCUSING$/.exec(d.id || '');
  if (m) return vtitle(m[1]) + ': ' + d.n + ' focusing';
  return d.n;
}
H('act:vendors', async (e, v) => {
  const m = await acct(), c = await pickChar(m, v && v.char ? ID(v.char) : '');
  const r = await api(pbase(m) + `Character/${c}/Vendors/?components=400`);
  const hs = Object.keys((r.vendors && r.vendors.data) || {}).filter((h) => r.vendors.data[h].enabled !== false).slice(0, 260).map(Number);
  const ds = await pool(hs, 12, (h) => vendorDef(h));
  const out = [], seen = {};
  hs.forEach((h, k) => {
    const d = ds[k]; if (!d || !d.n) return;
    const kind = vkind(d); if (kind === 'skip') return;
    let n = vlabel(d); const key = n + '|' + d.sub;
    if (seen[key]) { seen[key]++; n += ' (' + seen[key] + ')'; } else seen[key] = 1;
    out.push({ h, n, sub: d.sub, k: kind, d });
  });
  // Two vendors with the same name (Xûr in the Tower and Xûr in the Dares of Eternity) get told apart by where they are.
  const cnt = {}; out.forEach((o) => { cnt[o.n] = (cnt[o.n] || 0) + 1; });
  for (const o of out) {
    if (cnt[o.n] < 2) continue;
    const places = (await Promise.all((o.d.dst || []).map(dname))).filter(Boolean);
    const dares = places.some((p) => /eternity/i.test(p)) || /ETERNITY|DARES/.test(o.d.id) || /eternity|dares/i.test(o.d.n + ' ' + o.d.sub);
    o.n += ' · ' + (dares ? 'Dares of Eternity' : places[0] && !/^xûr|^xur/i.test(o.n) ? places[0] : /^x[uû]r/i.test(o.n) ? 'Tower' : (o.sub || places[0] || ''));
  }
  out.forEach((o) => { delete o.d; });
  return { vendors: out };
});
// Armor set of each armor piece (for the optimizer's set bonus option). Item -> set never changes, so it is kept on disk.
const SETF = () => path.join(app.getPath('userData'), 'armorsets.json');
let SETC = null;
H('arm:sets', async (e, v) => {
  OBJ(v); const hs = [...new Set(ARR(v.h, 3000).map(HASH))];
  if (!SETC) { try { SETC = JSON.parse(fs.readFileSync(SETF(), 'utf8')); } catch (er) { SETC = {}; } SETC.i = SETC.i || {}; SETC.s = SETC.s || {}; }
  const todo = hs.filter((h) => SETC.i[h] === undefined);
  await pool(todo, 10, async (h) => { const d = await entDef('DestinyInventoryItemDefinition', h); if (d) SETC.i[h] = (d.equippingBlock && d.equippingBlock.equipableItemSetHash) || 0; });
  const sets = [...new Set(hs.map((h) => SETC.i[h]).filter(Boolean))].filter((sh) => !SETC.s[sh]);
  await pool(sets, 6, async (sh) => {
    const sd = await entDef('DestinyEquipableItemSetDefinition', sh); if (!sd) return;
    const perks = [];
    for (const q of sd.setPerks || []) { const pd = await entDef('DestinySandboxPerkDefinition', q.sandboxPerkHash), dp = (pd && pd.displayProperties) || {}; perks.push({ rc: q.requiredSetCount || 0, n: dp.name || '', d: String(dp.description || '').slice(0, 300) }); }
    SETC.s[sh] = { n: (sd.displayProperties && sd.displayProperties.name) || 'Armor set', p: perks.sort((a, b) => a.rc - b.rc) };
  });
  if (todo.length || sets.length) { try { fs.writeFileSync(SETF(), JSON.stringify(SETC)); } catch (er) { /* kept in memory */ } }
  const items = {}, used = {}; hs.forEach((h) => { const sh = SETC.i[h]; if (sh) { items[h] = sh; used[sh] = SETC.s[sh]; } });
  return { items, sets: used };
});
// Xûr, split the way the game splits him: the weekly Xûr in the Tower, and Xûr's offers in the Dares of Eternity.
const DSTN = {};
async function dname(h) { if (DSTN[h] === undefined) { try { DSTN[h] = ((await ent('DestinyDestinationDefinition', h)).displayProperties || {}).name || ''; } catch (er) { DSTN[h] = ''; } } return DSTN[h]; }
H('act:xur', async (e, v) => {
  const m = await acct(), c = await pickChar(m, v && v.char ? ID(v.char) : '');
  const r = await api(pbase(m) + `Character/${c}/Vendors/?components=400`);
  const hs = Object.keys((r.vendors && r.vendors.data) || {}).map(Number);
  const ds = await pool(hs, 12, (h) => vendorDef(h));
  const pick = [];
  hs.forEach((h, k) => { const d = ds[k]; if (d && d.n && (/x[uû]r|strange|agent of the nine/i.test(d.n + ' ' + d.sub) || /XUR|STRANGE|NINE/.test(d.id))) pick.push({ h, d }); });
  const out = [];
  for (const { h, d } of pick) {
    const places = (await Promise.all((d.dst || []).map(dname))).filter(Boolean);
    const dares = places.some((p) => /eternity/i.test(p)) || /ETERNITY|DARES/.test(d.id) || /eternity|dares/i.test(d.n + ' ' + d.sub);
    out.push({ h, n: vlabel(d), sub: d.sub, where: dares ? 'dares' : 'tower', places, on: r.vendors.data[h].enabled !== false });
  }
  return { vendors: out };
});
H('act:vendor', async (e, v) => {
  OBJ(v);
  const vh = v.vendor !== undefined ? (VENDORS[TXT(v.vendor, 12)] || (() => { throw bad(); })()) : HASH(v.h);
  const m = await acct(), c = await pickChar(m, v.char ? ID(v.char) : '');
  const vd = await vendorDef(vh);
  vd.label = vlabel(vd);
  let r;
  try { r = await api(pbase(m) + `Character/${c}/Vendors/${vh}/?components=400,401,402,305,310`); }
  catch (er) { if (/not|exist|unavailable|1627|1623/i.test(String(er.message))) return { name: vd.label || vd.n || 'Vendor', items: [], off: 1 }; throw er; }
  const sales = (r.sales && r.sales.data) || {}, sk = (r.itemComponents && r.itemComponents.sockets && r.itemComponents.sockets.data) || {}, rp = (r.itemComponents && r.itemComponents.reusablePlugs && r.itemComponents.reusablePlugs.data) || {};
  const idx = Object.keys(sales).slice(0, 220);
  const catOf = {}, order = {};
  (((r.categories && r.categories.data) || {}).categories || []).forEach((cg, ci) => { (cg.itemIndexes || []).forEach((i) => { catOf[i] = vd.cats[cg.displayCategoryIndex] || 'Other'; order[i] = ci; }); });
  const infos = await pool(idx, 10, (k) => itemInfo(sales[k].itemHash));
  const curs = new Set(); idx.forEach((k) => (sales[k].costs || []).forEach((q) => curs.add(q.itemHash)));
  const cl = [...curs].slice(0, 30), cinf = await pool(cl, 8, (h) => itemInfo(h)), cn = {}, ci = {}; cl.forEach((h, j) => { cn[h] = (cinf[j] && cinf[j].n) || 'Currency'; ci[h] = (cinf[j] && cinf[j].i) || ''; });
  const items = [];
  idx.forEach((k, j) => {
    const s = sales[k], f = infos[j]; if (!f || !f.n) return;
    const pk = new Set();
    ((sk[k] || {}).sockets || []).forEach((q) => q && q.plugHash && pk.add(q.plugHash));
    Object.values(((rp[k] || {}).plugs) || {}).forEach((arr) => (arr || []).forEach((q) => q && q.plugItemHash && pk.add(q.plugItemHash)));
    const why = (s.failureIndexes || []).map((i) => vd.fail[i]).filter(Boolean)[0] || '';
    items.push({ h: s.itemHash, n: f.n, i: f.i, t: f.t, r: f.r, q: s.quantity || 1, c: catOf[k] || 'Other', o: order[k] === undefined ? 999 : order[k], x: String(why).slice(0, 80), pv: f.pv && f.pv !== vh ? f.pv : 0, costs: (s.costs || []).map((q) => ({ n: cn[q.itemHash] || 'Currency', q: q.quantity || 0, i: ci[q.itemHash] || '' })), pk: [...pk].slice(0, 40) });
  });
  items.sort((a, b) => a.o - b.o);
  return { name: vd.label || vd.n || 'Vendor', items };
});



// Weapon usage and totals.
async function sumChars(m, ch, suffix) {
  // A failed call must not silently drop a character's weapons, so each one is retried before giving up.
  const parts = await pool(ch, 3, async (c) => {
    let err; for (let t = 0; t < 3; t++) { try { return await api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Character/${c}/Stats/${suffix}/`); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 400 * (t + 1))); } }
    throw err;
  });
  if (ch.length && !parts.some(Boolean)) throw new Error('Bungie did not return your weapon stats. Try again in a moment.');
  return parts.filter(Boolean);
}
H('act:weapons', async () => {
  const m = await acct(), df = await defs();
  // Every character the account ever had (deleted ones too), so no weapon is left out.
  let ch = await charList(m);
  try {
    const r = await api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Stats/`);
    for (const c of r.characters || []) if (c.characterId && /^\d+$/.test(String(c.characterId)) && !ch.includes(String(c.characterId))) ch.push(String(c.characterId));
  } catch (e) { /* live characters only */ }
  const parts = await sumChars(m, ch, 'UniqueWeapons'), tot = {};
  parts.forEach((p) => (p.weapons || []).forEach((w) => {
    const k = w.referenceId, v = w.values || {}; if (!k) return;
    const o = (tot[k] = tot[k] || { h: k, k: 0, p: 0 });
    o.k += ((v.uniqueWeaponKills || {}).basic || {}).value || 0; o.p += ((v.uniqueWeaponPrecisionKills || {}).basic || {}).value || 0;
  }));
  const all = Object.values(tot).filter((o) => o.k > 0);
  // Bungie's own weapon list only covers exotics. Every other weapon comes from the run reports counted by act:wscan (kept on this computer).
  const S = wsLoad(), sc = [];
  if (S.m === m.membershipId) for (const k in S.w) if (!tot[k] && S.w[k][0] > 0) sc.push({ h: k, k: S.w[k][0], p: S.w[k][1] });
  const miss = all.concat(sc).filter((o) => !df.d[o.h]).slice(0, 3000);
  await pool(miss, 8, (o) => itemInfo(o.h));
  // Reissued versions of one weapon (same name and type) are shown as one weapon.
  const by = {}, exo = new Set();
  const addW = (o, scanned) => {
    const d = df.d[o.h] || ITD[o.h] || {}, known = d.n && d.n !== 'Item', n = known ? d.n : 'Unknown weapon', t = d.t || '', key = known ? n.toLowerCase() + '|' + t : 'h|' + o.h;
    if (scanned && exo.has(key)) return;
    if (!scanned) exo.add(key);
    const x = (by[key] = by[key] || { h: o.h, n, i: d.i || '', t, k: 0, p: 0, best: 0 });
    x.k += o.k; x.p += o.p; if (o.k > x.best) { x.best = o.k; x.h = o.h; if (d.i) x.i = d.i; }
  };
  all.forEach((o) => addW(o, false));
  sc.forEach((o) => addW(o, true));
  return { weapons: Object.values(by).sort((a, b) => b.k - a.k).map((x) => ({ h: x.h, n: x.n, i: x.i, t: x.t, k: Math.round(x.k), p: Math.round(x.p) })) };
});
// ---- Every weapon: legendary weapons are counted from each run's post game report (like act:feats) and kept on this computer ----
let WSC = null, HIST2 = null;
const wsFile = () => apath('wstats.json');
function wsLoad() {
  if (!WSC) { try { WSC = JSON.parse(fs.readFileSync(wsFile(), 'utf8')) || {}; } catch (e) { WSC = {}; } }
  if (!WSC.done || !WSC.w || !WSC.bad) { WSC.done = {}; WSC.w = {}; WSC.bad = {}; }
  return WSC;
}
function wsSave() { try { fs.writeFileSync(wsFile(), JSON.stringify(WSC)); } catch (e) { /* disk full or locked */ } }
H('act:wscan', async () => {
  const m = await acct(); let S = wsLoad();
  if (S.m !== m.membershipId) { WSC = { m: m.membershipId, done: {}, w: {}, bad: {} }; S = WSC; }
  const ch = await charList(m);
  try {
    const r = await api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Stats/`);
    for (const c of r.characters || []) if (c.characterId && /^\d+$/.test(String(c.characterId)) && !ch.includes(String(c.characterId))) ch.push(String(c.characterId));
  } catch (e) { /* live characters only */ }
  if (!HIST2 || HIST2.m !== m.membershipId || Date.now() - HIST2.at > 600000) HIST2 = { m: m.membershipId, at: Date.now(), runs: await histAll(m, ch, 0, 12000) };
  const mine = new Set(ch.map(String)), seen = new Set(), need = [];
  for (const x of HIST2.runs) {
    const id = x.activityDetails && x.activityDetails.instanceId; if (!id || seen.has(id) || !hv(x, 'kills')) continue;
    seen.add(id);
    if (!S.done[id] && (S.bad[id] || 0) < 2) need.push(id);
  }
  const batch = need.slice(0, 150);
  await pool(batch, 6, async (id) => {
    try {
      const p = await pgcr(id);
      for (const e of p.entries || []) {
        const cid = String(e.characterId || ''), mid = String(((e.player || {}).destinyUserInfo || {}).membershipId || '');
        if (!mine.has(cid) && mid !== String(m.membershipId)) continue;
        for (const w of (e.extended && e.extended.weapons) || []) {
          const k = w.referenceId; if (!k) continue;
          const v = w.values || {}, o = (S.w[k] = S.w[k] || [0, 0]);
          o[0] += ((v.uniqueWeaponKills || {}).basic || {}).value || 0; o[1] += ((v.uniqueWeaponPrecisionKills || {}).basic || {}).value || 0;
        }
      }
      S.done[id] = 1;
    } catch (e) { S.bad[id] = (S.bad[id] || 0) + 1; }
  });
  if (batch.length) wsSave();
  return { left: need.length - batch.length, total: seen.size, scanned: seen.size - (need.length - batch.length) };
});
// Play time, the way Time Wasted on Destiny counts it: ACTIVE time is the time spent inside activities (Bungie's own per-activity stats);
// the platform total (what the character screen shows, minutesPlayedTotal) also holds orbit, the Tower, menus, loading and being AFK.
// Bungie does not record AFK itself, so "AFK and idle" is the platform total minus the active time (it is the number that site shows as AFK).
// Each mode is asked for on its own. Strikes (18) already holds Nightfalls; private matches (32) are not part of Crucible (5) at Bungie, so they are added to it here.
const PT_MODES = [['Story', 2], ['Strikes', 18], ['Patrol', 6], ['Raids', 4], ['Dungeons', 82], ['Lost Sectors', 87], ['Gambit', 63], ['Crucible', 5], ['Private matches', 32], ['PvE', 7]];
const PT_HIDE = new Set(['PvE', 'Private matches']);
H('act:playtime', async () => {
  const m = await acct(), base = `/Destiny2/${m.membershipType}/Account/${m.membershipId}/`;
  const [pr, st] = await Promise.all([api(pbase(m) + '?components=200'), api(base + 'Stats/')]);
  const cd = (pr.characters && pr.characters.data) || {};
  const sec = (o) => ((((o || {}).allTime || {}).secondsPlayed || {}).basic || {}).value || 0;
  const all = st.mergedAllCharacters || {}, delSec = sec((st.mergedDeletedCharacters || {}).merged);
  // Every character, deleted ones too. A single mode per call, so the answer never depends on what Bungie names the mode in its reply.
  const ids = [...new Set([...Object.keys(cd), ...(st.characters || []).map((c) => String(c.characterId)).filter((c) => /^\d+$/.test(c))])];
  const first = (r) => { const v = r && Object.values(r).find((q) => q && q.allTime); return v ? sec(v) : 0; };
  const jobs = []; ids.forEach((c) => PT_MODES.forEach(([n, md]) => jobs.push([c, n, md])));
  const got = await pool(jobs, 6, async ([c, n, md]) => { try { return first(await api(base + `Character/${c}/Stats/?modes=${md}&periodType=2`)); } catch (e) { return -1; } });
  const per = {}, tot = {}; let bad = 0;
  jobs.forEach(([c, n], i) => { const v = got[i]; if (v < 0) { bad++; return; } (per[c] = per[c] || {})[n] = v; tot[n] = (tot[n] || 0) + v; });
  const pm = 'Private matches'; tot.Crucible = (tot.Crucible || 0) + (tot[pm] || 0); Object.values(per).forEach((p) => { p.Crucible = (p.Crucible || 0) + (p[pm] || 0); });
  // Crucible time from your match history too: Bungie's per-mode total for Crucible can come back empty even with matches
  // played. The larger of the two is used, account-wide and per character. PvE is then at most the rest of the active time.
  try {
    const L = HISTC && Date.now() - HISTC.at < 30 * 60000 ? HISTC.pvp : await histAll(m, ids, 5, 3000), hp = {}; let ht = 0;
    L.forEach((x) => { const v = hv(x, 'timePlayedSeconds'); hp[x._c] = (hp[x._c] || 0) + v; ht += v; });
    if (ht > (tot.Crucible || 0)) { tot.Crucible = ht; Object.keys(hp).forEach((c) => { const q = (per[c] = per[c] || {}); q.Crucible = Math.max(q.Crucible || 0, hp[c]); }); }
  } catch (e) { /* the per-mode totals stand */ }
  const byId = {}; (st.characters || []).forEach((c) => { byId[c.characterId] = c; });
  const rows = Object.values(cd).map((x) => {
    const s = byId[x.characterId] || {}, p = per[x.characterId] || {};
    return { id: x.characterId, cls: x.classType, light: x.light, em: x.emblemBackgroundPath || '', mp: (Number(x.minutesPlayedTotal) || 0) * 60, act: sec(s.merged), pve: p.PvE || 0, pvp: p.Crucible || 0, last: Date.parse(x.dateLastPlayed) || 0 };
  }).sort((a, b) => b.act - a.act);
  const live = rows.reduce((t, r) => t + r.mp, 0), total = live + delSec, acts = sec(all.merged);
  const typeSum = PT_MODES.filter(([n]) => !PT_HIDE.has(n)).reduce((t, [n]) => t + (tot[n] || 0), 0);
  const types = PT_MODES.filter(([n]) => !PT_HIDE.has(n)).map(([n]) => ({ n, s: tot[n] || 0 })).filter((q) => q.s > 0);
  if (acts > typeSum) types.push({ n: 'Other', s: acts - typeSum });
  // The last 30 days, one bar per day (best effort: the page simply leaves the chart out if Bungie does not answer).
  let days = [];
  try {
    const ymd = (t) => new Date(t).toISOString().slice(0, 10), now = Date.now(), d0 = ymd(now - 29 * 864e5), d1 = ymd(now), acc = {};
    const parts = await pool(ids, 6, async (c) => { try { return await api(base + `Character/${c}/Stats/?periodType=1&daystart=${d0}&dayend=${d1}`); } catch (e) { return null; } });
    parts.forEach((r) => { if (!r) return; ['allPvE', 'allPvP'].forEach((k) => (((r[k] || {}).daily) || []).forEach((q) => { const d = String(q.period || '').slice(0, 10); if (d) acc[d] = (acc[d] || 0) + ((((q.values || {}).secondsPlayed || {}).basic || {}).value || 0); })); });
    for (let i = 29; i >= 0; i--) { const d = ymd(now - i * 864e5); days.push({ d, s: acc[d] || 0 }); }
    if (!days.some((q) => q.s > 0)) days = [];
  } catch (e) { days = []; }
  rows.forEach((r) => { r.pve = Math.max(0, Math.min(r.pve, r.act - r.pvp)); });
  return { rows, del: delSec, live, total, acts, idle: Math.max(0, total - acts), pve: Math.max(0, Math.min(tot.PvE || 0, acts - (tot.Crucible || 0))), pvp: tot.Crucible || 0, types, days, bad, at: Date.now() };
});
H('act:totals', async () => {
  const m = await acct();
  const r = await api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Stats/`);
  const a = (((r.mergedAllCharacters || {}).merged || {}).allTime) || {}, g = (k) => (a[k] && a[k].basic && a[k].basic.value) || 0;
  return { kills: g('kills'), deaths: g('deaths'), precision: g('precisionKills'), secs: g('secondsPlayed'), cleared: g('activitiesCleared'), at: Date.now() };
});

// Raid and dungeon clears. Activity names come from the manifest, downloaded once and kept.
let ACTS = null;
async function actsDefs() {
  const mf = await manifest(), v = mf.version + '.a1';
  if (ACTS && ACTS.v === v) return ACTS;
  const f = path.join(app.getPath('userData'), 'acts.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === v) return (ACTS = o); } catch (e) { /* download below */ }
  send('Downloading raid and dungeon data. This only happens on the first run and after game updates.');
  const o = { v, a: {} };
  await table(mf.jsonWorldComponentContentPaths.en.DestinyActivityDefinition, (k, x) => {
    const t = x.activityTypeHash; if (t !== 2043403989 && t !== 608898761) return;
    const n = x.displayProperties && x.displayProperties.name; if (!n) return;
    o.a[k] = { n, t: t === 2043403989 ? 'raid' : 'dungeon', img: x.pgcrImage || '', l: x.activityLightLevel || 0 };
  });
  fs.writeFileSync(f, JSON.stringify(o));
  return (ACTS = o);
}
H('act:clears', async () => {
  const m = await acct(), ch = await charList(m), ad = await actsDefs();
  const parts = await sumChars(m, ch, 'AggregateActivityStats'), g = {};
  parts.forEach((p) => (p.activities || []).forEach((a) => {
    const d = ad.a[a.activityHash]; if (!d) return;
    const v = a.values || {}, c = ((v.activityCompletions || {}).basic || {}).value || 0, ms = ((v.fastestCompletionMsForActivity || {}).basic || {}).value || 0;
    const base = d.n.replace(/\s*[:(\-–]\s*(normal|master|prestige|legend|contest|standard|expert|hard|heroic|explorer|eternity|ultimatum|customi[sz]e)\b.*$/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const o = (g[d.t + '|' + base] = g[d.t + '|' + base] || { n: base, t: d.t, c: 0, mc: 0, f: 0, img: '' });
    const master = /master|prestige/i.test(d.n);
    o.c += c; if (master) o.mc += c;
    if (ms > 0 && (!o.f || ms < o.f)) o.f = ms;
    if (d.img && !o.img) o.img = d.img;
  }));
  return { rows: Object.values(g).filter((o) => o.c > 0).sort((a, b) => (a.t === b.t ? b.c - a.c : a.t < b.t ? -1 : 1)).map((o) => ({ ...o, c: Math.round(o.c), mc: Math.round(o.mc) })) };
});

// ---- Solo, flawless and solo flawless runs, worked out from each run's post game report (like raid.report does) ----
const clrBase = (n) => n.replace(/\s*[:(\-–]\s*(normal|master|prestige|legend|contest|standard|expert|hard|heroic|explorer|eternity|ultimatum|customi[sz]e)\b.*$/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
let FEATS = null, HIST = null;
const featFile = () => apath('feats.json');
function featLoad() { if (!FEATS) { try { FEATS = JSON.parse(fs.readFileSync(featFile(), 'utf8')) || {}; } catch (e) { FEATS = {}; } } return FEATS; }
function featSave() { try { fs.writeFileSync(featFile(), JSON.stringify(FEATS)); } catch (e) { /* disk full or locked */ } }
async function histAll(m, ch, mode, max) {
  const out = [];
  for (const c of ch) {
    for (let page = 0; page < 12 && out.length < max; page++) {
      let r; try { r = await api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Character/${c}/Stats/Activities/?mode=${mode}&count=250&page=${page}`); } catch (e) { break; }
      const a = (r && r.activities) || []; a.forEach((x) => { x._c = c; out.push(x); });
      if (a.length < 250) break;
    }
  }
  return out;
}
const hv = (x, k) => (((x.values || {})[k] || {}).basic || {}).value || 0;
async function pgcr(id) {
  try { return await api('/Destiny2/Stats/PostGameCarnageReport/' + id + '/', false); }
  catch (e) {
    const r = await fetch('https://stats.bungie.net/Platform/Destiny2/Stats/PostGameCarnageReport/' + id + '/', { headers: { 'X-API-Key': rd().apiKey, 'User-Agent': UA } });
    const j = await readJson(r); if (j.ErrorCode !== 1) throw new Error(j.Message || 'Bungie error'); return j.Response;
  }
}
async function raidHist(m, force) {
  if (force || !HIST || Date.now() - HIST.at > 600000) { const ch = await charList(m); HIST = { at: Date.now(), runs: [...await histAll(m, ch, 4, 3000), ...await histAll(m, ch, 82, 3000)] }; }
  return HIST.runs;
}
// Every run of one raid or dungeon (opened by clicking its card): clears, attempts, times, and solo / flawless where known.
H('act:clrRuns', async (e, v) => {
  OBJ(v); const name = TXT(v.n, 120), t = v.t === 'raid' ? 'raid' : 'dungeon';
  const m = await acct(), ad = await actsDefs(), F = featLoad();
  const all = (await raidHist(m, !!v.force)).filter((x) => { const d = ad.a[x.activityDetails && x.activityDetails.referenceId]; return d && d.t === t && clrBase(d.n) === name; });
  all.sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const runs = all.map((x) => {
    const d = ad.a[x.activityDetails.referenceId], id = x.activityDetails.instanceId, f = F[id];
    return { id, at: Date.parse(x.period) || 0, c: x._c, v: d.n, img: d.img, ok: hv(x, 'completed') === 1 && hv(x, 'completionReason') === 0 ? 1 : 0, dur: hv(x, 'activityDurationSeconds'), k: hv(x, 'kills'), d: hv(x, 'deaths'), a: hv(x, 'assists'), pc: hv(x, 'playerCount'), f: f === undefined ? -1 : f };
  });
  const clears = runs.filter((r) => r.ok), byC = {}, byV = {};
  clears.forEach((r) => { byC[r.c] = (byC[r.c] || 0) + 1; byV[r.v] = (byV[r.v] || 0) + 1; });
  const durs = clears.map((r) => r.dur).filter((x) => x > 0);
  return {
    n: name, t, img: (runs.find((r) => r.img) || {}).img || '', total: runs.length, clears: clears.length,
    fastest: durs.length ? Math.min(...durs) : 0, avg: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0,
    time: runs.reduce((a, r) => a + r.dur, 0), kills: runs.reduce((a, r) => a + r.k, 0), deaths: runs.reduce((a, r) => a + r.d, 0),
    last: clears.length ? clears[0].at : 0, first: clears.length ? clears[clears.length - 1].at : 0,
    byChar: byC, byVer: Object.entries(byV).sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ n, c })),
    runs: runs.slice(0, 250),
  };
});
H('act:feats', async () => {
  const m = await acct(), ad = await actsDefs(), F = featLoad();
  await raidHist(m, false);
  const runs = HIST.runs.filter((x) => hv(x, 'completed') === 1 && hv(x, 'completionReason') === 0 && ad.a[x.activityDetails && x.activityDetails.referenceId]);
  // Only runs that could count need the full report: you were alone, or you did not die.
  const need = runs.filter((x) => { const id = x.activityDetails.instanceId; return F[id] === undefined && (hv(x, 'playerCount') === 1 || hv(x, 'deaths') === 0); });
  const batch = need.slice(0, 120);
  await pool(batch, 6, async (x) => {
    const id = x.activityDetails.instanceId, p = await pgcr(id);
    const fresh = p.activityWasStartedFromBeginning !== false, ents = p.entries || [];
    const ids = new Set(ents.map((e) => ((e.player || {}).destinyUserInfo || {}).membershipId).filter(Boolean));
    const solo = fresh && ids.size === 1, flaw = fresh && ents.length > 0 && ents.every((e) => hv(e, 'deaths') === 0);
    F[id] = (solo ? 1 : 0) + (flaw ? 2 : 0);
  });
  if (batch.length) featSave();
  const g = {};
  runs.forEach((x) => {
    const d = ad.a[x.activityDetails.referenceId], k = d.t + '|' + clrBase(d.n), f = F[x.activityDetails.instanceId] || 0;
    const o = (g[k] = g[k] || { n: clrBase(d.n), t: d.t, s: 0, fl: 0, sf: 0 });
    if (f & 1) o.s++; if (f & 2) o.fl++; if (f === 3) o.sf++;
  });
  return { rows: Object.values(g), todo: need.length - batch.length, checked: runs.length };
});
// ---- Exotic collection: every exotic weapon and armor piece, whether you have unlocked it, and where it comes from ----
let EXD = null;
async function exoDefs() {
  const m = await manifest(), v = m.version + '.e1';
  if (EXD && EXD.v === v) return EXD;
  const f = path.join(app.getPath('userData'), 'exotics.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === v) return (EXD = o); } catch (e) { /* download below */ }
  const df = await defs(), P = m.jsonWorldComponentContentPaths.en;
  send('Downloading the collections list. This only happens on the first run and after game updates.');
  const GEAR = new Set([1498876634, 2465295065, 953998645, 3448274439, 3551918588, 14239492, 20886954, 1585787867]);
  const o = { v, c: {} };
  await table(P.DestinyCollectibleDefinition, (k, x) => {
    const d = df.d[x.itemHash]; if (!d || d.r !== 'Exotic' || !GEAR.has(d.b)) return;
    o.c[k] = { ih: x.itemHash, n: d.n, i: d.i, b: d.b, cl: d.c === undefined ? 3 : d.c, t: d.t || '', src: String(x.sourceString || '').replace(/^Source:\s*/i, '').slice(0, 200) };
  });
  try { fs.writeFileSync(f, JSON.stringify(o)); } catch (e) { /* kept in memory */ }
  return (EXD = o);
}
H('act:exotics', async () => {
  const m = await acct(), E = await exoDefs();
  const pr = await api(pbase(m) + '?components=200,800');
  const pc = (pr.profileCollectibles && pr.profileCollectibles.data && pr.profileCollectibles.data.collectibles) || {};
  const cc = (pr.characterCollectibles && pr.characterCollectibles.data) || {};
  const stateOf = (h) => { if (pc[h]) return pc[h].state; for (const c in cc) { const q = (cc[c].collectibles || {})[h]; if (q) return q.state; } return undefined; };
  const by = {};
  for (const h in E.c) {
    const x = E.c[h], st = stateOf(h); if (st === undefined) continue; // not in this account's collections at all
    if (st & 4) continue; // invisible (not released / hidden)
    const got = !(st & 1), key = x.n + '|' + x.cl;
    if (!by[key] || (got && !by[key].got)) by[key] = { h: +h, ih: x.ih, n: x.n, i: x.i, b: x.b, cl: x.cl, t: x.t, src: x.src, got: got ? 1 : 0 };
  }
  return { items: Object.values(by).sort((a, b) => a.n.localeCompare(b.n)) };
});
// Activity history for PvE and Crucible, read once and shared by Personal bests and the Crucible tab (kept for 30 minutes).
let HISTC = null;
async function histBoth(force) {
  if (!force && HISTC && Date.now() - HISTC.at < 30 * 60000) return HISTC;
  const m = await acct(), ch = await charList(m);
  const pve = await histAll(m, ch, 7, 3000), pvp = await histAll(m, ch, 5, 3000);
  HISTC = { at: Date.now(), pve, pvp }; return HISTC;
}
const isWin = (x) => !!(x.values && x.values.standing) && hv(x, 'standing') === 0;
// Personal bests from your activity history: kills, K/D, assists, longest activities, best days and streaks, fastest clears.
let PBS = null;
H('act:pbs', async () => {
  if (PBS && Date.now() - PBS.at < 30 * 60000) return PBS.v;
  const { pve, pvp } = await histBoth();
  const best = (list, f, ok) => { let b = null, bv = -Infinity; for (const x of list) { if (ok && !ok(x)) continue; const v = f(x); if (v > bv) { bv = v; b = x; } } return b ? { x: b, v: bv } : null; };
  const done = (x) => hv(x, 'completed') === 1;
  const rows = [];
  const add = async (g, k, label, r, fmtv) => {
    if (!r || !(r.v > 0)) return;
    const a = await actInfo(r.x.activityDetails.referenceId);
    rows.push({ g, k, label, v: r.v, txt: fmtv(r.v), n: a.n || 'Activity', img: a.img || '', at: Date.parse(r.x.period) || 0, id: r.x.activityDetails.instanceId, c: r.x._c });
  };
  const n0 = (v) => Math.round(v).toLocaleString('en-US'), dur = (v) => { const h = Math.floor(v / 3600), mm = Math.round((v % 3600) / 60); return h ? h + 'h ' + mm + 'm' : mm + 'm'; };
  const kd = (x) => (hv(x, 'deaths') ? hv(x, 'kills') / hv(x, 'deaths') : hv(x, 'kills'));
  const kda = (x) => (hv(x, 'deaths') ? (hv(x, 'kills') + hv(x, 'assists')) / hv(x, 'deaths') : hv(x, 'kills') + hv(x, 'assists'));
  await add('PvE', 'pvek', 'Most kills in one activity', best(pve, (x) => hv(x, 'kills'), done), n0);
  await add('PvE', 'pvea', 'Most assists in one activity', best(pve, (x) => hv(x, 'assists'), done), n0);
  await add('PvE', 'pvekd', 'Best K/D in one activity (50+ kills)', best(pve, kd, (x) => done(x) && hv(x, 'kills') >= 50), (v) => v.toFixed(1));
  await add('PvE', 'pves', 'Highest score in one activity', best(pve, (x) => hv(x, 'score'), done), n0);
  await add('PvE', 'pvel', 'Longest activity you finished', best(pve, (x) => hv(x, 'activityDurationSeconds'), done), dur);
  await add('Crucible', 'pvpk', 'Most kills in one match', best(pvp, (x) => hv(x, 'kills')), n0);
  await add('Crucible', 'pvpkd', 'Best K/D in one match (10+ kills)', best(pvp, kd, (x) => hv(x, 'kills') >= 10), (v) => v.toFixed(2));
  await add('Crucible', 'pvpkda', 'Best KDA in one match (10+ kills)', best(pvp, kda, (x) => hv(x, 'kills') >= 10), (v) => v.toFixed(2));
  await add('Crucible', 'pvpa', 'Most assists in one match', best(pvp, (x) => hv(x, 'assists')), n0);
  await add('Crucible', 'pvps', 'Highest score in one match', best(pvp, (x) => hv(x, 'score')), n0);
  // per-day and streak records (no single activity to open, so no report link)
  const days = {}; [...pve, ...pvp].forEach((x) => { const d = String(x.period || '').slice(0, 10); if (!d) return; const o = (days[d] = days[d] || { n: 0, k: 0, t: 0 }); o.n++; o.k += hv(x, 'kills'); o.t += hv(x, 'timePlayedSeconds') || hv(x, 'activityDurationSeconds'); });
  const dk = Object.keys(days).sort();
  const topDay = (f) => dk.reduce((b, d) => (!b || f(days[d]) > f(days[b]) ? d : b), '');
  const dayRow = (k, label, d, txt) => { if (d) rows.push({ g: 'Overall', k, label, txt, n: new Date(d + 'T12:00:00Z').toLocaleDateString(), img: '', at: Date.parse(d) || 0 }); };
  { const d = topDay((o) => o.n); dayRow('dayn', 'Most activities in one day', d, d ? n0(days[d].n) : ''); }
  { const d = topDay((o) => o.k); dayRow('dayk', 'Most kills in one day', d, d ? n0(days[d].k) : ''); }
  { const d = topDay((o) => o.t); dayRow('dayt', 'Longest day of play', d, d ? dur(days[d].t) : ''); }
  { let bestS = 0, cur = 0, prev = null, end = ''; for (const d of dk) { const t = Date.parse(d); cur = prev !== null && t - prev === 864e5 ? cur + 1 : 1; prev = t; if (cur > bestS) { bestS = cur; end = d; } } if (bestS > 1) dayRow('streak', 'Most days in a row played', end, bestS + ' days'); }
  { const pv = pvp.slice().sort((a, b) => String(a.period).localeCompare(String(b.period))); let bestW = 0, cur = 0, end = null; for (const x of pv) { cur = isWin(x) ? cur + 1 : 0; if (cur > bestW) { bestW = cur; end = x; } } if (bestW > 1 && end) dayRow('wstreak', 'Longest Crucible win streak', String(end.period).slice(0, 10), bestW + ' wins'); }
  const wins = pvp.filter(isWin).length;
  const v = { rows, games: { pve: pve.length, pvp: pvp.length, wins } };
  PBS = { at: Date.now(), v };
  return v;
});
// Crucible tracker: totals, win rate, K/D and KDA, by playlist and by map, recent matches and the trend of your last matches.
H('act:crucible', async (e, v) => {
  const force = !!(v && v.force);
  const { pvp } = await histBoth(force);
  const L = pvp.slice().sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const sum = (list) => { const t = { m: list.length, w: 0, k: 0, d: 0, a: 0, s: 0, time: 0 }; list.forEach((x) => { if (isWin(x)) t.w++; t.k += hv(x, 'kills'); t.d += hv(x, 'deaths'); t.a += hv(x, 'assists'); t.s += hv(x, 'score'); t.time += hv(x, 'timePlayedSeconds') || hv(x, 'activityDurationSeconds'); }); t.kd = t.d ? t.k / t.d : t.k; t.kda = t.d ? (t.k + t.a) / t.d : t.k + t.a; t.wr = t.m ? t.w / t.m : 0; return t; };
  const groupBy = async (key) => {
    const g = {}; L.forEach((x) => { const h = key(x); if (!h) return; (g[h] = g[h] || []).push(x); });
    const hs = Object.keys(g).sort((a, b) => g[b].length - g[a].length).slice(0, 24);
    const infos = await pool(hs, 6, (h) => actInfo(+h));
    return hs.map((h, i) => ({ h: +h, n: (infos[i] && infos[i].n) || 'Unknown', img: (infos[i] && infos[i].img) || '', ...sum(g[h]) }));
  };
  const playlists = (await groupBy((x) => x.activityDetails && x.activityDetails.directorActivityHash)).filter((o) => o.n !== 'Unknown');
  // playlists with the same name (different versions of Control and so on) are merged
  const pm = {}; playlists.forEach((o) => { const k = o.n.replace(/\s*:\s*(matchmade|freelance|custom).*$/i, ''); const t = pm[k]; if (!t) pm[k] = { ...o, n: k }; else { ['m', 'w', 'k', 'd', 'a', 's', 'time'].forEach((f) => { t[f] += o[f]; }); t.kd = t.d ? t.k / t.d : t.k; t.kda = t.d ? (t.k + t.a) / t.d : t.k + t.a; t.wr = t.m ? t.w / t.m : 0; } });
  const maps = await groupBy((x) => x.activityDetails && x.activityDetails.referenceId);
  const recentL = L.slice(0, 20), rinfo = await pool(recentL, 6, (x) => actInfo(x.activityDetails.referenceId)), pinfo = await pool(recentL, 6, (x) => actInfo(x.activityDetails.directorActivityHash));
  const recent = recentL.map((x, i) => ({ id: x.activityDetails.instanceId, n: (rinfo[i] && rinfo[i].n) || 'Match', mode: (pinfo[i] && pinfo[i].n) || '', img: (rinfo[i] && rinfo[i].img) || '', at: Date.parse(x.period) || 0, w: x.values && x.values.standing ? (isWin(x) ? 1 : 0) : -1, k: hv(x, 'kills'), d: hv(x, 'deaths'), a: hv(x, 'assists'), s: hv(x, 'score'), c: x._c }));
  const trend = L.slice(0, 40).reverse().map((x) => ({ kd: hv(x, 'deaths') ? hv(x, 'kills') / hv(x, 'deaths') : hv(x, 'kills'), w: isWin(x) ? 1 : 0 }));
  const week = L.filter((x) => Date.now() - Date.parse(x.period) < 7 * 864e5);
  let curS = 0; for (const x of L) { if (isWin(x)) curS++; else break; }
  return { total: sum(L), week: sum(week), last25: sum(L.slice(0, 25)), playlists: Object.values(pm).sort((a, b) => b.m - a.m), maps, recent, trend, streak: curS };
});
// Recent activities (all modes), newest first, for the recap.
H('act:recent', async () => {
  const m = await acct(), ch = await charList(m), c0 = await api(pbase(m) + '?components=200'), cd = (c0.characters && c0.characters.data) || {};
  const parts = await pool(ch, 3, (c) => api(`/Destiny2/${m.membershipType}/Account/${m.membershipId}/Character/${c}/Stats/Activities/?mode=0&count=25&page=0`).then((r) => ((r && r.activities) || []).map((x) => ({ ...x, _c: c }))));
  const seenI = new Set();
  const list = parts.filter(Boolean).flat().sort((a, b) => Date.parse(b.period) - Date.parse(a.period)).filter((x) => { const k = x.activityDetails && x.activityDetails.instanceId; if (!k || seenI.has(k)) return !k; seenI.add(k); return true; }).slice(0, 40);
  const infos = await pool(list, 6, (x) => actInfo(x.activityDetails.referenceId || x.activityDetails.directorActivityHash));
  return {
    acts: list.map((x, i) => {
      const f = infos[i] || {}, f2 = {};
      return {
        id: x.activityDetails.instanceId, at: Date.parse(x.period) || 0, n: f2.n || f.n || 'Activity', cz: f.cz || 0, tn: f.tn || '', img: f2.img || f.img || '', cls: (cd[x._c] || {}).classType,
        k: hv(x, 'kills'), d: hv(x, 'deaths'), a: hv(x, 'assists'), kd: hv(x, 'killsDeathsRatio'), s: hv(x, 'activityDurationSeconds'), ok: hv(x, 'completed') === 1 && hv(x, 'completionReason') === 0 ? 1 : 0,
        st: hv(x, 'standing'), md: x.activityDetails.mode || 0, pc: hv(x, 'playerCount'),
      };
    }),
  };
});

// Everyone who was in one activity and what they did (post game carnage report). Bungie only shares kills, deaths, assists, precision, weapons and time; boss damage is not part of it.
const PGC = {};
H('act:pgcr', async (e, v) => { await ensureM();
  OBJ(v); const id = ID(v.id);
  if (PGC[id]) return PGC[id];
  const df = await defs();
  let j = null, last = '';
  for (const host of ['https://stats.bungie.net', BASE]) {
    try {
      const c = rd(), r = await fetch(host + '/Platform/Destiny2/Stats/PostGameCarnageReport/' + id + '/', { headers: { 'X-API-Key': c.apiKey, 'User-Agent': UA } });
      const o = await readJson(r); if (o.ErrorCode === 1) { j = o.Response; break; } last = o.Message || '';
    } catch (er) { last = String((er && er.message) || er); }
  }
  if (!j) throw new Error(last || 'Bungie has not published this activity report yet.');
  const g = (o, k) => ((((o || {}).values || {})[k] || {}).basic || {}).value || 0;
  const ents = (j.entries || []).slice(0, 24).map((en) => {
    const u = (en.player && en.player.destinyUserInfo) || {}, ex = en.extended || {};
    const code = u.bungieGlobalDisplayNameCode, nm = u.bungieGlobalDisplayName || u.displayName || 'Guardian';
    const wep = (ex.weapons || []).map((w) => { const d = df.d[w.referenceId] || {}; return { n: d.n || 'Weapon', i: d.i || '', k: g(w, 'uniqueWeaponKills'), pk: g(w, 'uniqueWeaponPrecisionKills') }; }).sort((a, b) => b.k - a.k).slice(0, 5);
    return { name: nm, code: code ? String(code).padStart(4, '0') : '', cls: (en.player && en.player.characterClass) || '', pw: (en.player && en.player.lightLevel) || 0, k: g(en, 'kills'), d: g(en, 'deaths'), a: g(en, 'assists'), kd: g(en, 'killsDeathsRatio'), eff: g(en, 'efficiency'), s: g(en, 'activityDurationSeconds'), ok: g(en, 'completed'), score: g(en, 'score'), pk: ex.values && ex.values.precisionKills ? ex.values.precisionKills.basic.value : 0, wep, me: u.membershipId === M.membershipId ? 1 : 0 };
  });
  const out = { at: Date.parse(j.period) || 0, ents };
  if (ents.length && ents.every((q) => q.s)) PGC[id] = out;
  return out;
});
// ---- DIM loadouts: read a dim.gg share link (or the JSON inside an app.destinyitemmanager.com link) and subclass options ----
const HD = {};
async function hdef(h) {
  if (HD[h]) return HD[h];
  const df = await defs(), x = df.d[h] || df.g[h];
  if (x) return (HD[h] = { n: x.n, i: x.i, b: x.b, t: x.t || '', c: x.c === undefined ? 3 : x.c });
  if (df.p[h]) return (HD[h] = { n: df.p[h].n, i: df.p[h].i, b: 0, t: df.p[h].c || '', c: 3 });
  try {
    const o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + h + '/', false), dp = o.displayProperties || {};
    return (HD[h] = { n: dp.name || '', i: dp.icon || '', b: (o.inventory && o.inventory.bucketTypeHash) || 0, t: o.itemTypeDisplayName || '', c: o.classType === undefined ? 3 : o.classType });
  } catch (er) { return { n: '', i: '', b: 0, t: '', c: 3 }; }
}
function dimParse(s) {
  s = String(s || '').trim().slice(0, 60000);
  let m = /dim\.gg\/([a-z2-7]{4,12})(?:[/?#]|$)/i.exec(s) || /[?&]shareId=([a-z2-7]{4,12})/i.exec(s);
  if (m) return { share: m[1].toLowerCase() };
  m = /[?&]loadout=([^&#\s]+)/.exec(s);
  if (m) { try { return { json: JSON.parse(decodeURIComponent(m[1])) }; } catch (er) { /* try the other forms */ } }
  if (s[0] === '{') { try { const o = JSON.parse(s); return { json: o.loadout && typeof o.loadout === 'object' ? o.loadout : o }; } catch (er) { /* not JSON */ } }
  if (/^[a-z2-7]{7}$/i.test(s)) return { share: s.toLowerCase() };
  return null;
}
H('dim:fetch', async (e, v) => {
  OBJ(v); const inp = dimParse(TXT(v.text, 60000));
  if (!inp) throw new Error('That is not a DIM loadout link. It should look like https://dim.gg/abcdefg/Name');
  let L = inp.json;
  if (inp.share) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    let r; try { r = await fetch('https://api.destinyitemmanager.com/loadout_share?shareId=' + encodeURIComponent(inp.share), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctl.signal }); }
    catch (er) { throw new Error('Could not reach DIM. Check your internet connection.'); } finally { clearTimeout(t); }
    if (r.status === 404) throw new Error('DIM says that link does not exist (it may have expired).');
    if (!r.ok) throw new Error('DIM did not answer (HTTP ' + r.status + ').');
    const j = await r.json().catch(() => null); L = j && j.loadout;
  }
  if (!L || typeof L !== 'object') throw new Error('That DIM loadout could not be read.');
  const cl = (n, d) => (Number.isInteger(n) ? n : d);
  const items = [];
  for (const [list, eq] of [[L.equipped, 1], [L.unequipped, 0]]) {
    for (const q of (Array.isArray(list) ? list : []).slice(0, 60)) {
      if (!q || typeof q !== 'object' || !Number.isInteger(q.hash) || q.hash <= 0 || q.hash > 4294967295) continue;
      const d = await hdef(q.hash), so = [];
      const ov = q.socketOverrides && typeof q.socketOverrides === 'object' ? q.socketOverrides : {};
      for (const k of Object.keys(ov).slice(0, 40)) { const si = +k, ph = ov[k]; if (Number.isInteger(si) && si >= 0 && si < 200 && Number.isInteger(ph) && ph > 0 && ph <= 4294967295) { const pd = await hdef(ph); so.push([si, ph, pd.i, pd.n]); } }
      items.push({ h: q.hash, id: /^\d{1,20}$/.test(String(q.id || '')) ? String(q.id) : '', e: eq, b: d.b, n: d.n, i: d.i, t: d.t, c: d.c, so });
    }
  }
  const P = L.parameters && typeof L.parameters === 'object' ? L.parameters : {};
  const hl = async (a, n) => { const o = []; for (const h of (Array.isArray(a) ? a : []).slice(0, n)) if (Number.isInteger(h) && h > 0 && h <= 4294967295) { const d = await hdef(h); o.push([h, d.n, d.i, d.t]); } return o; };
  // DIM newer format: armor mods assigned per armor slot (bucket hash -> mod hashes)
  const mbk = [];
  if (P.modsByBucket && typeof P.modsByBucket === 'object') {
    for (const k of Object.keys(P.modsByBucket).slice(0, 12)) {
      const b = +k; if (!Number.isInteger(b) || b <= 0) continue;
      for (const h of (Array.isArray(P.modsByBucket[k]) ? P.modsByBucket[k] : []).slice(0, 8)) if (Number.isInteger(h) && h > 0 && h <= 4294967295) { const d = await hdef(h); if (d.n) mbk.push([h, d.n, d.i, d.t, b]); }
    }
  }
  return {
    mbk,
    n: String(L.name || '').slice(0, 80), o: String(L.notes || '').slice(0, 2000), c: cl(L.classType, 3) >= 0 && cl(L.classType, 3) <= 3 ? cl(L.classType, 3) : 3,
    items, mods: await hl(P.mods, 100), art: await hl(P.artifactUnlocks && P.artifactUnlocks.unlockedItemHashes, 40), mv: P.clearWeapons || P.clearArmor ? 1 : 0,
  };
});
// Armor mod sockets of one item (also the empty ones), so a loadout's mods can be put where they fit.
H('item:slots', async (e, v) => { await ensureM();
  OBJ(v); const id = ID(v.id), df = await defs();
  const r = await api(`/Destiny2/${M.membershipType}/Profile/${M.membershipId}/Item/${id}/?components=305`);
  const socks = (r.sockets && r.sockets.data && r.sockets.data.sockets) || [];
  return socks.map((s, si) => { const p = s.plugHash && df.p[s.plugHash]; return { si, cur: s.plugHash || 0, cat: p ? p.c || '' : '', vis: s.isVisible !== false }; })
    .filter((q) => q.vis && /enhancement/i.test(q.cat) && !/masterwork|tuning|catalyst|shader|ornament|fashion|cosmetic/i.test(q.cat));
});
// Every option the game offers for each subclass socket (super, abilities, aspects, fragments), taken from the item data.
const SUBO = {};
H('sub:opts', async (e, v) => {
  OBJ(v); const h = HASH(v.h);
  if (SUBO[h]) return SUBO[h];
  const df = await defs(), o = await api('/Destiny2/Manifest/DestinyInventoryItemDefinition/' + h + '/', false), ents = (o.sockets && o.sockets.socketEntries) || [], sets = {};
  const plugSet = async (ph) => { if (!ph) return []; if (!sets[ph]) { try { const s = await api('/Destiny2/Manifest/DestinyPlugSetDefinition/' + ph + '/', false); sets[ph] = (s.reusablePlugItems || []).map((q) => q.plugItemHash); } catch (er) { sets[ph] = []; } } return sets[ph]; };
  const out = [];
  for (let si = 0; si < ents.length && si < 60; si++) {
    const en = ents[si], hs = new Set();
    if (en.singleInitialItemHash) hs.add(en.singleInitialItemHash);
    for (const ph of [en.reusablePlugSetHash, en.randomizedPlugSetHash]) for (const x of await plugSet(ph)) hs.add(x);
    const opts = [...hs].map((x) => (df.p[x] ? [x, df.p[x].n, df.p[x].i, String(df.p[x].d || '').slice(0, 400), df.p[x].c || ''] : null)).filter((q) => q && q[1] && !/intrinsic|shader|ornament|emote|transmat|ghost|vehicle|ship|clan|finisher|tracker/i.test(q[4]) && !/^(empty|default)\b/i.test(q[1]));
    if (opts.length) out.push({ si, opts: opts.slice(0, 200) });
  }
  return (SUBO[h] = { sockets: out });
});

// Fireteam and friends online. Other players' loadouts are not available from Bungie.
H('act:fireteam', async () => {
  const m = await acct();
  let party = [], cur = '';
  try {
    const pr = await api(pbase(m) + '?components=1000');
    const t = (pr.profileTransitoryData && pr.profileTransitoryData.data) || {};
    party = (t.partyMembers || []).slice(0, 12).map((q) => ({ name: String(q.displayName || 'Guardian').slice(0, 40), st: q.status || 0 }));
    if (t.currentActivity && t.currentActivity.currentActivityHash) { const f = await actInfo(t.currentActivity.currentActivityHash); cur = f.n || ''; }
  } catch (er) { /* not in an activity */ }
  let friends = null;
  try {
    const r = await api('/Social/Friends/');
    friends = (r.friends || []).slice(0, 200).map((q) => ({ name: String(((q.bungieNetUser || {}).displayName) || ((q.bungieNetUser || {}).uniqueName) || 'Friend').slice(0, 40), on: q.onlineStatus === 1 ? 1 : 0 })).sort((a, b) => b.on - a.on || a.name.localeCompare(b.name));
  } catch (er) { friends = null; }
  return { party, cur, friends };
});

// ---- Target farming ----
// Targets are saved in targets.json (this computer only). Weapons are matched by name so every re-release of a weapon counts.
const tfPath = () => apath('targets.json');
const TF_WB = new Set([1498876634, 2465295065, 953998645]);
const TF_ARB = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);
const tfRead = () => { try { const j = JSON.parse(fs.readFileSync(tfPath(), 'utf8')); return Array.isArray(j.t) ? j.t : []; } catch (e) { return []; } };
const tfClean = (o) => {
  OBJ(o); const k = o.k === 'a' ? 'a' : 'w';
  const out = { id: TXT(String(o.id || ''), 20).replace(/[^a-z0-9]/gi, '').slice(0, 20) || ('t' + crypto.randomBytes(4).toString('hex')), k, name: TXT(String(o.name || ''), 80), i: TXT(String(o.i || ''), 200), on: o.on === false ? false : true, at: Number(o.at) || Date.now(), note: TXT(String(o.note || ''), 200) };
  if (!/^[\w/.\-]*$/.test(out.i)) out.i = '';
  if (k === 'w') {
    out.cols = ARR(o.cols || [], 6).map((c) => ARR(c, 4).map(HASH)).filter((a) => a.length);
    out.cn = ARR(o.cn || [], 6).map((s) => TXT(String(s), 60)).slice(0, out.cols.length);
  } else {
    out.src = TXT(String(o.src || ''), 80); out.group = TXT(String(o.group || ''), 80); out.hs = ARR(o.hs || [], 900).map(HASH); out.cls = INT(o.cls === undefined ? -1 : o.cls, -1, 3);
    out.min = ARR(o.min || [0, 0, 0, 0, 0, 0], 6).map((n) => INT(n, 0, 200)); while (out.min.length < 6) out.min.push(0);
    out.tot = INT(o.tot || 0, 0, 1000);
    out.sl = ARR(o.sl || [], 5).map(HASH);
  }
  return out;
};
H('tf:get', () => tfRead());
H('tf:set', (e, v) => {
  const t = ARR(OBJ(v).t, 200).map(tfClean);
  fs.writeFileSync(tfPath(), JSON.stringify({ v: 1, t })); return t;
});
H('tf:clear', () => { try { fs.unlinkSync(tfPath()); } catch (e) { /* none */ } return true; });

// Loadout images: Bungie icons are fetched here and handed to the page as data, so the page can draw them into a picture
// (the page itself cannot read pixels from bungie.net). Then the picture is copied or saved.
const IMGC = new Map();
H('img:fetch', async (e, v) => {
  OBJ(v); const ps = [...new Set(ARR(v.p, 80).map((x) => TXT(x, 300)))].filter((x) => /^\/[\w./%-]+\.(png|jpe?g|gif|webp)$/i.test(x) && !x.includes('..'));
  const out = {};
  await pool(ps, 8, async (p) => {
    if (IMGC.has(p)) { out[p] = IMGC.get(p); return; }
    try {
      const r = await fetch(BASE + p, { headers: { 'User-Agent': UA } }); if (!r.ok) return;
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 3e6) return;
      const ct = /\.png$/i.test(p) ? 'image/png' : /\.gif$/i.test(p) ? 'image/gif' : /\.webp$/i.test(p) ? 'image/webp' : 'image/jpeg';
      const d = 'data:' + ct + ';base64,' + buf.toString('base64'); if (IMGC.size > 400) IMGC.clear(); IMGC.set(p, d); out[p] = d;
    } catch (er) { /* drawn without that icon */ }
  });
  return out;
});
const pngOf = (d) => { const s = TXT(d, 20e6); if (!/^data:image\/png;base64,/.test(s)) throw bad(); return nativeImage.createFromDataURL(s); };
H('img:copy', (e, v) => {
  OBJ(v); const im = pngOf(v.d); if (im.isEmpty()) throw new Error('The picture is empty.');
  // Every way this Electron has, each one checked by reading the clipboard back: one of them used to report success without
  // putting anything there. If none sticks, the page is told, so it never says "Copied" when nothing was copied.
  const got = () => { try { if (typeof clipboard.readImage === 'function') { const r = clipboard.readImage(); if (r && !r.isEmpty()) return true; } } catch (er) { /* check the formats instead */ } try { return (clipboard.availableFormats() || []).some((f) => /image|png|bitmap/i.test(f)); } catch (er) { return false; } };
  const ways = [
    () => clipboard.writeImage(im),
    () => clipboard.write({ image: im }),
    () => { clipboard.clear(); clipboard.writeBuffer('PNG', im.toPNG()); },
  ];
  for (const w of ways) { try { w(); if (got()) return true; } catch (er) { /* try the next way */ } }
  throw new Error('no-native-image-clipboard');
});
H('img:save', async (e, v) => {
  OBJ(v); const im = pngOf(v.d), name = String(v.name || 'loadout').replace(/[^\w \-]+/g, '').trim().slice(0, 60) || 'loadout';
  const r = await dialog.showSaveDialog(win, { title: 'Save picture', defaultPath: path.join(app.getPath('pictures'), name + '.png'), filters: [{ name: 'PNG picture', extensions: ['png'] }] });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, im.toPNG()); return { ok: true, file: path.basename(r.filePath) };
});
// Backup and restore: everything you set up in the app (loadouts, tags, notes, saved searches, settings, farming targets and
// your own wish list rolls) in one file. Your Bungie sign-in is never included.
H('bk:export', async (e, v) => {
  OBJ(v); const ls = OBJ(v.ls), keep = {};
  let size = 0;
  for (const k of Object.keys(ls).slice(0, 200)) { if (!/^gt[._]/.test(k) || typeof ls[k] !== 'string') continue; size += ls[k].length; if (size > 30e6) throw new Error('Too much data to back up.'); keep[k] = ls[k]; }
  const mine = (wlRead().find((x) => x.id === 'mine') || {}).rolls || {};
  const data = JSON.stringify({ app: 'Pathfinder', kind: 'backup', v: 1, at: Date.now(), ls: keep, targets: tfRead(), mine });
  const def = 'pathfinder-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const r = await dialog.showSaveDialog(win, { title: 'Save backup', defaultPath: path.join(app.getPath('documents'), def), filters: [{ name: 'Pathfinder backup', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, data);
  return { ok: true, file: path.basename(r.filePath), n: Object.keys(keep).length };
});
H('bk:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Restore a backup', properties: ['openFile'], filters: [{ name: 'Pathfinder backup', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false };
  const st = fs.statSync(r.filePaths[0]); if (st.size > 40e6) throw new Error('That file is too big to be a Pathfinder backup.');
  let j; try { j = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch (er) { throw new Error('That file is not a Pathfinder backup.'); }
  if (!j || j.app !== 'Pathfinder' || j.kind !== 'backup' || typeof j.ls !== 'object') throw new Error('That file is not a Pathfinder backup.');
  const ls = {}; for (const k of Object.keys(j.ls).slice(0, 200)) if (/^gt[._]/.test(k) && typeof j.ls[k] === 'string') ls[k] = j.ls[k];
  if (Array.isArray(j.targets)) { try { const t = j.targets.slice(0, 200).map(tfClean); fs.writeFileSync(tfPath(), JSON.stringify({ v: 1, t })); } catch (er) { /* targets skipped */ } }
  if (j.mine && typeof j.mine === 'object') {
    try {
      const lists = wlRead(), l = mineOf(lists), rolls = {};
      for (const k of Object.keys(j.mine).slice(0, 2000)) {
        if (k !== '*' && !/^\d{1,10}$/.test(k)) continue;
        const arr = Array.isArray(j.mine[k]) ? j.mine[k] : [];
        rolls[k] = arr.slice(0, 50).filter((q) => Array.isArray(q) && Array.isArray(q[0])).map((q) => [q[0].slice(0, 12).map(Number).filter((x) => Number.isInteger(x) && x > 0), String(q[1] || '').slice(0, 200), q[2] ? 1 : 0, String(q[3] || '').replace(/[^a-z,]/g, '').slice(0, 40), String(q[4] || '').slice(0, 80)]).filter((q) => q[0].length);
        if (!rolls[k].length) delete rolls[k];
      }
      l.rolls = rolls; mineCount(l); wlWrite(lists);
    } catch (er) { /* wish list rolls skipped */ }
  }
  return { ok: true, ls, at: j.at || 0 };
});
let TFD = null;
// Weapons (grouped by name) and armor groups (by raid/activity source and by armor set) for the pickers.
async function tfdefs() {
  const df = await defs(), m = await manifest(), v = m.version + '.f1';
  if (TFD && TFD.v === v) return TFD;
  const f = path.join(app.getPath('userData'), 'tfdefs.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (o.v === v) return (TFD = o); } catch (e) { /* build below */ }
  const P = m.jsonWorldComponentContentPaths.en;
  const get = async (k, f2) => { try { if (P[k]) await table(P[k], f2); } catch (e) { /* that list is left out */ } };
  const col = {}, sets = {};
  await get('DestinyCollectibleDefinition', (k, c) => { if (c.sourceString && c.itemHash) col[k] = { sourceString: c.sourceString, itemHash: c.itemHash }; });
  await get('DestinyEquipableItemSetDefinition', (k, x) => { sets[k] = { displayProperties: { name: (x.displayProperties || {}).name }, setItems: x.setItems }; });
  const wmap = {};
  for (const k in df.d) {
    const x = df.d[k]; if (!TF_WB.has(x.b) || (x.r !== 'Legendary' && x.r !== 'Exotic') || !x.n) continue;
    const key = x.n.toLowerCase() + '|' + x.b;
    const w = (wmap[key] = wmap[key] || { n: x.n, i: x.i, t: x.t, r: x.r, b: x.b, hs: [] });
    w.hs.push(+k); w.i = x.i;
  }
  const weapons = Object.values(wmap).map((w) => ({ ...w, hs: w.hs.slice(-8) })).sort((a, b) => a.n.localeCompare(b.n));
  const gmap = {};
  const add = (key, n, kind, h) => { const x = df.d[h]; if (!x || !TF_ARB.has(x.b) || (x.r !== 'Legendary' && x.r !== 'Exotic')) return; const g = (gmap[key] = gmap[key] || { k: key, n, kind, hs: [] }); g.hs.push(h); };
  for (const k in col) {
    const c = col[k]; if (!c.sourceString || !c.itemHash) continue;
    let s = String(c.sourceString).split('\n')[0].replace(/^Source:\s*/i, '').replace(/["“”]/g, '').replace(/\.$/, '').trim();
    if (!s || /^(eververse|bright engrams|unlocked by|season pass|rewards pass|earned while|random perks|monument|open legendary|solstice|xûr|xur)/i.test(s) || s.length > 70) continue;
    add('src:' + s.toLowerCase(), s, 'Source', c.itemHash);
  }
  for (const k in sets) {
    const s = sets[k], n = s.displayProperties && s.displayProperties.name; if (!n) continue;
    (s.setItems || []).forEach((h) => add('set:' + k, n, 'Set', h));
  }
  const groups = Object.values(gmap).filter((g) => g.hs.length >= 3).map((g) => ({ ...g, hs: [...new Set(g.hs)] })).sort((a, b) => a.n.localeCompare(b.n));
  const o = { v, weapons, groups };
  fs.writeFileSync(f, JSON.stringify(o)); return (TFD = o);
}
H('tf:lists', async () => { const o = await tfdefs(); return { weapons: o.weapons, groups: o.groups }; });

// Perk columns for one weapon (every re-release merged). Normal and Enhanced versions of a perk are one choice.
H('tf:perks', async (e, v) => {
  const hs = ARR(OBJ(v).hs, 8).map(HASH), cols = [];
  for (const h of hs) {
    let d; try { d = await ent('DestinyInventoryItemDefinition', h); } catch (er) { continue; }
    const ents = (d.sockets && d.sockets.socketEntries) || [], cats = (d.sockets && d.sockets.socketCategories) || [];
    const cat = cats.find((c) => c.socketCategoryHash === 4241085061);
    const idx = cat ? cat.socketIndexes : ents.map((_, i) => i);
    let ci = 0;
    for (const i of idx) {
      const en = ents[i] || {}, sh = en.randomizedPlugSetHash || en.reusablePlugSetHash;
      if (!sh) continue;
      const list = await plugSet(sh); if (list.length < 2) continue;
      (cols[ci] = cols[ci] || { all: new Set() }); list.forEach((x) => cols[ci].all.add(x)); ci++;
    }
  }
  const all = new Set(); cols.forEach((c) => c.all.forEach((x) => all.add(x)));
  await plugInfo([...all]);
  const out = [];
  for (const c of cols) {
    const by = {};
    for (const h of c.all) {
      const p = ARTP[h]; if (!p || !p.n || p.n === 'Perk' || /^(empty|default)\b|reset|tracker/i.test(p.n)) continue;
      const base = p.n.replace(/^Enhanced\s+/i, '').toLowerCase();
      const g = (by[base] = by[base] || { n: p.n.replace(/^Enhanced\s+/i, ''), i: p.i, d: p.d, hs: [] });
      if (!/^Enhanced\s/i.test(p.n)) { g.i = p.i; g.d = p.d; }
      g.hs.push(h);
    }
    const opts = Object.values(by).map((g) => ({ n: g.n, i: g.i, d: (g.d || '').slice(0, 160), hs: g.hs.slice(0, 4) })).sort((a, b) => a.n.localeCompare(b.n));
    if (opts.length > 1) out.push(opts);
  }
  return out;
});

// ---- Postmaster count on the taskbar icon (Windows overlay badge). The picture is drawn by the app screen and checked here. ----
H('app:badge', (e, v) => {
  OBJ(v); const n = INT(v.n, 0, 99);
  if (!win || win.isDestroyed() || !win.setOverlayIcon) return false;
  if (!n) { win.setOverlayIcon(null, ''); return true; }
  const png = TXT(v.png, 20000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png)) throw bad();
  win.setOverlayIcon(nativeImage.createFromDataURL(png), n + ' postmaster items');
  return true;
});

// ---- Community perk insights (Clarity): public descriptions of what perks really do, cached for a day ----
let CLAR = null;
async function clarity() {
  if (CLAR && Date.now() - CLAR.at < 12 * 3600 * 1000) return CLAR.d;
  const f = path.join(app.getPath('userData'), 'clarity.json');
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); if (Date.now() - o.at < 24 * 3600 * 1000) { CLAR = o; return o.d; } } catch (e) { /* download below */ }
  try {
    const j = await readJson(await fetch('https://database-clarity.github.io/Live-Clarity-Database/descriptions/dim.json', { headers: { 'User-Agent': UA } }));
    const d = {};
    for (const k in j) {
      const en = j[k] && j[k].descriptions && j[k].descriptions.en; if (!Array.isArray(en)) continue;
      const lines = en.map((l) => (l.linesContent || []).map((c) => String(c.text || '')).join('')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (lines) d[k] = lines.slice(0, 1500);
    }
    CLAR = { at: Date.now(), d }; fs.writeFileSync(f, JSON.stringify(CLAR)); return d;
  } catch (e) { if (CLAR) return CLAR.d; try { return JSON.parse(fs.readFileSync(f, 'utf8')).d; } catch (er) { return {}; } }
}
H('clarity:get', () => clarity());

};
