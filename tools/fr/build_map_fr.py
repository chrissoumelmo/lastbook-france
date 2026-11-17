#!/usr/bin/env python3
"""Clip Geofabrik free GPKGs to departement union + 0.15 deg; run tools/build_map.py.

Example (run under a 20 GiB memory cap):
  .venv/bin/python repo/tools/fr/build_map_fr.py 63
Reads DATA/sources/osm/*.gpkg, deduplicates OSM IDs within each layer, and clips geometry.
Original regional GPKGs/ZIPs are unchanged. New clipped input stays under sources/osm/.
Source: OpenStreetMap contributors / Geofabrik, ODbL 1.0.
"""
import json
import sqlite3
import subprocess
import sys
import time

import geopandas as gpd
import pandas as pd
import pyogrio
from shapely.geometry import box

from common import REPO, metadata, output_path, parser, selection

LAYERS = ('water_a', 'natural_a', 'landuse_a', 'protected_areas_a', 'waterways', 'railways',
          'roads', 'buildings_a', 'places', 'pois', 'pois_a', 'natural')


def add_traffic_pois(db, sources, bounds):
    """Geofabrik stores fuel in traffic layers, which the inherited US builder omits.

    Keep that small adapter here instead of changing the existing builder. It is
    idempotent, and reads only public fuel-station rows, never addresses.
    """
    clip, seen = box(*bounds), set()
    existing = {(name or '', round(lon, 6), round(lat, 6))
                for name, lon, lat in db.execute("SELECT name,lon,lat FROM poi WHERE cls='fuel'")}
    pid, = db.execute('SELECT coalesce(max(id),0) FROM poi').fetchone()
    added = 0
    for suffix in ('traffic', 'traffic_a'):
        layer = 'gis_osm_' + suffix + '_free'
        for path in sources:
            df = pyogrio.read_dataframe(path, layer=layer, bbox=bounds, where="fclass='fuel'")
            for row in df.itertuples():
                key = suffix, row.osm_id
                if key in seen:
                    continue
                seen.add(key)
                geom = row.geometry.intersection(clip)
                if geom.is_empty:
                    continue
                p = geom.representative_point()
                key = row.name or '', round(p.x, 6), round(p.y, 6)
                if key in existing:
                    continue
                existing.add(key)
                pid += 1
                db.execute('INSERT INTO poi VALUES (?,?,?,?,?)', (pid, 'fuel', row.name, p.x, p.y))
                added += 1
    return added


def main():
    ap = parser(__doc__)
    ap.add_argument('--gpkg', type=str, action='append', help='source GPKG (repeatable)')
    ap.add_argument('--clipped', type=str, help='new clipped GPKG path')
    a = ap.parse_args()
    codes, code, bounds, _ = selection(a)
    out = output_path(a, 'map.sqlite')
    from pathlib import Path
    sources = [Path(p) for p in a.gpkg] if a.gpkg else sorted((a.data / 'sources/osm').glob('*.gpkg'))
    sources = [p for p in sources if not p.name.startswith('clipped_')]
    if not sources:
        raise ValueError('No input GPKGs; extract regional source copies first')
    clipped = Path(a.clipped) if a.clipped else a.data / 'sources/osm' / ('clipped_' + code.lower().replace('-', '_') + '.gpkg')
    if clipped.exists():
        raise FileExistsError(f'Refusing to replace {clipped}; choose --clipped')
    clip = box(*bounds)
    t0 = time.monotonic()
    for suffix in LAYERS:
        layer = 'gis_osm_' + suffix + '_free'
        frames = [pyogrio.read_dataframe(p, layer=layer, bbox=bounds) for p in sources]
        df = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs=frames[0].crs)
        df = df.drop_duplicates(subset=['osm_id'])
        df.geometry = df.geometry.intersection(clip)
        df = df[~df.geometry.is_empty & df.geometry.notna()]
        # Geofabrik source MultiPolygons are expected by the US builder; clipped geometries
        # may be Polygons or MultiPolygons, both supported by its WKB decoder.
        pyogrio.write_dataframe(df, clipped, layer=layer, driver='GPKG',
                                layer_options={'GEOMETRY_NAME': 'geom'})
        print(f'{layer}: {len(df):,}', flush=True)
    subprocess.run([sys.executable, str(REPO / 'tools/build_map.py'), str(clipped), str(out)], check=True)
    with sqlite3.connect(out) as db:
        fuel = add_traffic_pois(db, sources, bounds)
        metadata(db, a, '© OpenStreetMap contributors; Geofabrik free GeoPackages; ODbL 1.0',
                 data_as_of='2026-11-16', sources=[p.name for p in sources],
                 source_licence='https://opendatacommons.org/licenses/odbl/1-0/',
                 transform='Merged by OSM ID within each layer; geometry clipped to padded union box',
                 fuel_from_traffic=fuel,
                 seconds=round(time.monotonic() - t0, 2))
    print(out, flush=True)


if __name__ == '__main__':
    main()
