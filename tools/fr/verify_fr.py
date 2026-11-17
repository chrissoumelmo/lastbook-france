#!/usr/bin/env python3
"""Re-run brief 2's FR-63 proofs using SQLite files, without an HTTP server or socket.

  PYTHONPATH=DATA/sources/python_deps python tools/fr/verify_fr.py 63
Pillow decodes stored PNGs independently of the builder. The final compatibility
checks execute selected unmodified server.py functions extracted with AST, with
only file paths rebound to the built pack; importing/starting the server is avoided.
"""
import ast
import functools
import io
import json
import math
import re
import sqlite3
import struct
import sys
import threading
import zlib
from array import array
from pathlib import Path

from PIL import Image
from shapely.geometry import LineString, box

from common import REPO, parser, readonly, selection

sys.path.insert(0, str(REPO))
from engine import map_mode

CLERMONT = (3.03, 45.74, 3.16, 45.82)
LYON = (4.80, 45.73, 4.86, 45.79)


def xy(lon, lat, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def png_height(db, lon, lat):
    x, y = xy(lon, lat, 12)
    px, py = int((x % 1) * 256), int((y % 1) * 256)
    blob, = db.execute('SELECT png FROM tile WHERE z=12 AND x=? AND y=?', (int(x), int(y))).fetchone()
    rgb = Image.open(io.BytesIO(blob)).getpixel((px, py))
    return round(-10000 + (rgb[0] * 65536 + rgb[1] * 256 + rgb[2]) * .1, 1)


def unpack_geometry(blob):
    buf = array('i')
    buf.frombytes(blob)
    i, parts = 1, []
    for _ in range(buf[0]):
        n = buf[i]
        i += 1
        x = y = 0
        ring = []
        for _ in range(n):
            x += buf[i]
            y += buf[i + 1]
            i += 2
            ring.append((x / 1e6, y / 1e6))
        parts.append(ring)
    assert i == len(buf), 'Trailing geometry data'
    return parts


def feature_count(db, bounds):
    w, s, e, n = bounds
    return db.execute('SELECT count(*) FROM feat_idx WHERE maxx>=? AND minx<=? AND maxy>=? AND miny<=?',
                      (w, e, s, n)).fetchone()[0]


def building_proof(db):
    seen, count, height, lyon = set(), 0, 0, 0
    for x, y, part, n, data in db.execute('SELECT * FROM bldg'):
        buf = array('i')
        buf.frombytes(zlib.decompress(data))
        i = 0
        for _ in range(n):
            k, h, xx, yy = buf[i:i + 4]
            i += 4
            points = [(xx, yy)]
            for _ in range(k - 1):
                xx += buf[i]
                yy += buf[i + 1]
                i += 2
                points.append((xx, yy))
            key = tuple(points)
            if key in seen:
                continue
            seen.add(key)
            cx, cy = (sum(p[j] for p in points) / len(points) for j in (0, 1))
            lon = cx / 2 ** 30 * 360 - 180
            lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * cy / 2 ** 30))))
            if CLERMONT[0] <= lon <= CLERMONT[2] and CLERMONT[1] <= lat <= CLERMONT[3]:
                count += 1
                height += h > 0
            if LYON[0] <= lon <= LYON[2] and LYON[1] <= lat <= LYON[3]:
                lyon += 1
        assert i == len(buf), 'Building record length mismatch'
    assert count > 0 and lyon == 0
    return dict(unique_footprints=len(seen), clermont=count, with_height=height,
                height_share=height / count, lyon=lyon)


def reader_proof(pack):
    """Actual reader functions, actual files, no server import and no HTTP/network calls."""
    geo = pack / 'derived/geo'
    names = {'mapdb', 'national_mapdb', 'unpack', 'tile_bounds', 'clip_ring', '_map_tile',
             'ms_bucket', 'ms_buildings', 'bldg3d', 'terrain_tile', '_poi_sources',
             '_distinct', 'map_contents', 'word_sets', 'near_bonus', 'water_places'}
    tree = ast.parse((REPO / 'server.py').read_text())
    selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    assert {node.name for node in selected} == names
    ns = dict(sqlite3=sqlite3, functools=functools, math=math, json=json, re=re, struct=struct, map_mode=map_mode,
              zlib=zlib, array=array, Path=Path, _tls=threading.local(), HERE=pack, MAPDB=geo / 'map.sqlite',
              BLDGDB=geo / 'buildings.sqlite', WATERDB=geo / 'water.sqlite', TERRAINDB=geo / 'terrain.sqlite',
              TERRAIN_DETAIL=geo / 'terrain-detail.sqlite', CROPDB=geo / 'crops.sqlite',
              LIB=pack / 'library-data', EXT=512, SOCAL_CELL=.05,
              WATER_WORDS={'lake', 'lakes', 'reservoir', 'res', 'dam', 'pond', 'ponds'},
              ro_uri=lambda p: Path(p).resolve().as_uri() + '?mode=ro')
    # This pack explicitly builds an empty SoCal-cell list. No household lookup is needed.
    ns['socal_cells'] = lambda: set()
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(REPO / 'server.py'), 'exec'), ns)
    try:
        x, y = xy(3.0828, 45.7772, 15)
        tile = json.loads(ns['_map_tile'](15, int(x), int(y), 'fr-proof'))
        assert tile['layers'].get('road') and tile['layers'].get('bldg')
        contents = ns['map_contents']()
        assert contents['contours'] and 'fuel' in contents['layers']
        sources = ns['_poi_sources'](*CLERMONT)
        assert len(sources) == 1 and sources[0][0] is ns['national_mapdb']()
        x, y = xy(3.0828, 45.7772, 14)
        buildings = ns['bldg3d'](int(x), int(y))
        assert len(buildings) > 4 and struct.unpack_from('<i', buildings)[0] > 0
        x, y = xy(2.9645, 45.7724, 12)
        assert ns['terrain_tile'](12, int(x), int(y)).startswith(b'\x89PNG')
        found = {q: ns['water_places'](q) for q in ["Lac d'Aydat", 'Lac Pavin']}
        assert all(found.values())
        return dict(vector_layers={k: len(v) for k, v in tile['layers'].items()},
                    building_3d_bytes=len(buildings), map_contents=contents,
                    france_poi_source='national.sqlite', water_search={q: r[0]['name'] for q, r in found.items()},
                    method='Selected unmodified server.py functions executed offline against pack SQLite files')
    finally:
        for value in vars(ns['_tls']).values():
            if isinstance(value, sqlite3.Connection):
                value.close()


def main():
    ap = parser(__doc__)
    ap.add_argument('--pack', type=Path)
    a = ap.parse_args()
    _, code, bounds, _ = selection(a)
    if code != 'FR-63':
        raise ValueError('These geographic proof locations are specifically for FR-63')
    pack = a.pack or a.data / 'packs' / code
    geo = pack / 'derived/geo'
    report = dict(code=code, bounds=bounds, sqlite={})
    for p in sorted(geo.glob('*.sqlite')):
        with readonly(p) as db:
            result, = db.execute('PRAGMA integrity_check').fetchone()
            assert result == 'ok', p.name
            report['sqlite'][p.name] = dict(bytes=p.stat().st_size, integrity=result)
    with readonly(geo / 'national.sqlite') as db:
        essential = dict(db.execute("SELECT cls,count(*) FROM poi WHERE lon BETWEEN 3.03 AND 3.16 AND lat BETWEEN 45.74 AND 45.82 "
                                    "AND cls IN ('hospital','pharmacy','fuel') GROUP BY cls"))
        roads = db.execute("SELECT DISTINCT f.name FROM feat f JOIN feat_idx i USING(id) WHERE layer='road' "
                           "AND f.name='Boulevard François Mitterrand' AND maxx>=3.03 AND minx<=3.16 AND maxy>=45.74 AND miny<=45.82").fetchall()
        assert sum(essential.values()) >= 20 and roads
        assert feature_count(db, LYON) == 0
        assert db.execute('SELECT count(*) FROM poi WHERE lon BETWEEN 4.80 AND 4.86 AND lat BETWEEN 45.73 AND 45.79').fetchone()[0] == 0
        report['streets'] = dict(features=db.execute('SELECT count(*) FROM feat').fetchone()[0],
                                pois=db.execute('SELECT count(*) FROM poi').fetchone()[0],
                                clermont_features=feature_count(db, CLERMONT), essential_pois=essential,
                                named_road=roads[0][0], lyon_features=0)
    with readonly(geo / 'terrain.sqlite') as db:
        heights = {name: png_height(db, lon, lat) for name, lon, lat in [('puy_de_dome', 2.9645, 45.7724), ('place_de_jaude', 3.0828, 45.7772)]}
        assert abs(heights['puy_de_dome'] - 1465) <= 25 and abs(heights['place_de_jaude'] - 390) <= 25
        zooms = dict(db.execute('SELECT z,count(*) FROM tile GROUP BY z'))
        assert min(zooms) == 4 and max(zooms) == 12
        lx, ly = xy(4.83, 45.76, 12)
        assert db.execute('SELECT 1 FROM tile WHERE z=12 AND x=? AND y=?', (int(lx), int(ly))).fetchone() is None
        report['terrain'] = dict(heights_m=heights, zooms=zooms, lyon_z12_tile=False,
                                 note='Low-zoom tiles span large areas; outside-box pixels encode no source/sea level, as in the US format')
    with readonly(geo / 'places.sqlite') as db:
        queries = ['"Clermont-Ferrand"', 'Orcival', '"Saint-Nectaire"', '63000', 'orcival', 'saint nectaire']
        results = {q: db.execute('SELECT p.name,p.kind FROM place_fts f JOIN place p ON p.id=f.rowid '
                                 'WHERE place_fts MATCH ? ORDER BY p.rank LIMIT 3', (q,)).fetchall() for q in queries}
        assert all(results.values())
        assert db.execute('SELECT count(*) FROM place WHERE lon BETWEEN 4.80 AND 4.86 AND lat BETWEEN 45.73 AND 45.79').fetchone()[0] == 0
        report['places'] = results
    with readonly(geo / 'buildings.sqlite') as db:
        report['buildings'] = building_proof(db)
    with readonly(geo / 'water.sqlite') as db:
        lakes = db.execute("SELECT name,kind FROM resource WHERE name IN ('Lac d''Aydat','Lac Pavin')").fetchall()
        assert len(lakes) == 2
        allier = []
        for name, geom in db.execute("SELECT name,geom FROM feat WHERE layer='waterway' AND name LIKE '%Allier%'"):
            if any(LineString(p).intersects(box(3.03, 45.70, 3.30, 45.85)) for p in unpack_geometry(geom) if len(p) >= 2):
                allier.append(name)
        assert allier
        assert feature_count(db, LYON) == 0
        assert db.execute('SELECT count(*) FROM resource WHERE lon BETWEEN 4.80 AND 4.86 AND lat BETWEEN 45.73 AND 45.79').fetchone()[0] == 0
        report['water'] = dict(lakes=lakes, east_clermont_allier=allier,
                              resource_kinds=dict(db.execute('SELECT kind,count(*) FROM resource GROUP BY kind')), lyon=0)
    manifest = json.loads((pack / 'map-set.json').read_text())
    assert manifest['bytes'] == sum((pack / name).stat().st_size for name in manifest['files'])
    report['pack_bytes'] = manifest['bytes']
    report['reader_compatibility'] = reader_proof(pack)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
