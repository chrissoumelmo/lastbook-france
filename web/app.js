'use strict';
/* Lastbook front end. Plain JS, no external resources. Talks only to the local server. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = p => '/' + String(p || '').split('/').map(encodeURIComponent).join('/');
const main = $('#main');
const IN_WINDOW = location.protocol === 'lastbook:' || location.hostname === 'lastbook.invalid';   // the desktop app, not a browser over the server
if (IN_WINDOW) $('#sideSettings').hidden = false;   // Library and local AI (web/setup.html) is in the desktop app only

/* ---------------------------------------------------------------- icons -- */
const I = {
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  hurt: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M12 10v7M8.5 13.5h7"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
  power: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  shelter: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v8"/>',
  sanitation: '<path d="M7 3h10v6H7zM5 9h14l-2 6H7zM9 15l-1 6h8l-1-6"/>',
  disaster: '<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>',
  comms: '<path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0"/><circle cx="12" cy="12" r="1.5"/><path d="M12 13.5V21M9 21h6"/>',
  grow: '<path d="M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-7-5 0 4 2 5 7 5z"/>',
  preserve: '<path d="M8 3h8v3H8zM7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z"/><path d="M6 12h12"/>',
  health: '<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
  energy: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  land: '<path d="M3 20 9 9l4 6 3-4 5 9z"/><circle cx="17" cy="6" r="2"/>',
  repair: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 6.3-6.3a4 4 0 0 0-5-5L9 9 6 6l2-2"/><path d="M4 20l5-5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-1 .2"/><path d="M20 4v14h-7"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  wiki: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  page: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', back: '<path d="M15 18 9 12l6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  warn: '<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>', save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', prep: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  shelf: '<path d="M4 4v16M9 4v16M14 5l4 15M3 20h18"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  play: '<path d="M7 4v16l13-8z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  insp: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M15 5v14"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9.5h6M9 12.5h4"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
const ico = (n, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${I[n] || I.book}</svg>`;
const KIND_ICO = { pdf: 'page', html: 'page', video: 'video', transcript: 'video', pptx: 'page', zim: 'wiki' };
// One colour per guide, used for its tile, header and cards.
const TC = { hurt: '#c62828', water: '#1565c0', power: '#c77700', food: '#d4570f', shelter: '#7b3fa0', sanitation: '#7a5232', disaster: '#b23c17', comms: '#00796b',
  grow: '#2e7d32', preserve: '#a0661a', health: '#c2185b', repair: '#455a64', energy: '#e09400', land: '#5d7a2e' };
// Short names for tiles; the full title shows on the guide page.
const SHORT = { hurt: I18n.t("app.short.injury_illness"), water: I18n.t("app.short.drinking_water"), power: I18n.t("app.short.power_is_out"), food: I18n.t("app.short.food_cooking"), shelter: I18n.t("app.short.too_hot_or_cold"), sanitation: I18n.t("app.short.toilets_hygiene"),
  disaster: I18n.t("app.short.quake_fire_flood"), comms: I18n.t("app.short.contact_find_way"), grow: I18n.t("app.short.grow_food"), preserve: I18n.t("app.short.preserve_food"), health: I18n.t("app.short.health_care"), repair: I18n.t("app.short.repair_build"), energy: I18n.t("app.short.power_systems"), land: I18n.t("app.short.land_resources") };
const tcStyle = id => `style="--tc:${TC[id] || '#1a6b55'}"`;

/* ------------------------------------------------------------ storage -- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('sg.' + k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem('sg.' + k, JSON.stringify(v)) } catch { } },
};
// A row as the lists show it: its title and the subtitle under it. Two rows that read the same are one row, whatever their keys.
const rowSub = x => x.sub && x.sub !== x.title ? x.sub : x.key[0] === 'w' ? I18n.t("app.rowsub.encyclopedia") : '';
const rowId = x => x.title + '|' + rowSub(x);
function remember(item) {  // {key,title,href,sub}
  const r = store.get('recent', []).filter(x => x.key !== item.key && rowId(x) !== rowId(item));
  r.unshift({ ...item, at: Date.now() });
  store.set('recent', r.slice(0, 40));
}
const isSaved = key => store.get('saved', []).some(x => x.key === key);
function savedCount() { const el = $('#savedN'); if (el) el.textContent = store.get('saved', []).length || '' }
function toggleSave(item, btn) {
  let s = store.get('saved', []);
  if (s.some(x => x.key === item.key)) { s = s.filter(x => x.key !== item.key); toast(I18n.t("app.togglesave.removed_from_saved")) }
  else { s.unshift({ ...item, at: Date.now() }); toast(I18n.t("app.togglesave.saved_on_this_device")) }
  store.set('saved', s);
  savedCount();
  if (btn) { btn.setAttribute('aria-pressed', isSaved(item.key)); const sp = $('span', btn); if (sp) sp.textContent = isSaved(item.key) ? I18n.t("common.saved") : I18n.t("common.save") }
}
const saveButton = item => `<button class="btn plain" title="${I18n.t("common.save")}" data-save='${esc(JSON.stringify(item))}' aria-pressed="${isSaved(item.key)}">${ico('save')}<span>${isSaved(item.key) ? I18n.t("common.saved") : I18n.t("common.save")}</span></button>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-save]'); if (b) toggleSave(JSON.parse(b.dataset.save), b) });
let toastT;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t) }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200);
}
// Video watch progress: {id: {t, d, title, thumb, at}}
const vprog = () => store.get('vprog', {});
// This device's history is kept for every library opened on it (each download is its own library): show only what the open one holds
const HELD = {};
const held = ids => Promise.all(ids.map(id => HELD[id] ?? (HELD[id] = fetch('/api/doc/' + encodeURIComponent(id)).then(r => r.status !== 404 && r.status !== 400).catch(() => true)))).then(ok => ids.filter((_, i) => ok[i]));
async function resumable(n = 60) {
  const list = Object.entries(vprog()).filter(([, v]) => v.t > 10 && (!v.d || v.t < v.d - 15)).sort((a, b) => b[1].at - a[1].at).slice(0, n);
  const ok = new Set(await held(list.map(([id]) => id)));
  return list.filter(([id]) => ok.has(id));
}
async function recents() {   // documents and videos from another library leave the list; guides and articles stay
  const r = store.get('recent', []), ids = r.filter(x => /^[dv]:/.test(x.key)).map(x => x.key.slice(2));
  const ok = new Set(await held(ids)), seen = new Set();
  return r.filter(x => (!/^[dv]:/.test(x.key) || ok.has(x.key.slice(2))) && !seen.has(rowId(x)) && seen.add(rowId(x)));
}
function setVprog(id, data) { const p = vprog(); p[id] = { ...(p[id] || {}), ...data, at: Date.now() }; const keys = Object.keys(p).sort((a, b) => p[b].at - p[a].at).slice(0, 60); store.set('vprog', Object.fromEntries(keys.map(k => [k, p[k]]))) }

/* --------------------------------------------------------------- data -- */
async function api(u, opts) {
  const r = await fetch(u, opts);
  let d; try { d = await r.json() } catch { throw new Error(I18n.t("app.api.the_library_sent_an_unreadable_reply")) }
  if (!r.ok || (d && d.error && !Array.isArray(d))) throw new Error(d && d.error || (I18n.t("app.api.server_error") + " " + r.status));
  return d;
}
let LIB = null;
const libInfo = () => LIB || (LIB = api('/api/library').catch(() => { LIB = null; return {} }));   // what this library holds; a failed ask is asked again. An older server leaves out zims, pins and sources: then everything stays offered.
let TOPICS = null;
async function topics() {
  if (TOPICS) return TOPICS;
  try { TOPICS = await api('/api/topics'); store.set('topicsCache', TOPICS) }
  catch (e) { TOPICS = store.get('topicsCache', null); if (!TOPICS) throw e }
  return TOPICS;
}
const topicById = id => (TOPICS || []).find(t => t.id === id);
const NOW_ORDER = ['hurt', 'water', 'power', 'food', 'shelter', 'sanitation', 'disaster', 'comms'];
const LEARN_ORDER = ['grow', 'preserve', 'health', 'repair', 'energy', 'land'];
const nowTopics = () => NOW_ORDER.map(topicById).filter(Boolean).concat((TOPICS || []).filter(t => t.mode === 'now' && !NOW_ORDER.includes(t.id)));
const learnTopics = () => LEARN_ORDER.map(topicById).filter(Boolean).concat((TOPICS || []).filter(t => t.mode === 'learn' && !LEARN_ORDER.includes(t.id)));

/* ------------------------------------------------------------ helpers -- */
const fmtDur = s => { if (!s) return ''; s = Math.round(s); const h = s / 3600 | 0, m = (s % 3600) / 60 | 0; return h ? `${h} h ${m} min` : m ? `${m} min` : `${s} s` };
const clock = s => { s = Math.max(0, Math.round(s || 0)); const h = s / 3600 | 0, m = (s % 3600) / 60 | 0, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0') };
const here = () => location.hash || '#/videos';
const fromQ = () => 'from=' + encodeURIComponent(here());
const pageImg = (id, p, w) => `/api/page/${encodeURIComponent(id)}/${p || 1}.png?w=${w}`;
const hostOf = u => { try { return new URL(u).host } catch { return u } };   // a web address shown as its site only
const askLink = (about, label = I18n.t("app.asklink.ask_about_this")) => `<a class="btn plain" title="${esc(label)}" href="#/ask?about=${encodeURIComponent(about)}&${fromQ()}">${ico('ask')}<span>${label}</span></a>`;

function hrefFor(item, src) {
  src = src || item.src || item;
  if (item.zim) return '#/wiki/' + item.zim.replace(/^\/?zim\//, '') + '?' + fromQ();
  if (!src || !src.id) return '#/';
  if (src.kind === 'video') return `#/watch/${encodeURIComponent(src.id)}?${item.t ? 't=' + item.t + '&' : ''}${fromQ()}`;
  return `#/read/${encodeURIComponent(src.id)}?${item.page ? 'p=' + item.page + '&' : ''}${fromQ()}`;
}
function srcText(s, page) {
  if (!s) return I18n.t("app.srctext.source_not_found_in_this_library");
  const bits = [`<strong>${esc(s.publisher || s.collection || I18n.t("app.bits.unknown_publisher"))}</strong>`];
  if (s.year) bits.push(esc(s.year));
  if (page) bits.push(I18n.t("common.page_word") + " " + page + (s.pages ? ' ' + I18n.t('common.of_word') + ' ' + s.pages : ''));
  else if (s.kind === 'pdf' && s.pages) bits.push(s.pages + " " + I18n.t("common.pages_word"));
  if (s.duration) bits.push(fmtDur(s.duration) + (s.transcript ? " " + I18n.t("app.srctext.transcript") : ''));
  return bits.join(' · ');
}
// A reading card shows a picture of what you'll open: the actual page, the video frame, or an encyclopedia mark.
function rcard(item) {
  const s = item.src;
  let pv;
  if (item.zim) pv = `<span class="pv w">${ico('wiki')}</span>`;
  else if (s && s.kind === 'video') pv = `<span class="pv v">${s.thumb ? `<img loading="lazy" alt="" src="${fileUrl(s.thumb)}">` : ''}<span class="play"><span>${ico('play')}</span></span>${s.duration ? `<span class="pg">${clock(s.duration)}</span>` : ''}</span>`;
  else if (s && s.kind === 'pdf') pv = `<span class="pv"><img loading="lazy" alt="" src="${pageImg(s.id, item.page, 360)}" onerror="this.remove()"><span class="pg">${item.page ? 'p. ' + item.page : 'PDF'}</span></span>`;
  else pv = `<span class="pv w">${ico('page')}</span>`;
  const label = item.label || item.title || (s && s.title);
  const src = item.zim ? `<strong>${I18n.t("app.rowsub.encyclopedia")}</strong> · ${esc(item.title || '')} ${I18n.t("app.src.community_written")}` : `${s ? I18n.t("app.src.from") + esc(s.title) + '” · ' : ''}${srcText(s, item.page)}<br>${esc(s ? s.trust : '')}`;
  return `<a class="rcard" href="${hrefFor(item)}">${pv}<span><b>${esc(label)}</b>${item.note ? `<p>${esc(item.note)}</p>` : ''}<span class="src">${src}</span></span></a>`;
}
function rowItem(item) {
  const s = item.src || null;
  let k = ico(item.zim ? 'wiki' : s ? KIND_ICO[s.kind] : 'page');
  if (s && s.kind === 'video' && s.thumb) k = `<img loading="lazy" alt="" src="${fileUrl(s.thumb)}">`;
  else if (s && s.kind === 'pdf' && (item.page || item.preview)) k = `<img loading="lazy" alt="" src="${pageImg(s.id, item.page, 200)}" onerror="this.remove()">`;
  const sub = item.zim ? I18n.t("app.sub.encyclopedia_article_community_written") : srcText(s, item.page);
  return `<li><a class="row" href="${hrefFor(item)}"><span class="k">${k}</span><span><b>${esc(item.label || item.title || (s && s.title))}</b><small>${sub}</small></span></a></li>`;
}
function vcard(v, opts = {}) {
  const p = vprog()[v.id];
  const pct = p && p.t && (v.duration || p.d) ? Math.min(100, 100 * p.t / (v.duration || p.d)) : 0;
  return `<a class="vcard" href="#/watch/${encodeURIComponent(v.id)}?${fromQ()}" ${opts.style || ''}>
    <span class="vthumb">${v.thumb ? `<img loading="lazy" alt="" src="${fileUrl(v.thumb)}" onerror="this.remove()">` : `<span class="ph">${ico('video')}</span>`}
      ${v.transcript ? `<span class="cc" title="${I18n.t("app.vcard.has_a_transcript")}">CC</span>` : ''}${v.duration ? `<span class="dur">${clock(v.duration)}</span>` : ''}${pct > 2 ? `<span class="prog" style="width:${pct}%"></span>` : ''}<span class="play">${ico('play')}</span></span>
    <b>${esc(v.title)}</b><span class="vm">${esc(opts.sub || v.publisher || '')}</span></a>`;
}
function rail(html, cls = '') {
  return `<div class="rail-wrap"><button class="rail-btn l" aria-label="${I18n.t("app.rail.scroll_left")}" hidden>${ico('back')}</button><div class="rail ${cls}">${html}</div><button class="rail-btn r" aria-label="${I18n.t("app.rail.scroll_right")}">${ico('right')}</button></div>`;
}
function wireRails(root = main) {
  $$('.rail-wrap', root).forEach(w => {
    const r = $('.rail', w), l = $('.rail-btn.l', w), rb = $('.rail-btn.r', w);
    const upd = () => { l.hidden = r.scrollLeft < 10; rb.hidden = r.scrollLeft + r.clientWidth > r.scrollWidth - 10 };
    l.onclick = () => r.scrollBy({ left: -r.clientWidth * .85, behavior: 'smooth' });
    rb.onclick = () => r.scrollBy({ left: r.clientWidth * .85, behavior: 'smooth' });
    r.addEventListener('scroll', upd, { passive: true }); upd();
  });
}
const secHead = (title, sub, link) => `<div class="sec-head"><div><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ''}</div>${link || ''}</div>`;
function crumbs(list) {
  return `<nav class="crumbs" aria-label="${I18n.t("app.crumbs.you_are_here")}">${list.map((c, i) => i < list.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(c[0])}</span>`).join('')}</nav>`;
}
function backButton(from, fallback = I18n.t("app.backbutton.back")) {
  let label = fallback, href = from || '#/';
  const m = /^#\/t\/([\w-]+)/.exec(href);
  if (m && topicById(m[1])) label = SHORT[m[1]] || topicById(m[1]).title;
  else if (href.startsWith('#/search')) label = I18n.t("app.backbutton.search_results");
  else if (href.startsWith('#/ask')) label = I18n.t("app.backbutton.back_to_chat");
  else if (href.startsWith('#/saved')) label = I18n.t("common.saved");
  else if (href.startsWith('#/map')) label = I18n.t("nav.map");
  else if (href.startsWith('#/videos')) label = I18n.t("nav.videos");
  else if (href.startsWith('#/watch')) label = I18n.t("common.video");
  else if (href.startsWith('#/read')) label = I18n.t("app.backbutton.back_to_page");
  else if (href.startsWith('#/library') || href.startsWith('#/shelf') || href.startsWith('#/collection') || href.startsWith('#/encyclopedias') || href.startsWith('#/prepare')) label = I18n.t("nav.library");
  else if (href === '#/' || href === '#') label = I18n.t("nav.videos");
  return `<a class="back" href="${esc(href)}" data-back>${ico('back')}<span>${esc(label)}</span></a>`;
}
// Links into readers carry where you came from; refresh it at click time (sections may have opened since render).
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/read/"],a[href^="#/watch/"],a[href^="#/wiki/"],a[href^="#/collection"],a[href^="#/ask?about"]');
  if (!a || a.hasAttribute('data-back')) return;
  const h = a.getAttribute('href'), i = h.indexOf('from=');
  if (i > -1) a.setAttribute('href', h.slice(0, i) + 'from=' + encodeURIComponent(here()));
}, true);
// Prefer real history so scroll position and open sections come back exactly (not inside encyclopedia frames).
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-back]');
  if (a && !location.hash.startsWith('#/wiki/') && navAt > 0 && navStack[navAt - 1] === a.getAttribute('href')) { e.preventDefault(); history.back() }
});
function errorBox(e, what) {
  return `<div class="err" role="alert"><b>${esc(what || I18n.t("app.errorbox.something_went_wrong"))}</b><br>${esc(I18n.error(e.message || e))}
  <br><span class="small">${I18n.t("app.errorbox.if_this_keeps_happening_close_lastbook")}</span></div>`;
}
// The window title, and on reading pages the toolbar's title and the line under it.
// bar: what the toolbar shows when it is not the page's own title (an article names itself; the toolbar names the encyclopedia).
const setTitle = (t, sub, bar) => { document.title = t ? t + " " + I18n.t("app.settitle.lastbook") : 'Lastbook'; const b = $('#tbTitle'); b.textContent = b.title = bar ?? t ?? ''; if (sub !== undefined) $('#tbSub').textContent = $('#tbSub').title = sub };

/* ------------------------------------------------------------- router -- */
// Where this tab is in its history. Each entry carries its own index in history.state, so Back and Forward are known exactly:
// after going back several steps, after a page rewrote its address in place, and when a link leads to the page just left.
const navStack = JSON.parse(sessionStorage.getItem('sg.stack') || '[]');   // navStack[i]: the address at history index i
let navAt = +(sessionStorage.getItem('sg.at') || 0), navEnd = +(sessionStorage.getItem('sg.end') || 0), swapping = false;
const keepNav = () => { try { sessionStorage.setItem('sg.stack', JSON.stringify(navStack.slice(0, navEnd + 1))); sessionStorage.setItem('sg.at', navAt); sessionStorage.setItem('sg.end', navEnd) } catch { } };
const _replace = history.replaceState.bind(history);
// A page that rewrites its own address (the map, search as you type, an opened situation, a new chat) keeps its place.
history.replaceState = (state, title, url) => { _replace({ ...(state || {}), lb: navAt }, title, url); if (url != null) { navStack[navAt] = current = here(); keepNav() } };
const swap = h => { swapping = true; location.replace(h) };   // this entry becomes another page, in place
const _push = history.pushState.bind(history);
const pushHere = url => { navAt++; navEnd = navAt; navStack.length = navAt; _push({ lb: navAt }, '', url); navStack[navAt] = current = here(); keepNav(); barState() };   // a new entry, without loading the page again
const scrolls = JSON.parse(sessionStorage.getItem('sg.scroll') || '{}');
try { history.scrollRestoration = 'manual' } catch { }   // the page restores its own place (restoreScroll), once it is built
let current = null;
window.addEventListener('scroll', () => { if (current && !$('#wframe')) scrolls[current] = scrollY }, { passive: true });   // an article scrolls in its frame, which keeps its own place (wiki)
window.addEventListener('pagehide', () => sessionStorage.setItem('sg.scroll', JSON.stringify(scrolls)));
function parse() {
  const h = here().slice(1) || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || '') };
}
// The sidebar row each page belongs to. Reading pages stay under Library, articles under Encyclopedias; search results select no row.
const NAV_OF = { '': 'videos', t: '', ask: 'ask', videos: 'videos', watch: 'videos', map: 'map', library: 'library', learn: 'library', browse: 'library', shelf: 'library', collection: 'library', read: 'library', wiki: 'encyclopedias', search: '', saved: 'saved', encyclopedias: 'encyclopedias', prepare: 'prepare', about: 'about' };
let leaving = null;  // cleanup hook for the current view (player, chat stream…)
async function route() {
  const cameFromSide = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.side,.tabbar'));
  const { parts, q } = parse();
  const h = here();
  const wf = $('#wframe'), wd = wf && wf.contentDocument;
  if (current) { if (!wf) scrolls[current] = scrollY; else if (wd && wd.readyState === 'complete') scrolls[current] = wf.contentWindow.scrollY }   // an article's place is its frame's
  const at = history.state && history.state.lb;
  if (typeof at === 'number') { navAt = at; navEnd = Math.max(navEnd, at) }   // back, forward, or a reload
  else {
    if (swapping) swapping = false;
    else if (current !== null || navStack.length) { navAt++; navEnd = navAt; navStack.length = navAt }   // a new page: what was ahead is gone
    else navAt = navEnd = 0;   // the first page of this tab
    _replace({ ...(history.state || {}), lb: navAt }, '');
  }
  navStack[navAt] = h; keepNav();
  sessionStorage.setItem('sg.scroll', JSON.stringify(scrolls));
  current = h;
  const y = typeof at === 'number' ? scrolls[h] : null;   // read now: while the page is rebuilt it scrolls (shorter, then taller), and those scrolls are recorded too
  const v = parts[0] || 'videos';
  document.body.className = v ? 'v-' + v : 'home';
  const nav = v === 'read' && (q.get('from') || '').startsWith('#/about') ? 'about' : NAV_OF[v] || '';   // Sources, opened from About, stays under About
  $$('[data-nav]').forEach(a => nav && (a.dataset.nav === nav || (a.dataset.also || '').split(' ').includes(nav)) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const rows = $$('.side a.row-s'); rows.forEach(a => a.tabIndex = a.hasAttribute('aria-current') || (!nav && a === rows[0]) ? 0 : -1);   // the sidebar is one Tab stop; arrows move inside it
  savedCount(); railTitles();
  html.classList.remove('side-open', 'h1-gone'); h1seen.disconnect();
  $('#tbActs').replaceChildren(); $('#tbTitle').textContent = $('#tbSub').textContent = ''; $('#tbTitle').title = $('#tbSub').title = ''; searchLive = null; main.classList.remove('own-title');
  if (leaving) { try { leaving() } catch { } leaving = null }
  window.onresize = null; main.onkeydown = null;
  try {
    if (v !== 'map') MapView.stop();
    await topics().catch(() => { });
    if (!v) await home();
    else if (v === 't') await topicPage(parts[1], parts[2]);
    else if (v === 'ask') await Chat.page(main, parts.slice(1), q);
    else if (v === 'videos') await (parts[1] ? videoRow(parts[1], q) : videosHome());
    else if (v === 'watch') await watch(parts[1], +q.get('t') || 0, q.get('from'));
    else if (v === 'read') await reader(parts[1], +q.get('p') || 0, q.get('from'), q.get('view'));
    else if (v === 'wiki') await wiki(parts.slice(1).join('/'), q.get('from'), y);
    else if (v === 'search') await searchPage(q.get('q') || '', q.get('kind') || 'all');
    else if (v === 'library' || v === 'learn' || v === 'browse') await library();
    else if (v === 'prepare') await prepareHub();
    else if (v === 'encyclopedias') await encyclopedias(q.get('q') || '');
    else if (v === 'map') await MapView.page(main, q);
    else if (v === 'saved') await savedPage();
    else if (v === 'shelf') await shelfPage(parts[1], q.get('kind') || 'all', q.get('q') || '');
    else if (v === 'collection') await collectionPage(q.get('name') || '', q.get('from'));
    else if (v === 'about') await about();
    else notFound();
  } catch (e) { setTitle(''); document.body.className = 'v-error'; main.innerHTML = emptyState('warn', I18n.t("app.route.this_page_could_not_be_opened"), e.message || e) }   // v-error: not a reading page, so a phone keeps its tab bar
  wireRails(); dock(); barState();
  $('#topQ').value = '';
  const big = $('main h1'); if (big) h1seen.observe(big);
  if (v === 'ask') { bandState(); return }  // the chat manages its own scroll position
  if (y != null && v !== 'wiki') restoreScroll(h, y); else if (v !== 'wiki') requestAnimationFrame(() => { if (!$('.sit.open', main)) scrollTo(0, 0) });
  if (y == null) startHere(cameFromSide);
  bandState(); alignTitle();
}
// Back, Forward or a reload return to the place the page was left. A page still filling in (pictures, results) may not be tall enough yet,
// so this tries again each frame for a moment (at most 2.5 s), and stops as soon as the person scrolls or the page changes.
function restoreScroll(h, y, w = window) {
  const stop = new AbortController(), end = performance.now() + 2500, o = { passive: true, signal: stop.signal };
  for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown']) addEventListener(ev, () => stop.abort(), o);
  let sh = 0, still = 0, seen = null;   // done once the place is reached and the page has stopped growing for a moment (sections still arriving would move it)
  const tick = () => {
    if (stop.signal.aborted || (w === window ? current !== h : !(w.frameElement && w.frameElement.isConnected))) return;   // another page, or another article in the frame
    const h2 = w.document.scrollingElement.scrollHeight;
    if (seen !== null && w.scrollY !== seen && h2 === sh) return stop.abort();   // it moved while the page did not grow: the person scrolled (an article's own wheel and key events never arrive in the Mac app)
    if (Math.abs(w.scrollY - y) > 1) w.scrollTo(0, y);
    seen = w.scrollY; still = h2 === sh && Math.abs(seen - y) <= 1 ? still + 1 : 0; sh = h2;
    if (still < 12 && performance.now() < end) requestAnimationFrame(tick); else stop.abort();
  };
  requestAnimationFrame(tick);
}
// On Windows the toolbar's title starts where the page's column does, as in Fluent's reading apps. On the Mac it follows Back and Forward.
function alignTitle() {
  const t = $('.tb-title'); if (!t || MAC) return;
  t.style.marginLeft = '';
  if (!t.offsetWidth) return;
  const d = main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft) - t.getBoundingClientRect().left;
  if (d > 0 && d < 240) t.style.marginLeft = parseFloat(getComputedStyle(t).marginLeft) + d + 'px';
}
addEventListener('resize', alignTitle);
// After a new page: a person moving through the sidebar stays there, as in Finder or Settings, and Tab goes on to the toolbar and the page.
// Otherwise the next Tab starts at the top of the window (skip link, sidebar, toolbar, page), as after a full load. The marker it starts from
// is not a control; it carries the page's name, which a screen reader reads when focus lands on it.
function startHere(fromSide) {
  if (fromSide && !(MAC && !wide.matches) && document.activeElement && document.activeElement.closest('.side,.tabbar')) return;
  const t = $('#pageTop'), h1 = $('h1', main);
  t.textContent = (h1 && h1.textContent.trim()) || document.title;
  t.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);
let searchLive = null;   // on the search page, where the pane's field is the page's own (Windows), typing there updates the results
$('#topSearch').addEventListener('submit', e => { e.preventDefault(); if (searchLive) { searchLive($('#topQ').value.trim(), true); $('#topQ').blur(); return } location.hash = '#/search?q=' + encodeURIComponent($('#topQ').value.trim()) });
$('#topQ').addEventListener('input', () => { if (searchLive) searchLive($('#topQ').value.trim(), false, true) });

/* --------------------------------------------------------- the window -- */
const html = document.documentElement, MAC = html.classList.contains('plat-mac');
const wide = matchMedia('(min-width:900px)');
// The toolbar names the page once its large title has scrolled up under the toolbar.
const h1seen = new IntersectionObserver(es => html.classList.toggle('h1-gone', !es[es.length - 1].isIntersecting), { rootMargin: `-${(parseInt(getComputedStyle(html).getPropertyValue('--top-h')) || 52) + (parseInt(getComputedStyle(html).getPropertyValue('--cap-h')) || 0)}px 0px 0px 0px` });
// Windows' folded pane shows icons only: each row then carries its name as a tooltip, which is also its name for a screen reader.
function railTitles() { const icons = html.classList.contains('compact') && !html.classList.contains('side-open'); $$('.side a.row-s').forEach(a => icons ? a.title = $('span', a).textContent : a.removeAttribute('title')) }
addEventListener('resize', railTitles);
// The toolbar's field says only 'Search' when it is too narrow for the whole hint, as Windows' and the Mac's own narrow fields do
new ResizeObserver(() => { const q = $('#topQ'); if (q.clientWidth) q.placeholder = q.clientWidth < 175 ? I18n.t("common.search") : I18n.t("common.search_library") }).observe($('#topQ'));
// At 900 and wider a page's .dock controls (view switch, Save, Ask) sit in the toolbar; narrower they stay in the page.
const docks = () => wide.matches || (!MAC && innerWidth >= 640);
function dock() {
  if (docks()) $$('.dock', main).forEach(el => { const mark = document.createElement('i'); mark.className = 'dock-home'; mark.hidden = true; el.before(mark); $('#tbActs').append(el) });
  else $$('#tbActs .dock').forEach(el => { const mark = $('.dock-home', main); if (mark) mark.replaceWith(el); else el.remove() });
}
wide.addEventListener('change', () => { html.classList.remove('side-open'); dock(); railTitles(); bandState() });
matchMedia('(min-width:640px)').addEventListener('change', () => { dock(); bandState() });   // an overlay sidebar left open does not come back open later
const pageBack = () => $('main a[data-back]');
function barState() { $('#tbBack').disabled = navAt < 1 && !pageBack(); $('#tbFwd').disabled = navAt >= navEnd }
function bandState() {
  if (MAC) return;
  const s = $('#topSearch'), searchInBand = html.classList.contains('compact') && getComputedStyle(s).visibility !== 'hidden' && getComputedStyle(s).display !== 'none';
  const was = html.classList.contains('no-bar'), now = !$('#tbActs').children.length && !searchInBand;
  html.classList.toggle('no-bar', now);
  if (was !== now && window.onresize) window.onresize();   // a page that measures itself (the map) measures again
}
addEventListener('resize', () => requestAnimationFrame(bandState));
$('#tbBack').onclick = () => { const a = pageBack(); if (navAt > 0) history.back(); else if (a) location.hash = a.getAttribute('href') };
$('#tbFwd').onclick = () => history.forward();
function toggleSide() {
  if (wide.matches) { html.classList.toggle('side-off'); try { localStorage.setItem('sg.side-off', html.classList.contains('side-off') ? '1' : '0') } catch { } window.LB_LAYOUT() }
  else html.classList.toggle('side-open');
  railTitles(); bandState();
}
$('#sideBtn').onclick = toggleSide;
if (!MAC) {
  $('#sideBtn').before($('#tbBack'));   // drawn first, top left, so reached first
  // the full pane holds its search field above the rows; the folded rail has it in the command bar
  const placeSearch = () => {
    const f = $('#topSearch'), side = $('#side'), inPane = innerWidth >= 640 && !html.classList.contains('compact');
    if (inPane && f.parentElement !== side) $('.side-nav', side).before(f);
    else if (!inPane && f.parentElement === side) $('.top-in').append(f);
  };
  placeSearch(); new MutationObserver(placeSearch).observe(html, { attributes: true, attributeFilter: ['class'] }); addEventListener('resize', placeSearch);
}
document.addEventListener('click', e => { if (html.classList.contains('side-open') && !e.target.closest('.side,#sideBtn')) { html.classList.remove('side-open'); railTitles() } });
function toggleInsp() { html.classList.toggle('insp-off'); const d = $('.about-src', main); if (d && !html.classList.contains('insp-off')) d.open = true; store.set('insp-off', html.classList.contains('insp-off')) }
if (store.get('insp-off', true)) html.classList.add('insp-off');   // off until asked for: the page keeps the width
document.addEventListener('click', e => { if (e.target.closest('[data-insp]')) toggleInsp() });
$('#side').addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const rows = $$('.side a.row-s').filter(a => a.offsetParent), i = rows.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault(); rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length].focus();
});
const SECTIONS = ['#/videos', '#/map', '#/ask'];
const findBox = () => [$('#bigQ'), $('#searchQ'), $('#topQ')].find(x => x && x.offsetParent) || $('#chatIn');
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName), cmd = MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  const is = c => e.code === 'Key' + c || (!e.code && (e.key || '').toUpperCase() === c);   // some input (assistive and remote tools) sends no key code
  if (e.key === '/' && !typing) { e.preventDefault(); findBox().focus() }
  else if (cmd && !e.altKey && !e.shiftKey && /^[1-3]$/.test(e.key)) { e.preventDefault(); location.hash = SECTIONS[e.key - 1] }
  else if (cmd && !e.altKey && !e.shiftKey && (is('F') || (!MAC && is('E')))) { e.preventDefault(); const f = findBox(); f.focus(); if (f.select) f.select() }
  else if (MAC && e.metaKey && e.ctrlKey && is('S')) { e.preventDefault(); toggleSide() }   // Windows apps have no key for this: the ☰ button
  else if (MAC ? e.metaKey && e.altKey && is('I') : e.ctrlKey && e.shiftKey && is('I')) { e.preventDefault(); if ($('.about-src', main)) toggleInsp() }
  else if (e.key === 'Escape') {
    if (html.classList.contains('side-open')) { html.classList.remove('side-open'); railTitles() }
    else if (document.activeElement === $('#topQ')) { $('#topQ').value = ''; $('#topQ').blur() }
  }
});
function notFound() { setTitle(I18n.t("app.notfound.not_found")); main.innerHTML = emptyState('search', I18n.t("app.notfound.that_page_isn_t_here"), I18n.t("app.notfound.the_link_may_be_from_an")) }
const emptyState = (icon, title, text) => `<div class="empty"><span class="e-ico">${ico(icon)}</span><b>${esc(title)}</b><p>${esc(text)}</p><p class="e-act"><a class="btn plain" href="#/">${I18n.t("app.emptystate.go_to_videos")}</a></p></div>`;
function searchBox(id, value, placeholder, button = I18n.t("common.search")) {
  return `<form class="bigsearch" role="search" id="${id}F">${ico('search')}<label class="sr" for="${id}">${I18n.t("common.search")}</label><input id="${id}" type="search" autocomplete="off" value="${esc(value || '')}" placeholder="${esc(placeholder)}" enterkeyhint="search"><button>${button}</button></form>`;
}

/* --------------------------------------------------------------- home -- */
async function home() {
  setTitle('');
  const tile = t => `<a class="need" href="#/t/${t.id}" ${tcStyle(t.id)}><span class="ico">${ico(t.id)}</span><b>${esc(SHORT[t.id] || t.title)}</b><small>${esc(t.short || '')}</small></a>`;
  const cont = await continueItems();
  const pins = (await libInfo()).pins !== false;
  main.innerHTML = `
  <section class="hero">
    <h1>${I18n.t("app.home.what_do_you_need")}</h1>
    <p class="lead">${I18n.t("app.home.pick_what_s_happening_search_in")}</p>
    ${searchBox('bigQ', '', innerWidth < 500 ? I18n.t("app.home.e_g_boil_water") : I18n.t("app.home.e_g_boil_water_deep_cut"))}
    <div class="chips examples" aria-label="${I18n.t("app.home.example_searches")}">${[I18n.t("app.home.boil_water"), I18n.t("app.home.cut_won_t_stop_bleeding"), I18n.t("app.home.fridge_after_power_cut"), 'burn', I18n.t("app.home.toilet_not_working"), I18n.t("app.home.smell_gas")].map(x => `<a class="chip" href="#/search?q=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>
  </section>
  ${secHead(I18n.t("app.home.need_help_now"))}
  <div class="needs">${nowTopics().map(tile).join('')}</div>
  <div class="banners"><a class="banner chatb" href="#/ask"><span class="ico">${ico('ask')}</span><span><b>${I18n.t("app.home.ask_the_library")}</b><small>${I18n.t("app.home.get_an_answer_built_from_the")}</small></span><span class="go">${ico('right')}</span></a>
  <a class="banner map" href="#/map"><span class="ico">${ico('pin')}</span><span>${pins ? `<b>${I18n.t("app.home.find_help_nearby")}</b><small>${I18n.t("app.home.hospitals_pharmacies_water_taps_and_fire")}</small>` : `<b>${I18n.t("app.home.find_a_place")}</b><small>${I18n.t("app.home.main_roads_towns_and_water_on")}</small>`}</span><span class="go">${ico('right')}</span></a></div>
  ${cont.length ? secHead(I18n.t("app.home.pick_up_where_you_left_off")) + rail(cont.join('')) : ''}
  <div id="homeVideos"></div>
  ${secHead(I18n.t("app.home.learn_a_skill"), I18n.t("app.home.step_by_step_routes_for_the"), `<a href="#/library">${I18n.t("app.home.all_skills")}</a>`)}
  ${rail(learnTopics().map(t => `<a class="skill" href="#/t/${t.id}" ${tcStyle(t.id)}><span class="ico">${ico(t.id)}</span><b>${esc(SHORT[t.id] || t.title)}</b><small>${esc(t.short || '')}</small><span class="steps">${(t.route || []).length} ${I18n.t("app.home.steps")}</span></a>`).join(''), 'skills')}
  <a class="banner prep" href="#/prepare"><span class="ico">${ico('prep')}</span><span><b>${I18n.t("app.home.get_ready_before_it_happens")}</b><small>${I18n.t("app.home.store_water_and_food_plan_for")}</small></span><span class="go">${ico('right')}</span></a>`;
  $('#bigQF').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/search?q=' + encodeURIComponent($('#bigQ').value.trim()) });
  const ex = $('.examples', main), exEnd = () => { ex.classList.toggle('at-end', ex.scrollLeft + ex.clientWidth >= ex.scrollWidth - 4); ex.classList.toggle('at-start', ex.scrollLeft < 4) };
  ex.addEventListener('scroll', exEnd, { passive: true }); exEnd(); window.onresize = exEnd;
  try {
    const rows = await api('/api/videos');
    const g = rows.find(r => r.id === 'guides');
    if (g && $('#homeVideos')) { $('#homeVideos').innerHTML = secHead(I18n.t("app.home.watch_how_it_s_done"), I18n.t("app.home.videos_picked_for_the_guides"), `<a href="#/videos">${I18n.t("app.home.all_videos")}</a>`) + rail(g.items.slice(0, 14).map(v => vcard(v, { style: tcStyle(v.guide) })).join('')); wireRails($('#homeVideos')) }
  } catch { }
}
async function continueItems() {
  const out = [], rec = await recents();
  (await resumable(12)).slice(0, 6)
    .forEach(([id, v]) => out.push(vcard({ id, title: v.title, thumb: v.thumb, duration: v.d }, { sub: I18n.t("app.continueitems.resume_at") + " " + clock(v.t) })));
  rec.filter(r => !r.key.startsWith('v:')).slice(0, 8).forEach(r => out.push(`<a class="mini" href="${esc(r.href)}"><small>${esc(r.sub || '')}</small><b>${esc(r.title)}</b></a>`));
  return out;
}

/* -------------------------------------------------------------- guide -- */
function topicVideos(t) {
  const all = [...(t.choices || []).flatMap(c => c.read || []), ...(t.route || []).flatMap(s => s.read || []), ...(t.learn || []), ...(t.prepare || [])];
  const seen = new Set();
  return all.filter(i => i.src && i.src.kind === 'video' && !seen.has(i.src.id) && seen.add(i.src.id)).map(i => i.src);
}
async function topicPage(id, open) {
  const t = topicById(id);
  if (!t) return notFound();
  setTitle(t.title);
  remember({ key: 't:' + id, title: t.title, href: '#/t/' + id, sub: t.mode === 'learn' ? I18n.t("app.topicpage.learning_route") : I18n.t("common.guide") });
  const learn = t.mode === 'learn';
  const progress = store.get('progress', {});
  const sits = (t.choices || []).map(c => c.goto
    ? `<div class="sit"><a href="#/t/${esc(c.goto)}"><span class="dot"></span><span class="tx"><b>${esc(c.label)}</b>${c.hint ? `<span>${esc(c.hint)}</span>` : ''}</span><span class="chev">${ico('right')}</span></a></div>`
    : `<div class="sit${open === c.id ? ' open' : ''}" id="c-${esc(c.id)}">
      <button aria-expanded="${open === c.id}" aria-controls="cb-${esc(c.id)}" data-choice="${esc(c.id)}"><span class="dot"></span><span class="tx"><b>${esc(c.label)}</b>${c.hint ? `<span>${esc(c.hint)}</span>` : ''}</span><span class="chev">${ico('down')}</span></button>
      <div class="body" id="cb-${esc(c.id)}"><div class="rcards">${(c.read || []).map(rcard).join('') || `<p class="muted">${I18n.t("app.sits.nothing_picked_for_this_yet_try")}</p>`}</div></div></div>`).join('');
  const limLi = l => `<li>${esc(l.text)}${l.src ? ` <span class="cite">— <a href="${hrefFor(l)}">${esc(l.src.publisher || l.src.title)}${l.page ? I18n.t('common.page_short') + ' ' + l.page : ''}</a></span>` : l.zim ? ` <span class="cite">— <a href="${hrefFor(l)}">${I18n.t("common.encyclopedia_word")}</a></span>` : ''}</li>`;
  const LIM = 4, lims = t.limits || [];
  const limits = lims.length ? `<section class="limits" aria-labelledby="lim"><h2 id="lim">${ico('warn')}${I18n.t("app.limits.stop_and_get_help_when")}</h2><ul>${lims.slice(0, LIM).map(limLi).join('')}</ul>${lims.length > LIM ? `<details><summary>${I18n.t("app.limits.show_all")} ${lims.length} ${I18n.t("common.warnings_word")}</summary><ul>${lims.slice(LIM).map(limLi).join('')}</ul></details>` : ''}</section>` : '';
  const disagree = (t.gaps?.disagree || []).length ? `<div class="disagree"><b>${I18n.t("app.disagree.sources_disagree")}</b><ul>${t.gaps.disagree.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  const route = (t.route || []).length ? `<h2>${I18n.t("app.route.your_learning_route")}</h2><p class="muted small">${I18n.t("app.route.ticks_are_your_own_notes_on")}</p>
    <ol class="route">${t.route.map((s, i) => { const k = id + ':' + i, p = progress[k] || {}; return `<li class="step${p.practised ? ' done' : ''}"><h3>${esc(s.title.replace(/^Step \d+:\s*/i, ''))}</h3>${s.goal ? `<p class="goal">${esc(s.goal)}</p>` : ''}
      <div class="rcards">${(s.read || []).map(rcard).join('')}</div>
      <div class="mark"><label><input type="checkbox" data-prog="${k}" data-f="read" ${p.read ? 'checked' : ''}> ${I18n.t("app.route.i_ve_read_this")}</label><label><input type="checkbox" data-prog="${k}" data-f="practised" ${p.practised ? 'checked' : ''}> ${I18n.t("app.route.i_ve_practised_it_with_someone")}</label></div></li>` }).join('')}</ol>` : '';
  const sec = (icon, title, items) => items && items.length ? `<details class="more"><summary>${ico(icon)}<span>${title} <span class="n">· ${items.length}</span></span></summary><div class="body"><ul class="list">${items.map(i => rowItem({ ...i, preview: true })).join('')}</ul></div></details>` : '';
  const vids = topicVideos(t);
  const related = (t.related || []).map(topicById).filter(Boolean);
  main.innerHTML = `<div class="ghero" ${tcStyle(id)}><div class="ghero-in">${crumbs([[I18n.t("nav.videos"), '#/videos'], [learn ? I18n.t("app.home.learn_a_skill") : I18n.t("app.home.need_help_now"), learn ? '#/library' : '#/'], [SHORT[id] || t.title]])}
      <div class="row1"><span class="ico">${ico(t.id)}</span><h1>${esc(t.title)}</h1></div><p class="lead">${esc(t.intro || '')}</p>
      <div class="vactions" style="margin-bottom:0">${askLink('topic:' + id, I18n.t("app.topicpage.ask_a_question_about_this"))}</div></div></div>
    <div class="gcols" ${tcStyle(id)}><div>
      ${(t.choices || []).length ? `<p class="ask" id="askh">${learn ? I18n.t("app.topicpage.where_do_you_want_to_start") : I18n.t("app.topicpage.what_s_happening")}</p><div class="situations" aria-labelledby="askh">${sits}</div>` : ''}
      <div class="gnarrow">${limits}${disagree}</div>
      ${route}
      ${vids.length ? secHead(I18n.t("app.topicpage.videos_for_this"), `${vids.length} ${I18n.t("app.topicpage.picked_video")}${vids.length > 1 ? 's' : ''}`) + rail(vids.map(v => vcard(v)).join('')) : ''}
      ${sec('prep', I18n.t("app.home.get_ready_before_it_happens"), t.prepare)}
      ${sec('book', I18n.t("app.topicpage.go_deeper_full_manuals_articles"), t.learn)}
      ${(t.gaps?.missing || []).length ? `<details class="more"><summary>${ico('warn')}<span>${I18n.t("app.topicpage.not_in_this_library")}</span></summary><div class="body"><p class="muted small" style="margin-top:0">${I18n.t("app.topicpage.looked_for_but_not_found_when")}</p><ul>${t.gaps.missing.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>` : ''}
      ${related.length ? `<h2>${I18n.t("app.topicpage.related_guides")}</h2><div class="related">${related.map(r => `<a class="chip" href="#/t/${r.id}" ${tcStyle(r.id)}><span style="color:var(--tc)">${ico(r.id)}</span>${esc(SHORT[r.id] || r.title)}</a>`).join('')}</div>` : ''}
    </div><aside class="gside" aria-label="${I18n.t("common.safety")}"></aside></div>`;
  // On wide screens the safety box sits beside the choices so it stays visible.
  const side = $('.gside', main), nar = $('.gnarrow', main);
  const placeSide = () => { if (!side || !nar) return; if (innerWidth >= 1050) { if (!side.firstChild) side.append(...nar.childNodes) } else if (side.firstChild) nar.append(...side.childNodes) };
  placeSide(); window.onresize = placeSide;
  $$('[data-choice]', main).forEach(b => b.addEventListener('click', () => {
    const c = b.closest('.sit'), on = !c.classList.contains('open');
    $$('.sit.open', main).forEach(x => { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false') });
    if (on) { c.classList.add('open'); b.setAttribute('aria-expanded', 'true') }
    history.replaceState(null, '', '#/t/' + id + (on ? '/' + b.dataset.choice : ''));
    if (on) setTimeout(() => c.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30);
  }));
  $$('[data-prog]', main).forEach(cb => cb.addEventListener('change', () => {
    const p = store.get('progress', {}); p[cb.dataset.prog] = { ...(p[cb.dataset.prog] || {}), [cb.dataset.f]: cb.checked }; store.set('progress', p);
    cb.closest('.step').classList.toggle('done', !!p[cb.dataset.prog].practised);
  }));
  if (open) { const c = $('#c-' + CSS.escape(open)); if (c) setTimeout(() => c.scrollIntoView({ block: 'start' }), 0) }
}

/* ------------------------------------------------------------- videos -- */
async function videosHome() {
  setTitle(I18n.t("nav.videos"));
  main.innerHTML = `<h1>${I18n.t("nav.videos")}</h1><p class="lead">${I18n.t("videos.intro")}</p>
    <div class="vtools">${searchBox('vq', '', I18n.t("videos.search.placeholder"))}</div>
    <div class="chips" style="margin-top:8px">${[['short', I18n.t("app.videoshome.under_10_min")], ['medium', I18n.t("app.videoshome.10_30_min")], ['long', I18n.t("app.videoshome.over_30_min")]].map(([k, l]) => `<a class="chip" href="#/videos/all?len=${k}">${ico('clock')}${l}</a>`).join('')}</div>
    <div id="vrows"><p class="loading">${I18n.t("videos.loading")}</p></div>`;
  $('#vqF').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/videos/all?q=' + encodeURIComponent($('#vq').value.trim()) });
  const rows = await api('/api/videos');
  const cont = (await resumable(20)).slice(0, 12);
  const GCOL = { health: 'hurt', water: 'water', food: 'food', power: 'power', outdoors: 'shelter', repair: 'repair', making: 'land' };
  $('#vrows').innerHTML =
    (cont.length ? secHead(I18n.t("videos.resume.title")) + rail(cont.map(([id, v]) => vcard({ id, title: v.title, thumb: v.thumb, duration: v.d }, { sub: I18n.t("app.continueitems.resume_at") + " " + clock(v.t) })).join('')) : '') +
    rows.map(r => secHead(esc(I18n.label(r.title)), r.note ? esc(I18n.label(r.note)) : '', `<a href="#/videos/${r.id}">${I18n.t("app.videoshome.see_all")} ${r.count}</a>`) +
      rail(r.items.map(v => vcard(v, { style: tcStyle(v.guide || GCOL[r.id]) })).join(''))).join('') +
    `<p class="small muted" style="margin-top:24px">${I18n.t("videos.downloaded_note")}</p>`;
  wireRails();
}
async function videoRow(row, q) {
  const len = q.get('len') || '', sort = q.get('sort') || '', qq = q.get('q') || '';
  const base = `#/videos/${row}`;
  const qs = o => { const p = new URLSearchParams({ q: qq, len, sort, ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); const s = p.toString(); return base + (s ? '?' + s : '') };
  let off = 0;
  const first = await api(`/api/videos/${row}?q=${encodeURIComponent(qq)}&len=${len}&sort=${sort}&offset=0`);
  setTitle(I18n.label(first.title));
  main.innerHTML = `<div>${backButton('#/videos', I18n.t("nav.videos"))}</div><h1 style="margin-top:12px">${esc(qq ? I18n.t("app.videorow.videos") + qq + '”' : I18n.label(first.title))}</h1>${first.note ? `<p class="lead">${esc(I18n.label(first.note))}</p>` : ''}
    <div class="vtools">${searchBox('vq', qq, I18n.t("app.videorow.search_these_videos"), I18n.t("app.videorow.go"))}
      <label class="sr" for="vsort">${I18n.t("videos.sort.label")}</label><select id="vsort">${[['', I18n.t("app.videorow.most_useful_first")], ['short', I18n.t("app.videorow.shortest_first")], ['new', I18n.t("app.videorow.newest_first")], ['az', I18n.t("app.videorow.a_to_z")]].map(([k, l]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="chips" style="margin:8px 0 16px">${[['', I18n.t("videos.filter.any_length")], ['short', I18n.t("app.videoshome.under_10_min")], ['medium', I18n.t("app.videoshome.10_30_min")], ['long', I18n.t("app.videoshome.over_30_min")]].map(([k, l]) => `<a class="chip ${k === len ? 'on' : ''}" href="${qs({ len: k })}">${l}</a>`).join('')}</div>
    <p class="muted small">${first.total.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.videorow.video")}${first.total === 1 ? '' : 's'}</p>
    <div class="vgrid" id="vg"></div><p id="vmore"></p>`;
  $('#vqF').addEventListener('submit', e => { e.preventDefault(); location.hash = qs({ q: $('#vq').value.trim() }) });
  $('#vsort').addEventListener('change', e => { location.hash = qs({ sort: e.target.value }) });
  const add = d => {
    $('#vg').insertAdjacentHTML('beforeend', d.items.map(v => vcard(v)).join('') || (off ? '' : `<div class="empty" style="grid-column:1/-1">${I18n.t("videos.empty")}</div>`));
    $('#vmore').innerHTML = d.more ? `<button class="btn plain" id="vmb">${I18n.t("videos.more")}</button>` : '';
    if (d.more) $('#vmb').onclick = async () => { off += 48; add(await api(`/api/videos/${row}?q=${encodeURIComponent(qq)}&len=${len}&sort=${sort}&offset=${off}`)) };
  };
  add(first);
}

// Video formats some computers can't play, by the code an MP4 file gives its video track: the name to show, and what to ask the player.
const UNPLAYABLE = { av01: ['AV1', 'video/mp4; codecs="av01.0.05M.08"'], vp09: ['VP9', 'video/mp4; codecs="vp09.00.10.08"'], hvc1: ['HEVC', 'video/mp4; codecs="hvc1.1.6.L93.B0"'], hev1: ['HEVC', 'video/mp4; codecs="hev1.1.6.L93.B0"'] };
// The format codes of an MP4 file's tracks ("av01", "mp4a"), read from the file's own index. [] when they can't be read (not an MP4, say).
// An MP4 is a row of boxes, each starting with its length and a four-letter name. This reads the start of each box until it finds
// the index ("moov"), then reads only that: never the pictures or the sound.
async function videoFormats(url) {
  let size = 0;
  const part = async (at, n) => {
    const r = await fetch(url, { headers: { Range: `bytes=${at}-${at + n - 1}` } });
    size = +(/\/(\d+)$/.exec(r.headers.get('Content-Range') || '') || [])[1] || 0;
    if (r.status !== 206 || !size) throw new Error('no byte range');
    return new DataView(await r.arrayBuffer());
  };
  const name = (v, at) => String.fromCharCode(v.getUint8(at), v.getUint8(at + 1), v.getUint8(at + 2), v.getUint8(at + 3));
  const found = [];
  const inside = (v, at, end) => {   // the boxes between at and end; a track's format is the first name in its "stsd" box
    while (at + 8 <= end) {
      let n = v.getUint32(at), head = 8;
      if (n === 1 && at + 16 <= end) { n = Number(v.getBigUint64(at + 8)); head = 16 } else if (n === 0) n = end - at;
      if (n < head || at + n > end) return;
      const type = name(v, at + 4);
      if (type === 'stsd' && n >= head + 16) found.push(name(v, at + head + 12));
      else if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) inside(v, at + head, at + n);
      at += n;
    }
  };
  for (let at = 0, i = 0; i < 64; i++) {
    const v = await part(at, 16);
    if (v.byteLength < 16) break;
    let n = v.getUint32(0);
    if (n === 1) n = Number(v.getBigUint64(8)); else if (n === 0) n = size - at;
    if (n < 8) break;
    if (name(v, 4) === 'moov') { if (n <= 32 * 1024 * 1024) { const m = await part(at, n); inside(m, 0, m.byteLength) } break }
    at += n;
    if (at + 16 > size) break;
  }
  return found;
}

async function watch(id, t, from) {
  const d = await api('/api/doc/' + encodeURIComponent(id));
  setTitle(d.title);
  const selfHref = `#/watch/${encodeURIComponent(id)}`;
  remember({ key: 'v:' + id, title: d.title, href: selfHref, sub: I18n.t("app.watch.video") + " " + fmtDur(d.duration) });
  const p = vprog()[id];
  const resumeAt = !t && p && p.t > 15 && (!d.duration || p.t < d.duration - 20) ? p.t : 0;
  main.innerHTML = `<div class="rtop">${backButton(from, I18n.t("nav.videos"))}</div>
  <div class="watch">
    <div>
      <div class="player"><video id="vid" controls preload="metadata" playsinline src="${fileUrl(d.path)}${t ? '#t=' + t : ''}"></video></div>
      ${d.remote ? `<p class="small muted" style="margin:6px 0 0">${I18n.t("app.watch.stored_on_the_remote_drive")}${esc(d.remote)}${I18n.t("app.watch.it_plays_only_while_that_computer")}</p>` : ''}
      <h1 class="vtitle">${esc(d.title)}</h1>
      <div class="vmeta"><b>${esc(d.publisher || '')}</b><span>${fmtDur(d.duration)}</span>${d.upload_date ? `<span>${esc(I18n.date(d.upload_date.replace(/(\d{4})(\d\d)(\d\d)/, '$1-$2-$3')))}</span>` : ''}<span>${esc(I18n.label(d.trust))}</span></div>
      ${resumeAt ? `<div class="resume" id="resume">${I18n.t("app.watch.you_stopped_at")} ${clock(resumeAt)}. <button class="btn" id="resYes">${I18n.t("videos.player.resume")}</button><button class="btn plain" id="resNo">${I18n.t("videos.player.restart")}</button></div>` : ''}
      <div class="vactions dock">${saveButton({ key: 'v:' + id, title: d.title, href: selfHref, sub: I18n.t("app.watch.video") + " " + fmtDur(d.duration) })}<a class="btn plain" title="${I18n.t("videos.player.ask")}" href="#/ask?about=${encodeURIComponent('video:' + id)}&${fromQ()}" id="askv">${ico('ask')}<span>${I18n.t("videos.player.ask")}</span></a></div>
      <div class="notice small">${I18n.t("app.watch.a_video_shows_how_one_person")}</div>
    </div>
    <section class="txpanel" id="tx" aria-label="${I18n.t("videos.transcript.title")}"><header><h2>${I18n.t("videos.transcript.title")}</h2><label class="sr" for="cueQ">${I18n.t("app.watch.find_in_transcript")}</label><input id="cueQ" type="search" placeholder="${I18n.t("app.watch.find_words_in_the_transcript")}"></header>
      <div class="cues" id="cues"><p class="muted" style="padding:12px 14px">${I18n.t("app.watch.loading_transcript")}</p></div><div class="txnote" id="txnote"></div></section>
  </div>
  <div id="morev"></div>
  <details class="about-src"><summary>${I18n.t("videos.details.title")}</summary><div class="in"><dl><dt>${I18n.t("app.watch.channel")}</dt><dd>${esc(d.publisher || '—')}</dd><dt>${I18n.t("common.kind")}</dt><dd>${esc(I18n.label(d.trust))}</dd><dt>${I18n.t("common.length")}</dt><dd>${fmtDur(d.duration) || I18n.t('videos.duration.unknown')}</dd>${d.notes ? `<dt>${I18n.t("common.note")}</dt><dd>${esc(d.notes)}</dd>` : ''}${d.source_url ? `<dt>${I18n.t("app.watch.online_original")}</dt><dd>${esc(hostOf(d.source_url))} <span class="muted">${I18n.t("common.online_not_needed_here")}</span></dd>` : ''}</dl></div></details>`;
  const vid = $('#vid');
  if (d.thumb) vid.poster = fileUrl(d.thumb);
  vid.addEventListener('error', async () => {
    const say = why => vid.closest('.player')?.insertAdjacentHTML('afterend', `<div class="err">${why}</div>`);
    if (d.remote) return say(`${I18n.t("app.watch.this_video_is_on_the_remote")}${esc(d.remote)}${I18n.t("app.watch.which_isn_t_reachable_right_now")}`);
    // Say why when the reason is the format: some library videos are AV1, which a computer without an AV1 decoder (a Mac before the M3) can't play.
    const f = (await videoFormats(fileUrl(d.path)).catch(() => [])).map(x => UNPLAYABLE[x]).find(x => x && !vid.canPlayType(x[1]));
    if (!vid.isConnected) return;   // the person has gone to another page
    say(f ? `${I18n.t("app.watch.this_video_is_saved_in_the")} ${f[0]} ${I18n.t("app.watch.format_which_this_computer_can_t")} ${f[0]}${I18n.t("app.watch.such_as_vlc_the_file_is")} <b style="overflow-wrap:anywhere">library-data/${esc(d.path)}</b>.`
      : `${I18n.t("app.watch.this_video_file_couldn_t_be")} <a href="${fileUrl(d.path)}" target="_blank" rel="noopener">${I18n.t("app.watch.open_the_file_directly")}</a>.`);
  }, { once: true });
  if (resumeAt) {
    $('#resYes').onclick = () => { vid.currentTime = resumeAt; vid.play().catch(() => { }); $('#resume').remove() };
    $('#resNo').onclick = () => { vid.currentTime = 0; vid.play().catch(() => { }); $('#resume').remove() };
  }
  let lastSave = 0;
  const saveProg = () => { if (vid.currentTime > 3) setVprog(id, { t: vid.currentTime, d: d.duration || vid.duration, title: d.title, thumb: d.thumb }) };
  vid.addEventListener('timeupdate', () => { if (Date.now() - lastSave > 4000) { lastSave = Date.now(); saveProg() } });
  vid.addEventListener('pause', saveProg);
  leaving = () => { saveProg(); vid.pause() };
  // keep "Ask about this video" pointing at the current moment
  vid.addEventListener('pause', () => { const a = $('#askv'); if (a) a.href = `#/ask?about=${encodeURIComponent('video:' + id + ':' + Math.round(vid.currentTime))}&${fromQ()}` });
  let cues = [];
  try {
    const tx = await api('/api/transcript/' + encodeURIComponent(id)); cues = tx.cues || [];
    $('#txnote').textContent = cues.length ? `${tx.source === 'authored' ? I18n.t("app.watch.captions_written_by_the_publisher") : /auto/.test(tx.source || '') ? I18n.t("app.watch.automatic_captions") : I18n.t("common.captions")} ${I18n.t("app.watch.may_contain_errors")}` : '';
  } catch { }
  const box = $('#cues');
  const draw = q => {
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig') : null;
    const list = cues.filter(c => !rx || c.text.match(rx));
    box.innerHTML = list.length ? list.map(c => `<button class="cue" data-t="${c.t ?? ''}"><time>${c.t != null ? clock(c.t) : ''}</time><span>${rx ? esc(c.text).replace(rx, m => `<mark>${m}</mark>`) : esc(c.text)}</span></button>`).join('')
      : `<p class="muted" style="padding:12px 14px">${cues.length ? I18n.t("app.draw.no_matching_words") : I18n.t("app.draw.no_transcript_was_saved_for_this")}</p>`;
  };
  draw('');
  $('#cueQ').addEventListener('input', e => draw(e.target.value.trim()));
  box.addEventListener('click', e => { const b = e.target.closest('.cue'); if (b && b.dataset.t !== '') { vid.currentTime = +b.dataset.t; vid.play().catch(() => { }); if (innerWidth < 1000) scrollTo({ top: 0, behavior: 'smooth' }) } });
  let lastOn = null;
  vid.addEventListener('timeupdate', () => {
    const now = vid.currentTime; let on = null;
    for (const b of box.children) { if (b.dataset && b.dataset.t !== '' && +b.dataset.t <= now) on = b; else if (on) break }
    if (on !== lastOn) { lastOn && lastOn.classList.remove('on'); on && on.classList.add('on'); lastOn = on; if (on && !$('#cueQ').value && innerWidth >= 1000) on.scrollIntoView({ block: 'nearest' }) }
  });
  try {
    const rel = await api('/api/videos/related/' + encodeURIComponent(id));
    if (rel.length && $('#morev')) { $('#morev').innerHTML = secHead(I18n.t("app.watch.more_like_this")) + rail(rel.map(v => vcard(v)).join('')); wireRails($('#morev')) }
  } catch { }
}

/* ------------------------------------------------------------- reader -- */
async function reader(id, page, from, view) {
  const d = await api('/api/doc/' + encodeURIComponent(id));
  if (d.kind === 'video') { swap('#/watch/' + encodeURIComponent(id) + (from ? '?from=' + encodeURIComponent(from) : '')); return }
  if (d.kind === 'transcript' && d.videoId) { swap('#/watch/' + encodeURIComponent(d.videoId) + (from ? '?from=' + encodeURIComponent(from) : '')); return }
  setTitle(d.title, [d.publisher, d.year, d.trust].filter(Boolean).join(' · '));
  const isPdf = d.kind === 'pdf', total = d.pages || 1;
  const isWeb = d.kind === 'html' && /\.x?html?$/i.test(d.path);   // a plain text file, such as a lecture transcript, reads as text in the page itself
  page = Math.min(Math.max(page || 1, 1), total);
  view = isPdf ? view || 'page' : isWeb ? view || 'web' : 'text';
  const key = 'd:' + id + (isPdf ? ':' + page : '');
  const selfHref = `#/read/${encodeURIComponent(id)}?p=${page}`;
  remember({ key: 'd:' + id, title: d.title, href: selfHref, sub: (isPdf ? I18n.t("common.page") + " " + page + ' · ' : '') + (d.publisher || '') });
  const go = (p, v = view) => `#/read/${encodeURIComponent(id)}?p=${p}&view=${v}${from ? '&from=' + encodeURIComponent(from) : ''}`;
  const views = isPdf ? [['page', I18n.t("common.page")], ['text', I18n.t("common.text")], ['pdf', I18n.t("app.views.whole_pdf")]] : isWeb ? [['web', I18n.t("common.page")], ['text', I18n.t("app.views.text_only")]] : [];
  main.innerHTML = `
    <div class="rtop">${backButton(from)}</div>
    <h1 class="rtitle">${esc(d.title)}</h1>
    <div class="rsrc"><b>${esc(d.publisher || '')}</b>${d.year ? ' · ' + esc(d.year) : ''} · ${esc(I18n.label(d.trust))}</div>
    <div class="rmodes">${views.length ? `<div class="seg dock" role="group" aria-label="${I18n.t("app.reader.how_to_show_it")}">${views.map(([v, l]) => `<button data-view="${v}" aria-pressed="${v === view}">${l}</button>`).join('')}</div>` : ''}<span class="vactions dock">${askLink('doc:' + id + ':' + (isPdf ? page : 1), I18n.t("common.ask"))}${saveButton({ key, title: d.title + (isPdf ? " " + I18n.t("app.reader.page") + " " + page : ''), href: selfHref, sub: d.publisher || d.kindLabel })}<button class="tb-btn insp-btn" data-insp aria-label="${I18n.t("app.reader.show_or_hide_the_source_details")}" title="${I18n.t("common.details")}">${ico('insp')}</button></span></div>
    <div id="docbody"></div>
    ${d.imageOnly ? `<div class="notice">${I18n.t("app.reader.this_is_a_scanned_document_without")}</div>` : ''}
    ${isPdf && view !== 'pdf' ? `<div class="rbar"><a class="btn plain nav" href="${go(page - 1)}" ${page <= 1 ? 'aria-disabled="true" style="opacity:.35;pointer-events:none"' : ''} aria-label="${I18n.t("app.reader.previous_page")}">${ico('back')}<span>${I18n.t("common.previous")}</span></a>
      <span class="pnum"><label class="sr" for="pg">${I18n.t("app.reader.page_number")}</label>${I18n.t("common.page")} <input id="pg" inputmode="numeric" value="${page}"> ${I18n.t("common.of_word")} ${total}</span>
      <a class="btn nav" href="${go(page + 1)}" ${page >= total ? 'aria-disabled="true" style="opacity:.35;pointer-events:none"' : ''} aria-label="${I18n.t("app.reader.next_page")}"><span>${I18n.t("common.next")}</span>${ico('right')}</a></div>` : ''}
    <details class="about-src"><summary>${I18n.t("app.reader.about_this_source")}</summary><div class="in"><p class="insp-h">${esc(d.title)}</p>
      <dl><dt>${I18n.t("common.publisher")}</dt><dd>${esc(d.publisher || '—')}</dd><dt>${I18n.t("common.kind")}</dt><dd>${esc(I18n.label(d.trust))} · ${esc(I18n.label(d.kindLabel))}</dd>
      ${d.edition ? `<dt>${I18n.t("common.edition")}</dt><dd>${esc(d.edition)}</dd>` : ''}${d.year ? `<dt>${I18n.t("common.year")}</dt><dd>${esc(d.year)}</dd>` : ''}
      <dt>${I18n.t("common.saved")}</dt><dd>${esc(I18n.date((d.retrieved_at || '').slice(0, 10)) || I18n.t("app.reader.unknown_date"))} · ${esc(d.collection)}</dd>
      ${d.notes ? `<dt>${I18n.t("common.note")}</dt><dd>${esc(d.notes)}</dd>` : ''}
      ${d.source_url ? `<dt>${I18n.t("app.watch.online_original")}</dt><dd>${esc(hostOf(d.source_url))} <span class="muted">${I18n.t("common.online_not_needed_to_read_this_copy")}</span></dd>` : ''}</dl>
      <p class="small muted">${I18n.t("app.reader.a_reference_copy_not_advice_checked")}</p>
      ${isPdf || isWeb || !IN_WINDOW ? `<p><a class="btn ghost" href="${fileUrl(d.path)}${isPdf ? '#page=' + page : ''}" target="_blank" rel="noopener">${ico('ext')}${I18n.t("app.reader.open_the_original_file")}</a></p>` : ''}</div></details>`;
  $$('[data-view]', main).forEach(b => b.addEventListener('click', () => swap(go(page, b.dataset.view))));
  if (innerWidth >= 1060 && !html.classList.contains('insp-off')) $('.about-src', main).open = true;
  const pg = $('#pg'); if (pg) pg.addEventListener('change', () => { const n = parseInt(pg.value, 10); if (n >= 1 && n <= total) location.hash = go(n) });
  const body = $('#docbody');
  if (view === 'page') {
    const w = Math.min(1600, Math.round(Math.min(innerWidth, 1000) * Math.min(2, devicePixelRatio || 1)));
    body.innerHTML = `<div class="pagewrap"><img class="pageimg" alt="${I18n.t("common.page")} ${page} ${I18n.t("common.of_word")} ${esc(d.title)}" src="${pageImg(id, page, w)}"></div>`;
    const img = $('img', body);
    img.addEventListener('error', () => { body.innerHTML = `<div class="notice">${I18n.t("app.reader.this_page_image_couldn_t_be")} <a href="${go(page, 'text')}">${I18n.t("app.reader.show_the_text_instead")}</a>.</div>` });
    if (page < total) { const n = new Image(); n.src = pageImg(id, page + 1, w) }
    let sx = null, sy = 0;
    const wrap = $('.pagewrap', body);
    wrap.addEventListener('touchstart', e => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY } }, { passive: true });
    wrap.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0 && page < total) location.hash = go(page + 1); if (dx > 0 && page > 1) location.hash = go(page - 1) } }, { passive: true });
  } else if (view === 'pdf') {
    body.innerHTML = `<iframe class="frame" title="${esc(d.title)}" src="${fileUrl(d.path)}#page=${page}"></iframe><p class="small muted">${I18n.t("app.reader.if_the_pdf_doesn_t_show")}</p>`;
  } else if (view === 'web') {
    const own = /(^|\/)documents\/lastbook\//.test(d.path);   // Lastbook's own pages (Sources and permissions) take the window's look from the server (engine/saved_pages.py, OWN_LOOK); an older server's stays a white sheet
    body.innerHTML = `<iframe class="frame${own ? ' own' : ''}" title="${esc(d.title)}" src="${fileUrl(d.path)}"></iframe>`;
  } else {
    body.innerHTML = `<p class="loading">${I18n.t("app.reader.loading_text")}</p>`;
    try {
      const t = await api(`/api/page/${encodeURIComponent(id)}/${isPdf ? page : 1}`);
      const txt = (t.text || '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      body.innerHTML = `${isPdf || isWeb ? `<div class="notice small">${I18n.t("app.reader.text_pulled_out_of_the_original")}</div>` : ''}<div class="pagetext">${esc(txt) || `<span class="muted">${I18n.t("app.reader.no_text_on_this_page_it")}</span>`}</div>`;
    } catch (e) { body.innerHTML = errorBox(e, I18n.t("app.reader.couldn_t_load_the_text")) }
  }
  main.onkeydown = e => { if (!isPdf || /INPUT/.test(e.target.tagName) || e.altKey || e.metaKey || e.ctrlKey) return; if (e.key === 'ArrowRight' && page < total) location.hash = go(page + 1); if (e.key === 'ArrowLeft' && page > 1) location.hash = go(page - 1) };
}

/* --------------------------------------------------------------- wiki -- */
const ZIMNAMES = { mdwiki: I18n.t("app.zimnames.medical_encyclopedia_mdwiki"), wikipedia: I18n.t("app.zimnames.wikipedia_text_only"), wikibooks: I18n.t("app.zimnames.wikibooks_how_to_textbooks"), appropedia: I18n.t("app.zimnames.appropedia_appropriate_technology") };
const zimLabel = name => { for (const k in ZIMNAMES) if (name.startsWith(k)) return ZIMNAMES[k]; return name };
async function wiki(path, from, y) {
  const [zim, ...rest] = path.split('/');
  const art = rest.join('/');
  const title = decodeURIComponent(art.split('/').pop() || '').replace(/_/g, ' ') || zimLabel(zim);
  setTitle(title, '', zimLabel(zim));
  const src = '/zim/' + encodeURIComponent(zim) + '/' + art.split('/').map(encodeURIComponent).join('/');
  const selfHref = '#/wiki/' + path;
  const mainPage = zimMain(zim);
  main.innerHTML = `<div class="rtop">${backButton(from || '#/encyclopedias')}<span id="wsave" class="dock">${saveButton({ key: 'w:' + path, title, href: selfHref, sub: zimLabel(zim) })}</span></div>
    <h1 class="rtitle" id="wtitle">${esc(title)}</h1><div class="rsrc"><span class="zn">${esc(zimLabel(zim))} · </span>${I18n.t("app.wiki.community_written_check_safety_critical_steps")}${IN_WINDOW ? '' : ` · <a id="wopen" href="${src}" target="_blank" rel="noopener">${I18n.t("app.wiki.open_on_its_own")}</a>`}</div>
    <iframe class="frame" id="wframe" title="${esc(title)}" src="${src}"></iframe>`;
  const f = $('#wframe');
  // The toolbar names the encyclopedia, and the article once the article's own title has scrolled up out of the frame, as a large title does
  const barName = () => { const n = f.lbName, b = $('#tbTitle'), t = n && f.contentWindow.scrollY > n.at - 4 ? n.nt : zimLabel(zim); if (b.textContent !== t) b.textContent = b.title = t };
  // One scroller: the frame fills the rest of the window, so the page around it never scrolls as well
  const fit = () => { if (!f.isConnected) return; f.style.height = Math.max(160, innerHeight - (f.getBoundingClientRect().top + scrollY) - parseFloat(getComputedStyle(document.body).paddingBottom || 0)) + 'px' };
  fit(); window.onresize = fit;
  // The frame's scrolling is read from here, every frame while it moves and ten times a second when it rests. The Mac app runs no script in
  // an article, and then no listener on it is ever called, its scroll events included. Once the text goes under the frame's top edge the
  // platform's separator shows there; the toolbar names the article; the reading place is kept for Back; a wide table fades at its edges.
  let lastY = -1, moved = 0;
  const watch = () => {
    if (!f.isConnected) return;
    const fw = f.contentWindow, t = f.lbTidy, now = performance.now();
    if (fw && fw.document.readyState === 'complete') {
      const y = fw.scrollY;
      if (y !== lastY) { lastY = y; moved = now; f.classList.toggle('scrolled', y > 2); scrolls[current] = y; barName() }
      if (t) for (const b of t.boxes) if (b.lbX !== b.scrollLeft) { b.lbX = b.scrollLeft; moved = now; t.edge(b) }
    }
    if (now - moved < 500) requestAnimationFrame(watch); else setTimeout(watch, 100);
  };
  watch();
  let shown = null;
  f.addEventListener('load', async () => {
    try {
      const fd = f.contentDocument;
      lookOf(fd);
      if (!fd.getElementById('lb-article') && !fd.getElementById('lb-host')) {   // an older server adds no look of its own: the window's colour shows through, as engine/saved_pages.py does it
        const st = fd.createElement('style'); st.id = 'lb-host';
        st.textContent = 'html{--background-color-base:transparent!important}html,body,.mw-page-container,.mw-page-container-inner{background:transparent!important}.hatnote,.dablink,.rellink{--background-color-interactive-subtle:transparent!important;background:none!important}';
        (fd.head || fd.documentElement).appendChild(st);
      }
      f.lbTidy = null; try { f.lbTidy = tidyArticle(fd) } catch { }   // the article still reads as it came if this fails
      const fw = f.contentWindow;
      f.lbName = null;
      if (y && shown === null) restoreScroll(current, y, fw);   // Back to this article: its place, once (a link followed inside the frame starts at its top)
      const loc = f.contentWindow.location.pathname, t = fd.title || '';
      const m = /^\/zim\/([^/]+)\/(.*)$/.exec(loc); if (!m) return;
      const p = decodeURIComponent(m[1]) + '/' + m[2].split('/').map(decodeURIComponent).join('/');
      const own = fd.querySelector('#firstHeading, h1'), raw = (own && own.textContent.trim()) || t;
      if (!m[2] && !raw) return;   // the bare address, on its way to the front page
      const front = decodeURIComponent(loc) === await mainPage;   // the front page is named by its file, such as App/IntroPage: the encyclopedia's name says it instead
      if (f.contentDocument !== fd) return;
      if (front && own) own.style.setProperty('display', 'none', 'important');   // the skin sets its own display, which the hidden attribute does not beat
      main.classList.toggle('own-title', front);   // then the app's heading names it
      const nt = front ? zimLabel(zim) : raw || p.split('/').pop().replace(/_/g, ' '), sub = front ? I18n.t("app.rowsub.encyclopedia") : zimLabel(zim);
      $('#wtitle').textContent = nt; if ($('#wopen')) $('#wopen').href = loc; setTitle(nt, '', zimLabel(zim));
      f.lbName = !front && own ? { nt, at: own.getBoundingClientRect().bottom + fw.scrollY } : null; barName();
      $('#wsave').innerHTML = saveButton({ key: 'w:' + p, title: nt, href: '#/wiki/' + p, sub });
      fit();
      if (p !== shown) { shown = p; history.replaceState(null, '', '#/wiki/' + p + (from ? '?from=' + encodeURIComponent(from) : '')); remember({ key: 'w:' + p, title: nt, href: '#/wiki/' + p, sub }) }
    } catch { }
  });
}
// The address an encyclopedia's bare address leads to (a redirect from the server, a refresh page in the Mac app), asked once
const ZMAIN = {};
const zimMain = zim => ZMAIN[zim] || (ZMAIN[zim] = fetch('/zim/' + encodeURIComponent(zim) + '/').then(async r => {
  let u = r.redirected ? r.url : '';
  if (!u) { const m = /http-equiv=["']?refresh["']?[^>]*url=([^"'>]+)/i.exec(await r.text()); if (m) u = new URL(m[1].replace(/&amp;/g, '&').trim(), r.url).href }
  return u ? decodeURIComponent(new URL(u).pathname) : '';
}).catch(() => ''));
// A table wider than the column scrolls sideways inside its own box (.lb-wide, styled by engine/saved_pages.py), so the article never does.
// The box goes around the table, which keeps its table layout: a table made a scrolling block itself turns its width into a fixed one.
// The box fades at an edge with more to scroll to. A list in a table cell is indented when its bullets would fall outside the cell's edge.
// Only with the server's article look, which carries the box's style; an older server's page stays as it came.
function tidyArticle(fd) {
  const fw = fd.defaultView, root = fd.querySelector('.mw-parser-output') || fd.body;
  if (!root || !fd.getElementById('lb-article') || fd.documentElement.dataset.lbTidy) return;
  fd.documentElement.dataset.lbTidy = '-';   // first, so the tables are measured as they will show (the look then undoes the skin's narrow-page blocks)
  const scrolls = e => { for (let a = e.parentElement; a && a !== root; a = a.parentElement) if (fw.getComputedStyle(a).overflowX !== 'visible') return true; return false };
  const boxes = [];
  // A box beside a float would shrink to the room left there (it scrolls, so nothing holds it open), where the table itself would go below
  // the float: the box is held at least as wide as the table can be made, up to the column. A float wider than the column would hang out on
  // the left, where a box cannot scroll to: in its box it is not floated.
  const wrap = (t, cs) => {
    const box = fd.createElement('div'); box.className = 'lb-wide';
    box.style.margin = `${cs.marginTop} 0 ${cs.marginBottom}`;   // the space above and below, which inside the box would no longer meet its neighbours'
    if (cs.clear !== 'none') box.style.clear = cs.clear;
    t.before(box); box.append(t);
    t.style.setProperty('margin-top', '0', 'important'); t.style.setProperty('margin-bottom', '0', 'important');
    if (cs.float !== 'none') { t.style.setProperty('float', 'none', 'important'); t.style.setProperty('margin-left', '0', 'important'); t.style.setProperty('margin-right', '0', 'important') }
    box.style.width = 'min-content'; const least = box.offsetWidth; box.style.width = '';
    box.style.minWidth = `min(100%, ${least}px)`;
    boxes.push(box); return box;
  };
  for (const t of root.querySelectorAll('table')) {
    if (t.parentElement.closest('table,.lb-wide') || scrolls(t)) continue;   // inside another table, or a box that scrolls already (a navbox)
    const cs = fw.getComputedStyle(t);
    if (cs.position === 'absolute' || cs.position === 'fixed' || (cs.float !== 'none' && t.offsetWidth <= root.clientWidth)) continue;   // a floated box that fits (an infobox) stays beside the text
    wrap(t, cs);
  }
  // Anything else still wider than the column (a bar chart, a box of fixed width, a group set inline) gets a box too, now and after a resize.
  const de = fd.documentElement;
  const rest = () => {
    if (de.scrollWidth <= de.clientWidth + 1) return;
    const cw = root.getBoundingClientRect(), out = e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > cw.right + 1 || r.left < cw.left - 1) };
    const found = [];
    for (const e of root.querySelectorAll('*')) {
      if (!out(e) || e.closest('.lb-wide') || found.some(f => f.contains(e))) continue;
      const p = e.parentElement; if (p !== root && out(p) && !scrolls(e)) continue;   // its parent is the one to box
      if (scrolls(e) || /^(TD|TH|TR|TBODY|THEAD|CAPTION|LI|SPAN|A|B|I|SUP|SUB)$/.test(e.tagName)) continue;
      const cs = fw.getComputedStyle(e); if (cs.position === 'absolute' || cs.position === 'fixed') continue;
      found.push(e);
    }
    found.forEach(e => { const b = wrap(e, fw.getComputedStyle(e)); edge(b); ro.observe(b) });
  };
  for (const li of root.querySelectorAll('table li')) {
    const s = fw.getComputedStyle(li), list = li.parentElement;
    if (s.display !== 'list-item' || s.listStyleType === 'none' || s.listStylePosition !== 'outside' || list.dataset.lbIn) continue;
    const r = li.getBoundingClientRect(), cell = li.closest('td,th'), c = cell ? cell.getBoundingClientRect() : r, m = parseFloat(s.fontSize) * 1.4;
    const rtl = s.direction === 'rtl', room = rtl ? c.right - r.right : r.left - c.left;
    if (room < m) { list.dataset.lbIn = 1; list.style.setProperty(rtl ? 'margin-right' : 'margin-left', `calc(${fw.getComputedStyle(list)[rtl ? 'marginRight' : 'marginLeft']} + ${Math.ceil(m - room)}px)`) }
  }
  const edge = b => {
    const more = b.scrollWidth - b.clientWidth, s = Math.abs(b.scrollLeft), rtl = fw.getComputedStyle(b).direction === 'rtl';
    b.classList.toggle(rtl ? 'lb-l' : 'lb-r', more > 1 && s < more - 1); b.classList.toggle(rtl ? 'lb-r' : 'lb-l', more > 1 && s > 1);
  };
  const ro = new fw.ResizeObserver(es => es.forEach(e => edge(e.target.closest('.lb-wide'))));
  boxes.forEach(b => { edge(b); ro.observe(b); ro.observe(b.firstElementChild) });   // as a box scrolls, wiki() calls edge (it reads the scroll, see there)
  // What is left of the web page's machinery, which reads as a broken page offline: editing links where the link itself was taken out
  // ('(edit it)', '[edit on Wikidata]'), a template's styles error, a chart's source where the chart would be, an empty paragraph
  // holding only a line break (a gap under the title), and a note's mark written out as its counter ('[lower-alpha 1]' for '[a]').
  const tw = fd.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => /edit|<graph|content model|-alpha|-roman/i.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
  const gone = [], ab = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(97 + (n - 1) % 26) + s; return s };
  for (let n; (n = tw.nextNode());) {
    const e = n.parentElement; if (!e || e === root) continue;
    const t = e.textContent.trim();
    if (/^[[(]\s*edit(\s+it|\s+on\s+wikidata)?\s*[\])]$/i.test(t) || (e.matches('.error') && /must have content model/.test(t))) gone.push(e);
    else if (/^<graph>[\s\S]*<\/graph>$/.test(t)) gone.push(e);
    else if (/<graph>[\s\S]*?<\/graph>/.test(n.data)) n.data = n.data.replace(/<graph>[\s\S]*?<\/graph>/g, '');
    else if (e.closest('sup.reference')) { const m = /^(lower|upper)-(alpha|roman) (\d+)$/.exec(n.data.trim()); if (m) { const k = +m[3], s = m[2] === 'alpha' ? ab(k - 1) : roman(k); n.data = m[1] === 'upper' ? s.toUpperCase() : s } }
  }
  for (const p of root.querySelectorAll('p')) if (!p.textContent.trim() && !p.querySelector('img,svg,video,audio,iframe,input,math,object')) gone.push(p);
  gone.forEach(e => e.style.setProperty('display', 'none', 'important'));
  rest(); let rt = 0; new fw.ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(rest, 200) }).observe(root);
  fd.documentElement.dataset.lbTidy = boxes.length;
  return { boxes, edge };   // boxes: also those rest() adds later
}
const roman = n => { let s = ''; for (const [v, r] of [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]) for (; n >= v; n -= v) s += r; return s };
// The article's stylesheet (engine/saved_pages.py) reads these: the window's text colours and its accent, which only this page knows
// (the system accent in the apps, Lastbook green in a browser).
function lookOf(fd) {
  const cs = getComputedStyle(html), r = fd.documentElement.style;
  const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; probe.hidden = true; document.body.append(probe);
  r.setProperty('--lb-link', getComputedStyle(probe).color); probe.remove();
  for (const [k, v] of [['--lb-ink', '--ink'], ['--lb-ink2', '--ink2'], ['--lb-line', '--line2'], ['--lb-font', '--font'], ['--lb-display', '--display']]) { const x = cs.getPropertyValue(v).trim(); if (x) r.setProperty(k, x) }
}
const ZIMS = [['mdwiki_en_all_maxi_2025-11.zim', I18n.t("app.zims.medical_encyclopedia"), I18n.t("app.zims.mdwiki_plain_language_articles_on_conditions"), 'health'],
['wikibooks_en_all_maxi_2026-04.zim', 'Wikibooks', I18n.t("app.zims.open_textbooks_and_how_to_manuals"), 'book'],
['appropedia_en_all_maxi_2026-02.zim', 'Appropedia', I18n.t("app.zims.appropriate_technology_water_sanitation_energy_and"), 'repair'],
['wikipedia_en_all_nopic_2026-06.zim', 'Wikipedia', I18n.t("app.zims.the_full_english_encyclopedia_text_only"), 'wiki']];
const zimsHere = async () => { const here = (await libInfo()).zims; return here ? ZIMS.filter(z => here.includes(z[0])) : ZIMS };
async function encyclopedias(q) {
  setTitle(I18n.t("common.encyclopedias"));
  const zims = await zimsHere();
  if (!zims.length) { main.innerHTML = `<h1>${I18n.t("common.encyclopedias")}</h1><p class="lead">${I18n.t("app.encyclopedias.this_download_has_no_encyclopedias")}</p>`; return }
  main.innerHTML = `<h1>${I18n.t("common.encyclopedias")}</h1><p class="lead">${['', I18n.t("app.encyclopedias.one_complete_encyclopedia"), I18n.t("app.encyclopedias.two_complete_encyclopedias"), I18n.t("app.encyclopedias.three_complete_encyclopedias"), I18n.t("app.encyclopedias.four_complete_encyclopedias")][zims.length]}. Community-written: good for background — use the guides’ manuals for safety-critical steps.</p>
  <div style="margin:16px 0">${searchBox('zq', q, I18n.t("app.encyclopedias.e_g_tetanus_solar_panel_sourdough"))}</div><div id="zres"></div>
  ${secHead(I18n.t("app.encyclopedias.open_one"))}<div class="cards2">${zims.map(z => `<a class="card" href="#/wiki/${z[0]}/?from=${encodeURIComponent('#/encyclopedias')}"><span class="ico">${ico(z[3])}</span><b>${esc(z[1])}</b><small>${esc(z[2])}</small></a>`).join('')}</div>`;
  $('#zqF').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/encyclopedias?q=' + encodeURIComponent($('#zq').value.trim()) });
  if (q) zimResults(q, $('#zres'), 40);
}
// heading: part of a wider search, shown under that heading only when something matched. Answers whether anything did.
async function zimResults(q, el, max = 8, heading = '') {
  el.innerHTML = heading ? '' : `<p class="loading">${I18n.t("app.zimresults.searching_the_encyclopedias")}</p>`;
  try {
    const hits = await api('/api/collection-search?q=' + encodeURIComponent(q));
    if (!hits.length) { el.innerHTML = heading ? '' : `<div class="empty"><span class="e-ico">${ico('wiki')}</span><b>${I18n.t("app.zimresults.no_articles_found")}</b><p>${I18n.t("app.zimresults.try_another_word_for_the_same")}</p></div>`; return false }
    const ord = ['mdwiki', 'wikibooks', 'appropedia', 'wikipedia'];
    hits.sort((a, b) => ord.findIndex(k => a.collection.startsWith(k)) - ord.findIndex(k => b.collection.startsWith(k)));
    el.innerHTML = `${heading ? `<h2>${heading}</h2>` : ''}<ul class="list">${hits.slice(0, max).map(h => `<li><a class="row" href="#/wiki/${esc(h.path.replace(/^zim\//, ''))}?${fromQ()}"><span class="k">${ico('wiki')}</span><span><b>${esc(h.title)}</b><small>${esc(zimLabel(h.collection))}</small></span></a></li>`).join('')}</ul>`;
    return true;
  } catch (e) { el.innerHTML = heading ? '' : `<p class="muted">${I18n.t("app.zimresults.encyclopedia_search_isn_t_available_right")}${esc(e.message)}).</p>`; return false }
}

/* ------------------------------------------------------------- search -- */
const QSTOP = new Set('a an and are can do does for from get got have how i if in is it its me my need no not of on or our so that the this to was we what when where which who why will with without you your won don can t s'.split(' '));
// Words are split, folded and matched by web/words.js (loaded first), so accents, Chinese and other scripts work.
function topicMatches(q) {
  return typeof SearchWords === 'undefined' ? [] : SearchWords.rankTopics(q, TOPICS, QSTOP);
}
let searchSeq = 0;
async function searchPage(q, kind) {
  setTitle(q ? I18n.t("app.searchpage.search") + " " + q : I18n.t("common.search"));
  const kinds = [['all', I18n.t("common.everything")], ['read', I18n.t("app.kinds.manuals_pages")], ['video', I18n.t("nav.videos")], ['wiki', I18n.t("common.encyclopedias")]];
  main.innerHTML = `<h1>${q ? I18n.t("common.results") : I18n.t("common.search")}</h1>
  ${searchBox('searchQ', q, I18n.t("app.searchpage.describe_it_in_everyday_words"))}
  <div class="chips" role="group" aria-label="${I18n.t("common.show")}" style="margin-top:12px" id="kinds">${kinds.map(([k, l]) => `<a class="chip ${k === kind ? 'on' : ''}" aria-pressed="${k === kind}" data-kind="${k}" href="#/search?q=${encodeURIComponent(q)}&kind=${k}">${l}</a>`).join('')}</div>
  <div id="sask"></div><div id="sout"></div>`;
  const input = $('#searchQ');
  $('#searchQF').addEventListener('submit', e => { e.preventDefault(); input.blur(); go(input.value.trim(), true) });
  let tmr;
  input.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => go(input.value.trim(), false), 350) });
  // as-you-type: update results and the address; a new search is one new history entry, not one per keystroke
  let fresh = true;   // the next change starts a new entry
  function go(nq, commit) {
    const h = '#/search?q=' + encodeURIComponent(nq) + (kind !== 'all' ? '&kind=' + kind : '');
    if (nq === q) { if (commit) fresh = true; return }
    if (fresh) pushHere(h); else history.replaceState(null, '', h);
    fresh = !!commit; q = nq; if (input.value !== nq) input.value = nq;
    $$('#kinds a').forEach(a => a.href = `#/search?q=${encodeURIComponent(nq)}&kind=${a.dataset.kind}`);
    askOffer(nq); results(nq, kind);
  }
  searchLive = (nq, commit, typing) => { clearTimeout(tmr); if (typing) tmr = setTimeout(() => go(nq, false), 350); else go(nq, commit) };
  setTimeout(() => { $('#topQ').value = q }, 0);   // after the router clears it: on Windows the pane's field is this page's field
  askOffer(q); results(q, kind);
  if (!q) setTimeout(() => findBox().focus(), 50);
}
function askOffer(q) {
  const el = $('#sask'); if (!el) return;
  el.innerHTML = q && q.split(/\s+/).length >= 2 ? `<a class="ghit" href="#/ask?q=${encodeURIComponent(q)}" style="--tc:var(--accent)"><span class="ico">${ico('ask')}</span><span><b>${I18n.t("app.askoffer.ask_the_library")}${esc(q)}”</b><small>${I18n.t("app.askoffer.get_a_written_answer_with_the")}</small></span></a>` : '';
}
async function results(q, kind) {
  const seq = ++searchSeq, out = $('#sout');
  if (!q) {
    out.innerHTML = `<p class="muted" style="margin-top:18px">${I18n.t("app.results.use_the_words_you_d_use")}</p><div class="chips wrapchips">${[I18n.t("app.results.clean_drinking_water"), I18n.t("app.results.broken_leg"), I18n.t("app.results.carbon_monoxide"), I18n.t("app.results.keep_food_cold"), I18n.t("app.results.ham_radio_license"), I18n.t("app.results.plant_potatoes"), I18n.t("app.results.sharpen_a_knife"), I18n.t("app.results.diarrhea_in_a_child")].map(x => `<a class="chip" href="#/search?q=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>`;
    return;
  }
  const g = kind === 'all' ? topicMatches(q) : [];
  out.innerHTML = `${g.length ? `<h2>${I18n.t("app.results.start_with_a_guide")}</h2>${g.map(({ t, c }) => `<a class="ghit" href="#/t/${t.id}${c ? '/' + c.id : ''}" ${tcStyle(t.id)}><span class="ico">${ico(t.id)}</span><span><b>${esc(SHORT[t.id] || t.title)}${c ? ' — ' + esc(c.label) : ''}</b><small>${I18n.t("app.results.picked_pages_with_exact_page_numbers")}</small></span></a>`).join('')}` : ''}
    <div id="spass"></div><div id="svid"></div><div id="sres"></div><div id="szim"></div>`;
  if (kind === 'wiki') return zimResults(q, $('#szim'), 40);
  // Each part answers whether it found anything; "nothing matched" shows once, only when none did.
  const parts = kind === 'all' || kind === 'read' ? [passages(q, seq)] : [];
  const reqs = [api('/api/find?q=' + encodeURIComponent(q) + '&kind=' + (kind === 'video' ? 'video' : 'read'))];
  if (kind === 'all') reqs.push(api('/api/find?q=' + encodeURIComponent(q) + '&kind=video').catch(() => null));
  $('#sres').innerHTML = `<p class="loading">${I18n.t("app.results.searching")}</p>`;
  const found = (async () => {
    try {
      const [d, vd] = await Promise.all(reqs);
      if (seq !== searchSeq) return true;
      const vids = (kind === 'video' ? d : vd)?.results || [];
      if (kind === 'video') { $('#sres').innerHTML = vids.length ? `<div class="vgrid" style="margin-top:14px">${vids.map(r => vcard(r)).join('')}</div>` : ''; return vids.length > 0 }
      if (vids.length) { $('#svid').innerHTML = secHead(I18n.t("nav.videos"), '', `<a href="#/search?q=${encodeURIComponent(q)}&kind=video">${I18n.t("app.videoshome.see_all")}</a>`) + rail(vids.slice(0, 10).map(r => vcard(r)).join('')); wireRails($('#svid')) }
      $('#sres').innerHTML = d.results.length ? `<h2>${I18n.t("app.found.in_the_manuals_and_saved_pages")}</h2>
        ${d.expanded.length ? `<p class="small muted">${I18n.t("app.found.also_looked_for")} ${d.expanded.slice(0, 10).map(esc).join(', ')}${d.mode === I18n.t("app.found.some_words") ? " " + I18n.t("app.found.showing_pages_with_some_of_your") : ''}</p>` : ''}
        <div class="results">${d.results.map(resultCard).join('')}</div>` : '';
      return d.results.length + vids.length > 0;
    } catch (e) { if (seq === searchSeq) $('#sres').innerHTML = errorBox(e, I18n.t("app.found.search_isn_t_responding")) + `<p class="small muted">${I18n.t("app.found.the_library_may_be_busy_rebuilding")}</p>`; return true }
  })();
  parts.push(found);
  if (kind === 'all') parts.push(found.then(() => seq === searchSeq && zimResults(q, $('#szim'), 6, I18n.t("app.results.in_the_encyclopedias"))));
  const any = (await Promise.all(parts)).some(Boolean);
  if (seq === searchSeq && !g.length && !any) $('#sres').innerHTML = emptySearch(q);
}
// Most relevant pages from the shared keyword + meaning-based retriever (the same one the assistant uses).
async function passages(q, seq) {
  try {
    const d = await api('/api/retrieve?q=' + encodeURIComponent(q) + '&k=6&kind=manual');
    if (seq !== searchSeq || !d.results.length || !$('#spass')) return false;
    $('#spass').innerHTML = secHead(I18n.t("app.passages.most_relevant_pages"), d.semantic && !d.semantic.chunks ? I18n.t("app.passages.matched_by_your_words") : I18n.t("app.passages.matched_by_meaning_as_well_as")) + `<div class="rcards">${d.results.map(r => rcard({ src: { id: r.doc_id, kind: r.kind, title: r.title, publisher: r.publisher, year: r.year, pages: r.pages, trust: r.trust }, page: r.page, label: r.title, note: (r.excerpt || '').slice(0, 220) + '…' })).join('')}</div>`;
    return true;
  } catch { return false }
}
const emptySearch = q => `<div class="empty"><span class="e-ico">${ico('search')}</span><b>${I18n.t("app.emptysearch.no_results_for")}${esc(q)}”</b><p>${I18n.t("app.emptysearch.try_fewer_words_or_another_word")}</p></div>`;
function resultCard(r) {
  const base = { src: r };
  return `<article class="result"><h3><a href="${hrefFor({ ...base, page: r.hits[0] && r.hits[0].page })}">${esc(r.title)}</a></h3>
    <div class="rsrc">${srcText(r)} · ${esc(I18n.label(r.trust))}</div>
    ${r.hits.slice(0, 2).map(h => `<a class="hit" href="${hrefFor({ ...base, page: h.page })}">${h.page ? `<b>${I18n.t("common.page")} ${h.page}:</b> ` : ''}${h.snippet}</a>`).join('')}</article>`;
}

/* ------------------------------------------------------------ library -- */
async function library() {
  setTitle(I18n.t("nav.library"));
  const saved = store.get('saved', []).length, chats = (window.Chat ? Chat.count() : 0);
  const zims = await zimsHere();
  main.innerHTML = `<h1>${I18n.t("nav.library")}</h1><p class="lead">${I18n.t("app.library.your_saved_things_learning_routes_encyclopedias")}</p>
  <div class="cards2 three" style="margin-top:16px">
    <a class="card" href="#/saved"><span class="ico">${ico('save')}</span><b>${I18n.t("common.saved")}</b><small>${saved ? saved + " " + I18n.t("app.library.saved_item") + (saved > 1 ? 's' : '') : I18n.t("app.library.pages_videos_and_answers_you_keep")} ${I18n.t("app.library.on_this_device")}</small></a>
    <a class="card" href="#/ask"><span class="ico">${ico('ask')}</span><b>${I18n.t("common.chats")}</b><small>${chats ? chats + " " + I18n.t("app.library.saved_conversation") + (chats > 1 ? 's' : '') : I18n.t("app.library.ask_the_library_a_question")}</small></a>
    <a class="card" href="#/prepare"><span class="ico">${ico('prep')}</span><b>${I18n.t("app.library.prepare_your_household")}</b><small>${I18n.t("app.library.getting_ready_readings_from_every_guide")}</small></a>
  </div>
  ${secHead(I18n.t("app.home.learn_a_skill"), I18n.t("app.library.step_by_step_routes_that_start"))}
  <div class="needs">${learnTopics().map(t => `<a class="need" href="#/t/${t.id}" ${tcStyle(t.id)}><span class="ico">${ico(t.id)}</span><b>${esc(SHORT[t.id] || t.title)}</b><small>${esc(t.short || '')} · ${(t.route || []).length} ${I18n.t("app.home.steps")}</small></a>`).join('')}</div>
  ${zims.length ? secHead(I18n.t("common.encyclopedias"), I18n.t("app.library.complete_offline_copies"), `<a href="#/encyclopedias">${I18n.t("app.library.search_them")}</a>`) + `<div class="cards2">${zims.map(z => `<a class="card" href="#/wiki/${z[0]}/?from=${encodeURIComponent('#/library')}"><span class="ico">${ico(z[3])}</span><b>${esc(z[1])}</b><small>${esc(z[2])}</small></a>`).join('')}</div>` : ''}
  ${secHead(I18n.t("app.library.browse_by_subject"), I18n.t("app.library.every_manual_saved_web_page_and"))}<div id="shelves"><p class="loading">${I18n.t("common.loading")}</p></div>
  <p style="margin-top:20px"><a href="#/about">${I18n.t("app.library.about_this_library_and_its_sources")}</a>${IN_WINDOW ? ` · <a href="/ui/setup.html#manage">${I18n.t("app.library.library_and_local_ai")}</a>` : ''}</p>`;
  try {
    const sh = await api('/api/shelves');
    $('#shelves').innerHTML = sh.filter(s => s.read + s.video).map(s => `<a class="shelfrow" href="#/shelf/${s.id}"><span><b>${esc(s.title)}</b><small>${s.read ? s.read.toLocaleString(I18n.french ? 'fr-FR' : undefined) + " " + I18n.t("app.library.to_read") : ''}${s.read && s.video ? ' · ' : ''}${s.video ? s.video.toLocaleString(I18n.french ? 'fr-FR' : undefined) + " " + I18n.t("common.videos_word") : ''}</small></span>${ico('right')}</a>`).join('');
  } catch (e) { $('#shelves').innerHTML = errorBox(e) }
}
async function prepareHub() {
  setTitle(I18n.t("app.library.prepare_your_household"));
  const list = nowTopics().filter(t => (t.prepare || []).length);
  main.innerHTML = `<h1>${I18n.t("app.library.prepare_your_household")}</h1>
  <p class="lead">${I18n.t("app.preparehub.readings_for_getting_ready_before_water")}</p>
  <div class="notice">${I18n.t("app.preparehub.a_shopping_list_or_cart_isn")}</div>
  ${list.map(t => `<details class="more" ${tcStyle(t.id)}><summary><span class="prep-ico">${ico(t.id)}</span><span>${esc(SHORT[t.id] || t.title)} <span class="n">· ${t.prepare.length}</span></span></summary><div class="body"><ul class="list">${t.prepare.map(i => rowItem({ ...i, preview: true })).join('')}</ul><p><a href="#/t/${t.id}">${I18n.t("app.preparehub.open_the_full_guide")}</a></p></div></details>`).join('')}`;
}
async function shelfPage(id, kind, q) {
  const sh = (await api('/api/shelves')).find(s => s.id === id);
  if (!sh) return notFound();
  setTitle(sh.title);
  main.innerHTML = `${backButton('#/library', I18n.t("nav.library"))}${crumbs([[I18n.t("nav.library"), '#/library'], [sh.title]])}<h1>${esc(sh.title)}</h1>
  <div style="margin:14px 0 10px">${searchBox('shq', q, I18n.t("app.shelfpage.filter_by_title_or_publisher"), I18n.t("common.filter"))}</div>
  <div class="chips">${[['all', I18n.t("common.everything")], ['read', I18n.t("app.shelfpage.to_read")], ['video', I18n.t("nav.videos")]].map(([k, l]) => `<a class="chip ${k === kind ? 'on' : ''}" href="#/shelf/${id}?kind=${k}&q=${encodeURIComponent(q)}">${l}</a>`).join('')}</div><div id="shres"><p class="loading">${I18n.t("common.loading")}</p></div>`;
  $('#shqF').addEventListener('submit', e => { e.preventDefault(); location.hash = `#/shelf/${id}?kind=${kind}&q=` + encodeURIComponent($('#shq').value.trim()) });
  let off = 0;
  const load = async () => {
    const d = await api(`/api/shelf/${id}?kind=${kind}&q=${encodeURIComponent(q)}&offset=${off}`);
    const html = d.collections.map(c => `<section class="collection"><h3>${esc(c.collection)}</h3><div class="small muted">${esc(c.trust)} · ${c.count} ${I18n.t("common.item_word")}${c.count > 1 ? 's' : ''}</div><ul class="list">${c.items.map(r => rowItem({ src: r })).join('')}</ul>${c.count > c.items.length ? `<a class="btn ghost" href="#/collection?name=${encodeURIComponent(c.collection)}&${fromQ()}">${I18n.t("app.videoshome.see_all")} ${c.count}</a>` : ''}</section>`).join('');
    if (!off) $('#shres').innerHTML = d.collections.length ? '' : `<div class="empty">${I18n.t("app.load.nothing_here_matches_try_another_word")}</div>`;
    $('#shres').insertAdjacentHTML('beforeend', html);
    $('#moreb')?.remove();
    if (d.more) { $('#shres').insertAdjacentHTML('beforeend', `<p><button class="btn plain" id="moreb">${I18n.t("app.load.show_more")}</button></p>`); $('#moreb').onclick = () => { off += 40; load() } }
  };
  await load();
}
async function collectionPage(name, from) {
  setTitle(name);
  main.innerHTML = `<div>${backButton(from, I18n.t("nav.library"))}</div><h1 style="margin-top:12px">${esc(name)}</h1><ul class="list collection" id="cl"></ul><div id="cm"></div>`;
  let off = 0;
  const load = async () => {
    const d = await api('/api/collection?name=' + encodeURIComponent(name) + '&offset=' + off);
    $('#cl').insertAdjacentHTML('beforeend', d.items.map(r => rowItem({ src: r })).join(''));
    $('#cm').innerHTML = d.more ? `<button class="btn plain" id="cmb">${I18n.t("app.load.show_more")}</button>` : '';
    if (d.more) $('#cmb').onclick = () => { off += 60; load() };
  };
  await load();
}

/* -------------------------------------------------------------- saved -- */
async function savedPage() {
  setTitle(I18n.t("common.saved"));
  const s = store.get('saved', []), r = await recents();
  const li = x => `<li><a class="row" href="${esc(x.href)}"><span class="k">${ico(x.key[0] === 'v' ? 'video' : x.key[0] === 'w' ? 'wiki' : x.key[0] === 't' ? 'book' : x.key[0] === 'a' ? 'ask' : 'page')}</span><span><b>${esc(x.title)}</b><small>${esc(rowSub(x))}</small></span></a></li>`;
  const cont = await resumable();
  main.innerHTML = `<h1>${I18n.t("common.saved")}</h1><p class="lead">${I18n.t("app.savedpage.kept_on_this_device_only")}</p>
  ${s.length ? `<div class="collection" style="margin-top:18px"><ul class="list">${s.map(li).join('')}</ul></div>` : `<div class="empty"><span class="e-ico">${ico('save')}</span><b>${I18n.t("app.savedpage.nothing_saved_yet")}</b><p>${I18n.t("app.savedpage.choose_save_on_any_page_video")}</p></div>`}
  ${cont.length ? secHead(I18n.t("videos.resume.title")) + rail(cont.map(([id, v]) => vcard({ id, title: v.title, thumb: v.thumb, duration: v.d }, { sub: I18n.t("app.continueitems.resume_at") + " " + clock(v.t) })).join('')) : ''}
  ${secHead(I18n.t("app.savedpage.recently_opened"))}${r.length ? `<div class="collection"><ul class="list">${r.map(li).join('')}</ul></div><p><button class="btn plain" id="clr">${I18n.t("app.savedpage.clear_recent_list")}</button></p>` : `<div class="empty"><p>${I18n.t("app.savedpage.pages_you_open_will_appear_here")}</p></div>`}`;
  const c = $('#clr'); if (c) c.onclick = () => { store.set('recent', []); savedPage() };
}

/* -------------------------------------------------------------- about -- */
// What the assistant cannot read, as a sentence: counts of none are left out, and one is one
const many = (n, one, more) => `${n.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${n === 1 ? one : more}`;
function blind(c) {
  if (!c) return '';
  const nv = c.videos - c.videos_with_text, parts = [];
  if (nv) parts.push(I18n.t('about.coverage.videos', { missing: I18n.number(nv), total: I18n.number(c.videos), kind: c.videos === 1 ? 'video' : 'videos', verb: nv === 1 ? 'has' : 'have' }));
  if (c.pdfs_image_only) parts.push(`${many(c.pdfs_image_only, I18n.t("app.blind.pdf_is_a_scan"), I18n.t("app.blind.pdfs_are_scans"))} ${I18n.t("app.blind.without_text")}`);
  if (c.docs_without_text) parts.push(`${many(c.docs_without_text, I18n.t('about.coverage.documents'), I18n.t('about.coverage.documents_plural'))} ${I18n.t("app.blind.gave_no_readable_text_when_indexed")}`);
  if (!parts.length) return '';
  const t = parts.length > 1 ? parts.slice(0, -1).join(', ') + I18n.t('setup.selection.join') + parts[parts.length - 1] : parts[0];
  return t[0].toUpperCase() + t.slice(1) + '. ';
}
// The optional local AI in the desktop app: what it is, where it runs, and its controls. '' in the server version.
function localAbout(st) {
  const l = st.local; if (!l) return '';
  const gb = n => I18n.fixed(n / 1e9, 1) + " " + I18n.t("common.gb");
  const where = (l.placement || []).filter(p => p.bytes > 2e8).map(p => `${gb(p.bytes)} ${I18n.t("common.on_word")} ${esc(p.device)}`).join(', ');
  const line = { ready: I18n.t("app.line.running_now"), stopped: I18n.t("app.line.ready_it_starts_when_you_ask"), loading: I18n.t('about.ai.starting') }[l.state];
  const btn = (a, t) => `<button class="btn plain" onclick="localAI('${a}')">${t}</button>`;
  return line ? `${I18n.t("app.localabout.local_ai")} ${esc(l.name)}, ${line}.${where ? ` ${I18n.t("app.localabout.it_uses")} ${where}.` : ''} ${I18n.t("app.localabout.it_reads_text_only")}
      <span class="row">${l.state === 'ready' ? btn('stop', I18n.t("app.localabout.stop_it_now")) : ''}${btn('off', I18n.t("app.localabout.turn_off"))}</span>`
    : l.state === 'off' ? `${I18n.t("app.localabout.the_local_ai_is_turned_off")} ${btn('on', I18n.t("app.localabout.turn_on"))}`
    : `${I18n.t("app.localabout.local_ai")} ${esc(l.message ? I18n.error(l.message) : { absent: I18n.t("app.localabout.not_added_add_it_in_library"), checking: I18n.t("app.localabout.checking_the_file"), measuring: I18n.t("app.localabout.checking_this_computer_s_memory") }[l.state] || I18n.label(l.state))} ${l.state === 'absent' ? `<a class="btn plain" href="/ui/setup.html#manage">${I18n.t("app.localabout.add_the_local_ai")}</a>` : ''}${btn('rescan', I18n.t("app.localabout.look_again"))}`;
}
async function localAI(action) {
  try { await fetch('/api/assistant/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }) } catch { }
  setTimeout(() => { if (location.hash.startsWith('#/about')) route() }, 400);
}
async function about() {
  setTitle(I18n.t("about.title"));
  let dl = {}, st = {};
  LIB = null;   // About shows the counts as they are now
  const s = await libInfo();
  const oldServer = s.zims === undefined;   // it still serves the reports; this code does not
  try { dl = await api('/api/download-status') } catch { }
  try { st = await fetch('/api/assistant/status').then(r => r.json()) } catch { }   // not api(): this answer names an error when no model is running, and still holds what is wanted
  const ch = dl.channels && dl.channels.counts, ix = st.index || {};
  main.innerHTML = `<h1>${I18n.t("about.title")}</h1>
  <p class="lead">${I18n.t("about.intro")}</p>
  <div class="cards2" style="margin-top:16px">
   <div class="card"><b>${I18n.t("about.contents.title")}</b><small>${(s.pdfs || 0).toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.pdf_manuals")}${(s.pdf_pages || 0).toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.pages")} ${(s.web_pages || 0).toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.saved_web_pages")} ${(s.videos || 0).toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.downloaded_videos_and")} ${s.collections || 0} ${I18n.t("app.about.complete_encyclopedias")}</small></div>
   ${ch ? `<div class="card"><b>${I18n.t("app.about.still_arriving")}</b><small>${ch.pending.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.more_videos_are_queued_and")} ${ch.downloading} ${I18n.t("app.about.downloading_queued_videos_are_not_in")}</small></div>` : ''}
   <div class="card"><b>${I18n.t("common.assistant")}</b><small>${localAbout(st) || (st.online ? `${I18n.t("app.about.local_model")} ${esc(st.model)} ${I18n.t("app.about.available")}` : I18n.t("app.about.no_local_model_is_running_so"))} ${ix.chunks ? `${I18n.t("app.about.meaning_based_index")} ${ix.chunks.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.passages_from")} ${ix.docs.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("common.documents_word")}${ix.pending ? `, ${ix.pending.toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("app.about.still_to_index")}` : ''}.` : ''}</small></div>
   <div class="card"><b>${I18n.t("about.coverage.title")}</b><small>${blind(st.coverage)}${I18n.t("app.about.it_also_can_t_see_pictures")}${st.vision === false ? '' : " " + I18n.t("common.and_page_images_when_it_asks_to")} ${I18n.t("app.about.and_says_when_it_finds_nothing")}${st.coverage && st.coverage.remote_videos ? ` ${st.coverage.remote_videos} ${I18n.t("app.about.videos_are_stored_on_a_remote")}` : ''}</small></div>
   ${IN_WINDOW && window.LBUpdate ? LBUpdate.card() : ''}
  </div>
  <h2>${I18n.t("about.sources.title")}</h2><ul>
   <li><b>${I18n.t("app.about.international_health_amp_humanitarian_guidance")}</b> ${I18n.t("app.about.who_red_cross_red_crescent_msf")}</li>
   <li><b>${I18n.t("app.about.hesperian_community_health_guide")}</b> ${I18n.t("app.about.where_there_is_no_doctor_and")}</li>
   <li><b>${I18n.t("app.about.government_guidance")}</b> ${I18n.t("app.about.fema_cdc_epa_usda_noaa_national")}</li>
   <li><b>${I18n.t("app.about.university_extension_service")}</b> ${I18n.t("app.about.e_g_national_center_for_home")}</li>
   <li><b>${I18n.t("app.about.manufacturer_manual")}</b> ${I18n.t("app.about.only_for_the_exact_model_named")}</li>
   <li><b>${I18n.t("app.about.community_written_encyclopedia")}</b> ${I18n.t("common.and_word")} <b>${I18n.t("app.about.hobbyist_video")}</b> ${I18n.t("app.about.background_check_anything_risky_against_a")}</li></ul>
  <h2>${I18n.t("about.limits.title")}</h2><ul>
   <li>${I18n.t("app.about.it_points_to_original_pages_the")}</li>
   <li>${I18n.t("app.about.nothing_here_replaces_trained_help_each")}</li>
   <li>${I18n.t("app.about.reading_and_watching_are_not_the")}</li>
   ${s.pack ? '' : `<li>${I18n.t("app.about.shopping_lists_and_carts_in_older")}</li>`}</ul>
  ${s.sources ? `<h2>${I18n.t("app.about.sources_and_credits")}</h2><p><a href="#/read/${encodeURIComponent(s.sources)}?${fromQ()}">${I18n.t("app.about.sources_and_permissions")}</a>${I18n.t("app.about.every_publisher_in_this_library_where")}</p>` : ''}
  ${IN_WINDOW ? '' : `<h2>${I18n.t("app.about.using_it_on_a_phone")}</h2><p>${I18n.t("app.about.phones_on_the_same_wi_fi")} <code>server.py --lan</code>${I18n.t('about.phone.access')}</p>`}
  ${oldServer ? `<h2>${I18n.t("app.about.other_ways_in")}</h2><p><a href="/reports/gap-closure-status.html" target="_blank">${I18n.t("app.about.gap_closure_report")}</a> · <a href="/reports/learning-pathways.html" target="_blank">${I18n.t("app.about.learning_pathways_report")}</a> · <a href="/reports/survival-tools-cart.html" target="_blank">${I18n.t("app.about.supplies_planning")}</a></p>` : ''}`;
  main.insertAdjacentHTML('beforeend', `<p><label for="uiLanguage">${I18n.t('about.language.label')}</label> <select id="uiLanguage"><option value="en"${I18n.language === 'en' ? ' selected' : ''}>${I18n.t('about.language.english')}</option><option value="fr"${I18n.language === 'fr' ? ' selected' : ''}>${I18n.t('about.language.french')}</option></select></p>`);
  $('#uiLanguage').onchange = e => I18n.choose(e.target.value);
  if (IN_WINDOW && window.LBUpdate) LBUpdate.mount(main);   // Check for updates (web/update.js): only when the person asks
}

route();
if ('serviceWorker' in navigator && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => { });
