#!/usr/bin/env python3
"""Build water.sqlite for departement lists from BD TOPAGE 2026 and active ROE.

  python tools/fr/fetch_water_fr.py 63
  python tools/fr/build_water_fr.py 63
Reuses tools/build_water.py's schema, coordinate packing and resource insertion.
ROE 1.1.* = dams, 1.2.* = weirs; other obstacles remain barriers (not dams).
Destroyed/projected ROE works are excluded. Nomenclature 284 is preserved with sources.
IGN/OFB/Sandre, Licence Ouverte 2.0; original snapshot IDs and dates are retained.
"""
import json
import math
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import pyogrio
import pandas as pd
from shapely.geometry import box

from common import REPO, metadata, output_path, parser, selection

sys.path.insert(0, str(REPO / 'tools'))
import build_water as base


def text(value):
    return '' if value is None or pd.isna(value) else str(value)


def parts(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == 'Polygon':
        return [[(p[0], p[1]) for p in r.coords] for r in [geom.exterior, *geom.interiors]]
    if geom.geom_type == 'LineString':
        return [[(p[0], p[1]) for p in geom.coords]]
    if hasattr(geom, 'geoms'):
        return [p for g in geom.geoms for p in parts(g)]
    return []


def main():
    ap = parser(__doc__)
    ap.add_argument('--source', type=Path, help='directory containing lakes/rivers/roe_*.gpkg snapshots')
    a = ap.parse_args()
    _, code, bounds, _ = selection(a)
    root = a.source or a.data / 'sources/water' / code
    out = output_path(a, 'water.sqlite')
    types = {}
    for element in ET.parse(a.data / 'sources/water/sandre_type_ouvrage_284.html').getroot().iter():
        if element.tag.rsplit('}', 1)[-1] == 'Element':
            fields = {c.tag.rsplit('}', 1)[-1]: c.text for c in element}
            types[fields['CdElement']] = fields['LbElement']
    base.DB = out
    db = base.open_db()
    db.execute('PRAGMA journal_mode=DELETE')
    t0, counts, seen = time.monotonic(), {}, set()
    clip = box(*bounds)
    manifests = {}
    for label in ('lakes', 'rivers', 'roe'):
        manifest = json.loads((root / (label + '_source.json')).read_text())
        manifests[label] = dict(layer=manifest['layer'], matched=manifest['matched'], edition=manifest['edition'])
        rows = 0
        for page in manifest['files']:
            frame = pyogrio.read_dataframe(root / page['file']).to_crs(4326)
            # Source snapshots include a slightly larger projected rectangle. All final shapes
            # and points are clipped to the exact padded WGS84 union box.
            frame.geometry = frame.geometry.intersection(clip)
            for row in frame.to_dict('records'):
                g = row['geometry']
                if g is None or g.is_empty:
                    continue
                sid = row['CdObstEcoul'] if label == 'roe' else row['CdOH']
                if (label, sid) in seen:
                    continue
                seen.add((label, sid))
                if label == 'roe':
                    # "Validé" is reference status; it does not establish that the work exists.
                    # Retain only existing/partially destroyed physical works, with state recorded.
                    if row['StObstEcoul'] != 'Validé' or str(row['CdEtOuvrage']) not in ('2', '3'):
                        continue
                    kind_code = text(row['CdTypeOuvrage'])
                    kind = ('dam' if kind_code == '1.1' or kind_code.startswith('1.1.') else
                            'weir' if kind_code == '1.2' or kind_code.startswith('1.2.') else 'barrier')
                    detail = dict(roe_type_code=kind_code, roe_type=types.get(kind_code, 'Type inconnu'),
                                  condition=text(row['LbEtOuvrage']), updated=text(row['DateMAJObstEcoul']),
                                  other_names=text(row['NomSecondaireObstEcoul']), state=code + ', France')
                    base.add_point(db, 'roe', sid, kind, text(row['NomPrincipalObstEcoul']), g.y, g.x,
                                   detail, 'https://id.eaufrance.fr/ObstEcoul/' + sid)
                else:
                    name = text(row['TopoOH'])
                    nature = text(row.get('NaturePE', ''))
                    wet = 'marais' in nature
                    reservoir = 'retenue' in nature or 'réservoir' in nature
                    layer, cls = ('waterway', 'river') if label == 'rivers' else (('wet', 'wet') if wet else ('water', 'reservoir' if reservoir else 'water'))
                    area_km2 = g.area * 111.32 ** 2 * math.cos(math.radians(g.centroid.y))
                    minz = 10 if label == 'rivers' else max(5, min(14, round(14 - math.log2(max(area_km2, 1e-5) ** .5 / .02))))
                    rings = parts(g)
                    if not rings:
                        continue
                    xs = [x for r in rings for x, _ in r]
                    ys = [y for r in rings for _, y in r]
                    cur = db.execute('INSERT INTO feat(layer,cls,name,minz,geom,origin) VALUES (?,?,?,?,?,?)',
                                     (layer, cls, name, minz, base.pack(rings), 'bdtopage:' + label))
                    db.execute('INSERT INTO feat_idx VALUES (?,?,?,?,?,?,?)',
                               (cur.lastrowid, min(xs), max(xs), min(ys), max(ys), minz, 30))
                    if label == 'lakes' and not wet:
                        point = g.representative_point()
                        detail = dict(water_type=nature, updated=text(row['DateMajOH']), state=code + ', France',
                                      area_acres=round(area_km2 * 247.105, 1))
                        base.add_point(db, 'bdtopage:lakes', sid, 'reservoir' if reservoir else 'lake', name,
                                       point.y, point.x, detail, 'https://id.eaufrance.fr/PlanEau/' + sid)
                rows += 1
        counts[label] = rows
    # Same search table as the US builder. Restrict to the kinds its reader accepts;
    # weirs and other barriers remain distinct resource records, never relabelled as dams.
    db.execute('CREATE VIRTUAL TABLE water_fts USING fts5(name, other, tokenize="unicode61")')
    db.execute("INSERT INTO water_fts(rowid,name,other) SELECT id,name,coalesce(json_extract(detail,'$.other_names'),'') "
               "FROM resource WHERE kind IN ('dam','reservoir','lake') AND name!=''")
    metadata(db, a, 'Source: IGN / OFB, BD TOPAGE Métropole 2026; OFB, ROE active validated reference, '
             'snapshot retrieved 2026-11-17 via Sandre; Licence Ouverte 2.0; EPSG:2154 to WGS84, clipped to selected box',
             nomenclature='Sandre 284 Type d’ouvrage, https://id.eaufrance.fr/nsa/284, snapshot 2026-11-09',
             source_layers=manifests, counts=counts, seconds=round(time.monotonic() - t0, 2))
    db.commit()
    db.close()
    print(json.dumps(counts), f'{time.monotonic() - t0:.1f}s', out, flush=True)


if __name__ == '__main__':
    main()
