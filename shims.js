/* Pathfinder web version: browser stand-ins for the desktop pieces main.js and preload.js use.
   main.js runs unchanged in the page; where it would touch the computer (files, windows, the clipboard, save dialogs)
   these do the browser equivalent. Saved files live in the browser's own storage (IndexedDB), only on this device. */
(function () {
  'use strict';
  const G = (window.__GT_WEB__ = { handlers: {}, listeners: {}, ready: null });

  // ---------- Buffer (only what main.js uses) ----------
  const te = new TextEncoder(), td = new TextDecoder();
  class Buffer extends Uint8Array {
    static from(v, enc) {
      if (typeof v === 'string') {
        if (enc === 'base64') { const b = atob(v); const o = new Buffer(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
        if (enc === 'hex') { const o = new Buffer(v.length >> 1); for (let i = 0; i < o.length; i++) o[i] = parseInt(v.substr(i * 2, 2), 16); return o; }
        const u = te.encode(v); const o = new Buffer(u.length); o.set(u); return o;
      }
      if (v instanceof ArrayBuffer) { const o = new Buffer(v.byteLength); o.set(new Uint8Array(v)); return o; }
      if (ArrayBuffer.isView(v)) { const o = new Buffer(v.byteLength); o.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return o; }
      if (Array.isArray(v)) { const o = new Buffer(v.length); o.set(v); return o; }
      throw new Error('Buffer.from: unsupported value');
    }
    static concat(list) { let n = 0; list.forEach((b) => { n += b.length; }); const o = new Buffer(n); let p = 0; list.forEach((b) => { o.set(b, p); p += b.length; }); return o; }
    static isBuffer(b) { return b instanceof Uint8Array; }
    static byteLength(s) { return typeof s === 'string' ? te.encode(s).length : s.byteLength; }
    toString(enc) {
      if (enc === 'base64') { let s = ''; for (let i = 0; i < this.length; i += 0x8000) s += String.fromCharCode.apply(null, this.subarray(i, i + 0x8000)); return btoa(s); }
      if (enc === 'hex') { let s = ''; for (let i = 0; i < this.length; i++) s += this[i].toString(16).padStart(2, '0'); return s; }
      return td.decode(this);
    }
  }
  window.Buffer = Buffer;
  window.process = window.process || { platform: 'web', env: {}, versions: {}, on() {} };
  const toBuf = (d) => (typeof d === 'string' ? Buffer.from(d) : Buffer.from(d));

  // ---------- downloads and file picking (save / open dialogs) ----------
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // A file chooser has to be opened by a tap on iPhone, so it is shown as a small panel with a button.
  function pickFile(title, accept) {
    return new Promise((res) => {
      const box = document.createElement('div');
      box.className = 'gtw-pick';
      box.innerHTML = `<div><b></b><label class="b">Choose file<input type="file" hidden></label><button class="g" type="button">Cancel</button></div>`;
      box.querySelector('b').textContent = title || 'Choose a file';
      const inp = box.querySelector('input'); if (accept) inp.accept = accept;
      const done = (v) => { box.remove(); res(v); };
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return done(null); f.arrayBuffer().then((ab) => done({ name: f.name, data: Buffer.from(ab) }), () => done(null)); };
      box.querySelector('button').onclick = () => done(null);
      document.body.appendChild(box);
    });
  }

  // ---------- fs: files kept in IndexedDB, loaded into memory at start ----------
  const FILES = new Map(); // path -> { d: Uint8Array, m: mtime }
  let db = null; const dirty = new Map(); let flushT = 0;
  const norm = (p) => ('/' + String(p).replace(/\\/g, '/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const enoent = (p) => { const e = new Error('ENOENT: no such file or directory, ' + p); e.code = 'ENOENT'; return e; };
  function persist(p) {
    if (/\/auth-log\.txt$/.test(p)) return; // diagnostics only, not worth storing in the browser
    dirty.set(p, FILES.get(p) || null);
    clearTimeout(flushT); flushT = setTimeout(flush, 250);
  }
  function flush() {
    if (!db || !dirty.size) return;
    const tx = db.transaction('files', 'readwrite'), st = tx.objectStore('files');
    dirty.forEach((v, k) => { if (v) st.put({ d: v.d, m: v.m }, k); else st.delete(k); });
    dirty.clear();
  }
  window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  function openDb() {
    return new Promise((res) => {
      let rq; try { rq = indexedDB.open('pathfinder', 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = () => rq.result.createObjectStore('files');
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
    });
  }
  async function loadFiles() {
    db = await openDb(); if (!db) return;
    await new Promise((res) => {
      const st = db.transaction('files').objectStore('files'), rq = st.openCursor();
      rq.onsuccess = () => { const c = rq.result; if (!c) return res(); FILES.set(c.key, { d: Buffer.from(c.value.d), m: c.value.m || Date.now() }); c.continue(); };
      rq.onerror = () => res();
    });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* best effort */ }
  }
  const SAVE_DIR = '/download/';
  const fs = {
    readFileSync(p, o) { p = norm(p); const f = FILES.get(p); if (!f) throw enoent(p); const enc = typeof o === 'string' ? o : o && o.encoding; return enc ? f.d.toString(enc === 'utf8' || enc === 'utf-8' ? undefined : enc) : Buffer.from(f.d); },
    writeFileSync(p, data) {
      p = norm(p);
      if (p.startsWith(SAVE_DIR)) { const n = p.slice(SAVE_DIR.length); download(n, toBuf(data), /\.png$/i.test(n) ? 'image/png' : /\.json$/i.test(n) ? 'application/json' : ''); return; }
      FILES.set(p, { d: toBuf(data), m: Date.now() }); persist(p);
    },
    appendFileSync(p, data) { p = norm(p); const f = FILES.get(p); const add = toBuf(data); let d = f ? Buffer.concat([f.d, add]) : add; if (d.length > 200000) d = d.subarray(d.length - 100000); FILES.set(p, { d: Buffer.from(d), m: Date.now() }); persist(p); },
    existsSync(p) { p = norm(p); if (FILES.has(p)) return true; const pre = p + '/'; for (const k of FILES.keys()) if (k.startsWith(pre)) return true; return false; },
    statSync(p) { p = norm(p); const f = FILES.get(p); if (!f) throw enoent(p); return { size: f.d.length, mtimeMs: f.m, mtime: new Date(f.m), isFile: () => true, isDirectory: () => false }; },
    unlinkSync(p) { p = norm(p); if (!FILES.delete(p)) throw enoent(p); persist(p); },
    renameSync(a, b) { a = norm(a); b = norm(b); const f = FILES.get(a); if (!f) throw enoent(a); if (b.startsWith(SAVE_DIR)) { FILES.delete(a); persist(a); fs.writeFileSync(b, f.d); return; } FILES.delete(a); FILES.set(b, { d: f.d, m: Date.now() }); persist(a); persist(b); },
    readdirSync(p) { const pre = norm(p) + '/'; const out = new Set(); for (const k of FILES.keys()) if (k.startsWith(pre)) out.add(k.slice(pre.length).split('/')[0]); return [...out]; },
    mkdirSync() {}, rmSync(p) { try { fs.unlinkSync(p); } catch (e) { /* missing is fine */ } },
  };
  fs.promises = {
    readFile: async (p, o) => fs.readFileSync(p, o), writeFile: async (p, d) => fs.writeFileSync(p, d),
    rename: async (a, b) => fs.renameSync(a, b), unlink: async (p) => fs.unlinkSync(p), stat: async (p) => fs.statSync(p),
  };
  G.fs = fs; G.FILES = FILES;

  // ---------- path ----------
  const path = {
    sep: '/',
    join(...a) { const parts = []; a.join('/').split('/').forEach((x) => { if (!x || x === '.') return; if (x === '..') parts.pop(); else parts.push(x); }); return '/' + parts.join('/'); },
    resolve(...a) { return path.join(...a); },
    basename(p, ext) { let b = String(p).replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop(); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; },
    dirname(p) { const s = String(p).replace(/\\/g, '/').replace(/\/+$/, ''); const i = s.lastIndexOf('/'); return i <= 0 ? '/' : s.slice(0, i); },
    extname(p) { const b = path.basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
  };

  // ---------- zlib (pako) and crypto ----------
  const zlib = {
    gzip(data, opts, cb) { if (typeof opts === 'function') { cb = opts; opts = {}; } setTimeout(() => { try { cb(null, Buffer.from(window.pako.gzip(toBuf(data), { level: (opts && opts.level) || 6 }))); } catch (e) { cb(e); } }, 0); },
    gunzipSync(data) { return Buffer.from(window.pako.ungzip(toBuf(data))); },
    gzipSync(data) { return Buffer.from(window.pako.gzip(toBuf(data))); },
  };
  const crypto = { randomBytes(n) { const b = new Buffer(n); window.crypto.getRandomValues(b); return b; } };

  // ---------- Electron ----------
  const noop = () => {};
  const NOT = (what) => () => { throw new Error(what + ' is only in the desktop app.'); };
  // The "window": main.js sends progress and update messages through win.webContents.send.
  G.win = {
    isDestroyed: () => false, isMinimized: () => false, isMaximized: () => false, getBounds: () => ({ x: 0, y: 0, width: innerWidth, height: innerHeight }),
    setOverlayIcon: noop, setBounds: noop, setAlwaysOnTop: noop, setMenuBarVisibility: noop, focus: noop, restore: noop, maximize: noop, unmaximize: noop, setTitle: noop, loadFile: async () => {},
    webContents: {
      send(ch, ...a) { (G.listeners[ch] || []).forEach((fn) => setTimeout(() => fn({ sender: null }, ...a), 0)); },
      on: noop, setWindowOpenHandler: noop, getURL: () => location.href, mainFrame: {}, session: { webRequest: { onBeforeRequest: noop }, setPermissionRequestHandler: noop },
    },
  };
  const sessionStub = { cookies: { get: async () => [], set: async () => {}, on: noop }, setPermissionRequestHandler: noop, setPermissionCheckHandler: noop, webRequest: { onBeforeRequest: noop }, clearStorageData: async () => {} };
  class BrowserWindow { constructor() { throw new Error('Extra windows are only in the desktop app.'); } }
  BrowserWindow.getAllWindows = () => [];
  const clip = (t) => { try { navigator.clipboard.writeText(String(t)); } catch (e) { /* needs a tap first */ } };
  function nativeImageFromDataURL(s) { const b64 = String(s).split(',')[1] || ''; return { isEmpty: () => !b64, toPNG: () => Buffer.from(b64, 'base64'), toDataURL: () => s, _png: () => Buffer.from(b64, 'base64') }; }
  const electron = {
    app: {
      getPath: (k) => (k === 'userData' ? '/data' : SAVE_DIR.replace(/\/$/, '')), getVersion: () => (window.__GT_VER__ || 'web'), getName: () => 'Pathfinder', isPackaged: false,
      whenReady: () => new Promise(noop), on: noop, quit: noop, setPath: noop, requestSingleInstanceLock: () => true, commandLine: { appendSwitch: noop }, setAppUserModelId: noop,
    },
    BrowserWindow,
    ipcMain: { handle(ch, fn) { G.handlers[ch] = fn; }, on: noop },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: (s) => Buffer.from(String(s)), decryptString: (b) => Buffer.from(b).toString() },
    shell: { openExternal: async (u) => { window.open(u, '_blank', 'noopener'); } },
    Menu: { buildFromTemplate: () => ({ popup: noop }), setApplicationMenu: noop },
    clipboard: {
      writeText: clip,
      readText: () => (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText().catch(() => '') : Promise.resolve('')),
      writeImage(im) { try { const blob = new Blob([im._png()], { type: 'image/png' }); navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); } catch (e) { throw new Error('This browser cannot copy pictures. Use Save instead.'); } },
    },
    session: { fromPartition: () => sessionStub, defaultSession: sessionStub },
    Notification: class { constructor(o) { this.o = o; } static isSupported() { return 'Notification' in window; } show() { try { if (Notification.permission === 'granted') new window.Notification(this.o.title, { body: this.o.body, icon: 'logo.png' }); else if (Notification.permission !== 'denied') Notification.requestPermission(); } catch (e) { /* not allowed */ } } },
    nativeImage: { createFromDataURL: nativeImageFromDataURL },
    dialog: {
      // Saving: the file is handed to the browser as a download (fs.writeFileSync to /download/... does that).
      showSaveDialog: async (w, o) => ({ canceled: false, filePath: SAVE_DIR + path.basename((o && o.defaultPath) || 'file') }),
      showOpenDialog: async (w, o) => {
        const f = await pickFile((o && o.title) || 'Choose a file', o && o.filters && o.filters[0] ? o.filters[0].extensions.map((x) => '.' + x).join(',') : '');
        if (!f) return { canceled: true, filePaths: [] };
        const p = '/upload/' + f.name.replace(/[^\w .-]+/g, '_'); FILES.set(p, { d: f.data, m: Date.now() });
        return { canceled: false, filePaths: [p] };
      },
      showMessageBox: async () => ({ response: 0 }),
    },
    // preload.js side
    contextBridge: { exposeInMainWorld(name, api) { window[name] = api; } },
    ipcRenderer: {
      async invoke(ch, ...a) {
        await G.ready;
        const fn = G.handlers[ch]; if (!fn) throw new Error("Error invoking remote method '" + ch + "': Error: Not available in the web version.");
        // Like Electron's IPC: the page gets copies, so changing what it got never changes main.js's own data.
        const args = a.map((x) => (x === undefined ? x : structuredClone(x)));
        try { const r = await fn({ sender: G.win.webContents, senderFrame: {} }, ...args); return r === undefined ? r : structuredClone(r); }
        catch (e) { throw new Error("Error invoking remote method '" + ch + "': Error: " + ((e && e.message) || e)); }
      },
      on(ch, fn) { (G.listeners[ch] = G.listeners[ch] || []).push(fn); },
      send: noop, removeAllListeners(ch) { delete G.listeners[ch]; },
    },
  };
  const MODS = { electron, fs, path, crypto, zlib, 'electron-updater': null };
  G.require = (n) => { const m = MODS[n.replace(/^node:/, '')]; if (m) return m; throw new Error('Cannot find module ' + n + ' in the web version'); };

  // Browsers do not let a page set User-Agent, and sending it can break Bungie's cross-site checks: drop it.
  const ofetch = window.fetch.bind(window);
  window.fetch = (u, o) => {
    if (o && o.headers && !(o.headers instanceof Headers)) { const h = { ...o.headers }; delete h['User-Agent']; delete h['user-agent']; o = { ...o, headers: h }; }
    return ofetch(u, o);
  };

  // ---------- sign-in by redirect ----------
  const BASE_URL = location.origin + location.pathname.replace(/[^/]*$/, '');
  G.authRedirect = (url, state) => { try { sessionStorage.setItem('gt.oauth.state', state); } catch (e) { /* private mode */ } location.assign(url); };

  // ---------- start: load saved files and the site config, then run main.js ----------
  let readyRes; G.ready = new Promise((r) => { readyRes = r; });
  G.start = async function () {
    await loadFiles();
    try {
      const r = await ofetch('web-config.json', { cache: 'no-store' });
      if (r.ok) FILES.set('/app/app-config.json', { d: Buffer.from(await r.text()), m: Date.now() });
    } catch (e) { /* no config: the page shows that sign-in is not set up */ }
    const mod = { exports: {} };
    try { window.__GT_MAIN__(G.require, mod, mod.exports, '/app', '/app/main.js'); } catch (e) { console.error('Pathfinder failed to start', e); }
    // Back from Bungie's sign-in page: swap the code for a sign-in, then clean the address bar.
    const q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state');
    if (code || q.get('error')) {
      let want = ''; try { want = sessionStorage.getItem('gt.oauth.state') || ''; sessionStorage.removeItem('gt.oauth.state'); } catch (e) { /* private mode */ }
      history.replaceState(null, '', BASE_URL);
      if (code && state && state === want) { try { await G.handlers['auth:webcode']({}, { code }); } catch (e) { G.signInError = (e && e.message) || String(e); } }
      else if (code) G.signInError = 'That sign-in link was not started from this page. Please sign in again.';
      else G.signInError = 'Bungie sign-in was cancelled.';
    }
    readyRes();
    if (G.signInError) {
      const show = () => { const d = document.createElement('div'); d.className = 'gtw-err'; d.innerHTML = '<span></span><button type="button" aria-label="Close">&times;</button>'; d.firstChild.textContent = 'Sign-in did not finish: ' + G.signInError; d.lastChild.onclick = () => d.remove(); document.body.appendChild(d); };
      if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    }
  };
})();
