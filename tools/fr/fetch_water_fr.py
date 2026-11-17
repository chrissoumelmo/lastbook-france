#!/usr/bin/env python3
"""Download bbox-filtered, count-checked Sandre WFS snapshots for departement lists.

  python tools/fr/fetch_water_fr.py 63
BD TOPAGE 2026 PlanEau/CoursEau and current active ROE ObstEcoul. Both are public
IGN/OFB/Sandre reference data, Licence Ouverte 2.0. Requests use EPSG:2154 to avoid
WFS latitude/longitude axis ambiguity; the builder clips exactly in WGS84.
"""
import json
import urllib.parse
import xml.etree.ElementTree as ET
import shutil
import zipfile

import pyogrio
from pyproj import Transformer

from common import download, parser, selection

LAYERS = (('sandre', 'PlanEau_FXX_Topage2026', 'lakes'),
          ('sandre', 'CoursEau_FXX_Topage2026', 'rivers'), ('obs', 'ObstEcoul_FXX', 'roe'))


def main():
    ap = parser(__doc__)
    a = ap.parse_args()
    _, code, bounds, _ = selection(a)
    root = a.data / 'sources/water' / code
    xy = Transformer.from_crs(4326, 2154, always_xy=True).transform_bounds(*bounds, densify_pts=41)
    for service, layer, label in LAYERS:
        query = dict(SERVICE='WFS', VERSION='2.0.0', REQUEST='GetFeature', TYPENAMES='sa:' + layer,
                     SRSNAME='EPSG:2154', BBOX=','.join(map(str, xy)) + ',EPSG:2154')
        base = 'https://services.sandre.eaufrance.fr/geo/' + service + '?'
        url = base + urllib.parse.urlencode(dict(query, RESULTTYPE='hits'))
        hits = download(url, root / (label + '_hits.xml'))
        count = int(ET.parse(hits).getroot().attrib['numberMatched'])
        total, files = 0, []
        for start in range(0, count, 50000):
            url = base + urllib.parse.urlencode(dict(query, COUNT=50000, STARTINDEX=start, OUTPUTFORMAT='GPKG'))
            archive = download(url, root / f'{label}_{start:06d}.zip')
            p = root / f'{label}_{start:06d}.gpkg'
            # MapServer's GPKG output is a ZIP containing a literal %TYPENAME%.gpkg.
            if not p.exists():
                with zipfile.ZipFile(archive) as z:
                    member, = [n for n in z.namelist() if n.lower().endswith('.gpkg')]
                    with z.open(member) as src, p.open('xb') as dst:
                        shutil.copyfileobj(src, dst)
            info = pyogrio.read_info(p)
            total += info['features']
            files.append(dict(file=p.name, rows=info['features'], url=url))
        if total != count:
            raise ValueError(f'{label}: WFS returned {total} rows but matched {count}; incomplete download')
        manifest = root / (label + '_source.json')
        if not manifest.exists():
            manifest.write_text(json.dumps(dict(service=service, layer=layer, matched=count, files=files,
                                                bounds=bounds, edition='2026' if service == 'sandre' else 'retrieved 2026-11-17'), indent=2) + '\n')
        print(f'{label}: {count:,} rows, {len(files)} pages, checked against WFS hits', flush=True)


if __name__ == '__main__':
    main()
