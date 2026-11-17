"""Shared, offline-first French map build helpers (no app/runtime dependencies).

All builders select a union of departement bounding boxes, expanded by 0.15 degrees.
Sources are kept outside the checkout. Existing outputs are never replaced implicitly.
"""
import argparse
import gzip
import hashlib
import json
import shutil
import sqlite3
import time
import urllib.request
from pathlib import Path

from shapely.geometry import box, shape

REPO = Path(__file__).resolve().parents[2]
PROJECT = REPO.parent
DATA = PROJECT / 'data'
SOURCES = DATA / 'sources'
ARA = ('01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74')
BOUNDARY = SOURCES / 'boundaries/departements_2026_5m.geojson.gz'
BOUNDARY_URL = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2026/geojson/departements-5m.geojson.gz'
BOUNDARY_CREDIT = ('Contours administratifs 2026, data.gouv.fr / IGN ADMIN EXPRESS; '
                   '5 m generalisation, edition 2026; ODbL 1.0; bounding box expanded by 0.15 degrees')


def parser(description):
    ap = argparse.ArgumentParser(description=description)
    ap.add_argument('departements', nargs='+', help='ARA codes, e.g. 63 or 01 03 07 15 26 38 42 43 63 69 73 74')
    ap.add_argument('--data', type=Path, default=DATA, help='source/output data root outside the checkout')
    ap.add_argument('--output', type=Path, help='new output file (default: DATA/CODE/derived/geo/NAME)')
    ap.add_argument('--boundaries', type=Path, default=BOUNDARY)
    return ap


def selection(args):
    codes = sorted({c.removeprefix('FR-').zfill(2) for c in args.departements})
    if not codes or set(codes) - set(ARA):
        raise ValueError(f'Expected ARA departements from {ARA}; got {codes}')
    with gzip.open(args.boundaries, 'rt', encoding='utf-8') as f:
        features = json.load(f)['features']
    selected = [shape(f['geometry']) for f in features if f['properties']['code'] in codes]
    if len(selected) != len(codes):
        raise ValueError('Missing departement boundaries')
    bounds = (min(g.bounds[0] for g in selected) - .15,
              min(g.bounds[1] for g in selected) - .15,
              max(g.bounds[2] for g in selected) + .15,
              max(g.bounds[3] for g in selected) + .15)
    code = 'FR-' + codes[0] if len(codes) == 1 else ('FR-ARA' if tuple(codes) == ARA else 'FR-' + '_'.join(codes))
    neighbours = [f['properties']['code'] for f in features if shape(f['geometry']).intersects(box(*bounds))]
    return codes, code, bounds, neighbours


def output_path(args, name):
    _, code, _, _ = selection(args)
    path = args.output or args.data / code / 'derived/geo' / name
    if path.exists():
        raise FileExistsError(f'Refusing to replace {path}; choose --output for a new build')
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def metadata(db, args, source, **extra):
    codes, code, bounds, _ = selection(args)
    db.execute('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)')
    values = dict(source=source, boundary_source=BOUNDARY_CREDIT, departements=','.join(codes),
                  code=code, bounds=','.join(f'{v:.6f}' for v in bounds),
                  built=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), **extra)
    db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)',
                   [(k, v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)) for k, v in values.items()])


def readonly(path):
    return sqlite3.connect(f'{Path(path).resolve().as_uri()}?mode=ro', uri=True)


def download(url, path, expected_bytes=None):
    """Keep a source unchanged; check free disk before every download, including unknown lengths."""
    path = Path(path)
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    reserve = 40_000_000_000
    free = shutil.disk_usage(path.parent).free
    if free - (expected_bytes or 0) < reserve:
        raise RuntimeError(f'Less than 40 GB would remain: {free} bytes free')
    request = urllib.request.Request(url, headers={'User-Agent': 'Lastbook-France-build/1.0'})
    with urllib.request.urlopen(request, timeout=120) as response:
        size = int(response.headers.get('Content-Length') or expected_bytes or 0)
        if free - size < reserve:
            raise RuntimeError(f'Less than 40 GB would remain after downloading {size} bytes')
        with path.open('xb') as out:
            while chunk := response.read(1 << 20):
                if shutil.disk_usage(path.parent).free - len(chunk) < reserve:
                    raise RuntimeError('Stopped download to preserve 40 GB free')
                out.write(chunk)
    if size and path.stat().st_size != size:
        raise RuntimeError(f'Incomplete source {path.name}: expected {size}, got {path.stat().st_size}')
    print(f'downloaded {path.name}: {path.stat().st_size:,} bytes', flush=True)
    return path


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        while data := f.read(1 << 20):
            h.update(data)
    return h.hexdigest()
