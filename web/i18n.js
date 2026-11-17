/* Local interface text. Library documents, place names and answers are left as written. */
(function (root) {
  'use strict';
  // This one fallback remains readable if a bundled translation file cannot be opened.
  const bootstrap = { 'common.start_error': 'Lastbook could not open. Close it and open it again.' };
  let language = 'en', english = { ...bootstrap }, french = {}, byText = new Map(), patterns = [];
  const supported = v => v === 'en' || v === 'fr';
  const select = (choice, country) => supported(choice) ? choice : country === 'FR' ? 'fr' : 'en';
  function saved() { try { return localStorage.getItem('sg.language') } catch { return null } }
  function configure(en, fr, choice, country) {
    english = { ...bootstrap, ...(en || {}) }; french = fr || {}; language = select(choice, country);
    byText = new Map(Object.entries(english).map(([key, value]) => [value, key]));
    patterns = Object.entries(english).filter(([key]) => key.startsWith('server.pattern.')).map(([key, value]) => {
      const names = [];
      const escaped = value.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (_, name) => { names.push(name); return '(.+?)' });
      return { key, names, re: new RegExp('^' + escaped + '$') };
    });
  }
  function parameter(name, value) {
    if (['count', 'states'].includes(name) && /^[\d,.]+$/.test(value)) return number(Number(value.replace(/,/g, '')));
    if (name === 'date') return date(value);
    return label(value);
  }
  function t(key, values = {}) {
    const text = (language === 'fr' && french[key]) || english[key] || key;
    return text.replace(/\{(\w+)\}/g, (all, name) => Object.hasOwn(values, name) ? String(values[name]) : all);
  }
  // Only interface labels use this lookup, at their display sites. Never walk or rewrite library data.
  function label(value) {
    if (value == null) return '';
    const key = byText.get(String(value));
    if (key) return t(key);
    if (language === 'fr' && /^\d+(?:\.\d+)? GB$/.test(value)) return number(parseFloat(value)) + ' ' + t('common.gb');
    if (language === 'fr') for (const p of patterns) {
      const match = p.re.exec(String(value));
      if (match) return t(p.key, Object.fromEntries(p.names.map((name, i) => [name, parameter(name, match[i + 1])])));
    }
    if (language === 'fr' && String(value).includes('. ')) return String(value).split(/(?<=\.) /).map(part => {
      const exact = byText.get(part); if (exact) return t(exact);
      for (const p of patterns) { const m = p.re.exec(part); if (m) return t(p.key, Object.fromEntries(p.names.map((name, i) => [name, parameter(name, m[i + 1])]))); }
      return part;
    }).join(' ');
    return String(value);
  }
  const number = (n, options) => new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : undefined, options).format(n);
  const fixed = (n, digits) => language === 'fr' ? number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : n.toFixed(digits);
  function date(value, options) {
    if (language !== 'fr') return value;
    // Calendar dates use UTC so a map date never moves back a day in another time zone.
    let input = typeof value === 'string' && /^\d{8}$/.test(value) ? value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : value;
    const legacy = typeof input === 'string' && /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(input);
    if (legacy) {
      const month = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ').indexOf(legacy[2]);
      if (month >= 0) input = Date.UTC(+legacy[3], month, +legacy[1]);
    }
    const d = new Date(input);
    const calendar = !!legacy || typeof value === 'string' && /^(?:\d{8}|\d{4}-\d{2}-\d{2})$/.test(value);
    return isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', options || { day: 'numeric', month: 'short', year: 'numeric', ...(calendar ? { timeZone: 'UTC' } : {}) }).format(d);
  }
  const placeLabel = cls => english['map.place.' + cls] ? t('map.place.' + cls) : '';
  function direction(value) {
    const key = 'map.direction.' + String(value).toLowerCase();
    return english[key] ? t(key) : value;
  }
  function apply(root = document) {
    root.documentElement?.setAttribute('lang', language);
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n) });
    root.querySelectorAll('[data-i18n-attrs]').forEach(el => {
      for (const [attr, key] of Object.entries(JSON.parse(el.dataset.i18nAttrs))) el.setAttribute(attr, t(key));
    });
  }
  function choose(choice) {
    if (!supported(choice)) return;
    try { localStorage.setItem('sg.language', choice) } catch { }
    language = choice;
    // Screen constants are translated when loaded. A reload also clears map and chat timers.
    location.reload();
  }
  function error(value) {
    const text = label(value);
    return language !== 'fr' || text !== String(value) || Object.values(french).includes(text) ? text : t('common.error');
  }
  function detail(value) {
    if (!value || language !== 'fr') return value;
    const part = text => {
      const acres = /^([\d,.]+) acres$/.exec(text);
      if (acres) return fixed(Number(acres[1].replace(/,/g, '')) * 0.40468564224, 2) + ' ha';
      const crop = /^about ([\d,.]+) acres in this block$/.exec(text);
      if (crop) return t('server.pattern.crop_area', { count: fixed(Number(crop[1].replace(/,/g, '')) * 0.40468564224, 2) });
      const storage = /^([\d,.]+) acre-ft stored$/.exec(text);
      if (storage) return t('server.pattern.storage', { count: number(Math.round(Number(storage[1].replace(/,/g, '')) * 1233.48184)) });
      return label(text.replace(/([\d,.]+) (km|m|mi) away/g, (_, n, unit) => number(Number(n.replace(/,/g, ''))) + ' ' + unit));
    };
    // Whole messages can contain a date or several clauses. Area summaries need unit conversion first.
    if (!/acres|acre-ft/.test(value)) {
      const translated = label(value);
      if (translated !== value) return translated;
    }
    return String(value).split(' · ').map(part).join(' · ');
  }
  async function init(setup) {
    const read = path => fetch(path).then(r => { if (!r.ok) throw new Error('local file'); return r.json() });
    const [en, fr, context] = await Promise.all([
      read('/ui/i18n/en.json'), read('/ui/i18n/fr.json').catch(() => ({})),
      read(setup ? '/api/setup/language' : '/api/ui-language').catch(() => ({})),
    ]);
    configure(en, fr, saved(), context.country);
    apply();
  }
  root.I18n = Object.freeze({ t, label, error, detail, number, fixed, date, direction, placeLabel, select, configure, apply, choose, init,
    get language() { return language }, get french() { return language === 'fr' } });
})(globalThis);
