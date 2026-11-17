"""Offline map display settings. Old maps keep the original US defaults."""
import json
import math
from datetime import date
from pathlib import Path

US_CREDITS = '© OpenStreetMap contributors · Microsoft buildings · USGS · USDA · NOAA · USACE · CDFW · CalGEM · Natural Earth'
US_DATA_DATE = '25 Oct 2026'


def settings(data):
    try:
        manifest = json.loads((Path(data) / 'map-set.json').read_text(encoding='utf-8'))
        if not isinstance(manifest, dict):
            manifest = {}
    except (OSError, ValueError):
        manifest = {}
    out = {'country': manifest.get('country', 'US'), 'units': manifest.get('units', 'us'),
           'credits': US_CREDITS, 'data_date': US_DATA_DATE}
    credits = manifest.get('credits')
    if isinstance(credits, list) and credits and all(isinstance(c, dict) and isinstance(c.get('text'), str) for c in credits):
        out['credits'] = ' · '.join(c['text'] for c in credits)
    try:
        d = date.fromisoformat(manifest['data_date'])
        out['data_date'] = f'{d.day} {("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())[d.month - 1]} {d.year}'
    except (KeyError, TypeError, ValueError):
        pass
    bounds = manifest.get('bounds')
    if (isinstance(bounds, list) and len(bounds) == 4
            and all(isinstance(v, (int, float)) and math.isfinite(v) for v in bounds)
            and -180 <= bounds[0] < bounds[2] <= 180 and -90 <= bounds[1] < bounds[3] <= 90):
        out['bounds'] = bounds
    return out


def on_map(mode, lat, lon, legacy_pack=False):
    bounds = mode.get('bounds')
    if bounds:
        west, south, east, north = bounds
        return west <= lon <= east and south <= lat <= north
    return bool(legacy_pack) or 32.5 < lat < 35.9 and -121.4 < lon < -114.1


def away(km, units):
    if units == 'metric':
        return f' · {km:,.0f} km away' if km >= 1 else f' · {km * 1000:.0f} m away'
    return f' · {km / 1.609:,.0f} mi away' if km >= 1.6 else ' · nearby'
