/* Runs the shipped functions in Node; no browser, server or socket. */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../..'), web = path.join(root, 'web');
const read = name => fs.readFileSync(path.join(web, name), 'utf8');
const en = JSON.parse(read('i18n/en.json')), fr = JSON.parse(read('i18n/fr.json'));
const saved = new Map(); let reloads = 0;
const ctx = vm.createContext({ Intl, Date, console, location: { protocol: 'lastbook:', hostname: 'app', reload() { reloads++ } },
  localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) },
  document: { documentElement: { setAttribute() {} }, querySelectorAll: () => [] } });
vm.runInContext(read('i18n.js'), ctx);
const i = ctx.I18n;
assert.equal(i.t('common.start_error'), en['common.start_error']);
i.configure({}, {}, 'en');
assert.equal(i.t('common.start_error'), en['common.start_error']);
function use(choice, country = 'US', table = fr) { i.configure(en, table, choice, country) }
assert.equal(i.select(null, 'US'), 'en');
assert.equal(i.select(undefined, undefined), 'en');
assert.equal(i.select(null, 'FR'), 'fr');
assert.equal(i.select('en', 'FR'), 'en');
assert.equal(i.select('fr', 'US'), 'fr');
assert.equal(i.select('deleted-choice', 'FR'), 'fr');
assert.equal(i.select('deleted-choice', 'US'), 'en');
assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
for (const [key, value] of Object.entries(en)) {
  assert.equal(typeof fr[key], 'string', key); assert(fr[key].trim(), key);
  const slots = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  // French does not need the English noun/verb choices in this sentence.
  const englishSlots = slots(value).filter(name => key !== 'about.coverage.videos' || !['kind', 'verb'].includes(name));
  assert.deepEqual(englishSlots, slots(fr[key]), key);
}
use(null, 'FR'); assert.equal(i.language, 'fr'); assert.equal(i.t('nav.videos'), 'Vidéos');
use('fr', 'FR', {}); assert.equal(i.t('nav.videos'), 'Videos');
use('en'); assert.equal(i.label('Drinking water tap'), 'Drinking water tap');
assert.equal(i.detail('4.8 acres · Plan d’eau - gravière'), '4.8 acres · Plan d’eau - gravière');
assert.equal(i.date('16 Nov 2026'), '16 Nov 2026');
use('fr');
assert.equal(i.label('Drinking water tap'), "Point d'eau potable");
assert.equal(i.label('Version 2.0 needs macOS 15 or later.'), 'La version 2.0 demande macOS 15 ou une version plus récente.');
assert.equal(i.label('A library title with no interface key'), 'A library title with no interface key');
assert.equal(i.date('2026-11-16'), '16 nov. 2026');
assert.equal(i.date('20261116'), '16 nov. 2026');
assert.equal(i.date('16 Nov 2026'), '16 nov. 2026');
assert.equal(i.date('not a date'), 'not a date');
assert.equal(i.number(1000), '1\u202f000');
assert.equal(i.fixed(2.3, 1), '2,3');
assert.equal(i.direction('south-west'), 'sud-ouest');
assert.equal(i.direction('N'), 'nord');
assert.equal(i.detail('4.8 acres'), '1,94 ha');
assert.equal(i.detail('about 10 acres in this block'), 'environ 4,05 ha dans ce bloc');
assert.equal(i.detail('1 acre-ft stored'), '1\u202f233 m³ stockés');
assert.equal(i.detail('2,000 dams · data updated 2026-11-16'), '2\u202f000 barrages · données mises à jour le 16 nov. 2026');
assert.equal(i.detail('France · 2 km away'), 'France · 2 km');
assert.equal(i.t('map.unnamed', { kind: i.label('Drinking water tap') }), "Point d'eau potable (sans nom)");
vm.runInContext(read('map.js') + '\nthis.f = MapFormat;', ctx);
const f = ctx.f;
assert.equal(f.elevation(1000, 'metric'), '1\u202f000 m');
assert.equal(f.distance(2.3, 'metric'), '2,3 km');
assert.equal(f.distance(.45, 'us'), '450 m');
assert.equal(f.fieldValue('area_acres', 10), '4,05');
assert.equal(f.fieldValue('height_ft', 100), '30,5');
assert.equal(f.fieldValue('normal_storage_af', 1), '1\u202f233');
use('en');
assert.equal(f.distance(2.3, 'us'), '1.4 mi');
assert.equal(f.distance(2.3, 'metric'), '2.3 km');
assert.equal(f.fieldValue('area_acres', 10), 10);
assert.equal(f.elevation(1000, 'us'), '3,281 ft (1,000 m)');
vm.runInContext(read('terrain3d.js') + '\nthis.surround = TerrainStyle.surround;', ctx);
assert.deepEqual(Array.from(ctx.surround('FR')), [242 / 255, 239 / 255, 230 / 255, 1]);
assert.deepEqual(Array.from(ctx.surround('DE')), [242 / 255, 239 / 255, 230 / 255, 1]);
assert.deepEqual(Array.from(ctx.surround('US')), [.62, .76, .84, 1]);
assert.deepEqual(Array.from(ctx.surround(undefined)), [.62, .76, .84, 1]);
i.choose('fr'); assert.equal(saved.get('sg.language'), 'fr'); assert.equal(reloads, 1);
i.choose('en'); assert.equal(saved.get('sg.language'), 'en'); assert.equal(reloads, 2);
i.choose('invalid'); assert.equal(reloads, 2);
(async () => {
  const requested = [];
  ctx.fetch = async url => { requested.push(url); return { ok: true, json: async () => url.endsWith('en.json') ? en : url.endsWith('fr.json') ? fr : {country: 'FR'} } };
  saved.delete('sg.language'); await i.init(false); assert.equal(i.language, 'fr');
  assert.deepEqual(requested, ['/ui/i18n/en.json', '/ui/i18n/fr.json', '/api/ui-language']);
  saved.set('sg.language', 'en'); await i.init(true); assert.equal(i.language, 'en');
  assert.equal(requested.at(-1), '/api/setup/language');
  assert(requested.every(url => url.startsWith('/') && !url.startsWith('//')));
  ctx.localStorage = {getItem() {throw new Error('disabled')} }; await i.init(false); assert.equal(i.language, 'fr');
  process.stdout.write('i18n: keys, fallback, formats, map units, surround, local selection and startup passed\n');
})().catch(e => { console.error(e); process.exitCode = 1 });
