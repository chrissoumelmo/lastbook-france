/* Load only bundled files, after the interface language is known. */
(async () => {
  'use strict';
  const setup = document.documentElement.classList.contains('setup-page');
  try {
    await I18n.init(setup);
    const files = setup ? ['setup.js?v=6'] : ['terrain3d.js?v=10', 'map.js?v=43', 'chat.js?v=11', 'update.js?v=2', 'words.js?v=1', 'app.js?v=20'];
    for (const file of files) await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = '/ui/' + file;
      script.onload = resolve; script.onerror = reject; document.body.append(script);
    });
  } catch {
    const el = document.getElementById('main');
    if (el) el.textContent = I18n.t('common.start_error');
  }
})();
