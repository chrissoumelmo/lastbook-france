#!/usr/bin/env python3
"""Build terrain.sqlite for ARA departement lists from IGN BD ALTI 25 m ASC/GeoTIFF.

  python tools/fr/build_terrain_fr.py 63 --workers 4
Reads DATA/sources/terrain/asc recursively (or --source). Lambert-93 / IGN69 input,
bilinear sampling at WGS84 Web Mercator pixel centres. Reuses the US builder's PNG,
pixel coordinates, downsampling and actual zoom constants (MINZ=4, MAXZ=12).
Source: IGN BD ALTI, edition names retained in meta; Licence Ouverte 2.0.
"""
import math
import multiprocessing
import sqlite3
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import tifffile
from pyproj import Transformer

from common import REPO, metadata, output_path, parser, selection

sys.path.insert(0, str(REPO / 'tools'))
from build_terrain import MAXZ, MINZ, down, png, tile_lonlat

GRID = None
TRANSFORM = None
BOUNDS = None


def info(path):
    if path.suffix.lower() == '.asc':
        with path.open() as f:
            h = {k.lower(): float(v) for k, v in (f.readline().split() for _ in range(6))}
        sx = sy = h['cellsize']
        x = h.get('xllcorner', h.get('xllcenter', 0) - sx / 2)
        bottom = h.get('yllcorner', h.get('yllcenter', 0) - sy / 2)
        return int(h['nrows']), int(h['ncols']), x, bottom + h['nrows'] * sy, sx, sy, h.get('nodata_value', -99999)
    with tifffile.TiffFile(path) as tf:
        p = tf.pages[0]
        tie, scale = p.tags['ModelTiepointTag'].value, p.tags['ModelPixelScaleTag'].value
        nodata = p.tags.get('GDAL_NODATA')
        # GeoTIFF pixel-is-area, north-up. Rotated rasters must be warped before this build.
        if tie[0] or tie[1] or p.tags.get('ModelTransformationTag'):
            raise ValueError(f'Unsupported GeoTIFF transform: {path.name}')
        return p.shape[0], p.shape[1], tie[3], tie[4], scale[0], scale[1], float(nodata.value) if nodata else -99999


def load_mosaic(source, bounds):
    tr = Transformer.from_crs(4326, 2154, always_xy=True)
    w, s, e, n = tr.transform_bounds(*bounds, densify_pts=41)
    files = []
    for path in sorted(source.rglob('*')):
        if path.suffix.lower() not in ('.asc', '.tif', '.tiff'):
            continue
        rows, cols, x, y, sx, sy, nd = h = info(path)
        if x + cols * sx < w - 50 or x > e + 50 or y < s - 50 or y - rows * sy > n + 50:
            continue
        if abs(sx - 25) > 1e-6 or abs(sy - 25) > 1e-6:
            raise ValueError(f'Expected 25 m grid: {path.name}')
        files.append((path, h))
    if not files:
        raise ValueError(f'No source tiles overlap the selection in {source}')
    ox = min(h[2] for _, h in files)
    oy = max(h[3] for _, h in files)
    right = max(h[2] + h[1] * 25 for _, h in files)
    bottom = min(h[3] - h[0] * 25 for _, h in files)
    mosaic = np.full((round((oy - bottom) / 25), round((right - ox) / 25)), np.nan, np.float32)
    editions = set()
    # Fill newer editions last; overlapping department deliveries may share complete tiles.
    def date(item):
        import re
        return re.findall(r'\d{4}-\d{2}-\d{2}', str(item[0]))[:1]
    for path, h in sorted(files, key=date):
        rows, cols, x, y, sx, sy, nd = h
        if path.suffix.lower() == '.asc':
            a = np.loadtxt(path, skiprows=6, dtype=np.float32)
        else:
            a = tifffile.imread(path).astype(np.float32)
        if a.shape != (rows, cols):
            raise ValueError(f'Grid shape mismatch: {path.name}')
        rr, cc = (oy - y) / 25, (x - ox) / 25
        if abs(rr - round(rr)) > 1e-5 or abs(cc - round(cc)) > 1e-5:
            raise ValueError('Source grids are not aligned')
        r, c = round(rr), round(cc)
        valid = np.isfinite(a) & (a != nd) & (a > -1000)
        target = mosaic[r:r + rows, c:c + cols]
        target[valid] = a[valid]
        editions.add(path.relative_to(source).parts[0])
    print(f'mosaic {mosaic.shape}, {len(files)} input tiles, {mosaic.nbytes:,} bytes', flush=True)
    return (mosaic, ox, oy), sorted(editions)


def sample(lon, lat):
    a, ox, oy = GRID
    lon, lat = np.broadcast_arrays(lon[None, :], lat[:, None])
    xx, yy = TRANSFORM.transform(lon, lat)
    fc, fr = (xx - ox) / 25 - .5, (oy - yy) / 25 - .5
    c, r = np.floor(fc).astype(np.int32), np.floor(fr).astype(np.int32)
    valid = (c >= 0) & (r >= 0) & (c < a.shape[1] - 1) & (r < a.shape[0] - 1)
    c = np.clip(c, 0, a.shape[1] - 2)
    r = np.clip(r, 0, a.shape[0] - 2)
    wc, wr = fc - c, fr - r
    # Renormalise weights along NoData boundaries instead of inventing sea-level heights.
    total = np.zeros(lon.shape, np.float32)
    weight = np.zeros(lon.shape, np.float32)
    for dy, dx, wt in ((0, 0, (1 - wr) * (1 - wc)), (1, 0, wr * (1 - wc)),
                       (0, 1, (1 - wr) * wc), (1, 1, wr * wc)):
        v = a[r + dy, c + dx]
        ok = np.isfinite(v)
        total += np.where(ok, v * wt, 0)
        weight += np.where(ok, wt, 0)
    h = np.full(lon.shape, np.nan, np.float32)
    np.divide(total, weight, out=h, where=weight > 0)
    w, s, e, n = BOUNDS
    h[~valid | (lon < w) | (lon > e) | (lat < s) | (lat > n)] = np.nan
    return h


def tile_xy(lon, lat, z):
    n = 2 ** z
    return int((lon + 180) / 360 * n), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)


def job(key):
    x, y = key
    lon, lat = tile_lonlat(MAXZ, x, y, 256)
    h = sample(lon, lat)
    return key, h, int(np.isfinite(h).sum())


def main():
    global GRID, TRANSFORM, BOUNDS
    ap = parser(__doc__)
    ap.add_argument('--source', type=Path, help='ASC/GeoTIFF directory, EPSG:2154, 25 m')
    ap.add_argument('--workers', type=int, default=4, choices=range(1, 9))
    a = ap.parse_args()
    _, _, BOUNDS, _ = selection(a)
    out = output_path(a, 'terrain.sqlite')
    t0 = time.monotonic()
    GRID, editions = load_mosaic(a.source or a.data / 'sources/terrain/asc', BOUNDS)
    TRANSFORM = Transformer.from_crs(4326, 2154, always_xy=True)
    w, s, e, n = BOUNDS
    x0, y0 = tile_xy(w, n, MAXZ)
    x1, y1 = tile_xy(e, s, MAXZ)
    keys = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with sqlite3.connect(out) as db:
        db.executescript('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;'
                         'CREATE TABLE tile(z INT, x INT, y INT, png BLOB, PRIMARY KEY(z,x,y)) WITHOUT ROWID;')
        level, valid = {}, 0
        # Explicit fork shares the read-only mosaic on Linux, including Python 3.14.
        with ProcessPoolExecutor(a.workers, mp_context=multiprocessing.get_context('fork')) as pool:
            for f in as_completed([pool.submit(job, k) for k in keys]):
                key, h, count = f.result()
                valid += count
                if count:
                    level[key] = h
                    db.execute('INSERT INTO tile VALUES (?,?,?,?)', (MAXZ, *key, png(h)))
        print(f'z{MAXZ}: {len(level)} tiles, {valid:,} finite pixels', flush=True)
        for z in range(MAXZ - 1, MINZ - 1, -1):
            nxt = {}
            for x, y in sorted({(x // 2, y // 2) for x, y in level}):
                q = np.full((512, 512), np.nan, np.float32)
                for dy in (0, 1):
                    for dx in (0, 1):
                        h = level.get((2 * x + dx, 2 * y + dy))
                        if h is not None:
                            q[dy * 256:(dy + 1) * 256, dx * 256:(dx + 1) * 256] = h
                h = down(q)
                nxt[x, y] = h
                db.execute('INSERT INTO tile VALUES (?,?,?,?)', (z, x, y, png(h)))
            level = nxt
        metadata(db, a, 'Source: IGN, BD ALTI 25 m; Licence Ouverte 2.0; '
                 'reprojected EPSG:2154 / IGN69 to WGS84 Web Mercator terrain-RGB',
                 editions=editions, source_licence='https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
                 zoom_range=[MINZ, MAXZ], encoding='height_m = -10000 + (R*65536 + G*256 + B)*0.1',
                 seconds=round(time.monotonic() - t0, 2))
    print(f'{out}: {time.monotonic() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
