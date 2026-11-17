#!/usr/bin/env python3
"""Fetch IGN BD TOPO department GPKGs for the selected list; keep every source.

Run under the build's 20 GiB cap. Downloads larger than 500 MB are refused.
Only the BATIMENT layer is read later by build_buildings_fr.py.
"""
import xml.etree.ElementTree as ET

from common import download, parser, selection

ATOM = '{http://www.w3.org/2005/Atom}'
GPF = '{https://data.geopf.fr/annexes/ressources/xsd/gpf_dl.xsd}'


def main():
    import py7zr
    a = parser(__doc__).parse_args()
    codes, _, _, _ = selection(a)
    root = a.data / 'sources/buildings'
    for code in codes:
        feed = download(f'https://data.geopf.fr/telechargement/resource/BDTOPO?zone=D{code.zfill(3)}&limit=50',
                        root / f'feed_d{code.zfill(3)}.xml')
        titles = sorted(e.findtext(ATOM + 'title') for e in ET.parse(feed).findall(ATOM + 'entry')
                        if '_TOUSTHEMES_GPKG_LAMB93_' in e.findtext(ATOM + 'title', ''))
        if not titles:
            raise ValueError(f'No BD TOPO GPKG edition for {code}')
        edition = titles[-1]
        detail = download(f'https://data.geopf.fr/telechargement/resource/BDTOPO/{edition}',
                          root / f'edition_{edition}.xml')
        links = [link for link in ET.parse(detail).iter(ATOM + 'link')
                 if link.get('href', '').endswith('.7z')]
        link, = links
        size = int(link.get(GPF + 'length', '0'))
        if not size or size > 500_000_000:
            raise ValueError(f'Archive size {size}: expected a known size below 500 MB')
        archive = download(link.get('href'), root / (edition + '.7z'), size)
        with py7zr.SevenZipFile(archive) as z:
            targets = [n for n in z.getnames() if n.lower().endswith('.gpkg') and not (root / 'gpkg' / n).exists()]
            if targets:
                z.extract(path=root / 'gpkg', targets=targets)
        print(f'{code}: {edition}, {len(targets)} new GPKGs', flush=True)


if __name__ == '__main__':
    main()
