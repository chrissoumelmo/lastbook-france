#!/usr/bin/env python3
"""Exercise real French map readers offline, including the combined pack's overlap.

  python tools/fr/verify_app_mode.py --pack /path/to/FR-43_63 \
    --place Clermont-Ferrand --place Le-Puy-en-Velay \
    --overlap /path/to/FR-63 --overlap /path/to/FR-43

No server, sockets, installation changes, or source writes. Outputs JSON proof.
"""
import argparse
import json
import math
import os
import sqlite3
import struct
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))


def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if c.isalnum())


def connect(pack, name):
    return sqlite3.connect((pack / 'derived/geo' / (name + '.sqlite')).resolve().as_uri() + '?mode=ro', uri=True)


def xy(lon, lat, z):
    s = math.sin(math.radians(lat))
    return int((lon + 180) / 360 * 2 ** z), int((.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * 2 ** z)


def commune_keys(pack):
    with connect(pack, 'places') as db:
        return {(n, round(lat, 5), round(lon, 5)) for n, lat, lon in
                db.execute("SELECT name,lat,lon FROM place WHERE kind='commune'")}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pack', type=Path, required=True)
    ap.add_argument('--place', action='append', default=[])
    ap.add_argument('--overlap', type=Path, action='append', default=[])
    a = ap.parse_args()
    os.environ['LASTBOOK_DATA'] = str(a.pack.resolve())
    from engine.setup.install import check_map
    import server
    manifest = check_map(a.pack)
    info = server.map_info()
    assert info['country'] == 'FR' and info['units'] == 'metric'
    assert info['data_date'] == '16 Nov 2026'
    assert info['credits'] == '© OpenStreetMap contributors (ODbL) · IGN (Licence Ouverte 2.0) · INSEE · La Poste · Sandre/OFB'
    assert info['bounds'] == manifest['bounds']
    assert not any(t in json.dumps(info['datasets']) for t in ('Microsoft', 'USGS', 'USDA', 'NOAA', 'USACE'))
    proof = dict(map=manifest['name'], settings={k: info[k] for k in ('country', 'units', 'data_date', 'credits', 'bounds')},
                 setup_check_map='passed', places={}, integrity={})
    for rel in manifest['files']:
        if rel.endswith('.sqlite'):
            with sqlite3.connect((a.pack / rel).resolve().as_uri() + '?mode=ro', uri=True) as db:
                result, = db.execute('PRAGMA integrity_check').fetchone()
                assert result == 'ok', (rel, result)
                proof['integrity'][Path(rel).name] = result
    for q in a.place:
        results = server.places(q)
        exact = [p for p in results if norm(p['name']) == norm(q) and p['kind'] == 'commune']
        assert len(exact) == 1 and exact[0]['onMap'], (q, results)
        p = exact[0]
        x, y = xy(p['lon'], p['lat'], 15)
        tile = json.loads(server.map_tile(15, x, y))
        assert tile['layers'].get('road') and tile['layers'].get('bldg'), q
        x, y = xy(p['lon'], p['lat'], 12)
        assert server.terrain_tile(12, x, y).startswith(b'\x89PNG'), q
        x, y = xy(p['lon'], p['lat'], 14)
        bldg = server.bldg3d(x, y)
        assert struct.unpack_from('<i', bldg)[0] > 0, q
        keys = [(r['name'].lower(), round(r['lat'], 2), round(r['lon'], 2)) for r in results]
        assert len(keys) == len(set(keys)), q
        proof['places'][q] = dict(name=p['name'], on_map=p['onMap'], canonical_matches=len(exact),
                                  vector_layers={k: len(v) for k, v in tile['layers'].items()}, building_3d_bytes=len(bldg))
    with connect(a.pack, 'places') as db:
        duplicates = db.execute('SELECT count(*) FROM (SELECT 1 FROM place GROUP BY name,kind,round(lat,5),round(lon,5) HAVING count(*)>1)').fetchone()[0]
        assert duplicates == 0
        proof['duplicate_place_rows'] = duplicates
        if a.overlap:
            assert len(a.overlap) == 2
            overlap = commune_keys(a.overlap[0]) & commune_keys(a.overlap[1])
            assert overlap
            for name, lat, lon in overlap:
                count, = db.execute("SELECT count(*) FROM place WHERE name=? AND kind='commune' AND round(lat,5)=? AND round(lon,5)=?", (name, lat, lon)).fetchone()
                assert count == 1, (name, count)
            proof['overlap_communes_present_once'] = len(overlap)
    print(json.dumps(proof, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
