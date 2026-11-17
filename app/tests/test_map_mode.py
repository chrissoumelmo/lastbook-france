"""Map metadata and formatting, without a browser or local server."""
import json
import tempfile
import unittest
from pathlib import Path

from engine import map_mode

ROOT = Path(__file__).resolve().parents[2]
FR_CREDITS = '© OpenStreetMap contributors (ODbL) · IGN (Licence Ouverte 2.0) · INSEE · La Poste · Sandre/OFB'


class MapFixture:
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name)

    def write(self, **fields):
        (self.data / 'map-set.json').write_text(json.dumps(fields))

class MapMode(MapFixture, unittest.TestCase):
    def test_us_defaults(self):
        old = dict(country='US', units='us', credits='© OpenStreetMap contributors · Microsoft buildings · USGS · USDA · NOAA · USACE · CDFW · CalGEM · Natural Earth', data_date='25 Oct 2026')
        self.assertEqual(map_mode.settings(self.data), old)
        self.write(name='CA', files={})
        self.assertEqual(map_mode.settings(self.data), old)

    def test_french_metadata(self):
        self.write(country='FR', units='metric', data_date='2026-11-16', credits=[
            dict(text=t, licence='test') for t in FR_CREDITS.split(' · ')])
        self.assertEqual(map_mode.settings(self.data), dict(country='FR', units='metric', credits=FR_CREDITS, data_date='16 Nov 2026'))

    def test_bad_optional_metadata(self):
        self.write(credits=[None], data_date='not a date')
        self.assertEqual(map_mode.settings(self.data)['credits'], map_mode.US_CREDITS)
        self.assertEqual(map_mode.settings(self.data)['data_date'], '25 Oct 2026')


class MapFormatting(unittest.TestCase):
    def test_js_formats(self):
        import shutil
        import subprocess
        node = shutil.which('node')
        if not node:
            self.skipTest('needs node')
        script = r'''
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = vm.createContext({location: {protocol: 'lastbook:', hostname: 'lastbook.invalid'}, devicePixelRatio: 1});
let source = fs.readFileSync(process.argv[1], 'utf8');
// Expose private rendering functions only in this VM; production exports stay small.
source = source.replace('return { page, stop };', 'return { page, stop, paint, contours, setState: s => { st = s } };');
vm.runInContext(source + '\nthis.format = MapFormat; this.view = MapView;', ctx);
const f = ctx.format;
assert.equal(f.distance(.45, 'metric'), '450 m');
assert.equal(f.distance(1, 'metric'), '1.0 km');
assert.equal(f.distance(12.34, 'metric'), '12 km');
assert.equal(f.distance(.45), '450 m');
assert.equal(f.distance(1.6), '1.0 mi');
assert.equal(f.distance(16), '10 mi');
assert.equal(f.elevation(100, 'metric'), '100 m');
assert.equal(f.elevation(100), '328 ft (100 m)');
assert.equal(f.elevation(-10, 'metric'), '-10 m');
assert.equal(f.scale(500, 'metric'), '500 m');
assert.equal(f.scale(2000, 'metric'), '2 km');
assert.equal(f.scale(500), '500 m · 1641 ft');
assert.equal(f.scale(2000), '2 km · 1.2 mi');
assert.equal(f.contourFactor('metric'), 1);
assert.equal(f.contourFactor(), 3.28084);
assert.equal(f.contourRules('metric')[0][1], 50);
assert.equal(f.contourRules()[0][1], 200);
assert.equal(f.contourLabel(250, 'metric'), '250 m');
assert.equal(f.contourLabel(1000), '1,000 ft');
const view = ctx.view, stop = {};
for (const [country, colour] of [['FR', '#f2efe6'], ['US', '#aad3df']]) {
  const g = {setTransform() {}, fillRect() { assert.equal(this.fillStyle, colour); throw stop }};
  view.setState({country, cv: {clientWidth: 600, clientHeight: 400, width: 600, height: 400}, ctx: g});
  assert.throws(() => view.paint(), e => e === stop);
}
const t = {h: Float32Array.from({length: 65536}, (_, i) => (i % 256) * 260 / 255), contours: {}};
view.setState({units: 'metric'});
const metric = view.contours(t, 50);
assert.deepEqual(Array.from(metric, l => l.lev), [50, 100, 150, 200, 250]);
assert.equal(metric.filter(l => l.index).length, 1);
assert.equal(metric.find(l => l.index).lev, 250);
assert(Math.abs(metric[0].seg[0] - (50 / 260 * 255 + .5)) < .001);
view.setState({units: 'us'});
const us = view.contours(t, 200);
assert.deepEqual(Array.from(us, l => l.lev), [200, 400, 600, 800]);
assert(Math.abs(us[0].seg[0] - (200 / 3.28084 / 260 * 255 + .5)) < .001);
'''
        r = subprocess.run([node, '-e', script, str(ROOT / 'web/map.js')], capture_output=True, text=True, timeout=20)
        self.assertEqual(r.returncode, 0, r.stderr)


class MapSearch(MapFixture, unittest.TestCase):
    def test_installed_box_and_original_us_area(self):
        self.write(country='FR', bounds=[2.238059, 45.137066, 4.135346, 46.406594])
        self.assertTrue(map_mode.on_map(map_mode.settings(self.data), 45.65645, 2.83882))  # Orcival
        self.assertFalse(map_mode.on_map(map_mode.settings(self.data), 45.764, 4.8357))  # Lyon
        self.assertFalse(map_mode.on_map(map_mode.settings(self.data), 34.05, -118.25, True))
        self.assertTrue(map_mode.on_map(map_mode.settings(self.data), 45.137066, 2.238059))
        self.write(name='CA')
        self.assertTrue(map_mode.on_map(map_mode.settings(self.data), 34.05, -118.25))
        self.assertFalse(map_mode.on_map(map_mode.settings(self.data), 45.65645, 2.83882))
        self.assertTrue(map_mode.on_map(map_mode.settings(self.data), 40.7, -74, True))  # old content-pack behaviour

    def test_search_uses_installed_box(self):
        import sqlite3
        from unittest.mock import patch
        import server
        path = self.data / 'places.sqlite'
        with sqlite3.connect(path) as db:
            db.executescript("CREATE TABLE place(id INTEGER PRIMARY KEY,name,kind,detail,lat,lon,rank,source);"
                             "CREATE VIRTUAL TABLE place_fts USING fts5(name,detail,content='place',content_rowid='id');")
            db.executemany('INSERT INTO place VALUES (?,?,?,?,?,?,?,?)', [
                (1, 'Orcival', 'commune', 'France', 45.65645, 2.83882, 1, 'INSEE'),
                (2, 'Los Angeles', 'city', 'California', 34.05, -118.25, 1, 'GNIS')])
            db.execute("INSERT INTO place_fts(place_fts) VALUES ('rebuild')")
        with patch.multiple(server, HERE=self.data, PLACEDB=path, WATERDB=self.data / 'absent.sqlite',
                            national_mapdb=lambda: None, pack_info=lambda: None, home_area=lambda: None):
            self.write(country='FR', bounds=[2.238059, 45.137066, 4.135346, 46.406594])
            self.assertTrue(server.places('Orcival')[0]['onMap'])
            self.assertFalse(server.places('Los Angeles')[0]['onMap'])
            self.write(name='base')
            self.assertTrue(server.places('Los Angeles')[0]['onMap'])
            self.assertFalse(server.places('Orcival')[0]['onMap'])

    def test_water_distance_units(self):
        self.assertEqual(map_mode.away(2, 'metric'), ' · 2 km away')
        self.assertEqual(map_mode.away(.4, 'metric'), ' · 400 m away')
        self.assertEqual(map_mode.away(2, 'us'), ' · 1 mi away')
        self.assertEqual(map_mode.away(.4, 'us'), ' · nearby')
