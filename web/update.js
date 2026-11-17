/* Check for updates, in About (desktop app only). It runs only when the person presses Check for updates, or chooses
   Lastbook > Check for Updates… (the menu calls LBUpdate.fromMenu; no address starts it). It only says whether a newer version
   is on the website: nothing is downloaded or installed. engine/update.py does the check. */
(() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let timer = null, menuAsked = false;

  async function call(action) {
    const r = await fetch('/api/update/' + action, action === 'state' ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return r.json();
  }

  function view(s) {
    const btn = (t) => `<button class="btn plain" data-upd="check">${t}</button>`;
    const ver = s.current ? `${I18n.t("common.version")} ${E(s.current)}.` : I18n.t("update.ver.this_copy_has_no_version_number");
    switch (s.state) {
      case 'checking': return `${ver} ${I18n.t("update.view.checking_for_updates")}`;
      case 'up_to_date': return `${ver} ${I18n.t("update.view.lastbook_is_up_to_date")} ${btn(I18n.t("update.recheck"))}`;
      case 'available': return `${ver} ${I18n.t("common.version")} ${E(s.version)} ${I18n.t("update.view.is_available_download_it_from")} ${E(s.website)}${I18n.t("common.your_library_local_ai_and_chats_stay")} ${btn(I18n.t("update.recheck"))}`;
      case 'not_published': return `${ver} ${I18n.t("update.view.no_update_information_yet")} ${btn(I18n.t("common.retry"))}`;
      case 'too_old_os': case 'error': return `${ver} ${E(I18n.error(s.message))} ${btn(I18n.t("common.retry"))}`;
      default: return `${ver} ${btn(I18n.t("update.check"))}`;
    }
  }

  function paint(el, s) {
    el.innerHTML = view(s);
    clearTimeout(timer);
    if (s.state === 'checking') timer = setTimeout(() => refresh(el), 400);
  }

  async function refresh(el) {
    if (!el.isConnected) return;
    try { paint(el, await call('state')) } catch { el.textContent = I18n.t("update.refresh.lastbook_could_not_ask_about_updates") }
  }

  async function check(el) {
    try {
      const s = await call('check');
      if (s.error && !s.state) { el.textContent = I18n.error(s.error); return }
      paint(el, s);
    } catch { el.textContent = I18n.t("update.refresh.lastbook_could_not_ask_about_updates") }
  }

  window.LBUpdate = {
    card: () => `<div class="card"><b>${I18n.t("update.update.lastbook_app")}</b><small id="updBox">…</small></div>`,
    mount(root) {
      const el = root.querySelector('#updBox'); if (!el) return;
      el.addEventListener('click', e => { if (e.target.closest('[data-upd]')) check(el) });
      if (menuAsked) { menuAsked = false; return check(el) }
      refresh(el);
    },
    fromMenu() {     // Lastbook > Check for Updates…: About, then one check
      const el = document.getElementById('updBox');
      if (el && location.hash.startsWith('#/about')) return check(el);
      menuAsked = true;
      location.hash = '#/about';
    },
  };
})();
