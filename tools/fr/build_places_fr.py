#!/usr/bin/env python3
"""Build the US-compatible place/place_fts schema for ARA departement lists.

  python tools/fr/build_places_fr.py 63
Inputs: INSEE COG commune CSV (2026), administrative commune polygons (2026, 100 m),
La Poste official postcode CSV, and named places/public POIs from M1 map.sqlite.
Commune centroids are computed in Lambert-93 then transformed to WGS84.
INSEE/La Poste: Licence Ouverte 2.0. Contours/OSM: ODbL 1.0; credits in meta.
"""
import csv
import json
import sqlite3
import struct
import time
import unicodedata
from pathlib import Path

import pyogrio

from common import metadata, output_path, parser, readonly, selection


def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if c.isalnum())


def main():
    ap = parser(__doc__)
    ap.add_argument('--communes', type=Path)
    ap.add_argument('--insee', type=Path)
    ap.add_argument('--postcodes', type=Path)
    ap.add_argument('--map', type=Path)
    a = ap.parse_args()
    _, code, bounds, _ = selection(a)
    w, s, e, n = bounds
    out = output_path(a, 'places.sqlite')
    root = a.data / 'sources'
    t0 = time.monotonic()
    communes = a.communes or root / 'boundaries/communes_2026_100m.geojson.gz'
    with (a.insee or root / 'places/v_commune_2026.csv').open(encoding='utf-8-sig', newline='') as f:
        cog = {r['COM']: r for r in csv.DictReader(f) if r['TYPECOM'] == 'COM'}
    raw = (a.postcodes or root / 'places/laposte_hexasmal.csv').read_bytes()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('cp1252')
    postal = {}
    for r in csv.DictReader(text.splitlines(), delimiter=';'):
        key = r.get('#Code_commune_INSEE') or r.get('Code_commune_INSEE')
        postal.setdefault(key, set()).add(r['Code_postal'])
    frame = pyogrio.read_dataframe('/vsigzip/' + str(communes.resolve()), bbox=bounds)
    centres = frame.to_crs(2154).geometry.centroid.to_crs(4326)
    seen, commune_names, counts = set(), {}, {'communes': 0, 'postcodes': 0, 'osm': 0}
    with sqlite3.connect(out) as db:
        db.executescript("CREATE TABLE place(id INTEGER PRIMARY KEY, name TEXT, kind TEXT, detail TEXT, lat REAL, lon REAL, rank INTEGER, source TEXT);"
                         "CREATE VIRTUAL TABLE place_fts USING fts5(name, detail, content='place', content_rowid='id', tokenize='unicode61 remove_diacritics 2');")
        def add(name, kind, detail, lat, lon, rank, source):
            key = (norm(name), kind, round(lon, 5), round(lat, 5))
            if key in seen:
                return False
            seen.add(key)
            db.execute('INSERT INTO place(name,kind,detail,lat,lon,rank,source) VALUES (?,?,?,?,?,?,?)',
                       (name, kind, detail, lat, lon, rank, source))
            return True
        unmatched = []
        for (_, row), centre in zip(frame.iterrows(), centres):
            lon, lat = centre.x, centre.y
            if not (w <= lon <= e and s <= lat <= n):
                continue
            r = cog.get(row['code'])
            if not r:
                unmatched.append(row['code'])
                continue
            name = r['LIBELLE']
            post = sorted(postal.get(row['code'], set()))
            detail = f"Commune, département {r['DEP']}, INSEE {r['COM']}" + (', ' + ' / '.join(post) if post else '')
            counts['communes'] += add(name, 'commune', detail, lat, lon, 1, 'INSEE COG 2026 / Contours administratifs 2026')
            commune_names.setdefault(norm(name), []).append((lon, lat))
            for pc in post:
                counts['postcodes'] += add(pc, 'postcode', name + ', département ' + r['DEP'], lat, lon, 2,
                                           'La Poste, Base officielle des codes postaux')
        with readonly(a.map or a.data / code / 'derived/geo/map.sqlite') as src:
            rows = list(src.execute("SELECT cls,name,lon,lat FROM poi WHERE name IS NOT NULL AND name<>''"))
            for cls, name, g in src.execute("SELECT cls,name,geom FROM feat WHERE layer='place' AND name IS NOT NULL AND name<>''"):
                _, _, x, y = struct.unpack_from('<iiii', g)
                lon, lat = x / 1e6, y / 1e6
                # COG remains the canonical town result where OSM names the same settlement.
                if any((lon - x0) ** 2 + (lat - y0) ** 2 < .03 ** 2 for x0, y0 in commune_names.get(norm(name), [])):
                    continue
                rows.append((cls, name, lon, lat))
            for cls, name, lon, lat in rows:
                if w <= lon <= e and s <= lat <= n:
                    counts['osm'] += add(name, cls.replace('_', ' '), 'OpenStreetMap, ' + code, lat, lon, 4, 'OpenStreetMap')
        db.execute("INSERT INTO place_fts(place_fts) VALUES ('rebuild')")
        metadata(db, a, 'INSEE COG, 1 January 2026 (Source : Insee); La Poste Base officielle des codes postaux '
                 '(retrieved 2026-11-17), Licence Ouverte 2.0; Contours administratifs 2026 '
                 '(data.gouv.fr / IGN, 100 m, ODbL 1.0); © OpenStreetMap contributors / Geofabrik, 2026-11-16, ODbL 1.0',
                 transform='Commune polygon area centroids in EPSG:2154, transformed to EPSG:4326; joined by INSEE COM code; FTS accent folding',
                 counts=counts, unmatched_cog=unmatched, seconds=round(time.monotonic() - t0, 2))
    print(json.dumps(counts), f'{time.monotonic() - t0:.1f}s', out, flush=True)


if __name__ == '__main__':
    main()
