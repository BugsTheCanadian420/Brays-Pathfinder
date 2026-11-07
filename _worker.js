// Made by web/build.js: the PC app download, link previews for share links, and the site's files for everything else.
const API = "https://gt-token.brandonwkindred.workers.dev", REPO = "BugsTheCanadian420/Brays-Pathfinder";
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// If the site has a service binding named TOKEN to the token service (Pages > Settings > Bindings), it is used; otherwise the
// token service's public address.
const api = (env, p) => (env.TOKEN && env.TOKEN.fetch ? env.TOKEN.fetch(new Request(API + p, { headers: { Accept: 'application/json' } })) : fetch(API + p, { headers: { Accept: 'application/json' } }));
// The newest release, asked of GitHub at most every 10 minutes.
let REL = null;
async function latest() {
  if (REL && Date.now() - REL.at < 600000) return REL;
  const r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { 'User-Agent': 'Pathfinder-website', Accept: 'application/vnd.github+json' }, cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) throw new Error('GitHub ' + r.status);
  const j = await r.json();
  const a = (j.assets || []).find((x) => /\.exe$/i.test(x.name || '') && /^https:\/\/github\.com\//.test(x.browser_download_url || ''));
  if (!a) throw new Error('no installer in the newest release');
  REL = { at: Date.now(), v: String(j.tag_name || '').replace(/^v/, ''), url: a.browser_download_url, size: a.size || 0, name: a.name, date: j.published_at || '' };
  return REL;
}
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
export default {
  async fetch(request, env) {
    const u0 = new URL(request.url), p0 = u0.pathname.replace(/\/+$/, '').toLowerCase();
    if (REPO && (request.method === 'GET' || request.method === 'HEAD') && (p0 === '/download' || p0 === '/download/windows' || p0 === '/download/info')) {
      try {
        const rel = await latest();
        if (p0 === '/download/info') return json({ v: rel.v, size: rel.size, name: rel.name, date: rel.date });
        return new Response(null, { status: 302, headers: { Location: rel.url, 'Cache-Control': 'public, max-age=300' } });
      } catch (e) {
        if (p0 === '/download/info') return json({ error: 'unavailable' }, 503);
        return Response.redirect('https://github.com/' + REPO + '/releases/latest', 302);
      }
    }
    const res = await env.ASSETS.fetch(request);
    if (!API) return res;
    try {
      const u = u0, m = /^\/([A-Za-z0-9]{5,12})\/([^/]{1,160})\/?$/.exec(u.pathname);
      if ((request.method !== 'GET' && request.method !== 'HEAD') || !m || res.status !== 404) return res;
      const r = await api(env, '/share/' + m[1]);
      if (!r.ok) return res;
      const s = await r.json(); if (!s || typeof s.c !== 'string') return res;
      const title = s.t || s.n || 'Loadout';
      const desc = s.d || 'A Destiny 2 loadout shared with Pathfinder. Open it to see the gear or add it to your loadouts.';
      const img = s.img ? API + '/share/' + m[1] + '/img' : u.origin + '/icon-512.png';
      const tags = '<meta property="og:site_name" content="Pathfinder"><meta property="og:type" content="website">' +
        '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
        '<meta property="og:url" content="' + esc(u.origin + u.pathname) + '"><meta property="og:image" content="' + esc(img) + '">' +
        '<meta name="twitter:card" content="' + (s.img ? 'summary_large_image' : 'summary') + '"><meta name="twitter:title" content="' + esc(title) + '">' +
        '<meta name="twitter:description" content="' + esc(desc) + '"><meta name="twitter:image" content="' + esc(img) + '">' +
        '<meta name="theme-color" content="#e8a33d"><meta name="description" content="' + esc(desc) + '">';
      const html = (await res.clone().text()).replace('<title>Pathfinder</title>', '<title>' + esc(title) + ' · Pathfinder</title>' + tags);
      return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    } catch (e) {
      return res;
    }
  },
};
