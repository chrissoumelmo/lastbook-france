'use strict';
/* "Ask the library" — chat with the local model, grounded in the library. Conversations stay on this device only. */
const Chat = (() => {
  const STARTERS = [
    ['water', I18n.t("chat.starters.the_tap_water_is_off_how")],
    ['hurt', I18n.t("chat.starters.someone_has_a_deep_cut_that")],
    ['power', I18n.t("chat.starters.how_do_i_run_a_generator")],
    ['food', I18n.t("chat.starters.the_fridge_has_been_off_for")],
    ['sanitation', I18n.t("chat.starters.the_toilets_don_t_work_how")],
    ['comms', I18n.t("chat.starters.phones_are_down_how_can_our")],
    ['grow', I18n.t("chat.starters.what_vegetables_can_i_plant_this")],
    ['repair', I18n.t("chat.starters.how_do_i_change_the_oil")],
  ];
  const ABOUT_STARTERS = { doc: [I18n.t("chat.about_starters.explain_this_page_in_simple_words"), I18n.t("chat.about_starters.what_are_the_warnings_on_this"), I18n.t("chat.about_starters.is_there_a_video_that_shows")],
    video: [I18n.t("chat.about_starters.summarise_what_this_video_shows"), I18n.t("chat.about_starters.what_safety_points_does_this_video"), I18n.t("chat.about_starters.find_a_manual_page_that_covers")],
    topic: [I18n.t("chat.about_starters.what_should_i_do_first"), I18n.t("chat.about_starters.what_are_the_most_important_warnings"), I18n.t("chat.about_starters.which_video_should_i_watch_first")] };
  const STATES = { starting: I18n.t("chat.states.starting_the_local_ai"), thinking: I18n.t("chat.states.thinking"), searching: I18n.t("chat.states.searching_the_library"), reading: I18n.t("chat.states.reading_the_pages_it_found"), writing: I18n.t("chat.states.writing_the_answer") };
  // Where an answer is: search, then read, then write (none yet while the local AI starts). A later round can search again, so a step can light up a second time.
  const STAGES = [I18n.t("common.search"), I18n.t("common.read"), I18n.t("common.write")], STAGE_AT = { starting: -1, thinking: 0, searching: 0, reading: 1, writing: 2 };
  function progress(m) {
    const at = STAGE_AT[m.state] ?? 0, pct = m.state === 'starting' && m.pct ? Math.max(0, Math.min(100, +m.pct || 0)) : null;
    const stages = STAGES.map((t, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}">${t}</li>`).join('');
    return `<ol class="wk-stages" aria-hidden="true">${stages}</ol><span class="wk-bar${pct === null ? ' run' : ''}" aria-hidden="true"><span${pct === null ? '' : ` style="width:${pct}%"`}></span></span>`;
  }
  let chats = load(), live = {};   // live[chatId] = {abort, state, steps}
  let status = null;

  function load() { try { return JSON.parse(localStorage.getItem('sg.chats')) || [] } catch { return [] } }
  const keep = () => { try { return localStorage.getItem('sg.chatKeep') !== 'no' } catch { return true } };
  function persist() { if (!keep()) return; try { localStorage.setItem('sg.chats', JSON.stringify(chats.slice(0, 60))) } catch { } }
  const byId = id => chats.find(c => c.id === id);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const count = () => chats.length;

  async function getStatus() {
    try { status = await (await fetch('/api/assistant/status')).json() } catch { status = { online: false, error: 'server' } }
    return status;
  }

  /* ---------------------------------------------------------------- page -- */
  let root = null, cur = null, aboutCtx = null;
  async function page(main, parts, q) {
    root = main;
    const id = parts[0];
    cur = id ? byId(id) : null;
    if (id && !cur) { swap('#/ask'); return }
    const about = q.get('about');
    aboutCtx = !cur && about ? await describe(about) : (cur && cur.about ? cur.aboutInfo : null);
    document.title = (cur ? cur.title : I18n.t("nav.chat")) + " " + I18n.t("app.settitle.lastbook");
    $('#tbTitle').textContent = cur ? cur.title : I18n.t("nav.chat");
    main.innerHTML = `<div class="chat">
      <aside class="chat-side" id="chatSide" aria-label="${I18n.t("common.conversations")}">
        <div class="cs-head"><b>${I18n.t("common.chats")}</b><button class="iconbtn" id="closeSide" aria-label="${I18n.t("chat.page.close_chat_list")}">${ico('back')}</button></div>
        <a class="btn plain" href="#/ask" id="newChat2">${ico('ask')}${I18n.t("chat.new")}</a>
        <ul class="cs-list" id="csList"></ul>
        <div class="cs-privacy">
          <label><input type="checkbox" id="keepChats" ${keep() ? 'checked' : ''}> ${I18n.t("chat.page.keep_chat_history_on_this_device")}</label>
          <p class="small muted">${I18n.t("chat.page.chats_stay_on_this_device_nothing")}</p>
          <button class="btn plain" id="clearChats">${I18n.t("chat.page.delete_all_chats")}</button>
        </div>
      </aside>
      <section class="chat-main">
        <div class="chat-top">
          <button class="btn plain chat-histbtn" id="openSide" aria-label="${I18n.t("chat.page.show_chats")}">${ico("clock")}<span>${I18n.t("common.chats")}</span></button>
          <div class="chat-status" id="chatStatus" aria-live="polite"></div>
          <a class="btn plain" href="#/ask" id="newChat" aria-label="${I18n.t("chat.new")}">${ico('ask')}<span>${I18n.t("common.new")}</span></a>
        </div>
        ${q.get('from') && !cur ? `<div style="margin:2px 0 8px">${backButton(q.get('from'))}</div>` : ''}
        <div class="ai-setup" id="aiSetup" hidden></div>
        <div class="chat-log" id="chatLog" role="log" aria-live="polite" aria-label="${I18n.t("common.conversation")}"></div>
        <form class="composer" id="composer">
          <div class="ctxchip" id="ctxChip" hidden></div>
          <div class="comp-row">
            <label class="sr" for="chatIn">${I18n.t("chat.composer.label")}</label>
            <textarea id="chatIn" rows="1" placeholder="${I18n.t("chat.composer.placeholder")}" enterkeyhint="send"></textarea>
            <button class="sendbtn" id="sendBtn" aria-label="${I18n.t("chat.composer.send")}">${ico("up")}</button>
          </div>
          <p class="comp-note">${I18n.t("chat.page.answers_come_from_the_library_on")}</p>
        </form>
      </section></div>`;
    renderSide(); renderCtx(); renderLog();
    const ta = $('#chatIn');
    ta.addEventListener('input', autosize);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#composer').requestSubmit() }
      if (e.key === 'Escape') stop();
    });
    $('#composer').addEventListener('submit', e => { e.preventDefault(); if (busy()) return stop(); send(ta.value) });
    $('#openSide').onclick = () => $('#chatSide').classList.add('open');
    $('#closeSide').onclick = () => $('#chatSide').classList.remove('open');
    $('#keepChats').onchange = e => {
      try { localStorage.setItem('sg.chatKeep', e.target.checked ? 'yes' : 'no') } catch { }
      if (!e.target.checked) { try { localStorage.removeItem('sg.chats') } catch { } toast(I18n.t("chat.page.chats_will_be_forgotten_when_you")) } else { persist(); toast(I18n.t("chat.page.chats_will_be_kept_on_this")) }
    };
    $('#clearChats').onclick = () => { if (!confirm(I18n.t("chat.page.delete_all_chats_on_this_device"))) return; Object.values(live).forEach(l => l.abort && l.abort()); chats = []; try { localStorage.removeItem('sg.chats') } catch { } location.hash = '#/ask' };
    leaving = () => { document.removeEventListener('keydown', escStop) };
    document.addEventListener('keydown', escStop);
    statusLine();
    const initial = q.get('q');
    if (initial && !cur) { history.replaceState(null, '', '#/ask'); send(initial) }
    else if (matchMedia('(hover:hover)').matches) setTimeout(() => ta.focus({ preventScroll: true }), 60);
    const y = scrolls[here()];
    if (y != null) requestAnimationFrame(() => scrollTo(0, y)); else if (cur && cur.messages.length) scrollEnd(true); else scrollTo(0, 0);   // a new chat opens at its top
  }
  const escStop = e => { if (e.key === 'Escape' && busy()) stop() };
  function autosize() { const ta = $('#chatIn'); if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px' }
  const busy = () => cur && live[cur.id] && live[cur.id].running;
  // The optional local AI (desktop app): [ready?, the line to show]. The server version has no s.local.
  function localLine(l) {
    const message = l.message ? I18n.error(l.message) : '';
    const gb = n => (n / 1e9).toFixed(0) + " " + I18n.t("common.gb");
    return ({
      ready: [true, I18n.t("chat.localline.local_ai_ready")],
      stopped: [true, I18n.t("chat.localline.local_ai_ready_it_starts_when")],
      loading: [true, `${I18n.t("chat.localline.starting_the_local_ai")}${l.pct ? ' ' + l.pct + '%' : '…'}`],
      checking: [false, `${I18n.t("chat.localline.checking_the_local_ai_file")}${l.pct != null ? ' ' + l.pct + '%' : '…'}`],
      measuring: [false, I18n.t("chat.localline.checking_this_computer_s_memory")],
      absent: [false, I18n.t("chat.localline.no_local_ai_added")],
      wrong: [false, message || I18n.t("chat.localline.the_local_ai_file_is_not")],
      too_big: [false, message || `${I18n.t("chat.localline.the_local_ai_needs_about")} ${gb(l.needs_bytes || 0)} ${I18n.t("chat.localline.of_memory")}`],
      off: [false, I18n.t("chat.localline.local_ai_is_off")],
      error: [false, message || I18n.t("chat.localline.the_local_ai_could_not_start")],
    })[l.state] || [false, message || I18n.t("chat.localline.local_ai_unavailable")];
  }
  let polling = null;
  async function statusLine() {
    const s = await getStatus(), el = $('#chatStatus'); if (!el) return;
    const ix = s.index || {}, l = s.local;
    const still = ix.state === 'indexing' || ix.state === 'indexing (other process)' ? ` · <span class="muted">${I18n.t("chat.still.still_indexing")}${(ix.chunks || 0).toLocaleString(I18n.french ? 'fr-FR' : undefined)} ${I18n.t("chat.still.passages_so_far")}</span>` : '';
    if (l && (/ready|stopped|loading/.test(l.state) || !s.online)) {
      const [ok, line] = localLine(l);
      el.innerHTML = `<span class="${ok ? 'dotok' : 'dotoff'}"></span><span>${esc(I18n.label(line))}${ok ? still : `<span class="long"> ${I18n.t("chat.statusline.search_and_reading_still_work")}</span>`}</span>`;
    } else {
      el.innerHTML = s.online ? `<span class="dotok"></span>${I18n.t("chat.statusline.local_assistant_ready")}${still}`
        : `<span class="dotoff"></span><span>${I18n.t("chat.statusline.assistant_offline")}<span class="long"> ${I18n.t("chat.statusline.search_and_browsing_still_work")}</span></span>`;
    }
    const sb = $('#sendBtn'); if (sb) sb.title = s.online ? I18n.t("chat.composer.send") : I18n.t("chat.statusline.the_assistant_is_offline_you_will");
    setupCard(s);
    clearTimeout(polling);
    if (l && /checking|measuring|loading/.test(l.state) && $('#chatStatus')) polling = setTimeout(statusLine, 1000);
  }
  // How to add the local AI, on a new chat when it is missing, wrong or off. The file comes from the website, outside the app.
  function setupCard(s) {
    const box = $('#aiSetup'), l = s.local; if (!box) return;
    const show = !!l && !s.online && /absent|wrong|off|error/.test(l.state) && !(cur && cur.messages.length);
    box.hidden = !show;
    if (!show) return;
    box.innerHTML = l.state === 'off'
      ? `<p>${I18n.t("app.localabout.the_local_ai_is_turned_off")}</p><div class="row"><button class="btn" data-ai="on">${I18n.t("app.localabout.turn_on")}</button></div>`
      : l.state === 'error' ? `<p>${esc(l.message ? I18n.error(l.message) : I18n.t("chat.localline.the_local_ai_could_not_start"))}</p><div class="row"><button class="btn" data-ai="rescan">${I18n.t("app.localabout.look_again")}</button></div>`
      : `<p><b>${I18n.t("chat.setupcard.add_the_local_ai_to_get")}</b> ${I18n.t("chat.setupcard.it_is_about_17_gb_and")}</p>
         <div class="row"><a class="btn" href="/ui/setup.html#manage">${I18n.t("app.localabout.add_the_local_ai")}</a><button class="btn plain" data-ai="rescan">${I18n.t("app.localabout.look_again")}</button></div>
         <p class="small">${I18n.t("chat.setupcard.already_downloaded")} <code>${esc(l.file)}</code>${I18n.t('chat.setup.file_location')} <b>LastbookData</b> ${I18n.t("chat.setupcard.folder_or_downloads_then_look_again")}</p>`;
    $$('[data-ai]', box).forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await fetch('/api/assistant/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: b.dataset.ai }) }) } catch { }
      setTimeout(statusLine, 300);
    });
  }
  async function describe(about) {
    const [kind, id, n] = about.split(':');
    try {
      if (kind === 'topic') { const t = (await topics()).find(x => x.id === id); return { about, label: t ? (SHORT[id] || t.title) : id, sub: I18n.t("common.guide"), kind } }
      const d = await api('/api/doc/' + encodeURIComponent(id));
      return { about, kind, label: d.title, sub: kind === 'video' ? (n ? I18n.t("chat.describe.video_at") + " " + clock(+n) : I18n.t("common.video")) : I18n.t("common.page") + " " + (n || 1), href: kind === 'video' ? `#/watch/${encodeURIComponent(id)}${n ? '?t=' + n : ''}` : `#/read/${encodeURIComponent(id)}?p=${n || 1}` };
    } catch { return null }
  }
  function renderCtx() {
    const el = $('#ctxChip'); if (!el) return;
    const a = aboutCtx;
    if (!a) { el.hidden = true; return }
    el.hidden = false;
    el.innerHTML = `${ico(a.kind === 'video' ? 'video' : a.kind === 'topic' ? 'book' : 'page')}<span>${I18n.t("chat.renderctx.asking_about")} <b>${esc(a.label)}</b> <span class="muted">${esc(a.sub || '')}</span></span>${cur && cur.messages.length ? '' : `<button type="button" aria-label="${I18n.t("chat.renderctx.don_t_use_this_as_context")}" id="ctxX">×</button>`}`;
    const x = $('#ctxX'); if (x) x.onclick = () => { aboutCtx = null; renderCtx(); renderLog() };
  }
  function renderSide() {
    const el = $('#csList'); if (!el) return;
    el.innerHTML = chats.length ? chats.map(c => `<li><a href="#/ask/${c.id}" ${cur && cur.id === c.id ? 'aria-current="page"' : ''}><b>${esc(c.title)}</b><small>${I18n.french ? I18n.date(c.updated) : new Date(c.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${c.messages.filter(m => m.role === 'user').length} ${I18n.t("common.question_word")}${c.messages.filter(m => m.role === 'user').length > 1 ? 's' : ''}</small></a><button class="iconbtn" data-del="${c.id}" aria-label="${I18n.t("chat.renderside.delete_this_chat")}">×</button></li>`).join('')
      : `<li class="muted small" style="padding:8px 4px">${I18n.t("chat.renderside.no_chats_yet")}</li>`;
    const clr = $('#clearChats'); if (clr) clr.hidden = !chats.length;   // nothing to delete
    $$('[data-del]', el).forEach(b => b.onclick = () => { const id = b.dataset.del; live[id]?.abort?.(); chats = chats.filter(c => c.id !== id); persist(); if (cur && cur.id === id) location.hash = '#/ask'; else renderSide() });
    // the list fades at an edge with more chats past it, so a row cut off there reads as more to scroll to
    const edge = () => { const more = el.scrollHeight - el.clientHeight; el.classList.toggle('more-b', more > 1 && el.scrollTop < more - 1); el.classList.toggle('more-t', more > 1 && el.scrollTop > 1) };
    el.onscroll = edge; edge();
    if (!el.lbEdge) { el.lbEdge = new ResizeObserver(edge); el.lbEdge.observe(el) }
  }

  /* --------------------------------------------------------------- log --- */
  function renderLog() {
    const log = $('#chatLog'); if (!log) return;
    if (!cur || !cur.messages.length) {
      const st = aboutCtx ? ABOUT_STARTERS[aboutCtx.kind] || [] : null;
      log.innerHTML = `<div class="chat-empty">
        <div class="ce-mark">${ico('ask')}</div>
        <h1>${I18n.t("nav.chat")}</h1>
        <p class="lead">${I18n.t("chat.renderlog.answers_are_built_only_from_the")}</p>
        <div class="starters">${(st ? st.map(t => ['ask', t]) : STARTERS).map(([i, t]) => `<button class="starter" ${tcStyle(i)} data-start="${esc(t)}"><span class="ico">${ico(i)}</span><span>${esc(t)}</span></button>`).join('')}</div>
        <p class="small muted" style="margin-top:18px">${I18n.t("chat.renderlog.it_reads_text_only_it_can")}</p></div>`;
      $$('[data-start]', log).forEach(b => b.onclick = () => send(b.dataset.start));
      fitEmpty();
      return;
    }
    log.innerHTML = cur.messages.map((m, i) => m.role === 'user' ? `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>` : `<div class="msg bot" id="m${i}">${botHtml(m, i)}</div>`).join('');
    wire(log);
  }
  // The page itself never scrolls while a chat is empty: in a window too short for every suggestion (or with lines wrapped narrow beside
  // the chats column), the last ones go, a row at a time down to one row, then the note under them, the introduction and the mark.
  function fitEmpty() {
    const e = $('.chat-empty'); if (!e) return;
    const all = $$('.starter', e), extra = ['p.small', '.lead', '.ce-mark'].map(s => $(s, e)).filter(Boolean);
    [...all, ...extra].forEach(x => x.style.removeProperty('display'));
    const over = () => document.scrollingElement.scrollHeight > innerHeight;
    if (!over()) return;
    const shown = all.filter(x => x.offsetWidth);
    for (let k = shown.length; k > 2 && over(); k -= 2) shown.slice(k - 2, k).forEach(x => x.style.display = 'none');
    for (const x of extra) if (over()) x.style.display = 'none';
  }
  addEventListener('resize', () => { if ($('.chat-empty')) fitEmpty() });
  function updateBot(i) {
    const el = $('#m' + i); if (!el || !cur) return renderLog();
    el.innerHTML = botHtml(cur.messages[i], i); wire(el);
  }
  function botHtml(m, i) {
    const l = live[cur.id], running = l && l.running && i === cur.messages.length - 1;
    const steps = (m.steps || []).map(s => `<li>${stepText(s)}</li>`).join('');
    const found = m.sources || [];
    let h = '';
    if (running) h += `<div class="working"><b>${esc(STATES[m.state] || I18n.t("chat.bothtml.working"))}${m.state === 'starting' && m.pct ? ` ${m.pct}%` : ''}</b>${progress(m)}${steps ? `<ul class="steps">${steps}</ul>` : ''}</div>`;
    if (m.error) h += `<div class="ans-error">${ico('warn')}<div><b>${esc(I18n.error(m.error))}</b>${m.offline ? `<p>${I18n.t("chat.bothtml.you_can_keep_browsing_and_searching")}</p>` : ''}</div></div>`;
    if (m.content) h += `<div class="answer">${md(m.content, m)}</div>`;
    if (running && found.length) h += `<div class="prefound"><p class="small muted">${I18n.t("chat.bothtml.pages_found_so_far_you_can")}</p>${srcCards(found.slice(0, 6), true)}</div>`;
    if (m.fallback) h += srcCards(m.fallback, true);
    if (!running && m.content) {
      const cited = m.cited || [];
      if ((m.invalid || []).length) h += `<p class="small" style="color:var(--stop)">${I18n.t("chat.bothtml.the_model_referred_to_sources_that")}${m.invalid.join(', ')}${I18n.t("chat.bothtml.those_markers_were_removed")}</p>`;
      h += `<div class="legend small"><span><span class="lg-c">1</span> ${I18n.t("chat.bothtml.linked_to_a_page_or_video")}</span><span><span class="lg-u">${I18n.t("chat.bothtml.dotted")}</span> ${I18n.t("chat.bothtml.the_model_s_own_wording_not")}</span></div>`;
      if (cited.length) h += `<h3 class="srch">${I18n.t("chat.bothtml.sources")}${cited.length})</h3>${srcCards(cited, false)}`;
      else h += `<p class="notice small">${I18n.t("chat.bothtml.this_answer_has_no_linked_sources")}</p>`;
      const other = (m.consulted || []).filter(s => s.kind !== 'place');
      if (other.length) h += `<details class="also"><summary>${I18n.t("chat.bothtml.also_looked_at")}${other.length}${I18n.t("chat.bothtml.not_used")}</summary>${srcCards(other.slice(0, 10), true)}</details>`;
      if ((m.steps || []).length) h += `<details class="also"><summary>${I18n.t("chat.bothtml.how_it_searched")}${m.steps.length} ${m.steps.length === 1 ? I18n.t('chat.steps.one') : I18n.t('chat.steps.many')}${m.latency ? `, ${m.latency.total_s}s` : ''})</summary><ul class="steps">${steps}</ul></details>`;
      h += `<div class="ans-actions"><button class="btn plain" data-act="copy" data-i="${i}">${I18n.t("chat.bothtml.copy")}</button><button class="btn plain" data-act="save" data-i="${i}">${ico('save')}${I18n.t("chat.bothtml.save_answer")}</button><button class="btn plain" data-act="export">${I18n.t("chat.bothtml.export_chat")}</button>${i === cur.messages.length - 1 ? `<button class="btn plain" data-act="retry">${I18n.t("chat.bothtml.ask_again")}</button>` : ''}</div>`;
    }
    return h;
  }
  function stepText(s) {
    // s.args is the model's own tool call, as it sent it: use only plain text and numbers from it, never convert anything else.
    const plain = v => typeof v === 'string' || typeof v === 'number' ? v : '';
    const raw = s.args && typeof s.args === 'object' ? s.args : {}, r = s.summary || {};
    const a = { query: plain(raw.query), kind: plain(raw.kind), doc_id: plain(raw.doc_id), page: plain(raw.page), pages: raw.pages };
    if (s.name === 'search_library') return `${I18n.t("chat.steptext.searched")}${esc(a.query || '')}”${a.kind && a.kind !== 'any' ? ' (' + esc(I18n.french ? I18n.t('chat.steps.' + a.kind) : a.kind + 's') + ')' : ''} — ${r.count ?? '…'} ${I18n.t("common.passage_word")}${r.count === 1 ? '' : 's'}`;
    if (s.name === 'read_pages') {
      const pages = (Array.isArray(a.pages) ? a.pages : [a.pages]).filter(p => typeof p === 'number' || typeof p === 'string');
      return r.error ? I18n.t("chat.steptext.tried_to_read_an_unknown_document") : `${I18n.t("chat.steps.read")} ${esc(r.title || a.doc_id)}${I18n.t("chat.steptext.page")}${pages.length > 1 ? 's' : ''} ${esc(pages.join(', '))}`;
    }
    if (s.name === 'view_page') return r.error ? I18n.t("chat.steptext.couldn_t_view_that_page") : `${I18n.t("chat.steptext.looked_at_the_picture_of")} ${esc(r.title || '')}${I18n.t("chat.steptext.page")} ${esc(a.page)}`;
    if (s.name === 'get_timed_transcript') return r.error ? `${I18n.t("chat.steptext.no_transcript_for")} ${esc(r.title || I18n.t("chat.steptext.that_video"))}` : `${I18n.t("chat.steptext.read_the_transcript_of")} ${esc(r.title || '')}`;
    if (s.name === 'lookup_place') return `${I18n.t("chat.steptext.looked_up")}${esc(a.query || '')}${I18n.t("chat.steptext.on_the_offline_map")}`;
    if (s.name === 'found') return `${I18n.t("common.matched")} ${s.count} ${I18n.t("common.passage_word")}${s.count === 1 ? '' : 's'} ${I18n.t("chat.steptext.for_your_question")}`;
    return esc(s.name);
  }
  function srcHref(s) {
    if (s.kind === 'place') return `#/map?lat=${s.lat}&lon=${s.lon}&z=16&pin=${encodeURIComponent(s.title || s.name || I18n.t("chat.srchref.place_from_the_answer"))}`;
    if (s.kind === 'video') return `#/watch/${encodeURIComponent(s.doc_id)}?${s.t != null ? 't=' + Math.floor(s.t) + '&' : ''}from=${encodeURIComponent(here())}`;
    return `#/read/${encodeURIComponent(s.doc_id)}?${s.page ? 'p=' + s.page + '&' : ''}from=${encodeURIComponent(here())}`;
  }
  function srcCards(list, compact) {
    return `<div class="srccards ${compact ? 'compact' : ''}">${list.map(s => {
      let pv;
      if (s.kind === 'video') pv = `<span class="pv v">${s.thumb ? `<img loading="lazy" alt="" src="${fileUrl(s.thumb)}">` : ''}<span class="pg">${s.t != null ? clock(s.t) : I18n.t('app.videorow.video')}</span></span>`;
      else if (s.kind === 'pdf' && s.page) pv = `<span class="pv"><img loading="lazy" alt="" src="/api/page/${encodeURIComponent(s.doc_id)}/${s.page}.png?w=300" onerror="this.remove()"><span class="pg">p. ${s.page}</span></span>`;
      else pv = `<span class="pv w">${ico(s.kind === 'place' ? 'pin' : 'page')}</span>`;
      const where = s.kind === 'video' ? (s.t != null ? I18n.t("common.at_word") + " " + clock(s.t) : '') : s.page ? `${I18n.t("chat.where.page")} ${s.page}${s.pages ? ' ' + I18n.t('common.of_word') + ' ' + s.pages : ''}` : '';
      return `<a class="srccard" href="${srcHref(s)}" id="src-${esc(s.key || '')}">${pv}<span class="sc-body">${s.key ? `<span class="sc-key">${esc(s.key.replace(/^S/, ''))}</span>` : ''}<b>${esc(s.title)}</b>
        <small>${esc(s.publisher || '')}${s.year ? ' · ' + esc(s.year) : ''}${where ? ' · ' + where : ''}${s.trust ? ' · ' + esc(I18n.label(s.trust)) : ''}</small>
        ${!compact && s.excerpt ? `<span class="sc-ex">“${esc(s.excerpt.slice(0, 220))}${s.excerpt.length > 220 ? '…' : ''}”</span>` : ''}
        ${s.image ? `<span class="sc-tag">${I18n.t("chat.srccards.diagram_viewed")}</span>` : ''}</span></a>`;
    }).join('')}</div>`;
  }

  /* markdown-lite with citation chips; sentences without a citation are marked as the model's own wording */
  function md(text, m) {
    const keys = new Set((m.cited || m.sources || []).map(s => s.key));
    const cite = k => keys.has(k) || !m.cited ? `<a class="cite" href="#src-${k}" data-key="${k}" title="${I18n.t("common.source")} ${k}">${k.replace(/^S/, '')}</a>` : '';
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g, '$1<em>$2</em>')
      .replace(/\[([SM]\d+)\]/g, (_, k) => cite(k));
    const lines = text.replace(/\r/g, '').split('\n');
    let out = '', list = null, section = 'main';
    const close = () => { if (list) { out += `</${list}>`; list = null } };
    const mark = raw => {  // wrap sentences that carry no citation (main sections only)
      if (section !== 'main' || m.running) return inline(raw);
      return raw.split(/(?<=[.!?])\s+(?=[A-Z(“"])/).map(sn => /\[[SM]\d+\]/.test(sn) || sn.replace(/\*|_/g, '').trim().length < 28 || /:$/.test(sn.trim()) ? inline(sn) : `<span class="uncited" title="${I18n.t("chat.mark.not_linked_to_a_source")}">${inline(sn)}</span>`).join(' ');
    };
    for (let ln of lines) {
      const t = ln.trim();
      if (!t) { close(); continue }
      const head = /^#{1,4}\s+(.*)$/.exec(t) || /^\*\*([^*]+:)\*\*$/.exec(t) || /^\*\*([^*]+)\*\*:?$/.exec(t);
      const hText = head ? head[1] : '';
      const sec = /not found in the library/i.test(t) ? 'missing' : /sources disagree/i.test(t) ? 'disagree' : /own reasoning/i.test(t) ? 'reasoning' : null;
      if (sec || head) {
        close();
        if (out.includes('<div class="sec-')) out += '</div>';
        section = sec || (head ? 'main' : section);
        if (sec) { out += `<div class="sec-${sec}"><h4>${sec === 'missing' ? I18n.t("chat.md.not_found_in_the_library") : sec === 'disagree' ? I18n.t("app.disagree.sources_disagree") : I18n.t("chat.md.the_model_s_own_reasoning_not")}</h4>`; const rest = t.replace(/^[#*\s]*(not found in the library|sources disagree|my own reasoning \(not from the library\)|my own reasoning)[:*\s]*/i, ''); if (rest) out += `<p>${inline(rest)}</p>`; continue }
        out += `<h4>${inline(hText.replace(/:$/, ''))}</h4>`; continue;
      }
      const ul = /^[-*•]\s+(.*)$/.exec(t), ol = /^(\d+)[.)]\s+(.*)$/.exec(t);
      if (ul || ol) {
        const want = ul ? 'ul' : 'ol';
        if (list !== want) { close(); out += `<${want}>`; list = want }
        out += `<li>${mark(ul ? ul[1] : ol[2])}</li>`; continue;
      }
      close(); out += `<p>${mark(t)}</p>`;
    }
    close();
    if (out.includes('<div class="sec-')) out += '</div>';
    return out;
  }

  function wire(el) {
    $$('[data-act]', el).forEach(b => b.onclick = () => {
      const i = +b.dataset.i, m = cur.messages[i];
      if (b.dataset.act === 'copy') { navigator.clipboard?.writeText(plain(m)).then(() => toast(I18n.t("common.copied")), () => toast(I18n.t("chat.wire.couldn_t_copy"))) }
      if (b.dataset.act === 'save') {
        const q = cur.messages[i - 1]?.content || cur.title;
        toggleSave({ key: `a:${cur.id}:${i}`, title: I18n.t("chat.wire.answer") + " " + q.slice(0, 80), href: '#/ask/' + cur.id, sub: `${(m.cited || []).length} ${I18n.t("chat.wire.sources")} ${I18n.french ? I18n.date(Date.now()) : new Date().toLocaleDateString()}` }, null);
      }
      if (b.dataset.act === 'export') exportChat(cur);
      if (b.dataset.act === 'retry') { const q = cur.messages[cur.messages.length - 2]?.content; cur.messages.splice(-2, 2); send(q) }
    });
    // citation chips scroll to their card instead of changing the route
    $$('a.cite', el).forEach(a => a.onclick = e => { e.preventDefault(); const c = $('#src-' + a.dataset.key, el.closest('.msg') || el); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200) } });
  }
  function plain(m) {
    const map = Object.fromEntries((m.cited || []).map(s => [s.key, s]));
    let t = m.content.replace(/\[([SM]\d+)\]/g, (_, k) => map[k] ? `[${k.replace(/^S/, '')}]` : '');
    if ((m.cited || []).length) t += "\n\n" + I18n.t("chat.plain.sources") + "\n" + m.cited.map(s => `[${s.key.replace(/^S/, '')}] ${s.title} — ${s.publisher || ''}${s.year ? ', ' + s.year : ''}${s.page ? I18n.t("chat.steptext.page") + " " + s.page : ''}${s.t != null ? I18n.t("chat.plain.at") + " " + clock(s.t) : ''}  ${location.origin}/${srcHref(s).replace(/&?from=[^&]*/, '')}`).join('\n');
    return t;
  }
  function exportChat(c) {
    let md = `# ${c.title}${I18n.t("chat.md.n_nexported_from_lastbook_offline_library")} ${new Date().toLocaleString(I18n.french ? 'fr-FR' : undefined)}${I18n.t('chat.export.notice')}`;
    for (const m of c.messages) md += m.role === 'user' ? `${I18n.t("chat.exportchat.n_question_n_n")}${m.content}\n` : `${I18n.t("chat.exportchat.n_answer_n_n")}${m.content ? plain(m) : I18n.t('chat.export.no_answer') + (m.error || I18n.t('chat.export.stopped')) + ')'}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `survival-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500);
    toast(I18n.t("chat.exportchat.saved_as_a_file_on_this"));
  }
  // Earlier answers' [S#] keys only mean something inside their own turn; give the model readable references instead.
  function history_(c) {
    return c.messages.filter(m => m.content).map(m => {
      if (m.role !== 'assistant') return { role: m.role, content: m.content };
      const map = Object.fromEntries((m.cited || []).map(s => [s.key, s]));
      return { role: 'assistant', content: m.content.replace(/\[([SM]\d+)\]/g, (_, k) => map[k] ? `(${map[k].title}${map[k].page ? I18n.t('common.page_short') + ' ' + map[k].page : ''}${map[k].t != null ? ', ' + clock(map[k].t) : ''})` : '') };
    });
  }

  /* -------------------------------------------------------------- send --- */
  async function send(text) {
    text = (text || '').trim();
    if (!text) return;
    if (!cur) {
      cur = { id: newId(), title: text.slice(0, 70), created: Date.now(), updated: Date.now(), messages: [], about: aboutCtx ? aboutCtx.about : null, aboutInfo: aboutCtx };
      chats.unshift(cur);
      history.replaceState(null, '', '#/ask/' + cur.id);
    }
    const c = cur;
    c.messages.push({ role: 'user', content: text });
    const m = { role: 'assistant', content: '', state: 'thinking', steps: [], sources: [], running: true };
    c.messages.push(m);
    c.updated = Date.now(); persist();
    const ta = $('#chatIn'); if (ta) { ta.value = ''; autosize() }
    renderSide(); renderCtx(); renderLog(); setBusy(true); scrollEnd(true);
    const idx = c.messages.length - 1, ctl = new AbortController();
    live[c.id] = { running: true, abort: () => ctl.abort() };
    const redraw = throttle(() => { if (cur === c) { updateBot(idx); scrollEnd() } }, 80);
    try {
      const st = await getStatus();
      if (!st.online) throw Object.assign(new Error('offline'), { offline: true, why: st.local && localLine(st.local)[1] });
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history_(c).slice(0, -1).concat([{ role: 'user', content: text }]), about: c.about }), signal: ctl.signal });
      if (!r.ok || !r.body) throw new Error(I18n.t("chat.send.the_server_refused_the_question") + r.status + ').');
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let k;
        while ((k = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, k); buf = buf.slice(k + 2);
          if (!chunk.startsWith('data:')) continue;
          let ev; try { ev = JSON.parse(chunk.slice(5)) } catch { continue }
          onEvent(m, ev);
          redraw();
        }
      }
      if (m.running && !m.content && !m.error) m.error = I18n.t("chat.send.the_answer_stopped_unexpectedly");
    } catch (e) {
      if (e.name === 'AbortError') { m.stopped = true; if (!m.content) m.error = I18n.t("chat.send.stopped") }
      else if (e.offline || /model_unavailable/.test(e.message)) { m.offline = true; m.error = e.why || I18n.t("chat.send.the_local_assistant_model_isn_t"); await fallback(m, text) }
      else m.error = e.message || I18n.t("app.errorbox.something_went_wrong");
    }
    m.running = false; delete m.state;
    if (m.stopped && m.content) m.content += I18n.t('chat.stopped_note');
    live[c.id].running = false;
    c.updated = Date.now(); persist();
    if (cur === c) { updateBot(idx); setBusy(false); scrollEnd(); const t = $('#chatIn'); if (t && matchMedia('(hover:hover)').matches) t.focus({ preventScroll: true }) }
  }
  function onEvent(m, ev) {
    if (ev.type === 'state') { m.state = ev.state; m.pct = ev.pct }
    else if (ev.type === 'found') m.steps.push({ name: 'found', count: ev.count });
    else if (ev.type === 'tool') { if (ev.phase === 'start') m.steps.push({ name: ev.name, args: ev.args }); else { const s = [...m.steps].reverse().find(x => x.name === ev.name && !x.summary); if (s) s.summary = ev.summary } m.state = 'searching' }
    else if (ev.type === 'sources') m.sources = ev.sources;
    else if (ev.type === 'delta') m.content += ev.text;
    else if (ev.type === 'reset') m.content = '';
    else if (ev.type === 'done') { m.content = ev.answer; m.cited = ev.sources; m.consulted = ev.consulted; m.invalid = ev.invalid; m.latency = ev.latency; m.content = m.content.replace(/\[([SM]\d+)\]/g, (x, k) => (ev.invalid || []).includes(k) ? '' : x) }
    else if (ev.type === 'error') {
      if (ev.error === 'model_unavailable') { m.offline = true; m.error = ev.text; fallback(m, (cur.messages[cur.messages.length - 2] || {}).content || '') }
      else { m.error = ev.text; if (ev.sources) m.fallback = ev.sources.slice(0, 8) }
    }
    else if (ev.type === 'stopped') m.stopped = true;
  }
  async function fallback(m, q) {
    try { const d = await api('/api/retrieve?q=' + encodeURIComponent(q) + '&k=8'); m.fallback = d.results.map((r, i) => ({ ...r, key: '' })); if (!m.fallback.length) m.error += " " + I18n.t("chat.fallback.the_library_search_also_found_nothing") }
    catch { m.fallback = [] }
  }
  function stop() { if (cur && live[cur.id]) live[cur.id].abort() }
  function setBusy(on) {
    const b = $('#sendBtn'); if (!b) return;
    b.innerHTML = on ? '<span class="stopsq"></span>' : ico('up');
    b.setAttribute('aria-label', on ? I18n.t("chat.setbusy.stop_the_answer") : I18n.t("chat.composer.send"));
    b.classList.toggle('stop', on);
  }
  function scrollEnd(force) {
    const near = innerHeight + scrollY > document.body.scrollHeight - 260;
    if (force || near) requestAnimationFrame(() => scrollTo(0, document.body.scrollHeight));
  }
  function throttle(f, ms) { let t = 0, p = null; return () => { const n = Date.now(); if (n - t > ms) { t = n; f() } else { clearTimeout(p); p = setTimeout(() => { t = Date.now(); f() }, ms) } } }

  return { page, count };
})();
