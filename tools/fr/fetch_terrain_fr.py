#!/usr/bin/env python3
"""Fetch BD ALTI 25 m ASC archives for the selected box, including neighbouring departments.

  PYTHONPATH=DATA/sources/python_deps python tools/fr/fetch_terrain_fr.py 63
Requires py7zr for extraction. Downloads, feeds and original ASC grids are retained unchanged.
IGN BD ALTI, editions selected from the publisher's Atom feeds; Licence Ouverte 2.0.
"""
import xml.etree.ElementTree as ET

from common import download, parser, selection

ATOM = '{http://www.w3.org/2005/Atom}'


def main():
    import py7zr
    ap = parser(__doc__)
    a = ap.parse_args()
    _, _, _, neighbours = selection(a)
    root = a.data / 'sources/terrain'
    for d in sorted(neighbours):
        feed = download(f'https://data.geopf.fr/telechargement/resource/BDALTI?zone=D{d.zfill(3)}&limit=50',
                        root / f'feed_d{d.zfill(3)}.xml')
        entries = ET.parse(feed).findall(ATOM + 'entry')
        editions = sorted(e.findtext(ATOM + 'title') for e in entries
                          if '_25M_ASC_LAMB93-IGN69_' in e.findtext(ATOM + 'title', ''))
        if not editions:
            raise ValueError(f'No Lambert-93 25 m BD ALTI edition for {d}')
        edition = editions[-1]
        url = f'https://data.geopf.fr/telechargement/download/BDALTI/{edition}/{edition}.7z'
        archive = download(url, root / (edition + '.7z'))
        with py7zr.SevenZipFile(archive) as z:
            targets = [n for n in z.getnames() if n.lower().endswith('.asc') and not (root / 'asc' / n).exists()]
            if targets:
                z.extract(path=root / 'asc', targets=targets)
        print(f'{d}: {edition}, {len(targets)} new ASC tiles', flush=True)


if __name__ == '__main__':
    main()
