#!/usr/bin/env python3
"""Build bldg(x,y,part,n,data) from IGN BD TOPO BATIMENT, retaining hauteur in dm.

  python tools/fr/build_buildings_fr.py 63
Reads only BATIMENT and cleabs/hauteur from supplied department GPKGs; never address layers.
Same z14 bucket/REACH and zlib int32 footprint format as tools/build_buildings.py.
Exterior rings are stored, as in that builder; a multipart building emits one footprint per part.
Source: IGN BD TOPO 3.5, edition in source filename; Licence Ouverte 2.0.
"""
import json
import math
import sqlite3
import sys
import time
import zlib
from array import array
from pathlib import Path

import pyogrio
from pyproj import Transformer
from shapely.geometry import box

from common import REPO, metadata, output_path, parser, selection

sys.path.insert(0, str(REPO / 'tools'))
from build_buildings import REACH, WORLD


def encode(ring, height):
    """The US building record layout; source Z is roof altitude, not building height."""
    coords = list(ring.coords)
    if coords[0][:2] == coords[-1][:2]:
        coords.pop()
    if len(coords) < 3:
        return None
    pts = []
    for lon, lat, *alt in coords:
        s = math.sin(math.radians(max(-85, min(85, lat))))
        pts.append((int((lon + 180) / 360 * WORLD),
                    int((.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * WORLD)))
    rec = array('i', (len(pts), height, *pts[0]))
    lx, ly = pts[0]
    for x, y in pts[1:]:
        rec.extend((x - lx, y - ly))
        lx, ly = x, y
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    bx, by = (sum(xs) // len(xs)) >> 16, (sum(ys) // len(ys)) >> 16
    keys = {(i, j) for i in range((min(xs) + REACH) >> 16, ((max(xs) - REACH) >> 16) + 1)
            for j in range((min(ys) + REACH) >> 16, ((max(ys) - REACH) >> 16) + 1)} | {(bx, by)}
    return keys, rec


def main():
    ap = parser(__doc__)
    ap.add_argument('--gpkg', type=Path, action='append', help='BD TOPO department GPKG (repeatable)')
    a = ap.parse_args()
    codes, _, bounds, _ = selection(a)
    out = output_path(a, 'buildings.sqlite')
    files = a.gpkg or sorted(p for p in (a.data / 'sources/buildings/gpkg').rglob('*.gpkg')
                            if any(f'D{c.zfill(3)}' in p.name for c in codes))
    if not files:
        raise ValueError('No selected BD TOPO GPKGs; supply --gpkg')
    t0 = time.monotonic()
    seen, counts = set(), dict(buildings=0, with_height=0, footprints=0, skipped=0)
    editions = []
    with sqlite3.connect(out) as db:
        db.executescript('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;'
                         'CREATE TABLE bldg(x INT, y INT, part INT, n INT, data BLOB, PRIMARY KEY(x,y,part)) WITHOUT ROWID;')
        for part, path in enumerate(files):
            layer = next(name for name, _ in pyogrio.list_layers(path) if name.lower() == 'batiment')
            crs = pyogrio.read_info(path, layer=layer)['crs']
            tr = Transformer.from_crs(4326, crs, always_xy=True)
            frame = pyogrio.read_dataframe(path, layer=layer, columns=['cleabs', 'hauteur'],
                                          bbox=tr.transform_bounds(*bounds, densify_pts=41)).to_crs(4326)
            frame.geometry = frame.geometry.intersection(box(*bounds))
            tiles = {}
            for row in frame.itertuples():
                if row.cleabs in seen:
                    continue
                seen.add(row.cleabs)
                geom = row.geometry
                if geom is None or geom.is_empty or geom.geom_type not in ('Polygon', 'MultiPolygon'):
                    counts['skipped'] += 1
                    continue
                h = float(row.hauteur) if row.hauteur is not None else float('nan')
                dm = int(round(h * 10)) if math.isfinite(h) and h > 0 else 0
                counts['buildings'] += 1
                counts['with_height'] += dm > 0
                for poly in (geom.geoms if geom.geom_type == 'MultiPolygon' else (geom,)):
                    result = encode(poly.exterior, dm)
                    if result is None:
                        continue
                    keys, rec = result
                    counts['footprints'] += 1
                    for key in keys:
                        bucket = tiles.setdefault(key, [array('i'), 0])
                        bucket[0].extend(rec)
                        bucket[1] += 1
            db.executemany('INSERT INTO bldg VALUES (?,?,?,?,?)',
                           [(x, y, part, n, zlib.compress(buf.tobytes(), 6)) for (x, y), (buf, n) in tiles.items()])
            editions.append(path.name)
            print(path.name, json.dumps(counts), flush=True)
        metadata(db, a, 'Source: IGN, BD TOPO 3.5; Licence Ouverte 2.0; BATIMENT exterior footprints, '
                 'EPSG:2154 to WGS84, hauteur (metres) rounded to decimetres; unknown height = 0',
                 editions=editions, counts=counts, seconds=round(time.monotonic() - t0, 2))
    print(f'{out}: {time.monotonic() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
