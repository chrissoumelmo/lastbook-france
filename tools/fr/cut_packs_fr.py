#!/usr/bin/env python3
"""Package a built departement union as a US-format map set, without changing app code.

  python tools/fr/cut_packs_fr.py 63
  python tools/fr/cut_packs_fr.py 01 03 07 15 26 38 42 43 63 69 73 74  # after building that union
Default input DATA/CODE/derived/geo, output DATA/packs/CODE. Existing packs are refused.
Only completed files present are listed. OSM map.sqlite is shipped as national.sqlite,
with a schema-compatible empty map.sqlite, matching US state packs and _poi_sources.
"""
import ast
import importlib.util
import json
import os
import sqlite3
import sys
import time
from pathlib import Path

from common import REPO, output_path, parser, readonly, selection


def allowed_files():
    # state_maps.py imports publication credentials/modules at import time. Read only its
    # literal ALLOWED expression; do not import or run any publisher code.
    tree = ast.parse((REPO / 'packaging/state_maps.py').read_text())
    expr = next(n.value for n in tree.body if isinstance(n, ast.Assign)
                and any(isinstance(t, ast.Name) and t.id == 'ALLOWED' for t in n.targets))
    return eval(compile(ast.Expression(expr), '<state map ALLOWED>', 'eval'), {'__builtins__': {}})


def clone(path, dest):
    with readonly(path) as src, sqlite3.connect(dest) as db:
        src.backup(db)
        db.execute('PRAGMA journal_mode=DELETE')
        db.execute('PRAGMA secure_delete=ON')
        if db.execute("SELECT 1 FROM sqlite_master WHERE name IN ('done','done_socal')").fetchone():
            raise ValueError(f'Build progress table in {path.name}; finish the builder first')


def empty_map(source, dest):
    with readonly(source) as src, sqlite3.connect(dest) as db:
        tables = {'feat', 'feat_idx', 'poi', 'meta'}
        for typ, name, table, sql in src.execute('SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL'):
            if (typ == 'table' and name in tables) or (typ == 'index' and table in tables):
                db.execute(sql)
        db.execute('PRAGMA journal_mode=DELETE')


def offline_scan(dest, code, allowed, terms_path=None):
    """Apply the upstream map-only rules that do not require publishing or a content pack.

    state_maps.scan demands every US file, including crops and atlas; this brief explicitly
    requests only built layers. Its ALLOWED contract is therefore applied as a subset.
    Missing private-terms is reported, never presented as a full private-word scan.
    """
    spec = importlib.util.spec_from_file_location('scan_pack_fr_check', REPO / 'packaging/scan_pack.py')
    scan = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scan)
    terms = scan.read_terms(str(terms_path)) if terms_path else None
    sc = scan.Scan(dest, terms or [], {}, None)
    failures, listed = [], {}
    files = sc.walk()
    manifest = json.loads((dest / 'map-set.json').read_text())
    rels = {p.relative_to(dest).as_posix() for p in files}
    if rels - allowed:
        failures.append('Files outside state_maps.ALLOWED: ' + ','.join(sorted(rels - allowed)))
    if rels != set(manifest['files']) | {'map-set.json'}:
        failures.append('Manifest does not list exactly the files present')
    if manifest['name'] != code or set(manifest) - {'name', 'files', 'bytes', 'seconds'}:
        failures.append('Map-set format/name mismatch')
    if manifest['bytes'] != sum(manifest['files'].values()):
        failures.append('Manifest total size mismatch')
    for p in files:
        rel = p.relative_to(dest).as_posix()
        if rel == 'map-set.json':
            continue  # same special root-file exception as state_maps.scan
        if manifest['files'].get(rel) != p.stat().st_size:
            failures.append(rel + ': size mismatch')
        sc.name_rules(rel, os.lstat(p), p.is_symlink())
        if p.suffix == '.json':
            data = json.loads(p.read_text())
            if rel.endswith('socal-cells.json') and data != []:
                failures.append('socal-cells.json is not empty')
            if rel.endswith('national-status.json') and set(data) - {'state', 'stage', 'features'}:
                failures.append('national-status.json fields')
        else:
            sc.inspect_map(rel, p)
            with readonly(p) as db:
                if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    failures.append(rel + ': SQLite integrity_check')
                if rel.endswith('/map.sqlite') and any(db.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in ('feat', 'poi', 'meta')):
                    failures.append('Household map is not empty')
                for row in db.execute("SELECT value FROM meta"):
                    val = str(row[0]).encode()
                    if scan.HOUSEHOLD.search(val) or scan.USER_PATH.search(val) or scan.LAN.search(val):
                        failures.append(rel + ': household/path/LAN metadata')
    failures.extend(f'{rule}: {paths[:5]}' for rule, paths in sc.fails.items())
    # The actual setup validator, exercised offline without unpacking/installing anything.
    sys.path.insert(0, str(REPO))
    from engine.setup.install import check_map
    check_map(dest)
    return dict(failures=failures, inspected=dict(sc.inspected), listed=dict(sc.listed),
                private_terms_checked=bool(terms), setup_check_map='passed',
                limitations=[] if terms else ['Private terms file unavailable; full private-word scan not performed'],
                upstream_contract='ALLOWED subset (only built layers), upstream name_rules and inspect_map')


def main():
    ap = parser(__doc__)
    ap.add_argument('--source', type=Path, help='built union geo directory (default DATA/CODE/derived/geo)')
    ap.add_argument('--terms', type=Path, help='optional reviewer-provided private terms file')
    a = ap.parse_args()
    codes, code, bounds, _ = selection(a)
    source = a.source or a.data / code / 'derived/geo'
    dest = a.output or a.data / 'packs' / code
    if dest.exists():
        raise FileExistsError(f'Refusing to replace {dest}; choose --output')
    if not (source / 'map.sqlite').exists():
        raise ValueError(f'Build the selected union first: {source}/map.sqlite')
    t0 = time.monotonic()
    geo = dest / 'derived/geo'
    geo.mkdir(parents=True)
    for name in ('map', 'terrain', 'places', 'buildings', 'water'):
        path = source / (name + '.sqlite')
        if not path.exists():
            continue
        with readonly(path) as db:
            meta = dict(db.execute('SELECT key,value FROM meta'))
            if meta.get('departements') != ','.join(codes) or meta.get('bounds') != ','.join(f'{v:.6f}' for v in bounds):
                raise ValueError(f'{path.name} does not match requested departement union')
        clone(path, geo / ('national.sqlite' if name == 'map' else path.name))
    empty_map(source / 'map.sqlite', geo / 'map.sqlite')
    with readonly(geo / 'national.sqlite') as db:
        features = db.execute('SELECT count(*) FROM feat').fetchone()[0]
    (geo / 'national-status.json').write_text(json.dumps(dict(state='complete', stage='ready', features=features)) + '\n')
    (geo / 'socal-cells.json').write_text('[]\n')
    sizes = {p.relative_to(dest).as_posix(): p.stat().st_size for p in sorted(dest.rglob('*')) if p.is_file()}
    manifest = dict(name=code, files=sizes, bytes=sum(sizes.values()), seconds=round(time.monotonic() - t0, 2))
    (dest / 'map-set.json').write_text(json.dumps(manifest, indent=1) + '\n')
    report = offline_scan(dest, code, allowed_files(), a.terms)
    # Keep review/build reports outside the shipped map-set contract.
    report_path = dest.parent / (code.lower().replace('-', '_') + '_scan.json')
    if report_path.exists():
        raise FileExistsError(f'Refusing to replace scan report {report_path}')
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(dict(pack=code, bytes=manifest['bytes'], files=sizes, scan=report), indent=2), flush=True)
    if report['failures']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
