'use strict';
/* Lastbook setup: choose a library and the local AI, then download, check, unpack and switch. The contract is docs/SETUP-API.md.
   Works on its own page in setup mode (no library, so none of /api/topics and the rest) and inside the app (Library → Library and local AI).
   Views: manage (what is here now), choose (what to get), job (progress, pause, errors), done. Plain fetch: in the app the bridge adds the key. */
(() => {
  const $ = s => document.querySelector(s);
  const main = $('#main'), live = $('#live');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WIN = document.documentElement.classList.contains('plat-win');
  const UNIT = WIN ? 1024 : 1000;   // each system's own way of counting a gigabyte, so the numbers match Finder or Explorer
  const CAN = { removeAi: true, repair: true };   // one switch each, should a build of the engine be without remove-ai or repair
  const MANAGE_ASKED = /manage/.test(location.hash);   // #manage: the bridge allows no ?query on the top page

  const ICO = {
    disk: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 15h.01M11 15h6"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    gpu: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="9" cy="12" r="3"/><path d="M15 10h3M15 14h3"/>',
    book: '<path d="M4 4v16M9 4v16M14 5l4 15M3 20h18"/>',
    ai: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9.5h6M9 12.5h4"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    retry: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  const ico = (k, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICO[k] || ''}</svg>`;

  /* ------------------------------------------------------------ numbers */
  function size(b) {
    if (b == null || !isFinite(b)) return '';
    const g = b / UNIT ** 3;
    if (g >= 100) return Math.round(g).toLocaleString(I18n.french ? 'fr-FR' : undefined) + " " + I18n.t("common.gb");
    if (g >= 1) return I18n.fixed(g, 1) + " " + I18n.t("common.gb");
    const m = b / UNIT ** 2;
    return (m >= 10 ? Math.round(m) : I18n.fixed(m, 1)) + " " + I18n.t("common.mb");
  }
  const ram = b => Math.round(b / 1024 ** 3) + " " + I18n.t("common.gb");   // memory is counted in binary by both systems
  const rate = bps => bps > 0 ? (bps / UNIT ** 2 >= 10 ? Math.round(bps / UNIT ** 2) : I18n.fixed(bps / UNIT ** 2, 1)) + " " + I18n.t("setup.rate.mb_s") : '';
  function eta(s) {
    if (s == null || !isFinite(s) || s < 0) return '';
    if (s < 60) return I18n.t("setup.eta.under_a_minute_left");
    const m = Math.round(s / 60);
    if (m < 60) return `${I18n.t("common.about_word")} ${m} ${I18n.t("setup.eta.min_left")}`;
    const h = Math.floor(m / 60), r = m % 60;
    return `${I18n.t("common.about_word")} ${h} h${r ? ` ${r} min` : ''} ${I18n.t("common.left_word")}`;
  }
  const home = p => String(p || '').replace(/^\/Users\/[^/]+/, '~').replace(/^[A-Z]:\\Users\\[^\\]+\\/i, '');   // ~/… on a Mac; Documents\… on Windows, as Explorer names it

  /* ------------------------------------------------------------ the engine */
  async function call(path, body) {
    const opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    let r; try { r = await fetch('/api/setup/' + path, opts) } catch { throw Object.assign(new Error(I18n.t("setup.call.lastbook_did_not_answer_close_it")), { status: 0 }) }
    let d = null; try { d = await r.json() } catch { }
    if (!r.ok && !(d && (d.error || d.need_bytes))) throw Object.assign(new Error(r.status === 404 ? I18n.t("setup.call.not_available") : I18n.t("setup.call.lastbook_sent_an_unreadable_reply")), { status: r.status });
    return d;
  }
  const errCode = e => e && (typeof e === 'object' ? e.code : null);
  const errText = e => e && (typeof e === 'object' ? e.message || e.error : e);

  /* ------------------------------------------------------------ state */
  let S = null;           // GET state
  let view = 'choose';
  let choice = { pack: null, ai: false, map: null };   // map: the selected state code
  let folder = '';
  let shortfall = null;   // the answer to a start that had no room: {need_bytes, free_bytes}
  let pollT = 0;
  let confirmCancel = false, confirmRemove = false, confirmOld = false;
  let note = '', noteOk = false;
  let repair = null;      // a repair under way: {fixed} turns true once it had to download something

  const packs = () => (S.manifest && S.manifest.packs) || [];
  const model = () => ((S.manifest && S.manifest.models) || [])[0] || null;
  const cur = () => S.current || null;
  const packById = id => packs().find(p => p.id === id);
  function packNeedsInstall(pack) {
    if (!pack) return false;
    const current = cur();
    if (!current || pack.id !== current.pack) return true;
    return Boolean(pack.revision && pack.revision !== current.content_revision);
  }

  /* state maps (docs/SETUP-API.md, State maps). The person picks the state; Lastbook never looks for where it is */
  const maps = () => ((S.manifest && S.manifest.maps) || []).slice().sort((a, b) => String(a.title).localeCompare(String(b.title)));   // by name, as people look for theirs
  const mapById = id => maps().find(m => m.id === id);
  const mapName = id => id === 'us' ? I18n.t("setup.mapname.the_whole_us") : (mapById(id) || {}).title || id;
  /* the detailed map the library will have once the chosen pack is in: the person's state map, or the one the pack carries */
  const PACK_MAP = { medium: 'CA', all: 'us' };   // what the packs carry today; a manifest packs[].map, when there, wins
  const packMap = id => { const p = packById(id) || {}; return 'map' in p ? p.map || null : PACK_MAP[id] || null };
  const mapNow = () => { const c = cur() || {}; return choice.pack && choice.pack !== c.pack ? packMap(choice.pack) : (c.map && c.map !== 'base' ? c.map : packMap(c.pack)) };
  const selectedState = () => choice.map || (mapNow() !== 'us' && mapNow()) || ((cur() || {}).address_indexes || [])[0] || '';
  const addresses = () => (S.manifest && S.manifest.address_indexes) || [];
  const addressById = id => addresses().find(a => a.id === id);
  const addressAdds = () => { const a = addressById(selectedState()); return a && a.available !== false && !((cur() || {}).address_indexes || []).includes(a.id) ? a : null };
  const mapMissing = () => !selectedState();
  const mapAdds = () => choice.map && choice.map !== mapNow() && mapNow() !== 'us' ? mapById(choice.map) : null;
  function packSummary(p) {
    const text = I18n.label(p.summary || '');
    if (p.id !== 'medium' || !maps().length) return text;
    // The manifest describes the archive's bundled map. Setup replaces it with the chosen state map.
    const state = selectedState();
    return text.replace(/\ba detailed map of California\b/, () => I18n.t("setup.packsummary.a_detailed_map_of") + " " + (state ? mapName(state) : I18n.t("setup.packsummary.your_state")));
  }
  const packDl = p => p.download_bytes || (p.files || []).reduce((n, f) => n + (f.size || 0), 0);
  const SEP = WIN ? '\\' : '/', DATA = 'LastbookData';
  const asData = p => /[\\/]LastbookData[\\/]?$/i.test(p) ? p.replace(/[\\/]$/, '') : String(p).replace(/[\\/]$/, '') + SEP + DATA;
  /* a file already on this computer, of the right size, for a pack or the model: setup uses it instead of downloading */
  const foundFor = (kind, id) => (S.found || []).find(f => f.kind === kind && (f.size_ok !== false) && (kind === 'model' || f.id === id || f.pack === id));
  const aiFits = () => !!(S.hardware && S.hardware.ai && S.hardware.ai.fits);

  function diskFor(path) {
    const ds = (S.hardware && S.hardware.disks) || [];
    const norm = s => WIN ? String(s).toLowerCase().replace(/\//g, '\\') : String(s);
    const p = norm(path);
    let best = null;
    for (const d of ds) if (p.startsWith(norm(d.path)) && (!best || d.path.length > best.path.length)) best = d;
    return best || (path ? null : ds[0] || null);   // a folder on a disk the engine did not report: its free space is not known here
  }
  const diskName = d => !d ? I18n.t("setup.diskname.this_disk") : d.name || (WIN ? (String(d.path).match(/^[A-Z]:/i) || [I18n.t("setup.diskname.this_disk")])[0].toUpperCase()   // C:, D:
    : /^\/Volumes\/[^/]+/.test(d.path) ? d.path.split('/')[2] : /Linux/.test(navigator.platform || '') ? I18n.t("setup.diskname.this_computer") : I18n.t("setup.diskname.this_mac"));

  function plan() {   // what the current choice adds: bytes to download, space it needs (download + unpacked + 2 GB, as the engine counts)
    const c = cur() || {};
    let dl = 0, need = 0;
    const p = packById(choice.pack);
    if (packNeedsInstall(p)) {
      const got = foundFor('pack', p.id);
      if (!got) dl += packDl(p);
      need += (got ? 0 : packDl(p)) + (p.installed_bytes || 0);
      if (p.id === c.pack) need += c.map_bytes || 0;
    }
    const m = model();
    if (choice.ai && m && !c.model && aiFits()) { const got = foundFor('model'); if (!got) { dl += m.size || 0; need += m.size || 0 } else need += m.size || 0 }
    const mp = mapAdds();
    if (mp) { const got = foundFor('map', mp.id); if (!got) dl += packDl(mp); need += (got ? 0 : packDl(mp)) + (mp.installed_bytes || 0) }
    const a = addressAdds();
    if (a) { dl += packDl(a); need += packDl(a) + (a.installed_bytes || 0) }
    if (need) need += 2 * 1000 ** 3;
    return { dl, need };
  }

  async function load() {
    try { S = await call('state') }
    catch (e) { main.innerHTML = `<div class="s-err" role="alert">${ico('warn')}<div><b>${I18n.t("setup.load.setup_could_not_start")}</b><p>${esc(I18n.label(e.message))}</p><p><button class="btn" id="again">${I18n.t("common.retry")}</button></p></div></div>`; $('#again').onclick = load; return }
    const rf = (S.recommend || {}).folder;
    folder = folder || (cur() && cur().folder) || S.default_folder || (rf ? asData(rf) : '');
    if (!choice.pack) {
      const rec = S.recommend || {};
      const small = packById('small');
      choice.pack = small && small.available !== false ? 'small' : null;
      choice.ai = !!rec.ai && aiFits();
      if (cur()) { choice.pack = cur().pack; choice.ai = !!cur().model }
    }
    const j = S.job;
    if (j && j.state && j.state !== 'done' && !(j.state === 'failed' && errCode(j.error) === 'cancelled')) view = 'job';
    else if (j && j.state === 'done') view = 'done';
    else if (cur() || S.mode === 'manage' || MANAGE_ASKED) view = cur() ? 'manage' : 'choose';
    $('#sBack').hidden = !cur();
    render(true);
  }

  /* ------------------------------------------------------------ views */
  function render(focus) {
    clearTimeout(pollT);
    shapeKey = '';
    if (view === 'manage') manageView();
    else if (view === 'choose') chooseView();
    else if (view === 'job') jobView(S.job);
    else if (view === 'done') doneView();
    if (focus) { const h = main.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) } scrollTo(0, 0) }
  }
  function go(v) { view = v; confirmCancel = confirmRemove = confirmOld = false; note = ''; render(true) }

  /* ---- this computer */
  function computer() {
    const h = S.hardware || {}, d = diskFor(folder), tiles = [];
    if (d) tiles.push([ico('disk'), size(d.free_bytes), `${I18n.t("setup.computer.free_on")} ${esc(diskName(d))}`]);
    if (h.ram_bytes) tiles.push([ico('chip'), ram(h.ram_bytes), h.unified_memory ? I18n.t("setup.computer.memory_shared_with_graphics") : I18n.t('setup.ai.memory')]);
    if (!h.unified_memory) {
      const g = (h.gpus || []).slice().sort((a, b) => (b.vram_bytes || 0) - (a.vram_bytes || 0))[0];
      tiles.push(g ? [ico('gpu'), g.vram_bytes ? ram(g.vram_bytes) : '—', `${I18n.t('setup.ai.graphics')}${esc(g.name)}`] : [ico('gpu'), I18n.t("map.renderlayers.none"), I18n.t("setup.computer.graphics_card_for_the_ai")]);
    }
    return `<section class="s-pc" aria-label="${I18n.t("setup.computer.this_computer")}">${tiles.map(t => `<div class="s-tile">${t[0]}<b>${t[1]}</b><small>${t[2]}</small></div>`).join('')}</section>`;
  }
  function recommendLine() {
    const r = S.recommend || {}, p = packById(r.pack);
    if (!p) return r.why ? `<p class="s-rec bad">${ico('warn')}<span>${esc(I18n.detail(r.why))}</span></p>` : '';
    const what = `${esc(I18n.label(p.title))}${r.ai && aiFits() ? " " + I18n.t("setup.what.with_the_local_ai") : ''}`;
    return `<p class="s-rec">${ico('ok')}<span><b>${I18n.t("setup.recommendline.suggested")} ${what}.</b> ${esc(I18n.detail(r.why || ''))}</span></p>`;
  }

  /* ---- choose */
  function chooseView() {
    const c = cur(), m = model();
    const packCards = packs().map(p => {
      const update = c && c.pack === p.id && packNeedsInstall(p);
      const off = p.available === false, here = c && c.pack === p.id && !update, rec = (S.recommend || {}).pack === p.id && !c;
      const badge = off ? `<span class="s-badge later">${I18n.t("setup.badge.coming_later")}</span>` : update ? `<span class="s-badge rec">${I18n.t("setup.badge.update_available")}</span>` : here ? `<span class="s-badge here">${I18n.t("setup.badge.installed")}</span>` : rec ? `<span class="s-badge rec">${I18n.t("common.suggested")}</span>` : '';
      return `<label class="s-opt${off ? ' off' : ''}">
        <input type="radio" name="pack" value="${esc(p.id)}"${choice.pack === p.id ? ' checked' : ''}${off ? ' disabled' : ''}>
        <span class="s-opt-in"><span class="s-opt-h"><b>${esc(I18n.label(p.title))}</b>${badge}</span>
        <small data-pack-summary="${esc(p.id)}">${esc(packSummary(p))}</small>
        <span class="s-sizes">${off ? I18n.t("setup.packcards.not_ready_to_download_yet") : here ? I18n.t("setup.packcards.on_this_computer") : `<span>${foundFor('pack', p.id) ? I18n.t("chat.setupcard.already_downloaded") : size(packDl(p)) + " " + I18n.t("common.download_word")}</span><span>${size(p.installed_bytes)} ${I18n.t("setup.packcards.on_disk")}</span>`}</span></span></label>`;
    }).join('');
    let ai = '';
    if (m && m.available !== false) {
      const has = c && c.model;
      ai = aiFits() || has
        ? `<label class="s-opt s-ai"><input type="checkbox" id="aiBox"${choice.ai || has ? ' checked' : ''}${has ? ' disabled' : ''}>
            <span class="s-opt-in"><span class="s-opt-h"><b>${I18n.t("setup.ai.title")}</b>${has ? `<span class="s-badge here">${I18n.t("setup.badge.installed")}</span>` : (S.recommend || {}).ai && !c ? `<span class="s-badge rec">${I18n.t("common.suggested")}</span>` : `<span class="s-badge">${I18n.t("setup.chooseview.optional")}</span>`}</span>
            <small>${I18n.t("setup.chooseview.answers_questions_from_the_library_in")}</small>
            <span class="s-sizes">${has ? I18n.t("setup.packcards.on_this_computer") : foundFor('model') ? `<span>${I18n.t("chat.setupcard.already_downloaded")}</span>` : `<span>${I18n.t('setup.ai.about_download')} ${size(m.size)} ${I18n.t("setup.chooseview.download")}</span>`}</span></span></label>`
        : `<div class="s-opt s-ai off" role="group" aria-label="${I18n.t("setup.ai.title")}"><span class="s-opt-in"><span class="s-opt-h"><b>${I18n.t("setup.ai.title")}</b><span class="s-badge later">${I18n.t("setup.chooseview.not_for_this_computer")}</span></span>
            <small>${esc((S.hardware.ai && I18n.detail(S.hardware.ai.why)) || I18n.t("setup.chooseview.this_computer_does_not_have_enough"))}</small></span></div>`;
    }
    const found = (S.found || []).map((f, i) => f.rejected ? `<div class="s-found off">${ico('file')}<span><b>${esc(f.name || f.path.split(/[\\/]/).pop())}</b><small>${esc(home(f.path))} ${I18n.t("setup.found.doesn_t_match_the_published_file")}</small></span></div>`
      : f.size_ok === false ? '' : `<div class="s-found">${ico(f.kind === 'library' ? 'folder' : 'file')}<span><b>${esc(f.kind === 'library' ? I18n.t("setup.found.a_lastbook_library") : f.kind === 'model' ? I18n.t("setup.found.the_local_ai_file") : (packById(f.id) ? packById(f.id).title + " " + I18n.t("common.library_word") : f.title || f.name))}</b><small>${esc(home(f.path))}${f.size ? ' · ' + size(f.size) : ''}</small></span>
        <button class="btn plain" data-use="${i}">${I18n.t("setup.found.use_the_file_you_already_have")}</button></div>`).join('');

    main.innerHTML = `${c ? `<button class="s-link" id="toManage">${ico('back')}<span>${I18n.t("app.library.library_and_local_ai")}</span></button>` : ''}
      <h1>${c ? I18n.t("setup.chooseview.change_the_library") : I18n.t("setup.title")}</h1>
      ${c ? '' : `<p class="lead">${I18n.t("setup.chooseview.choose_your_state_and_library_lastbook")}</p>`}
      ${computer()}
      ${c ? '' : recommendLine()}
      ${found ? `<h2>${I18n.t("setup.chooseview.found_on_this_computer")}</h2><div class="s-founds">${found}</div>` : ''}
      <section id="mapBox" class="s-map-panel" aria-label="${I18n.t("setup.chooseview.your_local_map")}"></section>
      <h2 id="packH">${I18n.t("nav.library")}</h2>
      <div class="s-opts" role="radiogroup" aria-labelledby="packH">${packCards}</div>
      ${ai ? `<h2>${I18n.t("setup.ai.title")}</h2>${ai}` : ''}
      <section class="s-sum" id="sum" aria-live="polite"></section>
      <div class="s-go">
        <button class="btn big" id="start"></button>
        ${c ? '' : `<button class="s-link" id="haveLib">${I18n.t("setup.chooseview.choose_an_existing_library_folder")}</button>`}
        <button class="s-link" id="haveFile">${I18n.t("setup.chooseview.choose_a_library_zip_or_ai")}</button>
      </div>
      <p class="s-note" id="haveNote" hidden></p>`;
    main.querySelectorAll('input[name=pack]').forEach(r => r.onchange = () => { choice.pack = r.value; shortfall = null; mapSection(); summary() });
    const box = $('#aiBox'); if (box && !box.disabled) box.onchange = () => { choice.ai = box.checked; shortfall = null; summary() };
    main.querySelectorAll('[data-use]').forEach(b => b.onclick = () => useFile((S.found || [])[+b.dataset.use].path, b));
    $('#start').onclick = start;
    if ($('#toManage')) $('#toManage').onclick = () => go('manage');
    if ($('#haveLib')) $('#haveLib').onclick = () => haveLibrary(false);
    $('#haveFile').onclick = () => haveLibrary(true);
    mapSection();
    summary();
  }
  /* Map geometry and address indexes are separate downloads, chosen by state. */
  function mapSection() {
    const box = $('#mapBox'), now = mapNow();
    if (!box) return;
    main.querySelectorAll('[data-pack-summary]').forEach(el => { el.textContent = packSummary(packById(el.dataset.packSummary)) });
    const selected = selectedState();
    const opts = maps().map(m => {
      const a = addressById(m.id), included = now === 'us' || m.id === now;
      const addressIncluded = ((cur() || {}).address_indexes || []).includes(m.id);
      const off = !included && m.available === false;
      const bytes = (included ? 0 : packDl(m)) + (a && a.available !== false && !addressIncluded ? packDl(a) : 0);
      const details = off ? I18n.t("setup.details.coming_later") : bytes ? size(bytes) + " " + I18n.t("common.download_word") : 'included';
      return `<option value="${esc(m.id)}"${selected === m.id ? ' selected' : ''}${off ? ' disabled' : ''}>${esc(m.title)} — ${details}</option>`;
    }).join('');
    const sel = mapById(selected), a = addressAdds();
    const mapIncluded = now === 'us' || selected === now;
    const bytes = (sel && !mapIncluded ? packDl(sel) : 0) + (a ? packDl(a) : 0);
    const disk = (sel && !mapIncluded ? sel.installed_bytes || 0 : 0) + (a ? a.installed_bytes || 0 : 0);
    const unavailable = selected && addresses().length && (!addressById(selected) || addressById(selected).available === false);
    let hint = !sel ? I18n.t("setup.hint.select_your_state_to_continue") : bytes ? `${size(bytes)} ${I18n.t("setup.hint.download")} ${size(disk)} ${I18n.t("setup.packcards.on_disk")}${mapIncluded && a ? '. Your map is already included; only the address index downloads.' : ''}` : I18n.t("setup.hint.your_state_map_and_available_address");
    if (unavailable) hint = (bytes ? `${size(bytes)} ${I18n.t("setup.hint.download")} ${size(disk)} ${I18n.t("setup.mapsection.on_disk")}` : I18n.t("setup.mapsection.your_state_map_is_already_included")) + " " + I18n.t("setup.mapsection.street_address_search_is_not_available");
    box.innerHTML = `<h2>${ico('map')}${I18n.t("setup.chooseview.your_local_map")}</h2>
      <p class="s-mapnote">${I18n.t("setup.mapsection.local_streets_buildings_water_and_places")}</p>
      ${now === 'us' ? `<p class="s-mapnote">${I18n.t("setup.mapsection.all_includes_every_state_map_choose")}</p>` : ''}
      <label class="s-maplabel" for="mapSel">${I18n.t("setup.mapsection.choose_your_state")}</label>
      <select id="mapSel" class="s-select" required aria-describedby="mapHint"><option value="" disabled${selected ? '' : ' selected'}>${I18n.t("setup.mapsection.select_a_state")}</option>${opts}</select>
      <p class="s-hint" id="mapHint">${hint}</p>`;
    $('#mapSel').onchange = e => { choice.map = e.target.value; shortfall = null; mapSection(); summary(); $('#mapSel').focus() };
  }
  function summary() {
    const { dl, need } = plan(), d = diskFor(folder), free = d ? d.free_bytes : null;
    const short = shortfall || (need && free != null && free < need ? { need_bytes: need, free_bytes: free } : null);
    const pct = need && free ? Math.min(100, need / free * 100) : short ? 100 : 0;
    const c = cur();
    $('#sum').innerHTML = need ? `
      <div class="s-nums"><span><small>${I18n.t("setup.summary.download")}</small><b>${dl ? size(dl) : I18n.t("map.renderlayers.none")}</b></span><span><small>${I18n.t("setup.summary.space_needed")}</small><b>${size(short ? short.need_bytes : need)}</b></span><span><small>${I18n.t("setup.summary.free_on")} ${esc(diskName(d))}</small><b>${short ? size(short.free_bytes) : free != null ? size(free) : I18n.t("setup.summary.checked_at_start")}</b></span></div>
      ${free == null && !short ? '' : `<div class="s-meter${short ? ' bad' : ''}" role="img" aria-label="${I18n.t("common.uses")} ${Math.round(pct)} ${I18n.t("setup.summary.percent_of_the_free_space")}"><i style="width:${pct}%"></i></div>`}
      ${short ? `<p class="s-short">${ico('warn')}<span>${I18n.t("setup.summary.not_enough_room_this_needs")} ${size(short.need_bytes)}${I18n.t("setup.summary.and")} ${esc(diskName(d))} ${I18n.t("setup.summary.has")} ${size(short.free_bytes)} ${I18n.t("setup.summary.free_pick_a_smaller_library_or")}</span></p>` : ''}
      ${folderRow()}`
      : `<p class="s-nothing">${c ? I18n.t("setup.summary.this_is_what_you_have_now") : I18n.t("setup.summary.pick_a_library")}</p>${c ? '' : folderRow()}`;
    const b = $('#start');
    b.disabled = !need || !!short || mapMissing();
    const newPack = c && packNeedsInstall(packById(choice.pack)), newAi = c && choice.ai && !c.model, newMap = c && mapAdds(), newAddresses = c && addressAdds();
    const parts = [newPack && I18n.label(packById(choice.pack).title), newAi && I18n.t("setup.parts.the_local_ai"), newMap && I18n.t('setup.map.name', { name: newMap.title }), newAddresses && !newMap && I18n.t("setup.parts.offline_address_search")].filter(Boolean);
    b.textContent = mapMissing() ? I18n.t("setup.summary.choose_your_state_to_continue") : !c ? I18n.t("setup.install") : parts.length ? I18n.t("common.get") + " " + parts.join(parts.length > 2 ? ', ' : I18n.t('setup.selection.join')).replace(/, ([^,]*)$/, " " + I18n.t("setup.summary.and_1")) : I18n.t("setup.summary.nothing_to_add");
    if (newPack && choice.pack === c.pack && !mapMissing()) b.textContent = I18n.t("setup.update");
    const ch = $('#chFolder'); if (ch) ch.onclick = pickFolder;
  }
  const folderRow = () => `<div class="s-folder">${ico('folder')}<span><small>${I18n.t("setup.folderrow.saves_to")}</small><b title="${esc(folder)}">${esc(home(folder))}</b></span>${cur() ? '' : `<button class="btn plain" id="chFolder">${I18n.t("setup.folderrow.change")}</button>`}</div>`;

  async function pickFolder() {
    const b = $('#chFolder'); b.disabled = true;
    try {
      const r = await call('pick', {});
      if (r && r.path) {
        folder = asData(r.path);
        if (r.free_bytes != null) (S.hardware.disks = S.hardware.disks || []).push({ path: r.path, name: r.disk, free_bytes: r.free_bytes });   // the chosen place's own disk
        shortfall = null;
        const pc = main.querySelector('.s-pc'); if (pc) pc.outerHTML = computer();
      }
      summary();
    } catch { b.disabled = false; b.textContent = I18n.t("setup.pickfolder.can_t_change_here") }
  }
  async function haveLibrary(files) {
    const n = $('#haveNote');
    try {
      const r = await call('pick', { files });
      if (r && r.path) return useFile(r.path, $(files ? '#haveFile' : '#haveLib'));
      if (r && (r.cancelled || r.path === null)) return;
      throw 0;
    } catch {
      n.hidden = false;
      n.textContent = I18n.t("setup.havelibrary.the_picker_could_not_open_try");
    }
  }
  async function useFile(path, btn) {
    if (btn) btn.disabled = true;
    try {
      const r = await call('use', { path });
      if (r && r.error) throw new Error(r.error);
      if (r && r.noted) { S = await call('state').catch(() => S); choice.ai = true; chooseView(); const n = $('#haveNote'); n.hidden = false; n.textContent = I18n.t("setup.usefile.the_local_ai_file_will_be"); return }
      S.job = r; go(r.state === 'done' ? 'done' : 'job'); poll();
    } catch (e) {
      if (btn) btn.disabled = false;
      const n = $('#haveNote'); n.hidden = false; n.textContent = I18n.error(e.message);
    }
  }
  async function start() {
    if (mapMissing()) { $('#mapSel')?.focus(); return }
    const b = $('#start'); b.disabled = true;
    const r = await call('start', { pack: packNeedsInstall(packById(choice.pack)) ? choice.pack : null, ai: !!choice.ai && aiFits() && !(cur() || {}).model, map: mapAdds() ? choice.map : null, address_id: addressById(selectedState())?.available !== false && addressById(selectedState()) ? selectedState() : null, folder }).catch(e => ({ error: e.message }));
    if (r && r.need_bytes) { shortfall = r; summary(); return }
    if (!r || r.error) { b.disabled = false; const n = $('#haveNote'); n.hidden = false; n.textContent = (r && r.error && I18n.error(r.error)) || I18n.t("setup.load.setup_could_not_start"); return }
    S.job = r; go('job'); poll();
  }

  /* ---- manage */
  function manageView() {
    const c = cur(), p = packById(c.pack), m = model();
    const libraryUpdate = p && p.available !== false && packNeedsInstall(p);
    const o = [].concat(c.old || [])[0], old = o ? (typeof o === 'string' ? { path: o } : o) : null;   // the engine lists the paths it moved aside
    const larger = packs().filter(x => (x.installed_bytes || 0) > ((p && p.installed_bytes) || 0));
    const bigger = larger.filter(x => x.available !== false), later = larger.find(x => x.available === false);
    main.innerHTML = `<h1>${I18n.t("app.library.library_and_local_ai")}</h1>
      <div class="s-have">
        <div class="s-row">${ico('book', 's-ri')}<span><b>${esc(I18n.t('setup.library.name', { name: I18n.label(p ? p.title : c.pack || I18n.t('nav.library')) }))}</b><small>${libraryUpdate ? I18n.t("setup.manageview.updated_edition_available") + " " : p ? size(p.installed_bytes) + ' · ' : ''}${esc(home(c.folder))}</small></span>
          ${libraryUpdate ? `<button class="btn" id="libraryUpdate">${I18n.t("common.update")} ${esc(I18n.label(p.title))}</button>` : bigger.length ? `<button class="btn" id="upgrade">${ico('up')}${I18n.t("common.get")} ${esc(I18n.label(bigger[0].title))}</button>` : later ? `<span class="s-badge later">${esc(I18n.label(later.title))} ${I18n.t("setup.manageview.comes_later")}</span>` : `<span class="s-badge here">${I18n.t("setup.manageview.the_largest")}</span>`}</div>
        ${m && m.available !== false ? `<div class="s-row">${ico('ai', 's-ri')}<span><b>${I18n.t("setup.ai.title")}</b><small>${c.model ? I18n.t("setup.manageview.on_this_computer") + " " + size(m.size) : aiFits() ? I18n.t("setup.manageview.not_installed_about") + " " + size(m.size) : esc((S.hardware.ai && I18n.detail(S.hardware.ai.why)) || I18n.t("setup.manageview.not_for_this_computer"))}</small></span>
          ${c.model ? (!CAN.removeAi ? '' : confirmRemove ? `<span class="s-confirm"><button class="btn danger" id="rmYes">${I18n.t("setup.manageview.remove")}</button><button class="btn plain" id="rmNo">${I18n.t("setup.manageview.keep")}</button></span>` : `<button class="btn plain" id="rmAi">${I18n.t("setup.manageview.remove")}</button>`) : aiFits() ? `<button class="btn" id="addAi">${I18n.t("setup.manageview.add")}</button>` : ''}</div>` : ''}
        ${maps().length ? (() => { const mNow = c.map && c.map !== 'base' ? c.map : packMap(c.pack);
          return `<div class="s-row">${ico('map', 's-ri')}<span><b>${mNow ? I18n.t("setup.manageview.detailed_map") + " " + esc(mapName(mNow)) : I18n.t("setup.manageview.detailed_map_700")}</b><small>${mNow ? (mNow === 'us' ? I18n.t("setup.manageview.local_streets_and_terrain_everywhere") : I18n.t("setup.manageview.local_streets_buildings_and_terrain")) : I18n.t("setup.manageview.none_yet_add_one_for_your")}</small></span>
          <button class="btn plain" id="mapCh">${(c.address_indexes || []).length ? I18n.t("setup.manageview.choose_state") : I18n.t("setup.manageview.add_address_search")}</button></div>` })() : ''}
      </div>
      ${old ? `<div class="s-row s-old">${ico('folder', 's-ri')}<span><b>${I18n.t("setup.manageview.the_old_library_is_still_here")}</b><small>${esc(home(old.path))}${old.bytes ? ' · ' + size(old.bytes) : ''}</small></span>${confirmOld ? `<span class="s-confirm"><span>${I18n.t("setup.manageview.delete_it_for_good")}</span><button class="btn danger" id="oldYes">${I18n.t("common.delete")}</button><button class="btn plain" id="oldNo">${I18n.t("setup.manageview.keep")}</button></span>` : `<button class="btn plain" id="rmOld">${ico('trash')}${I18n.t("setup.manageview.delete_it")}</button>`}</div>` : ''}
      ${computer()}
      ${CAN.repair ? `<div class="s-go left"><button class="btn plain" id="repair">${ico('repair')}${I18n.t("setup.manageview.check_and_repair")}</button></div>` : ''}
      <p class="s-note${noteOk ? ' ok' : ''}" id="haveNote"${note ? '' : ' hidden'}>${esc(I18n.label(note))}</p>`;
    if ($('#libraryUpdate')) $('#libraryUpdate').onclick = () => { choice.pack = c.pack; choice.ai = !!c.model; go('choose') };
    if ($('#upgrade')) $('#upgrade').onclick = () => { choice.pack = bigger[0].id; choice.ai = !!c.model; go('choose') };
    if ($('#mapCh')) $('#mapCh').onclick = () => { choice.pack = c.pack; choice.ai = !!c.model; choice.map = null; go('choose'); const m = $('#mapSel'); if (m) m.focus() };
    if ($('#addAi')) $('#addAi').onclick = () => { choice.pack = c.pack; choice.ai = true; go('choose') };
    if ($('#rmAi')) $('#rmAi').onclick = () => { confirmRemove = true; manageView(); $('#rmNo').focus() };
    if ($('#rmNo')) $('#rmNo').onclick = () => { confirmRemove = false; manageView(); $('#rmAi').focus() };
    if ($('#rmYes')) $('#rmYes').onclick = () => act('remove-ai', I18n.t("setup.manageview.the_local_ai_was_removed"));   // the engine stops the AI first
    if ($('#rmOld')) $('#rmOld').onclick = () => { confirmOld = true; manageView(); $('#oldNo').focus() };
    if ($('#oldNo')) $('#oldNo').onclick = () => { confirmOld = false; manageView(); $('#rmOld').focus() };
    if ($('#oldYes')) $('#oldYes').onclick = () => act('delete-old', I18n.t("setup.manageview.the_old_library_is_being_deleted"), { path: old.path });
    if ($('#repair')) $('#repair').onclick = async () => {
      const r = await call('start', { repair: true, ai: !!c.model }).catch(e => ({ error: e.message }));
      if (!r || r.error) { note = (r && r.error && I18n.error(r.error)) || I18n.t("setup.manageview.repair_could_not_start"); manageView(); return }
      repair = { fixed: false }; S.job = r; go('job'); poll();
    };
  }
  async function act(path, done, body) {
    const r = await call(path, body || {}).catch(e => ({ error: e.status === 404 ? I18n.t("setup.r.this_lastbook_cannot_do_that_yet") : e.message }));
    confirmRemove = confirmOld = false;
    noteOk = !(r && r.error);
    if (r && r.error) note = I18n.error(r.error);
    else { note = done; S = await call('state').catch(() => S) }
    manageView();
    const n = $('#haveNote'); if (n) { n.tabIndex = -1; n.focus() }
  }

  /* ---- job */
  const STEPS = { pack: [['downloading', I18n.t("setup.summary.download")], ['verifying', I18n.t("common.check")], ['unpacking', I18n.t("common.unpack")], ['activating', I18n.t("common.finish")]],
                  model: [['downloading', I18n.t("setup.summary.download")], ['verifying', I18n.t("common.check")], ['activating', I18n.t("common.finish")]] };
  STEPS.map = [['downloading', I18n.t("setup.summary.download")], ['unpacking', I18n.t("common.unpack")]];   // the engine's map item: waiting, downloading, unpacking, done
  STEPS.addresses = STEPS.map;
  const WORD = { waiting: I18n.t("setup.word.waiting"), downloading: I18n.t("common.downloading"), paused: I18n.t("common.paused"), verifying: I18n.t("setup.word.checking"), unpacking: I18n.t("setup.word.unpacking"), activating: I18n.t("setup.word.finishing"), done: I18n.t("setup.word.done"), failed: I18n.t("setup.word.stopped") };
  const ACTIVE = new Set(['waiting', 'downloading', 'verifying', 'unpacking', 'activating']);
  let shapeKey = '', lastAct = null;   // lastAct: the button just pressed, so focus lands on what replaced it

  function errorBox(j) {
    const e = j.error, code = errCode(e) || j.code, c = cur();
    const safe = c ? I18n.t("setup.safe.your_library_is_untouched_and_still") : I18n.t("setup.safe.nothing_else_on_this_computer_was");
    const d = diskFor(j.folder || folder);
    const T = {
      found_mismatch: (() => {   // a file of the person's own that did not match: nothing was downloaded, and their file is left alone
        const f = String((e && e.file) || ''), name = f.split(/[\\/]/).pop() || 'file', at = f.split(/[\\/]/).slice(-2, -1)[0];
        return [`${I18n.t("common.the")} ${esc(name)}${at ? I18n.t('common.in') + esc(at) : ''} ${I18n.t("setup.t.doesn_t_match_the_published_file")}`, I18n.t("setup.t.it_was_left_as_it_is"), 'download'];
      })(),
      no_space: [`${I18n.t("setup.t.not_enough_room_on")} ${esc(diskName(d))}${e && e.need_bytes ? `${I18n.t("setup.t.this_needs")} ${size(e.need_bytes)}${I18n.t("setup.summary.and")} ${size(e.free_bytes)} ${I18n.t("setup.t.is_free")}` : ''}.`, I18n.t("setup.t.free_some_space_then_retry_or"), 'retry'],
      network: [I18n.t("setup.t.the_internet_connection_dropped"), I18n.t("setup.t.what_is_downloaded_is_kept_retry"), 'retry'],
      checksum: [I18n.t("setup.t.the_download_came_out_damaged_twice"), I18n.t("setup.t.retry_to_download_it_once_more"), 'retry'],
      unpack: [I18n.t("setup.t.unpacking_did_not_finish"), I18n.t("setup.t.check_there_is_room_on_the"), 'retry'],
      activate: [I18n.t("setup.t.the_new_library_is_ready_but"), I18n.t("setup.t.retry_or_close_lastbook_and_open"), 'retry'],
      cancelled: [I18n.t("setup.t.the_download_was_cancelled"), I18n.t("setup.t.start_again_when_you_are_ready"), 'back'],
    }[code] || [esc(I18n.error(errText(e)) || I18n.t("app.errorbox.something_went_wrong")), I18n.t("setup.t.retry_or_go_back_and_choose"), 'retry'];
    return `<div class="s-err" role="alert">${ico('warn')}<div><b>${T[0]}</b><p>${T[1]}${code === 'found_mismatch' && !c ? '' : ' ' + safe}</p>
      <p class="s-acts">${T[2] === 'retry' ? `<button class="btn" data-act="retry">${ico('retry')}${I18n.t("setup.errorbox.retry")}</button>` : T[2] === 'download' ? `<button class="btn" data-act="retry">${ico('down')}${I18n.t("setup.errorbox.download_it")}</button>` : ''}<button class="btn ${T[2] === 'back' ? '' : 'plain'}" data-act="back">${I18n.t("setup.errorbox.choose_again")}</button></p></div></div>`;
  }
  function itemHTML(it, j) {
    const FAILED_AT = { checksum: 'verifying', found_mismatch: 'verifying', unpack: 'unpacking', activate: 'activating' };
    const steps = STEPS[it.kind] || STEPS.pack;
    const st = it.state === 'paused' && noDownload(it) ? (it.paused_from && it.paused_from !== 'downloading' ? it.paused_from : 'verifying')
      : it.state === 'paused' || it.state === 'waiting' ? 'downloading' : it.state === 'failed' ? FAILED_AT[errCode(it.error) || errCode(j.error)] || 'downloading' : it.state;
    const at = it.state === 'done' ? steps.length : (it.state === 'waiting' || it.state === 'paused') && !it.bytes_done && !noDownload(it) ? -1 : Math.max(0, steps.findIndex(s => s[0] === st));
    const busy = ['verifying', 'activating'].includes(it.state) || (it.state === 'unpacking' && !it.bytes_total);
    return `<div class="s-item${it.state === 'failed' ? ' bad' : ''}${it.state === 'done' ? ' ok' : ''}" data-item="${esc(it.id)}" data-kind="${esc(it.kind)}">
      <div class="s-item-h">${ico(it.kind === 'model' ? 'ai' : it.kind === 'map' ? 'map' : 'book', 's-ri')}<b>${esc(I18n.label(itemTitle(it)))}</b><span class="s-state" data-f="word">${it.state === 'done' ? ico('ok') : ''}${Object.hasOwn(WORD, it.state) ? WORD[it.state] : ''}</span></div>
      <div class="s-bar new${busy && j.state !== 'paused' ? ' busy' : ''}" role="progressbar" aria-label="${esc(I18n.label(itemTitle(it)))}" aria-valuemin="0" aria-valuemax="100" data-f="bar"><i></i></div>
      <p class="s-line" data-f="line"></p>
      <ol class="s-steps" aria-label="${I18n.t("common.steps")}">${steps.map((s, i) => `<li class="${i < at ? 'done' : i === at && it.state !== 'failed' ? 'now' : i === at ? 'stop' : ''}">${s[1]}</li>`).join('')}</ol>
    </div>`;
  }
  const itemTitle = it => it.kind === 'model' ? I18n.t("setup.ai.title") : it.kind === 'map' ? `${(mapById(it.id) || it).title || it.id} ${I18n.t("common.map_word")}` : it.kind === 'addresses' ? it.title : it.id === 'library' || it.id === 'repair' || /library/i.test(it.title) ? it.title : I18n.t('setup.library.name', { name: I18n.label(it.title) });
  /* an item that needs nothing from the internet: the person's own file, or one stopped after its download was complete.
     source and paused_from come from the engine (docs/SETUP-API.md); without them, a complete download still counts */
  const noDownload = it => it.source === 'found' || (!!it.paused_from && it.paused_from !== 'downloading') || (it.bytes_total > 0 && it.bytes_done >= it.bytes_total);
  const STOPPED = { verifying: I18n.t("setup.stopped.checking_stopped"), unpacking: I18n.t("setup.stopped.unpacking_stopped"), activating: I18n.t("setup.stopped.finishing_stopped") };
  const behind = it => { const items = (S.job && S.job.items) || [], i = items.findIndex(x => x.id === it.id && x.kind === it.kind); return items.slice(0, i).some(x => x.state !== 'done' && !noDownload(x)) };
  function fillItem(el, it) {
    const pct = it.bytes_total ? Math.min(100, it.bytes_done / it.bytes_total * 100) : it.state === 'done' ? 100 : 0;
    const bar = el.querySelector('[data-f=bar]'), line = el.querySelector('[data-f=line]');
    const showPct = !bar.classList.contains('busy');
    bar.firstChild.style.width = (showPct ? pct : 100) + '%';
    if (showPct) bar.setAttribute('aria-valuenow', Math.round(pct)); else bar.removeAttribute('aria-valuenow');
    let t = '';
    if (it.state === 'done') t = it.bytes_total ? size(it.bytes_total) : '';
    else if (it.state === 'downloading') t = [`${I18n.t('setup.download.ratio', { done: size(it.bytes_done), total: size(it.bytes_total) })}`, rate(it.rate_bps), eta(it.eta_s)].filter(Boolean).join(' · ');
    else if (it.state === 'paused' && noDownload(it)) t = `${STOPPED[it.paused_from] || I18n.t("setup.word.stopped")}${it.paused_from === 'unpacking' && it.bytes_done && it.bytes_total ? ` ${I18n.t("common.at_word")} ${I18n.t('setup.download.ratio', { done: size(it.bytes_done), total: size(it.bytes_total) })}` : ''}${I18n.t("common.nothing_to_download")}`;
    else if ((it.state === 'waiting' || it.state === 'paused') && !it.bytes_done) t = it.bytes_total ? `${size(it.bytes_total)} ${I18n.t("setup.fillitem.to_download")}${behind(it) ? I18n.t("setup.fillitem.after_the_one_above") : ''}` : '';
 else if (it.state === 'paused' || it.state === 'waiting' || it.state === 'failed') t = it.bytes_total && it.bytes_done ? `${I18n.t('setup.download.ratio', { done: size(it.bytes_done), total: size(it.bytes_total) })}` : '';
    else if (it.state === 'verifying') t = I18n.t("setup.fillitem.making_sure_every_byte_is_right");
    else if (it.state === 'unpacking') t = it.bytes_total ? `${I18n.t("setup.fillitem.unpacking")} ${I18n.t('setup.download.ratio', { done: size(it.bytes_done), total: size(it.bytes_total) })}${it.eta_s != null ? ' · ' + eta(it.eta_s) : ''}` : I18n.t("setup.fillitem.opening_the_files_into_the_library");
    else if (it.state === 'activating') t = it.kind === 'map' ? I18n.t("setup.fillitem.switching_to_the_new_map") : I18n.t("setup.fillitem.switching_to_the_new_library");
    line.textContent = t;
  }
  function jobView(j) {
    if (!j) { go(cur() ? 'manage' : 'choose'); return }
    if (j.state === 'done') { go('done'); return }
    const key = j.state + '|' + errCode(j.error) + '|' + confirmCancel + '|' + j.items.map(i => i.kind + ':' + i.id + ':' + i.state).join(',');
    const head = { paused: I18n.t("common.paused"), failed: errCode(j.error) === 'cancelled' ? I18n.t("common.cancelled") : I18n.t("setup.word.stopped") }[j.state] || (repair && !repair.fixed ? I18n.t("setup.head.checking_the_library") : repair ? I18n.t("common.repairing") : I18n.t("common.installing"));
    if (key !== shapeKey) {
      const had = lastAct || (document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.act : null);
      lastAct = null;
      const first = !shapeKey;
      shapeKey = key;
      const quiet = j.state === 'paused' && j.items.filter(i => i.state === 'paused').every(noDownload);
      const lead = quiet ? I18n.t("setup.lead.stopped_when_lastbook_closed_resume_to")
        : j.state === 'paused' ? I18n.t("setup.lead.what_is_downloaded_is_kept_resume")
        : j.state === 'failed' ? '' : I18n.t("setup.lead.you_can_keep_using_this_computer");
      main.innerHTML = `<h1>${head}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}
        ${j.state === 'failed' ? errorBox(j) : ''}
        <div class="s-items">${j.items.map(it => itemHTML(it, j)).join('')}</div>
        ${j.state === 'failed' ? '' : `<div class="s-go left">${confirmCancel
          ? `<span class="s-confirm"><span>${I18n.t("setup.jobview.stop_and_throw_away_the_download")}</span><button class="btn danger" data-act="cancel-yes">${I18n.t("setup.jobview.stop")}</button><button class="btn plain" data-act="cancel-no">${I18n.t("setup.jobview.keep_going")}</button></span>`
          : `${j.state === 'paused' ? `<button class="btn" data-act="resume">${ico('play')}${I18n.t("videos.player.resume")}</button>` : j.state === 'downloading' || j.state === 'waiting' ? `<button class="btn plain" data-act="pause">${ico('pause')}${I18n.t("setup.jobview.pause")}</button>` : ''}
             <button class="btn plain" data-act="cancel">${ico('x')}${I18n.t("setup.jobview.cancel")}</button>`}</div>`}`;
      main.querySelectorAll('[data-act]').forEach(b => b.onclick = () => jobAct(b.dataset.act, b));
      const again = had && main.querySelector(`[data-act="${had}"]`) || (had && main.querySelector('[data-act]'));
      if (again) again.focus();
      else if (first) { const h = main.querySelector('h1'); h.tabIndex = -1; h.focus({ preventScroll: true }) }
      const s = j.state === 'failed' ? '' : head + (j.items.find(i => ACTIVE.has(i.state)) ? ': ' + WORD[j.items.find(i => ACTIVE.has(i.state)).state] + ' ' + j.items.find(i => ACTIVE.has(i.state)).title : '');
      if (s && live.textContent !== s) live.textContent = s;
    }
    const fresh = main.querySelectorAll('.s-bar.new');
    j.items.forEach(it => { const el = main.querySelector(`[data-item="${CSS.escape(it.id)}"][data-kind="${CSS.escape(it.kind)}"]`); if (el) fillItem(el, it) });
    if (fresh.length) { void main.offsetWidth; fresh.forEach(b => b.classList.remove('new')) }   // a new screen shows the bar where it is, without growing from nothing
  }
  async function jobAct(a, b) {
    if (a === 'back') { S = await call('state').catch(() => S); S.job = null; shortfall = null; go('choose'); return }   // fresh: found[] may now mark a file as not matching
    if (a === 'cancel') { confirmCancel = true; jobView(S.job); main.querySelector('[data-act="cancel-no"]').focus(); return }
    if (a === 'cancel-no') { confirmCancel = false; jobView(S.job); return }
    if (a === 'cancel-yes') { confirmCancel = false; a = 'cancel' }
    b.disabled = true; lastAct = a;
    try { const j = await call(a, {}); if (j && j.items) S.job = j } catch { }
    if (a === 'cancel') { S = await call('state').catch(() => S); S.job = null; go(cur() ? 'manage' : 'choose'); live.textContent = I18n.t("setup.t.the_download_was_cancelled"); return }
    jobView(S.job);
    poll();
  }
  function poll() {
    clearTimeout(pollT);
    if (!S.job || !ACTIVE.has(S.job.state)) return;
    pollT = setTimeout(async () => {
      try { const j = await call('job'); if (j) S.job = j } catch { pollT = setTimeout(poll, 3000); return }
      if (repair && S.job && S.job.items.some(i => i.state === 'downloading' || i.state === 'unpacking')) repair.fixed = true;
      if (view !== 'job') return;
      if (S.job && S.job.state === 'done') { go('done'); return }
      jobView(S.job);
      poll();
    }, 1000);
  }

  /* ---- done */
  function doneView() {
    const j = S.job || { items: [] }, fixed = repair && repair.fixed, checked = repair && !fixed;
    const got = j.items.filter(i => i.id !== 'repair' && i.id !== 'library').map(i => esc(itemTitle(i))).join(', ').replace(/, ([^,]*)$/, " " + I18n.t("setup.summary.and_1"));
    main.innerHTML = `<div class="s-done">${ico('ok', 's-big')}<h1>${checked ? I18n.t("setup.doneview.all_good") : fixed ? I18n.t("common.repaired") : I18n.t("setup.doneview.ready")}</h1>
      <p class="lead">${checked ? I18n.t("setup.doneview.the_library_was_checked_and_is") : fixed ? I18n.t("setup.doneview.a_damaged_part_was_downloaded_again") : got ? `${I18n.t("setup.doneview.installed")} ${got}.` : I18n.t("setup.doneview.the_library_is_installed")}</p>
      <button class="btn big" id="open">${I18n.t("setup.doneview.open_the_library")}</button><p class="s-note" id="openNote" hidden></p></div>`;
    live.textContent = checked ? I18n.t("setup.doneview.the_library_was_checked") : I18n.t("setup.doneview.installed_ready_to_open");
    $('#open').onclick = async () => {
      const b = $('#open'); b.disabled = true; b.textContent = I18n.t("setup.doneview.opening_your_library");
      const r = await call('finish', {}).catch(e => ({ error: e.message }));   // on {ok} the app relaunches itself into the library
      if (!r || r.error) { b.disabled = false; b.textContent = I18n.t("setup.doneview.open_the_library"); const n = $('#openNote'); n.hidden = false; n.textContent = (r && r.error && I18n.error(r.error)) || I18n.t("setup.doneview.the_library_did_not_open_try") }
      else live.textContent = I18n.t("setup.doneview.opening_your_library");
    };
  }

  /* keyboard: Escape closes a question that is open */
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (confirmCancel) { confirmCancel = false; jobView(S.job); const b = main.querySelector('[data-act="cancel"]'); if (b) b.focus() }
    else if (confirmRemove || confirmOld) { const f = confirmRemove ? '#rmAi' : '#rmOld'; confirmRemove = confirmOld = false; manageView(); $(f).focus() }
  });
  /* the window comes back to the front: the job may have moved on, or a restart paused it */
  addEventListener('focus', () => { if (view === 'job') call('job').then(j => { if (j) { S.job = j; jobView(j); poll() } }).catch(() => { }) });

  load().then(() => { if (view === 'job') poll() });
})();
