#!/usr/bin/env python3
"""Build one installable map set from a department list, with no app reader changes.

  python tools/fr/build_pack_fr.py 43 63 --work /path/to/new_work --output /path/to/new_pack

Supply source snapshots first (see readme.md). Existing outputs are refused.
The parent and every builder share a 20 GiB address-space cap; builds use the CPU.
"""
import os
import resource
import subprocess
import sys
from pathlib import Path

from common import REPO, parser, selection


def main():
    ap = parser(__doc__)
    ap.add_argument('--work', type=Path, help='new build folder (default DATA/CODE)')
    ap.add_argument('--workers', type=int, default=4)
    a = ap.parse_args()
    codes, code, _, _ = selection(a)
    work = a.work or a.data / code
    dest = a.output or a.data / 'packs' / code
    geo = work / 'derived/geo'
    if work.exists() or dest.exists():
        raise FileExistsError('Choose new --work and --output folders; existing builds are kept')
    if not 1 <= a.workers <= 8:
        raise ValueError('--workers must be between 1 and 8')
    sources = list((a.data / 'sources/buildings/gpkg').rglob('*.gpkg'))
    if any(not any(f'D{c.zfill(3)}' in p.name for p in sources) for c in codes):
        raise ValueError('Supply BD TOPO for each department: run fetch_buildings_fr.py with the same list')
    cap = 20 * 1024 ** 3
    soft, hard = resource.getrlimit(resource.RLIMIT_AS)
    resource.setrlimit(resource.RLIMIT_AS, (min(cap, soft) if soft != resource.RLIM_INFINITY else cap, hard))
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1'}

    def run(script, *extra):
        subprocess.run([sys.executable, '-B', str(REPO / 'tools/fr' / script), *codes,
                        '--data', str(a.data), '--boundaries', str(a.boundaries), *map(str, extra)],
                       check=True, env=env)

    geo.mkdir(parents=True)
    run('build_map_fr.py', '--clipped', work / 'clipped.gpkg', '--output', geo / 'map.sqlite')
    run('build_terrain_fr.py', '--workers', a.workers, '--output', geo / 'terrain.sqlite')
    run('build_places_fr.py', '--map', geo / 'map.sqlite', '--output', geo / 'places.sqlite')
    run('build_buildings_fr.py', '--output', geo / 'buildings.sqlite')
    run('build_water_fr.py', '--output', geo / 'water.sqlite')
    run('cut_packs_fr.py', '--source', geo, '--output', dest)
    print(f'Combined map set ready for setup: {dest}', flush=True)


if __name__ == '__main__':
    main()
